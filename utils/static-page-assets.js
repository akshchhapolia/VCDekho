/**
 * Async CSS/fonts on mobile for static pages (home + directories).
 * Desktop keeps render-blocking stylesheets — design unchanged.
 */

const { FONTS_HREF, renderFontPreloads, renderFontLinks, renderLatinFontFaces } = require('./font-assets');

const HOME_CSS = [
  '/css/base.css?v=153',
  '/css/ambient.css?v=98',
  '/css/hero.css?v=97',
  '/css/announcement.css?v=145'
];

const DIRECTORY_CSS = [
  '/css/base.css?v=153',
  '/css/hero.css?v=97',
  '/css/ambient.css?v=98',
  '/css/announcement.css?v=145',
  '/css/directory-list.css?v=149'
];

const SHARED_CRITICAL = [
  ':root{--color-text-main:#1A1A1A;--color-text-light:#fff;--color-accent-orange:#ED572F;--font-heading:"Instrument Serif",Georgia,serif;--font-sans:"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;--page-padding:2.5rem}',
  '*{box-sizing:border-box;margin:0;padding:0}',
  'html,body{width:100%;background:#0b0b0d;color:rgba(255,255,255,.88);font-family:var(--font-sans);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}',
  'html.scrollable-page,body.scrollable-page{overflow-y:auto!important;overflow-x:hidden!important;height:auto!important}',
  '.app-container{display:flex;flex-direction:column;width:100%;min-height:100dvh;padding:1rem;gap:.75rem;max-width:1600px;margin:0 auto;position:relative;z-index:1}',
  '.site-header{display:flex;justify-content:space-between;align-items:center;width:100%;height:50px;position:relative;z-index:100;padding-top:env(safe-area-inset-top,0)}',
  '.logo-img{height:44px;width:auto;aspect-ratio:220/204;display:block}',
  '.main-nav{display:none}',
  '.nav-toggle{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:44px;min-height:44px;margin-left:auto;background:none;border:none;padding:.5rem;gap:5px}',
  '.nav-toggle span{display:block;width:22px;height:2px;background:#fff}',
  '@media(max-width:768px){.main-nav,#navigation-bar{display:flex;position:fixed;top:0;right:-100%;bottom:0;width:100%;height:100dvh;flex-direction:column;justify-content:center;gap:3rem;z-index:10040;background:#0b0b0d;padding:2rem 1.5rem}.main-nav.active,#navigation-bar.active{right:0;left:0}.nav-toggle.active,body.nav-open .nav-toggle{position:fixed;top:calc(.65rem + env(safe-area-inset-top,0px));right:1rem;z-index:10050}body.nav-open .site-header{z-index:10045!important;position:relative!important}body.nav-open .hero-content,body.nav-open .waitlist-content,body.nav-open .inv-detail-wrap,body.nav-open .inv-dir-wrap{z-index:0!important}}',
  '.ambient-bg-wrapper,.home-ambient{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}',
  '@media(min-width:769px){.main-nav{display:flex}.nav-toggle{display:none}.app-container{padding:var(--page-padding)}}',
  'html.vc-nav-pending .app-container{opacity:0;pointer-events:none}'
];

