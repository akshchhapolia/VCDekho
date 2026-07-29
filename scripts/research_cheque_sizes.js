#!/usr/bin/env node
/**
 * Research cheque / ticket sizes from investor websites (and optional search pages).
 *
 * Usage:
 *   node scripts/research_cheque_sizes.js
 *   node scripts/research_cheque_sizes.js --limit 50 --types vc,pe
 *   node scripts/research_cheque_sizes.js --offset 50 --limit 100
 *
 * Writes: data/candidates/cheque-research.jsonl (append) + cheque-research-summary.json
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const ROOT = path.join(__dirname, '..');
const IN_CSV = path.join(ROOT, 'data', 'candidates', 'missing-tickets.csv');
const OUT_JSONL = path.join(ROOT, 'data', 'candidates', 'cheque-research.jsonl');
const OUT_SUMMARY = path.join(ROOT, 'data', 'candidates', 'cheque-research-summary.json');

const INR_PER_USD = 83;

function args() {
  const a = process.argv.slice(2);
  const out = { limit: Infinity, offset: 0, types: null, concurrency: 8 };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--limit') out.limit = Number(a[++i]);
    else if (a[i] === '--offset') out.offset = Number(a[++i]);
    else if (a[i] === '--types') out.types = new Set(a[++i].split(',').map((s) => s.trim()));
    else if (a[i] === '--concurrency') out.concurrency = Number(a[++i]);
  }
  return out;
}

function inrToUsd(inr) {
  return Math.round(inr / INR_PER_USD / 1000) * 1000;
}

function parseInrUnit(unit) {
  const u = String(unit || '').toLowerCase();
  if (/^(cr|crs|crore|crores)$/.test(u)) return 1e7;
  if (/^(lakh|lakhs|lac|lacs|l)$/.test(u)) return 1e5;
  return 0;
}

/**
 * Extract plausible cheque USD amounts from a text blob.
 * Returns { min, max, evidence[], confidence }
 */
function extractChequeSignals(text) {
  const raw = String(text || '').replace(/\s+/g, ' ');
  if (!raw) return null;

  // Prefer windows around cheque/ticket language
  const windows = [];
  const cueRe =
    /.{0,80}((?:cheque|check|ticket|invest(?:ment|s|ing)?\s+size|typical\s+investment|write(?:s|ing)?\s+(?:cheques?|checks?)|first\s+cheque|initial\s+cheque|cheque\s+size|ticket\s+size|investment\s+range|cheque\s+range).{0,120})/gi;
  let m;
  while ((m = cueRe.exec(raw)) !== null) windows.push(m[1]);
  if (!windows.length) {
    // fallback: currency-heavy snippets
    const curRe = /.{0,40}(?:\$|USD|INR|₹).{0,60}/gi;
    while ((m = curRe.exec(raw)) !== null && windows.length < 12) windows.push(m[0]);
  }
  const hay = windows.length ? windows.join(' || ') : raw.slice(0, 8000);

  const amounts = [];
  const evidence = [];

  const pushUsd = (n, snippet) => {
    if (n >= 5000 && n <= 2e8) {
      amounts.push(n);
      if (snippet && evidence.length < 6) evidence.push(snippet.trim().slice(0, 180));
    }
  };

  const usdRe = /\$\s*([\d,.]+)\s*(k|m|mn|million|b|bn|billion)?/gi;
  while ((m = usdRe.exec(hay)) !== null) {
    let n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isNaN(n)) continue;
    const unit = (m[2] || '').toLowerCase();
    if (unit === 'k') n *= 1e3;
    else if (unit === 'm' || unit === 'mn' || unit === 'million') n *= 1e6;
    else if (unit === 'b' || unit === 'bn' || unit === 'billion') n *= 1e9;
    else if (n > 0 && n < 1000) n *= 1e6;
    const snip = hay.slice(Math.max(0, m.index - 30), m.index + 50);
    // skip fund sizes / AUM if phrased as fund
    if (/\b(fund\s*size|aum|corpus|under\s*management)\b/i.test(snip) && n >= 5e6) continue;
    pushUsd(n, snip);
  }

  const inrRangeRe =
    /(?:INR|₹|Rs\.?)\s*([\d,.]+)\s*(Cr|Crore|Crs|Lakh|Lac|Lacs|L)?\s*(?:–|-|—|to)\s*(?:(?:INR|₹|Rs\.?)\s*)?([\d,.]+)\s*(Cr|Crore|Crs|Lakh|Lac|Lacs|L)/gi;
  while ((m = inrRangeRe.exec(hay)) !== null) {
    const snip = hay.slice(Math.max(0, m.index - 30), m.index + 60);
    if (/\b(fund\s*size|aum|corpus|greenshoe)\b/i.test(snip)) continue;
    for (const [val, unit] of [
      [m[1], m[2] || m[4]],
      [m[3], m[4] || m[2]]
    ]) {
      const mult = parseInrUnit(unit);
      if (!mult) continue;
      const usd = inrToUsd(parseFloat(String(val).replace(/,/g, '')) * mult);
      pushUsd(usd, snip);
    }
  }

  const inrSingleRe = /(?:INR|₹|Rs\.?)\s*([\d,.]+)\s*(Cr|Crore|Crs|Lakh|Lac|Lacs|L)\b/gi;
  while ((m = inrSingleRe.exec(hay)) !== null) {
    const snip = hay.slice(Math.max(0, m.index - 30), m.index + 50);
    if (/\b(fund\s*size|aum|corpus|greenshoe)\b/i.test(snip)) continue;
    const mult = parseInrUnit(m[2]);
    if (!mult) continue;
    const usd = inrToUsd(parseFloat(m[1].replace(/,/g, '')) * mult);
    pushUsd(usd, snip);
  }

  if (!amounts.length) return null;

  // If cue windows existed, higher confidence
  const cueHit = windows.length > 0 && /cheque|ticket|invest/i.test(windows.join(' '));
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  // Discard absurd single mega amounts alone without range language (likely fund size)
  if (min === max && min >= 25e6 && !cueHit) return null;

  let confidence = 'low';
  if (cueHit && max / Math.max(min, 1) <= 50) confidence = 'medium';
  if (cueHit && /cheque|ticket size|typical cheque|writes?\s/i.test(hay) && max <= 25e6) confidence = 'high';

  return { min, max, evidence: [...new Set(evidence)].slice(0, 4), confidence, source: 'website' };
}

