/**
 * Persist which person emails each logged-in user has unlocked.
 */
const db = require('./db');

const DDL = `
CREATE TABLE IF NOT EXISTS user_person_email_unlocks (
  user_id UUID NOT NULL,
  person_slug TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, person_slug)
);
CREATE INDEX IF NOT EXISTS user_person_email_unlocks_user_unlocked_idx
  ON user_person_email_unlocks (user_id, unlocked_at DESC);
`;

let ready = false;
let readyPromise = null;

function isDbUser(user) {
  return user && user.id && user.id !== 'preview';
}

async function ensurePersonEmailUnlockTables() {
  if (ready) return true;
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    if (!process.env.DATABASE_URL) return false;
    await db.query(DDL);
    ready = true;
    return true;
  })().catch((err) => {
    readyPromise = null;
    console.error('ensurePersonEmailUnlockTables failed:', err.message);
    return false;
  });
  return readyPromise;
}

/** @returns {Promise<Map<string, Date>>} slug -> unlocked_at */
async function getUserUnlockMap(userId) {
  if (!userId || userId === 'preview') return new Map();
  const ok = await ensurePersonEmailUnlockTables();
  if (!ok) return new Map();

  const { rows } = await db.query(
    `SELECT person_slug, unlocked_at
     FROM user_person_email_unlocks
     WHERE user_id = $1::uuid`,
    [userId]
  );

  const map = new Map();
  for (const row of rows) {
    map.set(row.person_slug, new Date(row.unlocked_at));
  }
  return map;
}

async function isPersonEmailUnlocked(userId, personSlug) {
  if (!isDbUser({ id: userId }) || !personSlug) return false;
  const ok = await ensurePersonEmailUnlockTables();
  if (!ok) return false;

  const { rows } = await db.query(
    `SELECT 1 FROM user_person_email_unlocks
     WHERE user_id = $1::uuid AND person_slug = $2
     LIMIT 1`,
    [userId, personSlug]
  );
  return rows.length > 0;
}

async function recordPersonEmailUnlock(userId, personSlug) {
  if (!isDbUser({ id: userId }) || !personSlug) return false;
  const ok = await ensurePersonEmailUnlockTables();
  if (!ok) return false;

  await db.query(
    `INSERT INTO user_person_email_unlocks (user_id, person_slug, unlocked_at)
     VALUES ($1::uuid, $2, NOW())
     ON CONFLICT (user_id, person_slug) DO NOTHING`,
    [userId, personSlug]
  );
  return true;
}

/** Unlocked contacts first (most recent unlock first), then alphabetical. */
function sortPeopleByUnlocks(people, unlockMap) {
  if (!unlockMap || !unlockMap.size) {
    return [...people].sort((a, b) => a.name.localeCompare(b.name));
  }

  return [...people].sort((a, b) => {
    const aAt = unlockMap.get(a.slug);
    const bAt = unlockMap.get(b.slug);
    if (aAt && bAt) {
      const byTime = bAt.getTime() - aAt.getTime();
      if (byTime !== 0) return byTime;
      return a.name.localeCompare(b.name);
    }
    if (aAt) return -1;
    if (bAt) return 1;
    return a.name.localeCompare(b.name);
  });
}

module.exports = {
  ensurePersonEmailUnlockTables,
  getUserUnlockMap,
  isPersonEmailUnlocked,
  recordPersonEmailUnlock,
  sortPeopleByUnlocks,
  isDbUser
};
