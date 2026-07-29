#!/usr/bin/env node
/**
 * Phase 4: seed People rows for solo angel investors already present as
 * "Angel / Individual" (and similar) orgs in Org.csv.
 *
 * Each eligible angel org becomes a People row:
 *   First Name = Company name
 *   Company    = Company name  (links back to their org page)
 *   Title      = Angel Investor
 *
 * Usage:
 *   node scripts/seed_angel_individuals.js            # dry run
 *   node scripts/seed_angel_individuals.js --apply     # append to Individuals CSV
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const ROOT = path.join(__dirname, '..');
const ORG_CSV_PATH = path.join(ROOT, 'Updated VC Dekho Sheet - Org.csv');
const PEOPLE_CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');

const ORGISH_NAME =
  /\b(network|ventures|venture|fund|capital|angels|syndicate|group|partners|investments|circle|platform|foundation|club|progress|accelerator|incubator)\b/i;

function isEligibleAngelOrg(row) {
  const type = String(row['Company Type'] || '').trim();
  const name = String(row.Company || '').trim();
  if (!name) return false;
  if (ORGISH_NAME.test(name)) return false;

  if (type === 'Angel / Individual') return true;
  if (/^Angel Investor \(Individual\)/i.test(type)) return true;
  if (/^Angel Investor \//i.test(type)) return true;
  if (type === 'Individual Investor') return true;

  // Bare "Angel" type includes both people and brands — keep person-like names only.
  if (type === 'Angel') {
    return /^[A-Za-z.'-]+(?:\s+[A-Za-z.'-]+){0,3}$/.test(name) && !ORGISH_NAME.test(name);
  }
  return false;
}

function looksLikePersonName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length < 1 || parts.length > 4) return false;
  return parts.every((p) => /^[A-Za-z.'-]+$/.test(p));
}

function normKey(name, company) {
  return `${String(name || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()}||${String(company || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')}`;
}

function main() {
  const apply = process.argv.includes('--apply');

  const orgRows = parse(fs.readFileSync(ORG_CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  const peopleRows = parse(fs.readFileSync(PEOPLE_CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  const existingKeys = new Set(peopleRows.map((r) => normKey(r['First Name'], r.Company)));
  // Also treat an existing person whose company OR first name equals the angel name as covered.
  const existingNames = new Set();
  for (const r of peopleRows) {
    const fn = String(r['First Name'] || '')
      .trim()
      .toLowerCase();
    const co = String(r.Company || '')
      .trim()
      .toLowerCase();
    if (fn) existingNames.add(fn);
    if (co) existingNames.add(co);
  }

  const eligible = orgRows.filter((o) => isEligibleAngelOrg(o) && looksLikePersonName(o.Company));
  const toAdd = [];
  const skippedExisting = [];

  for (const org of eligible) {
    const name = org.Company.trim();
    const key = normKey(name, name);
    if (existingKeys.has(key) || existingNames.has(name.toLowerCase())) {
      skippedExisting.push(name);
      continue;
    }
    toAdd.push({
      name,
      company: name,
      title: 'Angel Investor',
      linkedinUrl: String(org['Company Linkedin'] || '').trim(),
      method: 'angel-org-seed'
    });
    existingNames.add(name.toLowerCase());
    existingKeys.add(key);
  }

  console.log(`Eligible angel individuals in Org.csv: ${eligible.length}`);
  console.log(`Already represented in People CSV: ${skippedExisting.length}`);
  console.log(`Would add: ${toAdd.length}`);

  if (!apply) {
    console.log('\nDry run — nothing written. Re-run with --apply to append.');
    console.log('\nSample to add:');
    toAdd.slice(0, 20).forEach((c) => console.log(`  ${c.name} | ${c.title} | linkedin=${c.linkedinUrl || '(none)'}`));
    return;
  }

  const columns = Object.keys(
    peopleRows[0] || {
      'First Name': '',
      Email: '',
      Company: '',
      Title: '',
      'LinkedIn URL': '',
      'Twitter URL': ''
    }
  );

  for (const c of toAdd) {
    const row = {};
    for (const col of columns) row[col] = '';
    row['First Name'] = c.name;
    row.Company = c.company;
    row.Title = c.title;
    row['LinkedIn URL'] = c.linkedinUrl || '';
    peopleRows.push(row);
  }

  fs.writeFileSync(PEOPLE_CSV_PATH, stringify(peopleRows, { header: true, columns }));
  console.log(`\nAppended ${toAdd.length} angel individuals → ${PEOPLE_CSV_PATH}`);
  console.log(`Individuals CSV now has ${peopleRows.length} total rows.`);
}

main();
