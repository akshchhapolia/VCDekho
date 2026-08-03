#!/usr/bin/env node
/**
 * Backfill full Reddit post bodies for investor_buzz rows with short snippets.
 * Usage: node scripts/backfill_buzz_bodies.js [--slug=...] [--all]
 */
require('dotenv').config();
const db = require('../utils/db');
const { ensureBuzzFullBody } = require('../utils/buzz-body-fetch');

async function main() {
  const slugArg = process.argv.find((a) => a.startsWith('--slug='));
  const slug = slugArg ? slugArg.split('=')[1] : null;
  const all = process.argv.includes('--all');

  let rows;
  if (slug) {
    const r = await db.query(
      `SELECT id, slug, source_url, body_excerpt FROM investor_buzz WHERE slug = $1`,
      [slug]
    );
    rows = r.rows;
  } else if (all) {
    const r = await db.query(
      `SELECT id, slug, source_url, body_excerpt FROM investor_buzz ORDER BY id`
    );
    rows = r.rows;
  } else {
    const r = await db.query(
      `SELECT id, slug, source_url, body_excerpt FROM investor_buzz
       WHERE length(coalesce(body_excerpt, '')) < 800
       ORDER BY id`
    );
    rows = r.rows;
  }

  console.log(`Backfilling ${rows.length} buzz row(s)...`);
  for (const item of rows) {
    const before = String(item.body_excerpt || '').length;
    if (!all && before >= 800) {
      console.log(`  skip ${item.slug} (${before} chars)`);
      continue;
    }
    try {
      const body = await ensureBuzzFullBody(item);
      const after = String(body || '').length;
      console.log(`  ${item.slug}: ${before} → ${after} chars`);
    } catch (err) {
      console.error(`  ${item.slug}: FAILED —`, err.message);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  await db.end?.();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
