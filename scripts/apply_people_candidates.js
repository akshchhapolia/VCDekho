#!/usr/bin/env node
/**
 * Review/apply step for staged people candidates (from find_people.js and/or
 * the agent-assisted follow-up pass). Appends new rows into the Individuals
 * CSV. Never overwrites existing rows; skips a candidate if a person with the
 * same (normalized name, company) already exists.
 *
 * Usage:
 *   node scripts/apply_people_candidates.js               # dry run: shows what would be added
 *   node scripts/apply_people_candidates.js --apply        # actually appends to the CSV
 *   node scripts/apply_people_candidates.js --apply --min-method crawl,agent-verified
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const ROOT = path.join(__dirname, '..');
const PEOPLE_CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

function parseArgs(argv) {
  const args = { apply: false, methods: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--min-method') args.methods = String(argv[++i] || '').split(',').map((s) => s.trim());
  }
  return args;
}

function normKey(name, company) {
  return `${String(name || '').toLowerCase().replace(/[^a-z\s]/g, '').trim()}||${String(company || '').toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

function loadPeopleCsv() {
  return parse(fs.readFileSync(PEOPLE_CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });
}

function savePeopleCsv(rows) {
  const columns = Object.keys(rows[0] || {});
  fs.writeFileSync(PEOPLE_CSV_PATH, stringify(rows, { header: true, columns }));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const candidates = JSON.parse(fs.readFileSync(CANDIDATES_PATH, 'utf8'));
  const rows = loadPeopleCsv();

  const existingKeys = new Set(rows.map((r) => normKey(r['First Name'], r.Company)));
  const seenThisRun = new Set();

  const toAdd = [];
  const skippedDupe = [];
  const skippedMethod = [];

  for (const c of candidates.found) {
    if (args.methods && !args.methods.includes(c.method)) {
      skippedMethod.push(c);
      continue;
    }
    const key = normKey(c.name, c.company);
    if (existingKeys.has(key) || seenThisRun.has(key)) {
      skippedDupe.push(c);
      continue;
    }
    seenThisRun.add(key);
    toAdd.push(c);
  }

  console.log(`Staged candidates: ${candidates.found.length}`);
  console.log(`Would add: ${toAdd.length}`);
  console.log(`Skipped (already in CSV / dup): ${skippedDupe.length}`);
  if (args.methods) console.log(`Skipped (method filter): ${skippedMethod.length}`);

  if (!args.apply) {
    console.log('\nDry run — nothing written. Re-run with --apply to write these rows into the CSV.');
    console.log('\nSample of rows that would be added:');
    toAdd.slice(0, 15).forEach((c) => console.log(`  ${c.name} | ${c.title || ''} | ${c.company} | src=${c.sourceUrl || c.method}`));
    return;
  }

  const columns = Object.keys(rows[0] || { 'First Name': '', Email: '', Company: '', Title: '', 'LinkedIn URL': '', 'Twitter URL': '' });
  for (const c of toAdd) {
    const row = {};
    for (const col of columns) row[col] = '';
    row['First Name'] = c.name;
    row.Email = '';
    row.Company = c.company;
    row.Title = c.title || '';
    row['LinkedIn URL'] = c.linkedinUrl || '';
    row['Twitter URL'] = '';
    rows.push(row);
  }

  savePeopleCsv(rows);
  console.log(`\nAppended ${toAdd.length} new rows → ${PEOPLE_CSV_PATH}`);
  console.log(`Individuals CSV now has ${rows.length} total rows.`);
}

main();
