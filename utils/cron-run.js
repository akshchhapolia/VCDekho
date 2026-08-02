/**
 * Shared cron auth + run logging + failure alerts.
 */
const db = require('./db');
const { sendAlert } = require('./notify');
const { ensureOpsTables } = require('./ops-tables');

function requireCronAuth(req, res) {
  const expected = 'Bearer ' + (process.env.CRON_SECRET || '');
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers.authorization !== expected
  ) {
    res.status(401).end('Unauthorized');
    return false;
  }
  if (process.env.NODE_ENV === 'production' && !process.env.CRON_SECRET) {
    console.error('CRON_SECRET is unset in production');
  }
  return true;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} job
 * @param {() => Promise<object|void>} fn
 */
async function runCronJob(req, res, job, fn) {
  if (!requireCronAuth(req, res)) return;

  await ensureOpsTables();
  const startedAt = new Date();
  let runId = null;

  try {
    const ins = await db.query(
      `INSERT INTO ops_cron_runs (job, started_at) VALUES ($1, $2) RETURNING id`,
      [job, startedAt.toISOString()]
    );
    runId = ins.rows[0] && ins.rows[0].id;
  } catch (err) {
    console.warn('ops_cron_runs insert skipped:', err.message);
  }

  try {
    const meta = (await fn()) || {};
    const finishedAt = new Date();
    if (runId) {
      await db
        .query(
          `UPDATE ops_cron_runs SET finished_at = $2, ok = true, meta = $3 WHERE id = $1`,
          [runId, finishedAt.toISOString(), JSON.stringify(meta)]
        )
        .catch(() => {});
    }

    // Soft-fail signals from job meta
    if (meta && meta.alert) {
      await sendAlert({
        source: 'cron:' + job,
        severity: meta.alertSeverity || 'warning',
        subject: meta.alertSubject || job + ' warning',
        body: meta.alertBody || JSON.stringify(meta, null, 2)
      });
    }

    if (!res.headersSent) {
      res.status(200).json({ success: true, job, ...meta });
    }
  } catch (error) {
    console.error('cron ' + job + ' failed:', error);
    const finishedAt = new Date();
    if (runId) {
      await db
        .query(
          `UPDATE ops_cron_runs SET finished_at = $2, ok = false, error = $3 WHERE id = $1`,
          [runId, finishedAt.toISOString(), String(error.message || error).slice(0, 2000)]
        )
        .catch(() => {});
    }
    await sendAlert({
      source: 'cron:' + job,
      severity: 'error',
      subject: job + ' failed',
      body: String(error.stack || error.message || error).slice(0, 4000)
    });
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || 'cron failed' });
    }
  }
}

module.exports = { requireCronAuth, runCronJob };
