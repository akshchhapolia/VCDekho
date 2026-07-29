/**
 * Resolve a free-text company name (as written in the Individuals sheet)
 * to the matching org row / website domain from the main Org.csv.
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const ROOT = path.join(__dirname, '..', '..');
const ORG_CSV_PATH = path.join(ROOT, 'Updated VC Dekho Sheet - Org.csv');

const SUFFIX_WORDS = new Set([
  'ventures', 'venture', 'capital', 'partners', 'partner', 'fund', 'funds', 'vc',
  'advisors', 'advisor', 'llp', 'pvt', 'private', 'ltd', 'limited', 'india',
  'group', 'holdings', 'company', 'co', 'and', 'the', 'network', 'associates',
  'management', 'investments', 'investment'
]);

function normStrict(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function normLoose(s) {
  const tokens = String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !SUFFIX_WORDS.has(t));
  return tokens.join('');
}

function domainFromWebsite(url) {
  const s = String(url || '').trim();
  if (!s) return '';
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
}

let _index = null;

function buildIndex() {
  const rows = parse(fs.readFileSync(ORG_CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  const strict = new Map(); // normStrict(company) -> row(s)
  const loose = new Map(); // normLoose(company) -> row(s)

  for (const row of rows) {
    const company = row.Company || '';
    if (!company.trim()) continue;
    const domain = domainFromWebsite(row.Website);
    const entry = { company, domain, website: row.Website || '' };

    const sKey = normStrict(company);
    if (sKey) {
      if (!strict.has(sKey)) strict.set(sKey, []);
      strict.get(sKey).push(entry);
    }
    const lKey = normLoose(company);
    if (lKey) {
      if (!loose.has(lKey)) loose.set(lKey, []);
      loose.get(lKey).push(entry);
    }
  }

  return { strict, loose, rows };
}

function getIndex() {
  if (!_index) _index = buildIndex();
  return _index;
}

/**
 * Resolve a company name to a single confident match.
 * Returns { match: {company, domain, website}, ambiguous: bool, matchedBy: 'strict'|'loose'|null }
 */
function resolveOrg(companyRaw) {
  if (!companyRaw || !companyRaw.trim()) return { match: null, ambiguous: false, matchedBy: null };
  const { strict, loose } = getIndex();

  const sKey = normStrict(companyRaw);
  const sHit = strict.get(sKey);
  if (sHit && sHit.length === 1) return { match: sHit[0], ambiguous: false, matchedBy: 'strict' };
  if (sHit && sHit.length > 1) return { match: null, ambiguous: true, matchedBy: 'strict', candidates: sHit };

  const lKey = normLoose(companyRaw);
  const lHit = loose.get(lKey);
  if (lHit && lHit.length === 1) return { match: lHit[0], ambiguous: false, matchedBy: 'loose' };
  if (lHit && lHit.length > 1) return { match: null, ambiguous: true, matchedBy: 'loose', candidates: lHit };

  return { match: null, ambiguous: false, matchedBy: null };
}

module.exports = { resolveOrg, domainFromWebsite, normStrict, normLoose };
