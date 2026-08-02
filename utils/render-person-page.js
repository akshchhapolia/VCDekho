/**
 * Person profile page renderer — a lighter sibling of render-investor-page.js.
 * Firm-context sections are joined via companySlug (see render-person-firm-sections.js).
 */
const { loadPeopleData } = require('./people');
const { FUNDS_PATH, INVESTORS_PATH, FUNDS_LABEL, INVESTORS_LABEL } = require('./site-labels');
const {
  firmFocusSection,
  firmThesisSection,
  firmActivitySection,
  firmPortfolioSection,
  firmExploreSection
} = require('./render-person-firm-sections');
const { setPublicHtmlCache } = require('./public-html-cache');
const { renderProfileHeadAssets, earlyStickyPinScript } = require('./profile-page-assets');

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
    '<aside class="inv-profile-dir-widget inv-profile-dir-widget--people" aria-label="Investor directory">' +
      '<p class="inv-person-dir-kicker">Investor directory</p>' +
      '<div class="inv-person-dir-stats-row">' +
        '<div class="inv-person-dir-stat">' +
          '<strong>' + escapeHtml(countLabel) + '</strong>' +
          '<span>Investors</span>' +
        '</div>' +
        '<div class="inv-person-dir-stat-divider" aria-hidden="true"></div>' +
        '<div class="inv-person-dir-stat">' +
          '<strong>' + orgCount + '</strong>' +
          '<span>Firms</span>' +
        '</div>' +
      '</div>' +
      '<p class="inv-person-dir-desc">Browse partners and principals mapped across India\'s VC ecosystem.</p>' +
      '<ul class="inv-person-dir-features">' +
        '<li>Partners, GPs &amp; principals</li>' +
        '<li>Linked to investor firm profiles</li>' +
        '<li>Filter by role, firm type, stage &amp; sector</li>' +
      '</ul>' +
      '<a class="inv-profile-cta is-ghost inv-person-dir-cta" href="' + INVESTORS_PATH + '">Browse directory</a>' +
    '</aside>'
  );
}

function colleagueAvatarHtml(colleague) {
  if (colleague.photo) {
    return (
      '<img class="inv-person-colleague-avatar" src="' + escapeHtml(colleague.photo) + '" alt="" width="40" height="40" loading="lazy">'
    );
  }
  if (colleague.companyLogo) {
    return (
      '<img class="inv-person-colleague-avatar is-firm" src="' + escapeHtml(colleague.companyLogo) + '" alt="" width="40" height="40" loading="lazy">'
    );
  }
  return '<span class="inv-person-colleague-avatar is-fallback" aria-hidden="true">' + escapeHtml(initialsFor(colleague.name)) + '</span>';
}

function renderPersonExtrasHtml(person, investor, opts) {
  opts = opts || {};
  if (!investor) return { activityHtml: '', portfolioHtml: '' };
  return {
    activityHtml: firmActivitySection(person, investor, {
      sectionOffset: opts.sectionOffset,
      visible: opts.visible
    }) || '',
    portfolioHtml: firmPortfolioSection(person, investor, { limit: 9, sectionOffset: opts.sectionOffset }) || ''
  };
}

function personHeroLead(person) {
  const title = String(person.title || '').trim();
  const company = String(person.company || '').trim();
  if (!title && !company) return 'Investor';
  if (!title) return 'Investor at ' + company;
  if (!company) return title;
  // e.g. title + company both "Angel Investor" → avoid "Angel Investor at Angel Investor"
  if (title.toLowerCase() === company.toLowerCase()) return title;
  return title + ' at ' + company;
}

function isAngelIndividual(person) {
  const type = String(person.companyType || '').toLowerCase();
  return type === 'angel / individual' || type.includes('angel / individual');
}

