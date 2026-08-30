#!/usr/bin/env node
/**
 * Pre-deploy smoke tests — fail fast before production ships broken SSR or imports.
 *
 * Usage:
 *   node scripts/smoke_test.js
 *   npm run smoke
 *
 * Exit 0 = safe to deploy. Exit 1 = do not deploy.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

require('dotenv').config();

const ROOT = path.join(__dirname, '..');

const failures = [];
const passes = [];

function pass(label) {
  passes.push(label);
  console.log('  ✓', label);
}

function fail(label, err) {
  const msg = err && (err.stack || err.message || String(err));
  failures.push({ label, msg });
  console.error('  ✗', label);
  if (msg) console.error('    ', String(msg).split('\n')[0]);
}

function walkJs(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walkJs(full, acc);
    else if (ent.name.endsWith('.js')) acc.push(full);
  }
  return acc;
}

function createMockRes() {
  const state = { statusCode: 200, headers: {}, body: '', ended: false };
  const res = {
    statusCode: 200,
    headersSent: false,
    status(code) {
      state.statusCode = code;
      this.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      state.headers[k.toLowerCase()] = v;
    },
    getHeader(k) {
      return state.headers[k.toLowerCase()];
    },
    json(obj) {
      state.body = JSON.stringify(obj);
      state.headers['content-type'] = 'application/json';
      this.headersSent = true;
      return this;
    },
    send(body) {
      state.body = typeof body === 'string' ? body : String(body);
      this.headersSent = true;
      return this;
    },
    end(chunk) {
      if (chunk != null) state.body += String(chunk);
      state.ended = true;
      this.headersSent = true;
    },
    writeHead(code, hdrs) {
      state.statusCode = code;
      this.statusCode = code;
      if (hdrs) Object.entries(hdrs).forEach(([k, v]) => this.setHeader(k, v));
      this.headersSent = true;
    }
  };
  return { res, state };
}

async function invokeHandler(handler, req) {
  const { res, state } = createMockRes();
  await handler(req, res);
  return state;
}

async function testModuleLoads() {
  console.log('\nModule loads');
  const apiFiles = walkJs(path.join(ROOT, 'server'));
  const renderFiles = fs
    .readdirSync(path.join(ROOT, 'utils'))
    .filter((f) => f.startsWith('render-') && f.endsWith('.js'))
    .map((f) => path.join(ROOT, 'utils', f));

  const extra = [
    path.join(ROOT, 'utils', 'site-icons.js'),
    path.join(ROOT, 'utils', 'run-ai-process.js'),
    path.join(ROOT, 'utils', 'run-daily-digest.js'),
    path.join(ROOT, 'utils', 'run-ai-blog.js')
  ];

  for (const file of [...apiFiles, ...renderFiles, ...extra]) {
    const rel = path.relative(ROOT, file);
    try {
      const mod = require(file);
      if (typeof mod !== 'function' && typeof mod !== 'object') {
        fail(`require ${rel}`, 'unexpected export type');
      } else {
        pass(`require ${rel}`);
      }
      delete require.cache[require.resolve(file)];
    } catch (err) {
      fail(`require ${rel}`, err);
    }
  }
}

function testStaticAssets() {
  console.log('\nStatic assets');
  const required = [
    'app/(home)/page.tsx',
    'app/layout.tsx',
    'next.config.js',
    'index.html',
    'funds/index.html',
    'investors/index.html',
    'favicon.ico',
    'favicon-48x48.png',
    'site.webmanifest',
    'data/investors.json',
    'data/sectors.js'
  ];

  for (const rel of required) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) {
      fail(`file exists: ${rel}`, 'missing');
      continue;
    }
    pass(`file exists: ${rel}`);
  }

  try {
    const video = path.join(ROOT, 'assets/mainvideo.v2.mp4');
    const bytes = fs.statSync(video).size;
    const kb = Math.round(bytes / 1024);
    if (bytes > 2.2 * 1024 * 1024) {
      fail('hero video size', `${kb}KB — re-encode with scripts/encode_hero_video.sh (CRF 32)`);
    } else if (bytes < 100 * 1024) {
      fail('hero video size', `${kb}KB — file looks empty or truncated`);
    } else {
      pass(`hero video ${kb}KB`);
    }
  } catch (err) {
    fail('hero video', err);
  }

  try {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    if (!html.includes('/favicon.ico')) {
      fail('index.html favicon', 'missing /favicon.ico link');
    } else {
      pass('index.html has /favicon.ico');
    }
  } catch (err) {
    fail('index.html favicon', err);
  }

  try {
    const page = fs.readFileSync(path.join(ROOT, 'app/(home)/page.tsx'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const nextLink =
      /<Link className="trend-card-btn" id="explore-btn" href="\/investors" prefetch>/.test(page);
    const hijacks =
      /getElementById\(['"]explore-btn['"]\)/.test(js) ||
      /exploreBtn\.addEventListener/.test(js);
    if (!nextLink || hijacks) {
      fail(
        'Start Exploring is a native link',
        `nextLink=${nextLink} hijacks=${hijacks} — home Start Exploring must be Next Link to /investors`
      );
    } else {
      pass('Start Exploring is a prefetching Next Link to /investors');
    }
  } catch (err) {
    fail('Start Exploring is a native link', err);
  }

  try {
    const page = fs.readFileSync(path.join(ROOT, 'app/(home)/page.tsx'), 'utf8');
    if (page.includes('explore-skel') || page.includes('explore-pending')) {
      fail('Start Exploring has no skeleton overlay', 'explore-skel must stay out of the Next home page');
    } else {
      pass('Start Exploring has no skeleton overlay (Link is the tap feedback)');
    }
  } catch (err) {
    fail('Start Exploring has no skeleton overlay', err);
  }

  try {
    const root = fs.readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8');
    const layout = fs.readFileSync(path.join(ROOT, 'app/(home)/layout.tsx'), 'utf8');
    const paintsDark =
      root.includes("background='#000'") ||
      root.includes('background="#000"') ||
      /background='#000'/.test(root);
    const heroInHead = root.includes('/css/hero.css?v=97') && layout.includes('id="vc-critical-css"');
    const sandPreload = layout.includes('/assets/sand_bg.webp');
    const earlyPeople = root.includes('beforeInteractive') && root.includes('people.js');
    if (!paintsDark) {
      fail('homepage first paint is dark', 'app/layout.tsx must set html background #000 on /');
    } else if (!heroInHead || !sandPreload) {
      fail(
        'homepage first paint is dark',
        `heroInHead=${heroInHead} sandPreload=${sandPreload} — hero CSS and sand image must be in the document head`
      );
    } else {
      pass('homepage first paint is dark (Next layout inline script)');
    }
    if (layout.includes('directory-profile.css')) {
      fail('home layout CSS', 'profile CSS must not block the homepage');
    } else if (root.includes('directory-list.css')) {
      fail('home layout CSS', 'directory-list.css must not block the homepage');
    } else {
      pass('homepage does not load directory CSS');
    }
  } catch (err) {
    fail('homepage first paint is dark', err);
  }

  try {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const { renderAsyncHeadAssets, HOME_CSS } = require('../utils/static-page-assets');
    const head = renderAsyncHeadAssets('home');
    const hidesAnnouncement = /body\.home-page \.announcement-strip,body\.home-page \.mobile-sticky-cta\{display:none!important\}/.test(
      head
    );
    const whiteCta = /body\.home-page \.trend-card-btn\{[^}]*color:#0b0b0d/.test(head);
    const sand = head.includes('sand_bg.webp');
    const hasAnnouncementCss = HOME_CSS.includes('/css/announcement.css?v=145');
    if (!hidesAnnouncement || !whiteCta || !sand || !hasAnnouncementCss) {
      fail(
        'homepage mweb critical CSS matches final layout',
        `hideAnn=${hidesAnnouncement} whiteCta=${whiteCta} sand=${sand} annCss=${hasAnnouncementCss}`
      );
    } else {
      pass('homepage mweb critical CSS helper still matches layout (legacy static head)');
    }
  } catch (err) {
    fail('homepage mweb critical CSS matches final layout', err);
  }

  try {
    const { renderDirectoryCriticalCss } = require('../utils/static-page-assets');
    const critical = renderDirectoryCriticalCss();
    const beforeMobile = critical.split('@media(max-width:960px)')[0] || critical;
    const unscopedCardRow = /\.inv-dir-row\{[^}]*border-radius:16px/.test(beforeMobile);
    const hasDrawerCss = critical.includes('@media(max-width:960px)') && critical.includes('.inv-dir-sidebar{position:fixed');
    if (unscopedCardRow || !hasDrawerCss) {
      fail(
        'directory critical CSS is mobile-scoped',
        `unscopedCardRow=${unscopedCardRow} hasDrawerCss=${hasDrawerCss}`
      );
    } else {
      pass('directory critical CSS is mobile-scoped');
    }
  } catch (err) {
    fail('directory critical CSS is mobile-scoped', err);
  }

  try {
    const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    const indexRule = (v.headers || []).find((h) => h.source === '/(funds|investors|blog)');
    const cc =
      indexRule &&
      (indexRule.headers || []).find((x) => x.key === 'Cache-Control');
    const cached = cc && /s-maxage=86400/.test(cc.value);
    const wwwRedirect = (v.redirects || []).some(
      (r) =>
        r.destination === 'https://vcdekho.com/:path*' &&
        Array.isArray(r.has) &&
        r.has.some((h) => h.value === 'www.vcdekho.com')
    );
    if (!cached) {
      fail(
        'directory index CDN cache',
        'vercel.json /funds /investors /blog must set s-maxage — /(.*) does not match the index itself'
      );
    } else if (!wwwRedirect) {
      fail('www canonical redirect', 'www.vcdekho.com must 301 to the apex');
    } else {
      pass('directory indexes are CDN-cached; www redirects to apex');
    }
  } catch (err) {
    fail('directory index CDN cache', err);
  }

  try {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
    const heroCss = fs.readFileSync(path.join(ROOT, 'css/hero.css'), 'utf8');
    const stripsSrc =
      html.includes("matchMedia('(max-width:992px)')") && html.includes('hero-background-media');
    const skipsMweb = /const skipVideo = prefersReducedMotion \|\| isMobile/.test(js);
    const hidesVideo = /body\.home-page \.hero-bg \{\s*display: none !important;/.test(heroCss);
    if (!stripsSrc || !skipsMweb || !hidesVideo) {
      fail(
        'mweb skips hero video',
        `strip=${stripsSrc} skipVideo=${skipsMweb} cssHide=${hidesVideo}`
      );
    } else {
      pass('mweb does not load the homepage hero video');
    }
  } catch (err) {
    fail('mweb skips hero video', err);
  }

  try {
    const auth = fs.readFileSync(path.join(ROOT, 'js/auth.js'), 'utf8');
    const session = fs.readFileSync(path.join(ROOT, 'js/directory-session.js'), 'utf8');
    // Signed-out visitors must not pay for the Supabase SDK just to label the
    // nav link, but every way a session can exist still has to be detected.
    const exported = /hasStoredSession: hasStoredSession/.test(auth);
    const checksCookie = /function hasStoredSession\(\)[\s\S]*?hasAccessCookie\(\)/.test(auth);
    const checksStorage = /\^sb-\.\+-auth-token\$/.test(auth);
    const checksRedirect = /code=/.test(auth) && /access_token=\|refresh_token=/.test(auth);
    const shortCircuits = /!window\.VCAuth\.hasStoredSession\(\)/.test(session);
    // Directory pages render one unlock button per row; each used to ask for a
    // session, which pulled the SDK back in even with the nav link fixed.
    const unlock = fs.readFileSync(path.join(ROOT, 'js/person-email-unlock.js'), 'utf8');
    const skipsHydrate =
      /function hydratePersistedEmails\([\s\S]{0,800}?hasStoredSession/.test(unlock);
    const cookieLogin =
      /function isProbablySignedIn\(/.test(unlock) &&
      /e\.preventDefault\(\);/.test(unlock) &&
      /if \(isProbablySignedIn\(\)\) \{\s*e\.preventDefault\(\);\s*e\.stopPropagation\(\);\s*unlockEmail\(btn\);/.test(unlock);
    const layout = fs.readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8');
    const cacheBust = layout.includes('person-email-unlock.js?v=15');
    if (!exported || !checksCookie || !checksStorage || !checksRedirect || !shortCircuits || !skipsHydrate || !cookieLogin || !cacheBust) {
      fail(
        'anonymous visitors skip Supabase',
        `exported=${exported} cookie=${checksCookie} storage=${checksStorage} ` +
          `redirect=${checksRedirect} shortCircuit=${shortCircuits} emailHydrate=${skipsHydrate} ` +
          `cookieLogin=${cookieLogin} cacheBust=${cacheBust}`
      );
    } else {
      pass('anonymous visitors skip the Supabase SDK');
    }
  } catch (err) {
    fail('anonymous visitors skip Supabase', err);
  }

  try {
    const db = fs.readFileSync(path.join(ROOT, 'utils/db.js'), 'utf8');
    const unlock = fs.readFileSync(path.join(ROOT, 'js/person-email-unlock.js'), 'utf8');
    const peopleApi = fs.readFileSync(path.join(ROOT, 'server/people.js'), 'utf8');
    const slimPool = /max:\s*1/.test(db);
    const skipsDirHydrate = /closest\('#ppl-results'\)/.test(unlock);
    const persistCaught = /email unlock persist failed/.test(peopleApi);
    const claimsAtomically =
      peopleApi.includes('claimPersonEmailUnlock') &&
      fs.readFileSync(path.join(ROOT, 'utils/person-email-unlocks.js'), 'utf8').includes('pg_advisory_xact_lock');
    const queuesClicks = unlock.includes('unlockChain') && unlock.includes('dailyLimitHit');
    if (!slimPool || !skipsDirHydrate || !persistCaught || !claimsAtomically || !queuesClicks) {
      fail(
        'unlock survives db pool exhaustion',
        `pool=${slimPool} skipDirHydrate=${skipsDirHydrate} persistCaught=${persistCaught} claim=${claimsAtomically} queue=${queuesClicks}`
      );
    } else {
      pass('unlock survives db pool exhaustion');
    }
  } catch (err) {
    fail('unlock survives db pool exhaustion', err);
  }

  try {
    const src = fs.readFileSync(path.join(ROOT, 'utils/people-contacts.js'), 'utf8');
    const bundled = src.includes("require('./_data/people-contacts.bySlug.json')");
    const { getPersonContact, loadContactsBySlug } = require(path.join(ROOT, 'utils/people-contacts'));
    const n = Object.keys(loadContactsBySlug() || {}).length;
    const sample = getPersonContact('aakrit-vaish');
    if (!bundled || n < 1000 || !sample || !String(sample.email || '').includes('@')) {
      fail(
        'contacts JSON is readable for unlock',
        `bundled=${bundled} n=${n} sample=${Boolean(sample && sample.email)}`
      );
    } else {
      pass('contacts JSON is readable for unlock');
    }
  } catch (err) {
    fail('contacts JSON is readable for unlock', err);
  }

  try {
    // These are lazy-loaded and full-bleed, so without intrinsic dimensions each
    // one shoves the article down as it arrives (CLS 0.17 on /blog/top-vc-firms-india).
    const offenders = [];
    let total = 0;
    for (const file of fs.readdirSync(path.join(ROOT, 'blog')).filter((f) => f.endsWith('.html'))) {
      const html = fs.readFileSync(path.join(ROOT, 'blog', file), 'utf8');
      for (const tag of html.match(/<img[^>]*class="blog-image"[^>]*>/g) || []) {
        total++;
        if (!/\bwidth="\d+"/.test(tag) || !/\bheight="\d+"/.test(tag)) offenders.push(file);
      }
    }
    if (offenders.length) {
      fail('blog images reserve space', `${offenders.length} without width/height: ${[...new Set(offenders)].join(', ')}`);
    } else {
      pass(`blog images reserve space (${total} images)`);
    }
  } catch (err) {
    fail('blog images reserve space', err);
  }

  try {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/investors.json'), 'utf8'));
    if (!data.count || !Array.isArray(data.investors) || data.investors.length < 100) {
      fail('investors.json', 'invalid or too few investors');
    } else {
      pass(`investors.json (${data.count} funds)`);
    }
  } catch (err) {
    fail('investors.json parse', err);
  }

  try {
    const listCss = fs.readFileSync(path.join(ROOT, 'css/directory-list.css'), 'utf8');
    if (!/\.inv-dir-cell a,\s*\n\.inv-dir-ticket a,\s*\n\.inv-dir-inline-link \{[\s\S]*?color:\s*inherit/.test(listCss)) {
      fail('directory-list.css link styles', 'missing directory inline link color rules');
    } else {
      pass('directory-list.css styles inline links');
    }
    if (!/\.inv-email-unlock-btn \{[\s\S]*?border-radius:\s*999px/.test(listCss)) {
      fail('directory-list.css email unlock', 'missing .inv-email-unlock-btn pill styles');
    } else {
      pass('directory-list.css styles email unlock CTA');
    }
    if (!/body\.inv-people-dir[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1\.32fr\)/.test(listCss)) {
      fail('directory-list.css people grid', 'missing people directory column layout');
    } else {
      pass('directory-list.css people directory grid');
    }
    const peopleJs = fs.readFileSync(path.join(ROOT, 'js/people.js'), 'utf8');
    const { renderDirectoryCriticalCss } = require('../utils/static-page-assets');
    const dirCritical = renderDirectoryCriticalCss();
    const hidesSkelAlways = /(^|})\.inv-dir-skel\{display:none!important\}/.test(dirCritical);
    const hidesSkelWhenReady = dirCritical.includes('.inv-dir-results:not([aria-busy="true"]) .inv-dir-skel');
    if (
      !peopleJs.includes('inv-skel-mark') ||
      !peopleJs.includes('inv-skel-pill') ||
      !listCss.includes('.inv-skel-mark') ||
      hidesSkelAlways ||
      !hidesSkelWhenReady
    ) {
      fail(
        'directory filter skeleton',
        `people list must show row-shaped skeletons while a filter loads (hidesAlways=${hidesSkelAlways} hidesWhenReady=${hidesSkelWhenReady})`
      );
    } else {
      pass('directory filter skeleton');
    }
  } catch (err) {
    fail('directory-list.css link styles', err);
  }

  testDirectoryPrerender('funds/index.html', 'inv-results', 'inv-prerender', 'investors');
  testDirectoryPrerender('investors/index.html', 'ppl-results', 'ppl-prerender', 'people');
  testListIndexShape();
  testSelfHostedFonts();
  testProfileClsGuards();
}

/**
 * Fonts are self-hosted as an exact mirror of Google's payload. These guard
 * the two ways that can silently regress the site's typography.
 */
