#!/usr/bin/env node
/**
 * Real-user (field) Core Web Vitals from the Chrome UX Report.
 *
 * Lab tools like Lighthouse model one synthetic device on one synthetic
 * network, which is why they disagree with each other run to run. CrUX reports
 * what actual Chrome visitors experienced over the trailing 28 days, so this is
 * the number to optimise against.
 *
 *   node scripts/measure_field.js                 # origin + default pages
 *   node scripts/measure_field.js / /funds        # specific paths
 *   node scripts/measure_field.js --desktop       # DESKTOP instead of PHONE
 *
 * Needs CRUX_API_KEY in .env — see .env.example for how to mint one.
 *
 * Snapshots land in data/field-vitals/ so regressions are visible over time.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://vcdekho.com';
const OUT_DIR = path.join(__dirname, '..', 'data', 'field-vitals');
const ENDPOINT = 'https://chromeuxreport.googleapis.com/v1/records:queryRecord';

const DEFAULT_PATHS = ['/', '/funds', '/investors', '/login'];

// [good ceiling, poor floor] per web.dev Core Web Vitals thresholds.
const METRICS = {
  largest_contentful_paint: { label: 'LCP', unit: 'ms', good: 2500, poor: 4000, core: true },
  interaction_to_next_paint: { label: 'INP', unit: 'ms', good: 200, poor: 500, core: true },
  cumulative_layout_shift: { label: 'CLS', unit: '', good: 0.1, poor: 0.25, core: true },
  first_contentful_paint: { label: 'FCP', unit: 'ms', good: 1800, poor: 3000 },
  experimental_time_to_first_byte: { label: 'TTFB', unit: 'ms', good: 800, poor: 1800 }
};

function apiKey() {
  return process.env.CRUX_API_KEY || process.env.PSI_API_KEY || process.env.GOOGLE_API_KEY || '';
}

async function query(body, key) {
  const res = await fetch(`${ENDPOINT}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  // 404 just means this URL is below CrUX's traffic threshold, which is normal
  // for individual pages and is reported rather than thrown.
  if (res.status === 404) return { missing: true };
  if (!res.ok) {
    const msg = (json.error && json.error.message) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json.record || {};
}

function rate(key, p75) {
  const m = METRICS[key];
  if (!m || p75 == null) return '';
  const v = Number(p75);
  if (v <= m.good) return 'good';
  return v <= m.poor ? 'needs-improvement' : 'POOR';
}

function summarise(record) {
  const out = {};
  for (const [key, meta] of Object.entries(METRICS)) {
    const metric = record.metrics && record.metrics[key];
    if (!metric) continue;
    const p75 = metric.percentiles && metric.percentiles.p75;
    const bins = metric.histogram || [];
    out[key] = {
      label: meta.label,
      p75,
      rating: rate(key, p75),
      // Share of visits in each bucket — a good p75 can still hide a bad tail.
      good: bins[0] ? Math.round(bins[0].density * 100) : null,
      needsImprovement: bins[1] ? Math.round(bins[1].density * 100) : null,
      poor: bins[2] ? Math.round(bins[2].density * 100) : null
    };
  }
  return out;
}

function print(title, summary, period) {
  console.log(`\n${title}${period ? `   (28 days to ${period})` : ''}`);
  if (!Object.keys(summary).length) {
    console.log('   no data');
    return;
  }
  console.log('   metric   p75        rating              good / ni / poor');
  for (const key of Object.keys(METRICS)) {
    const s = summary[key];
    if (!s) continue;
    const unit = METRICS[key].unit;
    const value = unit === 'ms' ? `${s.p75}ms` : String(s.p75);
    const core = METRICS[key].core ? '*' : ' ';
    console.log(
      `   ${core}${s.label.padEnd(6)} ${value.padEnd(10)} ${s.rating.padEnd(19)} ` +
        `${String(s.good ?? '-').padStart(3)}% ${String(s.needsImprovement ?? '-').padStart(4)}% ${String(s.poor ?? '-').padStart(5)}%`
    );
  }
}

function periodOf(record) {
  const p = record.collectionPeriod && record.collectionPeriod.lastDate;
  return p ? `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}` : '';
}

async function main() {
  const args = process.argv.slice(2);
  const formFactor = args.includes('--desktop') ? 'DESKTOP' : 'PHONE';
  const paths = args.filter((a) => !a.startsWith('--'));
  const targets = paths.length ? paths : DEFAULT_PATHS;

  const key = apiKey();
  if (!key) {
    console.error(
      'No CRUX_API_KEY found.\n\n' +
        'Create one (free, 2 minutes):\n' +
        '  1. https://console.cloud.google.com/apis/library/chromeuxreport.googleapis.com\n' +
        '  2. Click Enable\n' +
        '  3. APIs & Services > Credentials > Create credentials > API key\n' +
        '  4. Add CRUX_API_KEY=<key> to .env\n'
    );
    process.exit(1);
  }

  console.log(`Chrome UX Report — real users, ${formFactor}`);
  const snapshot = { measuredAt: new Date().toISOString(), formFactor, origin: {}, pages: {} };

  try {
    const record = await query({ origin: ORIGIN, formFactor }, key);
    if (record.missing) {
      console.log('\nORIGIN (all pages): not in the CrUX dataset — traffic is below Google\'s threshold.');
      console.log('Use first-party RUM instead (see notes at the end).');
    } else {
      snapshot.origin = summarise(record);
      print('ORIGIN (all pages)', snapshot.origin, periodOf(record));
    }
  } catch (err) {
    console.error('\nORIGIN query failed:', err.message);
    if (/not supported|API has not been used|disabled/i.test(err.message)) {
      console.error('Enable the Chrome UX Report API for this key\'s project, then retry.');
    }
    process.exit(1);
  }

  for (const p of targets) {
    const url = ORIGIN + (p === '/' ? '/' : p);
    try {
      const record = await query({ url, formFactor }, key);
      if (record.missing) {
        console.log(`\n${url}\n   not enough traffic for page-level CrUX data`);
        continue;
      }
      snapshot.pages[p] = summarise(record);
      print(url, snapshot.pages[p], periodOf(record));
    } catch (err) {
      console.log(`\n${url}\n   query failed: ${err.message}`);
    }
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  const file = path.join(OUT_DIR, `${stamp}-${formFactor.toLowerCase()}.json`);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`\n* = Core Web Vital`);
  console.log(`Snapshot written to ${path.relative(path.join(__dirname, '..'), file)}`);
}

main();
