#!/usr/bin/env node
/**
 * Perf build: split directory CSS, hero WebP, async head assets, pre-render directory rows.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  renderAsyncHeadAssets,
  renderBlockingDirectoryHead
} = require('../utils/static-page-assets');
const { filterInvestors, getFilters, toCard } = require('../utils/investors');
const {
  filterPeople,
  getFilters: getPeopleFilters,
  toCard: toPersonCard
} = require('../utils/people');
const { renderFundRows } = require('../utils/render-directory-rows');
const { renderPeopleRows } = require('../utils/render-people-rows');

const ROOT = path.join(__dirname, '..');
const PAGE_SIZE = 15;
const CSS_VERSION = '145';

const LIST_LINK_RULE_MARKER = '/* Directory list links — must stay in list bundle (not profile-only) */';

const LIST_SHARED_LINK_CSS = `
.inv-dir-guide-link {
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
}

.inv-dir-guide-link:hover {
  color: #ffd2c3;
  text-decoration: underline;
}

.inv-dir-cell a,
.inv-dir-ticket a,
.inv-dir-inline-link {
  position: relative;
  z-index: 2;
  color: inherit;
  text-decoration: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
}

.inv-dir-cell a:hover,
.inv-dir-ticket a:hover,
.inv-dir-inline-link:hover {
  color: #ffb89c;
  border-bottom-color: rgba(237, 87, 47, 0.55);
}
`.trim();

function splitDirectoryCss() {
  const src = path.join(ROOT, 'css', 'directory.css');
  const raw = fs.readFileSync(src, 'utf8');
  const marker = '/* Investor profile pages — editorial redesign */';
  const idx = raw.indexOf(marker);
  if (idx < 0) throw new Error('Profile CSS marker not found in directory.css');

  let listCss = raw.slice(0, idx).trimEnd();
  if (!listCss.includes(LIST_LINK_RULE_MARKER)) {
    listCss += '\n\n' + LIST_LINK_RULE_MARKER + '\n' + LIST_SHARED_LINK_CSS;
  }
  listCss += '\n';
  const profileCss = raw.slice(idx).trimStart();

  fs.writeFileSync(path.join(ROOT, 'css', 'directory-list.css'), listCss);
  fs.writeFileSync(path.join(ROOT, 'css', 'directory-profile.css'), profileCss);
  fs.writeFileSync(path.join(ROOT, 'css', 'directory.css'), listCss + '\n' + profileCss);
  console.log('Split directory.css → directory-list.css + directory-profile.css');
}

function buildHeroWebp() {
  const jpg = path.join(ROOT, 'assets', 'sand_bg.jpg');
  const webp = path.join(ROOT, 'assets', 'sand_bg.webp');
  if (!fs.existsSync(jpg)) return;
  try {
    execSync(`cwebp -q 82 "${jpg}" -o "${webp}"`, { stdio: 'pipe' });
    const before = fs.statSync(jpg).size;
    const after = fs.statSync(webp).size;
    console.log(`Created sand_bg.webp (${Math.round(after / 1024)}KB, was ${Math.round(before / 1024)}KB jpg)`);
  } catch (err) {
    console.warn('cwebp failed — skipping sand_bg.webp:', err.message);
  }
}

function patchHeroCssWebp() {
  if (!fs.existsSync(path.join(ROOT, 'assets', 'sand_bg.webp'))) return;
  const heroCss = path.join(ROOT, 'css', 'hero.css');
  let hero = fs.readFileSync(heroCss, 'utf8');
  hero = hero.replace(
    /background-image: url\('\/assets\/sand_bg\.jpg'\)/g,
    "background-image: url('/assets/sand_bg.webp')"
  );
  fs.writeFileSync(heroCss, hero);
}

function replaceHeadBlock(html) {
  return replaceDirectoryHeadBlock(html);
}

function stripLegacyStylesheetBlock(html) {
  html = html.replace(
    /\n    <!-- Stylesheets -->[\s\S]*?<link rel="stylesheet" href="\/css\/hero\.css[^"]*">\n/g,
    '\n'
  );
  // Remove stale blocking links left from older HTML (mixed v101 + directory.css bundles).
  html = html.replace(
    /\n    <link rel="stylesheet" href="\/css\/base\.css\?v=101">[\s\S]*?<link rel="stylesheet" href="\/css\/directory\.css[^"]*">\n/g,
    '\n'
  );
  html = html.replace(/<style id="static-critical-css">[\s\S]*?<\/style>\s*/g, '');
  html = html.replace(
    /<script>\s*\(function\(\)\{\s*var files=[\s\S]*?\}\)\(\);\s*<\/script>\s*/g,
    ''
  );
  html = html.replace(
    /<noscript><link rel="stylesheet" href="\/css\/fonts\.css[\s\S]*?<\/noscript>\s*/g,
    ''
  );
  return html;
}

// The asset block starts at the first font tag. The legacy Google Fonts
// preconnect is still accepted so this works on pages that predate the
// self-hosted font swap.
const HEAD_BLOCK_START =
  '[ \\t]*<link rel="(?:preload" href="/assets/fonts/[^"]*"|preconnect" href="https://fonts\\.googleapis\\.com")[^>]*>';

function headBlockRegex(extraStops = '') {
  // Lookahead must not leave the original indentation behind, or every rebuild adds a level.
  return new RegExp(
    HEAD_BLOCK_START +
      '[\\s\\S]*?(?=<title>|<link rel="icon"|' +
      extraStops +
      '<link rel="canonical"|<meta name="robots"|<meta property="og:|<meta name="description"|<meta name="theme-color")'
  );
}

