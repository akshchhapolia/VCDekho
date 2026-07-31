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
const ALL_THIN = process.argv.includes('--all-thin');
const LIMIT = argVal('--limit', ALL_THIN ? 9999 : 5);
const CONCURRENCY = argVal('--concurrency', 4);
const MIN_COMPANIES = argVal('--min-companies', 8);
const MAX_COMPANIES = argVal('--max-companies', null);

function loadInvestorsBySlug() {
  const data = JSON.parse(fs.readFileSync(INVESTORS_PATH, 'utf8'));
  const map = new Map();
  for (const inv of data.investors || []) {
    if (inv && inv.slug) map.set(inv.slug, inv);
  }
  return map;
}

function portfolioNeedsEnrichment(companies) {
  if (!companies || !companies.length) return false;
  const n = companies.length;
  const website = companies.filter((c) => c.website).length;
  const sector = companies.filter((c) => c.sector).length;
  const date = companies.filter((c) => c.date).length;
  const stage = companies.filter((c) => c.stage && !/^unknown$/i.test(c.stage)).length;
  // Already rich enough — skip.
  if (website >= n * 0.6 && (sector >= n * 0.3 || stage >= n * 0.2 || date >= n * 0.2)) {
    return false;
  }
  return website < n * 0.5 || sector < n * 0.25 || date < n * 0.15;
}

async function loadPortfolioRows(bySlug) {
  if (ONLY_SLUG) {
    const r = await db.query(
      `SELECT slug, companies, company_count, source_method FROM investor_portfolio WHERE slug = $1`,
      [ONLY_SLUG]
    );
    return r.rows;
  }

  const params = [];
  let sql = `SELECT slug, companies, company_count, source_method
             FROM investor_portfolio
             WHERE company_count >= $1`;
  params.push(MIN_COMPANIES);
  if (METHOD) {
    params.push(METHOD);
    sql += ` AND source_method = $${params.length}`;
  }
  if (MAX_COMPANIES != null) {
    params.push(MAX_COMPANIES);
    sql += ` AND company_count <= $${params.length}`;
  }
  sql += ` ORDER BY company_count DESC`;
  const r = await db.query(sql, params);
  let rows = r.rows;
  if (ALL_THIN) {
    rows = rows.filter((row) => {
      const inv = bySlug.get(row.slug);
      if (!inv || !inv.website) return false;
      return portfolioNeedsEnrichment(row.companies || []);
    });
  }
  return rows.slice(0, LIMIT);
}
async function main() {
  const bySlug = loadInvestorsBySlug();
  const rows = await loadPortfolioRows(bySlug);
  console.log(`Enriching ${rows.length} investor portfolio(s)…`);
  let totalUpdated = 0;
  let processed = 0;

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
    processed += 1;
    if (processed % 10 === 0 || processed === rows.length) {
      console.log(`  … progress ${processed}/${rows.length}`);
    }
  }

  console.log(`Done. Companies enriched: ${totalUpdated}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