function testSelfHostedFonts() {
  try {
    const css = fs.readFileSync(path.join(ROOT, 'css/fonts.css'), 'utf8');

    // Every woff2 the CSS points at must actually be deployed.
    const refs = [...css.matchAll(/url\((\/assets\/fonts\/[^)]+)\)/g)].map((m) => m[1]);
    const missing = [...new Set(refs)].filter((r) => !fs.existsSync(path.join(ROOT, r.replace(/^\//, ''))));
    if (missing.length) {
      fail('self-hosted fonts', `missing files: ${missing.join(', ')}`);
      return;
    }

    // Plus Jakarta Sans is variable; the stylesheets use 650 and 800, which are
    // not declared and must keep snapping to the 700 face. A collapsed range
    // (e.g. `font-weight: 200 900`) would render those at their true weights.
    if (/font-weight:\s*\d+\s+\d+/.test(css)) {
      fail('self-hosted fonts', 'a @font-face declares a weight RANGE — this changes how 650/800 render');
      return;
    }
    const weights = [...new Set([...css.matchAll(/font-weight:\s*(\d+)/g)].map((m) => m[1]))].sort();
    const expected = ['300', '400', '500', '600', '700'];
    if (expected.some((w) => !weights.includes(w))) {
      fail('self-hosted fonts', `expected discrete weights ${expected.join('/')}, found ${weights.join('/')}`);
      return;
    }

    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/fonts.manifest.json'), 'utf8'));
    const tampered = manifest.files.filter((f) => {
      const p = path.join(ROOT, 'assets/fonts', f.file);
      if (!fs.existsSync(p)) return true;
      return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex') !== f.sha256;
    });
    if (tampered.length) {
      fail('self-hosted fonts', `${tampered.length} font file(s) no longer match Google's bytes`);
      return;
    }

    pass(`self-hosted fonts (${[...new Set(refs)].length} files, weights ${weights.join('/')})`);
  } catch (err) {
    fail('self-hosted fonts', err);
  }

  try {
    const stale = [];
    walkHtml(ROOT).forEach((file) => {
      const html = fs.readFileSync(file, 'utf8');
      if (html.includes('fonts.googleapis.com') || html.includes('fonts.gstatic.com')) {
        stale.push(path.relative(ROOT, file));
      }
    });
    if (stale.length) {
      fail('no third-party font origins', `${stale.length} page(s) still hit Google: ${stale.slice(0, 3).join(', ')}`);
    } else {
      pass('no page references fonts.googleapis.com / fonts.gstatic.com');
    }
  } catch (err) {
    fail('no third-party font origins', err);
  }
}

function walkHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkHtml(full, out);
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/**
 * The list index stores ids and rebuilds labels on load. Guard both halves:
 * the file must stay slim, and the hydrated records must still expose labels.
 */
function testListIndexShape() {
  try {
    const file = path.join(ROOT, 'data/investors.index.json');
    const sizeKb = Math.round(fs.statSync(file).size / 1024);
    if (sizeKb > 800) {
      fail('investors.index.json size', `${sizeKb}KB — label arrays may have crept back in`);
    } else {
      pass(`investors.index.json is slim (${sizeKb}KB)`);
    }

    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    const stored = raw.investors.filter((i) => i.stages || i.sectors || i.thesisThemes);
    if (stored.length) {
      fail('investors.index.json shape', `${stored.length} records still store derivable label arrays`);
    } else {
      pass('investors.index.json stores ids only');
    }

    const { getAllInvestors, toCard } = require(path.join(ROOT, 'utils/investors.js'));
    const hydrated = getAllInvestors();
    const missing = hydrated.filter(
      (i) =>
        !Array.isArray(i.stages) ||
        !Array.isArray(i.sectors) ||
        !Array.isArray(i.thesisThemes) ||
        !i.type ||
        i.stages.length !== (i.stageIds || []).length ||
        i.sectors.length !== (i.sectorIds || []).length ||
        i.thesisThemes.length !== (i.thesisThemeIds || []).length
    );
    if (missing.length) {
      fail('list index hydration', `${missing.length} records missing rebuilt labels (e.g. ${missing[0].slug})`);
      return;
    }

    const sample = toCard(hydrated.find((i) => i.sectorIds && i.sectorIds.length) || hydrated[0]);
    if (!sample.sectors.length || typeof sample.sectors[0] !== 'string' || !sample.type) {
      fail('list index hydration', 'toCard() produced empty labels');
      return;
    }
    pass(`list index hydrates labels (${hydrated.length} records)`);
  } catch (err) {
    fail('list index shape', err);
  }
}

function testDirectoryPrerender(relPath, resultsId, bootstrapId, collection) {
  const label = `${relPath} pre-render`;
  try {
    const html = fs.readFileSync(path.join(ROOT, relPath), 'utf8');

    const rows = (html.match(/<article class="inv-dir-row">/g) || []).length;
    if (rows < 15) {
      fail(label, `expected 15 pre-rendered rows, found ${rows}`);
      return;
    }
    if (!new RegExp(`<div id="${resultsId}"[^>]*aria-busy="false"`).test(html)) {
      fail(label, `#${resultsId} still marked aria-busy="true"`);
      return;
    }

    const match = html.match(
      new RegExp(`<script type="application/json" id="${bootstrapId}">([\\s\\S]*?)</script>`)
    );
    if (!match) {
      fail(label, `missing #${bootstrapId} bootstrap JSON`);
      return;
    }
    const data = JSON.parse(match[1].replace(/\\u003c/g, '<'));
    if (!data.prerendered || !Array.isArray(data[collection]) || data[collection].length !== 15) {
      fail(label, `bootstrap JSON missing 15 ${collection}`);
      return;
    }
    if (!data.total || !data.filters) {
      fail(label, 'bootstrap JSON missing total/filters');
      return;
    }
    pass(`${label} (${rows} rows, ${data.total.toLocaleString('en-IN')} total)`);
  } catch (err) {
    fail(label, err);
  }
}

function testProfileClsGuards() {
  try {
    const { renderProfileHeadAssets, renderProfileCriticalCss } = require(path.join(ROOT, 'utils/profile-page-assets.js'));
    const criticalFn = renderProfileCriticalCss();
    if (typeof criticalFn !== 'string' || !criticalFn.length) {
      fail('profile critical CSS helper', 'renderProfileCriticalCss() must return a non-empty string');
      return;
    }
    const html = renderProfileHeadAssets();
    const critical = (html.match(/<style id="profile-critical-css">([\s\S]*?)<\/style>/) || [])[1] || '';
    const need = [
      ['title size', 'clamp(2.6rem,6.5vw,4.1rem)'],
      ['hero meta', '.inv-profile-hero-meta{'],
      ['active badge', '.inv-profile-active-badge{'],
      ['cta pills', 'border-radius:999px'],
      ['latin faces', 'plus-jakarta-sans-latin.woff2'],
      ['initials mark', '.inv-profile-logo-fallback{']
    ];
    const missing = need.filter(([, needle]) => !critical.includes(needle)).map(([n]) => n);
    if (missing.length) {
      fail('profile critical CSS matches final hero', `missing ${missing.join(', ')} — compact first-paint CSS causes CLS`);
    } else {
      pass('profile critical CSS matches final hero');
    }
    const personPage = fs.readFileSync(path.join(ROOT, 'utils/render-person-page.js'), 'utf8');
    if (!personPage.includes("unlockEmailButtonHtml(person.slug, 'inv-profile-cta is-ghost')")) {
      fail('profile unlock email uses ghost CTA', 'person profile Unlock email must match other ghost hero buttons');
    } else {
      pass('profile unlock email uses ghost CTA');
    }
  } catch (err) {
    fail('profile critical CSS matches final hero', err);
  }

  try {
    const boot = fs.readFileSync(path.join(ROOT, 'public/js/profile-page-boot.js'), 'utf8');
    if (!boot.includes('inv-profile-ready') || !boot.includes('DOMContentLoaded') || !boot.includes('VCProfilePage')) {
      fail('profile boot script auto-starts', 'profile-page-boot.js must reveal content without inline body scripts');
    } else {
      pass('profile boot script auto-starts');
    }
  } catch (err) {
    fail('profile boot script auto-starts', err);
  }

  try {
    const nav = fs.readFileSync(path.join(ROOT, 'public/js/nav.js'), 'utf8');
    const root = fs.readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8');
    if (
      !nav.includes("document.addEventListener('click', onDocumentClick, true)") ||
      !root.includes('nav.js?v=104') ||
      nav.includes('appendChild(nav)')
    ) {
      fail('nav uses document click delegation', 'menu must toggle in place without portaling on first open');
    } else {
      pass('nav uses document click delegation');
    }
  } catch (err) {
    fail('nav uses document click delegation', err);
  }

  try {
    const peopleLayout = fs.readFileSync(path.join(ROOT, 'app/investors/(directory)/layout.tsx'), 'utf8');
    const fundsLayout = fs.readFileSync(path.join(ROOT, 'app/funds/(directory)/layout.tsx'), 'utf8');
    const peopleBrowser = fs.readFileSync(path.join(ROOT, 'app/investors/PeopleDirectoryBrowser.tsx'), 'utf8');
    const fundsBrowser = fs.readFileSync(path.join(ROOT, 'app/funds/FundsDirectoryBrowser.tsx'), 'utf8');
    const inMemory =
      !peopleLayout.includes('people.js') &&
      !fundsLayout.includes('investors.js') &&
      peopleBrowser.includes("'use client'") &&
      peopleBrowser.includes('useMemo') &&
      fundsBrowser.includes('useMemo') &&
      peopleBrowser.includes('prefetch');
    if (!inMemory) {
      fail(
        'directory is in-memory React (Founder Tape model)',
        'directory layouts must not load people.js / investors.js; browsers filter in useMemo'
      );
    } else {
      pass('directory is in-memory React (no people.js / investors.js on the page)');
    }
  } catch (err) {
    fail('directory scripts schedule boot on DOMContentLoaded', err);
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    const e2e = fs.readFileSync(path.join(ROOT, 'e2e/golden-paths.spec.js'), 'utf8');
    const canary = fs.readFileSync(path.join(ROOT, 'scripts/canary_prod.js'), 'utf8');
    const deploy = fs.readFileSync(path.join(ROOT, 'scripts/deploy_prod.js'), 'utf8');
    const db = fs.readFileSync(path.join(ROOT, 'utils/db.js'), 'utf8');
    const ops = fs.readFileSync(path.join(ROOT, 'server/ops.js'), 'utf8');
    const peopleJs = fs.readFileSync(path.join(ROOT, 'js/people.js'), 'utf8');
    const auth = fs.readFileSync(path.join(ROOT, 'js/auth.js'), 'utf8');
    const layout = fs.readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8');
    const ci = fs.readFileSync(path.join(ROOT, '.github/workflows/smoke.yml'), 'utf8');
    const ok =
      pkg.scripts['test:e2e'] &&
      pkg.scripts['deploy:prod'] === 'node scripts/deploy_prod.js' &&
      e2e.includes('waitForPeopleFilters') &&
      e2e.includes('inv-dir-empty-state') &&
      e2e.includes('data-unlock-email') &&
      e2e.includes('#otp-step') &&
      canary.includes('/api/people?limit=1') &&
      canary.includes('contact=email') &&
      deploy.includes('canary_prod.js') &&
      db.includes('isPoolExhausted') &&
      ops.includes("action === 'client-error'") &&
      peopleJs.includes('function isSignedIn') &&
      auth.includes('isProbablySignedIn: hasStoredSession') &&
      layout.includes('report.js?v=1') &&
      ci.includes('test:e2e');
    if (!ok) {
      fail('core-path guards', 'missing Playwright / canary / report wiring');
    } else {
      pass('core-path guards (e2e, canary, deploy, alerts)');
    }
  } catch (err) {
    fail('core-path guards', err);
  }

  try {
    const stale = [];
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.isFile() && entry.name.endsWith('.html')) {
          const html = fs.readFileSync(full, 'utf8');
          const imgs = html.match(/<img\b[^>]*class="logo-img"[^>]*>/g) || [];
          imgs.forEach((tag) => {
            if (!/width="220"/.test(tag) || !/height="204"/.test(tag)) {
              stale.push(path.relative(ROOT, full));
            }
          });
        }
      }
    }
    walk(ROOT);
    if (stale.length) {
      fail('logo width/height', `${stale.length} page(s) missing intrinsic size: ${stale.slice(0, 3).join(', ')}`);
    } else {
      pass('nav logo has width/height on every page');
    }
  } catch (err) {
    fail('logo width/height', err);
  }
}

