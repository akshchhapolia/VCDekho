/**
 * Editorial investor profile page renderer.
 */
const { hasStageGuide, deriveRelatedStages, loadInvestorsData } = require('./investors');
const { getAllStages } = require('./investment-stages');
const { hasSectorGuide } = require('./sectors');
const { renderExploreRelated } = require('./render-explore-related');
const { getThesisThemeIconSvg } = require('./thesis-theme-icons');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function directoryWidget() {
  const data = loadInvestorsData();
  const filters = data.filters || {};
  const investorCount = data.count || (data.investors || []).length || 0;
  const stageCount = (filters.stages || []).length;
  const sectorCount = (filters.sectors || []).length;
  const themeCount = (filters.thesisThemes || []).length;
  const countLabel = investorCount >= 100 ? String(Math.floor(investorCount / 10) * 10) + '+' : String(investorCount);

  return (
    '<aside class="inv-profile-dir-widget" aria-label="Investor directory">' +
      '<div class="inv-profile-dir-visual" aria-hidden="true">' +
        '<svg class="inv-profile-dir-svg" viewBox="0 0 220 132" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<rect x="8" y="8" width="204" height="36" rx="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.16)"/>' +
          '<rect x="18" y="16" width="20" height="20" rx="6" fill="rgba(255,255,255,0.9)" stroke="rgba(237,87,47,0.55)"/>' +
          '<text x="28" y="30" text-anchor="middle" fill="#ED572F" font-size="9" font-weight="700" font-family="system-ui,sans-serif">VC</text>' +
          '<rect x="46" y="17" width="78" height="7" rx="3.5" fill="rgba(255,255,255,0.55)"/>' +
          '<rect x="46" y="28" width="34" height="8" rx="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)"/>' +
          '<rect x="84" y="28" width="40" height="8" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>' +
          '<path d="M186 20l6 6-6 6" stroke="rgba(255,255,255,0.35)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +

          '<rect x="8" y="50" width="204" height="36" rx="12" fill="rgba(255,255,255,0.035)" stroke="rgba(255,255,255,0.12)"/>' +
          '<rect x="18" y="58" width="20" height="20" rx="6" fill="rgba(255,255,255,0.88)"/>' +
          '<text x="28" y="72" text-anchor="middle" fill="#334" font-size="8" font-weight="700" font-family="system-ui,sans-serif">A</text>' +
          '<rect x="46" y="59" width="70" height="7" rx="3.5" fill="rgba(255,255,255,0.45)"/>' +
          '<rect x="46" y="70" width="38" height="8" rx="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.16)"/>' +
          '<rect x="88" y="70" width="44" height="8" rx="4" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>' +

          '<rect x="8" y="92" width="204" height="32" rx="12" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.1)"/>' +
          '<rect x="18" y="98" width="20" height="20" rx="6" fill="rgba(255,255,255,0.8)"/>' +
          '<text x="28" y="112" text-anchor="middle" fill="#445" font-size="8" font-weight="700" font-family="system-ui,sans-serif">P</text>' +
          '<rect x="46" y="100" width="64" height="7" rx="3.5" fill="rgba(255,255,255,0.32)"/>' +
          '<rect x="46" y="111" width="48" height="7" rx="3.5" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)"/>' +
        '</svg>' +
      '</div>' +
      '<div class="inv-profile-dir-stats">' +
        '<div class="inv-profile-dir-stat"><strong>' + escapeHtml(countLabel) + '</strong><span>Investors</span></div>' +
        '<div class="inv-profile-dir-stat"><strong>' + stageCount + '</strong><span>Stages</span></div>' +
        '<div class="inv-profile-dir-stat"><strong>' + sectorCount + '</strong><span>Sectors</span></div>' +
        '<div class="inv-profile-dir-stat"><strong>' + themeCount + '</strong><span>Themes</span></div>' +
      '</div>' +
      '<div class="inv-profile-dir-copy">' +
        '<h2 class="inv-profile-dir-title">Find more investors like this</h2>' +
        '<p class="inv-profile-dir-desc">Filter by stage, sector, cheque size, and thesis.</p>' +
        '<a class="inv-profile-cta is-ghost" href="/investors">Investor Directory</a>' +
      '</div>' +
    '</aside>'
  );
}

