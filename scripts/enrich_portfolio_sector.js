#!/usr/bin/env node
/**
 * Backfill portfolio company sector from startup website meta.
 *
 * Usage:
 *   node scripts/enrich_portfolio_sector.js --all
 *   node scripts/enrich_portfolio_sector.js --slug accel
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../utils/db');
const { enrichCompaniesSectors, needsSectorBackfill } = require('../utils/enrich-portfolio-sector');

const INVESTORS_PATH = path.join(__dirname, '..', 'data', 'investors.json');

function argVal(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = process.argv[idx + 1];
  if (def === null || typeof def === 'string') return v == null ? def : v;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

const ONLY_SLUG = argVal('--slug', null);
const ALL = process.argv.includes('--all');
const LIMIT = argVal('--limit', ALL ? 9999 : 20);
const CONCURRENCY = argVal('--concurrency', 4);

async function main() {
  let rows;
  if (ONLY_SLUG) {
    const r = await db.query(
      `SELECT slug, companies, company_count FROM investor_portfolio WHERE slug = $1`,
      [ONLY_SLUG]
    );
    rows = r.rows;
  } else {
    const r = await db.query(
      `SELECT slug, companies, company_count FROM investor_portfolio WHERE company_count > 0 ORDER BY company_count DESC`
    );
    rows = r.rows.filter((row) => (row.companies || []).some(needsSectorBackfill)).slice(0, LIMIT);
  }

  console.log(`Sector backfill for ${rows.length} investor(s)…`);
  let totalUpdated = 0;
  let totalSpent = 0;

  for (const row of rows) {
    const before = row.companies || [];
    const gap = before.filter(needsSectorBackfill).length;
    if (!gap) continue;

    const { companies, updated, costUsd } = await enrichCompaniesSectors(before, {
      concurrency: CONCURRENCY,
      delayMs: 60
    });
    if (updated > 0) {
      await db.query(
        `UPDATE investor_portfolio SET companies = $2, company_count = $3, updated_at = NOW() WHERE slug = $1`,
        [row.slug, JSON.stringify(companies), companies.length]
      );
    }
    totalUpdated += updated;
    totalSpent += costUsd || 0;
    const withSector = companies.filter((c) => c.sector).length;
    console.log(`  ${row.slug}: ${updated}/${gap} filled → ${withSector} with sector`);
  }

  console.log(`Done. Sectors added: ${totalUpdated}. Est. spend $${totalSpent.toFixed(4)}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
