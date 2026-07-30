#!/usr/bin/env node
/**
 * Backfills investor portfolio companies via Searlo web search + Gemini
 * extraction for every investor (or a stale / low-coverage slice).
 *
 * Usage:
 *   node scripts/investor_portfolio_websearch.js --limit 40
 *   node scripts/investor_portfolio_websearch.js --limit 1017 --concurrency 5 --stale-after 0 --budget 10
 *   node scripts/investor_portfolio_websearch.js --max-companies 1 --limit 800 --concurrency 3 --budget 5
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { lookupInvestorPortfolio } = require('../utils/investor-portfolio-websearch');
const {
  upsertPortfolio,
  getStalePortfolioSlugs,
  getLowCoverageSlugs
} = require('../utils/investor-portfolio-store');

const INVESTORS_PATH = path.join(__dirname, '..', 'data', 'investors.json');

function argVal(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = Number(process.argv[idx + 1]);
  return Number.isFinite(v) ? v : def;
}

const LIMIT = argVal('--limit', 40);
const CONCURRENCY = argVal('--concurrency', 3);
const STALE_AFTER_DAYS = argVal('--stale-after', 30);
const BUDGET_USD = argVal('--budget', Infinity);
// When set (incl. 0), re-run investors with company_count <= this value
// instead of the stale queue. Use --max-companies 1 for empty/near-empty.
const MAX_COMPANIES_FILTER = process.argv.includes('--max-companies')
  ? argVal('--max-companies', 0)
  : null;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, retries = 5) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRateLimit = err && (err.status === 429 || /rate.?limit/i.test(err.message || ''));
      const isOverloaded = err && (err.status === 529 || err.status === 503);
      if (!isRateLimit && !isOverloaded) throw err;
      // Searlo often returns retryAfter: 60 on free/micro minute buckets.
      const match = String(err.message || '').match(/retryAfter["\s:]+(\d+)/i);
      const retryAfterSec = match ? Number(match[1]) : 0;
      const backoffMs = Math.max(retryAfterSec * 1000, 5000 * Math.pow(2, i));
      console.warn(`  Rate/overload hit, retrying in ${Math.round(backoffMs / 1000)}s...`);
      await sleep(backoffMs);
    }
  }
  throw lastErr;
}

function isFatalAccountError(err) {
  return (
    err &&
    (err.status === 402 ||
      err.status === 403 ||
      /credit balance is too low|insufficient credits|prepayment credits are depleted|RESOURCE_EXHAUSTED|invalid.?x-api-key|authentication_error|API_KEY_INVALID/i.test(
        err.message || ''
      ))
  );
}

async function runPool(items, worker, concurrency) {
  let idx = 0;
  let stop = false;
  async function next() {
    while (idx < items.length && !stop) {
      const i = idx++;
      await worker(items[i], () => {
        stop = true;
      });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(INVESTORS_PATH, 'utf8'));
  const allSlugs = payload.investors.map((i) => i.slug);
  const bySlug = new Map(payload.investors.map((i) => [i.slug, i]));

  // Institutional funds first — angels/grants are less likely to have public portfolios.
  const PRIORITY_TYPES = new Set([
    'vc',
    'pe',
    'accelerator',
    'corporate',
    'family-office',
    'syndicate'
  ]);

  let candidates;
  if (MAX_COMPANIES_FILTER != null) {
    console.log(
      `Loaded ${allSlugs.length} investors. Re-running up to ${LIMIT} with company_count <= ${MAX_COMPANIES_FILTER}...`
    );
    candidates = await getLowCoverageSlugs(allSlugs, Math.max(LIMIT * 3, LIMIT), MAX_COMPANIES_FILTER);
    candidates.sort((a, b) => {
      const pa = PRIORITY_TYPES.has((bySlug.get(a) || {}).typeId) ? 0 : 1;
      const pb = PRIORITY_TYPES.has((bySlug.get(b) || {}).typeId) ? 0 : 1;
      return pa - pb;
    });
    candidates = candidates.slice(0, LIMIT);
    const priorityN = candidates.filter((s) => PRIORITY_TYPES.has((bySlug.get(s) || {}).typeId)).length;
    console.log(`Prioritized ${priorityN}/${candidates.length} institutional funds (VC/PE/accelerator/etc).`);
  } else {
    console.log(
      `Loaded ${allSlugs.length} investors. Selecting up to ${LIMIT} stale/never-checked (staleAfter=${STALE_AFTER_DAYS}d)...`
    );
    candidates = await getStalePortfolioSlugs(allSlugs, LIMIT, STALE_AFTER_DAYS);
  }
  const budgetLabel = Number.isFinite(BUDGET_USD) ? `$${BUDGET_USD.toFixed(2)}` : 'none';
  console.log(`Checking ${candidates.length} investors (concurrency=${CONCURRENCY}, budget=${budgetLabel})...\n`);

  let found = 0;
  let checked = 0;
  let errors = 0;
  let spentUsd = 0;
  let companiesTotal = 0;

  await runPool(
    candidates,
    async (slug, stopAll) => {
      if (spentUsd >= BUDGET_USD) return;
      const inv = bySlug.get(slug);
      if (!inv) return;
      try {
        const writeup = [inv.writeup, inv.notes, inv.thesis].filter(Boolean).join('\n\n');
        const { companies, usage } = await withRetry(() =>
          lookupInvestorPortfolio(inv.name, {
            website: inv.website || null,
            writeup: writeup || null
          })
        );
        checked++;
        spentUsd += usage?.costUsd || 0;
        if (companies.length) {
          found++;
          companiesTotal += companies.length;
          console.log(
            `✓ ${inv.name} → ${companies.length} cos (${companies
              .slice(0, 3)
              .map((c) => c.name)
              .join(', ')}${companies.length > 3 ? '…' : ''}) [$${(usage?.costUsd || 0).toFixed(4)}]`
          );
        } else {
          console.log(`- ${inv.name} → none found [$${(usage?.costUsd || 0).toFixed(4)}]`);
        }
        await upsertPortfolio(slug, companies, 'web_search');
        if (spentUsd >= BUDGET_USD) {
          console.log(`\nBudget of $${BUDGET_USD.toFixed(2)} reached — stopping the run.`);
          stopAll();
        }
      } catch (err) {
        errors++;
        console.error(`✗ ${inv.name} → error: ${err.message}`);
        if (isFatalAccountError(err)) {
          console.error('\nFatal account-level error — stopping early.');
          stopAll();
        }
      }
    },
    CONCURRENCY
  );

  console.log(
    `\nDone. Checked ${checked}/${candidates.length}, found portfolios for ${found} (${companiesTotal} companies total), errors ${errors}. Estimated spend: $${spentUsd.toFixed(4)}.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
