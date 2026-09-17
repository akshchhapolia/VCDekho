const Parser = require('rss-parser');
const db = require('./db');
const { shouldQueueBuzzPost } = require('./buzz-relevance');
const { runBuzzDiscover } = require('./buzz-discover');
const { stripRedditRssChrome } = require('./buzz-body-render');
const { REDDIT_FEEDS, feedBatchForRun } = require('./buzz-sources');

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; VCDekhoBot/1.0; +https://vcdekho.com)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*'
  }
});

const FEED_DELAY_MS = 6500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRedditMeta(url) {
  const m = String(url || '').match(/reddit\.com\/r\/([^/]+)\/comments\/([^/]+)/i);
  if (!m) return { subreddit: null, sourceId: null };
  return { subreddit: m[1], sourceId: m[2] };
}

function normalizeRedditUrl(url) {
  return String(url || '')
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '');
}

async function ingestFeedItem(item, feedMeta, knownUrls, stats) {
  stats.itemsFetched++;
  const sourceUrl = normalizeRedditUrl(item.link || item.guid);
  if (!sourceUrl || knownUrls.has(sourceUrl)) {
    if (sourceUrl && knownUrls.has(sourceUrl)) stats.itemsDuplicated++;
    return;
  }

  const title = item.title || 'Untitled discussion';
  const body = stripRedditRssChrome(
    item.contentSnippet || item.content || item.summary || item.description || ''
  );
  const gate = shouldQueueBuzzPost(title, body);
  const { subreddit, sourceId } = extractRedditMeta(sourceUrl);
  const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
  const status = gate.queue ? 'queued' : 'rejected';

  try {
    await db.query(
      `INSERT INTO investor_buzz (
        source, source_url, source_id, subreddit, title, body_excerpt,
        published_at_source, relevance_score, status, error_log
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        'reddit',
        sourceUrl,
        sourceId,
        subreddit || feedMeta.subreddit,
        title.slice(0, 500),
        String(body).slice(0, 4000),
        pubDate.toISOString(),
        gate.score,
        status,
        gate.queue ? null : `scrape:${gate.reason}`
      ]
    );
    knownUrls.add(sourceUrl);
    if (status === 'queued') stats.itemsQueued++;
    else stats.itemsRejected++;
  } catch (insertErr) {
    if (/duplicate key/i.test(insertErr.message)) {
      stats.itemsDuplicated++;
      knownUrls.add(sourceUrl);
    } else {
      throw insertErr;
    }
  }
}

/**
 * @param {{ batchIndex?: number }} [opts]
 * Rotates through Reddit RSS feeds each run to reduce 429 rate limits.
 */
async function runBuzzScrape(opts = {}) {
  const batchIndex =
    typeof opts.batchIndex === 'number'
      ? opts.batchIndex
      : Math.floor(Date.now() / (6 * 60 * 60 * 1000));
  const feeds = feedBatchForRun(batchIndex);

  const stats = {
    itemsFetched: 0,
    itemsQueued: 0,
    itemsDuplicated: 0,
    itemsRejected: 0,
    errors: [],
    feedsTotal: REDDIT_FEEDS.length,
    feedsThisRun: feeds.length,
    feedBatch: batchIndex
  };

  try {
    const recent = await db.query(
      `SELECT source_url FROM investor_buzz WHERE scraped_at > NOW() - INTERVAL '90 days'`
    );
    const knownUrls = new Set(recent.rows.map((r) => r.source_url));

    for (let i = 0; i < feeds.length; i++) {
      const feedMeta = feeds[i];
      if (i > 0) await sleep(FEED_DELAY_MS);
      try {
        const feed = await parser.parseURL(feedMeta.url);
        for (const item of feed.items || []) {
          await ingestFeedItem(item, feedMeta, knownUrls, stats);
        }
      } catch (err) {
        stats.errors.push(`${feedMeta.label}: ${err.message}`);
      }
    }
  } catch (err) {
    if (/investor_buzz|does not exist/i.test(err.message)) {
      return { skipped: true, reason: 'investor_buzz table missing' };
    }
    throw err;
  }

  try {
    stats.discover = await runBuzzDiscover({ batchIndex });
    if (stats.discover && !stats.discover.skipped) {
      stats.itemsFetched += stats.discover.itemsFetched || 0;
      stats.itemsQueued += stats.discover.itemsQueued || 0;
      stats.itemsDuplicated += stats.discover.itemsDuplicated || 0;
      stats.itemsRejected += stats.discover.itemsRejected || 0;
      if (stats.discover.errors?.length) {
        stats.errors.push(...stats.discover.errors);
      }
    }
  } catch (discoverErr) {
    stats.errors.push(`discover: ${discoverErr.message}`);
  }

  return stats;
}

module.exports = { runBuzzScrape, REDDIT_FEEDS };
