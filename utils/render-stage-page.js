const { getAllStages } = require('./investment-stages');
const { renderExploreRelated } = require('./render-explore-related');

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

function pullQuoteFromWriteup(text) {
  const first = String(text || '')
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(Boolean)[0] || '';
  // Prefer a mid/late sentence for punch; fall back to first sentence.
  const sentences = first.match(/[^.!?]+[.!?]+/g) || [first];
  const pick = (sentences[1] || sentences[0] || '').trim();
  if (!pick) return '';
  return (
    '<blockquote class="stage-pullquote">' +
      '<p>' + escapeHtml(pick) + '</p>' +
    '</blockquote>'
  );
}

function numberedList(items, className) {
  return (
    '<ol class="' + (className || 'stage-numbered') + '">' +
    (items || []).map((item, i) => (
      '<li class="stage-reveal">' +
        '<span class="stage-num" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="stage-num-text">' + escapeHtml(item) + '</span>' +
      '</li>'
    )).join('') +
    '</ol>'
  );
}

function tipList(items) {
  return (
    '<ul class="stage-tip-list">' +
    (items || []).map(item => (
      '<li class="stage-reveal">' +
        '<span class="stage-tip-mark" aria-hidden="true">→</span>' +
        '<span>' + escapeHtml(item) + '</span>' +
      '</li>'
    )).join('') +
    '</ul>'
  );
}

