/**
 * Ensure ops_* tables exist (idempotent). Safe to call on cold start.
 */
const db = require('./db');

let ready = false;
let readyPromise = null;

const DDL = `
CREATE TABLE IF NOT EXISTS ops_cron_runs (
  id BIGSERIAL PRIMARY KEY,
  job TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  ok BOOLEAN,
  error TEXT,
  meta JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS ops_cron_runs_job_started_idx
  ON ops_cron_runs (job, started_at DESC);
CREATE TABLE IF NOT EXISTS ops_alerts (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error',
  subject TEXT NOT NULL,
  body TEXT,
  dedupe_key TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ops_alerts_dedupe_sent_idx
  ON ops_alerts (dedupe_key, sent_at DESC);
CREATE INDEX IF NOT EXISTS ops_alerts_sent_idx
  ON ops_alerts (sent_at DESC);
`;

async function ensureOpsTables() {
  if (ready) return true;
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    if (!process.env.DATABASE_URL) return false;
    await db.query(DDL);
    ready = true;
    return true;
  })().catch((err) => {
    readyPromise = null;
    console.error('ensureOpsTables failed:', err.message);
    return false;
  });
  return readyPromise;
}

module.exports = { ensureOpsTables };