function testSiteIcons() {
  console.log('\nShared utilities');
  try {
    const { renderFaviconLinks, renderLogoImg } = require(path.join(ROOT, 'utils/site-icons.js'));
    const links = renderFaviconLinks();
    if (!Array.isArray(links) || links.length < 4) {
      fail('renderFaviconLinks()', 'expected >= 4 link tags');
    } else if (!links.some((l) => l.includes('/favicon.ico'))) {
      fail('renderFaviconLinks()', 'missing favicon.ico');
    } else {
      pass('renderFaviconLinks()');
    }
    const logo = renderLogoImg();
    if (!logo.includes('width="220"') || !logo.includes('height="204"')) {
      fail('renderLogoImg()', 'missing intrinsic width/height');
    } else {
      pass('renderLogoImg()');
    }
  } catch (err) {
    fail('renderFaviconLinks()', err);
  }
}

async function getNewsSmokeCase() {
  const mockSlug = 'startup-tech-digest-2026-06-18';
  const mockNeedle = 'Daily Digest';

  if (process.env.DATABASE_URL) {
    try {
      const db = require(path.join(ROOT, 'utils/db'));
      const { rows } = await db.query(
        `SELECT slug, title FROM articles WHERE status = 'published' ORDER BY published_at DESC LIMIT 1`
      );
      if (rows[0]) {
        return {
          slug: rows[0].slug,
          bodyIncludes: rows[0].title.split('|')[0].trim().slice(0, 20)
        };
      }
    } catch (_) {
      /* fall through to mock */
    }
  }

  return { slug: mockSlug, bodyIncludes: mockNeedle };
}

