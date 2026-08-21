const { runCronJob } = require('../../utils/cron-run');
const { runAiBlog } = require('../../utils/run-ai-blog');

module.exports = async function handler(req, res) {
    return runCronJob(req, res, 'ai-blog', async () => {
        const force = req.query?.force === '1' || req.query?.force === 1;
        return runAiBlog({ force, triggeredBy: 'cron' });
    });
};
