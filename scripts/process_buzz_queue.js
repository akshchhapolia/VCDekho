#!/usr/bin/env node
/**
 * Local drain for investor_buzz queue: scrape Reddit RSS + AI-process queued items.
 * Usage: node scripts/process_buzz_queue.js [--scrape-only] [--process-only] [--limit=12]
 */
require('dotenv').config();

const db = require('../utils/db');
const { processBuzzItem } = require('../utils/buzz-ai-process');
const { runBuzzScrape } = require('../utils/buzz-scrape');

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

  if (!args.has('--process-only')) {
    const scrape = await runBuzzScrape();
    console.log('Scrape:', scrape);
  }
  if (!args.has('--scrape-only')) await runProcess(limit);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