const HOME_CRITICAL_EXTRA = [
  'html.home-page,body.home-page{background:#000;color:rgba(255,255,255,.88)}',
  '.explore-skel{display:none;position:fixed;inset:0;z-index:500;background:#0b0b0d;padding:calc(1.25rem + env(safe-area-inset-top,0px)) 1.25rem 1.5rem;overflow:hidden;pointer-events:none}body.explore-pending{overflow:hidden}body.explore-pending .explore-skel{display:block}.explore-skel-heading{margin:0 0 .75rem;font-family:Georgia,serif;font-size:1.85rem;font-weight:400;color:#fff;line-height:1.2}.explore-skel-bar{display:block;border-radius:6px;background:linear-gradient(90deg,rgba(255,255,255,.05),rgba(255,255,255,.12),rgba(255,255,255,.05));background-size:200% 100%;animation:exploreSkel 1.2s ease-in-out infinite}.explore-skel-meta{width:28%;height:.7rem;margin-bottom:1.25rem}.explore-skel-row{width:100%;height:4.5rem;border-radius:16px;margin-bottom:.55rem}@keyframes exploreSkel{0%{background-position:100% 0}100%{background-position:-100% 0}}',
  // Must match css/hero.css + css/ambient.css mobile home — the previous
  // critical CSS described a different layout (orange CTA, sticky bar,
  // visible announcement) and that FOUC is why async CSS was reverted.
  '@media(max-width:768px){html.home-page,body.home-page{width:100%;height:auto!important;min-height:100dvh;overflow-x:clip!important;overflow-y:auto!important;background:#000!important}body.home-page.has-announcement{display:block;padding:0;margin:0}body.home-page .app-container,body.home-page.has-announcement .app-container{display:flex;flex-direction:column;width:100%;height:auto!important;min-height:100dvh;padding:calc(1.25rem + env(safe-area-inset-top,0px)) 1.5rem calc(1.5rem + env(safe-area-inset-bottom,0px));gap:1.5rem;overflow:visible;background:transparent}body.home-page .site-header{display:flex;justify-content:space-between;align-items:center;height:50px;width:100%;margin:0!important;padding:0!important;background:transparent}body.home-page .logo-img{height:40px;width:auto}body.home-page .logo-wordmark{color:#fff}body.home-page .nav-toggle span{background:#fff}body.home-page .announcement-strip,body.home-page .mobile-sticky-cta{display:none!important}body.home-page .hero-showcase,body.home-page.has-announcement .hero-showcase{position:relative;display:flex;flex-direction:column;flex:1 1 auto!important;min-height:550px!important;height:auto!important;border-radius:16px;overflow:hidden!important;background-color:#e2ddd5}body.home-page .hero-bg-fallback{display:block!important;position:absolute;inset:0;width:100%;height:100%;z-index:1;background-color:#e2ddd5;background-image:url(/assets/sand_bg.webp);background-size:cover;background-position:center}body.home-page .hero-bg{display:none!important}body.home-page .hero-overlay{position:absolute;inset:0;z-index:2;background:linear-gradient(135deg,rgba(0,0,0,.4),rgba(0,0,0,.15) 50%,rgba(0,0,0,.3));pointer-events:none}body.home-page .hero-content{position:relative;z-index:3;display:flex;flex-direction:column;justify-content:flex-start;flex:1 1 auto;padding:1.5rem 1.25rem .85rem;gap:1.25rem}body.home-page .hero-title{font-family:var(--font-heading);color:#fff;font-size:clamp(2.65rem,11.5vw,3.4rem)!important;line-height:1.08;font-weight:400}body.home-page .mweb-title-break{display:inline}body.home-page .highlight-text{display:inline-block;padding:0 12px;margin-top:.5rem;background:rgba(255,255,255,.12);color:#fff}body.home-page .hero-sub-tagline{display:block!important;margin-top:.85rem;font-size:.95rem!important;line-height:1.55;color:#fff;opacity:.9}body.home-page .hero-tagline-container{display:none!important}body.home-page .trend-card{position:static;order:3;width:100%;margin-top:auto;display:flex;flex-direction:column;gap:1rem;padding:1.75rem;border-radius:16px;border:1px solid rgba(255,255,255,.1);background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.03) 50%,rgba(237,87,47,.05))}body.home-page .trend-card-title{font-family:var(--font-sans);color:#fff;font-size:1.05rem;font-weight:600}body.home-page .trend-card-desc{display:block!important;color:rgba(255,255,255,.55);font-size:.85rem;line-height:1.5}body.home-page .trend-card-note{display:block!important;color:rgba(255,255,255,.42);font-size:.8rem;margin:0}body.home-page .trend-card-btn{display:inline-flex!important;align-items:center;justify-content:center;align-self:flex-end;padding:.7rem 1.35rem;background:linear-gradient(135deg,#fff,rgba(255,255,255,.92))!important;color:#0b0b0d!important;border:none;border-radius:999px;font-size:.8rem;font-weight:600;text-decoration:none}}'
];