function renderPersonPage(person, colleagues, investor, res, opts) {
  opts = opts || {};
  const mwebFirstPaint = Boolean(opts.mwebFirstPaint || opts.deferExtras);
  const angelIndividual = isAngelIndividual(person);
  const heroLead = personHeroLead(person);
  const metaDesc = heroLead + '. Explore on VC Dekho.';

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
  const iconEmail =
    '<svg class="inv-profile-cta-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M3 7l9 6 9-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  const linkedinBtn = person.linkedin
    ? '<a class="inv-profile-cta is-primary" href="' + escapeHtml(person.linkedin) + '" target="_blank" rel="noopener noreferrer" data-analytics-event="profile_cta_click" data-analytics-params=\'{"cta":"linkedin","kind":"person"}\'>' + iconLinkedin + '<span>LinkedIn</span></a>'
    : '';
  const emailBtn = person.email
    ? '<a class="inv-profile-cta is-ghost" href="mailto:' + escapeHtml(person.email) + '" data-analytics-event="profile_cta_click" data-analytics-params=\'{"cta":"email","kind":"person"}\'>' + iconEmail + '<span>' + escapeHtml(person.email) + '</span></a>'
    : '';
  const twitterBtn = person.twitter
    ? '<a class="inv-profile-cta is-ghost" href="' + escapeHtml(person.twitter) + '" target="_blank" rel="noopener noreferrer" data-analytics-event="profile_cta_click" data-analytics-params=\'{"cta":"twitter","kind":"person"}\'>' + iconTwitter + '<span>Twitter / X</span></a>'
    : '';
  const companyBtn = person.companySlug
    ? '<a class="inv-profile-cta is-ghost" href="/investors/' + escapeHtml(person.companySlug) + '" data-analytics-event="profile_cta_click" data-analytics-params=\'{"cta":"firm","kind":"person"}\'>' + iconExternal + '<span>View ' + escapeHtml(person.company) + '</span></a>'
    : '';

  // Angel / Individual profiles: At a glance repeats role/type with little signal — omit it
  let snapshotSection = '';
  if (!angelIndividual) {
    const snapshotItems = [
      { label: 'Role', value: person.title || 'Investor', lead: true },
      { label: 'Company', value: person.company || '—', href: person.companySlug ? '/investors/' + person.companySlug : null },
      { label: 'Company type', value: person.companyType || '—' }
    ];

    if (investor && investor.chequeSize) {
      snapshotItems.push({ label: 'Firm ticket size', value: investor.chequeSize, href: '/investors/' + investor.slug + '#firm-focus' });
    }
    if (investor && (investor.stages || []).length) {
      snapshotItems.push({
        label: 'Firm stages',
        value: investor.stages.slice(0, 2).join(' · ') + (investor.stages.length > 2 ? ' +' + (investor.stages.length - 2) : ''),
        href: '/investors/' + investor.slug + '#firm-focus'
      });
    }

    const snapshotStrip = snapshotItems.map((item) => {
      const inner =
        '<div class="inv-profile-metric-label">' + escapeHtml(item.label) + '</div>' +
        '<div class="inv-profile-metric-value">' + escapeHtml(item.value) + '</div>';
      const cls = 'inv-profile-metric' + (item.lead ? ' is-lead' : '');
      if (item.href) return '<a class="' + cls + '" href="' + escapeHtml(item.href) + '">' + inner + '</a>';
      return '<div class="' + cls + '">' + inner + '</div>';
    }).join('');

    snapshotSection =
      '<section class="inv-profile-section inv-profile-reveal is-visible" id="snapshot">' +
      '<div class="inv-profile-section-label">01 — Snapshot</div>' +
      '<div class="inv-profile-section-head"><h2>At a glance</h2><p>Where this person sits — and firm signals when they\'re linked to a fund profile.</p></div>' +
      '<div class="inv-profile-metric-strip">' + snapshotStrip + '</div>' +
      '</section>';
  }

  // Angel pages omit Snapshot — shift remaining labels so Firm focus starts at 01
  const sectionOffset = angelIndividual ? -1 : 0;
  const padSection = (n, text) => {
    const num = Math.max(1, n + sectionOffset);
    return String(num).padStart(2, '0') + ' — ' + text;
  };

  const colleagueCards = (colleagues || []).slice(0, 6).map((c) => (
    '<a class="inv-profile-related-card inv-person-colleague-card inv-profile-reveal" href="/people/' + escapeHtml(c.slug) + '">' +
      colleagueAvatarHtml(c) +
      '<div class="inv-person-colleague-copy">' +
        '<div class="inv-profile-related-type">' + escapeHtml(c.title || 'Investor') + '</div>' +
        '<h3>' + escapeHtml(c.name) + '</h3>' +
        '<p>' + escapeHtml(c.company || '') + '</p>' +
      '</div>' +
    '</a>'
  )).join('');

  const colleagueSection = colleagueCards
    ? (
      '<section class="inv-profile-section inv-person-team-section inv-profile-reveal" id="colleagues">' +
        '<div class="inv-profile-section-label">' + escapeHtml(padSection(6, 'Colleagues')) + '</div>' +
        '<div class="inv-profile-section-head"><h2>Others at ' + escapeHtml(person.company) + '</h2><p>More investors mapped to this firm in the directory.</p></div>' +
        '<div class="inv-profile-related-grid inv-person-colleague-grid">' + colleagueCards + '</div>' +
      '</section>'
    )
    : '';

  // Mweb: paint through 03 (Focus → Thesis → Activity) on first load; desktop keeps scroll-reveal
  const focusSection = firmFocusSection(person, investor, { visible: mwebFirstPaint, sectionOffset });
  const thesisSection = firmThesisSection(person, investor, { visible: mwebFirstPaint, sectionOffset });
  const extras = renderPersonExtrasHtml(person, investor, { sectionOffset, visible: mwebFirstPaint });
  const activitySection = extras.activityHtml;
  const portfolioSection = extras.portfolioHtml;
  const exploreSection = firmExploreSection(investor, { sectionOffset });

  const stickyNav = [
    '<nav class="inv-profile-sticky" id="inv-profile-sticky" aria-label="On this page">',
    snapshotSection ? '<a href="#snapshot" data-section="snapshot">Snapshot</a>' : '',
    focusSection ? '<a href="#firm-focus" data-section="firm-focus">Focus</a>' : '',
    thesisSection ? '<a href="#firm-thesis" data-section="firm-thesis">Thesis</a>' : '',
    activitySection ? '<a href="#firm-activity" data-section="firm-activity">Activity</a>' : '',
    portfolioSection ? '<a href="#firm-portfolio" data-section="firm-portfolio">Portfolio</a>' : '',
    colleagueSection ? '<a href="#colleagues" data-section="colleagues">Colleagues</a>' : '',
    exploreSection ? '<a href="#explore" data-section="explore">Explore</a>' : '',
    '</nav>'
  ].join('');

  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    jobTitle: person.title || undefined,
    email: person.email || undefined,
    image: person.photo ? 'https://vcdekho.com' + person.photo : undefined,
    worksFor: person.company ? { '@type': 'Organization', name: person.company } : undefined,
    sameAs: [person.linkedin, person.twitter].filter(Boolean)
  });

  const html = [
    '<!DOCTYPE html>',
    '<html lang="en" class="scrollable-page">',
    '<head>',
    '<script src="/js/analytics.js?v=2" defer></script>',
    '<script src="/js/nav.js?v=101" defer></script>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">',
    renderProfileHeadAssets(),
    '<title>' + escapeHtml(person.name) + ' | Investors | VC Dekho</title>',
    '<meta name="description" content="' + escapeHtml(metaDesc).slice(0, 160) + '">',
    '<link rel="canonical" href="https://vcdekho.com/people/' + escapeHtml(person.slug) + '">',
    '<link rel="icon" type="image/png" href="/assets/logoforvc.png">',
    '<meta name="robots" content="index, follow">',
    '<meta property="og:title" content="' + escapeHtml(person.name) + ' | VC Dekho">',
    '<meta property="og:description" content="' + escapeHtml(metaDesc).slice(0, 160) + '">',
    '<meta property="og:url" content="https://vcdekho.com/people/' + escapeHtml(person.slug) + '">',
    '<meta property="og:type" content="profile">',
    person.photo ? ('<meta property="og:image" content="https://vcdekho.com' + escapeHtml(person.photo) + '">') : '',
    '<script type="application/ld+json">' + schema + '</script>',
    '</head>',
    '<body class="scrollable-page inv-page inv-person-profile">',
    '<div class="app-container">',
    '<header class="site-header">',
    '<a href="/" class="logo-container"><img src="/assets/logoforvc.png" alt="VC Dekho Logo" class="logo-img"></a>',
    '<button class="nav-toggle" id="menu-toggle" aria-label="Toggle navigation menu"><span></span><span></span><span></span></button>',
    '<nav class="main-nav" id="navigation-bar">',
    '<a href="/" class="nav-link">Home</a>',
    '<a href="' + FUNDS_PATH + '" class="nav-link">' + FUNDS_LABEL + '</a>',
    '<a href="' + INVESTORS_PATH + '" class="nav-link active">' + INVESTORS_LABEL + '</a>',
    '<a href="/blog" class="nav-link">Blog</a>',
    '<a href="/news" class="nav-link">News</a>',
    '</nav></header>',
    '<main class="hero-showcase inv-detail-main">',
    '<div class="ambient-bg-wrapper"><div class="waitlist-bg"><div class="glow-orb orb-1"></div><div class="glow-orb orb-2"></div><div class="glow-orb orb-3"></div></div></div>',
    '<div class="inv-detail-wrap inv-profile-wrap">',
    '<div class="inv-breadcrumbs"><a href="/">Home</a><span>›</span><a href="' + INVESTORS_PATH + '">' + INVESTORS_LABEL + '</a><span>›</span><span class="current">' + escapeHtml(person.name) + '</span></div>',

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
    '<p class="inv-profile-hero-lead">' + escapeHtml(heroLead) + '</p>',
    '<div class="inv-profile-hero-actions">' + linkedinBtn + emailBtn + companyBtn + twitterBtn + '</div>',
    '</div>',
    '</div>',
    '</section>',
    peopleDirectoryWidget(),
    '</div>',

    '<div class="inv-profile-sticky-host" id="inv-profile-sticky-host">' + stickyNav + '</div>',
    earlyStickyPinScript(),

    snapshotSection,

    focusSection,
    thesisSection,
    activitySection,
    portfolioSection,
    colleagueSection,
    exploreSection,

    '<section class="blog-cta-banner" style="margin: 3rem 0 1rem;">',
    '<img src="/assets/blog_vc_dekho_cta.webp" alt="VC Dekho" class="blog-cta-bg" loading="lazy" decoding="async" fetchpriority="low">',
    '<div class="blog-cta-content">',
    '<h2 class="blog-cta-title">Find the right person to pitch</h2>',
    '<p class="blog-cta-desc">Search funds and the investors behind every fund on VC Dekho.</p>',
    '<a href="' + INVESTORS_PATH + '" class="blog-cta-btn">Browse investors</a>',
    '</div></section>',

    '</div></main></div>',
    '<script src="/js/auth.js" defer></script>',
    '<script src="/app.js" defer></script>',
    '<script src="/investors/lazy-portfolio-logos.js?v=1" defer></script>',
    '<script src="/investors/portfolio-section.js?v=4" defer></script>',
    '<script src="/investors/profile-sticky.js?v=6" defer></script>',
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

  setPublicHtmlCache(res, { varyMobile: true });
  return res.status(200).send(html);
}

module.exports = { renderPersonPage, renderPersonExtrasHtml, escapeHtml };
