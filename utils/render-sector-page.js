/**
 * HTML renderer for sector guide detail pages.
 */
const { getAllSectorGuides } = require('./sectors');
const { deriveRelatedStages, hasStageGuide } = require('./investors');
const { renderExploreRelated } = require('./render-explore-related');
const { getSectorIconSvg } = require('./sector-icons');

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
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => '<p class="theme-writeup-p">' + escapeHtml(p) + '</p>')
    .join('');
}

function listItems(items) {
  return (items || []).map((item) => '<li>' + escapeHtml(item) + '</li>').join('');
}

function stageLinksForCard(inv) {
  const labels = inv.stages || [];
  const ids = inv.stageIds || [];
  const links = labels.slice(0, 3).map((label, i) => {
    const id = ids[i];
    if (hasStageGuide(id)) {
      return (
        '<a class="theme-inv-stage-link" href="/investors/stages/' +
        escapeHtml(id) +
        '">' +
        escapeHtml(label) +
        '</a>'
      );
    }
    return '<span class="theme-inv-stage-link">' + escapeHtml(label) + '</span>';
  });
  if (!links.length) return '';
  return '<div class="theme-inv-stages">' + links.join('<span aria-hidden="true"> · </span>') + '</div>';
}

function renderSectorPage(sector, res) {
  const otherSectors = getAllSectorGuides()
    .filter((s) => s.id !== sector.id)
    .slice(0, 4);

  const relatedStages = deriveRelatedStages(sector.investors, 5);

  const investorCards = sector.investors
    .slice(0, 24)
    .map(
      (inv) =>
        '<article class="theme-inv-card">' +
        '<a class="theme-inv-card-main" href="/investors/' +
        escapeHtml(inv.slug) +
        '">' +
        '<div class="theme-inv-type">' +
        escapeHtml(inv.type) +
        '</div>' +
        '<h3>' +
        escapeHtml(inv.name) +
        '</h3>' +
        '<p>' +
        escapeHtml(inv.thesis || inv.chequeSize || '') +
        '</p>' +
        '<div class="theme-inv-meta">' +
        escapeHtml(inv.chequeSize || '') +
        '</div>' +
        '</a>' +
        stageLinksForCard(inv) +
        '</article>'
    )
    .join('');

  const otherCards = otherSectors
    .map(
      (s) =>
        '<a class="theme-other-card" href="/investors/sectors/' +
        escapeHtml(s.id) +
        '">' +
        '<div class="theme-other-top">' +
        getSectorIconSvg(s.id, 'theme-other-icon') +
        '<div class="theme-other-count">' +
        s.investorCount +
        ' investors</div>' +
        '</div>' +
        '<h3>' +
        escapeHtml(s.label) +
        '</h3>' +
        '<p>' +
        escapeHtml(s.summary) +
        '</p>' +
        '</a>'
    )
    .join('');

  const exploreHtml = renderExploreRelated({
    title: 'Explore related',
    subtitle: 'Pair this sector with the right stage, then shortlist matching funds.',
    stages: relatedStages,
    themes: [],
    fundsHref: '/investors?sector=' + encodeURIComponent(sector.id),
    fundsLabel: 'Browse ' + sector.investorCount + ' matching funds →',
    siblingHref: '/investors/themes',
    siblingLabel: 'Thesis guides →'
  });

  const html = [
    '<!DOCTYPE html>',
    '<html lang="en" class="scrollable-page">',
    '<head>',
    '<script async src="https://www.googletagmanager.com/gtag/js?id=G-BJ23KLLWFM"></script>',
    '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js", new Date());gtag("config","G-BJ23KLLWFM");</script>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + escapeHtml(sector.label) + ' Investors India | Sector Guides | VC Dekho</title>',
    '<meta name="description" content="' + escapeHtml(sector.summary).slice(0, 160) + '">',
    '<link rel="canonical" href="https://vcdekho.com/investors/sectors/' + escapeHtml(sector.id) + '">',
    '<link rel="icon" type="image/png" href="/assets/logoforvc.png">',
    '<meta name="robots" content="index, follow">',
    '<link rel="stylesheet" href="/style.css?v=47">',
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
    '<div class="inv-breadcrumbs"><a href="/">Home</a><span>›</span><a href="/investors">Investors</a><span>›</span><a href="/investors/sectors">Sectors</a><span>›</span><span class="current">' +
      escapeHtml(sector.label) +
      '</span></div>',
    '<section class="theme-hero">',
    '<div class="theme-hero-icon-wrap" aria-hidden="true">' +
      getSectorIconSvg(sector.id, 'theme-hero-icon') +
      '</div>',
    '<span class="inv-kicker">' + escapeHtml(sector.eyebrow) + '</span>',
    '<h1 class="inv-detail-title">' + escapeHtml(sector.label) + '</h1>',
    '<p class="inv-detail-thesis">' + escapeHtml(sector.summary) + '</p>',
    '<div class="theme-hero-meta"><span>' +
      sector.investorCount +
      ' matching investors</span><a href="/investors?sector=' +
      encodeURIComponent(sector.id) +
      '">View in directory →</a></div>',
    '</section>',
    '<section class="inv-body-panel theme-writeup-panel">',
    '<h2>What this sector means for fundraising</h2>',
    paragraphs(sector.writeup),
    '<div class="theme-two-col">',
    '<div><h3>Who it fits</h3><ul class="theme-bullets">' + listItems(sector.whoItFits) + '</ul></div>',
    '<div><h3>What to prepare</h3><ul class="theme-bullets">' + listItems(sector.whatToPrepare) + '</ul></div>',
    '</div>',
    '</section>',
    '<section class="theme-investors-section">',
    '<div class="theme-section-head"><h2>Investors in this sector</h2><a href="/investors?sector=' +
      encodeURIComponent(sector.id) +
      '">See all filters</a></div>',
    '<div class="theme-inv-grid">' +
      (investorCards || '<p class="inv-empty">No investors tagged yet.</p>') +
      '</div>',
    sector.investorCount > 24
      ? '<div class="theme-more"><a class="inv-btn inv-btn-primary" href="/investors?sector=' +
        encodeURIComponent(sector.id) +
        '">Browse all ' +
        sector.investorCount +
        ' investors</a></div>'
      : '',
    '</section>',
    exploreHtml,
    otherCards
      ? '<section class="theme-others"><h2>Other sector guides</h2><div class="theme-others-grid">' +
        otherCards +
        '</div></section>'
      : '',
    '<section class="blog-cta-banner" style="margin: 3rem 0 1rem;">',
    '<img src="/assets/blog_vc_dekho_cta.png" alt="VC Dekho" class="blog-cta-bg">',
    '<div class="blog-cta-content">',
    '<h2 class="blog-cta-title">Match your category to the right funds</h2>',
    '<p class="blog-cta-desc">VC Dekho helps founders shortlist investors by stage, sector, cheque size, and investment thesis.</p>',
    '<a href="/investors" class="blog-cta-btn">Browse investors</a>',
    '</div></section>',
    '</div></main></div>',
    '<script src="/js/auth.js"></script>',
    '<script src="/app.js"></script>',
    '</body></html>'
  ].join('\n');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(html);
}

module.exports = { renderSectorPage };
