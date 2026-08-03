-- Per-user persisted email unlocks for the people directory
CREATE TABLE IF NOT EXISTS user_person_email_unlocks (
  user_id UUID NOT NULL,
  person_slug TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, person_slug)
);

CREATE INDEX IF NOT EXISTS user_person_email_unlocks_user_unlocked_idx
  ON user_person_email_unlocks (user_id, unlocked_at DESC);
