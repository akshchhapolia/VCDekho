const Parser = require('rss-parser');
const db = require('../../utils/db');
const { runCronJob } = require('../../utils/cron-run');
const { runBuzzScrape } = require('../../utils/buzz-scrape');
const { runAiProcess } = require('../../utils/run-ai-process');

const parser = new Parser({
    timeout: 15000,
    headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; VCDekhoBot/1.0; +https://vcdekho.com)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
    }
});

// VCCircle no longer exposes a public RSS feed (endpoints return HTML/500).
// LiveMint Companies is used as the PE/VC-adjacent Indian business source.
// yourstory-funding / startuptalky / cnbctv18-startups were added to widen
// coverage for the investor-activity signal (see utils/investor-activity-matcher.js) —
// more funding-news sources means faster, broader "actively deploying" coverage.
const SOURCES = [
    { name: 'inc42', url: 'https://inc42.com/buzz/feed/' },
    { name: 'entrackr', url: 'https://entrackr.com/rss' },
    { name: 'yourstory', url: 'https://yourstory.com/feed' },
    { name: 'yourstory-funding', url: 'https://yourstory.com/category/funding/feed' },
    { name: 'livemint', url: 'https://www.livemint.com/rss/companies' },
    { name: 'startuptalky', url: 'https://startuptalky.com/feed/' },
    { name: 'cnbctv18-startups', url: 'https://www.cnbctv18.com/commonfeeds/v1/cne/rss/startup.xml' }
];

function scoreRelevance(item, sourceName) {
    let score = 0;
    const title = (item.title || '').toLowerCase();
    
    // 1. Ecosystem keywords (Funding + Tech + Milestones)
    if (/raise|round|seed|series [abcd]|fund|backs|invests|vc|venture|launch|acquires|merger|milestone|revenue|profit|partnership|ai|technology|innovation|breakthrough|paper/i.test(title)) score += 1;
    // 2. Amount/Scale keywords
    if (/crore|lakh|million|billion|\$|₹/i.test(title)) score += 1;
    // 3. Source boosts
    if (sourceName === 'entrackr') score += 1;
    
    // Custom logic per source based on PRD:
    if (sourceName === 'yourstory') {
        // Relax filter to allow funding OR major ecosystem keywords
        if (!(/crore|lakh|million|billion|\$|rs|seed|pre-seed|series [abcd]|angel round|bridge round|launch|acquires|merger|partnership/i.test(title))) {
            return 0; 
        }
    }

    // Dedicated funding-tag feed — everything here is already on-topic.
    if (sourceName === 'yourstory-funding') {
        score += 2;
    }

    // LiveMint, StartupTalky, and CNBC-TV18's startup feed are broad business/
    // startup news — require funding/deal signals so non-funding stories
    // (product launches, layoffs, IPO chatter, etc.) don't get queued.
    if (sourceName === 'livemint' || sourceName === 'startuptalky' || sourceName === 'cnbctv18-startups') {
        if (!(/raise[sd]?|round|seed|pre-seed|series [abcde]|fund(s|ing)?|backs?|invests?|investment|vc|venture|acquires|merger|crore|lakh|million|billion|\$|₹/i.test(title))) {
            return 0;
        }
        score += 1;
    }

    return score;
}

// Simple Jaccard similarity for title deduplication
function getSimilarity(s1, s2) {
    const set1 = new Set(s1.toLowerCase().split(/\W+/));
    const set2 = new Set(s2.toLowerCase().split(/\W+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
}

module.exports = async function handler(req, res) {
    const buzzOnly = req.query?.job === 'buzz';

    return runCronJob(req, res, buzzOnly ? 'buzz-scrape' : 'scrape', async () => {
        const batchIndex = Math.floor(Date.now() / (6 * 60 * 60 * 1000));

        if (buzzOnly) {
            const buzzMeta = await runBuzzScrape({ batchIndex });
            try {
                buzzMeta.aiProcess = await runAiProcess({
                    triggeredBy: 'buzz-scrape',
                    maxNews: 0,
                    includeBuzz: true
                });
            } catch (aiErr) {
                buzzMeta.aiProcess = { error: aiErr.message };
            }
            return buzzMeta;
        }

        let itemsFetched = 0;
        let itemsQueued = 0;
        let itemsDuplicated = 0;
        let errors = [];
        let sourcesOk = 0;

        const recentRows = await db.query(`SELECT title, source_url FROM raw_content WHERE scraped_at > NOW() - INTERVAL '14 days'`);
        const recentItems = recentRows.rows;

        for (const source of SOURCES) {
            try {
                const feed = await parser.parseURL(source.url);
                sourcesOk++;
                for (const item of feed.items) {
                    itemsFetched++;

                    const url = item.link || item.guid;
                    const title = item.title;
                    const content = item.contentSnippet || item.content || item.description || '';
                    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

                    if (recentItems.find(r => r.source_url === url)) {
                        continue;
                    }

                    let isDuplicate = false;
                    for (const recent of recentItems) {
                        if (getSimilarity(title, recent.title) > 0.6) {
                            isDuplicate = true;
                            break;
                        }
                    }

                    if (isDuplicate) {
                        itemsDuplicated++;
                        await db.query(
                            `INSERT INTO raw_content (source_name, source_url, title, body, published_at_source, status, relevance_score)
                             VALUES ($1, $2, $3, $4, $5, 'duplicate', 0) ON CONFLICT (source_url) DO NOTHING`,
                            [source.name, url, title, content, pubDate]
                        );
                        recentItems.push({ title, source_url: url });
                        continue;
                    }

                    const score = scoreRelevance(item, source.name);
                    const status = score >= 2 ? 'queued' : 'raw';
                    if (status === 'queued') itemsQueued++;

                    await db.query(
                        `INSERT INTO raw_content (source_name, source_url, title, body, published_at_source, status, relevance_score)
                         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (source_url) DO NOTHING`,
                        [source.name, url, title, content, pubDate, status, score]
                    );
                    recentItems.push({ title, source_url: url });
                }
            } catch (err) {
                console.error(`Error scraping ${source.name}:`, err);
                errors.push(`Error scraping ${source.name}: ${err.message}`);
            }
        }

        await db.query(
            `INSERT INTO job_log (items_fetched, items_queued, items_duplicated, errors, status) VALUES ($1, $2, $3, $4, 'completed')`,
            [itemsFetched, itemsQueued, itemsDuplicated, JSON.stringify(errors)]
        );

        const meta = { itemsFetched, itemsQueued, itemsDuplicated, errors, sourcesOk };
        if (sourcesOk === 0) {
            meta.alert = true;
            meta.alertSeverity = 'error';
            meta.alertSubject = 'RSS scrape: all sources failed';
            meta.alertBody = errors.join('\n') || 'No sources succeeded';
        } else if (errors.length >= SOURCES.length - 1) {
            meta.alert = true;
            meta.alertSeverity = 'warning';
            meta.alertSubject = 'RSS scrape: most sources failed';
            meta.alertBody = errors.join('\n');
        }

        // Founder Buzz: Reddit founder VC reviews (RSS + Searlo discover).
        // Also runs via /api/cron/scrape?job=buzz (3 extra times/day in vercel.json).
        try {
            meta.buzz = await runBuzzScrape({ batchIndex });
        } catch (buzzErr) {
            meta.buzz = { error: buzzErr.message };
        }

        // Chain AI immediately after ingest so publishing never depends on a separate cron firing on time.
        try {
            meta.aiProcess = await runAiProcess({ triggeredBy: 'scrape' });
        } catch (aiErr) {
            meta.aiProcess = { error: aiErr.message };
        }

        return meta;
    });
};
