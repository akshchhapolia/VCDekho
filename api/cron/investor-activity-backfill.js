/**
 * Daily maintenance sweep: re-checks the ~60 stalest investors (never-checked
 * ones first) via targeted web search, so coverage keeps expanding to the
 * full investor base over time and existing entries don't go stale. The
 * heavy one-time backfill across the full investor list is run manually via
 * scripts/investor_activity_websearch.js — this cron just keeps it topped up.
 */
const fs = require('fs');
const path = require('path');
const { lookupInvestorActivity } = require('../../utils/investor-activity-websearch');
const { upsertActivity, getStaleSlugs } = require('../../utils/investor-activity-store');

const INVESTORS_PATH = path.join(__dirname, '..', '..', 'data', 'investors.json');
const DAILY_LIMIT = 60;
const CONCURRENCY = 6;
const STALE_AFTER_DAYS = 30;

async function runPool(items, worker, concurrency) {
  let idx = 0;
  async function next() {
    while (idx < items.length) {
      const i = idx++;
      await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
}

module.exports = async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return res.status(401).end('Unauthorized');
  }

  try {
    const payload = JSON.parse(fs.readFileSync(INVESTORS_PATH, 'utf8'));
    const allSlugs = payload.investors.map((i) => i.slug);
    const bySlug = new Map(payload.investors.map((i) => [i.slug, i]));

    const candidates = await getStaleSlugs(allSlugs, DAILY_LIMIT, STALE_AFTER_DAYS);

    let found = 0;
    let checked = 0;
    let errors = 0;

    await runPool(
      candidates,
      async (slug) => {
        const inv = bySlug.get(slug);
        if (!inv) return;
        try {
          const activity = await lookupInvestorActivity(inv.name);
          checked++;
          if (activity) found++;
          await upsertActivity(slug, activity, 'web_search_backfill');
        } catch (err) {
          errors++;
          // Don't bump checked_at on a genuine error (e.g. API/billing issue) —
          // leave it at the front of the stale queue so it's retried next run.
        }
      },
      CONCURRENCY
    );

    res.status(200).json({ success: true, candidates: candidates.length, checked, found, errors });
  } catch (error) {
    console.error('investor-activity-backfill cron error:', error);
    res.status(500).json({ error: error.message });
  }
};
