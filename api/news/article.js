const db = require('../../utils/db');

// MOCK DATA for testing environment
const MOCK_ARTICLES = {
    "startup-tech-digest-2026-06-18": {
        title: "Startup & Tech Daily Digest: Jun 18",
        slug: "startup-tech-digest-2026-06-18",
        category: "daily-digest",
        source_name: "VCDekho Original",
        source_url: "/",
        published_at: new Date().toISOString(),
        image_url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=2000&auto=format&fit=crop",
        meta_title: "Startup & Tech Daily Digest: Jun 18 | VCDekho",
        meta_description: "A comprehensive roundup of today's startup ecosystem news, featuring funding, tech, and milestones.",
        body: `<p>Today's startup ecosystem saw a mix of milestones, product launches, and strategic funding rounds across India. Here is a quick roundup of the most notable news from today.</p>

<div class="digest-grid">
  <div class="digest-card">
    <div class="digest-header">
      <h3 class="digest-startup">TechBrew SaaS</h3>
      <span class="digest-highlight">₹5 Crore</span>
    </div>
    <p class="digest-description">Raised in Seed funding from Blume Founders Fund. The Bengaluru-based startup provides automated API testing tools for fintech companies.</p>
  </div>

  <div class="digest-card">
    <div class="digest-header">
      <h3 class="digest-startup">GreenRide</h3>
      <span class="digest-highlight">Crossed 1M Users</span>
    </div>
    <p class="digest-description">The EV logistics aggregator announced a major milestone today, reaching 1 million active users across 5 major Indian cities ahead of their Series A.</p>
  </div>

  <div class="digest-card">
    <div class="digest-header">
      <h3 class="digest-startup">ChaiPoint Local</h3>
      <span class="digest-highlight">Launched "AgriTech AI"</span>
    </div>
    <p class="digest-description">Announced a new AI-driven supply chain tool that helps local organic tea farmers in Assam predict crop yields with 90% accuracy.</p>
  </div>
</div>

<p>The ecosystem continues to mature beyond simple fundraising announcements, with startups focusing heavily on user traction and deep tech solutions to solve core infrastructure problems.</p>`,
        tags: ["Daily Digest", "Funding", "Milestone", "Product Launch", "Indian Startups", "VCDekho"]
    },
    "karo-sambhav-raises-56-crore-pre-series-a-rainmatter": {
        title: "Karo Sambhav Raises ₹56 Crore Pre-Series A Led by Rainmatter",
        slug: "karo-sambhav-raises-56-crore-pre-series-a-rainmatter",
        category: "funding-round",
        source_name: "Inc42",
        source_url: "https://inc42.com/buzz/karo-sambhav-raises-%e2%82%b956-cr-to-turn-e-waste-into-critical-raw-materials/",
        published_at: new Date().toISOString(),
        image_url: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?q=80&w=2000&auto=format&fit=crop",
        meta_title: "Karo Sambhav Raises ₹56 Crore Pre-Series A Led by Rainmatter",
        meta_description: "Delhi NCR cleantech startup Karo Sambhav raises ₹56 crore in Pre-Series A funding led by Rainmatter.",
        body: `<p>Delhi NCR-based cleantech startup <strong>Karo Sambhav</strong> has raised <strong>₹56 crore</strong> in a <strong>Pre-Series A</strong> funding round led by <strong>Rainmatter</strong>, the climate and fintech-focused investment arm of Zerodha.</p>

<p>Founded in 2017, Karo Sambhav designs and manages extended producer responsibility (EPR) programmes across multiple waste streams, helping brands meet their regulatory compliance obligations under India's waste management rules. The company operates at the intersection of environmental compliance and material recovery, targeting end-of-life products for extraction of critical, precious, and high-value materials.</p>

<p>Key highlights of the company and this funding round include:</p>

<div class="infographic-grid">
  <div class="info-card">
    <div class="info-label">Amount Raised</div>
    <div class="info-value">₹56 crore</div>
  </div>
  <div class="info-card">
    <div class="info-label">Stage</div>
    <div class="info-value">Pre-Series A</div>
  </div>
  <div class="info-card">
    <div class="info-label">Lead Investor</div>
    <div class="info-value">Rainmatter</div>
  </div>
  <div class="info-card">
    <div class="info-label">Focus Area</div>
    <div class="info-value">E-waste Recycling</div>
  </div>
</div>

<p>India's e-waste management sector has been gaining regulatory momentum, with the government tightening EPR norms in recent years and pushing producers to take greater accountability for end-of-life product disposal. Karo Sambhav's model, which sits between brands and the recycling infrastructure, positions it as a compliance and sustainability partner rather than just a waste processor.</p>

<p>The fresh capital is expected to help the company scale its collection network, strengthen recycling capacity, and deepen its partnerships across industries navigating increasingly stringent waste compliance requirements in India.</p>`,
        tags: [
            "Karo Sambhav", "Rainmatter", "Pre-Series A funding", "extended producer responsibility",
            "e-waste management India", "cleantech startup", "EPR compliance", "waste management startup",
            "Zerodha climate investment", "India recycling startup", "plastic waste management", "circular economy India"
        ]
    },
    "rusk-media-raises-100-crore-pre-series-c-nazara-technologies": {
        title: "Rusk Media Raises ₹100 Crore Pre-Series C Led by Nazara Technologies",
        slug: "rusk-media-raises-100-crore-pre-series-c-nazara-technologies",
        category: "funding-round",
        source_name: "Inc42",
        source_url: "https://inc42.com/buzz/digital-entertainment-startup-rusk-media-secures-%e2%82%b9100-cr/",
        published_at: new Date().toISOString(),
        image_url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2000&auto=format&fit=crop",
        meta_title: "Rusk Media Raises ₹100 Crore Pre-Series C Led by Nazara Technologies",
        meta_description: "Mumbai-based Rusk Media secures ₹100 crore in Pre-Series C funding led by Nazara Technologies.",
        body: `<h2>Rusk Media Raises ₹100 Crore in Pre-Series C Round Led by Nazara Technologies</h2>

<p>Mumbai-based digital entertainment startup <strong>Rusk Media</strong> has secured <strong>₹100 crore</strong> in a Pre-Series C funding round, with gaming and sports media company <strong>Nazara Technologies</strong> leading the investment. The round also saw participation from <strong>InfoEdge Ventures</strong>, <strong>IvyCap Ventures</strong>, and <strong>Audacity VC</strong>.</p>

<p>Founded in <strong>2019</strong>, Rusk Media has built a portfolio of Gen Z-focused digital content brands spanning fiction, gaming, food, fashion, travel, and sports audio. The company counts major OTT platforms <strong>Amazon MX Player</strong> and <strong>JioHotstar</strong> among its clients, positioning itself as a key content partner in India's rapidly growing streaming ecosystem.</p>

<h2 style="font-family: var(--font-heading); margin: 30px 0 15px 0;">Key Funding Highlights</h2>
<div class="infographic-grid">
  <div class="info-card">
    <div class="info-label">Amount Raised</div>
    <div class="info-value">₹100 Crore</div>
  </div>
  <div class="info-card">
    <div class="info-label">Stage</div>
    <div class="info-value">Pre-Series C</div>
  </div>
  <div class="info-card">
    <div class="info-label">Lead Investor</div>
    <div class="info-value">Nazara Tech</div>
  </div>
  <div class="info-card">
    <div class="info-label">Key Focus</div>
    <div class="info-value">Gen Z Content</div>
  </div>
  <div class="info-card">
    <div class="info-label">Co-Investors</div>
    <div class="info-value">InfoEdge Ventures, IvyCap Ventures, Audacity VC</div>
  </div>
  <div class="info-card">
    <div class="info-label">Target Audience</div>
    <div class="info-value">Gen Z consumers across India</div>
  </div>
  <div class="info-card" style="grid-column: 1 / -1;">
    <div class="info-label">Key Brands</div>
    <div class="info-value">Alright! (fiction), Playground (gaming), LIT (food, fashion & travel), Alright! TV (sports audio)</div>
  </div>
  <div class="info-card">
    <div class="info-label">Talent Franchises</div>
    <div class="info-value">I-Popstar, Engaged</div>
  </div>
  <div class="info-card">
    <div class="info-label">OTT Clients</div>
    <div class="info-value">Amazon MX Player, JioHotstar</div>
  </div>
</div>

<p>The fresh capital is expected to accelerate Rusk Media's content production capabilities and expand its brand portfolio. Nazara Technologies' involvement signals growing interest from established gaming and media players in backing next-generation content studios catering to younger digital audiences.</p>

<p>India's Gen Z demographic, estimated at over <strong>370 million</strong>, continues to drive consumption of short and mid-form digital content, making Rusk Media's multi-format approach increasingly attractive to both investors and platform partners looking to deepen audience engagement.</p>`,
        tags: [
            "Rusk Media", "Nazara Technologies", "Pre-Series C funding", "digital entertainment startup",
            "Gen Z content", "India startup funding", "InfoEdge Ventures", "IvyCap Ventures",
            "OTT platforms", "digital content brands", "JioHotstar", "Amazon MX Player"
        ]
    }
};

function formatRelatedDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((startToday - startThat) / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function relatedCategoryLabel(item) {
    if (item.category === 'blog') {
        return (item.tags || []).find(t => t === 'Fundraising Fundamentals' || t === 'VC Research') || 'Founder Guide';
    }
    if (item.category === 'funding-round') return 'Funding Round';
    if (item.category === 'daily-digest') return 'Daily Digest';
    return 'News';
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
    const { slug } = req.query;

    if (!slug) {
        return res.status(400).send('<h1>400 - Bad Request</h1>');
    }

    let article;
    let relatedItems = [];

    try {
        if (!process.env.DATABASE_URL) {
            article = MOCK_ARTICLES[slug];
            if (!article) {
                return res.status(404).send('<h1>404 - Article Not Found (Mock Mode)</h1>');
            }
            relatedItems = Object.values(MOCK_ARTICLES).filter(a => a.slug !== slug).slice(0, 2);
        } else {
            const { rows } = await db.query(`SELECT * FROM articles WHERE slug = $1 AND status = 'published'`, [slug]);
            
            if (rows.length === 0) {
                return res.status(404).send('<h1>404 - Article Not Found</h1>');
            }
            article = rows[0];

            // Prefer same-category related posts; fill with other published items if needed
            const relatedQuery = article.category === 'blog'
                ? `SELECT title, slug, category, source_name, published_at, tags
                   FROM articles
                   WHERE status = 'published' AND slug <> $1 AND category = 'blog'
                   ORDER BY published_at DESC
                   LIMIT 2`
                : `SELECT title, slug, category, source_name, published_at, tags
                   FROM articles
                   WHERE status = 'published' AND slug <> $1 AND category IS DISTINCT FROM 'blog'
                   ORDER BY published_at DESC
                   LIMIT 2`;

            const relatedRes = await db.query(relatedQuery, [slug]);
            relatedItems = relatedRes.rows;

            if (relatedItems.length < 2) {
                const fillRes = await db.query(
                    `SELECT title, slug, category, source_name, published_at, tags
                     FROM articles
                     WHERE status = 'published' AND slug <> $1
                     ORDER BY published_at DESC
                     LIMIT $2`,
                    [slug, 2 - relatedItems.length]
                );
                const seen = new Set(relatedItems.map(r => r.slug));
                for (const row of fillRes.rows) {
                    if (!seen.has(row.slug)) relatedItems.push(row);
                }
            }
        }

        const publishDate = new Date(article.published_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
        const isBlog = article.category === 'blog';
        const pathPrefix = isBlog ? 'blog' : 'news';
        const sectionLabel = isBlog
            ? ((article.tags || []).find(t => t === 'Fundraising Fundamentals' || t === 'VC Research') || 'Founder Guide')
            : (article.category === 'funding-round' ? 'Funding Round' : article.category === 'daily-digest' ? 'Daily Digest' : 'News');
        const schemaType = isBlog ? 'BlogPosting' : 'NewsArticle';
        const titleSuffix = isBlog ? 'VC Dekho Blog' : 'VC Dekho News';
        const blogNavActive = isBlog ? 'active' : '';
        const newsNavActive = isBlog ? '' : 'active';
        const relatedHeading = isBlog ? 'Related Guides' : 'Related News';
        const sourceLine = isBlog
            ? `<span>${publishDate}</span><span style="width: 4px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 50%;"></span><span>VC Dekho Editorial</span>`
            : `<span>📅 ${publishDate}</span><span style="width: 4px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 50%;"></span><span>Source: <a href="${article.source_url}" target="_blank" style="color: var(--color-accent-orange); text-decoration: none;">${article.source_name}</a></span>`;

        const relatedCardsHtml = relatedItems.map(item => {
            const itemIsBlog = item.category === 'blog';
            const href = `/${itemIsBlog ? 'blog' : 'news'}/${item.slug}`;
            const label = relatedCategoryLabel(item);
            const dateLabel = formatRelatedDate(item.published_at);
            const source = itemIsBlog ? 'VC Dekho' : (item.source_name || 'VC Dekho');
            return `
                        <a href="${href}" style="text-decoration: none; display: block; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 20px; transition: transform 0.2s ease, background 0.2s ease;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 10px;">
                                <span style="font-size: 0.75rem; color: var(--color-accent-orange); text-transform: uppercase; letter-spacing: 1px;">${escapeHtml(label)}</span>
                                <span style="font-size: 0.75rem; color: var(--color-text-muted); white-space: nowrap;">${escapeHtml(dateLabel)}</span>
                            </div>
                            <h4 style="color: var(--color-text-light); margin: 0 0 10px 0; font-size: 1.1rem; line-height: 1.4;">${escapeHtml(item.title)}</h4>
                            <p style="color: var(--color-text-muted); margin: 0; font-size: 0.9rem;">${escapeHtml(source)}</p>
                        </a>`;
        }).join('');

        const html = `
<!DOCTYPE html>
<html lang="en" class="scrollable-page">
<head>
    <script src="/js/analytics.js?v=2" defer></script>
    <script src="/js/nav.js?v=101" defer></script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap">
    <title>${article.meta_title} | ${titleSuffix}</title>
    <meta name="description" content="${article.meta_description}">
    
    <link rel="icon" type="image/png" href="/assets/logoforvc.png">
    <link rel="stylesheet" href="/css/base.css?v=101">
    <link rel="stylesheet" href="/css/hero.css?v=73">
    <link rel="stylesheet" href="/css/ambient.css?v=98">
    <link rel="stylesheet" href="/css/blog.css?v=74">
    <link rel="canonical" href="https://vcdekho.com/${pathPrefix}/${article.slug}">
    
    <meta property="og:title" content="${article.meta_title}">
    <meta property="og:description" content="${article.meta_description}">
    <meta property="og:url" content="https://vcdekho.com/${pathPrefix}/${article.slug}">
    <meta property="og:type" content="article">
    <meta property="og:image" content="https://vcdekho.com/assets/logoforvc.png">

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "${schemaType}",
      "headline": "${String(article.title).replace(/"/g, '\\"')}",
      "datePublished": "${article.published_at}",
      "author": { "@type": "Organization", "name": "VC Dekho" },
      "publisher": { "@type": "Organization", "name": "VC Dekho", "logo": { "@type": "ImageObject", "url": "https://vcdekho.com/assets/logoforvc.png" } }
    }
    </script>
</head>
<body class="scrollable-page pub-page">
    <div class="app-container">
        <header class="site-header">
            <a href="/" class="logo-container">
                <img src="/assets/logoforvc.png" alt="VC Dekho Logo" class="logo-img">
            </a>
            <button class="nav-toggle" id="menu-toggle" aria-label="Toggle navigation menu">
                <span></span><span></span><span></span>
            </button>
            <nav class="main-nav" id="navigation-bar">
                <a href="/" class="nav-link">Home</a>
                <a href="/funds" class="nav-link">Funds</a>
                <a href="/investors" class="nav-link">Investors</a>
                <a href="/blog" class="nav-link ${blogNavActive}">Blog</a>
                <a href="/news" class="nav-link ${newsNavActive}">News</a>
                <a href="/login" class="nav-link">Log in</a>
            </nav>
        </header>

        <main class="hero-showcase">
            <!-- Ambient Glow Background -->
            <div class="ambient-bg-wrapper">
                <div class="waitlist-bg" id="waitlist-ambient-bg">
                    <div class="glow-orb orb-1"></div>
                    <div class="glow-orb orb-2"></div>
                    <div class="glow-orb orb-3"></div>
                </div>
            </div>

            <div class="blog-content news-article-wrap">
                <!-- Breadcrumbs -->
                <div class="news-breadcrumbs">
                    <a href="/" style="color: var(--color-text-muted); text-decoration: none;">Home</a> 
                    <span style="margin: 0 8px;">›</span> 
                    <a href="/${pathPrefix}" style="color: var(--color-text-muted); text-decoration: none;">${isBlog ? 'Blog' : 'News'}</a> 
                    <span style="margin: 0 8px;">›</span> 
                    <span style="color: var(--color-accent-orange);">${sectionLabel}</span>
                </div>

                <h1 class="blog-title news-article-title">${article.title}</h1>
                <p class="news-article-meta">
                    ${sourceLine}
                </p>
                
                ${article.image_url ? `
                <div class="news-article-featured-image">
                    <img src="${article.image_url}" alt="Featured Image">
                </div>
                ` : ''}
                
                <div class="blog-article-body">
                    ${/<p[ >]/i.test(article.body) ? article.body : article.body.split('\n').map(p => p.trim() ? '<p style="margin-bottom: 20px;">' + p + '</p>' : '').join('')}
                </div>

                <!-- Waitlist CTA Card -->
                <section class="blog-cta-banner" style="margin: 3.5rem 0;">
                    <img src="/assets/blog_vc_dekho_cta.webp" alt="VC Dekho Brand Graphic Banner" class="blog-cta-bg">
                    <div class="blog-cta-content">
                        <h2 class="blog-cta-title">Stop guessing. Start matching.</h2>
                        <p class="blog-cta-desc">
                            VC Dekho is building India's most complete investor research and matching platform. Search by stage, sector, cheque size, and geography. Read investment thesis. Unlock direct contacts. Close your round faster.
                        </p>
                        <a href="/login?next=/funds" class="blog-cta-btn">Start exploring</a>
                    </div>
                </section>
                
                <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <h3 style="color: var(--color-text-light); margin-bottom: 15px; font-size: 1.2rem;">Topics</h3>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                        ${(article.tags || []).filter(t => t && !String(t).startsWith('topic:')).map(t => '<span style="padding: 8px 14px; font-size: 0.85rem; border-radius: 20px; background: rgba(255,255,255,0.06); color: var(--color-text-light); border: 1px solid rgba(255,255,255,0.1); transition: all 0.2s ease; cursor: pointer;">#' + t + '</span>').join('')}
                    </div>
                </div>

                ${relatedCardsHtml ? `
                <!-- Related Section -->
                <div style="margin-top: 70px;">
                    <h2 style="color: var(--color-text-light); margin-bottom: 25px; font-size: 1.8rem; border-bottom: 2px solid var(--color-accent-orange); padding-bottom: 10px; display: inline-block;">${relatedHeading}</h2>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px; margin-top: 10px;">
                        ${relatedCardsHtml}
                    </div>
                </div>
                ` : ''}
            </div>
        </main>
    </div>
    <script src="/app.js" defer></script>
</body>
</html>
        `;

        res.setHeader('Content-Type', 'text/html');
        // Cache heavily at the edge to make it fast like a static site
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=3600');
        res.status(200).send(html);

    } catch (error) {
        console.error('Error rendering article:', error);
        res.status(500).send('<h1>500 - Internal Server Error</h1>');
    }
};
