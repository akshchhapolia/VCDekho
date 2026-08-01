/**
 * Head assets for firm + person profile pages.
 * Mweb: critical CSS + async full styles/fonts (same files — design unchanged).
 * Desktop: normal render-blocking stylesheets (unchanged behavior).
 */

const CSS_FILES = [
  '/css/base.css?v=114',
  '/css/hero.css?v=97',
  '/css/ambient.css?v=98',
  '/css/directory.css?v=114'
];

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap';

/** Compact first-paint styles for mweb profile hero (matches final CSS). */
const PROFILE_CRITICAL_CSS = [
  ':root{--color-text-main:#1A1A1A;--color-text-light:#fff;--color-accent-orange:#ED572F;--font-heading:"Instrument Serif",Georgia,serif;--font-sans:"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;--page-padding:2.5rem}',
  '*{box-sizing:border-box;margin:0;padding:0}',
  'html,body{width:100%;background:#0b0b0d;color:rgba(255,255,255,.88);font-family:var(--font-sans);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}',
  'html.scrollable-page,body.scrollable-page{overflow-y:auto!important;overflow-x:hidden!important;height:auto!important}',
  'body.scrollable-page::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;background:#0b0b0d;background-image:radial-gradient(ellipse 160% 120% at 15% -10%,rgba(237,87,47,.1),transparent 58%),radial-gradient(ellipse 120% 90% at 85% 15%,rgba(237,87,47,.05),transparent 55%)}',
  '.app-container{display:flex;flex-direction:column;width:100%;min-height:100dvh;padding:1rem;gap:.75rem;max-width:1600px;margin:0 auto;position:relative;z-index:1}',
  '.site-header{display:flex;justify-content:space-between;align-items:center;width:100%;height:50px;position:relative;z-index:2;padding-top:env(safe-area-inset-top,0)}',
  '.logo-img{height:44px;width:auto;display:block}',
  '.main-nav{display:none}',
  '.nav-toggle{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:44px;min-height:44px;margin-left:auto;background:none;border:none;padding:.5rem}',
  '.nav-toggle span{display:block;width:22px;height:2px;background:#fff;margin:0;flex-shrink:0}',
  '.nav-toggle{gap:5px}',
  '.hero-showcase{position:relative;background:transparent;overflow:visible;min-height:0}',
  '.ambient-bg-wrapper{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}',
  '.inv-detail-wrap,.inv-profile-wrap{max-width:1120px;margin:0 auto;position:relative;z-index:10;padding:0 20px 40px}',
  '.inv-breadcrumbs{display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:.9rem;color:rgba(255,255,255,.55);margin-bottom:1rem}',
  '.inv-breadcrumbs a{color:rgba(255,255,255,.55);text-decoration:none}',
  '.inv-profile-hero-row{display:grid;grid-template-columns:1fr;gap:.9rem;margin:0 0 1.25rem}',
  '.inv-profile-hero{position:relative;display:flex;flex-direction:column;padding:1.75rem 1.2rem 1.25rem;border-radius:24px;border:1px solid rgba(255,255,255,.1);overflow:hidden;background:rgba(255,255,255,.02)}',
  '.inv-profile-hero-wash{position:absolute;inset:-30%;background:radial-gradient(ellipse 90% 75% at 18% 28%,rgba(237,87,47,.16),transparent 72%);pointer-events:none}',
  '.inv-profile-hero-inner,.inv-profile-hero-copy{position:relative;z-index:1}',
  '.inv-profile-logo{width:56px;height:56px;border-radius:14px;object-fit:contain;margin-bottom:14px;background:rgba(255,255,255,.96);border:1.5px solid var(--color-accent-orange)}',
  '.inv-profile-type{display:inline-block;color:var(--color-accent-orange);font-size:.65rem;font-weight:600;letter-spacing:.07em;text-transform:uppercase;margin-bottom:.35rem}',
  '.inv-profile-title{font-family:var(--font-heading);font-size:clamp(1.6rem,7vw,2.2rem);color:#fff;line-height:1.15;font-weight:400;margin:0 0 .5rem}',
  '.inv-profile-hero-lead{color:rgba(255,255,255,.72);font-size:.95rem;line-height:1.5;margin:0 0 1rem}',
  '.inv-profile-hero-actions{display:flex;flex-wrap:wrap;gap:.5rem}',
  '.inv-profile-cta{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.65rem 1rem;border-radius:12px;text-decoration:none;font-size:.85rem;font-weight:600;color:#fff;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06)}',
  '.inv-profile-sticky-host{width:100vw;max-width:100vw;margin-left:calc(50% - 50vw)}',
  '.inv-profile-sticky{display:flex;flex-wrap:nowrap;gap:.15rem 1rem;overflow-x:auto;padding:.75rem max(1rem,env(safe-area-inset-left)) .65rem;border-bottom:1px solid rgba(255,255,255,.1);-webkit-overflow-scrolling:touch;scrollbar-width:none}',
  '.inv-profile-sticky a{flex:0 0 auto;color:rgba(255,255,255,.5);font-size:.82rem;font-weight:650;text-decoration:none;white-space:nowrap;padding:.45rem .35rem .6rem}',
  '.inv-profile-sticky a.is-active{color:#fff}',
  '.inv-profile-section{margin:1.5rem 0;color:rgba(255,255,255,.85)}',
  '.inv-profile-section-label{color:#ffb89c;font-size:.68rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.5rem}',
  '.inv-profile-section-head h2{font-family:var(--font-heading);font-size:1.45rem;font-weight:400;color:#fff;margin:0 0 .35rem}',
  /* Mweb-only first paint: hide dir widgets + hamburger shell (full CSS restores desktop) */
  '@media(max-width:768px){.inv-profile-dir-widget{display:none!important}.main-nav{display:none}.nav-toggle{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px}}',
  '@media(min-width:769px){.main-nav{display:flex}.nav-toggle{display:none}.app-container{padding:var(--page-padding)}.inv-profile-sticky-host{width:auto;max-width:none;margin-left:0}.inv-profile-sticky{overflow:visible;flex-wrap:wrap}}'
].join('');

function renderProfileHeadAssets() {
  const filesJson = JSON.stringify(CSS_FILES);
  const fontsJson = JSON.stringify(FONTS_HREF);
  const noscriptLinks =
    '<link rel="stylesheet" href="' +
    FONTS_HREF +
    '">' +
    CSS_FILES.map(function (h) {
      return '<link rel="stylesheet" href="' + h + '">';
    }).join('');

  return [
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<style id="profile-critical-css">' + PROFILE_CRITICAL_CSS + '</style>',
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
    'if(mweb){',
    'addAsync(fonts);',
    'files.forEach(addAsync);',
    '}else{',
    'document.write(\'<link rel="stylesheet" href="\'+fonts+\'">\');',
    'files.forEach(function(h){document.write(\'<link rel="stylesheet" href="\'+h+\'">\');});',
    '}',
    '})();',
    '</script>',
    '<noscript>' + noscriptLinks + '</noscript>'
  ].join('\n');
}

function isMobileRequest(req) {
  if (!req || !req.headers) return false;
  const ch = req.headers['sec-ch-ua-mobile'];
  if (ch === '?1') return true;
  if (ch === '?0') return false;
  return /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    String(req.headers['user-agent'] || '')
  );
}

module.exports = {
  renderProfileHeadAssets,
  isMobileRequest,
  CSS_FILES,
  FONTS_HREF
};
