#!/usr/bin/env node
/**
 * Dedupe a candidate CSV against data/investors.json.
 *
 * Usage:
 *   node scripts/dedupe_investor_candidates.js data/candidates/wave-a-candidates.csv
 *   node scripts/dedupe_investor_candidates.js data/candidates/wave-a-candidates.csv --out data/candidates/wave-a-new.csv
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const ROOT = path.join(__dirname, '..');

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(
      /\b(ventures?|capital|partners?|fund|funds|llc|ltd|limited|pvt|private|india|investment|investments|vc|llp|management|advisors?|advisory|group|holdings?|network|angel|the|and|of|for|asia|global|international)\b/g,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function domainOf(url) {
  const m = String(url || '')
    .toLowerCase()
    .match(/https?:\/\/(?:www\.)?([^/]+)/);
  return m ? m[1] : '';
}

function loadExisting() {
  const payload = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'investors.json'), 'utf8'));
  const byNorm = new Map();
  const domains = new Set();
  for (const inv of payload.investors || []) {
    const n = norm(inv.name);
    if (n) byNorm.set(n, inv.name);
    const d = domainOf(inv.website);
    if (d) domains.add(d);
  }
  return { byNorm, domains };
}

function findMatch(name, website, { byNorm, domains }) {
  const n = norm(name);
  if (!n) return 'empty-norm';
  if (byNorm.has(n)) return byNorm.get(n);

  const ntoks = new Set(n.split(' ').filter(Boolean));
  if (ntoks.size >= 2) {
    for (const [en, ename] of byNorm.entries()) {
      const etoks = new Set(en.split(' ').filter(Boolean));
      if (etoks.size < 2) continue;
      let inter = 0;
      for (const t of ntoks) if (etoks.has(t)) inter += 1;
      const union = new Set([...ntoks, ...etoks]).size;
      if (union && inter / union >= 0.75) return ename;
    }
  }

  if (ntoks.size === 1) {
    const tok = [...ntoks][0];
    if (tok.length >= 4 && byNorm.has(tok)) return byNorm.get(tok);
  }

  const d = domainOf(website);
  if (d && domains.has(d)) return `domain:${d}`;
  return null;
}

function main() {
  const args = process.argv.slice(2);
  const inPath = path.resolve(args.find((a) => !a.startsWith('--')) || path.join(ROOT, 'data', 'candidates', 'wave-a-candidates.csv'));
  const outIdx = args.indexOf('--out');
  const outPath = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : null;

  const existing = loadExisting();
  const rows = parse(fs.readFileSync(inPath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true
  });

  const fresh = [];
  const dupes = [];
  const seen = new Set();

  for (const row of rows) {
    const name = (row.Company || '').trim();
    const website = (row.Website || '').trim();
    const matched = findMatch(name, website, existing);
    const n = norm(name);
    if (matched) {
      dupes.push({ candidate: name, matched });
      continue;
    }
    if (seen.has(n)) {
      dupes.push({ candidate: name, matched: 'self-dupe' });
      continue;
    }
    seen.add(n);
    fresh.push(row);
  }

  console.log(`Input: ${rows.length}`);
  console.log(`New:   ${fresh.length}`);
  console.log(`Dupes: ${dupes.length}`);
  if (dupes.length) {
    console.log('Sample dupes:', dupes.slice(0, 8));
  }

  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, stringify(fresh, { header: true }));
    console.log(`Wrote ${fresh.length} → ${outPath}`);
  }

  const reportPath = path.join(path.dirname(inPath), path.basename(inPath, '.csv') + '-dedupe-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({ input: rows.length, new: fresh.length, dupes }, null, 2));
  console.log(`Report → ${reportPath}`);
}

main();
