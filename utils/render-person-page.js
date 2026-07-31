/**
 * Person profile page renderer — a lighter sibling of render-investor-page.js.
 * Note: the person's email is intentionally NOT printed on this public,
 * search-indexed page (it stays inside the logged-in /people list + API,
 * mirroring how the fuller investor directory is gated).
 */
const { loadPeopleData } = require('./people');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function initialsFor(name) {
  const parts = String(name || '')
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function peopleDirectoryWidget() {
  const data = loadPeopleData();
  const peopleCount = data.count || 0;
  const orgCount = new Set((data.people || []).map((p) => p.companySlug).filter(Boolean)).size;
  const countLabel = peopleCount >= 100 ? String(Math.floor(peopleCount / 10) * 10) + '+' : String(peopleCount);

  return (
    '<aside class="inv-profile-dir-widget" aria-label="People directory">' +
      '<div class="inv-profile-dir-stats">' +
        '<div class="inv-profile-dir-stat"><strong>' + escapeHtml(countLabel) + '</strong><span>People</span></div>' +
        '<div class="inv-profile-dir-stat"><strong>' + orgCount + '</strong><span>Firms</span></div>' +
      '</div>' +
      '<div class="inv-profile-dir-copy">' +
        '<h2 class="inv-profile-dir-title">Find more investors like this</h2>' +
        '<p class="inv-profile-dir-desc">Browse partners, principals and founders across every fund in the directory.</p>' +
        '<a class="inv-profile-cta is-ghost" href="/people">People Directory</a>' +
      '</div>' +
    '</aside>'
  );
}

function renderPersonPage(person, colleagues, res) {
  const metaDesc = (person.title ? person.title + ' at ' + person.company : 'Investor at ' + person.company) +
    '. Explore on VC Dekho.';

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
  const iconTwitter =
    '<svg class="inv-profile-cta-icon" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M23 4.6c-.8.4-1.7.6-2.6.8.9-.6 1.6-1.5 2-2.5-.9.5-1.8.9-2.8 1.1a4.4 4.4 0 0 0-7.5 4c-3.6-.2-6.9-1.9-9-4.6a4.4 4.4 0 0 0 1.4 5.9c-.7 0-1.4-.2-2-.6v.1c0 2.1 1.5 3.9 3.5 4.3-.6.2-1.3.2-2 .1.6 1.8 2.3 3.1 4.3 3.1A8.9 8.9 0 0 1 1 19.5a12.6 12.6 0 0 0 6.8 2c8.1 0 12.6-6.9 12.6-12.9v-.6c.9-.6 1.6-1.4 2.2-2.3z"/>' +
    '</svg>';

  const linkedinBtn = person.linkedin
    ? '<a class="inv-profile-cta is-primary" href="' + escapeHtml(person.linkedin) + '" target="_blank" rel="noopener noreferrer">' + iconLinkedin + '<span>LinkedIn</span></a>'
    : '';
  const twitterBtn = person.twitter
    ? '<a class="inv-profile-cta is-ghost" href="' + escapeHtml(person.twitter) + '" target="_blank" rel="noopener noreferrer">' + iconTwitter + '<span>Twitter / X</span></a>'
    : '';
  const companyBtn = person.companySlug
    ? '<a class="inv-profile-cta is-ghost" href="/investors/' + escapeHtml(person.companySlug) + '">' + iconExternal + '<span>View ' + escapeHtml(person.company) + '</span></a>'
    : '';

  const snapshotStrip = [
    { label: 'Role', value: person.title || 'Investor', lead: true },
    { label: 'Company', value: person.company || '—', href: person.companySlug ? '/investors/' + person.companySlug : null },
    { label: 'Company type', value: person.companyType || '—' }
  ].map((item) => {
    const inner =
      '<div class="inv-profile-metric-label">' + escapeHtml(item.label) + '</div>' +
      '<div class="inv-profile-metric-value">' + escapeHtml(item.value) + '</div>';
    const cls = 'inv-profile-metric' + (item.lead ? ' is-lead' : '');
    if (item.href) return '<a class="' + cls + '" href="' + escapeHtml(item.href) + '">' + inner + '</a>';
    return '<div class="' + cls + '">' + inner + '</div>';
  }).join('');

  const colleagueCards = (colleagues || []).slice(0, 6).map((c) => (
    '<a class="inv-profile-related-card inv-profile-reveal" href="/people/' + escapeHtml(c.slug) + '">' +
      '<div class="inv-profile-related-type">' + escapeHtml(c.title || 'Investor') + '</div>' +
      '<h3>' + escapeHtml(c.name) + '</h3>' +
      '<p>' + escapeHtml(c.company || '') + '</p>' +
    '</a>'
  )).join('');

  const colleagueSection = colleagueCards
    ? (
      '<section class="inv-profile-section inv-profile-reveal" id="colleagues">' +
        '<div class="inv-profile-section-label">02 — Team</div>' +
        '<div class="inv-profile-section-head"><h2>Others at ' + escapeHtml(person.company) + '</h2><p>More people mapped to this firm in the directory.</p></div>' +
        '<div class="inv-profile-related-grid">' + colleagueCards + '</div>' +
      '</section>'
    )
    : '';

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    jobTitle: person.title || undefined,
    image: person.photo ? 'https://vcdekho.com' + person.photo : undefined,
    worksFor: person.company ? { '@type': 'Organization', name: person.company } : undefined,
    sameAs: [person.linkedin, person.twitter].filter(Boolean)
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
    '<title>' + escapeHtml(person.name) + ' | People | VC Dekho</title>',
    '<meta name="description" content="' + escapeHtml(metaDesc).slice(0, 160) + '">',
    '<link rel="canonical" href="https://vcdekho.com/people/' + escapeHtml(person.slug) + '">',
    '<link rel="icon" type="image/png" href="/assets/logoforvc.png">',
    '<meta name="robots" content="index, follow">',
    '<link rel="stylesheet" href="/css/base.css?v=71">',
    '<link rel="stylesheet" href="/css/hero.css?v=71">',
    '<link rel="stylesheet" href="/css/ambient.css?v=71">',
    '<link rel="stylesheet" href="/css/directory.css?v=71">',
    '<meta property="og:title" content="' + escapeHtml(person.name) + ' | VC Dekho">',
    '<meta property="og:description" content="' + escapeHtml(metaDesc).slice(0, 160) + '">',
    '<meta property="og:url" content="https://vcdekho.com/people/' + escapeHtml(person.slug) + '">',
    '<meta property="og:type" content="profile">',
    person.photo ? ('<meta property="og:image" content="https://vcdekho.com' + escapeHtml(person.photo) + '">') : '',
    '<script type="application/ld+json">' + schema + '</script>',
    '</head>',
    '<body class="scrollable-page inv-page inv-profile-page">',
    '<div class="app-container">',
    '<header class="site-header">',
    '<a href="/" class="logo-container"><img src="/assets/logoforvc.png" alt="VC Dekho Logo" class="logo-img"></a>',
    '<button class="nav-toggle" id="menu-toggle" aria-label="Toggle navigation menu"><span></span><span></span><span></span></button>',
    '<nav class="main-nav" id="navigation-bar">',
    '<a href="/" class="nav-link">Home</a>',
    '<a href="/investors" class="nav-link">Investors</a>',
    '<a href="/people" class="nav-link active">People</a>',
    '<a href="/blog" class="nav-link">Blog</a>',
    '<a href="/news" class="nav-link">News</a>',
    '</nav></header>',
    '<main class="hero-showcase inv-detail-main">',
    '<div class="ambient-bg-wrapper"><div class="waitlist-bg"><div class="glow-orb orb-1"></div><div class="glow-orb orb-2"></div><div class="glow-orb orb-3"></div></div></div>',
    '<div class="inv-detail-wrap inv-profile-wrap">',
    '<div class="inv-breadcrumbs"><a href="/">Home</a><span>›</span><a href="/people">People</a><span>›</span><span class="current">' + escapeHtml(person.name) + '</span></div>',

    '<div class="inv-profile-hero-row inv-profile-hero-enter" id="overview">',
    '<section class="inv-profile-hero">',
    '<div class="inv-profile-hero-wash" aria-hidden="true"></div>',
    '<div class="inv-profile-hero-inner">',
    '<div class="inv-profile-hero-copy">',
    person.photo
      ? ('<img class="inv-profile-logo" src="' + escapeHtml(person.photo) + '" alt="" width="56" height="56" loading="eager" style="border-radius:50%;object-fit:cover;">')
      : person.companyLogo
        ? ('<img class="inv-profile-logo" src="' + escapeHtml(person.companyLogo) + '" alt="" width="56" height="56" loading="eager">')
        : ('<span class="inv-dir-logo-fallback is-visible" aria-hidden="true" style="display:inline-flex;margin-bottom:14px;">' + escapeHtml(initialsFor(person.name)) + '</span>'),
    '<span class="inv-profile-type">' + escapeHtml(person.title || 'Investor') + '</span>',
    '<h1 class="inv-profile-title">' + escapeHtml(person.name) + '</h1>',
    '<p class="inv-profile-hero-lead">' + escapeHtml((person.title ? person.title + ' at ' : 'Investor at ') + (person.company || '')) + '</p>',
    '<div class="inv-profile-hero-actions">' + linkedinBtn + companyBtn + twitterBtn + '</div>',
    '</div>',
    '</div>',
    '</section>',
    peopleDirectoryWidget(),
    '</div>',

    '<section class="inv-profile-section inv-profile-reveal is-visible" id="snapshot">',
    '<div class="inv-profile-section-label">01 — Snapshot</div>',
    '<div class="inv-profile-section-head"><h2>At a glance</h2><p>Where this person sits in the VC Dekho directory.</p></div>',
    '<div class="inv-profile-metric-strip">' + snapshotStrip + '</div>',
    '</section>',

    colleagueSection,

    '<section class="blog-cta-banner" style="margin: 3rem 0 1rem;">',
    '<img src="/assets/blog_vc_dekho_cta.webp" alt="VC Dekho" class="blog-cta-bg">',
    '<div class="blog-cta-content">',
    '<h2 class="blog-cta-title">Find the right person to pitch</h2>',
    '<p class="blog-cta-desc">Search investors and the people behind every fund — sign in to unlock contact details.</p>',
    '<a href="/people" class="blog-cta-btn">Browse people</a>',
    '</div></section>',

    '</div></main></div>',
    '<script src="/js/auth.js"></script>',
    '<script src="/app.js" defer></script>',
    '<script>',
    '(function(){',
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

module.exports = { renderPersonPage, escapeHtml };
