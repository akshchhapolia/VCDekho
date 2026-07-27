const { getInvestorBySlug, filterInvestors, toCard } = require('../../utils/investors');
const { getThemePage, getAllThemes } = require('../../utils/thesis-themes');
const { getStagePage } = require('../../utils/investment-stages');
const { renderStagePage } = require('../../utils/render-stage-page');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function chip(label, variant, href) {
  const cls = variant ? ('inv-chip inv-chip-' + variant) : 'inv-chip';
  const inner = escapeHtml(label);
  if (href) {
    return '<a class="' + cls + '" href="' + escapeHtml(href) + '">' + inner + '</a>';
  }
  return '<span class="' + cls + '">' + inner + '</span>';
}

function chips(list, variant) {
  return (list || []).map(function (item) { return chip(item, variant); }).join('');
}

function thesisThemeChips(investor) {
  const labels = investor.thesisThemes || [];
  const ids = investor.thesisThemeIds || [];
  return labels.map(function (label, i) {
    const id = ids[i];
    const href = id && id !== 'general' ? '/investors/themes/' + id : '';
    return chip(label, 'thesis', href);
  }).join('');
}

function thesisWidget(investor) {
  const labels = investor.thesisThemes || [];
  const ids = investor.thesisThemeIds || [];
  if (!labels.length) return '';

  const MAX_VISIBLE = 4;
  const chipsHtml = labels.map(function (label, i) {
    const id = ids[i];
    const href = id && id !== 'general' ? '/investors/themes/' + id : '';
    const extraClass = i >= MAX_VISIBLE ? ' thesis-chip-extra' : '';
    const cls = 'inv-chip inv-chip-thesis thesis-widget-chip' + extraClass;
    const inner = escapeHtml(label);
    if (href) {
      return '<a class="' + cls + '" href="' + escapeHtml(href) + '">' + inner + '</a>';
    }
    return '<span class="' + cls + '">' + inner + '</span>';
  }).join('');

  const hiddenCount = Math.max(0, labels.length - MAX_VISIBLE);
  const toggleHtml = hiddenCount > 0
    ? (
      '<button type="button" class="thesis-widget-toggle" data-more="View ' + hiddenCount + ' more" data-less="Show less" aria-expanded="false">' +
        'View ' + hiddenCount + ' more' +
      '</button>'
    )
    : '';

  return (
    '<section class="thesis-widget' + (hiddenCount ? ' is-collapsed' : '') + '">' +
      '<div class="thesis-widget-head">' +
        '<div>' +
          '<p class="thesis-widget-kicker">Mapped themes</p>' +
          '<h2 class="thesis-widget-title">Investment thesis</h2>' +
        '</div>' +
        '<a class="thesis-widget-browse" href="/investors/themes">All themes →</a>' +
      '</div>' +
      '<div class="thesis-widget-chips">' + chipsHtml + '</div>' +
      toggleHtml +
    '</section>'
  );
}

