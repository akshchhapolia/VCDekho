/**
 * Multiplexed ops endpoint (keeps Hobby function count at 12 by absorbing sitemap).
 *
 *   GET  ?action=health        public
 *   GET  ?action=sitemap       public (also via /sitemap.xml rewrite)
 *   GET  ?action=status        ADMIN_SECRET
 *   GET  ?action=analytics    ADMIN_SECRET (view=overview|users)
 *   POST ?action=test-alert    ADMIN_SECRET
 *   GET  ?action=ping-vendors  CRON_SECRET (production)
 */
const db = require('../utils/db');
const { sendAlert } = require('../utils/notify');
const { ensureOpsTables } = require('../utils/ops-tables');
const { renderSitemapXml } = require('../utils/render-sitemap');
const { requireCronAuth } = require('../utils/cron-run');
const { getAllInvestors } = require('../utils/investors');
const { getAllPeople } = require('../utils/people');
const { getAnalyticsOverview, listUsers } = require('../utils/user-analytics');

function requireAdmin(req, res) {
  const expected = 'Bearer ' + (process.env.ADMIN_SECRET || '');
  if (!process.env.ADMIN_SECRET || req.headers.authorization !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

async function handleHealth(res) {
  const databaseUrlConfigured = Boolean(process.env.DATABASE_URL);
  const cronSecretConfigured = Boolean(process.env.CRON_SECRET);
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  let dbOk = false;
  let dbError = null;

  if (databaseUrlConfigured) {
    try {
      await db.query('SELECT 1 AS ok');
      dbOk = true;
    } catch (err) {
      dbError = err.message;
    }
  }

  const ok = dbOk && databaseUrlConfigured;
  const payload = {
    ok,
    db: dbOk,
    dbError,
    databaseUrlConfigured,
    cronSecretConfigured,
    resendConfigured,
    time: new Date().toISOString()
  };

  if (!ok && process.env.NODE_ENV === 'production' && !databaseUrlConfigured) {
    await sendAlert({
      source: 'health',
      severity: 'critical',
      subject: 'DATABASE_URL missing in production',
      body: 'News and profile overlays will degrade or serve mock data.'
    }).catch(() => {});
  }

  res.status(ok ? 200 : 503).json(payload);
}

async function handleSitemap(res) {
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  try {
    const xml = await renderSitemapXml();
    res.status(200).send(xml);
  } catch (error) {
    console.error('sitemap error:', error);
    res
      .status(200)
      .send(
        '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://vcdekho.com/</loc></url></urlset>'
      );
  }
}

async function handleStatus(res) {
  await ensureOpsTables();
  const investors = getAllInvestors().length;
  const people = getAllPeople({ includeHidden: true }).length;
  const peoplePublic = getAllPeople().length;

  let articlesToday = 0;
  let thinActivity = 0;
  let contactPending = 0;
  let cronRuns = [];
  let recentAlerts = [];

  try {
    const a = await db.query(
      `SELECT COUNT(*)::int AS c FROM articles
       WHERE status = 'published' AND published_at::date = CURRENT_DATE`
    );
    articlesToday = a.rows[0].c;
  } catch (_) {}

  try {
    const t = await db.query(
      `SELECT COUNT(*)::int AS c FROM investor_activity
       WHERE last_check_date IS NOT NULL
         AND jsonb_array_length(COALESCE(recent_checks,'[]'::jsonb)) <= 2`
    );
    thinActivity = t.rows[0].c;
  } catch (_) {}

  try {
    const c = await db.query(
      `SELECT COUNT(*)::int AS c FROM contact_messages WHERE created_at > NOW() - INTERVAL '30 days'`
    );
    contactPending = c.rows[0].c;
  } catch (_) {
    try {
      const c2 = await db.query(`SELECT COUNT(*)::int AS c FROM contact_messages`);
      contactPending = c2.rows[0].c;
    } catch (__) {}
  }

  try {
    const r = await db.query(
      `SELECT DISTINCT ON (job) job, started_at, finished_at, ok, error, meta
       FROM ops_cron_runs
       ORDER BY job, started_at DESC
       LIMIT 20`
    );
    cronRuns = r.rows;
  } catch (_) {}

  try {
    const al = await db.query(
      `SELECT id, source, severity, subject, sent_at
       FROM ops_alerts ORDER BY sent_at DESC LIMIT 20`
    );
    recentAlerts = al.rows;
  } catch (_) {}

  res.status(200).json({
    counts: { investors, people, peoplePublic, articlesToday, thinActivity, contactMessages30d: contactPending },
    cronRuns,
    recentAlerts,
    env: {
      databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
      cronSecretConfigured: Boolean(process.env.CRON_SECRET),
      resendConfigured: Boolean(process.env.RESEND_API_KEY),
      searloConfigured: Boolean(process.env.SEARLO_API_KEY),
      anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY)
    },
    time: new Date().toISOString()
  });
}

async function handlePingVendors(req, res) {
  if (!requireCronAuth(req, res)) return;

  const results = { searlo: null, gemini: null, anthropic: null };
  const alerts = [];

  // Searlo
  try {
    const { webSearch } = require('../utils/web-search');
    const r = await webSearch('VC Dekho health check', { limit: 1 });
    results.searlo = {
      ok: true,
      creditsRemaining: r.creditsRemaining
    };
    if (r.creditsRemaining != null && r.creditsRemaining < 50) {
      alerts.push({
        subject: 'Searlo credits low (' + r.creditsRemaining + ')',
        body: 'Credits remaining: ' + r.creditsRemaining
      });
    }
  } catch (err) {
    results.searlo = { ok: false, error: err.message, status: err.status };
    if (err.status === 402 || /insufficient credits/i.test(err.message || '')) {
      alerts.push({
        subject: 'Searlo out of credits (402)',
        body: err.message
      });
    } else {
      alerts.push({ subject: 'Searlo ping failed', body: err.message });
    }
  }

  // Gemini
  try {
    const { generateText } = require('../utils/gemini');
    const { text } = await generateText({
      system: 'Reply with exactly OK',
      user: 'ping',
      maxOutputTokens: 8,
      jsonMode: false
    });
    results.gemini = { ok: /ok/i.test(text || ''), sample: String(text || '').slice(0, 40) };
    if (!results.gemini.ok) {
      alerts.push({ subject: 'Gemini ping unexpected response', body: String(text) });
    }
  } catch (err) {
    results.gemini = { ok: false, error: err.message };
    alerts.push({ subject: 'Gemini ping failed', body: err.message });
  }

  // News/blog pipeline uses Gemini; Anthropic is optional (legacy scripts only).
  results.anthropic = {
    ok: Boolean(process.env.ANTHROPIC_API_KEY),
    configured: Boolean(process.env.ANTHROPIC_API_KEY)
  };

  if (!process.env.GEMINI_API_KEY) {
    alerts.push({
      subject: 'GEMINI_API_KEY missing',
      body: 'News/blog AI crons (ai-process, daily-digest, ai-blog) will fail without Gemini.'
    });
  }

  for (const a of alerts) {
    await sendAlert({
      source: 'vendor-watch',
      severity: 'error',
      subject: a.subject,
      body: a.body
    });
  }

  await ensureOpsTables();
  try {
    await db.query(
      `INSERT INTO ops_cron_runs (job, started_at, finished_at, ok, meta)
       VALUES ('ping-vendors', NOW(), NOW(), $1, $2)`,
      [alerts.length === 0, JSON.stringify(results)]
    );
  } catch (_) {}

  res.status(200).json({ success: true, results, alertsSent: alerts.length });
}

async function handleAnalytics(req, res) {
  const view = String((req.query && req.query.view) || 'overview').toLowerCase();

  if (view === 'users') {
    const data = await listUsers({
      q: req.query.q || '',
      offset: req.query.offset || 0,
      limit: req.query.limit || 50
    });
    return res.status(200).json(data);
  }

  const overview = await getAnalyticsOverview();
  return res.status(200).json(overview);
}

module.exports = async function handler(req, res) {
  const action = String((req.query && req.query.action) || '').toLowerCase() || 'health';

  try {
    if (action === 'health') return handleHealth(res);
    if (action === 'sitemap') return handleSitemap(res);

    if (action === 'status') {
      if (!requireAdmin(req, res)) return;
      return handleStatus(res);
    }

    if (action === 'test-alert') {
      if (!requireAdmin(req, res)) return;
      const result = await sendAlert({
        source: 'admin-test',
        severity: 'info',
        subject: 'Test alert from admin dashboard',
        body: 'If you received this, Resend → team@vcdekho.com is working.',
        force: true
      });
      return res.status(200).json(result);
    }

    if (action === 'ping-vendors') {
      return handlePingVendors(req, res);
    }

    if (action === 'analytics') {
      if (!requireAdmin(req, res)) return;
      return handleAnalytics(req, res);
    }

    return res.status(400).json({ error: 'Unknown action', action });
  } catch (err) {
    console.error('ops error:', err);
    return res.status(500).json({ error: err.message });
  }
};
