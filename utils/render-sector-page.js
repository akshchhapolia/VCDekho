/**
 * Deep sector guide pages — stage-guide depth + CSS infographics.
 */
const { getAllSectorGuides } = require('./sectors');
const { deriveRelatedStages, hasStageGuide, getStageGuideLabel } = require('./investors');
const { getAllThemes } = require('./thesis-themes');
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
    .map((p) => '<p class="stage-prose">' + escapeHtml(p) + '</p>')
    .join('');
}

function pullQuoteFromWriteup(text) {
  const first = String(text || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)[0] || '';
  const sentences = first.match(/[^.!?]+[.!?]+/g) || [first];
  const pick = (sentences[1] || sentences[0] || '').trim();
  if (!pick) return '';
  return (
    '<blockquote class="stage-pullquote">' +
    '<p>' +
    escapeHtml(pick) +
    '</p>' +
    '</blockquote>'
  );
}

function numberedList(items) {
  return (
    '<ol class="stage-numbered">' +
    (items || [])
      .map(
        (item, i) =>
          '<li class="stage-reveal">' +
          '<span class="stage-num" aria-hidden="true">' +
          String(i + 1).padStart(2, '0') +
          '</span>' +
          '<span class="stage-num-text">' +
          escapeHtml(item) +
          '</span>' +
          '</li>'
      )
      .join('') +
    '</ol>'
  );
}

