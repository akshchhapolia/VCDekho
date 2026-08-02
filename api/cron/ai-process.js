const db = require('../../utils/db');
const { runCronJob } = require('../../utils/cron-run');
const { processItem } = require('../../utils/news-ai-process');

const MAX_ITEMS_PER_RUN = 10;

module.exports = async function handler(req, res) {
    return runCronJob(req, res, 'ai-process', async () => {
        const queueResult = await db.query(
            `SELECT * FROM raw_content WHERE status = 'queued' ORDER BY relevance_score DESC, scraped_at ASC LIMIT $1`,
            [MAX_ITEMS_PER_RUN]
        );
        const queuedItems = queueResult.rows;

        let processedCount = 0;
        let errors = [];

        for (const item of queuedItems) {
            await db.query(`UPDATE raw_content SET status = 'processing' WHERE id = $1`, [item.id]);

            const result = await processItem(item);
            if (result.success) {
                processedCount++;
            } else {
                errors.push(`Item ${item.id}: ${result.error}`);
            }
        }

        const meta = { processedCount, totalQueued: queuedItems.length, errors, provider: 'gemini' };
        if (queuedItems.length > 0 && processedCount === 0) {
            meta.alert = true;
            meta.alertSeverity = 'error';
            meta.alertSubject = 'AI process: 0 items processed with non-empty queue';
            meta.alertBody = errors.join('\n') || 'All items failed';
        }
        return meta;
    });
};
