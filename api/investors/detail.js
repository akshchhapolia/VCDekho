const { getInvestorBySlug, filterInvestors, toCard, hasStageGuide, deriveRelatedStages, ensureActivityFresh, ensurePortfolioFresh } = require('../../utils/investors');
const { getThemePage, getAllThemes } = require('../../utils/thesis-themes');
const { getStagePage } = require('../../utils/investment-stages');
const { getSectorPage } = require('../../utils/sectors');
const { renderStagePage } = require('../../utils/render-stage-page');
const { renderSectorPage } = require('../../utils/render-sector-page');
const { renderInvestorPage } = require('../../utils/render-investor-page');
const { renderExploreRelated } = require('../../utils/render-explore-related');
const { getThesisThemeIconSvg } = require('../../utils/thesis-theme-icons');

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

function stageLinksForCard(inv) {
  const labels = inv.stages || [];
  const ids = inv.stageIds || [];
  const links = labels.slice(0, 3).map((label, i) => {
    const id = ids[i];
    if (hasStageGuide(id)) {
      return (
        '<a class="theme-inv-stage-link" href="/investors/stages/' + escapeHtml(id) + '">' +
          escapeHtml(label) +
        '</a>'
      );
    }
    return '<span class="theme-inv-stage-link">' + escapeHtml(label) + '</span>';
  });
  if (!links.length) return '';
  return '<div class="theme-inv-stages">' + links.join('<span aria-hidden="true"> · </span>') + '</div>';
}

