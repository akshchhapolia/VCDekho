/**
 * Async CSS/fonts on mobile for static pages (home + directories).
 * Desktop keeps render-blocking stylesheets — design unchanged.
 */

const { FONTS_HREF, renderFontPreloads, renderFontLinks } = require('./font-assets');

const HOME_CSS = [
  '/css/base.css?v=146',
  '/css/ambient.css?v=98',
  '/css/hero.css?v=97'
];

const DIRECTORY_CSS = [
  '/css/base.css?v=146',
  '/css/hero.css?v=97',
  '/css/ambient.css?v=98',
  '/css/announcement.css?v=145',
  '/css/directory-list.css?v=145'
];

const SHARED_CRITICAL = [
  ':root{--color-text-main:#1A1A1A;--color-text-light:#fff;--color-accent-orange:#ED572F;--font-heading:"Instrument Serif",Georgia,serif;--font-sans:"Plus Jakarta Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;--page-padding:2.5rem}',
  '*{box-sizing:border-box;margin:0;padding:0}',
  'html,body{width:100%;background:#0b0b0d;color:rgba(255,255,255,.88);font-family:var(--font-sans);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}',
  'html.scrollable-page,body.scrollable-page{overflow-y:auto!important;overflow-x:hidden!important;height:auto!important}',
  '.app-container{display:flex;flex-direction:column;width:100%;min-height:100dvh;padding:1rem;gap:.75rem;max-width:1600px;margin:0 auto;position:relative;z-index:1}',
  '.site-header{display:flex;justify-content:space-between;align-items:center;width:100%;height:50px;position:relative;z-index:2;padding-top:env(safe-area-inset-top,0)}',
  '.logo-img{height:44px;width:auto;aspect-ratio:220/204;display:block}',
  '.main-nav{display:none}',
  '.nav-toggle{display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:44px;min-height:44px;margin-left:auto;background:none;border:none;padding:.5rem;gap:5px}',
  '.nav-toggle span{display:block;width:22px;height:2px;background:#fff}',
  '.ambient-bg-wrapper,.home-ambient{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}',
  '@media(min-width:769px){.main-nav{display:flex}.nav-toggle{display:none}.app-container{padding:var(--page-padding)}}'
];

const HOME_CRITICAL_EXTRA = [
  '.hero-showcase{position:relative;flex:1;display:flex;align-items:stretch;min-height:calc(100dvh - 120px);overflow:hidden;border-radius:24px}',
  '.hero-bg,.hero-bg-fallback{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#0b0b0d}',
  '.hero-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,11,13,.35) 0%,rgba(11,11,13,.75) 100%);pointer-events:none}',
  '.hero-content{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:space-between;width:100%;padding:1.25rem;min-height:100%}',
  '.hero-title{font-family:var(--font-heading);font-size:clamp(2.2rem,10vw,4.5rem);line-height:1.05;color:#fff;font-weight:400}',
  '.highlight-text{color:var(--color-accent-orange)}',
  '.hero-tagline{color:rgba(255,255,255,.72);font-size:.95rem;line-height:1.5;max-width:36rem}',
  '.trend-card{margin-top:auto;align-self:flex-end;max-width:22rem;padding:1.1rem;border-radius:18px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04)}',
  '.trend-card-title{font-family:var(--font-heading);font-size:1.35rem;color:#fff;margin:0 0 .45rem}',
  '.trend-card-desc,.trend-card-note{color:rgba(255,255,255,.65);font-size:.88rem;line-height:1.45;margin:0 0 .65rem}',
  '.trend-card-btn,.mobile-sticky-cta{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:.7rem 1rem;border-radius:12px;background:var(--color-accent-orange);color:#fff;text-decoration:none;font-weight:600;font-size:.9rem}',
  '.mobile-sticky-cta{position:fixed;left:1rem;right:1rem;bottom:max(1rem,env(safe-area-inset-bottom));z-index:20}',
  '.announcement-strip{position:relative;z-index:3;padding:.55rem 1rem;background:rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.08);font-size:.82rem}'
];

const DIRECTORY_CRITICAL_EXTRA = [
  '.inv-dir-wrap{position:relative;z-index:1}',
  '.inv-dir-header{display:flex;flex-wrap:wrap;align-items:center;gap:.65rem;margin-bottom:1rem}',
  '.inv-dir-header h1{font-family:var(--font-heading);font-size:clamp(1.6rem,6vw,2.4rem);color:#fff;font-weight:400}',
  '.inv-dir-meta{color:rgba(255,255,255,.55);font-size:.88rem}',
  '.inv-dir-layout{display:grid;grid-template-columns:1fr;gap:1rem}',
  '.inv-dir-table-head{display:none}',
  '.inv-dir-results{display:flex;flex-direction:column;gap:.55rem}',
  '.inv-dir-row{position:relative;display:grid;grid-template-columns:1fr;gap:.35rem;padding:.85rem;border-radius:16px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02)}',
  '.inv-dir-row-hit{position:absolute;inset:0;z-index:1;border-radius:inherit}',
  '.inv-dir-name{color:#fff;font-weight:600;font-size:.95rem}',
  '.inv-dir-type{color:rgba(255,255,255,.5);font-size:.72rem;text-transform:uppercase;letter-spacing:.04em}',
  '.inv-dir-cell,.inv-dir-ticket{color:rgba(255,255,255,.72);font-size:.82rem;line-height:1.4}',
  '.inv-dir-skel{display:none!important}'
];

function renderBlockingDirectoryHead() {
  return renderFontLinks().concat([
    '<link rel="stylesheet" href="/css/base.css?v=146">',
    '<link rel="stylesheet" href="/css/hero.css?v=97">',
    '<link rel="stylesheet" href="/css/ambient.css?v=98">',
    '<link rel="stylesheet" href="/css/announcement.css?v=145">',
    '<link rel="stylesheet" href="/css/directory-list.css?v=145">'
  ]).join('\n    ');
}

function renderBlockingHomeHead() {
  return renderFontLinks().concat([
    '<link rel="stylesheet" href="/css/base.css?v=146">',
    '<link rel="stylesheet" href="/css/ambient.css?v=98">',
    '<link rel="stylesheet" href="/css/hero.css?v=97">',
    '<link rel="stylesheet" href="/css/announcement.css?v=145">'
  ]).join('\n    ');
}

function renderAsyncHeadAssets(mode) {
  const cssFiles = mode === 'home' ? HOME_CSS : DIRECTORY_CSS;
  const critical =
    mode === 'home'
      ? SHARED_CRITICAL.concat(HOME_CRITICAL_EXTRA)
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

module.exports = {
  renderAsyncHeadAssets,
  renderBlockingHomeHead,
  renderBlockingDirectoryHead,
  HOME_CSS,
  DIRECTORY_CSS,
  FONTS_HREF
};