async function testSsrHandlers() {
  console.log('\nSSR handlers');

  const detail = require(path.join(ROOT, 'server/investors/detail.js'));
  const people = require(path.join(ROOT, 'server/people.js'));
  const article = require(path.join(ROOT, 'server/news/article.js'));
  const list = require(path.join(ROOT, 'server/investors/list.js'));
  const ops = require(path.join(ROOT, 'server/ops.js'));

  const newsCase = await getNewsSmokeCase();

  const cases = [
    {
      label: 'fund profile /funds/108-capital',
      handler: detail,
      req: { query: { slug: '108-capital' }, headers: {}, method: 'GET' },
      expectStatus: 200,
      bodyIncludes: '108 Capital'
    },
    {
      label: 'fund profile /funds/sequoia-india-peak-xv',
      handler: detail,
      req: { query: { slug: 'sequoia-india-peak-xv' }, headers: {}, method: 'GET' },
      expectStatus: 200,
      bodyIncludes: 'Peak XV'
    },
    {
      label: 'sector guide /funds/sectors/fintech',
      handler: detail,
      req: { query: { slug: 'fintech', view: 'sector' }, headers: {}, method: 'GET' },
      expectStatus: 200,
      bodyIncludes: 'Fintech'
    },
    {
      label: 'stage guide /funds/stages/seed',
      handler: detail,
      req: { query: { slug: 'seed', view: 'stage' }, headers: {}, method: 'GET' },
      expectStatus: 200,
      bodyIncludes: 'Seed'
    },
    {
      label: 'person profile /investors/shreya',
      handler: people,
      req: { query: { slug: 'shreya' }, headers: {}, method: 'GET' },
      expectStatus: 200,
      bodyIncludes: 'Shreya'
    },
    {
      label: `news article (${newsCase.slug})`,
      handler: article,
      req: { query: { slug: newsCase.slug }, headers: {}, method: 'GET' },
      expectStatus: 200,
      bodyIncludes: newsCase.bodyIncludes
    },
    {
      label: 'sectors API list',
      handler: list,
      req: { query: { view: 'sectors' }, headers: {}, method: 'GET' },
      expectStatus: 200,
      bodyIncludes: 'cyber-security'
    }
  ];

  for (const tc of cases) {
    try {
      const state = await invokeHandler(tc.handler, tc.req);
      if (state.statusCode !== tc.expectStatus) {
        fail(tc.label, `expected HTTP ${tc.expectStatus}, got ${state.statusCode}`);
        continue;
      }
      const body = state.body || '';
      if (tc.bodyIncludes && !body.includes(tc.bodyIncludes)) {
        fail(tc.label, `body missing "${tc.bodyIncludes}"`);
        continue;
      }
      if (body.length < 500 && tc.expectStatus === 200) {
        fail(tc.label, `body too short (${body.length} chars)`);
        continue;
      }
      pass(tc.label);
    } catch (err) {
      fail(tc.label, err);
    }
  }

  try {
    const state = await invokeHandler(ops, {
      query: { action: 'health' },
      headers: {},
      method: 'GET'
    });
    if (state.statusCode !== 200 && state.statusCode !== 503) {
      fail('ops health', `unexpected status ${state.statusCode}`);
    } else if (!state.body.includes('"ok"')) {
      fail('ops health', 'invalid JSON body');
    } else {
      pass(`ops health (HTTP ${state.statusCode})`);
    }
  } catch (err) {
    fail('ops health', err);
  }
}

