const db = require('../../utils/db');
const { fundHref } = require('../../utils/site-labels');
const { renderSiteNavLinks } = require('../../utils/render-site-nav');

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function sentimentLabel(s) {
  const map = {
    positive: 'Positive',
    mixed: 'Mixed',
    negative: 'Negative',
    neutral: 'Neutral'
  };
  return map[s] || 'Neutral';
}

function renderQuotes(quotes) {
  const list = Array.isArray(quotes) ? quotes : [];
  if (!list.length) return '';
  return (
    '<div class="buzz-quotes">' +
    list
      .map(
        (q) =>
          `<blockquote class="buzz-quote">${esc(q.text)}${
            q.paraphrased ? '<span class="buzz-quote-tag">Paraphrased</span>' : ''
          }</blockquote>`
      )
      .join('') +
    '</div>'
  );
}

function renderInvestorLinks(slugs, names) {
  if (!slugs || !slugs.length) return '';
  return (
    '<div class="buzz-linked-funds">' +
    '<span class="buzz-linked-label">Linked funds</span>' +
    slugs
      .map((slug, i) => {
        const label = (names && names[i]) || slug;
        return `<a href="${fundHref(slug)}" class="buzz-fund-link">${esc(label)}</a>`;
      })
      .join('') +
    '</div>'
  );
}

module.exports = async function handler(req, res) {
  const slug = req.query.slug;
  if (!slug) {
    res.status(400).send('Missing slug');
    return;
  }

  if (!process.env.DATABASE_URL) {
    res.status(404).send('Not found');
    return;
  }

  try {
    const { rows } = await db.query(
      `SELECT * FROM investor_buzz WHERE slug = $1 AND status = 'published' LIMIT 1`,
      [slug]
    );
    const item = rows[0];
    if (!item) {
      res.status(404).send('Discussion not found');
      return;
    }

    const quotes =
      typeof item.founder_quotes === 'string'
        ? JSON.parse(item.founder_quotes)
        : item.founder_quotes || [];
    const topics = item.topics || [];
    const dateStr = formatDate(item.published_at || item.published_at_source);
    const sourceLabel =
      item.source === 'reddit'
        ? `Reddit · r/${item.subreddit || 'unknown'}`
        : esc(item.source);

    const navLinks = renderSiteNavLinks('', {
      trailing: [
        '<a href="/buzz" class="nav-link active">Buzz</a>',
        '<a href="/login" class="nav-link">Log in</a>'
      ]
    }).join('\n                ');

    const html = `<!DOCTYPE html>
<html lang="en" class="scrollable-page">
<head>
    <script src="/js/analytics.js?v=2" defer></script>
    <script src="/js/nav.js?v=101" defer></script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap">
    <title>${esc(item.title)} | Investor Buzz | VC Dekho</title>
    <meta name="description" content="${esc(item.ai_summary || item.title)}">
    <meta name="robots" content="noindex, follow">
    <link rel="icon" type="image/png" href="/assets/logoforvc.png">
    <link rel="stylesheet" href="/css/base.css?v=101">
    <link rel="stylesheet" href="/css/hero.css?v=73">
    <link rel="stylesheet" href="/css/ambient.css?v=98">
    <link rel="stylesheet" href="/css/buzz.css?v=1">
</head>
<body class="scrollable-page pub-page buzz-page">
    <div class="app-container">
        <header class="site-header">
            <a href="/" class="logo-container">
                <img src="/assets/logoforvc.png" alt="VC Dekho Logo" class="logo-img">
            </a>
            <button class="nav-toggle" id="menu-toggle" aria-label="Toggle navigation menu">
                <span></span><span></span><span></span>
            </button>
            <nav class="main-nav" id="navigation-bar">
                ${navLinks}
            </nav>
        </header>

        <main class="hero-showcase">
            <div class="ambient-bg-wrapper">
                <div class="waitlist-bg" id="waitlist-ambient-bg">
                    <div class="glow-orb orb-1"></div>
                    <div class="glow-orb orb-2"></div>
                    <div class="glow-orb orb-3"></div>
                </div>
            </div>

            <div class="blog-content buzz-detail-wrap">
                <div class="news-breadcrumbs">
                    <a href="/">Home</a>
                    <span>›</span>
                    <a href="/buzz">Investor Buzz</a>
                    <span>›</span>
                    <span class="is-current">Discussion</span>
                </div>

                <article class="buzz-card buzz-card--detail">
                    <div class="buzz-card-head">
                        <span class="buzz-source-badge buzz-source-reddit">Reddit</span>
                        <span class="buzz-meta">${esc(sourceLabel)} · ${esc(dateStr)}</span>
                    </div>
                    <h1 class="buzz-card-title">${esc(item.title)}</h1>

                    ${renderQuotes(quotes)}

                    ${
                      item.ai_summary
                        ? `<section class="buzz-summary-box">
                        <h2 class="buzz-summary-label">AI Summary</h2>
                        <p class="buzz-summary-text">${esc(item.ai_summary)}</p>
                      </section>`
                        : ''
                    }

                    ${
                      topics.length
                        ? `<section class="buzz-topics">
                        <h2 class="buzz-topics-label">Topics</h2>
                        <div class="buzz-topic-chips">${topics
                          .map((t) => `<span class="buzz-topic-chip">${esc(t)}</span>`)
                          .join('')}</div>
                      </section>`
                        : ''
                    }

                    <div class="buzz-card-foot">
                        <span class="buzz-sentiment buzz-sentiment--${esc(item.sentiment || 'neutral')}">Sentiment: ${sentimentLabel(item.sentiment)}</span>
                        ${
                          item.comment_count
                            ? `<span class="buzz-comments">${item.comment_count} comments</span>`
                            : ''
                        }
                    </div>

                    ${renderInvestorLinks(item.investor_slugs, item.investor_names)}

                    <p class="buzz-disclaimer">Community discussion summarized by VC Dekho. Not verified editorial content.</p>

                    <a href="${esc(item.source_url)}" class="buzz-read-original" target="_blank" rel="noopener noreferrer">Read Original →</a>
                </article>
            </div>
        </main>
    </div>
    <script src="/app.js" defer></script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=3600');
    res.status(200).send(html);
  } catch (error) {
    console.error('buzz detail error:', error);
    res.status(500).send('Internal error');
  }
};
