/**
 * User registration + activity analytics for the admin dashboard.
 * Tracks users from first login / directory visit onward (no historical backfill).
 */
const db = require('./db');
const { DAILY_UNLOCK_LIMIT, isUnlimitedUnlockUser } = require('./person-email-unlocks');

/** Analytics collection start (IST) — shown in admin UI. */
const TRACKING_SINCE = '2026-08-03T00:00:00+05:30';

const DDL = `
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
`;

const IST = 'Asia/Kolkata';

let tablesReady = false;
let tablesPromise = null;

function istDateString(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(d instanceof Date ? d : new Date(d));
}

function detectPlatform(req) {
  if (!req || !req.headers) return 'dweb';
  const ch = req.headers['sec-ch-ua-mobile'];
  if (ch === '?1') return 'mweb';
  if (ch === '?0') return 'dweb';
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    String(req.headers['user-agent'] || '')
  )
    ? 'mweb'
    : 'dweb';
}

function normalizePlatform(value) {
  return value === 'mweb' ? 'mweb' : 'dweb';
}

async function ensureUserAnalyticsTables() {
  if (tablesReady) return true;
  if (tablesPromise) return tablesPromise;
  if (!process.env.DATABASE_URL) return false;

  tablesPromise = db
    .query(DDL)
    .then(() => {
      tablesReady = true;
      return true;
    })
    .catch((err) => {
      tablesPromise = null;
      console.error('ensureUserAnalyticsTables failed:', err.message);
      return false;
    });
  return tablesPromise;
}

async function upsertProfile(userId, email, registeredAt, lastActiveAt, signupPlatform) {
  const ok = await ensureUserAnalyticsTables();
  if (!ok || !userId || !email) return;

  await db.query(
    `INSERT INTO user_profiles (user_id, email, registered_at, last_active_at, signup_platform, synced_at)
     VALUES ($1::uuid, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       email = EXCLUDED.email,
       registered_at = LEAST(user_profiles.registered_at, EXCLUDED.registered_at),
       last_active_at = GREATEST(
         COALESCE(user_profiles.last_active_at, 'epoch'::timestamptz),
         COALESCE(EXCLUDED.last_active_at, 'epoch'::timestamptz)
       ),
       signup_platform = COALESCE(user_profiles.signup_platform, EXCLUDED.signup_platform),
       synced_at = NOW()`,
    [userId, email, registeredAt || new Date(), lastActiveAt || null, signupPlatform || null]
  );
}

/**
 * Record a daily active user event (IST calendar day).
 */
async function recordUserActivity(user, req, opts) {
  if (!user || !user.id || user.id === 'preview') return;
  const ok = await ensureUserAnalyticsTables();
  if (!ok) return;

  const platform = normalizePlatform((opts && opts.platform) || detectPlatform(req));
  const email = String(user.email || '').trim();
  if (!email) return;

  const now = new Date();
  const activityDate = istDateString(now);
  const registeredAt = user.created_at ? new Date(user.created_at) : now;

  await upsertProfile(user.id, email, registeredAt, now, opts && opts.signupPlatform ? opts.signupPlatform : null);

  await db.query(
    `INSERT INTO user_activity_days (user_id, activity_date, platform, event_count)
     VALUES ($1::uuid, $2::date, $3, 1)
     ON CONFLICT (user_id, activity_date) DO UPDATE SET
       event_count = user_activity_days.event_count + 1,
       platform = EXCLUDED.platform,
       activity_date = EXCLUDED.activity_date`,
    [user.id, activityDate, platform]
  );

  await db.query(
    `UPDATE user_profiles SET last_active_at = GREATEST(COALESCE(last_active_at, 'epoch'::timestamptz), $2::timestamptz)
     WHERE user_id = $1::uuid`,
    [user.id, now]
  );
}

/** Fire-and-forget activity ping — never block auth paths. */
function recordUserActivitySafe(user, req, opts) {
  recordUserActivity(user, req, opts).catch((err) => {
    console.warn('recordUserActivity:', err.message);
  });
}