function factRow(label, valueHtml) {
  if (!valueHtml) return '';
  return (
    '<div class="inv-fact-row">' +
      '<div class="inv-fact-label">' + escapeHtml(label) + '</div>' +
      '<div class="inv-fact-value">' + valueHtml + '</div>' +
    '</div>'
  );
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

function renderThemePage(theme, res) {
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
  return res.status(200).send(html);
}

module.exports = async function handler(req, res) {
  const { slug, view } = req.query || {};
  if (!slug) {
    return res.status(400).send('<h1>400 - Bad Request</h1>');
  }

  try {
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

    const metaDesc = investor.thesis ||
      (investor.name + ' — ' + investor.type + '. Stages: ' + (investor.stages || []).join(', ') + '. Explore on VC Dekho.');

    const websiteBtn = investor.website
      ? '<a class="inv-btn inv-btn-primary" href="' + escapeHtml(investor.website) + '" target="_blank" rel="noopener noreferrer">Visit Website</a>'
      : '';
    const linkedinBtn = investor.linkedin
      ? '<a class="inv-btn inv-btn-ghost" href="' + escapeHtml(investor.linkedin) + '" target="_blank" rel="noopener noreferrer">LinkedIn</a>'
      : '';

    const relatedHtml = related.map(function (r) {
      return (
        '<a class="inv-related-card" href="/investors/' + escapeHtml(r.slug) + '">' +
          '<div class="inv-related-type">' + escapeHtml(r.type) + '</div>' +
          '<h3>' + escapeHtml(r.name) + '</h3>' +
          '<p>' + escapeHtml(r.chequeSize || r.thesis || '') + '</p>' +
        '</a>'
      );
    }).join('');

    const writeupHtml = investor.writeup
      ? '<p class="inv-writeup">' + escapeHtml(investor.writeup) + '</p>'
      : '<p class="inv-writeup muted">Profile summary coming soon.</p>';

    const thesisHtml = investor.thesis
      ? '<p class="inv-detail-thesis">' + escapeHtml(investor.thesis) + '</p>'
      : '';
    const notesHtml = investor.notes
      ? '<div class="inv-notes"><h3>Notes</h3><p>' + escapeHtml(investor.notes) + '</p></div>'
      : '';
    const criteriaHtml = investor.criteria
      ? '<div class="inv-notes"><h3>Investment criteria</h3><p>' + escapeHtml(investor.criteria) + '</p></div>'
      : '';
    const relatedSection = relatedHtml
      ? '<section class="inv-related"><h2>Similar investors</h2><div class="inv-related-grid">' + relatedHtml + '</div></section>'
      : '';

    const connectHtml = (investor.linkedin || investor.website)
      ? '<span class="inv-connect-text">Website / LinkedIn</span>'
      : '<span class="inv-connect-text">Via VC Dekho waitlist</span>';

    const metricsHtml = investor.chequeSize
      ? (
        '<div class="inv-metrics">' +
          '<div class="inv-metric">' +
            '<span class="inv-metric-label">Ticket size</span>' +
            '<span class="inv-metric-value">' + escapeHtml(investor.chequeSize) + '</span>' +
          '</div>' +
        '</div>'
      )
      : '';

    const factsHtml =
      '<div class="inv-facts">' +
        factRow('Lead / invest stages', chips(investor.stages, 'stage')) +
        factRow('Sector focus', chips(investor.sectors, 'sector')) +
        factRow('Best way to connect', connectHtml) +
      '</div>';

    const thesisWidgetHtml = thesisWidget(investor);

    const schema = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: investor.name,
      url: investor.website || ('https://vcdekho.com/investors/' + investor.slug),
      description: investor.thesis || investor.writeup,
      sameAs: [investor.linkedin, investor.website].filter(Boolean)
    });

    const html = [
      '<!DOCTYPE html>',
      '<html lang="en" class="scrollable-page">',
      '<head>',
      '<script async src="https://www.googletagmanager.com/gtag/js?id=G-BJ23KLLWFM"></script>',
      '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js", new Date());gtag("config","G-BJ23KLLWFM");</script>',
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      '<title>' + escapeHtml(investor.name) + ' | Investors | VC Dekho</title>',
      '<meta name="description" content="' + escapeHtml(metaDesc).slice(0, 160) + '">',
      '<link rel="canonical" href="https://vcdekho.com/investors/' + escapeHtml(investor.slug) + '">',
      '<link rel="icon" type="image/png" href="/assets/logoforvc.png">',
      '<link rel="stylesheet" href="/style.css?v=9">',
      '<meta property="og:title" content="' + escapeHtml(investor.name) + ' | VC Dekho">',
      '<meta property="og:description" content="' + escapeHtml(metaDesc).slice(0, 160) + '">',
      '<meta property="og:url" content="https://vcdekho.com/investors/' + escapeHtml(investor.slug) + '">',
      '<meta property="og:type" content="profile">',
      '<script type="application/ld+json">' + schema + '</script>',
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
      '</nav>',
      '</header>',
      '<main class="hero-showcase inv-detail-main">',
      '<div class="ambient-bg-wrapper"><div class="waitlist-bg"><div class="glow-orb orb-1"></div><div class="glow-orb orb-2"></div><div class="glow-orb orb-3"></div></div></div>',
      '<div class="inv-detail-wrap">',
      '<div class="inv-breadcrumbs"><a href="/">Home</a><span>›</span><a href="/investors">Investors</a><span>›</span><span class="current">' + escapeHtml(investor.name) + '</span></div>',
      '<section class="inv-hero-panel">' +
      '<div class="inv-hero-top">' +
      '<span class="inv-type-badge">' + escapeHtml(investor.type) + '</span>' +
      '<h1 class="inv-detail-title">' + escapeHtml(investor.name) + '</h1>' +
      thesisHtml +
      '<div class="inv-hero-actions">' + websiteBtn + linkedinBtn + '<a class="inv-btn inv-btn-ghost" href="/waitlist">Join Waitlist</a></div>' +
      '</div>' +
      metricsHtml +
      factsHtml +
      '</section>',
      thesisWidgetHtml,
      '<section class="inv-body-panel">',
      '<h2>About ' + escapeHtml(investor.name) + '</h2>',
      writeupHtml,
      notesHtml,
      criteriaHtml,
      '<p class="inv-confidence">Data confidence: ' + escapeHtml(investor.confidence || 'Unverified – inferred') + '</p>',
      '</section>',
      relatedSection,
      '<section class="blog-cta-banner" style="margin: 3rem 0 1rem;">',
      '<img src="/assets/blog_vc_dekho_cta.png" alt="VC Dekho" class="blog-cta-bg">',
      '<div class="blog-cta-content">',
      '<h2 class="blog-cta-title">Stop guessing. Start matching.</h2>',
      '<p class="blog-cta-desc">Search investors by stage, sector, cheque size, and thesis — then unlock deeper matching on VC Dekho.</p>',
      '<a href="/waitlist" class="blog-cta-btn">Join the Waitlist</a>',
      '</div></section>',
      '</div></main></div>',
      '<script src="/app.js"></script>',
      '<script>',
      '(function(){',
      'var root=document.querySelector(".thesis-widget");',
      'if(!root) return;',
      'var btn=root.querySelector(".thesis-widget-toggle");',
      'if(!btn) return;',
      'btn.addEventListener("click",function(){',
      'var open=root.classList.toggle("is-expanded");',
      'root.classList.toggle("is-collapsed",!open);',
      'btn.setAttribute("aria-expanded", open ? "true" : "false");',
      'btn.textContent=open ? btn.getAttribute("data-less") : btn.getAttribute("data-more");',
      '});',
      '})();',
      '</script>',
      '</body></html>'
    ].join('\n');

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
    res.status(200).send(html);
  } catch (error) {
    console.error('investor detail error:', error);
    res.status(500).send('<h1>500 - Internal Server Error</h1>');
  }
};
