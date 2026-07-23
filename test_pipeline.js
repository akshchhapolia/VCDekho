const { Anthropic } = require('@anthropic-ai/sdk');
const fs = require('fs');

// Read .env file manually since dotenv is hanging
try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const match = envContent.match(/ANTHROPIC_API_KEY=(.*)/);
    if (match) {
        process.env.ANTHROPIC_API_KEY = match[1].trim();
    }
} catch (e) {
    // Ignore if no .env
}

// Ensure ANTHROPIC_API_KEY is present in .env
if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ERROR: ANTHROPIC_API_KEY is missing in your .env file.");
    process.exit(1);
}

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});



// We will test with the first resource: Inc42
const TEST_SOURCE = {
    name: 'Inc42',
    url: 'https://inc42.com/buzz/feed/'
};

async function runLocalTest() {
    console.log(`Starting local test pipeline for source: ${TEST_SOURCE.name}`);
    console.log(`Fetching RSS feed from ${TEST_SOURCE.url} ...\n`);

    let xmlText;
    try {
        const { execSync } = require('child_process');
        xmlText = execSync(`curl -s -m 15 -A "Mozilla/5.0" "${TEST_SOURCE.url}"`, { encoding: 'utf8' });
    } catch (err) {
        console.error("Failed to fetch RSS feed:", err.message);
        return;
    }

    const itemBlocks = xmlText.split('<item>').slice(1); // skip the preamble
    if (itemBlocks.length === 0) {
        console.log("No items found in the feed.");
        return;
    }

    const results = [];
    for (let i = 0; i < Math.min(2, itemBlocks.length); i++) {
        const itemXml = itemBlocks[i];
        const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || itemXml.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
        const contentMatch = itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/) || itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/);

        const latestItem = {
            title: titleMatch ? titleMatch[1].trim() : 'Unknown Title',
            link: linkMatch ? linkMatch[1].trim() : '',
            content: contentMatch ? contentMatch[1].trim() : ''
        };
        console.log(`\nProcessing Item ${i+1}: "${latestItem.title}"`);
        
        const rawText = latestItem.contentSnippet || latestItem.content || '';
        const combinedText = `Primary Report (Source: ${TEST_SOURCE.name}):\nTitle: ${latestItem.title}\nBody:\n${rawText}\n\n`;

        console.log(`Extracting facts...`);
        const prompt1Msg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            system: `You are a VC and startup news analyst. Extract structured facts. Return ONLY valid JSON: startup_name, amount_raised, currency, stage, lead_investors (array), other_investors (array), country, city, industry, startup_description.`,
            messages: [{ role: 'user', content: combinedText }]
        });

        let text1 = prompt1Msg.content[0].text.trim().replace(/^```json\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
        let facts = JSON.parse(text1);

        console.log(`Generating article...`);
        const prompt2Msg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            system: `You are a financial journalist writing for VCDekho. Write a news article based on the funding facts. Rules:
            - Length: 250-350 words. Plain tone. No preamble.
            - MUST output valid HTML. Use <p> for paragraphs.
            - MUST use an unordered list <ul style="margin: 20px 0; padding-left: 20px; color: var(--color-text-light);"> with <li> for breaking down key facts (like Objective, Investors, etc).
            - Use <strong> for emphasis on metrics.`,
            messages: [{ role: 'user', content: `Facts: ${JSON.stringify(facts)}` }]
        });
        const generatedArticle = prompt2Msg.content[0].text;

        console.log(`Extracting metadata...`);
        const prompt3Msg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            system: `You are an SEO specialist. Return ONLY valid JSON: slug (URL friendly), meta_title, meta_description, tags (array of exactly 12 keywords).`,
            messages: [{ role: 'user', content: `Article:\n${generatedArticle}` }]
        });
        let text3 = prompt3Msg.content[0].text.trim().replace(/^```json\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
        let metadata = JSON.parse(text3);

        results.push({
            title: metadata.meta_title || facts.startup_name + ' Raises Funding',
            slug: metadata.slug,
            category: 'funding-round',
            published_at: new Date().toISOString(),
            source_name: TEST_SOURCE.name,
            source_url: latestItem.link,
            image_url: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2000&auto=format&fit=crop',
            meta_title: metadata.meta_title,
            meta_description: metadata.meta_description,
            body: generatedArticle,
            tags: metadata.tags
        });
    }

    const outputPath = 'test_articles_batch.json';
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nSaved ${results.length} articles to ${outputPath}`);
}

runLocalTest().catch(console.error);
