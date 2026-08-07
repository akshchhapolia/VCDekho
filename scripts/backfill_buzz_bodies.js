#!/usr/bin/env node
/**
 * Backfill full Reddit post bodies for investor_buzz rows with short snippets.
 * Usage:
 *   node scripts/backfill_buzz_bodies.js
 *   node scripts/backfill_buzz_bodies.js --published
 *   node scripts/backfill_buzz_bodies.js --slug=...
 *   node scripts/backfill_buzz_bodies.js --all
 */
require('dotenv').config();
const db = require('../utils/db');
const { ensureBuzzFullBody } = require('../utils/buzz-body-fetch');

async function main() {
  const slugArg = process.argv.find((a) => a.startsWith('--slug='));
  const slug = slugArg ? slugArg.split('=')[1] : null;
  const all = process.argv.includes('--all');
  const publishedOnly = process.argv.includes('--published') || (!slug && !all);

  let rows;
  if (slug) {
    const r = await db.query(
      `SELECT id, slug, source_url, body_excerpt, status FROM investor_buzz WHERE slug = $1`,
      [slug]
    );
    rows = r.rows;
  } else if (all) {
    const r = await db.query(
      `SELECT id, slug, source_url, body_excerpt, status FROM investor_buzz ORDER BY id`
    );
    rows = r.rows;
  } else {
    const r = await db.query(
      `SELECT id, slug, source_url, body_excerpt, status FROM investor_buzz
       WHERE ($1::boolean = false OR status = 'published')
         AND (
           length(coalesce(body_excerpt, '')) < 800
           OR body_excerpt ~ '^[0-9]{1,2} [A-Za-z]{3} [0-9]{4} \\.\\.\\.'
           OR body_excerpt LIKE '% ... %'
         )
       ORDER BY CASE WHEN status = 'published' THEN 0 ELSE 1 END, id`,
      [publishedOnly]
    );
    rows = r.rows;
  }

  console.log(`Backfilling ${rows.length} buzz row(s)...`);
  for (const item of rows) {
    const before = String(item.body_excerpt || '').length;
    try {
      const body = await ensureBuzzFullBody(item);
      const after = String(body || '').length;
      console.log(`  [${item.status || '?'}] ${item.slug || 'null'}: ${before} → ${after} chars`);
    } catch (err) {
      console.error(`  ${item.slug}: FAILED —`, err.message);
    }
    await new Promise((r) => setTimeout(r, 900));
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