function tipList(items) {
  return (
    '<ul class="stage-tip-list">' +
    (items || [])
      .map(
        (item) =>
          '<li class="stage-reveal">' +
          '<span class="stage-tip-mark" aria-hidden="true">→</span>' +
          '<span>' +
          escapeHtml(item) +
          '</span>' +
          '</li>'
      )
      .join('') +
    '</ul>'
  );
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
  const allSectors = getAllSectorGuides().sort((a, b) => (a.order || 0) - (b.order || 0));
  const orderLabel = String(sector.order || 1).padStart(2, '0');
  const snapshot = sector.snapshot || {};
  const relatedStages = deriveRelatedStages(sector.investors, 5);
  const themeById = Object.create(null);
  getAllThemes().forEach((t) => {
    themeById[t.id] = t;
  });
  const relatedThemes = (sector.relatedThesisIds || [])
    .map((id) => themeById[id])
    .filter(Boolean)
    .slice(0, 5)
    .map((t) => ({ id: t.id, label: t.label }));

  const sectorRail = allSectors
    .map((s, idx) => {
      const stateClass = s.id === sector.id ? ' is-active' : '';
      const connector =
        idx < allSectors.length - 1 ? '<span class="stage-rail-line" aria-hidden="true"></span>' : '';
      return (
        '<div class="stage-rail-item">' +
        '<a class="stage-rail-node' +
        stateClass +
        '" href="/investors/sectors/' +
        escapeHtml(s.id) +
        '">' +
        '<span class="stage-rail-dot"><span>' +
        (s.order || idx + 1) +
        '</span></span>' +
        '<span class="stage-rail-label">' +
        escapeHtml(s.label) +
        '</span>' +
        '</a>' +
        connector +
        '</div>'
      );
    })
    .join('');

  const snapshotStrip = [
    ['Typical cheque', snapshot.typicalCheque],
    ['Primary buyer', snapshot.buyer],
    ['Diligence focus', snapshot.diligenceFocus],
    ['India edge', snapshot.indiaEdge],
    ['Capital types', snapshot.capitalTypes]
  ]
    .map(
      ([label, value], i) =>
        '<div class="stage-metric' +
        (i === 0 ? ' is-lead' : '') +
        '">' +
        '<div class="stage-metric-label">' +
        escapeHtml(label) +
        '</div>' +
        '<div class="stage-metric-value">' +
        escapeHtml(value || '—') +
        '</div>' +
        '</div>'
    )
    .join('');

  const landscapeHtml = (sector.subsectors || [])
    .map(
      (item, i) =>
        '<article class="sector-landscape-card stage-reveal" style="--i:' +
        i +
        '">' +
        '<div class="sector-landscape-idx" aria-hidden="true">' +
        String(i + 1).padStart(2, '0') +
        '</div>' +
        '<h3>' +
        escapeHtml(item.label) +
        '</h3>' +
        '<p>' +
        escapeHtml(item.blurb) +
        '</p>' +
        '</article>'
    )
    .join('');

  const metricsHtml = (sector.metricsThatMatter || [])
    .map(
      (m, i) =>
        '<article class="sector-metric-card stage-reveal">' +
        '<div class="sector-metric-card-top">' +
        '<span class="sector-metric-card-num">' +
        String(i + 1).padStart(2, '0') +
        '</span>' +
        '<div class="sector-metric-card-bar" aria-hidden="true"><span style="width:' +
        (92 - i * 6) +
        '%"></span></div>' +
        '</div>' +
        '<h3>' +
        escapeHtml(m.label) +
        '</h3>' +
        '<p>' +
        escapeHtml(m.why) +
        '</p>' +
        '</article>'
    )
    .join('');

  const diligenceHtml = (sector.diligenceMap || [])
    .map(
      (d) =>
        '<div class="sector-diligence-row stage-reveal">' +
        '<div class="sector-diligence-label">' +
        '<strong>' +
        escapeHtml(d.area) +
        '</strong>' +
        '<span>' +
        escapeHtml(d.detail) +
        '</span>' +
        '</div>' +
        '<div class="sector-diligence-track" aria-label="' +
        escapeHtml(d.area) +
        ' weight ' +
        d.weight +
        '">' +
        '<span class="sector-diligence-fill" style="width:' +
        Math.max(8, Math.min(100, d.weight || 0)) +
        '%"></span>' +
        '<em>' +
        escapeHtml(String(d.weight || 0)) +
        '</em>' +
        '</div>' +
        '</div>'
    )
    .join('');

  const fitBullets = (sector.whoItFits || [])
    .map(
      (item) =>
        '<li class="stage-reveal"><span class="stage-fit-mark is-yes" aria-hidden="true">+</span><span>' +
        escapeHtml(item) +
        '</span></li>'
    )
    .join('');

  const waitBullets = (sector.whoDoesntFit || [])
    .map(
      (item) =>
        '<li class="stage-reveal"><span class="stage-fit-mark is-wait" aria-hidden="true">–</span><span>' +
        escapeHtml(item) +
        '</span></li>'
    )
    .join('');

  const mistakesHtml = (sector.commonMistakes || [])
    .map(
      (m, i) =>
        '<div class="stage-mistake stage-reveal">' +
        '<span class="stage-mistake-num">' +
        String(i + 1).padStart(2, '0') +
        '</span>' +
        '<p>' +
        escapeHtml(m) +
        '</p>' +
        '</div>'
    )
    .join('');

  const playbookSteps = (sector.fundraisingPlaybook || [])
    .map(
      (step, i) =>
        '<li class="sector-playbook-step stage-reveal">' +
        '<div class="sector-playbook-node" aria-hidden="true">' +
        String(i + 1) +
        '</div>' +
        '<div class="sector-playbook-copy">' +
        escapeHtml(step) +
        '</div>' +
        '</li>'
    )
    .join('');

  const investorCards = (sector.investors || [])
    .slice(0, 24)
    .map(
      (inv) =>
        '<article class="theme-inv-card stage-reveal">' +
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

  const otherSectors = allSectors
    .filter((s) => s.id !== sector.id)
    .slice(0, 4)
    .map(
      (s) =>
        '<a class="stage-related-card stage-reveal" href="/investors/sectors/' +
        escapeHtml(s.id) +
        '">' +
        '<div class="stage-related-order">Guide ' +
        String(s.order || '').padStart(2, '0') +
        '</div>' +
        '<h3>' +
        escapeHtml(s.label) +
        '</h3>' +
        '<p>' +
        escapeHtml(s.summary) +
        '</p>' +
        '<div class="stage-related-meta">' +
        s.investorCount +
        ' investors</div>' +
        '</a>'
    )
    .join('');

  const stageChips = (sector.relatedStageIds || [])
    .filter(hasStageGuide)
    .map((id) => ({ id, label: getStageGuideLabel(id) }));

  const idx = allSectors.findIndex((s) => s.id === sector.id);
  const prev = idx > 0 ? allSectors[idx - 1] : null;
  const next = idx >= 0 && idx < allSectors.length - 1 ? allSectors[idx + 1] : null;
  const prevNext = [
    prev
      ? '<a class="stage-pn-card stage-reveal" href="/investors/sectors/' +
        escapeHtml(prev.id) +
        '"><span>Previous sector</span><strong>' +
        escapeHtml(prev.label) +
        '</strong></a>'
      : '<div class="stage-pn-card is-empty"></div>',
    next
      ? '<a class="stage-pn-card stage-reveal" href="/investors/sectors/' +
        escapeHtml(next.id) +
        '"><span>Next sector</span><strong>' +
        escapeHtml(next.label) +
        '</strong></a>'
      : '<div class="stage-pn-card is-empty"></div>'
  ].join('');

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
    '<title>' + escapeHtml(sector.label) + ' Investors India | Sector Guide | VC Dekho</title>',
    '<meta name="description" content="' + escapeHtml(sector.summary).slice(0, 160) + '">',
    '<link rel="canonical" href="https://vcdekho.com/investors/sectors/' + escapeHtml(sector.id) + '">',
    '<link rel="icon" type="image/png" href="/assets/logoforvc.png">',
    '<meta name="robots" content="index, follow">',
    '<link rel="stylesheet" href="/css/base.css?v=70">',
    '<link rel="stylesheet" href="/css/hero.css?v=70">',
    '<link rel="stylesheet" href="/css/ambient.css?v=70">',
    '<link rel="stylesheet" href="/css/directory.css?v=70">',
    '</head>',
    '<body class="scrollable-page inv-page stage-guide-page sector-guide-page">',
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
    '<div class="inv-breadcrumbs"><a href="/">Home</a><span>›</span><a href="/investors">Investors</a><span>›</span><a href="/investors/sectors">Sectors</a><span>›</span><span class="current">' +
      escapeHtml(sector.label) +
      '</span></div>',

    '<section class="stage-hero stage-hero-enter" id="overview">',
    '<div class="stage-hero-wash" aria-hidden="true"></div>',
    '<div class="stage-hero-num" aria-hidden="true">' + orderLabel + '</div>',
    '<div class="stage-hero-copy">',
    '<div class="sector-hero-icon" aria-hidden="true">' +
      getSectorIconSvg(sector.id, 'theme-hero-icon') +
      '</div>',
    '<span class="stage-hero-kicker">' +
      escapeHtml(sector.eyebrow) +
      ' · Guide ' +
      (sector.order || 1) +
      ' of ' +
      allSectors.length +
      '</span>',
    '<h1 class="stage-hero-title">' + escapeHtml(sector.label) + '</h1>',
    '<p class="stage-hero-summary">' + escapeHtml(sector.summary) + '</p>',
    '<div class="stage-hero-actions">',
    '<div class="stage-hero-stat"><strong>' +
      sector.investorCount +
      '</strong><span>matching investors</span></div>',
    '<a class="stage-hero-cta" href="/investors?sector=' +
      encodeURIComponent(sector.id) +
      '">Open in directory</a>',
    '</div>',
    '</div>',
    '<div class="stage-rail sector-rail" aria-label="Sector guides">' + sectorRail + '</div>',
    '</section>',

    '<nav class="stage-sticky-nav" id="stage-sticky-nav" aria-label="On this page">',
    '<a href="#meaning" data-section="meaning">Meaning</a>',
    '<a href="#snapshot" data-section="snapshot">Snapshot</a>',
    '<a href="#landscape" data-section="landscape">Landscape</a>',
    '<a href="#metrics" data-section="metrics">Metrics</a>',
    '<a href="#diligence" data-section="diligence">Diligence</a>',
    '<a href="#fit" data-section="fit">Fit</a>',
    '<a href="#look-for" data-section="look-for">Look for</a>',
    '<a href="#prepare" data-section="prepare">Prepare</a>',
    '<a href="#playbook" data-section="playbook">Playbook</a>',
    '<a href="#mistakes" data-section="mistakes">Mistakes</a>',
    '<a href="#investors" data-section="investors">Investors</a>',
    '</nav>',

    '<section class="stage-section stage-meaning stage-reveal is-visible" id="meaning">',
    '<div class="stage-section-label">01 — Context</div>',
    '<h2>What this sector means</h2>',
    '<div class="stage-meaning-grid">',
    '<div class="stage-meaning-prose">' + paragraphs(sector.writeup) + '</div>',
    pullQuoteFromWriteup(sector.writeup),
    '</div>',
    '</section>',

    '<section class="stage-section stage-reveal is-visible" id="snapshot">',
    '<div class="stage-section-label">02 — At a glance</div>',
    '<div class="stage-section-head"><h2>Sector snapshot</h2><p>How this category usually shows up for Indian founders raising capital.</p></div>',
    '<div class="stage-metric-strip">' + snapshotStrip + '</div>',
    '</section>',

    landscapeHtml
      ? '<section class="stage-section stage-reveal" id="landscape">' +
        '<div class="stage-section-label">03 — Map</div>' +
        '<div class="stage-section-head"><h2>Landscape map</h2><p>Pick the sub-sector narrative before you shortlist funds — generalist “fintech” or “AI” pitches underperform.</p></div>' +
        '<div class="sector-landscape-grid">' +
        landscapeHtml +
        '</div></section>'
      : '',

    metricsHtml
      ? '<section class="stage-section stage-reveal" id="metrics">' +
        '<div class="stage-section-label">04 — Scoreboard</div>' +
        '<div class="stage-section-head"><h2>Metrics that matter</h2><p>Bring the ones that match your model. Vanity volume without these rarely survives diligence.</p></div>' +
        '<div class="sector-metrics-grid">' +
        metricsHtml +
        '</div></section>'
      : '',

    diligenceHtml
      ? '<section class="stage-section stage-reveal" id="diligence">' +
        '<div class="stage-section-label">05 — Weights</div>' +
        '<div class="stage-section-head"><h2>How investors weigh diligence</h2><p>Relative emphasis in partner conversations — directional, not a formula.</p></div>' +
        '<div class="sector-diligence-panel">' +
        diligenceHtml +
        '</div></section>'
      : '',

    '<section class="stage-section stage-fit-band stage-reveal" id="fit">',
    '<div class="stage-section-label">06 — Fit</div>',
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
    '<div class="stage-section-label">07 — Checklist</div>',
    '<div class="stage-section-head"><h2>What investors look for</h2><p>Use this before outreach — not after the first rejection.</p></div>',
    '<div class="stage-panel-accent">' + numberedList(sector.whatInvestorsLookFor) + '</div>',
    '</section>',

    '<section class="stage-section stage-reveal" id="prepare">',
    '<div class="stage-section-label">08 — Pack</div>',
    '<div class="stage-section-head"><h2>What to prepare</h2><p>Materials that make diligence faster and more credible.</p></div>',
    '<div class="stage-panel-accent">' + numberedList(sector.whatToPrepare) + '</div>',
    '</section>',

    playbookSteps
      ? '<section class="stage-section stage-reveal" id="playbook">' +
        '<div class="stage-section-label">09 — Playbook</div>' +
        '<div class="stage-section-head"><h2>Fundraising playbook</h2><p>A practical sequence for running process in this sector.</p></div>' +
        '<ol class="sector-playbook">' +
        playbookSteps +
        '</ol></section>'
      : '',

    '<section class="stage-section stage-reveal" id="mistakes">',
    '<div class="stage-section-label">10 — Watchouts</div>',
    '<div class="stage-section-head"><h2>Common mistakes</h2></div>',
    '<div class="stage-mistakes">' + mistakesHtml + '</div>',
    '</section>',

    '<section class="stage-section stage-reveal" id="investors">',
    '<div class="stage-section-label">11 — Capital map</div>',
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

    otherSectors
      ? '<section class="stage-section stage-reveal"><div class="stage-section-label">Continue</div><div class="stage-section-head"><h2>Other sector guides</h2></div><div class="stage-related-grid">' +
        otherSectors +
        '</div></section>'
      : '',

    renderExploreRelated({
      title: 'Explore related',
      subtitle: 'Pair sector fit with stage and thesis, then open the directory.',
      stages: stageChips.length ? stageChips : relatedStages,
      themes: relatedThemes,
      fundsHref: '/investors?sector=' + encodeURIComponent(sector.id),
      fundsLabel: 'Browse ' + sector.investorCount + ' matching funds →',
      siblingHref: '/investors/stages',
      siblingLabel: 'Stage guides →'
    }),

    '<section class="stage-section"><div class="stage-pn-grid">' + prevNext + '</div></section>',

    '<section class="blog-cta-banner" style="margin: 2rem 0 1rem;">',
    '<img src="/assets/blog_vc_dekho_cta.webp" alt="VC Dekho" class="blog-cta-bg">',
    '<div class="blog-cta-content">',
    '<h2 class="blog-cta-title">Match your category to the right funds</h2>',
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

module.exports = { renderSectorPage };
