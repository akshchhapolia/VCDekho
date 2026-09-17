-- Ops tables for cron runs + alert dedup (VC Dekho)
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

CREATE UNIQUE INDEX IF NOT EXISTS ops_alerts_dedupe_recent_idx
  ON ops_alerts (dedupe_key, sent_at DESC);

CREATE INDEX IF NOT EXISTS ops_alerts_sent_idx
  ON ops_alerts (sent_at DESC);
