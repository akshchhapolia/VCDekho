#!/usr/bin/env node
/**
 * Local dry-run / debug tool for the news-pipeline investor-activity
 * matcher (utils/investor-activity-matcher.js). The production path is now
 * automated via api/cron/investor-activity.js, which writes straight to the
 * investor_activity DB table — this script is for inspecting match quality
 * offline and optionally applying the same write.
 *
 * Usage:
 *   node scripts/build_investor_activity.js                 // dry run, prints matches
 *   node scripts/build_investor_activity.js --apply          // also writes to the DB (same as the cron)
 *   node scripts/build_investor_activity.js --window 90       // custom lookback window (days)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { buildInvestorIndex, collectMentions, aggregateMentions } = require('../utils/investor-activity-matcher');
const { upsertActivity } = require('../utils/investor-activity-store');

const ROOT = path.join(__dirname, '..');
const INVESTORS_PATH = path.join(ROOT, 'data', 'investors.json');
const REVIEW_PATH = path.join(ROOT, 'data', 'candidates', 'investor-activity-review.json');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const windowIdx = args.indexOf('--window');
const WINDOW_DAYS = windowIdx >= 0 ? Number(args[windowIdx + 1]) || 180 : 180;

function loadInvestorIndex() {
  const payload = JSON.parse(fs.readFileSync(INVESTORS_PATH, 'utf8'));
  return buildInvestorIndex(payload.investors);
}

async function main() {
  console.log(`Loading investor index from ${INVESTORS_PATH}...`);
  const index = loadInvestorIndex();
  console.log(`Indexed ${index.length} investors.`);

  console.log('Querying articles + raw_content for investor mentions...');
  const { mentions, unmatchedCounts } = await collectMentions(index);
  console.log(`Found ${mentions.length} matched mentions across ${new Set(mentions.map((m) => m.investorSlug)).size} investors.`);

  const activity = aggregateMentions(mentions, WINDOW_DAYS);
  const slugs = Object.keys(activity).sort((a, b) => new Date(activity[b].lastCheckDate) - new Date(activity[a].lastCheckDate));

  console.log('\nMatched investors (most recent first):');
  slugs.forEach((slug) => {
    const a = activity[slug];
    console.log(`- ${slug} | last: ${new Date(a.lastCheckDate).toISOString().slice(0, 10)} | ${a.lastCheckHighlight || ''} | ${a.totalMentions} mention(s)`);
  });

  const unmatched = [...unmatchedCounts.values()].sort((a, b) => b.count - a.count);
  console.log(`\n${unmatched.length} distinct mention names did not match an existing investor (top 20):`);
  unmatched.slice(0, 20).forEach((u) => console.log(`- ${u.name} (x${u.count})`));

  fs.mkdirSync(path.dirname(REVIEW_PATH), { recursive: true });
  fs.writeFileSync(
    REVIEW_PATH,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), windowDays: WINDOW_DAYS, matchedCount: mentions.length, matchedInvestorCount: slugs.length, mentions, unmatched },
      null,
      2
    )
  );
  console.log(`\nWrote full review detail → ${REVIEW_PATH}`);

  if (APPLY) {
    console.log('\nApplying to investor_activity table...');
    let updated = 0;
    for (const slug of slugs) {
      const result = await upsertActivity(slug, activity[slug], 'news_pipeline');
      if (result.updated) updated++;
    }
    console.log(`Wrote/updated activity for ${updated} investors in the investor_activity table.`);
  } else {
    console.log('\nDry run only — nothing written to the DB. Re-run with --apply once matches look right.');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
