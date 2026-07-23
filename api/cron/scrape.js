const Parser = require('rss-parser');
const db = require('../../utils/db');

const parser = new Parser();

const SOURCES = [
    { name: 'inc42', url: 'https://inc42.com/buzz/feed/' },
    { name: 'entrackr', url: 'https://entrackr.com/feed/' },
    { name: 'yourstory', url: 'https://yourstory.com/feed' },
    { name: 'vccircle', url: 'https://www.vccircle.com/feed' }
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
    
    if (sourceName === 'vccircle') score += 1; // It's PE/VC focused

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
    // If called via Vercel Cron, auth is handled by Vercel. 
    // We can allow manual trigger with a secret key.
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return res.status(401).end('Unauthorized');
    }

    try {
        let itemsFetched = 0;
        let itemsQueued = 0;
        let itemsDuplicated = 0;
        let errors = [];

        // Fetch recent items from DB for deduplication (last 14 days)
        const recentRows = await db.query(`SELECT title, source_url FROM raw_content WHERE scraped_at > NOW() - INTERVAL '14 days'`);
        const recentItems = recentRows.rows;

        for (const source of SOURCES) {
            try {
                const feed = await parser.parseURL(source.url);
                for (const item of feed.items) {
                    itemsFetched++;
                    
                    const url = item.link || item.guid;
                    const title = item.title;
                    const content = item.contentSnippet || item.content || item.description || '';
                    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

                    // Check if URL already exists
                    if (recentItems.find(r => r.source_url === url)) {
                        continue; // Already processed
                    }

                    // Deduplicate against other titles
                    let isDuplicate = false;
                    for (const recent of recentItems) {
                        if (getSimilarity(title, recent.title) > 0.6) { // fuzzy match
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
                        recentItems.push({ title, source_url: url }); // prevent further duplicates in this run
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

        res.status(200).json({ success: true, itemsFetched, itemsQueued, itemsDuplicated });
    } catch (error) {
        console.error('Fatal scrape error:', error);
        await db.query(`INSERT INTO job_log (errors, status) VALUES ($1, 'failed')`, [JSON.stringify([error.message])]);
        res.status(500).json({ error: error.message });
    }
};
