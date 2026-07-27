const { getAllStages } = require('./investment-stages');

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
    .map(p => '<p class="stage-prose">' + escapeHtml(p) + '</p>')
    .join('');
}

function bullets(items, className) {
  return '<ul class="' + (className || 'stage-bullets') + '">' +
    (items || []).map(item => '<li>' + escapeHtml(item) + '</li>').join('') +
    '</ul>';
}

function checklist(items) {
  return '<ul class="stage-checklist">' +
    (items || []).map(item => (
      '<li><span class="stage-check" aria-hidden="true"></span><span>' + escapeHtml(item) + '</span></li>'
    )).join('') +
    '</ul>';
}

function renderStagePage(stage, res) {
  const snapshot = stage.snapshot || {};
  const snapshotCards = [
    ['Typical cheque', snapshot.chequeRange],
    ['Company maturity', snapshot.maturity],
    ['Round purpose', snapshot.roundPurpose],
    ['Diligence', snapshot.diligence],
    ['Common capital', snapshot.capitalTypes]
  ].map(([label, value]) => (
    '<div class="stage-snap-card">' +
      '<div class="stage-snap-label">' + escapeHtml(label) + '</div>' +
      '<div class="stage-snap-value">' + escapeHtml(value || '—') + '</div>' +
    '</div>'
  )).join('');

  const investorCards = (stage.investors || []).slice(0, 24).map(inv => (
    '<a class="theme-inv-card" href="/investors/' + escapeHtml(inv.slug) + '">' +
      '<div class="theme-inv-type">' + escapeHtml(inv.type) + '</div>' +
      '<h3>' + escapeHtml(inv.name) + '</h3>' +
      '<p>' + escapeHtml(inv.thesis || inv.chequeSize || '') + '</p>' +
      '<div class="theme-inv-meta">' + escapeHtml(inv.chequeSize || (inv.stages || []).slice(0, 2).join(' · ')) + '</div>' +
    '</a>'
  )).join('');

  const relatedStageCards = (stage.relatedStages || []).map(s => (
    '<a class="stage-related-card" href="/investors/stages/' + escapeHtml(s.id) + '">' +
      '<div class="stage-related-order">Stage ' + s.order + '</div>' +
      '<h3>' + escapeHtml(s.label) + '</h3>' +
      '<p>' + escapeHtml(s.summary) + '</p>' +
      '<div class="stage-related-meta">' + s.investorCount + ' investors</div>' +
    '</a>'
  )).join('');

  const themeCards = (stage.relatedThemes || []).map(t => (
    '<a class="stage-theme-chip" href="/investors/themes/' + escapeHtml(t.id) + '">' +
      '<strong>' + escapeHtml(t.label) + '</strong>' +
      '<span>' + escapeHtml(t.summary) + '</span>' +
    '</a>'
  )).join('');

  const ladderHtml = getAllStages().map(s => (
    '<a class="stage-ladder-step' + (s.id === stage.id ? ' is-active' : '') + '" href="/investors/stages/' + escapeHtml(s.id) + '">' +
      '<span class="stage-ladder-num">' + s.order + '</span>' +
      '<span class="stage-ladder-label">' + escapeHtml(s.label) + '</span>' +
    '</a>'
  )).join('');

  const prevNext = [
    stage.prev
      ? '<a class="stage-pn-card" href="/investors/stages/' + escapeHtml(stage.prev.id) + '"><span>Previous</span><strong>' + escapeHtml(stage.prev.label) + '</strong></a>'
      : '<div class="stage-pn-card is-empty"></div>',
    stage.next
      ? '<a class="stage-pn-card" href="/investors/stages/' + escapeHtml(stage.next.id) + '"><span>Next</span><strong>' + escapeHtml(stage.next.label) + '</strong></a>'
      : '<div class="stage-pn-card is-empty"></div>'
  ].join('');

  const html = [
    '<!DOCTYPE html>',
    '<html lang="en" class="scrollable-page">',
    '<head>',
    '<script async src="https://www.googletagmanager.com/gtag/js?id=G-BJ23KLLWFM"></script>',
    '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js", new Date());gtag("config","G-BJ23KLLWFM");</script>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + escapeHtml(stage.label) + ' Funding Stage | Startup Investment Stages | VC Dekho</title>',
    '<meta name="description" content="' + escapeHtml(stage.summary).slice(0, 160) + '">',
    '<link rel="canonical" href="https://vcdekho.com/investors/stages/' + escapeHtml(stage.id) + '">',
    '<link rel="icon" type="image/png" href="/assets/logoforvc.png">',
    '<link rel="stylesheet" href="/style.css?v=10">',
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
    '<div class="inv-detail-wrap stage-page-wrap">',
    '<div class="inv-breadcrumbs"><a href="/">Home</a><span>›</span><a href="/investors">Investors</a><span>›</span><a href="/investors/stages">Stages</a><span>›</span><span class="current">' + escapeHtml(stage.label) + '</span></div>',

    '<section class="stage-hero" id="overview">',
    '<span class="inv-kicker">' + escapeHtml(stage.eyebrow) + ' · ' + stage.order + ' of 6</span>',
    '<h1 class="inv-detail-title">' + escapeHtml(stage.label) + '</h1>',
    '<p class="inv-detail-thesis">' + escapeHtml(stage.summary) + '</p>',
    '<div class="theme-hero-meta"><span>' + stage.investorCount + ' matching investors on VC Dekho</span><a href="/investors?stage=' + encodeURIComponent(stage.id) + '">View in directory →</a></div>',
    '<div class="stage-ladder" aria-label="Funding stage ladder">' + ladderHtml + '</div>',
    '</section>',

    '<nav class="stage-sticky-nav" aria-label="On this page">',
    '<a href="#meaning">Meaning</a>',
    '<a href="#snapshot">Snapshot</a>',
    '<a href="#fit">Who it fits</a>',
    '<a href="#look-for">Investors look for</a>',
    '<a href="#prepare">Prepare</a>',
    '<a href="#round">Round tips</a>',
    '<a href="#mistakes">Mistakes</a>',
    '<a href="#investors">Investors</a>',
    '</nav>',

    '<section class="inv-body-panel stage-section" id="meaning">',
    '<h2>What this stage means</h2>',
    paragraphs(stage.writeup),
    '</section>',

    '<section class="stage-section" id="snapshot">',
    '<div class="stage-section-head"><h2>Stage snapshot</h2><p>A quick read of how this stage usually shows up for Indian founders.</p></div>',
    '<div class="stage-snap-grid">' + snapshotCards + '</div>',
    '</section>',

    '<section class="stage-section stage-two-panels" id="fit">',
    '<div class="stage-panel">' +
      '<h2>Who it fits</h2>' +
      bullets(stage.whoItFits) +
    '</div>',
    '<div class="stage-panel stage-panel-muted">' +
      '<h2>Who should wait</h2>' +
      bullets(stage.whoDoesntFit) +
    '</div>',
    '</section>',

    '<section class="stage-section" id="look-for">',
    '<div class="stage-section-head"><h2>What investors look for</h2><p>Use this as a diligence checklist before you start outreach.</p></div>',
    '<div class="stage-widget">' + checklist(stage.whatInvestorsLookFor) + '</div>',
    '</section>',

    '<section class="stage-section" id="prepare">',
    '<div class="stage-section-head"><h2>What to prepare</h2><p>Practical pack for a credible process at this stage.</p></div>',
    '<div class="stage-widget">' + checklist(stage.whatToPrepare) + '</div>',
    '</section>',

    '<section class="stage-section" id="round">',
    '<div class="stage-section-head"><h2>Round construction tips</h2><p>Educational guidance for how rounds are often built in India — not legal advice.</p></div>',
    '<div class="stage-widget">' + bullets(stage.roundConstruction, 'stage-bullets stage-tips') + '</div>',
    '</section>',

    '<section class="stage-section" id="mistakes">',
    '<div class="stage-section-head"><h2>Common mistakes</h2></div>',
    '<div class="stage-mistakes">' +
      (stage.commonMistakes || []).map((m, i) => (
        '<div class="stage-mistake"><span class="stage-mistake-num">' + String(i + 1).padStart(2, '0') + '</span><p>' + escapeHtml(m) + '</p></div>'
      )).join('') +
    '</div>',
    '</section>',

    '<section class="stage-section" id="investors">',
    '<div class="theme-section-head"><h2>Investors active at this stage</h2><a href="/investors?stage=' + encodeURIComponent(stage.id) + '">See all filters</a></div>',
    '<div class="theme-inv-grid">' + (investorCards || '<p class="inv-empty">No investors tagged yet.</p>') + '</div>',
    stage.investorCount > 24
      ? ('<div class="theme-more"><a class="inv-btn inv-btn-primary" href="/investors?stage=' + encodeURIComponent(stage.id) + '">Browse all ' + stage.investorCount + ' investors</a></div>')
      : '',
    '</section>',

    relatedStageCards
      ? ('<section class="stage-section"><div class="stage-section-head"><h2>Related stages</h2></div><div class="stage-related-grid">' + relatedStageCards + '</div></section>')
      : '',

    themeCards
      ? ('<section class="stage-section"><div class="stage-section-head"><h2>Related thesis themes</h2><p>Pair stage fit with thesis fit before you shortlist.</p></div><div class="stage-theme-grid">' + themeCards + '</div></section>')
      : '',

    '<section class="stage-section"><div class="stage-pn-grid">' + prevNext + '</div></section>',

    '<section class="blog-cta-banner" style="margin: 2rem 0 1rem;">',
    '<img src="/assets/blog_vc_dekho_cta.png" alt="VC Dekho" class="blog-cta-bg">',
    '<div class="blog-cta-content">',
    '<h2 class="blog-cta-title">Raise at the right stage</h2>',
    '<p class="blog-cta-desc">VC Dekho helps founders shortlist investors by stage, sector, cheque size, and thesis.</p>',
    '<a href="/waitlist" class="blog-cta-btn">Join the Waitlist</a>',
    '</div></section>',

    '</div></main></div>',
    '<script src="/app.js"></script>',
    '</body></html>'
  ].join('\n');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(html);
}

module.exports = { renderStagePage, escapeHtml };
