#!/usr/bin/env node
/** One-off: merge round 8 of manually-researched (WebSearch, grounded) people. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Saison Capital', name: 'Visa Kannan', title: 'Managing Partner', linkedinUrl: 'https://linkedin.com/in/visalakshi-kannan', sourceUrl: 'https://startupintros.com/orgs/saison-capital', method: 'manual-research', confidence: 'high' },
  { company: 'Integra Partners', name: 'Chris Kaptein', title: 'Managing Partner', linkedinUrl: '', sourceUrl: 'https://integrapartners.co/integra-news/integra-partners-announces-us90m-fund-ii-close-and-regional-expansion/', method: 'manual-research', confidence: 'medium' },
  { company: 'Momentum Capital', name: 'Ankur Shrivastava', title: 'Founder & Managing Partner', linkedinUrl: 'https://www.linkedin.com/in/srivast', sourceUrl: 'https://mvcapital.vc/team.html', method: 'manual-research', confidence: 'high' },
  { company: 'AC Ventures', name: 'Tarun Bhargava', title: 'General Partner', linkedinUrl: '', sourceUrl: 'https://in.linkedin.com/company/a-cventure', method: 'manual-research', confidence: 'medium' },
  { company: 'Silicon Valley Quad (SVQ)', name: 'Kanwal Rekhi', title: 'Founding Partner', linkedinUrl: 'https://linkedin.com/in/kanwalrekhi', sourceUrl: 'https://svquad.com/', method: 'manual-research', confidence: 'medium' },
  { company: 'N+1 Capital', name: 'Rahul Chowdhury', title: 'Co-Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://www.np1.in/team/', method: 'manual-research', confidence: 'high' },
  { company: 'N+1 Capital', name: 'Ashish Singla', title: 'Co-Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://www.np1.in/team/', method: 'manual-research', confidence: 'high' },
  { company: 'B Capital ', name: 'Karan Mohla', title: 'General Partner (South & Southeast Asia)', linkedinUrl: '', sourceUrl: 'https://b.capital/team/karan-mohla/', method: 'manual-research', confidence: 'high' }
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
