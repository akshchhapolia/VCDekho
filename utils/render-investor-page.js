/**
 * Editorial investor profile page renderer.
 */
const { hasStageGuide, deriveRelatedStages } = require('./investors');
const { getAllStages } = require('./investment-stages');
const { renderExploreRelated } = require('./render-explore-related');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  const MAX_VISIBLE = 4;
  const chipsHtml = labels.map(function (label, i) {
    const id = ids[i];
    const href = id && id !== 'general' ? '/investors/themes/' + id : '';
    const extraClass = i >= MAX_VISIBLE ? ' thesis-chip-extra' : '';
    const cls = 'inv-profile-chip inv-profile-chip-thesis' + extraClass;
    const inner = escapeHtml(label);
    if (href) return '<a class="' + cls + '" href="' + escapeHtml(href) + '">' + inner + '</a>';
    return '<span class="' + cls + '">' + inner + '</span>';
  }).join('');

  const hiddenCount = Math.max(0, labels.length - MAX_VISIBLE);
  const toggleHtml = hiddenCount > 0
    ? (
      '<button type="button" class="inv-profile-thesis-toggle" data-more="View ' + hiddenCount + ' more" data-less="Show less" aria-expanded="false">' +
        'View ' + hiddenCount + ' more' +
      '</button>'
    )
    : '';

  return (
    '<section class="inv-profile-section inv-profile-thesis' + (hiddenCount ? ' is-collapsed' : '') + ' inv-profile-reveal" id="thesis">' +
      '<div class="inv-profile-section-label">03 — Thesis</div>' +
      '<div class="inv-profile-thesis-head">' +
        '<div>' +
          '<p class="inv-profile-kicker">Mapped themes</p>' +
          '<h2>Investment thesis</h2>' +
        '</div>' +
        '<a class="inv-profile-browse" href="/investors/themes">All themes →</a>' +
      '</div>' +
      '<div class="inv-profile-thesis-chips">' + chipsHtml + '</div>' +
      toggleHtml +
    '</section>'
  );
}

