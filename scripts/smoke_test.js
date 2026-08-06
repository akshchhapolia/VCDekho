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
  const apiFiles = walkJs(path.join(ROOT, 'api'));
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
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/investors.json'), 'utf8'));
    if (!data.count || !Array.isArray(data.investors) || data.investors.length < 100) {
      fail('investors.json', 'invalid or too few investors');
    } else {
      pass(`investors.json (${data.count} funds)`);
    }
  } catch (err) {
    fail('investors.json parse', err);
  }
}

function testSiteIcons() {
  console.log('\nShared utilities');
  try {
    const { renderFaviconLinks } = require(path.join(ROOT, 'utils/site-icons.js'));
    const links = renderFaviconLinks();
    if (!Array.isArray(links) || links.length < 4) {
      fail('renderFaviconLinks()', 'expected >= 4 link tags');
    } else if (!links.some((l) => l.includes('/favicon.ico'))) {
      fail('renderFaviconLinks()', 'missing favicon.ico');
    } else {
      pass('renderFaviconLinks()');
    }
  } catch (err) {
    fail('renderFaviconLinks()', err);
  }
}

async function testSsrHandlers() {
  console.log('\nSSR handlers');

  const detail = require(path.join(ROOT, 'api/investors/detail.js'));
  const people = require(path.join(ROOT, 'api/people.js'));
  const article = require(path.join(ROOT, 'api/news/article.js'));
  const list = require(path.join(ROOT, 'api/investors/list.js'));
  const ops = require(path.join(ROOT, 'api/ops.js'));

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
      label: 'news article (mock slug)',
      handler: article,
      req: { query: { slug: 'startup-tech-digest-2026-06-18' }, headers: {}, method: 'GET' },
      expectStatus: 200,
      bodyIncludes: 'Daily Digest'
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

async function main() {
  console.log('VC Dekho smoke tests');
  const hasDb = Boolean(process.env.DATABASE_URL);
  console.log('DATABASE_URL:', hasDb ? 'set (full SSR extras)' : 'not set (core SSR only)');

  await testModuleLoads();
  testStaticAssets();
  testSiteIcons();
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
