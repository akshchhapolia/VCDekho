#!/usr/bin/env node
/**
 * Backfill published_at_source from Reddit created_utc for Founder Buzz posts.
 * Usage:
 *   node scripts/backfill_buzz_dates.js
 *   node scripts/backfill_buzz_dates.js --all
 *   node scripts/backfill_buzz_dates.js --slug=...
 */
require('dotenv').config();
const db = require('../utils/db');
const { fetchRedditPost } = require('../utils/reddit-fetch');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const slugArg = process.argv.find((a) => a.startsWith('--slug='));
  const slug = slugArg ? slugArg.split('=')[1] : null;
  const all = process.argv.includes('--all');

  let rows;
  if (slug) {
    const r = await db.query(
      `SELECT id, slug, title, source_url, published_at, published_at_source
       FROM investor_buzz WHERE slug = $1`,
      [slug]
    );
    rows = r.rows;
  } else if (all) {
    const r = await db.query(
      `SELECT id, slug, title, source_url, published_at, published_at_source
       FROM investor_buzz
       WHERE source = 'reddit' AND source_url IS NOT NULL
       ORDER BY id`
    );
    rows = r.rows;
  } else {
    const r = await db.query(
      `SELECT id, slug, title, source_url, published_at, published_at_source
       FROM investor_buzz
       WHERE status = 'published' AND source = 'reddit' AND source_url IS NOT NULL
       ORDER BY id`
    );
    rows = r.rows;
  }

  console.log(`Backfilling dates for ${rows.length} rows…`);
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const fetched = await fetchRedditPost(row.source_url);
      if (!fetched?.created_at) {
        console.warn(`  skip ${row.slug || row.id}: no created_at`);
        skipped++;
        continue;
      }
      await db.query(
        `UPDATE investor_buzz SET published_at_source = $2 WHERE id = $1`,
        [row.id, fetched.created_at]
      );
      updated++;
      console.log(
        `  ${row.slug || row.id}: ${row.published_at_source || 'null'} → ${fetched.created_at}`
      );
    } catch (err) {
      failed++;
      console.warn(`  fail ${row.slug || row.id}: ${err.message}`);
    }
    await sleep(400);
  }

  console.log(JSON.stringify({ updated, skipped, failed, total: rows.length }));
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
