const db = require('./db');
const { webSearch } = require('./web-search');
const { shouldQueueBuzzPost, isHardRejectBuzzPost } = require('./buzz-relevance');

const DISCOVERY_QUERIES = [
  'site:reddit.com/r/StartUpIndia VC experience OR fundraising journey OR investor interview OR due diligence',
  'site:reddit.com/r/indianstartups venture capital experience OR raised seed OR term sheet',
  'site:reddit.com indian startup VC ghosted OR rejected OR "fundraising experience"',
  'site:reddit.com/r/startups india VC OR indian investor interview OR peak xv experience'
];

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
  const body = hit.snippet || '';
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
 * Supplements RSS when Reddit rate-limits or search feeds are noisy.
 */
async function runBuzzDiscover() {
  if (!process.env.SEARLO_API_KEY) {
    return { skipped: true, reason: 'SEARLO_API_KEY not set' };
  }

  const stats = {
    itemsFetched: 0,
    itemsQueued: 0,
    itemsDuplicated: 0,
    itemsRejected: 0,
    errors: [],
    queries: DISCOVERY_QUERIES.length
  };

  const recent = await db.query(
    `SELECT source_url FROM investor_buzz WHERE scraped_at > NOW() - INTERVAL '90 days'`
  );
  const knownUrls = new Set(recent.rows.map((r) => r.source_url));

  for (let i = 0; i < DISCOVERY_QUERIES.length; i++) {
    const q = DISCOVERY_QUERIES[i];
    if (i > 0) await sleep(2000);
    try {
      const { organic } = await webSearch(q, { limit: 8, gl: 'in', hl: 'en' });
      for (const hit of organic) {
        if (!isRedditThreadUrl(hit.link)) continue;
        if (isHardRejectBuzzPost(hit.title, hit.snippet)) {
          stats.itemsRejected++;
          continue;
        }
        await ingestDiscoveryHit(hit, knownUrls, stats);
      }
    } catch (err) {
      stats.errors.push(`${q.slice(0, 40)}: ${err.message}`);
    }
  }

  return stats;
}

module.exports = { runBuzzDiscover, DISCOVERY_QUERIES };