function formatUsd(n) {
  if (n == null) return null;
  if (n >= 1e6) {
    const v = n / 1e6;
    return `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`;
  }
  if (n >= 1e3) {
    const v = n / 1e3;
    return `$${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}K`;
  }
  return `$${n}`;
}

function chequeLabel(min, max) {
  const a = formatUsd(min);
  const b = formatUsd(max);
  return a === b ? a : `${a} – ${b}`;
}

async function fetchText(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; VCDekhoChequeResearch/1.0; +https://vcdekho.com)',
        Accept: 'text/html,application/xhtml+xml'
      }
    });
    if (!res.ok) return { ok: false, status: res.status, text: '' };
    const ct = res.headers.get('content-type') || '';
    if (!/text|html|xml|json/i.test(ct) && ct) return { ok: false, status: res.status, text: '' };
    let text = await res.text();
    // strip scripts/styles
    text = text
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ');
    return { ok: true, status: res.status, text: text.slice(0, 200000) };
  } catch (err) {
    return { ok: false, status: 0, text: '', error: err.message };
  } finally {
    clearTimeout(t);
  }
}

function candidateUrls(website) {
  let base = String(website || '').trim();
  if (!base) return [];
  if (!/^https?:\/\//i.test(base)) base = 'https://' + base;
  try {
    const u = new URL(base);
    const origin = u.origin;
    return [
      base,
      origin + '/',
      origin + '/about',
      origin + '/about-us',
      origin + '/thesis',
      origin + '/faq',
      origin + '/investors',
      origin + '/for-founders',
      origin + '/founders',
      origin + '/portfolio'
    ];
  } catch {
    return [base];
  }
}

async function researchOne(row) {
  const urls = [...new Set(candidateUrls(row.website))];
  const pages = [];
  for (const url of urls.slice(0, 5)) {
    const got = await fetchText(url);
    if (got.ok && got.text && got.text.length > 200) {
      pages.push({ url, text: got.text });
    }
  }
  if (!pages.length) {
    return {
      name: row.name,
      slug: row.slug,
      typeId: row.typeId,
      website: row.website,
      status: 'no_fetch',
      cheque: null
    };
  }

  const combined = pages.map((p) => p.text).join('\n');
  const signal = extractChequeSignals(combined);
  if (!signal) {
    return {
      name: row.name,
      slug: row.slug,
      typeId: row.typeId,
      website: row.website,
      status: 'no_signal',
      pages: pages.map((p) => p.url),
      cheque: null
    };
  }

  return {
    name: row.name,
    slug: row.slug,
    typeId: row.typeId,
    website: row.website,
    status: 'found',
    pages: pages.map((p) => p.url),
    cheque: {
      min: signal.min,
      max: signal.max,
      label: chequeLabel(signal.min, signal.max),
      confidence: signal.confidence,
      evidence: signal.evidence,
      source: signal.source
    }
  };
}

async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return out;
}

async function main() {
  const opts = args();
  let rows = parse(fs.readFileSync(IN_CSV, 'utf8'), { columns: true, skip_empty_lines: true });
  if (opts.types) rows = rows.filter((r) => opts.types.has(r.typeId));
  rows = rows.slice(opts.offset, opts.offset + opts.limit);
  console.log(`Researching ${rows.length} investors (concurrency ${opts.concurrency})…`);

  const results = await mapPool(rows, opts.concurrency, async (row, idx) => {
    const r = await researchOne(row);
    process.stdout.write(
      `[${idx + 1}/${rows.length}] ${r.status.padEnd(10)} ${r.name.slice(0, 40)}${
        r.cheque ? ' → ' + r.cheque.label + ' (' + r.cheque.confidence + ')' : ''
      }\n`
    );
    fs.appendFileSync(OUT_JSONL, JSON.stringify(r) + '\n');
    return r;
  });

  const found = results.filter((r) => r.status === 'found');
  const summary = {
    researchedAt: new Date().toISOString(),
    total: results.length,
    found: found.length,
    byConfidence: {
      high: found.filter((r) => r.cheque?.confidence === 'high').length,
      medium: found.filter((r) => r.cheque?.confidence === 'medium').length,
      low: found.filter((r) => r.cheque?.confidence === 'low').length
    },
    no_fetch: results.filter((r) => r.status === 'no_fetch').length,
    no_signal: results.filter((r) => r.status === 'no_signal').length,
    highMedium: found
      .filter((r) => r.cheque && (r.cheque.confidence === 'high' || r.cheque.confidence === 'medium'))
      .map((r) => ({
        name: r.name,
        label: r.cheque.label,
        confidence: r.cheque.confidence,
        website: r.website,
        evidence: r.cheque.evidence
      }))
  };
  fs.writeFileSync(OUT_SUMMARY, JSON.stringify(summary, null, 2));
  console.log('\nDone.', summary.found, 'found /', summary.total);
  console.log('High/medium:', summary.byConfidence.high, '/', summary.byConfidence.medium);
  console.log('→', OUT_SUMMARY);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
