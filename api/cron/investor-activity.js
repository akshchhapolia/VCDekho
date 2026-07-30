/**
 * Automated version of scripts/build_investor_activity.js — mines the news
 * pipeline (articles + raw_content.extracted_facts) for investor "checks"
 * (funding mentions), fuzzy-matches them to known investors, and writes the
 * result straight to the investor_activity table (no manual script + JSON
 * merge + redeploy needed). utils/investors.js reads this table live.
 */
const fs = require('fs');
const path = require('path');
const { buildInvestorIndex, collectMentions, aggregateMentions } = require('../../utils/investor-activity-matcher');
const { upsertActivity } = require('../../utils/investor-activity-store');

const WINDOW_DAYS = 180;
const INVESTORS_PATH = path.join(__dirname, '..', '..', 'data', 'investors.json');

module.exports = async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return res.status(401).end('Unauthorized');
  }

  try {
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

    res.status(200).json({
      success: true,
      mentionsFound: mentions.length,
      investorsMatched: slugs.length,
      investorsUpdated: updated,
      topUnmatched
    });
  } catch (error) {
    console.error('investor-activity cron error:', error);
    res.status(500).json({ error: error.message });
  }
};
