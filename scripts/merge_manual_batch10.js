#!/usr/bin/env node
/** One-off: merge round 10 of manually-researched (WebSearch, grounded) people. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Info Edge Ventures', name: 'Sanjeev Bikhchandani', title: 'Founder', linkedinUrl: '', sourceUrl: 'https://infoedgeventures.in/', method: 'manual-research', confidence: 'high' },
  { company: 'Info Edge Ventures', name: 'Chinmaya Sharma', title: 'Partner', linkedinUrl: '', sourceUrl: 'https://www.infoedgeventures.in/team', method: 'manual-research', confidence: 'high' },
  { company: 'Flipkart Ventures', name: 'Nishant Verman', title: 'SVP, Corporate Development & Partnerships (Flipkart Ventures)', linkedinUrl: '', sourceUrl: 'https://www.linkedin.com/posts/flipkart_were-pleased-to-welcome-nishant-verman-back-activity-7442157154930954240-Uofl', method: 'manual-research', confidence: 'high' },
  { company: 'JioGenNext', name: 'Amey Mashelkar', title: 'Head', linkedinUrl: 'https://linkedin.com/in/amey-mashelkar-20239a4', sourceUrl: 'https://www.ril.com/about/jiogennext', method: 'manual-research', confidence: 'high' },
  { company: 'Mahindra Partners', name: 'Zhooben Bhiwandiwala', title: 'President', linkedinUrl: '', sourceUrl: 'https://www.cbinsights.com/investor/mahindra-partners', method: 'manual-research', confidence: 'high' },
  { company: 'Mahindra Partners', name: 'Parag Shah', title: 'President, Group Legal Member', linkedinUrl: 'https://in.linkedin.com/in/parag-shah-1b96597', sourceUrl: 'https://www.mahindra.com/blogs/investing-in-the-businesses-of-tomorrow-mahindra-partners', method: 'manual-research', confidence: 'high' }
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
