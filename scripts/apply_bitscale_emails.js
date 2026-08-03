#!/usr/bin/env node
/**
 * Apply emails exported from Bitscale back into the Individuals CSV + rebuild people.json.
 *
 * Expected input CSV columns (flexible names):
 *   csv_index OR linkedin_url OR full_name+company
 *   email OR Email OR work_email OR personal_email
 *
 * Usage:
 *   node scripts/apply_bitscale_emails.js --from path/to/bitscale-results.csv [--dry-run]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');

function parseArgs(argv) {
  const args = { from: '', dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from') args.from = argv[++i] || '';
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  if (!args.from) {
    console.error('Usage: node scripts/apply_bitscale_emails.js --from results.csv [--dry-run]');
    process.exit(1);
  }
  return args;
}

function pick(row, keys) {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return '';
}

function normLinkedin(u) {
  return String(u || '').toLowerCase().replace(/\/+$/, '');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const fromPath = path.isAbsolute(args.from) ? args.from : path.join(process.cwd(), args.from);
  if (!fs.existsSync(fromPath)) {
    console.error('File not found:', fromPath);
    process.exit(1);
  }

  const incoming = parse(fs.readFileSync(fromPath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    bom: true
  });

  const rows = parse(fs.readFileSync(CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  let applied = 0;
  let skipped = 0;

  for (const item of incoming) {
    const email = pick(item, ['email', 'Email', 'work_email', 'personal_email', 'Personal Email']);
    if (!email || !email.includes('@')) {
      skipped++;
      continue;
    }

    let idx = item.csv_index != null && item.csv_index !== ''
      ? Number(item.csv_index)
      : NaN;

    if (Number.isNaN(idx)) {
    const li = normLinkedin(pick(item, ['linkedin_url', 'LinkedIn URL', 'Personal LinkedIn URL', 'LinkedIn']));
    const company = pick(item, ['company', 'Company']).toLowerCase();
    const fullName = pick(item, ['full_name', 'Full Name', 'name', 'Name']).toLowerCase();
      idx = rows.findIndex((r) => {
        if (li && normLinkedin(r['LinkedIn URL']) === li) return true;
        if (fullName && company) {
          return String(r['First Name'] || '').toLowerCase().includes(fullName.split(' ')[0]) &&
            String(r.Company || '').toLowerCase() === company;
        }
        return false;
      });
    }

    if (idx < 0 || !rows[idx]) {
      console.warn('No match for', email);
      skipped++;
      continue;
    }

    const existing = (rows[idx].Email || '').trim();
    if (existing && existing.toLowerCase() !== email.toLowerCase()) {
      console.warn(`Skip [${idx}] already has ${existing}`);
      skipped++;
      continue;
    }

    console.log(`✓ [${idx}] ${rows[idx]['First Name']} → ${email}`);
    if (!args.dryRun) rows[idx].Email = email;
    applied++;
  }

  if (!args.dryRun && applied > 0) {
    fs.writeFileSync(CSV_PATH, stringify(rows, { header: true, columns: Object.keys(rows[0] || {}) }));
    execSync('node scripts/build_people_json.js', { cwd: ROOT, stdio: 'inherit' });
  }

  console.log(`\nApplied ${applied}, skipped ${skipped}${args.dryRun ? ' (dry run)' : ''}.`);
}

main();
