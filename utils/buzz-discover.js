const db = require('./db');
const { webSearch } = require('./web-search');
const { shouldQueueBuzzPost, isHardRejectBuzzPost } = require('./buzz-relevance');
const { stripRedditRssChrome } = require('./buzz-body-render');
const { DISCOVERY_QUERIES, queryBatchForRun } = require('./buzz-sources');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeRedditUrl(url) {
  return String(url || '')
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '');
}

function isRedditThreadUrl(url) {
  return /reddit\.com\/r\/[^/]+\/comments\//i.test(url || '');
}

function extractRedditMeta(url) {
  const m = String(url || '').match(/reddit\.com\/r\/([^/]+)\/comments\/([^/]+)/i);
  if (!m) return { subreddit: null, sourceId: null };
  return { subreddit: m[1], sourceId: m[2] };
}

async function ingestDiscoveryHit(hit, knownUrls, stats) {
  const sourceUrl = normalizeRedditUrl(hit.link);
  if (!isRedditThreadUrl(sourceUrl) || knownUrls.has(sourceUrl)) {
    if (knownUrls.has(sourceUrl)) stats.itemsDuplicated++;
    return;
  }

  stats.itemsFetched++;
  const title = hit.title || 'Reddit discussion';
  const body = stripRedditRssChrome(hit.snippet || '');
  const gate = shouldQueueBuzzPost(title, body);
  const { subreddit, sourceId } = extractRedditMeta(sourceUrl);
  const status = gate.queue ? 'queued' : 'rejected';

  try {
    await db.query(
      `INSERT INTO investor_buzz (
        source, source_url, source_id, subreddit, title, body_excerpt,
        published_at_source, relevance_score, status, error_log
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)`,
      [
        'reddit',
        sourceUrl,
        sourceId,
        subreddit,
        title.slice(0, 500),
        String(body).slice(0, 4000),
        gate.score,
        status,
        gate.queue ? 'discover:searlo' : `discover:${gate.reason}`
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
 * Find Reddit founder VC review threads via targeted web search (Searlo).
 * @param {{ batchIndex?: number }} [opts]
 */
async function runBuzzDiscover(opts = {}) {
  if (!process.env.SEARLO_API_KEY) {
    return { skipped: true, reason: 'SEARLO_API_KEY not set' };
  }

  const batchIndex =
    typeof opts.batchIndex === 'number'
      ? opts.batchIndex
      : Math.floor(Date.now() / (6 * 60 * 60 * 1000));
  const queries = queryBatchForRun(batchIndex);

  const stats = {
    itemsFetched: 0,
    itemsQueued: 0,
    itemsDuplicated: 0,
    itemsRejected: 0,
    errors: [],
    queriesTotal: DISCOVERY_QUERIES.length,
    queriesThisRun: queries.length,
    queryBatch: batchIndex
  };

  const recent = await db.query(
    `SELECT source_url FROM investor_buzz WHERE scraped_at > NOW() - INTERVAL '120 days'`
  );
  const knownUrls = new Set(recent.rows.map((r) => r.source_url));

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    if (i > 0) await sleep(2500);
    try {
      const { organic } = await webSearch(q, { limit: 10, gl: 'in', hl: 'en' });
      for (const hit of organic) {
        if (!isRedditThreadUrl(hit.link)) continue;
        if (isHardRejectBuzzPost(hit.title, hit.snippet)) {
          stats.itemsRejected++;
          continue;
        }
        await ingestDiscoveryHit(hit, knownUrls, stats);
      }
    } catch (err) {
      stats.errors.push(`${q.slice(0, 48)}: ${err.message}`);
    }
  }

  return stats;
}

module.exports = { runBuzzDiscover, DISCOVERY_QUERIES };
