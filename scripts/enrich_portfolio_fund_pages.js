#!/usr/bin/env node
/**
 * Enrich portfolio companies from the fund's own /companies/{slug} pages.
 *
 * Usage:
 *   node scripts/enrich_portfolio_fund_pages.js --slug accel
 *   node scripts/enrich_portfolio_fund_pages.js --method site_paths --limit 20 --concurrency 4
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const db = require('../utils/db');
const { upsertPortfolio } = require('../utils/investor-portfolio-store');
const { enrichCompaniesFromFundPages } = require('../utils/enrich-portfolio-fund-pages');

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
const METHOD = argVal('--method', null);
const LIMIT = argVal('--limit', 5);
const CONCURRENCY = argVal('--concurrency', 4);

function loadInvestorsBySlug() {
  const data = JSON.parse(fs.readFileSync(INVESTORS_PATH, 'utf8'));
  const map = new Map();
  for (const inv of data.investors || []) {
    if (inv && inv.slug) map.set(inv.slug, inv);
  }
  return map;
}

async function main() {
  const bySlug = loadInvestorsBySlug();
  let rows;
  if (ONLY_SLUG) {
    const r = await db.query(
      `SELECT slug, companies, company_count, source_method FROM investor_portfolio WHERE slug = $1`,
      [ONLY_SLUG]
    );
    rows = r.rows;
  } else {
    const params = [];
    let sql = `SELECT slug, companies, company_count, source_method FROM investor_portfolio WHERE company_count > 0`;
    if (METHOD) {
      params.push(METHOD);
      sql += ` AND source_method = $${params.length}`;
    }
    sql += ` ORDER BY company_count DESC LIMIT $${params.length + 1}`;
    params.push(LIMIT);
    const r = await db.query(sql, params);
    rows = r.rows;
  }

  console.log(`Enriching ${rows.length} investor portfolio(s)…`);
  let totalUpdated = 0;

  for (const row of rows) {
    const inv = bySlug.get(row.slug);
    const website = (inv && inv.website) || null;
    if (!website) {
      console.log(`  skip ${row.slug}: no investor website`);
      continue;
    }
    const before = row.companies || [];
    const { companies, updated, checked } = await enrichCompaniesFromFundPages(before, website, {
      concurrency: CONCURRENCY,
      delayMs: 100,
      onlyThin: true
    });
    if (updated > 0) {
      await upsertPortfolio(row.slug, companies, row.source_method || 'site_paths');
      // upsert with official set merge may prefer official empty fields — force write:
      await db.query(
        `UPDATE investor_portfolio SET companies = $2, company_count = $3, updated_at = NOW() WHERE slug = $1`,
        [row.slug, JSON.stringify(companies), companies.length]
      );
    }
    const withSite = companies.filter((c) => c.website).length;
    const withSector = companies.filter((c) => c.sector).length;
    const withDate = companies.filter((c) => c.date).length;
    const withStage = companies.filter((c) => c.stage && !/^unknown$/i.test(c.stage)).length;
    console.log(
      `  ${row.slug}: checked ${checked}, updated ${updated} → website ${withSite}, sector ${withSector}, stage ${withStage}, date ${withDate}`
    );
    totalUpdated += updated;
  }

  console.log(`Done. Companies enriched: ${totalUpdated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