function testNextAppShell() {
  console.log('\nNext app shell');

  try {
    const cfg = fs.readFileSync(path.join(ROOT, 'next.config.js'), 'utf8');
    const hasGuides =
      cfg.includes("/funds/stages/:slug") &&
      cfg.includes('view=stage') &&
      cfg.includes("/funds/themes/:slug") &&
      cfg.includes("/funds/sectors/:slug");
    const loginRoute = fs.readFileSync(path.join(ROOT, 'app/login/route.ts'), 'utf8');
    const loginJs = fs.readFileSync(path.join(ROOT, 'login.js'), 'utf8');
    const loginHtml = fs.readFileSync(path.join(ROOT, 'login.html'), 'utf8');
    const hasLogin = fs.existsSync(path.join(ROOT, 'app/login/route.ts'));
    const loginCached = loginRoute.includes('force-static') && !loginRoute.includes('no-store');
    const oauthReturn = loginJs.includes('function hasOAuthCallback') && loginJs.includes('location.replace');
    const cacheBust = loginHtml.includes('login.js?v=113') && loginHtml.includes('supabase.min.js');
    const hashNext = loginJs.includes('hashNext') && loginJs.includes("hashNext.startsWith('/')");
    if (!hasGuides || !hasLogin) {
      fail('next.config keeps guides and login on the old stack', `guides=${hasGuides} loginRoute=${hasLogin}`);
    } else if (!loginCached || !oauthReturn || !cacheBust || !hashNext) {
      fail(
        'login return path',
        `cached=${loginCached} oauthReturn=${oauthReturn} cacheBust=${cacheBust} hashNext=${hashNext}`
      );
    } else {
      pass('login route + fund guide slug rewrites are in place');
    }
  } catch (err) {
    fail('next.config keeps guides and login on the old stack', err);
  }

  try {
    const routes = fs.readFileSync(path.join(ROOT, 'lib/app-routes.ts'), 'utf8');
    const runtime = fs.readFileSync(path.join(ROOT, 'app/components/ClientRuntime.tsx'), 'utf8');
    if (
      !routes.includes('isSoftNavRoute') ||
      !runtime.includes('isSoftNavRoute') ||
      !routes.includes('return isAppRoute(pathname)')
    ) {
      fail('profiles use client navigation', 'profile slugs must use next/link + the client router cache');
    } else {
      pass('profiles use client navigation (Link + router cache)');
    }
    const personLayout = fs.readFileSync(path.join(ROOT, 'app/investors/(profile)/[slug]/layout.tsx'), 'utf8');
    const fundLayout = fs.readFileSync(path.join(ROOT, 'app/funds/(profile)/[slug]/layout.tsx'), 'utf8');
    const desktopOnlyCss =
      /directory-profile\.css[^>]*(min-width:\s*769px)/.test(personLayout) ||
      /directory-profile\.css[^>]*(min-width:\s*769px)/.test(fundLayout);
    const loadsProfileCss =
      personLayout.includes('directory-profile.css') && fundLayout.includes('directory-profile.css');
    if (!loadsProfileCss || desktopOnlyCss) {
      fail(
        'profile CSS loads on mweb',
        'directory-profile.css must load on all viewports — a min-width:769px link skips the mobile stylesheet'
      );
    } else {
      pass('profile CSS loads on mweb');
    }
  } catch (err) {
    fail('profiles use client navigation', err);
  }

  try {
    const layout = fs.readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8');
    const runtime = fs.readFileSync(path.join(ROOT, 'app/components/ClientRuntime.tsx'), 'utf8');
    const unlock = fs.readFileSync(path.join(ROOT, 'js/person-email-unlock.js'), 'utf8');
    const cfg = fs.readFileSync(path.join(ROOT, 'next.config.js'), 'utf8');
    const loginResp = fs.readFileSync(path.join(ROOT, 'lib/html-file-response.ts'), 'utf8');
    const hasSpeculation = layout.includes('type="speculationrules"') && layout.includes('"/login"');
    const hasWarm = layout.includes('pointerdown') && layout.includes("fetch(p,{credentials:'same-origin'})");
    const noBlank = !layout.includes("classList.add('vc-nav-pending')");
    const nativeLogin =
      /if \(isProbablySignedIn\(\)\) \{\s*e\.preventDefault\(\);\s*e\.stopPropagation\(\);\s*unlockEmail\(btn\);/.test(unlock) &&
      !/goLogin\(btn\.getAttribute/.test(unlock);
    const browserTtl =
      /max-age=180, s-maxage=86400/.test(cfg) && /max-age=180, s-maxage=86400/.test(loginResp);
    const loginFetch = runtime.includes("fetch('/login'");
    if (!hasSpeculation || !hasWarm || !noBlank || !nativeLogin || !browserTtl || !loginFetch) {
      fail(
        'mweb profile/login nav is warmed',
        `speculation=${hasSpeculation} warm=${hasWarm} noBlank=${noBlank} nativeLogin=${nativeLogin} ttl=${browserTtl} loginFetch=${loginFetch}`
      );
    } else {
      pass('mweb profile/login nav is warmed without layout CSS changes');
    }
  } catch (err) {
    fail('mweb profile/login nav is warmed', err);
  }

  try {
    const personPage = fs.readFileSync(path.join(ROOT, 'app/investors/(profile)/[slug]/page.tsx'), 'utf8');
    const fundPage = fs.readFileSync(path.join(ROOT, 'app/funds/(profile)/[slug]/page.tsx'), 'utf8');
    const investorsLayout = fs.readFileSync(path.join(ROOT, 'app/investors/(directory)/layout.tsx'), 'utf8');
    const rootLayout = fs.readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8');
    const cfg = fs.readFileSync(path.join(ROOT, 'next.config.js'), 'utf8');
    const usesHeaders = personPage.includes("next/headers") || fundPage.includes("next/headers");
    const hasStale = cfg.includes('staleTimes');
    const noDirIife =
      !investorsLayout.includes('people.js') &&
      !rootLayout.includes('investors/investors.js') &&
      !rootLayout.includes('/js/people.js?v=');
    if (usesHeaders || !hasStale) {
      fail(
        'profile pages can ISR',
        `headers=${usesHeaders} staleTimes=${hasStale} — headers() forces a serverless hit on every profile click`
      );
    } else {
      pass('profile pages do not call headers(); client router keeps a stale cache');
    }
    if (!investorsLayout.includes('directory-list.css') || !noDirIife) {
      fail(
        'directory layout loads CSS without people.js',
        `dirCss=${investorsLayout.includes('directory-list.css')} noDirIife=${noDirIife}`
      );
    } else {
      pass('directory layout loads CSS without people.js');
    }
  } catch (err) {
    fail('profile pages can ISR', err);
  }

  try {
    const v = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
    const rewrites = v.rewrites || [];
    const stealsFunds = rewrites.some((r) => r.source === '/funds/:slug');
    const stealsPeople = rewrites.some((r) => r.source === '/investors/:slug');
    const keepsStage = rewrites.some((r) => r.source === '/funds/stages/:slug');
    if (stealsFunds || stealsPeople || !keepsStage) {
      fail(
        'vercel slug rewrites',
        `fundsSlug=${stealsFunds} peopleSlug=${stealsPeople} stage=${keepsStage} — Next owns profile slugs; keep guide rewrites`
      );
    } else {
      pass('vercel.json no longer steals /funds/:slug or /investors/:slug');
    }
  } catch (err) {
    fail('vercel slug rewrites', err);
  }

  try {
    const peopleView = fs.readFileSync(path.join(ROOT, 'app/investors/PeopleDirectoryView.tsx'), 'utf8');
    const fundsView = fs.readFileSync(path.join(ROOT, 'app/funds/FundsDirectoryView.tsx'), 'utf8');
    const peopleBrowser = fs.readFileSync(path.join(ROOT, 'app/investors/PeopleDirectoryBrowser.tsx'), 'utf8');
    const fundsBrowser = fs.readFileSync(path.join(ROOT, 'app/funds/FundsDirectoryBrowser.tsx'), 'utf8');
    if (!peopleBrowser.includes('inv-dir-row') || !peopleBrowser.includes('inv-dir-results')) {
      fail('people list class lock', 'missing inv-dir-results');
    } else if (!fundsBrowser.includes('inv-dir-results') || !fundsView.includes('SiteHeader')) {
      fail('funds list class lock', 'missing inv-dir-results');
    } else if (!peopleView.includes('PeopleDirectoryBrowser')) {
      fail('people list class lock', 'view must render PeopleDirectoryBrowser');
    } else {
      pass('directory views keep inv-dir-* class names');
    }
  } catch (err) {
    fail('directory views keep inv-dir-* class names', err);
  }

  try {
    const peopleView = fs.readFileSync(path.join(ROOT, 'app/investors/PeopleDirectoryView.tsx'), 'utf8');
    const fundsView = fs.readFileSync(path.join(ROOT, 'app/funds/FundsDirectoryView.tsx'), 'utf8');
    const peopleBrowser = fs.readFileSync(path.join(ROOT, 'app/investors/PeopleDirectoryBrowser.tsx'), 'utf8');
    const fundsBrowser = fs.readFileSync(path.join(ROOT, 'app/funds/FundsDirectoryBrowser.tsx'), 'utf8');
    const inline = fs.readFileSync(path.join(ROOT, 'lib/inline-directory-filters.ts'), 'utf8');
    const nextNotStuck =
      peopleBrowser.includes('disabled={safePage >= pageCount}') &&
      fundsBrowser.includes('disabled={safePage >= pageCount}') &&
      !/id="ppl-next" disabled>/.test(peopleView) &&
      !/id="inv-next" disabled>/.test(fundsView);
    const inMemoryPager =
      peopleBrowser.includes('filtered.slice') &&
      !peopleBrowser.includes('/api/people') &&
      !fundsBrowser.includes('/api/investors');
    const filtersInstant =
      peopleBrowser.includes('id="filter-role"') &&
      fundsBrowser.includes('id="filter-stage"') &&
      inline.includes('max-width:960px');
    if (!nextNotStuck || !inMemoryPager) {
      fail(
        'directory pager is in-memory',
        `nextNotStuck=${nextNotStuck} inMemoryPager=${inMemoryPager} — Next/Prev must page the loaded list, not hit the API`
      );
    } else {
      pass('directory pager pages the in-memory list (no API, no login wall)');
    }
    if (!filtersInstant) {
      fail(
        'directory filters open on mweb',
        `filtersInstant=${filtersInstant} — dropdowns SSR and the drawer paints from the inline script`
      );
    } else {
      pass('directory filters SSR in React; drawer opens without people.js');
    }
  } catch (err) {
    fail('directory pager is in-memory', err);
  }

  try {
    const {
      getPeopleListPayload,
      getFundsListPayload,
      getPeopleDirectoryIndex,
      getFundsDirectoryIndex
    } = require(path.join(ROOT, 'lib/directory-server'));
    const people = getPeopleListPayload();
    const funds = getFundsListPayload();
    const peopleIndex = getPeopleDirectoryIndex();
    const fundsIndex = getFundsDirectoryIndex();
    const leaked = (people.people || []).some((p) => p && p.email);
    const indexLeaked = (peopleIndex.people || []).some((p) => p && p.email);
    const rows = String(people.rowsHtml || '');
    const fundRows = String(funds.rowsHtml || '');
    const browser = fs.readFileSync(path.join(ROOT, 'app/investors/PeopleDirectoryBrowser.tsx'), 'utf8');
    const unlockBtn = fs.readFileSync(path.join(ROOT, 'app/components/directory/UnlockEmailButton.tsx'), 'utf8');
    const hasUnlock =
      browser.includes('UnlockEmailButton') &&
      unlockBtn.includes("'/login#/investors/'") &&
      unlockBtn.includes('data-unlock-email');
    if (leaked || indexLeaked) {
      fail('anon people payload has no emails', 'email field present on a public card');
    } else if (!rows.includes('class="inv-dir-row"') || !fundRows.includes('class="inv-dir-row"')) {
      fail('prerendered rows class lock', 'missing inv-dir-row');
    } else if (!hasUnlock) {
      fail('email unlock lock', 'logged-out unlock CTA must be a real /login link');
    } else if (!peopleIndex.people || peopleIndex.people.length < 100) {
      fail('in-memory people index', 'expected the full public people list');
    } else if (!fundsIndex.investors || fundsIndex.investors.length < 100) {
      fail('in-memory funds index', 'expected the full funds list');
    } else {
      pass('directory indexes: full lists, no emails, unlock CTA');
    }
  } catch (err) {
    fail('directory indexes: full lists, no emails, unlock CTA', err);
  }

  try {
    const apiPeople = fs.readFileSync(path.join(ROOT, 'server/people.js'), 'utf8');
    const hasGate = apiPeople.includes('resolveDirectoryListAccess') && apiPeople.includes('private, no-store');
    if (!hasGate) {
      fail('list API login gate', 'server/people.js must keep page-2 auth + no-store when emails present');
    } else {
      pass('list API keeps page-2 login gate and private no-store');
    }
  } catch (err) {
    fail('list API login gate', err);
  }
}

async function main() {
  console.log('VC Dekho smoke tests');
  const hasDb = Boolean(process.env.DATABASE_URL);
  console.log('DATABASE_URL:', hasDb ? 'set (full SSR extras)' : 'not set (core SSR only)');

  await testModuleLoads();
  testStaticAssets();
  testSiteIcons();
  testNextAppShell();
  await testSsrHandlers();

  console.log('\n---');
  console.log(`Passed: ${passes.length}  Failed: ${failures.length}`);

  if (failures.length) {
    console.error('\nSmoke tests FAILED — do not deploy to production.\n');
    for (const f of failures) {
      console.error(`• ${f.label}: ${f.msg}`);
    }
    process.exit(1);
  }

  console.log('\nSmoke tests passed — OK to deploy.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