function replaceDirectoryHeadBlock(html) {
  const assets = renderBlockingDirectoryHead();
  const re = headBlockRegex();
  if (!re.test(html)) {
    throw new Error('Could not find stylesheet block to replace');
  }
  return html.replace(re, assets + '\n    ');
}

function patchHomeHtml() {
  const file = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(file, 'utf8');

  html = stripLegacyStylesheetBlock(html);
  html = html.replace(/<link rel="stylesheet" href="\/css\/blog\.css[^"]*">\n?/g, '');

  if (fs.existsSync(path.join(ROOT, 'assets', 'sand_bg.webp'))) {
    html = html.replace(
      /<link rel="preload" as="image" href="\/assets\/sand_bg\.(jpg|webp)"[^>]*>/,
      '<link rel="preload" as="image" href="/assets/sand_bg.webp" type="image/webp" fetchpriority="high">'
    );
    html = html.replace(/poster="\/assets\/sand_bg\.jpg"/g, 'poster="/assets/sand_bg.webp"');
  }

  // Mobile: inline first-viewport CSS and fetch the rest async so a typed URL
  // can paint before five stylesheets round-trip. Desktop still document.write
  // blocking sheets (unchanged). Critical CSS must match hero/ambient mweb.
  const assets = renderAsyncHeadAssets('home');
  const re = headBlockRegex('<link rel="preload" as="image"|');
  if (!re.test(html)) {
    throw new Error('Could not find stylesheet block to replace in index.html');
  }
  html = html.replace(re, assets + '\n    ');
  fs.writeFileSync(file, html);
  console.log('Patched index.html (async CSS on mweb, blocking on desktop)');
}

function buildFundsPrerender() {
  const investors = filterInvestors({}).slice(0, PAGE_SIZE).map(toCard);
  const total = filterInvestors({}).length;
  const filters = getFilters();
  const rowsHtml = renderFundRows(investors, { mobile: false });
  const bootstrap = {
    total,
    offset: 0,
    limit: PAGE_SIZE,
    filters,
    investors,
    prerendered: true
  };

  const file = path.join(ROOT, 'funds', 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  html = stripLegacyStylesheetBlock(html);
  html = replaceHeadBlock(html);

  const resultsRe = /(<div id="inv-results" class="inv-dir-results")[^>]*>[\s\S]*?<\/div>\s*<div class="inv-dir-pager"/;
  html = html.replace(
    resultsRe,
    '$1 aria-busy="false">\n' + rowsHtml + '\n            </div>\n            <div class="inv-dir-pager"'
  );

  const countRe = /(<strong id="inv-count">)[^<]*(<\/strong>)/;
  html = html.replace(countRe, '$1' + total.toLocaleString('en-IN') + ' funds$2');

  const scriptTag =
    '<script type="application/json" id="inv-prerender">' +
    JSON.stringify(bootstrap).replace(/</g, '\\u003c') +
    '</script>\n  ';
  if (!html.includes('id="inv-prerender"')) {
    html = html.replace(/<script src="\/investors\/investors\.js/, scriptTag + '<script src="/investors/investors.js');
  } else {
    html = html.replace(
      /<script type="application\/json" id="inv-prerender">[\s\S]*?<\/script>/,
      scriptTag.trim()
    );
  }

  fs.writeFileSync(file, html);
  console.log('Pre-rendered', investors.length, 'fund rows in funds/index.html');
}

function buildInvestorsPrerender() {
  const all = filterPeople({});
  const people = all.slice(0, PAGE_SIZE).map((person) => toPersonCard(person));
  const total = all.length;
  const rowsHtml = renderPeopleRows(people);
  const bootstrap = {
    total,
    offset: 0,
    limit: PAGE_SIZE,
    filters: getPeopleFilters(),
    people,
    prerendered: true
  };

  const file = path.join(ROOT, 'investors', 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  html = stripLegacyStylesheetBlock(html);
  html = replaceHeadBlock(html);

  const resultsRe = /(<div id="ppl-results" class="inv-dir-results")[^>]*>[\s\S]*?<\/div>\s*<div class="inv-dir-pager"/;
  if (!resultsRe.test(html)) {
    throw new Error('Could not find #ppl-results block in investors/index.html');
  }
  html = html.replace(
    resultsRe,
    '$1 aria-busy="false">\n' + rowsHtml + '\n            </div>\n            <div class="inv-dir-pager"'
  );

  html = html.replace(
    /(<span id="ppl-count">)[^<]*(<\/span>)/,
    '$1' + total.toLocaleString('en-IN') + ' investors$2'
  );

  const scriptTag =
    '<script type="application/json" id="ppl-prerender">' +
    JSON.stringify(bootstrap).replace(/</g, '\\u003c') +
    '</script>\n  ';
  if (!html.includes('id="ppl-prerender"')) {
    html = html.replace(/<script src="\/js\/people\.js/, scriptTag + '<script src="/js/people.js');
  } else {
    html = html.replace(
      /<script type="application\/json" id="ppl-prerender">[\s\S]*?<\/script>/,
      scriptTag.trim()
    );
  }

  fs.writeFileSync(file, html);
  console.log('Pre-rendered', people.length, 'investor rows in investors/index.html');
}

function main() {
  splitDirectoryCss();
  buildHeroWebp();
  patchHeroCssWebp();
  patchHomeHtml();
  buildFundsPrerender();
  buildInvestorsPrerender();
  console.log('Static page perf build done (css v' + CSS_VERSION + ').');
}

main();