const DIRECTORY_CRITICAL_EXTRA = [
  '.inv-dir-wrap{position:relative;z-index:1}',
  '.inv-dir-header{display:flex;flex-wrap:wrap;align-items:center;gap:.65rem;margin-bottom:1rem}',
  '.inv-dir-header h1{font-family:var(--font-heading);font-size:clamp(1.6rem,6vw,2.4rem);color:#fff;font-weight:400}',
  '.inv-dir-meta{color:rgba(255,255,255,.55);font-size:.88rem}',
  '.inv-dir-row-hit{position:absolute;inset:0;z-index:1;border-radius:inherit}',
  // Hide leftover SSR skeleton rows once the list is ready. While a filter
  // loads, aria-busy="true" and the skeleton must stay visible.
  '.inv-dir-results:not([aria-busy="true"]) .inv-dir-skel{display:none!important}',
  // Mobile-only row/card rules. Leaving these unscoped broke desktop: directory-list.css
  // never resets border-radius/background, so rows looked like mweb cards on wide screens.
  '@media(max-width:960px){',
  '.inv-dir-filters-toggle{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.65rem 1rem;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.04);color:#fff;font-family:var(--font-sans);font-size:.85rem;font-weight:600;cursor:pointer}',
  '.inv-dir-layout{display:grid;grid-template-columns:1fr;gap:1rem}',
  '.inv-dir-sidebar{position:fixed;top:0;left:0;bottom:0;width:min(320px,88vw);z-index:10035;background:#161618;border-right:1px solid rgba(255,255,255,.12);padding:calc(1.25rem + env(safe-area-inset-top,0px)) 1.15rem calc(1.5rem + env(safe-area-inset-bottom,0px));transform:translateX(-105%);transition:transform .25s ease;overflow-y:auto;overflow-x:hidden;gap:1rem;pointer-events:auto;box-shadow:8px 0 28px rgba(0,0,0,.45)}',
  '.inv-dir-sidebar.is-open{transform:translateX(0)}',
  '.inv-dir-sidebar-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:.25rem;color:#fff;font-size:.95rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase}',
  '.inv-dir-table-head{display:none}',
  '.inv-dir-main{min-width:0;width:100%}',
  '}',
  '@media(max-width:768px){',
  '.inv-dir-results{display:flex;flex-direction:column;gap:.55rem}',
  '.inv-dir-row{position:relative;display:grid;grid-template-columns:1fr;gap:.35rem;padding:.85rem;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)}',
  '.inv-dir-name{color:#fff;font-weight:600;font-size:.95rem}',
  '.inv-dir-type{color:rgba(255,255,255,.5);font-size:.72rem;text-transform:uppercase;letter-spacing:.04em}',
  '.inv-dir-cell,.inv-dir-ticket{color:rgba(255,255,255,.72);font-size:.82rem;line-height:1.4}',
  '}'
];

function renderBlockingDirectoryHead() {
  return renderFontLinks().concat([
    '<link rel="stylesheet" href="/css/base.css?v=153">',
    '<link rel="stylesheet" href="/css/hero.css?v=97">',
    '<link rel="stylesheet" href="/css/ambient.css?v=98">',
    '<link rel="stylesheet" href="/css/announcement.css?v=145">',
    '<link rel="stylesheet" href="/css/directory-list.css?v=149">'
  ]).join('\n    ');
}

function renderBlockingHomeHead() {
  return renderFontLinks().concat([
    '<link rel="stylesheet" href="/css/base.css?v=153">',
    '<link rel="stylesheet" href="/css/ambient.css?v=98">',
    '<link rel="stylesheet" href="/css/hero.css?v=97">',
    '<link rel="stylesheet" href="/css/announcement.css?v=145">'
  ]).join('\n    ');
}

function renderAsyncHeadAssets(mode) {
  const cssFiles = mode === 'home' ? HOME_CSS : DIRECTORY_CSS;
  const critical =
    mode === 'home'
      ? [renderLatinFontFaces()].concat(SHARED_CRITICAL, HOME_CRITICAL_EXTRA)
      : SHARED_CRITICAL.concat(DIRECTORY_CRITICAL_EXTRA);
  const filesJson = JSON.stringify(cssFiles);
  const fontsJson = JSON.stringify(FONTS_HREF);
  const noscriptLinks =
    '<link rel="stylesheet" href="' +
    FONTS_HREF +
    '">' +
    cssFiles.map((h) => '<link rel="stylesheet" href="' + h + '">').join('');

  return renderFontPreloads().concat([
    '<style id="static-critical-css">' + critical.join('') + '</style>',
    '<script>',
    '(function(){',
    'var files=' + filesJson + ';',
    'var fonts=' + fontsJson + ';',
    'var mweb=window.matchMedia("(max-width:768px)").matches;',
    'function addAsync(href){',
    'var l=document.createElement("link");',
    'l.rel="stylesheet";l.href=href;l.media="print";',
    'l.onload=function(){this.media="all"};',
    'document.head.appendChild(l);',
    '}',
    'if(mweb){addAsync(fonts);files.forEach(addAsync);}',
    'else{',
    'document.write(\'<link rel="stylesheet" href="\'+fonts+\'">\');',
    'files.forEach(function(h){document.write(\'<link rel="stylesheet" href="\'+h+\'">\');});',
    '}',
    '})();',
    '</script>',
    '<noscript>' + noscriptLinks + '</noscript>'
  ]).join('\n    ');
}

function renderHomeCriticalCss() {
  const homeExtra = HOME_CRITICAL_EXTRA.map((rule) => rule.replace(/body\.home-page/g, 'html.home-page'));
  return [renderLatinFontFaces()].concat(SHARED_CRITICAL, homeExtra).join('');
}

function renderDirectoryCriticalCss() {
  return [renderLatinFontFaces()].concat(SHARED_CRITICAL, DIRECTORY_CRITICAL_EXTRA).join('');
}

module.exports = {
  renderAsyncHeadAssets,
  renderBlockingHomeHead,
  renderBlockingDirectoryHead,
  renderHomeCriticalCss,
  renderDirectoryCriticalCss,
  HOME_CSS,
  DIRECTORY_CSS,
  FONTS_HREF
};
