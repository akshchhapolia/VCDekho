#!/usr/bin/env node
/**
 * Drain the raw_content news queue locally (no Vercel timeout).
 * Usage: node scripts/process_news_queue.js [--digest-batch=25]
 */
require('dotenv').config();
const db = require('../utils/db');
const { processItem } = require('../utils/news-ai-process');
const { groupItemsByNewsDay } = require('../utils/article-dates');
const { publishDigestForDay } = require('../utils/run-daily-digest');

const DIGEST_BATCH = parseInt(
    (process.argv.find((a) => a.startsWith('--digest-batch=')) || '').split('=')[1] || '25',
    10
);

async function drainDigests() {
    let digestCount = 0;
    while (true) {
        const pending = await db.query(
            `SELECT * FROM raw_content WHERE status = 'digest_pending' ORDER BY scraped_at ASC LIMIT $1`,
            [DIGEST_BATCH]
        );
        if (pending.rows.length === 0) break;

        const byDay = groupItemsByNewsDay(pending.rows);
        const dayStr = [...byDay.keys()].sort()[0];
        const items = byDay.get(dayStr);
        const result = await publishDigestForDay(dayStr, items);
        digestCount += 1;
        console.log(`  digest ${digestCount}: ${result.itemsProcessed} items (${dayStr}) → /news/${result.slug}`);
    }
    return digestCount;
}

async function main() {
    if (!process.env.GEMINI_API_KEY) {
        console.error('GEMINI_API_KEY missing');
        process.exit(1);
    }

    const startCount = await db.query(`SELECT COUNT(*)::int AS c FROM raw_content WHERE status = 'queued'`);
    const total = startCount.rows[0].c;
    console.log(`Processing ${total} queued items…\n`);

    let n = 0;
    let ok = 0;
    let err = 0;
    const byStatus = { published: 0, digest_pending: 0, discarded: 0, processing_done: 0 };

    while (true) {
        const batch = await db.query(
            `SELECT * FROM raw_content WHERE status = 'queued' ORDER BY relevance_score DESC, scraped_at ASC LIMIT 1`
        );
        if (batch.rows.length === 0) break;

        const item = batch.rows[0];
        await db.query(`UPDATE raw_content SET status = 'processing' WHERE id = $1`, [item.id]);

        const result = await processItem(item);
        n += 1;
        if (result.success) {
            ok += 1;
            byStatus[result.finalStatus] = (byStatus[result.finalStatus] || 0) + 1;
            console.log(`${n}/${total} ✓ [${result.finalStatus}] ${item.title.slice(0, 65)}`);
        } else {
            err += 1;
            console.log(`${n}/${total} ✗ ${item.title.slice(0, 50)} — ${result.error.slice(0, 80)}`);
        }
    }

    console.log(`\nQueue done: ${ok} ok, ${err} errors`);
    console.log('Breakdown:', byStatus);

    const pendingDigest = await db.query(`SELECT COUNT(*)::int AS c FROM raw_content WHERE status = 'digest_pending'`);
    if (pendingDigest.rows[0].c > 0) {
        console.log(`\nPublishing ${pendingDigest.rows[0].c} digest_pending items in batches of ${DIGEST_BATCH}…`);
        const digests = await drainDigests();
        console.log(`Digests published: ${digests}`);
    }

    const remaining = await db.query(`
        SELECT status, COUNT(*)::int c FROM raw_content
        WHERE status IN ('queued','digest_pending','error') GROUP BY 1`);
    console.log('\nRemaining:', remaining.rows);

    process.exit(err > 0 ? 1 : 0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
