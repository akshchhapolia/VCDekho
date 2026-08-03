#!/usr/bin/env node
/**
 * One-time migration: split legacy Email into Personal Email + Professional Email
 * using Bitscale exports when available.
 *
 * Usage: node scripts/migrate_split_emails.js
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const {
  COL_PERSONAL,
  COL_PROFESSIONAL,
  COL_LEGACY,
  isValidEmail,
  isLikelyPersonal,
  normLinkedin
} = require('./lib/person_email');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const BITSCALE_FILES = [
  'bitscale-upload (Imported)_2026-08-03_01-19-20.csv',
  'bitscale-upload (Imported)_2026-08-03_01-24-46.csv'
];

function loadBitscaleMaps() {
  const personal = new Map();
  const professional = new Map();

  for (const file of BITSCALE_FILES) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) continue;
    const rows = parse(fs.readFileSync(filePath, 'utf8'), {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      bom: true
    });
    for (const row of rows) {
      const li = normLinkedin(row.LinkedIn);
      if (!li) continue;
      if (isValidEmail(row['Email 1'])) personal.set(li, String(row['Email 1']).trim());
      if (isValidEmail(row['Fetch Personal Email'])) {
        personal.set(li, String(row['Fetch Personal Email']).trim());
      }
      if (isValidEmail(row.Email)) professional.set(li, String(row.Email).trim());
    }
  }

  return { personal, professional };
}

function main() {
  const { personal: personalMap, professional: profMap } = loadBitscaleMaps();
  const rows = parse(fs.readFileSync(CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  let withPersonal = 0;
  let withProfessional = 0;
  let withDisplay = 0;

  for (const row of rows) {
    const li = normLinkedin(row['LinkedIn URL']);
    let personal = li ? (personalMap.get(li) || '') : '';
    let professional = li ? (profMap.get(li) || '') : '';
    const legacy = String(row[COL_LEGACY] || '').trim();

    if (legacy && isValidEmail(legacy)) {
      if (!personal && !professional) {
        if (isLikelyPersonal(legacy)) personal = legacy;
        else professional = legacy;
      } else if (!personal && isLikelyPersonal(legacy) && legacy.toLowerCase() !== professional.toLowerCase()) {
        personal = legacy;
      } else if (!professional && !isLikelyPersonal(legacy)) {
        professional = legacy;
      } else if (!professional) {
        professional = legacy;
      } else if (!personal && legacy.toLowerCase() === personal.toLowerCase()) {
        personal = legacy;
      } else if (!personal && legacy.toLowerCase() !== professional.toLowerCase() && isLikelyPersonal(legacy)) {
        personal = legacy;
      }
    }

    row[COL_PERSONAL] = personal;
    row[COL_PROFESSIONAL] = professional;
    delete row[COL_LEGACY];

    if (isValidEmail(personal)) withPersonal++;
    if (isValidEmail(professional)) withProfessional++;
    if (isValidEmail(professional) || isValidEmail(personal)) withDisplay++;
  }

  const columns = ['First Name', COL_PERSONAL, COL_PROFESSIONAL, 'Company', 'Title', 'LinkedIn URL', 'Twitter URL'];
  fs.writeFileSync(CSV_PATH, stringify(rows, { header: true, columns }));

  console.log(`Migrated ${rows.length} rows → ${CSV_PATH}`);
  console.log(`Personal: ${withPersonal}, Professional: ${withProfessional}, Display (prof or personal): ${withDisplay}`);
}

main();
