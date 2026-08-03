#!/usr/bin/env node
/**
 * Local drain for investor_buzz queue: scrape Reddit RSS + AI-process queued items.
 * Usage: node scripts/process_buzz_queue.js [--scrape-only] [--process-only] [--limit N]
 */
require('dotenv').config();

const db = require('../utils/db');
const { processBuzzItem } = require('../utils/buzz-ai-process');
const Parser = require('rss-parser');

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
  if (/vc|venture|investor|fundraising|term sheet|due diligence|seed|series [a-e]|angel|interview|raise|valuation/i.test(text)) {
    score += 1;
  }
  if (/india|indian|bangalore|bengaluru|mumbai|delhi|startup/i.test(text)) score += 1;
  if (/peak xv|sequoia|blume|matrix|elevation|accel|100x\.vc|3one4|stellaris/i.test(text)) score += 1;
  return score;
}

async function runScrape() {
  const recent = await db.query(
    `SELECT source_url FROM investor_buzz WHERE scraped_at > NOW() - INTERVAL '30 days'`
  );
  const known = new Set(recent.rows.map((r) => r.source_url));
  let queued = 0;

  for (let i = 0; i < SUBREDDITS.length; i++) {
    const sub = SUBREDDITS[i];
    if (i > 0) await sleep(2500);
    const feed = await parser.parseURL(`https://www.reddit.com/r/${sub}/new/.rss`);
    for (const item of feed.items || []) {
      const url = String(item.link || item.guid || '')
        .replace(/\?.*$/, '')
        .replace(/\/+$/, '');
      if (!url || known.has(url)) continue;
      const title = item.title || 'Untitled';
      const body = item.contentSnippet || item.content || '';
      const score = scoreBuzzRelevance(title, body);
      const status = score >= 1 ? 'queued' : 'rejected';
      try {
        await db.query(
          `INSERT INTO investor_buzz (source, source_url, subreddit, title, body_excerpt, published_at_source, relevance_score, status)
           VALUES ('reddit', $1, $2, $3, $4, $5, $6, $7)`,
          [
            url,
            sub,
            title.slice(0, 500),
            String(body).slice(0, 4000),
            item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            score,
            status
          ]
        );
        known.add(url);
        if (status === 'queued') queued++;
        console.log(`+ [${status}] ${title.slice(0, 80)}`);
      } catch (e) {
        if (!/duplicate key/i.test(e.message)) throw e;
      }
    }
  }
  console.log(`Scrape done. Queued: ${queued}`);
  return queued;
}

async function runProcess(limit) {
  const { rows } = await db.query(
    `SELECT * FROM investor_buzz WHERE status = 'queued' ORDER BY relevance_score DESC, scraped_at ASC LIMIT $1`,
    [limit]
  );
  let published = 0;
  for (const item of rows) {
    await db.query(`UPDATE investor_buzz SET status = 'processing' WHERE id = $1`, [item.id]);
    const result = await processBuzzItem(item);
    console.log(`${result.finalStatus || 'error'}: ${item.title.slice(0, 70)}`);
    if (result.finalStatus === 'published') published++;
  }
  console.log(`Process done. Published: ${published}/${rows.length}`);
  return published;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 12;

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  if (!args.has('--process-only')) await runScrape();
  if (!args.has('--scrape-only')) await runProcess(limit);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
