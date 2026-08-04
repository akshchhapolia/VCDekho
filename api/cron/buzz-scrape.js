const { runCronJob } = require('../../utils/cron-run');
const { runBuzzScrape } = require('../../utils/buzz-scrape');

/** Dedicated Founder Buzz scrape — runs between main news scrape crons for fresher coverage. */
module.exports = async function handler(req, res) {
  return runCronJob(req, res, 'buzz-scrape', async () => {
    const batchIndex = Math.floor(Date.now() / (6 * 60 * 60 * 1000));
    const stats = await runBuzzScrape({ batchIndex });
    return stats;
  });
};
