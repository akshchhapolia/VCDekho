#!/usr/bin/env node
/**
 * Apply Bitscale export: LinkedIn, company, and email updates to Individuals CSV.
 *
 * Usage:
 *   node scripts/apply_bitscale_updates.js --from "Updated - Bitscale - LinkedinID update.csv"
 *   node scripts/apply_bitscale_updates.js --from results.csv --dry-run
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
  isLikelyPersonal,
  normLinkedin
} = require('./lib/person_email');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const ANGEL_CORRECTIONS_PATH = path.join(ROOT, 'data', 'candidates', 'angel-investor-corrections.json');

/** Rows to remove from Individuals CSV (bad angel entries or departed people). */
const REMOVE_NAMES = new Set([
  'MS Dhoni',
  'BeyondSeed',
  'Cogniphy',
  'Equentis',
  'Perpetuity',
  'Transition VC',
  'Serge Bhachu'
]);

/** Remove stale duplicate rows: { name, company }. */
const REMOVE_NAME_COMPANY = [
  { name: 'Abhishek Agarwal', company: '100X.VC' }
];

function parseArgs(argv) {
  const args = { from: '', dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--from') args.from = argv[++i] || '';
    else if (argv[i] === '--dry-run') args.dryRun = true;
  }
  if (!args.from) {
    console.error('Usage: node scripts/apply_bitscale_updates.js --from <bitscale-export.csv> [--dry-run]');
    process.exit(1);
  }
  return args;
}

function normName(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normCompany(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function linkedinFromRow(item) {
  return String(
    item.LinkedIn || item['LinkedIn URL'] || item['Linkedin id'] ||
    item.linkedin_url || item['Personal LinkedIn URL'] || ''
  ).trim();
}

function emailFromRow(item) {
  const raw = String(item.Email || item['Email Waterfall'] || '').trim();
  if (!isValidEmail(raw)) return null;
  return raw;
}

function companyFromRow(item) {
  return String(item.Company || item['Company name'] || '').trim();
}

function findRowIndex(rows, name, companyHint) {
  const n = normName(name);
  const c = normCompany(companyHint);
  const matches = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => normName(r['First Name']) === n);

  if (!matches.length) {
    // Partial: first name only when unique
    const partial = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => normName(r['First Name']).startsWith(n.split(' ')[0]));
    if (partial.length === 1) return partial[0].i;
    return -1;
  }
  if (matches.length === 1) return matches[0].i;

  if (c) {
    const byCompany = matches.filter(({ r }) => {
      const rc = normCompany(r.Company);
      return rc === c || rc.includes(c) || c.includes(rc);
    });
    if (byCompany.length === 1) return byCompany[0].i;

    // Match by known org aliases in existing CSV
    const aliasMap = {
      'abyro capital': ['social alpha'],
      'seviora': ['pavilion capital'],
      'sri venture partners': ['multiple ventures'],
      'appreciate capital': ['100x.vc', '100x vc', 'operatorvc']
    };
    for (const [target, aliases] of Object.entries(aliasMap)) {
      if (c === target || aliases.includes(c)) {
        const hit = matches.find(({ r }) => {
          const rc = normCompany(r.Company);
          return rc === target || aliases.some((a) => rc === a || rc.includes(a));
        });
        if (hit) return hit.i;
      }
    }
  }

  // Prefer row missing professional email (Bitscale target list)
  const noWork = matches.filter(({ r }) => !isValidEmail(r[COL_PROFESSIONAL]));
  if (noWork.length === 1) return noWork[0].i;

  return matches[0].i;
}

