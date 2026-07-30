#!/usr/bin/env node
/**
 * Backfills investor portfolio companies via Searlo web search + Haiku
 * extraction for every investor (or a stale slice).
 *
 * Usage:
 *   node scripts/investor_portfolio_websearch.js --limit 40
 *   node scripts/investor_portfolio_websearch.js --limit 1017 --concurrency 5 --stale-after 0 --budget 10
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { lookupInvestorPortfolio } = require('../utils/investor-portfolio-websearch');
const { upsertPortfolio, getStalePortfolioSlugs } = require('../utils/investor-portfolio-store');

const INVESTORS_PATH = path.join(__dirname, '..', 'data', 'investors.json');

function argVal(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = Number(process.argv[idx + 1]);
  return Number.isFinite(v) ? v : def;
}

const LIMIT = argVal('--limit', 40);
const CONCURRENCY = argVal('--concurrency', 5);
const STALE_AFTER_DAYS = argVal('--stale-after', 30);
const BUDGET_USD = argVal('--budget', Infinity);

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
      /credit balance is too low|insufficient credits|invalid.?x-api-key|authentication_error/i.test(
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

  console.log(
    `Loaded ${allSlugs.length} investors. Selecting up to ${LIMIT} stale/never-checked (staleAfter=${STALE_AFTER_DAYS}d)...`
  );
  const candidates = await getStalePortfolioSlugs(allSlugs, LIMIT, STALE_AFTER_DAYS);
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
        const { companies, usage } = await withRetry(() => lookupInvestorPortfolio(inv.name));
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
