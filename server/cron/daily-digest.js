const { runCronJob } = require('../../utils/cron-run');
const { runDailyDigest } = require('../../utils/run-daily-digest');

module.exports = async function handler(req, res) {
  return runCronJob(req, res, 'daily-digest', async () => {
    return runDailyDigest({ triggeredBy: 'cron' });
  });
};

module.exports.publishDigestForDay = require('../../utils/run-daily-digest').publishDigestForDay;
module.exports.buildDigestPrompt = require('../../utils/run-daily-digest').buildDigestPrompt;