function updateAngelCorrections(name, company, linkedin) {
  if (!fs.existsSync(ANGEL_CORRECTIONS_PATH)) return;
  const data = JSON.parse(fs.readFileSync(ANGEL_CORRECTIONS_PATH, 'utf8'));
  let changed = false;
  if (company && /^angel investor$/i.test(company) === false) {
    if (data.companyByName[name] !== company) {
      data.companyByName[name] = company;
      changed = true;
    }
  }
  if (linkedin && linkedin.includes('/in/')) {
    const li = linkedin.startsWith('http') ? linkedin : `https://www.linkedin.com/in/${linkedin}`;
    if (data.verifiedLinkedInByName[name] !== li) {
      data.verifiedLinkedInByName[name] = li;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(ANGEL_CORRECTIONS_PATH, `${JSON.stringify(data, null, 2)}\n`);
    console.log(`  ↳ angel corrections updated for ${name}`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const fromPath = path.isAbsolute(args.from) ? args.from : path.join(ROOT, args.from);
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

  let rows = parse(fs.readFileSync(CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  const before = rows.length;
  rows = rows.filter((r) => {
    const name = String(r['First Name'] || '').trim();
    const company = String(r.Company || '').trim();
    if (REMOVE_NAMES.has(name)) return false;
    return !REMOVE_NAME_COMPANY.some(
      (x) => normName(x.name) === normName(name) && normCompany(x.company) === normCompany(company)
    );
  });
  const removed = before - rows.length;
  if (removed) console.log(`Removed ${removed} rows: ${[...REMOVE_NAMES].join(', ')}`);

  let companyUpdates = 0;
  let linkedinUpdates = 0;
  let emailUpdates = 0;
  let skipped = 0;
  let noMatch = 0;

  for (const item of incoming) {
    const name = String(item.Name || item.name || '').trim();
    if (!name || REMOVE_NAMES.has(name)) continue;

    const company = companyFromRow(item);
    const linkedin = linkedinFromRow(item);
    const email = emailFromRow(item);

    if (!company && !linkedin && !email) {
      skipped++;
      continue;
    }

    const idx = findRowIndex(rows, name, company);
    if (idx < 0) {
      console.warn(`No match: ${name} (${company || '—'})`);
      noMatch++;
      continue;
    }

    const row = rows[idx];
    const changes = [];

    if (company && company !== row.Company) {
      changes.push(`company: ${row.Company} → ${company}`);
      if (!args.dryRun) row.Company = company;
      companyUpdates++;
    }

    if (linkedin) {
      const normalized = linkedin.startsWith('http') ? linkedin : `https://www.linkedin.com/in/${linkedin.replace(/^\/+/, '')}`;
      if (normLinkedin(row['LinkedIn URL']) !== normLinkedin(normalized)) {
        changes.push(`linkedin: ${normalized}`);
        if (!args.dryRun) row['LinkedIn URL'] = normalized;
        linkedinUpdates++;
      }
    }

    if (email) {
      const col = isLikelyPersonal(email) ? COL_PERSONAL : COL_PROFESSIONAL;
      const existing = String(row[col] || '').trim();
      if (!existing || existing.toLowerCase() !== email.toLowerCase()) {
        if (existing && existing.toLowerCase() !== email.toLowerCase()) {
          changes.push(`${col}: ${existing} → ${email}`);
        } else {
          changes.push(`${col}: ${email}`);
        }
        if (!args.dryRun) row[col] = email;
        emailUpdates++;
      }
    }

    if (changes.length) {
      console.log(`✓ ${name}: ${changes.join('; ')}`);
      if (!args.dryRun && /^angel investor$/i.test(row.Title || '')) {
        updateAngelCorrections(name, company || row.Company, linkedin);
      }
    } else {
      skipped++;
    }
  }

  if (!args.dryRun && (removed || companyUpdates || linkedinUpdates || emailUpdates)) {
    fs.writeFileSync(CSV_PATH, stringify(rows, { header: true, columns: Object.keys(rows[0] || {}) }));
    execSync('node scripts/build_people_json.js', { cwd: ROOT, stdio: 'inherit' });
    execSync('node scripts/fix_angel_investors.js', { cwd: ROOT, stdio: 'inherit' });
  }

  console.log(`\nRemoved: ${removed}, company: ${companyUpdates}, linkedin: ${linkedinUpdates}, email: ${emailUpdates}, skipped: ${skipped}, no match: ${noMatch}${args.dryRun ? ' (dry run)' : ''}`);
}

main();
