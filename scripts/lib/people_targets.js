/**
 * Computes the Phase 3 target org list: non-angel, non-government-grant orgs
 * from Org.csv that currently have zero people mapped in the Individuals CSV.
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { resolveOrg, normStrict } = require('./org_lookup');

const ROOT = path.join(__dirname, '..', '..');
const ORG_CSV_PATH = path.join(ROOT, 'Updated VC Dekho Sheet - Org.csv');
const PEOPLE_CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');

function isAngelType(type) {
  return /angel/i.test(String(type || ''));
}

function isGovtGrantType(type) {
  return /government grant/i.test(String(type || ''));
}

function loadOrgRows() {
  return parse(fs.readFileSync(ORG_CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });
}

function loadPeopleRows() {
  return parse(fs.readFileSync(PEOPLE_CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });
}

function coveredCompanyKeys(peopleRows) {
  const covered = new Set();
  for (const p of peopleRows) {
    if (!p.Company || !p.Company.trim()) continue;
    const res = resolveOrg(p.Company);
    covered.add(res.match ? normStrict(res.match.company) : normStrict(p.Company));
  }
  return covered;
}

/** Returns the full Phase 3 target org list (in Org.csv row order). */
function getTargetOrgs() {
  const orgRows = loadOrgRows();
  const peopleRows = loadPeopleRows();
  const covered = coveredCompanyKeys(peopleRows);

  return orgRows.filter((org) => {
    if (!org.Company || !org.Company.trim()) return false;
    const type = org['Company Type'] || '';
    if (isAngelType(type)) return false;
    if (isGovtGrantType(type)) return false;
    return !covered.has(normStrict(org.Company));
  });
}

module.exports = { getTargetOrgs, loadOrgRows, loadPeopleRows, coveredCompanyKeys, isAngelType, isGovtGrantType };
