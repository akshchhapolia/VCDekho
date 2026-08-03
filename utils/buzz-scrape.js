const Parser = require('rss-parser');
const db = require('./db');
const { shouldQueueBuzzPost } = require('./buzz-relevance');

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; VCDekhoBot/1.0; +https://vcdekho.com)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*'
  }
});

/**
 * Targeted Reddit search feeds — founder VC reviews/experiences, not generic startup posts.
 * Uses subreddit search RSS (not /new) to surface fundraising retrospectives and investor feedback.
 */
const REDDIT_FEEDS = [
  {
    label: 'StartUpIndia-vc-review',
    subreddit: 'StartUpIndia',
    url:
      'https://www.reddit.com/r/StartUpIndia/search.rss?q=VC+experience+OR+investor+interview+OR+due+diligence+OR+term+sheet+OR+ghosted+OR+fundraising+journey&restrict_sr=1&sort=new'
  },
  {
    label: 'StartUpIndia-vc-scene',
    subreddit: 'StartUpIndia',
    url:
      'https://www.reddit.com/r/StartUpIndia/search.rss?q=indian+VC+OR+venture+capital+experience+OR+pitch+feedback&restrict_sr=1&sort=new'
  },
  {
    label: 'indianstartups-vc',
    subreddit: 'indianstartups',
    url:
      'https://www.reddit.com/r/indianstartups/search.rss?q=VC+OR+investor+experience+OR+fundraising+experience+OR+raised+seed&restrict_sr=1&sort=new'
  },
  {
    label: 'startups-india-vc',
    subreddit: 'startups',
    url:
      'https://www.reddit.com/r/startups/search.rss?q=india+VC+OR+indian+investor+OR+peak+xv+OR+blume+experience&restrict_sr=1&sort=new'
  },
  {
    label: 'venturecapital-india',
    subreddit: 'venturecapital',
    url:
      'https://www.reddit.com/r/venturecapital/search.rss?q=india+OR+indian+founder+OR+emerging+market&restrict_sr=1&sort=new'
  },
  {
    label: 'global-indian-vc-search',
    subreddit: null,
    url:
      'https://www.reddit.com/search.rss?q=indian+startup+VC+experience+OR+investor+interview+india&sort=new'
  }
];

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
  const body = item.contentSnippet || item.content || item.summary || item.description || '';
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

async function runBuzzScrape() {
  const stats = {
    itemsFetched: 0,
    itemsQueued: 0,
    itemsDuplicated: 0,
    itemsRejected: 0,
    errors: [],
    feeds: REDDIT_FEEDS.length
  };

  try {
    const recent = await db.query(
      `SELECT source_url FROM investor_buzz WHERE scraped_at > NOW() - INTERVAL '60 days'`
    );
    const knownUrls = new Set(recent.rows.map((r) => r.source_url));

    for (let i = 0; i < REDDIT_FEEDS.length; i++) {
      const feedMeta = REDDIT_FEEDS[i];
      if (i > 0) await sleep(3000);
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

  return stats;
}

module.exports = { runBuzzScrape, REDDIT_FEEDS };
