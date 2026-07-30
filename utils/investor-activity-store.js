/**
 * Reads/writes the `investor_activity` table — the persistent, live store
 * for the "actively deploying" signal. Two producers write to it:
 *   - api/cron/investor-activity.js        (source_method = 'news_pipeline')
 *   - api/cron/investor-activity-backfill  (source_method = 'web_search_backfill')
 *
 * `checked_at` is bumped on every write, even when nothing new was found —
 * this doubles as a queue cursor for the backfill cron (least-recently-
 * checked investors are re-checked first) and prevents either producer from
 * hammering an investor that was just looked at.
 */
const db = require('./db');

// Must match utils/investors.js ACTIVE_WINDOW_DAYS — kept as a separate
// constant here (like elsewhere in this feature) to avoid a circular import.
const WINDOW_DAYS = 180;
const MAX_STORED_CHECKS = 5;

function checkKey(c) {
  if (c && c.source) return 'src:' + String(c.source).toLowerCase();
  const day = c && c.date ? String(c.date).slice(0, 10) : '';
  return 'day:' + day + '|' + String((c && c.highlight) || '').toLowerCase().slice(0, 40);
}

/**
 * Merge two recentChecks arrays (one already stored, one freshly found),
 * deduping by source URL (or date+highlight when there's no URL) so the
 * same deal reported by both the news pipeline and web-search backfill
 * doesn't show up twice. Keeps the newest MAX_STORED_CHECKS entries.
 */
function mergeChecks(existing, incoming) {
  const map = new Map();
  [...(existing || []), ...(incoming || [])].forEach((c) => {
    if (!c || !c.date) return;
    const key = checkKey(c);
    const prev = map.get(key);
    if (!prev || new Date(c.date) > new Date(prev.date)) map.set(key, c);
  });
  return [...map.values()]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, MAX_STORED_CHECKS);
}

/**
 * Upsert one investor's activity signal. Unlike a plain "freshest wins"
 * overwrite, this MERGES the incoming recentChecks into whatever is already
 * stored — so a rich, multi-deal list from the news pipeline doesn't get
 * truncated down to one entry the next time the (leaner) web-search backfill
 * touches the same investor, and vice versa. `checked_at` always advances to
 * now, which doubles as the backfill queue cursor.
 */
async function upsertActivity(slug, found /* null | { lastCheckDate, lastCheckSector, lastCheckHighlight, lastCheckSource, lastCheckSourceTitle, recentCheckCount, totalMentions, recentChecks } */, sourceMethod) {
  const existing = await db.query(`SELECT * FROM investor_activity WHERE slug = $1`, [slug]);
  const row = existing.rows[0] || null;
  const existingChecks = (row && row.recent_checks) || [];

  const merged = found ? mergeChecks(existingChecks, found.recentChecks || []) : existingChecks;

  if (!found || !merged.length) {
    // Nothing new found (or nothing at all stored yet) — just bump
    // checked_at so the backfill queue moves on.
    await db.query(
      `INSERT INTO investor_activity (slug, checked_at, source_method, updated_at)
       VALUES ($1, NOW(), COALESCE($2, (SELECT source_method FROM investor_activity WHERE slug = $1)), NOW())
       ON CONFLICT (slug) DO UPDATE SET checked_at = NOW(), updated_at = NOW()`,
      [slug, row ? null : sourceMethod]
    );
    return { slug, updated: false };
  }

  const top = merged[0];
  const now = Date.now();
  const recentCheckCount = merged.filter(
    (c) => (now - new Date(c.date).getTime()) / (24 * 60 * 60 * 1000) <= WINDOW_DAYS
  ).length;
  const totalMentions = Math.max((row && row.total_mentions) || 0, found.totalMentions || 0, merged.length);

  await db.query(
    `INSERT INTO investor_activity
       (slug, last_check_date, last_check_sector, last_check_highlight, last_check_source, last_check_source_title,
        recent_check_count, total_mentions, recent_checks, source_method, checked_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
     ON CONFLICT (slug) DO UPDATE SET
       last_check_date = EXCLUDED.last_check_date,
       last_check_sector = EXCLUDED.last_check_sector,
       last_check_highlight = EXCLUDED.last_check_highlight,
       last_check_source = EXCLUDED.last_check_source,
       last_check_source_title = EXCLUDED.last_check_source_title,
       recent_check_count = EXCLUDED.recent_check_count,
       total_mentions = EXCLUDED.total_mentions,
       recent_checks = EXCLUDED.recent_checks,
       source_method = EXCLUDED.source_method,
       checked_at = NOW(),
       updated_at = NOW()`,
    [
      slug,
      top.date,
      top.sector || null,
      top.highlight || null,
      top.source || null,
      top.sourceTitle || null,
      recentCheckCount,
      totalMentions,
      JSON.stringify(merged),
      sourceMethod
    ]
  );
  return { slug, updated: true };
}

async function getAllActivity() {
  const { rows } = await db.query(`SELECT * FROM investor_activity`);
  return rows;
}

/**
 * Slugs least-recently checked first (never-checked first). Used by the
 * backfill cron to pick its next batch.
 */
async function getStaleSlugs(allSlugs, limit, staleAfterDays) {
  const { rows } = await db.query(
    `SELECT slug, checked_at FROM investor_activity WHERE checked_at > NOW() - INTERVAL '1 day' * $1`,
    [staleAfterDays]
  );
  const recentlyChecked = new Set(rows.map((r) => r.slug));
  const candidates = allSlugs.filter((slug) => !recentlyChecked.has(slug));

  // Order remaining candidates by their stored checked_at ascending (nulls/never-checked first).
  const { rows: allRows } = await db.query(`SELECT slug, checked_at FROM investor_activity`);
  const checkedAtBySlug = new Map(allRows.map((r) => [r.slug, r.checked_at ? new Date(r.checked_at).getTime() : 0]));
  candidates.sort((a, b) => (checkedAtBySlug.get(a) || 0) - (checkedAtBySlug.get(b) || 0));

  return candidates.slice(0, limit);
}

module.exports = { upsertActivity, getAllActivity, getStaleSlugs };
