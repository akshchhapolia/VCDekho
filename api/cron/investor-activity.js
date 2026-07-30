/**
 * Investor activity automation — kept as a single serverless function (the
 * Vercel Hobby plan caps a deployment at 12 functions, and this project is
 * already at that limit) with two jobs dispatched by `?job=`:
 *
 *  - `news` (default): mines the existing news pipeline (articles +
 *    raw_content.extracted_facts) for investor mentions, fuzzy-matches them,
 *    and writes the result to investor_activity. No LLM calls, cheap, safe
 *    to run often.
 *
 *  - `backfill`: targeted web search (Searlo + Claude Haiku) for the ~60
 *    stalest/never-checked investors, so coverage keeps expanding to the
 *    full investor base over time even when the news pipeline hasn't
 *    covered them yet. The one-time full backfill across the whole investor
 *    list is run manually via scripts/investor_activity_websearch.js — this
 *    just keeps it topped up daily.
 *
 * utils/investors.js#ensureActivityFresh() reads investor_activity live at
 * request time, so results from either job show up without a redeploy.
 */
const fs = require('fs');
const path = require('path');
const { buildInvestorIndex, collectMentions, aggregateMentions } = require('../../utils/investor-activity-matcher');
const { lookupInvestorActivity } = require('../../utils/investor-activity-websearch');
const { upsertActivity, getStaleSlugs } = require('../../utils/investor-activity-store');

const INVESTORS_PATH = path.join(__dirname, '..', '..', 'data', 'investors.json');
const WINDOW_DAYS = 180;
const BACKFILL_DAILY_LIMIT = 60;
// Searlo free tier ~10 req/min — keep cron concurrency low to avoid 429s.
const BACKFILL_CONCURRENCY = 2;
const BACKFILL_STALE_AFTER_DAYS = 30;

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
      await worker(items[i], () => { stop = true; });
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}

async function runNewsPipelineJob() {
  const payload = JSON.parse(fs.readFileSync(INVESTORS_PATH, 'utf8'));
  const index = buildInvestorIndex(payload.investors);

  const { mentions, unmatchedCounts } = await collectMentions(index);
  const activity = aggregateMentions(mentions, WINDOW_DAYS);

  const slugs = Object.keys(activity);
  let updated = 0;
  for (const slug of slugs) {
    const result = await upsertActivity(slug, activity[slug], 'news_pipeline');
    if (result.updated) updated++;
  }

  const topUnmatched = [...unmatchedCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((u) => `${u.name} (x${u.count})`);

  return { job: 'news', mentionsFound: mentions.length, investorsMatched: slugs.length, investorsUpdated: updated, topUnmatched };
}

async function runBackfillJob() {
  const payload = JSON.parse(fs.readFileSync(INVESTORS_PATH, 'utf8'));
  const allSlugs = payload.investors.map((i) => i.slug);
  const bySlug = new Map(payload.investors.map((i) => [i.slug, i]));

  const candidates = await getStaleSlugs(allSlugs, BACKFILL_DAILY_LIMIT, BACKFILL_STALE_AFTER_DAYS);

  let found = 0;
  let checked = 0;
  let errors = 0;
  let spentUsd = 0;

  await runPool(
    candidates,
    async (slug, stopAll) => {
      const inv = bySlug.get(slug);
      if (!inv) return;
      try {
        const { activity, usage } = await lookupInvestorActivity(inv.name);
        checked++;
        spentUsd += usage?.costUsd || 0;
        if (activity) found++;
        await upsertActivity(slug, activity, 'web_search_backfill');
      } catch (err) {
        errors++;
        // Don't bump checked_at on a genuine error (e.g. API/billing issue) —
        // leave it at the front of the stale queue so it's retried next run.
        if (isFatalAccountError(err)) stopAll();
      }
    },
    BACKFILL_CONCURRENCY
  );

  return { job: 'backfill', candidates: candidates.length, checked, found, errors, estimatedSpendUsd: Number(spentUsd.toFixed(4)) };
}

module.exports = async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return res.status(401).end('Unauthorized');
  }

  const job = (req.query && req.query.job) || 'news';

  try {
    const result = job === 'backfill' ? await runBackfillJob() : await runNewsPipelineJob();
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error(`investor-activity cron error (job=${job}):`, error);
    res.status(500).json({ error: error.message });
  }
};
