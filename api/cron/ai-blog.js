const { Anthropic } = require('@anthropic-ai/sdk');
const db = require('../../utils/db');
const { pickTopic } = require('../../utils/blog-topics');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || ''
});

function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function stripCodeFences(text) {
    return String(text || '')
        .replace(/^```(?:html|json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
}

function wordCount(html) {
    return stripCodeFences(html).replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

module.exports = async function handler(req, res) {
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
        return res.status(401).end('Unauthorized');
    }

    try {
        if (!process.env.ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY is missing');
        }
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is missing');
        }

        // One blog post per calendar day (UTC), unless force=1 for manual runs
        const force = req.query?.force === '1' || req.query?.force === 1;
        const existingToday = await db.query(
            `SELECT id, slug, title FROM articles
             WHERE category = 'blog' AND published_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
             LIMIT 1`
        );
        if (existingToday.rows.length > 0 && !force) {
            return res.status(200).json({
                success: true,
                skipped: true,
                message: 'Blog already published today.',
                articleSlug: existingToday.rows[0].slug
            });
        }

        // Avoid repeating topics used in the last ~90 days
        const recent = await db.query(
            `SELECT tags FROM articles
             WHERE category = 'blog' AND published_at > NOW() - INTERVAL '90 days'
             ORDER BY published_at DESC
             LIMIT 100`
        );
        const recentTopicIds = recent.rows.flatMap(row =>
            (row.tags || []).filter(t => String(t).startsWith('topic:')).map(t => String(t).slice(6))
        );

        const topic = pickTopic(recentTopicIds);

        // --- 1) Outline + SEO package ---
        const metaMsg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 900,
            system: `You are an SEO editor for VCDekho.com, a publication for Indian startup founders and operators.
Return ONLY valid JSON (no markdown) with keys:
- title (compelling, specific, India-relevant; max 70 chars preferred)
- slug (lowercase kebab-case, unique-feeling, no dates)
- meta_title (max ~60 chars)
- meta_description (140-160 chars)
- tags (array of 5-8 short SEO tags)
- outline (array of 5-7 H2 section titles)
Focus on practical, evergreen founder advice — not breaking news.`,
            messages: [{
                role: 'user',
                content: `Topic ID: ${topic.id}
Suggested title: ${topic.titleHint}
Category label: ${topic.categoryLabel}
Angle: ${topic.angle}

Write an SEO package for a long-form blog post aimed at Indian founders.`
            }]
        });

        let meta;
        try {
            meta = JSON.parse(stripCodeFences(metaMsg.content[0].text));
        } catch (e) {
            throw new Error('Failed to parse blog SEO JSON: ' + e.message);
        }

        const title = meta.title || topic.titleHint;
        let slug = slugify(meta.slug || title);
        if (!slug) slug = `vc-blog-${topic.id}`;

        // Ensure unique slug
        let uniqueSlug = slug;
        let counter = 1;
        while (true) {
            const check = await db.query(`SELECT id FROM articles WHERE slug = $1`, [uniqueSlug]);
            if (check.rows.length === 0) break;
            uniqueSlug = `${slug}-${counter}`;
            counter += 1;
        }

        // --- 2) Full article body ---
        const bodyMsg = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 3500,
            system: `You are a senior writer for VCDekho, writing actionable guides for Indian startup founders.
Rules:
- Length: 900 to 1400 words
- Tone: clear, practical, confident — no hype, no fluff, no emojis
- Audience: early-stage founders in India
- Use India-relevant examples (INR, SEBI context only if accurate, Bengaluru/Mumbai/Delhi ecosystems, Indian funds) without inventing fake statistics. If citing numbers, keep them general or clearly framed as illustrative.
- Structure with this EXACT HTML (no markdown, no code fences):
  <p class="blog-intro">...opening hook...</p>
  <p class="blog-body-paragraph">...</p>
  <h2 class="blog-body-heading">Section title</h2>
  <p class="blog-body-paragraph">...</p>
  <ul class="blog-list"><li>...</li></ul>  (use lists where helpful)
- Include at least one practical framework or checklist
- End with a short actionable closing paragraph (not a soft CTA about VCDekho)
- Do NOT include <html>, <head>, <body>, or an H1 (title is rendered separately)
- Output ONLY the HTML body`,
            messages: [{
                role: 'user',
                content: `Write the full blog post.

Title: ${title}
Category: ${topic.categoryLabel}
Angle: ${topic.angle}
Outline sections: ${(meta.outline || []).join(' | ')}

Internal links to weave naturally if relevant (as <a class="blog-inline-link" href="URL">text</a>):
- /blog/how-to-find-right-vc-india
- /blog/what-is-vc-investment-thesis
- /blog/micro-vcs-india-first-cheque
- /guide/raising-vc-funding-india
Only include 1-2 of these if they fit naturally.`
            }]
        });

        const body = stripCodeFences(bodyMsg.content[0].text);
        const words = wordCount(body);

        if (words < 500) {
            return res.status(500).json({
                success: false,
                error: `Generated blog too short (${words} words)`,
                topicId: topic.id
            });
        }

        const tags = Array.from(new Set([
            `topic:${topic.id}`,
            topic.categoryLabel,
            ...((meta.tags || []).filter(t => typeof t === 'string'))
        ])).slice(0, 12);

        const imageUrl = topic.imageUrl;

        await db.query(
            `INSERT INTO articles (
                title, body, slug, meta_title, meta_description, tags,
                category, source_name, source_url, image_url, status, published_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
                title,
                body,
                uniqueSlug,
                meta.meta_title || `${title} | VC Dekho`,
                meta.meta_description || topic.angle.slice(0, 155),
                tags,
                'blog',
                'VCDekho Original',
                `/blog/${uniqueSlug}`,
                imageUrl,
                'published',
                new Date()
            ]
        );

        res.status(200).json({
            success: true,
            topicId: topic.id,
            categoryLabel: topic.categoryLabel,
            title,
            articleSlug: uniqueSlug,
            imageUrl,
            wordCount: words
        });
    } catch (error) {
        console.error('Fatal AI Blog error:', error);
        res.status(500).json({ error: error.message });
    }
};
