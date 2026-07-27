const { getInvestorBySlug, filterInvestors, toCard } = require('../../utils/investors');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function chip(label, variant) {
  const cls = variant ? ('inv-chip inv-chip-' + variant) : 'inv-chip';
  return '<span class="' + cls + '">' + escapeHtml(label) + '</span>';
}

function chips(list, variant) {
  return (list || []).map(function (item) { return chip(item, variant); }).join('');
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

module.exports = async function handler(req, res) {
  const { slug } = req.query || {};
  if (!slug) {
    return res.status(400).send('<h1>400 - Bad Request</h1>');
  }

  try {
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
        factRow('Investment thesis', chips(investor.thesisThemes, 'thesis')) +
        factRow('Best way to connect', connectHtml) +
      '</div>';

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
      '<link rel="stylesheet" href="/style.css?v=7">',
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
