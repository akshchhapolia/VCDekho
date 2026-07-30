#!/usr/bin/env node
/**
 * Backfills / refreshes investor activity via targeted web search, for
 * investors the news pipeline hasn't matched (utils/investor-activity-matcher.js
 * only "finds" what's already in scraped news — this actively looks).
 *
 * Picks the least-recently-checked investors first (never-checked ones come
 * first), so it's safe to re-run repeatedly: a first full run covers every
 * investor once, and subsequent runs (e.g. the daily cron) just refresh the
 * stalest slice.
 *
 * Usage:
 *   node scripts/investor_activity_websearch.js --limit 40                // small daily sweep (used by the cron)
 *   node scripts/investor_activity_websearch.js --limit 1000 --concurrency 8   // one-time full backfill
 *   node scripts/investor_activity_websearch.js --stale-after 45          // re-check anything older than 45 days
 *   node scripts/investor_activity_websearch.js --budget 5                // stop once estimated spend hits $5
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { lookupInvestorActivity } = require('../utils/investor-activity-websearch');
const { upsertActivity, getStaleSlugs } = require('../utils/investor-activity-store');

const INVESTORS_PATH = path.join(__dirname, '..', 'data', 'investors.json');

function argVal(name, def) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return def;
  const v = Number(process.argv[idx + 1]);
  return Number.isFinite(v) ? v : def;
}

const LIMIT = argVal('--limit', 40);
// Searlo free tier is ~10 req/min — keep default concurrency low so bulk
// runs don't trip 429s. Pass --concurrency 2+ only after buying a paid pack.
const CONCURRENCY = argVal('--concurrency', 2);
const STALE_AFTER_DAYS = argVal('--stale-after', 30);
const BUDGET_USD = argVal('--budget', Infinity);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry(fn, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const isRateLimit = err && (err.status === 429 || /rate.?limit/i.test(err.message || ''));
      const isOverloaded = err && (err.status === 529 || err.status === 503);
      if (!isRateLimit && !isOverloaded) throw err;
      const backoffMs = 2000 * Math.pow(2, i);
      console.warn(`  Rate/overload hit, retrying in ${backoffMs}ms... (${err.message})`);
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
  const results = [];
  let idx = 0;
  let stop = false;
  async function next() {
    while (idx < items.length && !stop) {
      const i = idx++;
      results[i] = await worker(items[i], i, () => { stop = true; });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return results;
}

async function main() {
  const payload = JSON.parse(fs.readFileSync(INVESTORS_PATH, 'utf8'));
  const allSlugs = payload.investors.map((i) => i.slug);
  const bySlug = new Map(payload.investors.map((i) => [i.slug, i]));

  console.log(`Loaded ${allSlugs.length} investors. Selecting up to ${LIMIT} stale/never-checked (staleAfter=${STALE_AFTER_DAYS}d)...`);
  const candidates = await getStaleSlugs(allSlugs, LIMIT, STALE_AFTER_DAYS);
  const budgetLabel = Number.isFinite(BUDGET_USD) ? `$${BUDGET_USD.toFixed(2)}` : 'none';
  console.log(`Checking ${candidates.length} investors (concurrency=${CONCURRENCY}, budget=${budgetLabel})...\n`);

  let found = 0;
  let checked = 0;
  let errors = 0;
  let spentUsd = 0;

  await runPool(
    candidates,
    async (slug, _i, stopAll) => {
      if (spentUsd >= BUDGET_USD) return;
      const inv = bySlug.get(slug);
      if (!inv) return;
      try {
        const { activity, usage } = await withRetry(() => lookupInvestorActivity(inv.name));
        checked++;
        spentUsd += usage?.costUsd || 0;
        if (activity) {
          found++;
          console.log(`✓ ${inv.name} → ${activity.lastCheckHighlight || ''} (${activity.lastCheckDate.slice(0, 10)}) [$${(usage?.costUsd || 0).toFixed(4)}]`);
        } else {
          console.log(`- ${inv.name} → no recent deal found [$${(usage?.costUsd || 0).toFixed(4)}]`);
        }
        await upsertActivity(slug, activity, 'web_search_backfill');
        if (spentUsd >= BUDGET_USD) {
          console.log(`\nBudget of $${BUDGET_USD.toFixed(2)} reached — stopping the run.`);
          stopAll();
        }
      } catch (err) {
        errors++;
        console.error(`✗ ${inv.name} → error: ${err.message}`);
        // Deliberately do NOT bump checked_at here — an API/billing error means
        // this investor was never actually checked, so it should stay at the
        // front of the stale queue for the next run instead of being skipped
        // for --stale-after days.
        if (isFatalAccountError(err)) {
          console.error('\nFatal account-level error detected — stopping the run early instead of burning through the rest of the queue.');
          stopAll();
        }
      }
    },
    CONCURRENCY
  );

  console.log(`\nDone. Checked ${checked}/${candidates.length}, found activity for ${found}, errors ${errors}. Estimated spend: $${spentUsd.toFixed(4)}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
