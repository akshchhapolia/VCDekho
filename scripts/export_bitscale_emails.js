#!/usr/bin/env node
/**
 * Export investors missing personal or professional email → CSV for Bitscale import.
 *
 * Usage:
 *   node scripts/export_bitscale_emails.js --missing personal
 *   node scripts/export_bitscale_emails.js --missing professional
 *   node scripts/export_bitscale_emails.js --missing both
 *   node scripts/export_bitscale_emails.js --missing both [--linkedin-only]
 *
 * Output:
 *   data/candidates/missing-personal-email.csv
 *   data/candidates/missing-professional-email.csv
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { deriveName } = require('./lib/person_name');
const { resolveOrg } = require('./lib/org_lookup');
const { COL_PERSONAL, COL_PROFESSIONAL, isValidEmail } = require('./lib/person_email');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const OUT_DIR = path.join(ROOT, 'data', 'candidates');
const ANGEL_CORRECTIONS_PATH = path.join(ROOT, 'data', 'candidates', 'angel-investor-corrections.json');

function loadAngelCompanies() {
  try {
    const data = JSON.parse(fs.readFileSync(ANGEL_CORRECTIONS_PATH, 'utf8'));
    return data.companyByName || {};
  } catch {
    return {};
  }
}

function resolveCompanyName(row, angelCompanies) {
  const raw = (row.Company || '').trim();
  const name = (row['First Name'] || '').trim();
  if (/^angel investor$/i.test(raw) && angelCompanies[name]) return angelCompanies[name];
  return raw || angelCompanies[name] || '';
}

function parseArgs(argv) {
  const args = { missing: 'both', limit: Infinity, linkedinOnly: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--missing') args.missing = String(argv[++i] || 'both').toLowerCase();
    else if (argv[i] === '--limit') args.limit = Number(argv[++i]);
    else if (argv[i] === '--linkedin-only') args.linkedinOnly = true;
  }
  return args;
}

function buildExportRows(rows, args, missingKind, angelCompanies) {
  const col = missingKind === 'personal' ? COL_PERSONAL : COL_PROFESSIONAL;
  const out = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (isValidEmail(row[col])) continue;
    if (!(row['First Name'] || '').trim()) continue;

    const linkedin = (row['LinkedIn URL'] || '').trim();
    if (args.linkedinOnly && !linkedin) continue;

    const name = deriveName(row['First Name'], linkedin);
    const company = resolveCompanyName(row, angelCompanies);
    const org = resolveOrg(company);
    let website = (org.match && org.match.website) ? org.match.website.trim() : '';
    if (!website && org.match && org.match.domain) {
      website = org.match.domain.includes('.') ? `https://${org.match.domain}` : '';
    }

    out.push({
      Name: `${name.firstname} ${name.lastname}`.trim() || row['First Name'].trim(),
      Company: company,
      'Company website': website,
      LinkedIn: linkedin
    });
    if (out.length >= args.limit) break;
  }

  return out;
}

function writeCsv(fileName, rows) {
  const outPath = path.join(OUT_DIR, fileName);
  const columns = ['Name', 'Company', 'Company website', 'LinkedIn'];
  fs.writeFileSync(outPath, stringify(rows, { header: true, columns }));
  return outPath;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = parse(fs.readFileSync(CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const kinds = args.missing === 'both'
    ? ['personal', 'professional']
    : [args.missing];

  if (!kinds.every((k) => k === 'personal' || k === 'professional')) {
    console.error('Usage: --missing personal | professional | both');
    process.exit(1);
  }

  const angelCompanies = loadAngelCompanies();

  for (const kind of kinds) {
    const exported = buildExportRows(rows, args, kind, angelCompanies);
    const fileName = kind === 'personal'
      ? 'missing-personal-email.csv'
      : 'missing-professional-email.csv';
    const outPath = writeCsv(fileName, exported);
    const withWebsite = exported.filter((r) => (r['Company website'] || '').trim()).length;
    console.log(`${kind}: ${exported.length} rows (${withWebsite} with company website) → ${outPath}`);
  }

  console.log('\nImport into Bitscale, map LinkedIn → Personal LinkedIn URL, run waterfall, then:');
  console.log('  node scripts/apply_bitscale_emails.js --from <bitscale-export.csv>');
}

main();
