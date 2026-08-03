const db = require('../../utils/db');
const { runCronJob } = require('../../utils/cron-run');
const { processBuzzItem } = require('../../utils/buzz-ai-process');

const MAX_ITEMS_PER_RUN = 8;

module.exports = async function handler(req, res) {
  return runCronJob(req, res, 'buzz-process', async () => {
    const queueResult = await db.query(
      `SELECT * FROM investor_buzz
       WHERE status = 'queued'
       ORDER BY relevance_score DESC, scraped_at ASC
       LIMIT $1`,
      [MAX_ITEMS_PER_RUN]
    );

    let processedCount = 0;
    let publishedCount = 0;
    const errors = [];

    for (const item of queueResult.rows) {
      await db.query(`UPDATE investor_buzz SET status = 'processing' WHERE id = $1`, [item.id]);
      const result = await processBuzzItem(item);
      if (result.success) {
        processedCount++;
        if (result.finalStatus === 'published') publishedCount++;
      } else {
        errors.push(`Item ${item.id}: ${result.error}`);
      }
    }

    const meta = {
      processedCount,
      publishedCount,
      totalQueued: queueResult.rows.length,
      errors,
      provider: 'gemini'
    };

    if (queueResult.rows.length > 0 && processedCount === 0) {
      meta.alert = true;
      meta.alertSeverity = 'warning';
      meta.alertSubject = 'Buzz process: 0 items processed with non-empty queue';
      meta.alertBody = errors.join('\n') || 'All items failed';
    }

    return meta;
  });
};
