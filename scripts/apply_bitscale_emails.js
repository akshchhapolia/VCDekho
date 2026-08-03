#!/usr/bin/env node
/**
 * Apply emails exported from Bitscale back into the Individuals CSV + rebuild people.json.
 *
 * Expected input CSV columns (flexible names):
 *   csv_index OR linkedin_url OR full_name+company
 *   Email 1 OR Fetch Personal Email (personal) OR Email (professional/work)
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
const {
  COL_PERSONAL,
  COL_PROFESSIONAL,
  isValidEmail,
  normLinkedin
} = require('./lib/person_email');

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

function pickEmail(item) {
  const personalKeys = ['Email 1', 'Fetch Personal Email', 'personal_email', 'Personal Email'];
  const workKeys = ['Email', 'email', 'work_email', 'Professional Email'];
  for (const k of personalKeys) {
    const v = item[k];
    if (isValidEmail(v)) return { email: String(v).trim(), source: 'personal' };
  }
  for (const k of workKeys) {
    const v = item[k];
    if (isValidEmail(v)) return { email: String(v).trim(), source: 'work' };
  }
  return null;
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

  let appliedPersonal = 0;
  let appliedWork = 0;
  let skipped = 0;

  for (const item of incoming) {
    const picked = pickEmail(item);
    if (!picked) {
      skipped++;
      continue;
    }
    const { email, source } = picked;
    const col = source === 'personal' ? COL_PERSONAL : COL_PROFESSIONAL;

    let idx = item.csv_index != null && item.csv_index !== ''
      ? Number(item.csv_index)
      : NaN;

    if (Number.isNaN(idx)) {
      const li = normLinkedin(
        item.linkedin_url || item['LinkedIn URL'] || item['Personal LinkedIn URL'] ||
        item.LinkedIn || item['Linkedin id']
      );
      const company = String(item.company || item.Company || item['Company name'] || '').trim().toLowerCase();
      const fullName = String(item.full_name || item['Full Name'] || item.name || item.Name || '').trim().toLowerCase();
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

    const existing = String(rows[idx][col] || '').trim();
    if (existing && existing.toLowerCase() === email.toLowerCase()) {
      skipped++;
      continue;
    }
    if (existing && existing.toLowerCase() !== email.toLowerCase()) {
      console.warn(`Skip [${idx}] ${col} already has ${existing}`);
      skipped++;
      continue;
    }

    console.log(`✓ [${idx}] ${rows[idx]['First Name']} → ${col}: ${email}`);
    if (!args.dryRun) rows[idx][col] = email;
    if (source === 'personal') appliedPersonal++;
    else appliedWork++;
  }

  if (!args.dryRun && (appliedPersonal > 0 || appliedWork > 0)) {
    fs.writeFileSync(CSV_PATH, stringify(rows, { header: true, columns: Object.keys(rows[0] || {}) }));
    execSync('node scripts/build_people_json.js', { cwd: ROOT, stdio: 'inherit' });
  }

  console.log(`\nApplied personal: ${appliedPersonal}, professional: ${appliedWork}, skipped: ${skipped}${args.dryRun ? ' (dry run)' : ''}.`);
}

main();
