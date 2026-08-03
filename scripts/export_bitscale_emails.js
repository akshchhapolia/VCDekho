#!/usr/bin/env node
/**
 * Export investors missing email → CSV for Bitscale grid import (Growth plan UI workflow).
 *
 * Usage:
 *   node scripts/export_bitscale_emails.js [--limit 500] [--linkedin-only]
 *
 * Output: data/candidates/bitscale-upload-YYYY-MM-DD.csv
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { deriveName } = require('./lib/person_name');
const { resolveOrg } = require('./lib/org_lookup');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const OUT_DIR = path.join(ROOT, 'data', 'candidates');

function parseArgs(argv) {
  const args = { limit: 500, linkedinOnly: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit') args.limit = Number(argv[++i]);
    else if (argv[i] === '--linkedin-only') args.linkedinOnly = true;
  }
  return args;
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

  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if ((row.Email || '').trim()) continue;
    if (!(row['First Name'] || '').trim()) continue;

    const linkedin = (row['LinkedIn URL'] || '').trim();
    if (args.linkedinOnly && !linkedin) continue;

    const name = deriveName(row['First Name'], linkedin);
    const org = resolveOrg(row.Company);
    let website = (org.match && org.match.website) ? org.match.website.trim() : '';
    if (!website && org.match && org.match.domain) {
      website = org.match.domain.includes('.') ? `https://${org.match.domain}` : '';
    }
    const domain = (org.match && (org.match.domain || org.match.company)) || row.Company;

    out.push({
      Name: `${name.firstname} ${name.lastname}`.trim() || row['First Name'].trim(),
      Company: row.Company,
      'Company Website': website,
      LinkedIn: linkedin,
      csv_index: i
    });
    if (out.length >= args.limit) break;
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const outPath = path.join(OUT_DIR, `bitscale-upload-${date}.csv`);
  const columns = ['Name', 'Company', 'Company Website', 'LinkedIn'];
  const forFile = out.map(({ csv_index, ...rest }) => rest);
  fs.writeFileSync(outPath, stringify(forFile, { header: true, columns }));

  console.log(`Exported ${out.length} rows → ${outPath}`);
  console.log('Import into Bitscale "Email Production" grid, map Personal LinkedIn URL column, run waterfall, then:');
  console.log('  node scripts/apply_bitscale_emails.js --from data/candidates/bitscale-export-results.csv');
}

main();
