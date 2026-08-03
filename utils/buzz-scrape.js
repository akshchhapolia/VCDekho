const Parser = require('rss-parser');
const db = require('./db');

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; VCDekhoBot/1.0; +https://vcdekho.com)',
    Accept: 'application/rss+xml, application/xml, text/xml, */*'
  }
});

const SUBREDDITS = ['StartUpIndia', 'indianstartups', 'IndiaInvestments'];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scoreBuzzRelevance(title, body) {
  let score = 0;
  const text = `${title || ''} ${body || ''}`.toLowerCase();
  if (
    /vc|venture capital|investor|fundraising|fund raise|term sheet|due diligence|pitch deck|seed round|pre-seed|series [a-e]|angel investor|accelerator|interview.*(vc|investor|partner)|raise(d|s)?|valuation|cheque/i.test(
      text
    )
  ) {
    score += 1;
  }
  if (/india|indian|bangalore|bengaluru|mumbai|delhi|hyderabad|chennai|startup/i.test(text)) {
    score += 1;
  }
  if (/peak xv|sequoia|blume|matrix|elevation|accel|tiger global|nexus|lightspeed|100x\.vc|3one4|stellaris/i.test(text)) {
    score += 1;
  }
  return score;
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

async function runBuzzScrape() {
  let itemsFetched = 0;
  let itemsQueued = 0;
  let itemsDuplicated = 0;
  let itemsRejected = 0;
  const errors = [];

  try {
    const recent = await db.query(
      `SELECT source_url FROM investor_buzz WHERE scraped_at > NOW() - INTERVAL '30 days'`
    );
    const knownUrls = new Set(recent.rows.map((r) => r.source_url));

    for (let i = 0; i < SUBREDDITS.length; i++) {
      const sub = SUBREDDITS[i];
      if (i > 0) await sleep(2500);
      try {
        const feed = await parser.parseURL(`https://www.reddit.com/r/${sub}/new/.rss`);
        for (const item of feed.items || []) {
          itemsFetched++;
          const sourceUrl = normalizeRedditUrl(item.link || item.guid);
          if (!sourceUrl || knownUrls.has(sourceUrl)) {
            if (sourceUrl && knownUrls.has(sourceUrl)) itemsDuplicated++;
            continue;
          }

          const title = item.title || 'Untitled discussion';
          const body =
            item.contentSnippet || item.content || item.summary || item.description || '';
          const score = scoreBuzzRelevance(title, body);
          const { subreddit, sourceId } = extractRedditMeta(sourceUrl);
          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
          const status = score >= 1 ? 'queued' : 'rejected';

          try {
            await db.query(
              `INSERT INTO investor_buzz (
                source, source_url, source_id, subreddit, title, body_excerpt,
                published_at_source, relevance_score, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
              [
                'reddit',
                sourceUrl,
                sourceId,
                subreddit || sub,
                title.slice(0, 500),
                String(body).slice(0, 4000),
                pubDate.toISOString(),
                score,
                status
              ]
            );
            knownUrls.add(sourceUrl);
            if (status === 'queued') itemsQueued++;
            else itemsRejected++;
          } catch (insertErr) {
            if (/duplicate key/i.test(insertErr.message)) {
              itemsDuplicated++;
              knownUrls.add(sourceUrl);
            } else {
              throw insertErr;
            }
          }
        }
      } catch (err) {
        errors.push(`${sub}: ${err.message}`);
      }
    }
  } catch (err) {
    if (/investor_buzz|does not exist/i.test(err.message)) {
      return { skipped: true, reason: 'investor_buzz table missing' };
    }
    throw err;
  }

  return { itemsFetched, itemsQueued, itemsDuplicated, itemsRejected, errors };
}

module.exports = { runBuzzScrape, SUBREDDITS };
