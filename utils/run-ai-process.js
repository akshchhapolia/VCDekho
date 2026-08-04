/**
 * Shared news + buzz AI queue processor.
 * Used by api/cron/ai-process.js and chained from api/cron/scrape.js after ingest.
 */
const db = require('./db');
const { processItem } = require('./news-ai-process');
const { processBuzzItem } = require('./buzz-ai-process');

const MAX_ITEMS_PER_RUN = 10;
const MAX_BUZZ_PER_RUN = 8;

/**
 * @param {{ maxNews?: number, maxBuzz?: number, includeBuzz?: boolean, triggeredBy?: string }} [options]
 */
async function runAiProcess(options = {}) {
    const maxNews = options.maxNews ?? MAX_ITEMS_PER_RUN;
    const maxBuzz = options.maxBuzz ?? MAX_BUZZ_PER_RUN;
    const includeBuzz = options.includeBuzz !== false;

    const queueResult = await db.query(
        `SELECT * FROM raw_content WHERE status = 'queued' ORDER BY relevance_score DESC, scraped_at ASC LIMIT $1`,
        [maxNews]
    );
    const queuedItems = queueResult.rows;

    let processedCount = 0;
    const errors = [];

    for (const item of queuedItems) {
        await db.query(`UPDATE raw_content SET status = 'processing' WHERE id = $1`, [item.id]);

        const result = await processItem(item);
        if (result.success) {
            processedCount++;
        } else {
            errors.push(`Item ${item.id}: ${result.error}`);
        }
    }

    let buzzProcessed = 0;
    let buzzPublished = 0;
    const buzzErrors = [];

    if (includeBuzz) {
        try {
            const buzzQueue = await db.query(
                `SELECT * FROM investor_buzz WHERE status = 'queued' ORDER BY relevance_score DESC, scraped_at ASC LIMIT $1`,
                [maxBuzz]
            );
            for (const item of buzzQueue.rows) {
                await db.query(`UPDATE investor_buzz SET status = 'processing' WHERE id = $1`, [item.id]);
                const result = await processBuzzItem(item);
                if (result.success) {
                    buzzProcessed++;
                    if (result.finalStatus === 'published') buzzPublished++;
                } else {
                    buzzErrors.push(`Buzz ${item.id}: ${result.error}`);
                }
            }
        } catch (buzzErr) {
            buzzErrors.push(buzzErr.message);
        }
    }

    const meta = {
        processedCount,
        totalQueued: queuedItems.length,
        errors,
        provider: 'gemini',
        buzzProcessed,
        buzzPublished,
        buzzErrors
    };

    if (options.triggeredBy) {
        meta.triggeredBy = options.triggeredBy;
    }

    if (queuedItems.length > 0 && processedCount === 0) {
        meta.alert = true;
        meta.alertSeverity = 'error';
        meta.alertSubject = 'AI process: 0 items processed with non-empty queue';
        meta.alertBody = errors.join('\n') || 'All items failed';
    }

    return meta;
}

module.exports = {
    runAiProcess,
    MAX_ITEMS_PER_RUN,
    MAX_BUZZ_PER_RUN
};
