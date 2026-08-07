-- User analytics for admin dashboard (profiles + daily activity in IST)

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  registered_at TIMESTAMPTZ NOT NULL,
  last_active_at TIMESTAMPTZ,
  signup_platform TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_profiles_registered_at_idx ON user_profiles (registered_at DESC);
CREATE INDEX IF NOT EXISTS user_profiles_last_active_at_idx ON user_profiles (last_active_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS user_activity_days (
  user_id UUID NOT NULL,
  activity_date DATE NOT NULL,
  platform TEXT NOT NULL DEFAULT 'dweb',
  event_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS user_activity_days_date_idx ON user_activity_days (activity_date DESC);

CREATE TABLE IF NOT EXISTS user_analytics_meta (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
