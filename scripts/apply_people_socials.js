#!/usr/bin/env node
/**
 * Apply staged LinkedIn/Twitter enrichments onto existing Individuals CSV rows.
 * Only fills empty cells (use --force to overwrite). Never appends new people.
 *
 * Usage:
 *   node scripts/apply_people_socials.js
 *   node scripts/apply_people_socials.js --apply
 *   node scripts/apply_people_socials.js --apply --force
 *   node scripts/apply_people_socials.js --apply --min-confidence high
 *   node scripts/apply_people_socials.js --apply --methods harvest,search
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { personKey, normalizeLinkedIn, normalizeTwitter } = require('./lib/social_extract');

const { COL_PERSONAL, COL_PROFESSIONAL } = require('./lib/person_email');

const ROOT = path.join(__dirname, '..');
const PEOPLE_CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const SOCIAL_CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-social-candidates.json');

function parseArgs(argv) {
  const args = { apply: false, force: false, methods: null, minConfidence: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--force') args.force = true;
    else if (a === '--methods') args.methods = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--min-confidence') args.minConfidence = String(argv[++i] || '').trim();
  }
  return args;
}

function isEmpty(raw) {
  const s = String(raw || '').trim();
  return !s || /^(n\/?a|-|none|na)$/i.test(s);
}

function confidenceRank(c) {
  const v = String(c || '').toLowerCase();
  if (v === 'high') return 3;
  if (v === 'medium') return 2;
  if (v === 'low') return 1;
  return 2;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const candidates = JSON.parse(fs.readFileSync(SOCIAL_CANDIDATES_PATH, 'utf8'));
  const rows = parse(fs.readFileSync(PEOPLE_CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  const byKey = new Map();
  rows.forEach((r, idx) => {
    const name = (r['First Name'] || '').trim();
    const company = (r.Company || '').trim();
    if (!name) return;
    byKey.set(personKey(name, company), { row: r, idx });
  });

  const minRank = args.minConfidence ? confidenceRank(args.minConfidence) : 0;
  let wouldLi = 0;
  let wouldTw = 0;
  let skippedNoMatch = 0;
  let skippedMethod = 0;
  let skippedConfidence = 0;
  let skippedFilled = 0;
  const samples = [];

  for (const c of candidates.found || []) {
    if (args.methods && !args.methods.includes(c.method)) {
      skippedMethod++;
      continue;
    }
    if (args.minConfidence && confidenceRank(c.confidence) < minRank) {
      skippedConfidence++;
      continue;
    }

    const key = c.key || personKey(c.name, c.company);
    const hit = byKey.get(key);
    if (!hit) {
      skippedNoMatch++;
      continue;
    }

    const li = normalizeLinkedIn(c.linkedinUrl || '');
    const tw = normalizeTwitter(c.twitterUrl || '');
    let changed = false;
    const before = { li: hit.row['LinkedIn URL'], tw: hit.row['Twitter URL'] };

    if (li) {
      if (args.force || isEmpty(hit.row['LinkedIn URL'])) {
        if (args.apply) hit.row['LinkedIn URL'] = li;
        wouldLi++;
        changed = true;
      } else {
        skippedFilled++;
      }
    }
    if (tw) {
      if (args.force || isEmpty(hit.row['Twitter URL'])) {
        if (args.apply) hit.row['Twitter URL'] = tw;
        wouldTw++;
        changed = true;
      } else {
        skippedFilled++;
      }
    }

    if (changed && samples.length < 20) {
      samples.push({
        name: c.name,
        company: c.company,
        linkedinUrl: li || '(unchanged)',
        twitterUrl: tw || '(unchanged)',
        method: c.method,
        before
      });
    }
  }

  console.log(`Staged found: ${(candidates.found || []).length}`);
  console.log(`Would set LinkedIn: ${wouldLi}`);
  console.log(`Would set Twitter: ${wouldTw}`);
  console.log(`Skipped (no CSV match): ${skippedNoMatch}`);
  console.log(`Skipped (already filled): ${skippedFilled}`);
  if (args.methods) console.log(`Skipped (method filter): ${skippedMethod}`);
  if (args.minConfidence) console.log(`Skipped (confidence filter): ${skippedConfidence}`);

  console.log('\nSample patches:');
  samples.forEach((s) => {
    console.log(`  ${s.name} | ${s.company} | li=${s.linkedinUrl} | tw=${s.twitterUrl} | ${s.method}`);
  });

  if (!args.apply) {
    console.log('\nDry run — nothing written. Re-run with --apply to patch the CSV.');
    return;
  }

  const columns = Object.keys(rows[0] || {
    'First Name': '',
    [COL_PERSONAL]: '',
    [COL_PROFESSIONAL]: '',
    Company: '',
    Title: '',
    'LinkedIn URL': '',
    'Twitter URL': ''
  });
  fs.writeFileSync(PEOPLE_CSV_PATH, stringify(rows, { header: true, columns }));
  console.log(`\nPatched Individuals CSV → ${PEOPLE_CSV_PATH}`);
}

main();
