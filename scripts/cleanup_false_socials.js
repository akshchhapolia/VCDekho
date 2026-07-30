#!/usr/bin/env node
/**
 * One-off: clear harvest false-positives where LinkedIn slug / Twitter handle
 * does not match the person's name.
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const {
  linkedinSlugMatchesName,
  twitterHandleMatchesName,
  normalizeLinkedIn,
  normalizeTwitter
} = require('./lib/social_extract');

const ROOT = path.join(__dirname, '..');
const candPath = path.join(ROOT, 'data', 'candidates', 'people-social-candidates.json');
const csvPath = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');

const c = JSON.parse(fs.readFileSync(candPath, 'utf8'));
const badPairs = [];

for (const f of c.found) {
  if (f.linkedinUrl && !linkedinSlugMatchesName(f.linkedinUrl, f.name)) {
    badPairs.push({ name: f.name, company: f.company, field: 'linkedin', url: f.linkedinUrl });
    f.linkedinUrl = '';
  }
  if (f.twitterUrl && !twitterHandleMatchesName(f.twitterUrl, f.name)) {
    badPairs.push({ name: f.name, company: f.company, field: 'twitter', url: f.twitterUrl });
    f.twitterUrl = '';
  }
}
c.found = c.found.filter((f) => f.linkedinUrl || f.twitterUrl);
fs.writeFileSync(candPath, JSON.stringify(c, null, 2));

const rows = parse(fs.readFileSync(csvPath, 'utf8'), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
  bom: true
});
let cleared = 0;
for (const r of rows) {
  const name = (r['First Name'] || '').trim();
  const company = (r.Company || '').trim();
  for (const bad of badPairs) {
    if (bad.name !== name || bad.company !== company) continue;
    if (bad.field === 'linkedin' && normalizeLinkedIn(r['LinkedIn URL']) === normalizeLinkedIn(bad.url)) {
      r['LinkedIn URL'] = '';
      cleared++;
    }
    if (bad.field === 'twitter' && normalizeTwitter(r['Twitter URL']) === normalizeTwitter(bad.url)) {
      r['Twitter URL'] = '';
      cleared++;
    }
  }
}
fs.writeFileSync(csvPath, stringify(rows, { header: true, columns: Object.keys(rows[0]) }));
console.log('Bad pairs cleared', badPairs.length);
badPairs.forEach((b) => console.log(' ', b.field, b.name, '->', b.url));
console.log('CSV cells cleared', cleared);
console.log('Remaining found', c.found.length);
