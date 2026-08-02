const db = require('../../utils/db');
const { pickTopic } = require('../../utils/blog-topics');
const { runCronJob } = require('../../utils/cron-run');
const {
    generateText,
    parseJsonResponse,
    stripCodeFences,
    DEFAULT_MODEL,
    PROSE_MODEL
} = require('../../utils/gemini');

function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function wordCount(html) {
    return stripCodeFences(html).replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

const BLOG_META_SYSTEM = `You are an SEO editor for VCDekho.com, a publication for Indian startup founders and operators.
Return ONLY valid JSON (no markdown) with keys:
- title (compelling, specific, India-relevant; max 70 chars preferred)
- slug (lowercase kebab-case, unique-feeling, no dates)
- meta_title (max ~60 chars)
- meta_description (140-160 chars)
- tags (array of 5-8 short SEO tags)
- outline (array of 5-7 H2 section titles)
Focus on practical, evergreen founder advice — not breaking news.`;

const BLOG_BODY_SYSTEM = `You are a senior writer for VCDekho, writing actionable guides for Indian startup founders.
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
- Output ONLY the HTML body`;

module.exports = async function handler(req, res) {
    return runCronJob(req, res, 'ai-blog', async () => {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is missing');
        }
        if (!process.env.DATABASE_URL) {
            throw new Error('DATABASE_URL is missing');
        }

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

        const metaPrompt = await generateText({
            system: BLOG_META_SYSTEM,
            user: `Topic ID: ${topic.id}
Suggested title: ${topic.titleHint}
Category label: ${topic.categoryLabel}
Angle: ${topic.angle}

Write an SEO package for a long-form blog post aimed at Indian founders.`,
            maxOutputTokens: 900,
            model: DEFAULT_MODEL,
            jsonMode: true
        });

        const meta = parseJsonResponse(metaPrompt.text);
        if (!meta) {
            throw new Error('Failed to parse blog SEO JSON: ' + metaPrompt.text.slice(0, 300));
        }

        const title = meta.title || topic.titleHint;
        let slug = slugify(meta.slug || title);
        if (!slug) slug = `vc-blog-${topic.id}`;

        let uniqueSlug = slug;
        let counter = 1;
        while (true) {
            const check = await db.query(`SELECT id FROM articles WHERE slug = $1`, [uniqueSlug]);
            if (check.rows.length === 0) break;
            uniqueSlug = `${slug}-${counter}`;
            counter += 1;
        }

        const bodyPrompt = await generateText({
            system: BLOG_BODY_SYSTEM,
            user: `Write the full blog post.

Title: ${title}
Category: ${topic.categoryLabel}
Angle: ${topic.angle}
Outline sections: ${(meta.outline || []).join(' | ')}

Internal links to weave naturally if relevant (as <a class="blog-inline-link" href="URL">text</a>):
- /blog/how-to-find-right-vc-india
- /blog/what-is-vc-investment-thesis
- /blog/micro-vcs-india-first-cheque
- /guide/raising-vc-funding-india
Only include 1-2 of these if they fit naturally.`,
            maxOutputTokens: 8192,
            model: PROSE_MODEL,
            jsonMode: false
        });

        const body = stripCodeFences(bodyPrompt.text);
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

        return {
            topicId: topic.id,
            categoryLabel: topic.categoryLabel,
            title,
            articleSlug: uniqueSlug,
            imageUrl,
            wordCount: words,
            provider: 'gemini'
        };
    });
};
