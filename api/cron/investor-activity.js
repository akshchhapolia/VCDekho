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
const { runCronJob } = require('../../utils/cron-run');
const { sendAlert } = require('../../utils/notify');

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
  let fatalError = null;

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
        if (isFatalAccountError(err)) {
          fatalError = err;
          stopAll();
        }
      }
    },
    BACKFILL_CONCURRENCY
  );

  const meta = {
    job: 'backfill',
    candidates: candidates.length,
    checked,
    found,
    errors,
    estimatedSpendUsd: Number(spentUsd.toFixed(4))
  };

  if (fatalError) {
    meta.alert = true;
    meta.alertSeverity = 'error';
    meta.alertSubject =
      fatalError.status === 402
        ? 'Searlo out of credits during activity backfill'
        : 'Fatal vendor error during activity backfill';
    meta.alertBody = String(fatalError.message || fatalError);
    await sendAlert({
      source: 'cron:investor-activity-backfill',
      severity: 'error',
      subject: meta.alertSubject,
      body: meta.alertBody
    });
  }

  return meta;
}

module.exports = async function handler(req, res) {
  const job = (req.query && req.query.job) || 'news';
  const jobName = job === 'backfill' ? 'investor-activity-backfill' : 'investor-activity-news';
  return runCronJob(req, res, jobName, async () => {
    return job === 'backfill' ? runBackfillJob() : runNewsPipelineJob();
  });
};