function pullQuote(text) {
  const first = String(text || '')
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)[0] || '';
  const sentences = first.match(/[^.!?]+[.!?]+/g) || [first];
  const pick = (sentences[1] || sentences[0] || '').trim();
  if (!pick) return '';
  return (
    '<blockquote class="inv-profile-pullquote">' +
      '<p>' + escapeHtml(pick) + '</p>' +
    '</blockquote>'
  );
}

function aboutProse(text) {
  const parts = String(text || '')
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean);
  if (!parts.length) {
    return '<p class="inv-profile-prose muted">Profile summary coming soon.</p>';
  }
  return parts.map(p => '<p class="inv-profile-prose">' + escapeHtml(p) + '</p>').join('');
}

function thesisWidget(investor) {
  const labels = investor.thesisThemes || [];
  const ids = investor.thesisThemeIds || [];
  if (!labels.length) return '';

  const chipsHtml = labels.map(function (label, i) {
    const id = ids[i];
    const href = id && id !== 'general' ? '/investors/themes/' + id : '';
    const cls = 'inv-profile-chip inv-profile-chip-thesis';
    const icon = getThesisThemeIconSvg(id || '', 'inv-profile-chip-icon');
    const inner = icon + '<span>' + escapeHtml(label) + '</span>';
    if (href) return '<a class="' + cls + '" href="' + escapeHtml(href) + '">' + inner + '</a>';
    return '<span class="' + cls + '">' + inner + '</span>';
  }).join('');

  return (
    '<section class="inv-profile-section inv-profile-thesis inv-profile-reveal" id="thesis">' +
      '<div class="inv-profile-section-label">03 — Thesis</div>' +
      '<div class="inv-profile-section-head inv-profile-section-head-row">' +
        '<div>' +
          '<h2>Investment thesis</h2>' +
          '<p>Themes this investor is mapped to across the VC Dekho directory.</p>' +
        '</div>' +
        '<a class="inv-profile-browse" href="/investors/themes">All themes →</a>' +
      '</div>' +
      '<div class="inv-profile-thesis-chips">' + chipsHtml + '</div>' +
    '</section>'
  );
}

