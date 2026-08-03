#!/usr/bin/env node
/** Unpublish buzz items that fail the founder-review gate (one-time or periodic cleanup). */
require('dotenv').config();

const db = require('../utils/db');
const { isHardRejectBuzzPost, shouldQueueBuzzPost } = require('../utils/buzz-relevance');
const { processBuzzItem } = require('../utils/buzz-ai-process');

async function main() {
  const { rows } = await db.query(`SELECT * FROM investor_buzz WHERE status = 'published'`);
  let demoted = 0;
  for (const row of rows) {
    if (isHardRejectBuzzPost(row.title, row.body_excerpt)) {
      await db.query(
        `UPDATE investor_buzz SET status = 'rejected', error_log = $2, published_at = NULL WHERE id = $1`,
        [row.id, 'audit: hard reject — not a founder VC review']
      );
      demoted++;
      console.log('demoted (hard):', row.title.slice(0, 70));
      continue;
    }
    const gate = shouldQueueBuzzPost(row.title, row.body_excerpt);
    if (!gate.queue) {
      await db.query(
        `UPDATE investor_buzz SET status = 'rejected', error_log = $2, published_at = NULL WHERE id = $1`,
        [row.id, `audit: weak scrape signals (${gate.reason})`]
      );
      demoted++;
      console.log('demoted (weak):', row.title.slice(0, 70));
    }
  }
  console.log(`Audit done. Demoted ${demoted}/${rows.length} published items.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
