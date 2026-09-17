#!/usr/bin/env node
/** One-off: merge round 5 of manually-researched (WebSearch, grounded) people. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'OperatorVC', name: 'Abhishek Agarwal', title: 'Founder & General Partner', linkedinUrl: 'https://linkedin.com/in/aggyabhishek', sourceUrl: 'https://in.linkedin.com/company/operatorvc', method: 'manual-research', confidence: 'high' },
  { company: 'Supermorpheus', name: 'Sameer Guglani', title: 'Founder', linkedinUrl: 'https://linkedin.com/in/sameerguglani', sourceUrl: 'https://supermorpheus.com/', method: 'manual-research', confidence: 'high' },
  { company: 'Wavelaunch VC', name: 'Arunav Gupta', title: 'Managing Partner', linkedinUrl: 'https://linkedin.com/in/arunavv', sourceUrl: 'https://wavelaunch.org/investor-centre/', method: 'manual-research', confidence: 'high' },
  { company: 'Bertelsmann India Investments', name: 'Pankaj Makkar', title: 'Managing Director', linkedinUrl: 'https://in.linkedin.com/in/pankajmakkar', sourceUrl: 'https://www.avcj.com/avcj/interview/3028579/q-a-bertelsmann-india-investments-pankaj-makkar', method: 'manual-research', confidence: 'high' },
  { company: 'Everstone Group ', name: 'Sameer Sain', title: 'Co-Founder & Group CEO', linkedinUrl: '', sourceUrl: 'https://eversourcecapital.com/team/sameer-sain/', method: 'manual-research', confidence: 'high' },
  { company: 'Ascent Capital', name: 'Raja Kumar', title: 'Founder & Managing Partner', linkedinUrl: 'https://linkedin.com/in/raja-kumar-455b7245', sourceUrl: 'https://mergr.com/investor/ascent-capital/team', method: 'manual-research', confidence: 'high' },
  { company: 'Burman Family Holdings', name: 'Gaurav Burman', title: 'Head, Burman Family Holdings', linkedinUrl: '', sourceUrl: 'https://burmanfh.com/investing-next-generation/', method: 'manual-research', confidence: 'high' },
  { company: 'Narotam Sekhsaria Family Office', name: 'Darshan Engineer', title: 'Chief Executive Officer', linkedinUrl: 'https://linkedin.com/in/darshan-engineer-0b5258375', sourceUrl: 'https://inforcapital.com/companies/narotam-sekhsaria-family-office/', method: 'manual-research', confidence: 'high' }
];

function main() {
  const data = JSON.parse(fs.readFileSync(CANDIDATES_PATH, 'utf8'));
  const resolvedCompanies = new Set(NEW_FOUND.map((p) => p.company));

  const beforeFound = data.found.length;
  const beforeUnresolved = data.unresolved.length;

  data.found.push(...NEW_FOUND);
  data.unresolved = data.unresolved.filter((u) => !resolvedCompanies.has(u.company));

  fs.writeFileSync(CANDIDATES_PATH, JSON.stringify(data, null, 2));

  console.log(`found: ${beforeFound} -> ${data.found.length} (+${NEW_FOUND.length})`);
  console.log(`unresolved: ${beforeUnresolved} -> ${data.unresolved.length} (-${resolvedCompanies.size} orgs resolved)`);
}

main();
