const { fundHref } = require('./site-labels');
const { renderSiteNavLinks } = require('./render-site-nav');
const {
  cleanBuzzTitle,
  normalizeSentiment,
  sentimentLabel
} = require('./buzz-format');
const { renderBuzzBodyHtml, buzzBodyIsLong } = require('./buzz-body-render');

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

function renderBodyHtml(body) {
  const html = renderBuzzBodyHtml(body);
  if (!html) {
    return '<p class="buzz-post-body buzz-post-body--empty">Original post text unavailable — open the Reddit thread for the full discussion.</p>';
  }
  const long = buzzBodyIsLong(body);
  return `
    <section class="buzz-section">
      <h2 class="buzz-section-label">Post</h2>
      <div class="buzz-post-body buzz-post-body--rich${long ? ' is-clamped' : ''}" data-buzz-body>${html}</div>
      ${long ? '<button type="button" class="buzz-expand-btn" data-buzz-expand aria-expanded="false">Read all</button>' : ''}
    </section>`;
}

function renderFundSection(slugs, names) {
  if (!slugs || !slugs.length) return '';
  return `
    <section class="buzz-section">
      <h2 class="buzz-section-label">Fund in conversation</h2>
      <div class="buzz-fund-list">${slugs
        .map((slug, i) => {
          const label = (names && names[i]) || slug;
          return `<a href="${fundHref(slug)}" class="buzz-fund-pill" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
        })
        .join('')}</div>
    </section>`;
}

function renderBuzzCardInnerHtml(item) {
  const topics = item.topics || [];
  const dateStr = formatDate(item.published_at_source || item.published_at);
  const sourceLabel =
    item.source === 'reddit'
      ? `r/${item.subreddit || 'unknown'}`
      : esc(item.source);
  const title = cleanBuzzTitle(item.title);
  const sentiment = normalizeSentiment(item.sentiment);

  return `
    <header class="buzz-post-header">
      <div class="buzz-card-head">
        <div class="buzz-card-head-left">
          <span class="buzz-source-badge buzz-source-reddit">Reddit</span>
          <span class="buzz-meta">${esc(sourceLabel)}</span>
        </div>
        ${dateStr ? `<time class="buzz-card-date">${esc(dateStr)}</time>` : ''}
      </div>
      <h1 class="buzz-card-title">${esc(title)}</h1>
    </header>

    ${renderBodyHtml(item.body_excerpt)}

    ${
      topics.length
        ? `<section class="buzz-section">
        <h2 class="buzz-section-label">Topics</h2>
        <div class="buzz-topic-chips">${topics
          .map((t) => `<span class="buzz-topic-chip">${esc(t)}</span>`)
          .join('')}</div>
      </section>`
        : ''
    }

    ${renderFundSection(item.investor_slugs, item.investor_names)}

    <section class="buzz-section buzz-sentiment-row">
      <h2 class="buzz-section-label">Sentiment</h2>
      <span class="buzz-sentiment-badge buzz-sentiment--${sentiment}">${sentimentLabel(item.sentiment)}</span>
    </section>

    <footer class="buzz-card-footer">
      <a href="${esc(item.source_url)}" class="buzz-read-original" target="_blank" rel="noopener noreferrer">Read original on Reddit →</a>
      <div class="buzz-interest" data-interest-root>
        <span class="buzz-interest-label">Interested in this?</span>
        <div class="buzz-interest-actions">
          <button type="button" class="buzz-vote-btn buzz-vote-up" data-vote="1" aria-label="Yes, interested">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v12H3V10h4zm2-8 8 9h5l-4.5 8H9V2z"/></svg>
            <span class="buzz-vote-count" data-count="up">${item.interest_up || 0}</span>
          </button>
          <button type="button" class="buzz-vote-btn buzz-vote-down" data-vote="-1" aria-label="Not interested">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 14V2h4v12h-4zm-2 8-8-9H2l4.5-8H13v17z"/></svg>
            <span class="buzz-vote-count" data-count="down">${item.interest_down || 0}</span>
          </button>
        </div>
      </div>
    </footer>`;
}

function renderBuzzDetailHtml(item) {
  const navLinks = renderSiteNavLinks('buzz', {
    trailing: ['<a href="/login" class="nav-link">Log in</a>']
  }).join('\n                ');

  const title = cleanBuzzTitle(item.title);

  return `<!DOCTYPE html>
<html lang="en" class="scrollable-page">
<head>
    <script src="/js/analytics.js?v=2" defer></script>
    <script src="/js/nav.js?v=101" defer></script>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap">
    <title>${esc(title)} | Founder Buzz | VC Dekho</title>
    <meta name="description" content="${esc(title)} — founder discussion on VC Dekho Founder Buzz">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="https://vcdekho.com/buzz/${esc(item.slug)}">
    <meta property="og:title" content="${esc(title)} | Founder Buzz">
    <meta property="og:description" content="${esc(title)} — founder discussion on VC Dekho Founder Buzz">
    <meta property="og:url" content="https://vcdekho.com/buzz/${esc(item.slug)}">
    <meta property="og:type" content="article">
    <link rel="icon" type="image/png" href="/assets/logoforvc.png">
    <link rel="stylesheet" href="/css/base.css?v=101">
    <link rel="stylesheet" href="/css/hero.css?v=73">
    <link rel="stylesheet" href="/css/ambient.css?v=98">
    <link rel="stylesheet" href="/css/buzz.css?v=15">
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

            <div class="blog-content buzz-page-content">
                <div class="news-breadcrumbs">
                    <a href="/">Home</a>
                    <span>›</span>
                    <a href="/buzz">Founder Buzz</a>
                    <span>›</span>
                    <span class="is-current">Discussion</span>
                </div>

                <div id="buzz-container" class="buzz-feed" data-mode="detail" aria-busy="true">
                  <article class="buzz-card buzz-card--detail" data-slug="${esc(item.slug)}" id="buzz-${esc(item.slug)}">
                    ${renderBuzzCardInnerHtml(item)}
                  </article>
                </div>

                <p class="buzz-disclaimer">Community discussion summarized by VC Dekho. Not verified editorial content.</p>
            </div>
        </main>
    </div>
    <script src="/app.js" defer></script>
    <script src="/js/buzz.js?v=11" defer></script>
</body>
</html>`;
}

module.exports = { renderBuzzDetailHtml, renderBuzzCardInnerHtml };
