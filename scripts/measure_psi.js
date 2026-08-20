#!/usr/bin/env node
/**
 * Mobile field/lab measurement via PageSpeed Insights.
 *
 *   node scripts/measure_psi.js                    # default page set
 *   node scripts/measure_psi.js /funds /login      # specific paths
 *
 * Writes the raw Lighthouse JSON per page to /tmp so follow-up analysis
 * doesn't need to re-run the (slow, rate-limited) audits.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://vcdekho.com';
const OUT_DIR = '/tmp/psi';
const DEFAULT_PATHS = ['/', '/funds', '/investors', '/funds/accel', '/investors/aakash-goyal', '/login'];

const AUDITS_OF_INTEREST = [
  'server-response-time',
  'render-blocking-resources',
  'unused-javascript',
  'unused-css-rules',
  'third-party-summary',
  'font-display',
  'total-byte-weight',
  'mainthread-work-breakdown',
  'bootup-time',
  'uses-long-cache-ttl',
  'largest-contentful-paint-element'
];

function api(url) {
  const params = new URLSearchParams({ url, strategy: 'mobile' });
  ['performance'].forEach((c) => params.append('category', c));
  // Anonymous callers share a tiny daily quota that a single run exhausts.
  const key = process.env.PSI_API_KEY || process.env.CRUX_API_KEY || process.env.GOOGLE_API_KEY;
  if (key) params.append('key', key);
  return `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;
}

const ms = (v) => (v == null ? null : Math.round(v));
const kb = (v) => (v == null ? null : Math.round(v / 1024));

async function measure(pagePath) {
  const url = ORIGIN + pagePath;
  const res = await fetch(api(url));
  if (!res.ok) throw new Error(`PSI ${res.status} for ${pagePath}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const safe = pagePath.replace(/[^a-z0-9]+/gi, '_') || 'root';
  fs.writeFileSync(path.join(OUT_DIR, `${safe}.json`), JSON.stringify(json));

  const lh = json.lighthouseResult || {};
  const a = lh.audits || {};
  const metric = (id) => a[id] && a[id].numericValue;

  const savings = {};
  AUDITS_OF_INTEREST.forEach((id) => {
    const audit = a[id];
    if (!audit) return;
    savings[id] = {
      score: audit.score,
      value: audit.numericValue,
      display: audit.displayValue || null,
      wastedMs: audit.details && audit.details.overallSavingsMs,
      wastedBytes: audit.details && audit.details.overallSavingsBytes
    };
  });

  // CrUX real-user data, when Chrome has enough traffic for this URL/origin
  const field = json.loadingExperience || {};
  const originField = json.originLoadingExperience || {};
  const fieldMetric = (src, key) => {
    const m = src.metrics && src.metrics[key];
    return m ? { p75: m.percentile, category: m.category } : null;
  };

  return {
    path: pagePath,
    score: lh.categories && lh.categories.performance && Math.round(lh.categories.performance.score * 100),
    lab: {
      fcp: ms(metric('first-contentful-paint')),
      lcp: ms(metric('largest-contentful-paint')),
      tbt: ms(metric('total-blocking-time')),
      cls: metric('cumulative-layout-shift'),
      si: ms(metric('speed-index')),
      ttfb: ms(metric('server-response-time')),
      bytes: kb(metric('total-byte-weight'))
    },
    fieldUrl: {
      lcp: fieldMetric(field, 'LARGEST_CONTENTFUL_PAINT_MS'),
      inp: fieldMetric(field, 'INTERACTION_TO_NEXT_PAINT'),
      cls: fieldMetric(field, 'CUMULATIVE_LAYOUT_SHIFT_SCORE'),
      ttfb: fieldMetric(field, 'EXPERIMENTAL_TIME_TO_FIRST_BYTE')
    },
    fieldOrigin: {
      lcp: fieldMetric(originField, 'LARGEST_CONTENTFUL_PAINT_MS'),
      inp: fieldMetric(originField, 'INTERACTION_TO_NEXT_PAINT'),
      cls: fieldMetric(originField, 'CUMULATIVE_LAYOUT_SHIFT_SCORE'),
      ttfb: fieldMetric(originField, 'EXPERIMENTAL_TIME_TO_FIRST_BYTE')
    },
    lcpElement:
      a['largest-contentful-paint-element'] &&
      a['largest-contentful-paint-element'].details &&
      a['largest-contentful-paint-element'].details.items &&
      a['largest-contentful-paint-element'].details.items[0],
    audits: savings
  };
}

async function main() {
  const paths = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_PATHS;
  const results = [];

  for (const p of paths) {
    process.stdout.write(`measuring ${p} ... `);
    try {
      const r = await measure(p);
      results.push(r);
      console.log(`score ${r.score} | LCP ${r.lab.lcp}ms | TBT ${r.lab.tbt}ms | TTFB ${r.lab.ttfb}ms`);
    } catch (err) {
      console.log('FAILED —', err.message);
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(results, null, 2));
  console.log(`\nRaw Lighthouse JSON + summary written to ${OUT_DIR}`);
}

main();