function renderInvestorPage(investor, related, res) {
  const metaDesc = investor.thesis ||
    (investor.name + ' — ' + investor.type + '. Stages: ' + (investor.stages || []).join(', ') + '. Explore on VC Dekho.');

  const iconExternal =
    '<svg class="inv-profile-cta-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M14 4h6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M10 14L20 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';
  const iconLinkedin =
    '<svg class="inv-profile-cta-icon" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.05c.53-1 1.82-2.05 3.75-2.05 4.01 0 4.75 2.64 4.75 6.07V23h-4v-6.6c0-1.57-.03-3.59-2.19-3.59-2.19 0-2.53 1.71-2.53 3.48V23h-4V8.5z"/>' +
    '</svg>';

  const websiteBtn = investor.website
    ? '<a class="inv-profile-cta is-primary" href="' + escapeHtml(investor.website) + '" target="_blank" rel="noopener noreferrer">' + iconExternal + '<span>Visit website</span></a>'
    : '';
  const linkedinBtn = investor.linkedin
    ? '<a class="inv-profile-cta is-ghost" href="' + escapeHtml(investor.linkedin) + '" target="_blank" rel="noopener noreferrer">' + iconLinkedin + '<span>LinkedIn</span></a>'
    : '';

  const stages = investor.stages || [];
  const stageIds = investor.stageIds || [];
  const sectors = investor.sectors || [];
  const sectorIds = investor.sectorIds || [];
  const themes = investor.thesisThemes || [];

  const stageSummary = stages.length
    ? (stages.slice(0, 2).join(' · ') + (stages.length > 2 ? ' +' + (stages.length - 2) : ''))
    : '—';
  const confidenceShort = (investor.confidence || 'Unverified')
    .replace(/\s*\([^)]*\)\s*/g, '')
    .trim() || 'Unverified';

  const snapshotStrip = [
    {
      label: 'Ticket size',
      value: investor.chequeSize || 'Not listed',
      href: null,
      lead: true
    },
    {
      label: 'Stages',
      value: stages.length ? stageSummary : '—',
      href: stages.length ? '#focus' : null
    },
    {
      label: 'Sectors',
      value: sectors.length ? String(sectors.length) + ' focus areas' : '—',
      href: sectors.length ? '#focus' : null
    },
    {
      label: 'Themes',
      value: themes.length ? String(themes.length) + ' mapped' : '—',
      href: themes.length ? '#thesis' : null
    },
    {
      label: 'Confidence',
      value: confidenceShort,
      href: null
    }
  ].map((item) => {
    const inner =
      '<div class="inv-profile-metric-label">' + escapeHtml(item.label) + '</div>' +
      '<div class="inv-profile-metric-value">' + escapeHtml(item.value) + '</div>';
    const cls = 'inv-profile-metric' + (item.lead ? ' is-lead' : '');
    if (item.href) {
      return '<a class="' + cls + '" href="' + escapeHtml(item.href) + '">' + inner + '</a>';
    }
    return '<div class="' + cls + '">' + inner + '</div>';
  }).join('');

  const stageChips = stages.map((label, i) => {
    const id = stageIds[i];
    if (hasStageGuide(id)) {
      return '<a class="inv-profile-chip inv-profile-chip-stage" href="/investors/stages/' + escapeHtml(id) + '">' + escapeHtml(label) + '</a>';
    }
    return '<span class="inv-profile-chip inv-profile-chip-stage">' + escapeHtml(label) + '</span>';
  }).join('') || '<span class="inv-profile-empty">No stages listed</span>';

  const sectorChips = sectors.map((label, i) => {
    const id = sectorIds[i];
    const href = hasSectorGuide(id)
      ? '/investors/sectors/' + encodeURIComponent(id)
      : id
        ? '/investors?sector=' + encodeURIComponent(id)
        : '';
    if (href) {
      return '<a class="inv-profile-chip inv-profile-chip-sector" href="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a>';
    }
    return '<span class="inv-profile-chip inv-profile-chip-sector">' + escapeHtml(label) + '</span>';
  }).join('') || '<span class="inv-profile-empty">No sectors listed</span>';

  const thesisLead = investor.thesis
    ? '<p class="inv-profile-hero-lead">' + escapeHtml(investor.thesis) + '</p>'
    : '';

  const heroMeta = (
    '<div class="inv-profile-hero-meta">' +
      '<div class="inv-profile-hero-meta-item">' +
        '<span class="inv-profile-hero-meta-label">Ticket size</span>' +
        '<strong class="inv-profile-hero-meta-value">' + escapeHtml(investor.chequeSize || 'Not listed') + '</strong>' +
      '</div>' +
      '<div class="inv-profile-hero-meta-item">' +
        '<span class="inv-profile-hero-meta-label">Stages</span>' +
        '<strong class="inv-profile-hero-meta-value">' + escapeHtml(stageSummary) + '</strong>' +
      '</div>' +
      '<div class="inv-profile-hero-meta-item">' +
        '<span class="inv-profile-hero-meta-label">Sectors</span>' +
        '<strong class="inv-profile-hero-meta-value">' +
          escapeHtml(sectors.length ? String(sectors.length) + ' focus areas' : '—') +
        '</strong>' +
      '</div>' +
    '</div>'
  );

  const notesHtml = investor.notes
    ? (
      '<div class="inv-profile-callout inv-profile-reveal">' +
        '<h3>Notes</h3>' +
        '<p>' + escapeHtml(investor.notes) + '</p>' +
      '</div>'
    )
    : '';

  const criteriaHtml = investor.criteria
    ? (
      '<div class="inv-profile-callout inv-profile-reveal">' +
        '<h3>Investment criteria</h3>' +
        '<p>' + escapeHtml(investor.criteria) + '</p>' +
      '</div>'
    )
    : '';

  const relatedCards = (related || []).map(r => (
    '<a class="inv-profile-related-card inv-profile-reveal" href="/investors/' + escapeHtml(r.slug) + '">' +
      '<div class="inv-profile-related-type">' + escapeHtml(r.type) + '</div>' +
      '<h3>' + escapeHtml(r.name) + '</h3>' +
      '<p>' + escapeHtml(r.chequeSize || r.thesis || '') + '</p>' +
    '</a>'
  )).join('');

  const relatedSection = relatedCards
    ? (
      '<section class="inv-profile-section inv-profile-reveal" id="similar">' +
        '<div class="inv-profile-section-label">05 — Nearby</div>' +
        '<div class="inv-profile-section-head"><h2>Similar investors</h2><p>Other funds that overlap on stage, sector, or thesis.</p></div>' +
        '<div class="inv-profile-related-grid">' + relatedCards + '</div>' +
      '</section>'
    )
    : '';

  const themeIds = investor.thesisThemeIds || [];
  const exploreThemes = (investor.thesisThemes || [])
    .map((label, i) => ({ id: themeIds[i], label }))
    .filter(t => t.id && t.id !== 'general')
    .slice(0, 6);
  const exploreStages = deriveRelatedStages([investor], 6);
  // Prefer this fund's stages in guide order when available
  const orderedStages = getAllStages()
    .filter(s => (investor.stageIds || []).includes(s.id))
    .map(s => ({ id: s.id, label: s.label }));
  const stagesForExplore = orderedStages.length ? orderedStages : exploreStages;

  const exploreHtml = renderExploreRelated({
    sectionLabel: '06 — Explore',
    title: 'Explore related',
    subtitle: 'Jump into stage, sector, and thesis guides connected to this fund.',
    stages: stagesForExplore,
    themes: exploreThemes,
    fundsHref: '/investors',
    fundsLabel: 'Back to directory →',
    siblingHref: '/investors/sectors',
    siblingLabel: 'Sector guides →',
    className: 'inv-profile-reveal'
  });

  const stickyNav = [
    '<nav class="inv-profile-sticky" id="inv-profile-sticky" aria-label="On this page">',
    '<a href="#snapshot" data-section="snapshot">Snapshot</a>',
    '<a href="#focus" data-section="focus">Focus</a>',
    themes.length ? '<a href="#thesis" data-section="thesis">Thesis</a>' : '',
    '<a href="#about" data-section="about">About</a>',
    relatedCards ? '<a href="#similar" data-section="similar">Similar</a>' : '',
    '<a href="#explore" data-section="explore">Explore</a>',
    '</nav>'
  ].join('');

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: investor.name,
    url: investor.website || ('https://vcdekho.com/investors/' + investor.slug),
    description: investor.thesis || investor.writeup,
    sameAs: [investor.linkedin, investor.website].filter(Boolean)
  });

  const quote = pullQuote(investor.writeup || investor.thesis);

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
    '<meta name="robots" content="index, follow">',
    '<link rel="stylesheet" href="/style.css?v=49">',
    '<meta property="og:title" content="' + escapeHtml(investor.name) + ' | VC Dekho">',
    '<meta property="og:description" content="' + escapeHtml(metaDesc).slice(0, 160) + '">',
    '<meta property="og:url" content="https://vcdekho.com/investors/' + escapeHtml(investor.slug) + '">',
    '<meta property="og:type" content="profile">',
    '<script type="application/ld+json">' + schema + '</script>',
    '</head>',
    '<body class="scrollable-page inv-page inv-profile-page">',
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
    '<div class="inv-detail-wrap inv-profile-wrap">',
    '<div class="inv-breadcrumbs"><a href="/">Home</a><span>›</span><a href="/investors">Investors</a><span>›</span><span class="current">' + escapeHtml(investor.name) + '</span></div>',

    '<div class="inv-profile-hero-row inv-profile-hero-enter" id="overview">',
    '<section class="inv-profile-hero">',
    '<div class="inv-profile-hero-wash" aria-hidden="true"></div>',
    '<div class="inv-profile-hero-inner">',
    '<div class="inv-profile-hero-copy">',
    investor.logo
      ? ('<img class="inv-profile-logo" src="' + escapeHtml(investor.logo) + '" alt="" width="56" height="56" loading="eager">')
      : '',
    '<span class="inv-profile-type">' + escapeHtml(investor.type) + '</span>',
    '<h1 class="inv-profile-title">' + escapeHtml(investor.name) + '</h1>',
    thesisLead,
    '<div class="inv-profile-hero-actions">' + websiteBtn + linkedinBtn + '</div>',
    '</div>',
    heroMeta,
    '</div>',
    '</section>',
    directoryWidget(),
    '</div>',

    stickyNav,

    '<section class="inv-profile-section inv-profile-reveal is-visible" id="snapshot">',
    '<div class="inv-profile-section-label">01 — Snapshot</div>',
    '<div class="inv-profile-section-head"><h2>At a glance</h2><p>Key signals founders use to decide if this investor is worth a conversation.</p></div>',
    '<div class="inv-profile-metric-strip">' + snapshotStrip + '</div>',
    '</section>',

    '<section class="inv-profile-section inv-profile-reveal" id="focus">',
    '<div class="inv-profile-section-label">02 — Focus</div>',
    '<div class="inv-profile-section-head"><h2>Where they invest</h2><p>Stages and sectors this investor typically backs.</p></div>',
    '<div class="inv-profile-focus-panel">',
    '<div class="inv-profile-focus-grid">',
    '<div class="inv-profile-focus-col">',
    '<h3>Sector focus</h3>',
    '<div class="inv-profile-chip-row">' + sectorChips + '</div>',
    '<a class="inv-profile-panel-link" href="/investors/sectors">Sector guides →</a>',
    '</div>',
    '<div class="inv-profile-focus-col">',
    '<h3>Lead / invest stages</h3>',
    '<div class="inv-profile-chip-row">' + stageChips + '</div>',
    '<a class="inv-profile-panel-link" href="/investors/stages">Stage guides →</a>',
    '</div>',
    '</div>',
    '</div>',
    '</section>',

    thesisWidget(investor),

    '<section class="inv-profile-section inv-profile-about inv-profile-reveal" id="about">',
    '<div class="inv-profile-section-label">04 — Story</div>',
    '<div class="inv-profile-section-head"><h2>About ' + escapeHtml(investor.name) + '</h2><p>Background and context for founders evaluating this investor.</p></div>',
    '<div class="inv-profile-about-grid">',
    '<div class="inv-profile-about-prose">' + aboutProse(investor.writeup) + '</div>',
    quote,
    '</div>',
    notesHtml,
    criteriaHtml,
    '<p class="inv-profile-confidence">Data confidence: ' + escapeHtml(investor.confidence || 'Unverified – inferred') + '</p>',
    '</section>',

    relatedSection,

    exploreHtml,

    '<section class="blog-cta-banner" style="margin: 3rem 0 1rem;">',
    '<img src="/assets/blog_vc_dekho_cta.png" alt="VC Dekho" class="blog-cta-bg">',
    '<div class="blog-cta-content">',
    '<h2 class="blog-cta-title">Stop guessing. Start matching.</h2>',
    '<p class="blog-cta-desc">Search investors by stage, sector, cheque size, and thesis — then unlock deeper matching on VC Dekho.</p>',
    '<a href="/investors" class="blog-cta-btn">Browse investors</a>',
    '</div></section>',

    '</div></main></div>',
    '<script src="/js/auth.js"></script>',
    '<script src="/app.js"></script>',
    '<script>',
    '(function(){',
    'var nav=document.getElementById("inv-profile-sticky");',
    'var links=nav?Array.prototype.slice.call(nav.querySelectorAll("a[data-section]")):[];',
    'var sections=links.map(function(a){return document.getElementById(a.getAttribute("data-section"));}).filter(Boolean);',
    'function setActive(id){if(!id)return;links.forEach(function(a){a.classList.toggle("is-active",a.getAttribute("data-section")===id);});}',
    'function syncActiveFromScroll(){',
    'if(!sections.length)return;',
    'var offset=(nav?nav.getBoundingClientRect().bottom:0)+12;',
    'var active=sections[0].id;',
    'for(var i=0;i<sections.length;i++){',
    'var top=sections[i].getBoundingClientRect().top;',
    'if(top-offset<=1)active=sections[i].id;',
    '}',
    'setActive(active);',
    '}',
    'links.forEach(function(a){',
    'a.addEventListener("click",function(){setActive(a.getAttribute("data-section"));});',
    '});',
    'window.addEventListener("scroll",syncActiveFromScroll,{passive:true});',
    'window.addEventListener("hashchange",function(){',
    'var id=(location.hash||"").replace(/^#/,"");',
    'if(id)setActive(id);',
    '});',
    'if(location.hash){setActive(location.hash.replace(/^#/,""));}',
    'else{syncActiveFromScroll();}',
    'requestAnimationFrame(syncActiveFromScroll);',
    'var reveals=document.querySelectorAll(".inv-profile-reveal:not(.is-visible)");',
    'if("IntersectionObserver" in window){',
    'var ro=new IntersectionObserver(function(entries){',
    'entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add("is-visible");ro.unobserve(e.target);}});',
    '},{threshold:0.08,rootMargin:"0px 0px -40px 0px"});',
    'reveals.forEach(function(el){ro.observe(el);});',
    '}else{reveals.forEach(function(el){el.classList.add("is-visible");});}',
    'requestAnimationFrame(function(){document.body.classList.add("inv-profile-ready");});',
    '})();',
    '</script>',
    '</body></html>'
  ].join('\n');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(html);
}

module.exports = { renderInvestorPage, escapeHtml };