function renderInvestorPage(investor, related, res) {
  const metaDesc = investor.thesis ||
    (investor.name + ' — ' + investor.type + '. Stages: ' + (investor.stages || []).join(', ') + '. Explore on VC Dekho.');

  const websiteBtn = investor.website
    ? '<a class="inv-profile-cta is-primary" href="' + escapeHtml(investor.website) + '" target="_blank" rel="noopener noreferrer">Visit website</a>'
    : '';
  const linkedinBtn = investor.linkedin
    ? '<a class="inv-profile-cta is-ghost" href="' + escapeHtml(investor.linkedin) + '" target="_blank" rel="noopener noreferrer">LinkedIn</a>'
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
      value: stages.length ? (stages.length + ' · ' + stageSummary) : '—',
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
    const href = id ? '/investors?sector=' + encodeURIComponent(id) : '';
    if (href) {
      return '<a class="inv-profile-chip inv-profile-chip-sector" href="' + escapeHtml(href) + '">' + escapeHtml(label) + '</a>';
    }
    return '<span class="inv-profile-chip inv-profile-chip-sector">' + escapeHtml(label) + '</span>';
  }).join('') || '<span class="inv-profile-empty">No sectors listed</span>';

  const thesisLead = investor.thesis
    ? '<p class="inv-profile-hero-lead">' + escapeHtml(investor.thesis) + '</p>'
    : '';

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
        '<div class="inv-profile-section-head"><h2>Similar investors</h2></div>' +
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
    title: 'Explore related',
    subtitle: 'Jump into stage and thesis guides connected to this fund.',
    stages: stagesForExplore,
    themes: exploreThemes,
    fundsHref: '/investors',
    fundsLabel: 'Back to directory →',
    siblingHref: '/investors/themes',
    siblingLabel: 'All thesis guides →',
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
    '<link rel="stylesheet" href="/style.css?v=35">',
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
    '<a href="/login" class="nav-link">Log in</a>',
    '</nav></header>',
    '<main class="hero-showcase inv-detail-main">',
    '<div class="ambient-bg-wrapper"><div class="waitlist-bg"><div class="glow-orb orb-1"></div><div class="glow-orb orb-2"></div><div class="glow-orb orb-3"></div></div></div>',
    '<div class="inv-detail-wrap inv-profile-wrap">',
    '<div class="inv-breadcrumbs"><a href="/">Home</a><span>›</span><a href="/investors">Investors</a><span>›</span><span class="current">' + escapeHtml(investor.name) + '</span></div>',

    '<section class="inv-profile-hero inv-profile-hero-enter" id="overview">',
    '<div class="inv-profile-hero-wash" aria-hidden="true"></div>',
    '<div class="inv-profile-hero-copy">',
    investor.logo
      ? ('<img class="inv-profile-logo" src="' + escapeHtml(investor.logo) + '" alt="" width="56" height="56" loading="eager">')
      : '',
    '<span class="inv-profile-type">' + escapeHtml(investor.type) + '</span>',
    '<h1 class="inv-profile-title">' + escapeHtml(investor.name) + '</h1>',
    thesisLead,
    '<div class="inv-profile-hero-actions">' + websiteBtn + linkedinBtn + '<a class="inv-profile-cta is-ghost" href="/investors">Browse directory</a></div>',
    '</div>',
    '</section>',

    stickyNav,

    '<section class="inv-profile-section inv-profile-reveal" id="snapshot">',
    '<div class="inv-profile-section-label">01 — Snapshot</div>',
    '<div class="inv-profile-section-head"><h2>At a glance</h2><p>Key signals founders use to decide if this investor is worth a conversation.</p></div>',
    '<div class="inv-profile-metric-strip">' + snapshotStrip + '</div>',
    '</section>',

    '<section class="inv-profile-section inv-profile-reveal" id="focus">',
    '<div class="inv-profile-section-label">02 — Focus</div>',
    '<div class="inv-profile-focus-grid">',
    '<div class="inv-profile-focus-panel is-stages">',
    '<h2>Lead / invest stages</h2>',
    '<div class="inv-profile-chip-row">' + stageChips + '</div>',
    '<a class="inv-profile-panel-link" href="/investors/stages">Stage guides →</a>',
    '</div>',
    '<div class="inv-profile-focus-panel is-sectors">',
    '<h2>Sector focus</h2>',
    '<div class="inv-profile-chip-row">' + sectorChips + '</div>',
    '<a class="inv-profile-panel-link" href="/investors">Browse by sector →</a>',
    '</div>',
    '</div>',
    '</section>',

    thesisWidget(investor),

    '<section class="inv-profile-section inv-profile-about inv-profile-reveal" id="about">',
    '<div class="inv-profile-section-label">04 — Story</div>',
    '<div class="inv-profile-section-head"><h2>About ' + escapeHtml(investor.name) + '</h2></div>',
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
    'var thesis=document.querySelector(".inv-profile-thesis");',
    'if(thesis){',
    'var btn=thesis.querySelector(".inv-profile-thesis-toggle");',
    'if(btn){btn.addEventListener("click",function(){',
    'var open=thesis.classList.toggle("is-expanded");',
    'thesis.classList.toggle("is-collapsed",!open);',
    'btn.setAttribute("aria-expanded", open?"true":"false");',
    'btn.textContent=open?btn.getAttribute("data-less"):btn.getAttribute("data-more");',
    '});}}',
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
    'var reveals=document.querySelectorAll(".inv-profile-reveal");',
    'if("IntersectionObserver" in window){',
    'var ro=new IntersectionObserver(function(entries){',
    'entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add("is-visible");ro.unobserve(e.target);}});',
    '},{threshold:0.12,rootMargin:"0px 0px -8% 0px"});',
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