function renderStagePage(stage, res) {
  const snapshot = stage.snapshot || {};
  const orderLabel = String(stage.order).padStart(2, '0');
  const allStages = getAllStages();

  const snapshotStrip = [
    ['Typical cheque', snapshot.chequeRange],
    ['Company maturity', snapshot.maturity],
    ['Round purpose', snapshot.roundPurpose],
    ['Diligence', snapshot.diligence],
    ['Common capital', snapshot.capitalTypes]
  ].map(([label, value], i) => (
    '<div class="stage-metric' + (i === 0 ? ' is-lead' : '') + '">' +
      '<div class="stage-metric-label">' + escapeHtml(label) + '</div>' +
      '<div class="stage-metric-value">' + escapeHtml(value || '—') + '</div>' +
    '</div>'
  )).join('');

  const investorCards = (stage.investors || []).slice(0, 24).map(inv => (
    '<a class="stage-inv-card stage-reveal" href="/investors/' + escapeHtml(inv.slug) + '">' +
      '<div class="stage-inv-type">' + escapeHtml(inv.type) + '</div>' +
      '<h3>' + escapeHtml(inv.name) + '</h3>' +
      '<p>' + escapeHtml(inv.thesis || inv.chequeSize || '') + '</p>' +
      '<div class="stage-inv-meta">' + escapeHtml(inv.chequeSize || (inv.stages || []).slice(0, 2).join(' · ')) + '</div>' +
    '</a>'
  )).join('');

  const relatedStageCards = (stage.relatedStages || []).map(s => (
    '<a class="stage-related-card stage-reveal" href="/investors/stages/' + escapeHtml(s.id) + '">' +
      '<div class="stage-related-order">Stage ' + String(s.order).padStart(2, '0') + '</div>' +
      '<h3>' + escapeHtml(s.label) + '</h3>' +
      '<p>' + escapeHtml(s.summary) + '</p>' +
      '<div class="stage-related-meta">' + s.investorCount + ' investors</div>' +
    '</a>'
  )).join('');

  const ladderHtml = allStages.map((s, idx) => {
    const stateClass = s.order < stage.order
      ? ' is-done'
      : (s.id === stage.id ? ' is-active' : ' is-upcoming');
    const connector = idx < allStages.length - 1
      ? '<span class="stage-rail-line' + (s.order < stage.order ? ' is-done' : '') + '" aria-hidden="true"></span>'
      : '';
    return (
      '<div class="stage-rail-item">' +
        '<a class="stage-rail-node' + stateClass + '" href="/investors/stages/' + escapeHtml(s.id) + '">' +
          '<span class="stage-rail-dot"><span>' + s.order + '</span></span>' +
          '<span class="stage-rail-label">' + escapeHtml(s.label) + '</span>' +
        '</a>' +
        connector +
      '</div>'
    );
  }).join('');

  const fitBullets = (stage.whoItFits || []).map(item => (
    '<li class="stage-reveal"><span class="stage-fit-mark is-yes" aria-hidden="true">+</span><span>' + escapeHtml(item) + '</span></li>'
  )).join('');

  const waitBullets = (stage.whoDoesntFit || []).map(item => (
    '<li class="stage-reveal"><span class="stage-fit-mark is-wait" aria-hidden="true">–</span><span>' + escapeHtml(item) + '</span></li>'
  )).join('');

  const mistakesHtml = (stage.commonMistakes || []).map((m, i) => (
    '<div class="stage-mistake stage-reveal">' +
      '<span class="stage-mistake-num">' + String(i + 1).padStart(2, '0') + '</span>' +
      '<p>' + escapeHtml(m) + '</p>' +
    '</div>'
  )).join('');

  const prevNext = [
    stage.prev
      ? '<a class="stage-pn-card stage-reveal" href="/investors/stages/' + escapeHtml(stage.prev.id) + '"><span>Previous stage</span><strong>' + escapeHtml(stage.prev.label) + '</strong></a>'
      : '<div class="stage-pn-card is-empty"></div>',
    stage.next
      ? '<a class="stage-pn-card stage-reveal" href="/investors/stages/' + escapeHtml(stage.next.id) + '"><span>Next stage</span><strong>' + escapeHtml(stage.next.label) + '</strong></a>'
      : '<div class="stage-pn-card is-empty"></div>'
  ].join('');

  const html = [
    '<!DOCTYPE html>',
    '<html lang="en" class="scrollable-page">',
    '<head>',
    '<script async src="https://www.googletagmanager.com/gtag/js?id=G-BJ23KLLWFM"></script>',
    '<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js", new Date());gtag("config","G-BJ23KLLWFM");</script>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap">',
    '<title>' + escapeHtml(stage.label) + ' Funding Stage | Startup Investment Stages | VC Dekho</title>',
    '<meta name="description" content="' + escapeHtml(stage.summary).slice(0, 160) + '">',
    '<link rel="canonical" href="https://vcdekho.com/investors/stages/' + escapeHtml(stage.id) + '">',
    '<link rel="icon" type="image/png" href="/assets/logoforvc.png">',
    '<meta name="robots" content="index, follow">',
    '<link rel="stylesheet" href="/style.css?v=64">',
    '</head>',
    '<body class="scrollable-page inv-page stage-guide-page">',
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
    '<div class="inv-detail-wrap stage-page-wrap">',
    '<div class="inv-breadcrumbs"><a href="/">Home</a><span>›</span><a href="/investors">Investors</a><span>›</span><a href="/investors/stages">Stages</a><span>›</span><span class="current">' + escapeHtml(stage.label) + '</span></div>',

    '<section class="stage-hero stage-hero-enter" id="overview">',
    '<div class="stage-hero-wash" aria-hidden="true"></div>',
    '<div class="stage-hero-num" aria-hidden="true">' + orderLabel + '</div>',
    '<div class="stage-hero-copy">',
    '<span class="stage-hero-kicker">' + escapeHtml(stage.eyebrow) + ' · Guide ' + stage.order + ' of 6</span>',
    '<h1 class="stage-hero-title">' + escapeHtml(stage.label) + '</h1>',
    '<p class="stage-hero-summary">' + escapeHtml(stage.summary) + '</p>',
    '<div class="stage-hero-actions">',
    '<div class="stage-hero-stat"><strong>' + stage.investorCount + '</strong><span>matching investors</span></div>',
    '<a class="stage-hero-cta" href="/investors?stage=' + encodeURIComponent(stage.id) + '">Open in directory</a>',
    '</div>',
    '</div>',
    '<div class="stage-rail" aria-label="Funding stage ladder">' + ladderHtml + '</div>',
    '</section>',

    '<nav class="stage-sticky-nav" id="stage-sticky-nav" aria-label="On this page">',
    '<a href="#meaning" data-section="meaning">Meaning</a>',
    '<a href="#snapshot" data-section="snapshot">Snapshot</a>',
    '<a href="#fit" data-section="fit">Fit</a>',
    '<a href="#look-for" data-section="look-for">Look for</a>',
    '<a href="#prepare" data-section="prepare">Prepare</a>',
    '<a href="#round" data-section="round">Round</a>',
    '<a href="#mistakes" data-section="mistakes">Mistakes</a>',
    '<a href="#investors" data-section="investors">Investors</a>',
    '</nav>',

    '<section class="stage-section stage-meaning stage-reveal is-visible" id="meaning">',
    '<div class="stage-section-label">01 — Context</div>',
    '<h2>What this stage means</h2>',
    '<div class="stage-meaning-grid">',
    '<div class="stage-meaning-prose">' + paragraphs(stage.writeup) + '</div>',
    pullQuoteFromWriteup(stage.writeup),
    '</div>',
    '</section>',

    '<section class="stage-section stage-reveal is-visible" id="snapshot">',
    '<div class="stage-section-label">02 — At a glance</div>',
    '<div class="stage-section-head"><h2>Stage snapshot</h2><p>How this stage usually shows up for Indian founders.</p></div>',
    '<div class="stage-metric-strip">' + snapshotStrip + '</div>',
    '</section>',

    '<section class="stage-section stage-fit-band stage-reveal" id="fit">',
    '<div class="stage-section-label">03 — Fit</div>',
    '<div class="stage-fit-grid">',
    '<div class="stage-fit-panel is-yes">',
    '<h2>Who it fits</h2>',
    '<ul class="stage-fit-list">' + fitBullets + '</ul>',
    '</div>',
    '<div class="stage-fit-panel is-wait">',
    '<h2>Who should wait</h2>',
    '<ul class="stage-fit-list">' + waitBullets + '</ul>',
    '</div>',
    '</div>',
    '</section>',

    '<section class="stage-section stage-reveal" id="look-for">',
    '<div class="stage-section-label">04 — Diligence</div>',
    '<div class="stage-section-head"><h2>What investors look for</h2><p>Use this as a checklist before you start outreach.</p></div>',
    '<div class="stage-panel-accent">' + numberedList(stage.whatInvestorsLookFor) + '</div>',
    '</section>',

    '<section class="stage-section stage-reveal" id="prepare">',
    '<div class="stage-section-label">05 — Pack</div>',
    '<div class="stage-section-head"><h2>What to prepare</h2><p>Practical materials for a credible process at this stage.</p></div>',
    '<div class="stage-panel-accent">' + numberedList(stage.whatToPrepare) + '</div>',
    '</section>',

    '<section class="stage-section stage-reveal" id="round">',
    '<div class="stage-section-label">06 — Construction</div>',
    '<div class="stage-section-head"><h2>Round construction tips</h2><p>Educational guidance for how rounds are often built in India — not legal advice.</p></div>',
    '<div class="stage-tips-panel">' + tipList(stage.roundConstruction) + '</div>',
    '</section>',

    '<section class="stage-section stage-reveal" id="mistakes">',
    '<div class="stage-section-label">07 — Watchouts</div>',
    '<div class="stage-section-head"><h2>Common mistakes</h2></div>',
    '<div class="stage-mistakes">' + mistakesHtml + '</div>',
    '</section>',

    '<section class="stage-section stage-reveal" id="investors">',
    '<div class="stage-section-label">08 — Capital map</div>',
    '<div class="theme-section-head"><h2>Investors active at this stage</h2><a href="/investors?stage=' + encodeURIComponent(stage.id) + '">See all filters</a></div>',
    '<div class="stage-inv-grid">' + (investorCards || '<p class="inv-empty">No investors tagged yet.</p>') + '</div>',
    stage.investorCount > 24
      ? ('<div class="theme-more"><a class="inv-btn inv-btn-primary" href="/investors?stage=' + encodeURIComponent(stage.id) + '">Browse all ' + stage.investorCount + ' investors</a></div>')
      : '',
    '</section>',

    relatedStageCards
      ? ('<section class="stage-section stage-reveal"><div class="stage-section-label">Continue</div><div class="stage-section-head"><h2>Related stages</h2></div><div class="stage-related-grid">' + relatedStageCards + '</div></section>')
      : '',

    renderExploreRelated({
      title: 'Explore related',
      subtitle: 'Match stage fit with thesis fit, then open the directory.',
      themes: (stage.relatedThemes || []).map(t => ({ id: t.id, label: t.label })),
      fundsHref: '/investors?stage=' + encodeURIComponent(stage.id),
      fundsLabel: 'Browse ' + stage.investorCount + ' funds at this stage →',
      siblingHref: '/investors/themes',
      siblingLabel: 'Thesis guides →'
    }),

    '<section class="stage-section"><div class="stage-pn-grid">' + prevNext + '</div></section>',

    '<section class="blog-cta-banner" style="margin: 2rem 0 1rem;">',
    '<img src="/assets/blog_vc_dekho_cta.png" alt="VC Dekho" class="blog-cta-bg">',
    '<div class="blog-cta-content">',
    '<h2 class="blog-cta-title">Raise at the right stage</h2>',
    '<p class="blog-cta-desc">VC Dekho helps founders shortlist investors by stage, sector, cheque size, and thesis.</p>',
    '<a href="/investors" class="blog-cta-btn">Browse investors</a>',
    '</div></section>',

    '</div></main></div>',
    '<script src="/js/auth.js"></script>',
    '<script src="/app.js" defer></script>',
    '<script>',
    '(function(){',
    'var nav=document.getElementById("stage-sticky-nav");',
    'var links=nav?Array.prototype.slice.call(nav.querySelectorAll("a[data-section]")):[];',
    'var sections=links.map(function(a){return document.getElementById(a.getAttribute("data-section"));}).filter(Boolean);',
    'function setActive(id){links.forEach(function(a){a.classList.toggle("is-active",a.getAttribute("data-section")===id);});}',
    'if(sections.length&&"IntersectionObserver" in window){',
    'var io=new IntersectionObserver(function(entries){',
    'entries.forEach(function(e){if(e.isIntersecting)setActive(e.target.id);});',
    '},{rootMargin:"-25% 0px -55% 0px",threshold:0.01});',
    'sections.forEach(function(s){io.observe(s);});',
    '}',
    'var reveals=document.querySelectorAll(".stage-reveal");',
    'if("IntersectionObserver" in window){',
    'var ro=new IntersectionObserver(function(entries){',
    'entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add("is-visible");ro.unobserve(e.target);}});',
    '},{threshold:0.01,rootMargin:"0px 0px -4% 0px"});',
    'reveals.forEach(function(el){',
    'var r=el.getBoundingClientRect();',
    'if(r.top < window.innerHeight && r.bottom > 0){el.classList.add("is-visible");}',
    'else{ro.observe(el);}',
    '});',
    '}else{reveals.forEach(function(el){el.classList.add("is-visible");});}',
    'requestAnimationFrame(function(){document.body.classList.add("stage-ready");});',
    '})();',
    '</script>',
    '</body></html>'
  ].join('\n');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=3600');
  return res.status(200).send(html);
}

module.exports = { renderStagePage, escapeHtml };