async function recordSessionMeta(user, req, body) {
  if (!user || !user.id || user.id === 'preview') return;
  const platform = normalizePlatform(body && body.platform);
  const isSignup = Boolean(body && body.isSignup);
  const ok = await ensureUserAnalyticsTables();
  if (!ok) return;

  const email = String(user.email || '').trim();
  const now = new Date();
  const registeredAt = user.created_at ? new Date(user.created_at) : now;

  if (isSignup) {
    await db.query(
      `INSERT INTO user_profiles (user_id, email, registered_at, last_active_at, signup_platform, synced_at)
       VALUES ($1::uuid, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         email = EXCLUDED.email,
         signup_platform = COALESCE(user_profiles.signup_platform, EXCLUDED.signup_platform),
         last_active_at = GREATEST(COALESCE(user_profiles.last_active_at, 'epoch'::timestamptz), EXCLUDED.last_active_at),
         synced_at = NOW()`,
      [user.id, email, registeredAt, now, platform]
    );
  }

  await recordUserActivity(user, req, { platform, signupPlatform: isSignup ? platform : undefined });
}

function pctChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function countRegisteredByPlatform() {
  const { rows } = await db.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE signup_platform = 'mweb')::int AS mweb,
       COUNT(*) FILTER (WHERE signup_platform = 'dweb')::int AS dweb,
       COUNT(*) FILTER (WHERE signup_platform IS NULL)::int AS unknown
     FROM user_profiles`
  );
  return rows[0] || { total: 0, mweb: 0, dweb: 0, unknown: 0 };
}

async function activeUsersBetween(startDate, endDate) {
  const { rows } = await db.query(
    `SELECT COUNT(DISTINCT user_id)::int AS c
     FROM user_activity_days
     WHERE activity_date >= $1::date AND activity_date <= $2::date`,
    [startDate, endDate]
  );
  return rows[0]?.c || 0;
}

async function dailyActiveSeries(days) {
  const { rows } = await db.query(
    `SELECT activity_date::text AS date, COUNT(DISTINCT user_id)::int AS active
     FROM user_activity_days
     WHERE activity_date >= (NOW() AT TIME ZONE '${IST}')::date - ($1::int - 1)
     GROUP BY activity_date
     ORDER BY activity_date ASC`,
    [days]
  );
  return rows;
}

async function weeklyActiveSeries(weeks) {
  const { rows } = await db.query(
    `SELECT
       date_trunc('week', activity_date)::date::text AS week_start,
       COUNT(DISTINCT user_id)::int AS active
     FROM user_activity_days
     WHERE activity_date >= (NOW() AT TIME ZONE '${IST}')::date - ($1::int * 7)
     GROUP BY 1
     ORDER BY 1 ASC`,
    [weeks]
  );
  return rows;
}

async function monthlyActiveSeries(months) {
  const { rows } = await db.query(
    `SELECT
       date_trunc('month', activity_date)::date::text AS month_start,
       COUNT(DISTINCT user_id)::int AS active
     FROM user_activity_days
     WHERE activity_date >= (date_trunc('month', (NOW() AT TIME ZONE '${IST}')::date) - ($1::int || ' months')::interval)::date
     GROUP BY 1
     ORDER BY 1 ASC`,
    [months]
  );
  return rows;
}

async function getUnlockStats() {
  try {
    const total = await db.query(`SELECT COUNT(*)::int AS c FROM user_person_email_unlocks`);
    const users = await db.query(
      `SELECT COUNT(DISTINCT user_id)::int AS c FROM user_person_email_unlocks`
    );
    return {
      totalUnlocks: total.rows[0]?.c || 0,
      usersWithUnlock: users.rows[0]?.c || 0
    };
  } catch (_) {
    return { totalUnlocks: 0, usersWithUnlock: 0 };
  }
}

async function getAnalyticsOverview() {
  const registered = await countRegisteredByPlatform();
  const today = istDateString(new Date());
  const yesterday = istDateString(new Date(Date.now() - 86400000));

  const dauToday = await activeUsersBetween(today, today);
  const dauYesterday = await activeUsersBetween(yesterday, yesterday);

  const weekEnd = today;
  const weekStart = istDateString(new Date(Date.now() - 6 * 86400000));
  const prevWeekEnd = istDateString(new Date(Date.now() - 7 * 86400000));
  const prevWeekStart = istDateString(new Date(Date.now() - 13 * 86400000));

  const wauThis = await activeUsersBetween(weekStart, weekEnd);
  const wauPrev = await activeUsersBetween(prevWeekStart, prevWeekEnd);

  const monthEnd = today;
  const monthStart = istDateString(new Date(Date.now() - 29 * 86400000));
  const prevMonthEnd = istDateString(new Date(Date.now() - 30 * 86400000));
  const prevMonthStart = istDateString(new Date(Date.now() - 59 * 86400000));

  const mauThis = await activeUsersBetween(monthStart, monthEnd);
  const mauPrev = await activeUsersBetween(prevMonthStart, prevMonthEnd);

  const unlocks = await getUnlockStats();
  const registeredTotal = registered.total || 0;
  const conversionPct =
    registeredTotal > 0
      ? Math.round((unlocks.usersWithUnlock / registeredTotal) * 1000) / 10
      : 0;

  return {
    registered,
    trackingSince: TRACKING_SINCE,
    dau: {
      today: dauToday,
      yesterday: dauYesterday,
      changePct: pctChange(dauToday, dauYesterday),
      series: await dailyActiveSeries(14)
    },
    wau: {
      thisWeek: wauThis,
      lastWeek: wauPrev,
      changePct: pctChange(wauThis, wauPrev),
      series: await weeklyActiveSeries(8)
    },
    mau: {
      thisMonth: mauThis,
      lastMonth: mauPrev,
      changePct: pctChange(mauThis, mauPrev),
      series: await monthlyActiveSeries(6)
    },
    unlocks,
    funnel: {
      registered: registeredTotal,
      unlockedAtLeastOne: unlocks.usersWithUnlock,
      conversionPct
    },
    dailyUnlockLimit: DAILY_UNLOCK_LIMIT,
    time: new Date().toISOString()
  };
}

async function listUsers({ q = '', offset = 0, limit = 50 }) {
  const take = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  const start = Math.max(0, parseInt(offset, 10) || 0);
  const term = String(q || '').trim().toLowerCase();

  const params = [];
  let where = '';
  if (term) {
    params.push('%' + term + '%');
    where = `WHERE LOWER(up.email) LIKE $${params.length}`;
  }

  const countSql = `SELECT COUNT(*)::int AS c FROM user_profiles up ${where}`;
  const { rows: countRows } = await db.query(countSql, params);
  const total = countRows[0]?.c || 0;

  params.push(take);
  params.push(start);
  const limitIdx = params.length - 1;
  const offsetIdx = params.length;

  const listSql = `
    SELECT
      up.user_id,
      up.email,
      up.registered_at,
      up.last_active_at,
      up.signup_platform,
      COALESCE(uc.unlocks_count, 0)::int AS unlocks_count
    FROM user_profiles up
    LEFT JOIN (
      SELECT user_id, COUNT(*)::int AS unlocks_count
      FROM user_person_email_unlocks
      GROUP BY user_id
    ) uc ON uc.user_id = up.user_id
    ${where}
    ORDER BY up.registered_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

  const { rows } = await db.query(listSql, params);

  const users = rows.map((row) => {
    const pseudoUser = { id: row.user_id, email: row.email };
    const unlimited = isUnlimitedUnlockUser(pseudoUser);
    return {
      userId: row.user_id,
      email: row.email,
      registeredAt: row.registered_at,
      lastActiveAt: row.last_active_at,
      signupPlatform: row.signup_platform,
      unlocksCount: row.unlocks_count,
      dailyUnlockLimit: unlimited ? null : DAILY_UNLOCK_LIMIT,
      unlimitedUnlocks: unlimited
    };
  });

  return { total, offset: start, limit: take, users, dailyUnlockLimit: DAILY_UNLOCK_LIMIT, trackingSince: TRACKING_SINCE };
}

module.exports = {
  TRACKING_SINCE,
  ensureUserAnalyticsTables,
  detectPlatform,
  recordUserActivity,
  recordUserActivitySafe,
  recordSessionMeta,
  getAnalyticsOverview,
  listUsers,
  istDateString
};
