const { getThemePage, getAllThemes } = require('../../utils/thesis-themes');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function paragraphs(text) {
  return String(text || '')
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => '<p class="theme-writeup-p">' + escapeHtml(p) + '</p>')
    .join('');
}

function listItems(items) {
  return (items || [])
    .map(item => '<li>' + escapeHtml(item) + '</li>')
    .join('');
}

module.exports = async function handler(req, res) {
  const { slug } = req.query || {};
  if (!slug) return res.status(400).send('<h1>400 - Bad Request</h1>');

  try {
    const theme = getThemePage(slug);
    if (!theme) return res.status(404).send('<h1>404 - Thesis theme not found</h1>');

    const otherThemes = getAllThemes()
      .filter(t => t.id !== theme.id)
      .slice(0, 4);

    const investorCards = theme.investors.slice(0, 24).map(inv => (
      '<a class="theme-inv-card" href="/investors/' + escapeHtml(inv.slug) + '">' +
        '<div class="theme-inv-type">' + escapeHtml(inv.type) + '</div>' +
        '<h3>' + escapeHtml(inv.name) + '</h3>' +
        '<p>' + escapeHtml(inv.thesis || inv.chequeSize || '') + '</p>' +
        '<div class="theme-inv-meta">' + escapeHtml(inv.chequeSize || (inv.stages || []).slice(0, 2).join(' · ')) + '</div>' +
      '</a>'
    )).join('');

    const otherCards = otherThemes.map(t => (
      '<a class="theme-other-card" href="/investors/themes/' + escapeHtml(t.id) + '">' +
        '<div class="theme-other-count">' + t.investorCount + ' investors</div>' +
        '<h3>' + escapeHtml(t.label) + '</h3>' +
        '<p>' + escapeHtml(t.summary) + '</p>' +
      '</a>'
    )).join('');

    const html = [
      '<!DOCTYPE html>',
      '<html lang="en" class="scrollable-page">',
      '<head>',
      '<script async src="https://www.googletagmanager.com/gtag/js?id=G-BJ23KLLWFM"></script>',
      '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js", new Date());gtag("config","G-BJ23KLLWFM");</script>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>' + escapeHtml(theme.label) + ' Investors | Thesis Themes | VC Dekho</title>',
      '<meta name="description" content="' + escapeHtml(theme.summary).slice(0, 160) + '">',
      '<link rel="canonical" href="https://vcdekho.com/investors/themes/' + escapeHtml(theme.id) + '">',
      '<link rel="icon" type="image/png" href="/assets/logoforvc.png">',
      '<link rel="stylesheet" href="/style.css?v=8">',
      '</head>',
      '<body class="scrollable-page inv-page">',
      '<div class="app-container">',
      '<header class="site-header">',
      '<a href="/" class="logo-container"><img src="/assets/logoforvc.png" alt="VC Dekho Logo" class="logo-img"></a>',
      '<button class="nav-toggle" id="menu-toggle" aria-label="Toggle navigation menu"><span></span><span></span><span></span></button>',
      '<nav class="main-nav" id="navigation-bar">',
      '<a href="/" class="nav-link">Home</a>',
      '<a href="/investors" class="nav-link active">Investors</a>',
      '<a href="/blog" class="nav-link">Blog</a>',
      '<a href="/news" class="nav-link">News</a>',
      '</nav></header>',
      '<main class="hero-showcase inv-detail-main">',
      '<div class="ambient-bg-wrapper"><div class="waitlist-bg"><div class="glow-orb orb-1"></div><div class="glow-orb orb-2"></div><div class="glow-orb orb-3"></div></div></div>',
      '<div class="inv-detail-wrap theme-page-wrap">',
      '<div class="inv-breadcrumbs"><a href="/">Home</a><span>›</span><a href="/investors">Investors</a><span>›</span><a href="/investors/themes">Thesis themes</a><span>›</span><span class="current">' + escapeHtml(theme.label) + '</span></div>',
      '<section class="theme-hero">',
      '<span class="inv-kicker">' + escapeHtml(theme.eyebrow) + '</span>',
      '<h1 class="inv-detail-title">' + escapeHtml(theme.label) + '</h1>',
      '<p class="inv-detail-thesis">' + escapeHtml(theme.summary) + '</p>',
      '<div class="theme-hero-meta"><span>' + theme.investorCount + ' matching investors</span><a href="/investors?thesis=' + encodeURIComponent(theme.id) + '">View in directory →</a></div>',
      '</section>',
      '<section class="inv-body-panel theme-writeup-panel">',
      '<h2>What this thesis means</h2>',
      paragraphs(theme.writeup),
      '<div class="theme-two-col">',
      '<div><h3>Who it fits</h3><ul class="theme-bullets">' + listItems(theme.whoItFits) + '</ul></div>',
      '<div><h3>What to prepare</h3><ul class="theme-bullets">' + listItems(theme.whatToPrepare) + '</ul></div>',
      '</div>',
      '</section>',
      '<section class="theme-investors-section">',
      '<div class="theme-section-head"><h2>Investors with this thesis</h2><a href="/investors?thesis=' + encodeURIComponent(theme.id) + '">See all filters</a></div>',
      '<div class="theme-inv-grid">' + (investorCards || '<p class="inv-empty">No investors tagged yet.</p>') + '</div>',
      theme.investorCount > 24 ? ('<div class="theme-more"><a class="inv-btn inv-btn-primary" href="/investors?thesis=' + encodeURIComponent(theme.id) + '">Browse all ' + theme.investorCount + ' investors</a></div>') : '',
      '</section>',
      otherCards ? ('<section class="theme-others"><h2>Other thesis themes</h2><div class="theme-others-grid">' + otherCards + '</div></section>') : '',
      '<section class="blog-cta-banner" style="margin: 3rem 0 1rem;">',
      '<img src="/assets/blog_vc_dekho_cta.png" alt="VC Dekho" class="blog-cta-bg">',
      '<div class="blog-cta-content">',
      '<h2 class="blog-cta-title">Match your round to the right thesis</h2>',
      '<p class="blog-cta-desc">VC Dekho helps founders shortlist investors by stage, sector, cheque size, and investment thesis.</p>',
      '<a href="/waitlist" class="blog-cta-btn">Join the Waitlist</a>',
      '</div></section>',
      '</div></main></div>',
      '<script src="/app.js"></script>',
      '</body></html>'
    ].join('\n');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    res.status(200).send(html);
  } catch (error) {
    console.error('theme detail error:', error);
    res.status(500).send('<h1>500 - Internal Server Error</h1>');
  }
};