function renderThemePage(theme, res) {
  const otherThemes = getAllThemes()
    .filter(t => t.id !== theme.id)
    .slice(0, 4);

  const relatedStages = deriveRelatedStages(theme.investors, 5);

  const investorCards = theme.investors.slice(0, 24).map(inv => (
    '<article class="theme-inv-card">' +
      '<a class="theme-inv-card-main" href="/investors/' + escapeHtml(inv.slug) + '">' +
        '<div class="theme-inv-type">' + escapeHtml(inv.type) + '</div>' +
        '<h3>' + escapeHtml(inv.name) + '</h3>' +
        '<p>' + escapeHtml(inv.thesis || inv.chequeSize || '') + '</p>' +
        '<div class="theme-inv-meta">' + escapeHtml(inv.chequeSize || '') + '</div>' +
      '</a>' +
      stageLinksForCard(inv) +
    '</article>'
  )).join('');

  const otherCards = otherThemes.map(t => (
    '<a class="theme-other-card" href="/investors/themes/' + escapeHtml(t.id) + '">' +
      '<div class="theme-other-top">' +
        getThesisThemeIconSvg(t.id, 'theme-other-icon') +
        '<div class="theme-other-count">' + t.investorCount + ' investors</div>' +
      '</div>' +
      '<h3>' + escapeHtml(t.label) + '</h3>' +
      '<p>' + escapeHtml(t.summary) + '</p>' +
    '</a>'
  )).join('');

  const exploreHtml = renderExploreRelated({
    title: 'Explore related',
    subtitle: 'Pair this thesis with the right stage, then shortlist matching funds.',
    stages: relatedStages,
    themes: otherThemes.map(t => ({ id: t.id, label: t.label })),
    fundsHref: '/investors?thesis=' + encodeURIComponent(theme.id),
    fundsLabel: 'Browse ' + theme.investorCount + ' matching funds →',
    siblingHref: '/investors/sectors',
    siblingLabel: 'Sector guides →'
  });

  const html = [
    '<!DOCTYPE html>',
    '<html lang="en" class="scrollable-page">',
    '<head>',
    '<script src="/js/analytics.js" defer></script>',
    '<script src="/js/nav.js" defer></script>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap">',
    '<title>' + escapeHtml(theme.label) + ' Investors | Thesis Themes | VC Dekho</title>',
    '<meta name="description" content="' + escapeHtml(theme.summary).slice(0, 160) + '">',
    '<link rel="canonical" href="https://vcdekho.com/investors/themes/' + escapeHtml(theme.id) + '">',
    '<link rel="icon" type="image/png" href="/assets/logoforvc.png">',
    '<meta name="robots" content="index, follow">',
    '<link rel="stylesheet" href="/css/base.css?v=71">',
    '<link rel="stylesheet" href="/css/hero.css?v=71">',
    '<link rel="stylesheet" href="/css/ambient.css?v=71">',
    '<link rel="stylesheet" href="/css/directory.css?v=71">',
    '</head>',
    '<body class="scrollable-page inv-page">',
    '<div class="app-container">',
    '<header class="site-header">',
    '<a href="/" class="logo-container"><img src="/assets/logoforvc.png" alt="VC Dekho Logo" class="logo-img"></a>',
    '<button class="nav-toggle" id="menu-toggle" aria-label="Toggle navigation menu"><span></span><span></span><span></span></button>',
    '<nav class="main-nav" id="navigation-bar">',
    '<a href="/" class="nav-link">Home</a>',
    '<a href="/investors" class="nav-link active">Investors</a>',
    '<a href="/people" class="nav-link">People</a>',
    '<a href="/blog" class="nav-link">Blog</a>',
    '<a href="/news" class="nav-link">News</a>',
    '</nav></header>',
    '<main class="hero-showcase inv-detail-main">',
    '<div class="ambient-bg-wrapper"><div class="waitlist-bg"><div class="glow-orb orb-1"></div><div class="glow-orb orb-2"></div><div class="glow-orb orb-3"></div></div></div>',
    '<div class="inv-detail-wrap theme-page-wrap">',
    '<div class="inv-breadcrumbs"><a href="/">Home</a><span>›</span><a href="/investors">Investors</a><span>›</span><a href="/investors/themes">Thesis themes</a><span>›</span><span class="current">' + escapeHtml(theme.label) + '</span></div>',
    '<section class="theme-hero">',
    '<div class="theme-hero-icon-wrap" aria-hidden="true">' + getThesisThemeIconSvg(theme.id, 'theme-hero-icon') + '</div>',
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
    exploreHtml,
    otherCards ? ('<section class="theme-others"><h2>Other thesis themes</h2><div class="theme-others-grid">' + otherCards + '</div></section>') : '',
    '<section class="blog-cta-banner" style="margin: 3rem 0 1rem;">',
    '<img src="/assets/blog_vc_dekho_cta.webp" alt="VC Dekho" class="blog-cta-bg">',
    '<div class="blog-cta-content">',
    '<h2 class="blog-cta-title">Match your round to the right thesis</h2>',
    '<p class="blog-cta-desc">VC Dekho helps founders shortlist investors by stage, sector, cheque size, and investment thesis.</p>',
    '<a href="/investors" class="blog-cta-btn">Browse investors</a>',
    '</div></section>',
    '</div></main></div>',
    '<script src="/js/auth.js"></script>',
    '<script src="/app.js" defer></script>',
    '</body></html>'
  ].join('\n');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(html);
}

module.exports = async function handler(req, res) {
  const { slug, view } = req.query || {};
  if (!slug) {
    return res.status(400).send('<h1>400 - Bad Request</h1>');
  }

  try {
    await ensureActivityFresh();
    await ensurePortfolioFresh();

    if (view === 'theme') {
      const theme = getThemePage(slug);
      if (!theme) return res.status(404).send('<h1>404 - Thesis theme not found</h1>');
      return renderThemePage(theme, res);
    }

    if (view === 'stage') {
      const stage = getStagePage(slug);
      if (!stage) return res.status(404).send('<h1>404 - Investment stage not found</h1>');
      return renderStagePage(stage, res);
    }

    if (view === 'sector') {
      const sector = getSectorPage(slug);
      if (!sector) return res.status(404).send('<h1>404 - Sector guide not found</h1>');
      return renderSectorPage(sector, res);
    }

    const investor = getInvestorBySlug(slug);
    if (!investor) {
      return res.status(404).send('<h1>404 - Investor Not Found</h1>');
    }

    const related = filterInvestors({
      sector: investor.sectorIds[0] || '',
      type: investor.typeId || ''
    })
      .filter(i => i.slug !== investor.slug)
      .slice(0, 3)
      .map(toCard);

    return renderInvestorPage(investor, related, res);
  } catch (error) {
    console.error('investor detail error:', error);
    res.status(500).send('<h1>500 - Internal Server Error</h1>');
  }
};
