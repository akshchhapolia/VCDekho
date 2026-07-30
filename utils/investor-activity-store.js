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

/**
 * Upsert one investor's activity signal. Whichever source has the *newer*
 * lastCheckDate wins for the display fields — this lets news-pipeline hits
 * and web-search backfill results coexist safely without one clobbering a
 * fresher result from the other. `checked_at` always advances to now.
 */
async function upsertActivity(slug, found /* null | { lastCheckDate, lastCheckSector, lastCheckHighlight, lastCheckSource, lastCheckSourceTitle, recentCheckCount, totalMentions, recentChecks } */, sourceMethod) {
  const existing = await db.query(`SELECT * FROM investor_activity WHERE slug = $1`, [slug]);
  const row = existing.rows[0] || null;

  const existingDate = row && row.last_check_date ? new Date(row.last_check_date).getTime() : 0;
  const newDate = found && found.lastCheckDate ? new Date(found.lastCheckDate).getTime() : 0;
  const newIsFresher = newDate > 0 && newDate >= existingDate;

  if (!found || !newIsFresher) {
    // Nothing found, or what we found is staler than what's already stored —
    // just bump checked_at so the backfill queue moves on.
    await db.query(
      `INSERT INTO investor_activity (slug, checked_at, source_method, updated_at)
       VALUES ($1, NOW(), COALESCE($2, (SELECT source_method FROM investor_activity WHERE slug = $1)), NOW())
       ON CONFLICT (slug) DO UPDATE SET checked_at = NOW(), updated_at = NOW()`,
      [slug, row ? null : sourceMethod]
    );
    return { slug, updated: false };
  }

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
      found.lastCheckDate,
      found.lastCheckSector || null,
      found.lastCheckHighlight || null,
      found.lastCheckSource || null,
      found.lastCheckSourceTitle || null,
      found.recentCheckCount || 0,
      found.totalMentions || 0,
      JSON.stringify(found.recentChecks || []),
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
