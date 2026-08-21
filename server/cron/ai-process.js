const { runCronJob } = require('../../utils/cron-run');
const { runAiProcess } = require('../../utils/run-ai-process');

module.exports = async function handler(req, res) {
    return runCronJob(req, res, 'ai-process', async () => {
        return runAiProcess({ triggeredBy: 'cron' });
    });
};
