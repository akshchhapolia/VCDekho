#!/usr/bin/env node
/**
 * Align published_at with title/news-day for daily digests (and funding where needed).
 * Usage: node scripts/fix_article_dates.js [--dry-run]
 */
require('dotenv').config();
const db = require('../utils/db');
const {
  istCalendarDay,
  parseDigestDayFromTitle,
  digestPublishedAtFromDay,
  rawContentDate
} = require('../utils/article-dates');

const dryRun = process.argv.includes('--dry-run');

async function fixDigests() {
  const rows = await db.query(`
    SELECT id, title, published_at, slug
    FROM articles WHERE category = 'daily-digest' AND status = 'published'
    ORDER BY published_at DESC`);

  let fixed = 0;
  for (const row of rows.rows) {
    const dayFromTitle = parseDigestDayFromTitle(row.title, 2026);
    if (!dayFromTitle) continue;

    const correctAt = digestPublishedAtFromDay(dayFromTitle);
    const pubDay = istCalendarDay(row.published_at);

    if (pubDay !== dayFromTitle) {
      console.log(`digest: "${row.title}" ${pubDay} → ${dayFromTitle}`);
      if (!dryRun) {
        await db.query(`UPDATE articles SET published_at = $1 WHERE id = $2`, [correctAt, row.id]);
      }
      fixed += 1;
    }
  }
  return fixed;
}

async function fixFundingFromRaw() {
  const rows = await db.query(`
    SELECT a.id, a.title, a.published_at,
           COALESCE(rc.published_at_source, rc.scraped_at) AS news_at
    FROM articles a
    JOIN raw_content rc ON rc.id = a.raw_content_id
    WHERE a.category = 'funding-round' AND a.status = 'published'
      AND COALESCE(rc.published_at_source, rc.scraped_at) IS NOT NULL`);

  let fixed = 0;
  for (const row of rows.rows) {
    const newsAt = new Date(row.news_at);
    const pubDay = istCalendarDay(row.published_at);
    const newsDay = istCalendarDay(newsAt);
    if (pubDay !== newsDay) {
      console.log(`funding: "${row.title.slice(0, 50)}" ${pubDay} → ${newsDay}`);
      if (!dryRun) {
        await db.query(`UPDATE articles SET published_at = $1 WHERE id = $2`, [newsAt, row.id]);
      }
      fixed += 1;
    }
  }
  return fixed;
}

async function main() {
  console.log(dryRun ? 'DRY RUN\n' : 'Applying fixes…\n');
  const d = await fixDigests();
  const f = await fixFundingFromRaw();
  console.log(`\nFixed ${d} digests, ${f} funding articles.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
