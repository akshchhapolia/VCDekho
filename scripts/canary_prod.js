#!/usr/bin/env node
/**
 * Hit live (or CANARY_BASE) after a production deploy.
 * Exit 1 if login/unlock/directory core paths look dead.
 *
 *   node scripts/canary_prod.js
 *   CANARY_BASE=https://vcdekho.com node scripts/canary_prod.js
 *   CANARY_TOKEN=<access_token> node scripts/canary_prod.js   # optional unlock POST
 */
const BASE = (process.env.CANARY_BASE || 'https://vcdekho.com').replace(/\/$/, '');
const TOKEN = process.env.CANARY_TOKEN || process.env.VD_CANARY_TOKEN || '';
const UNLOCK_SLUG = process.env.CANARY_UNLOCK_SLUG || 'aakrit-vaish';

const failures = [];
const passes = [];

function pass(label) {
  passes.push(label);
  console.log('  ✓', label);
}

function fail(label, detail) {
  failures.push({ label, detail: String(detail || '') });
  console.error('  ✗', label);
  if (detail) console.error('   ', String(detail).split('\n')[0]);
}

async function fetchText(path, opts) {
  const res = await fetch(BASE + path, {
    redirect: 'follow',
    ...opts,
    headers: {
      Accept: 'text/html,application/json',
      ...(opts && opts.headers)
    }
  });
  const body = await res.text();
  return { res, body };
}

async function fetchJson(path, opts) {
  const { res, body } = await fetchText(path, {
    ...opts,
    headers: { Accept: 'application/json', ...(opts && opts.headers) }
  });
  let json = null;
  try {
    json = JSON.parse(body);
  } catch (_) {}
  return { res, body, json };
}

async function main() {
  console.log('VC Dekho prod canary →', BASE);

  try {
    const { res, body } = await fetchText('/investors');
    if (res.status !== 200) fail('GET /investors', 'HTTP ' + res.status);
    else if (!body.includes('id="ppl-results"') || !body.includes('inv-dir-row')) {
      fail('GET /investors', 'missing results rows');
    } else if (!body.includes('id="ppl-prerender"') || !/"roles"\s*:/.test(body)) {
      fail('GET /investors filters prerender', 'ppl-prerender missing roles');
    } else {
      pass('GET /investors has rows + filter bootstrap');
    }
  } catch (err) {
    fail('GET /investors', err);
  }

  try {
    const { res, body } = await fetchText('/funds');
    if (res.status !== 200) fail('GET /funds', 'HTTP ' + res.status);
    else if (!body.includes('id="inv-results"') || !body.includes('inv-dir-row')) {
      fail('GET /funds', 'missing results rows');
    } else if (!body.includes('id="inv-prerender"')) {
      fail('GET /funds', 'missing inv-prerender');
    } else {
      pass('GET /funds has rows + filter bootstrap');
    }
  } catch (err) {
    fail('GET /funds', err);
  }

  try {
    const { res, json } = await fetchJson('/api/people?limit=1&offset=0');
    const people = json && Array.isArray(json.people) ? json.people : [];
    const roles = json && json.filters && Array.isArray(json.filters.roles) ? json.filters.roles : [];
    if (res.status !== 200) fail('GET /api/people', 'HTTP ' + res.status);
    else if (!people.length) fail('GET /api/people', 'empty people[]');
    else if (roles.length < 2) fail('GET /api/people filters', 'roles=' + roles.length);
    else pass('GET /api/people returns people + filter roles');
  } catch (err) {
    fail('GET /api/people', err);
  }

  try {
    const { res, json } = await fetchJson('/api/investors/list?limit=1&offset=0');
    const investors = json && (json.investors || json.results || []);
    if (res.status !== 200) fail('GET /api/investors/list', 'HTTP ' + res.status);
    else if (!Array.isArray(investors) || !investors.length) fail('GET /api/investors/list', 'empty list');
    else pass('GET /api/investors/list returns funds');
  } catch (err) {
    fail('GET /api/investors/list', err);
  }

  try {
    const { res, body } = await fetchText('/login');
    if (res.status !== 200) fail('GET /login', 'HTTP ' + res.status);
    else if (!body.includes('id="auth-form"') || !body.includes('id="work-email"')) {
      fail('GET /login', 'auth form missing');
    } else {
      pass('GET /login serves the auth form');
    }
  } catch (err) {
    fail('GET /login', err);
  }

  try {
    const { res, json } = await fetchJson(
      '/api/people?slug=' + encodeURIComponent(UNLOCK_SLUG) + '&contact=email',
      { method: 'POST' }
    );
    if (res.status === 401) {
      pass('POST unlock without session is 401 (not 500)');
    } else if (res.status >= 500) {
      fail('POST unlock unauthenticated', 'HTTP ' + res.status + ' ' + (json && json.error));
    } else {
      pass('POST unlock unauthenticated HTTP ' + res.status);
    }
  } catch (err) {
    fail('POST unlock unauthenticated', err);
  }

  if (TOKEN) {
    try {
      const { res, json } = await fetchJson(
        '/api/people?slug=' + encodeURIComponent(UNLOCK_SLUG) + '&contact=email',
        {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + TOKEN }
        }
      );
      if (res.status !== 200) {
        fail('POST unlock with CANARY_TOKEN', 'HTTP ' + res.status + ' ' + (json && json.error));
      } else if (!json || !String(json.email || '').includes('@')) {
        fail('POST unlock with CANARY_TOKEN', 'no email in JSON');
      } else {
        pass('POST unlock with CANARY_TOKEN returns an email');
      }
    } catch (err) {
      fail('POST unlock with CANARY_TOKEN', err);
    }
  } else {
    console.log('  · skip signed-in unlock (set CANARY_TOKEN to enable)');
  }

  try {
    const { res, json } = await fetchJson('/api/ops?action=health');
    if (res.status !== 200 || !json || json.ok !== true) {
      fail('GET /api/ops?action=health', 'HTTP ' + res.status + ' ok=' + (json && json.ok));
    } else {
      pass('ops health ok');
    }
  } catch (err) {
    fail('GET /api/ops?action=health', err);
  }

  console.log('\n---');
  console.log(`Passed: ${passes.length}  Failed: ${failures.length}`);
  if (failures.length) {
    console.error('\nProd canary FAILED — do not treat this deploy as good.\n');
    for (const f of failures) console.error(`• ${f.label}: ${f.detail}`);
    process.exit(1);
  }
  console.log('\nProd canary passed.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
