#!/usr/bin/env node
/** One-off: merge round 2 of manually-researched (WebSearch, grounded) people. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Kae Capital', name: 'Sasha Mirchandani', title: 'Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://kae-capital.com/our-team/sasha-mirchandani/', method: 'manual-research', confidence: 'high' },
  { company: 'Orios Venture Partners', name: 'Rehan Yar Khan', title: 'Founder & Managing Partner', linkedinUrl: 'https://www.linkedin.com/in/rehanyarkhan', sourceUrl: 'https://www.oriosvp.com/rehan-yar-khan', method: 'manual-research', confidence: 'high' },
  { company: 'Stellaris Venture Partners', name: 'Alok Goyal', title: 'Co-founder & Partner', linkedinUrl: '', sourceUrl: 'https://www.founderthesis.com/p/the-man-who-keeps-a-spreadsheet-of', method: 'manual-research', confidence: 'high' },
  { company: 'Stellaris Venture Partners', name: 'Rahul Chowdhri', title: 'Co-founder & Partner', linkedinUrl: 'https://www.stellarisvp.com/team/rahul-chowdhri', sourceUrl: 'https://www.stellarisvp.com/team/rahul-chowdhri', method: 'manual-research', confidence: 'high' },
  { company: 'Lok Capital', name: 'Vishal Mehta', title: 'Co-founder & Partner', linkedinUrl: '', sourceUrl: 'https://www.lokcapital.com/people/vishal-mehta', method: 'manual-research', confidence: 'high' },
  { company: 'Lok Capital', name: 'Venky Natarajan', title: 'Co-founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://www.lokcapital.com/people/venky-natarajan', method: 'manual-research', confidence: 'high' },
  { company: 'AdvantEdge Founders', name: 'Kunal Khattar', title: 'Founder & Managing Partner', linkedinUrl: 'https://linkedin.com/in/kkhattar', sourceUrl: 'https://theorg.com/org/advantedge-founders/org-chart/kunal-khattar', method: 'manual-research', confidence: 'high' },
  { company: 'Green Frontier Capital', name: 'Sandiip Bhammer', title: 'Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://www.greenfrontiercapital.com/sandiip-bhammer', method: 'manual-research', confidence: 'high' },
  { company: 'Guild Capital', name: 'Iain Shovlin', title: 'Founder, Chairman & Managing Partner', linkedinUrl: '', sourceUrl: 'http://guildcap.com/', method: 'manual-research', confidence: 'high' },
  { company: 'Z3Partners', name: 'Gautam Patel', title: 'Founder & Managing Partner', linkedinUrl: 'https://linkedin.com/in/gautam-patel-288b3a8', sourceUrl: 'https://www.vccircle.com/z3partnersmarks-final-close-of-tech-fund', method: 'manual-research', confidence: 'high' },
  { company: 'Z3Partners', name: 'Rishi Maheshwari', title: 'Co-founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://www.vccircle.com/z3partnersmarks-final-close-of-tech-fund', method: 'manual-research', confidence: 'high' },
  { company: 'Nueva Capital', name: 'Ashish Chand', title: 'Founding Partner', linkedinUrl: '', sourceUrl: 'https://www.lighthouse-canton.com/in/our-businesses/asset-management/private-market-funds/lc-nueva-aif', method: 'manual-research', confidence: 'high' },
  { company: 'Nueva Capital', name: 'Sohil Chand', title: 'Founding Partner & CIO', linkedinUrl: '', sourceUrl: 'https://www.lighthouse-canton.com/in/our-businesses/asset-management/private-market-funds/lc-nueva-aif', method: 'manual-research', confidence: 'high' },
  { company: 'Appreciate Capital', name: 'Abhishek Agarwal', title: 'Managing Partner', linkedinUrl: 'https://linkedin.com/in/aggyabhishek', sourceUrl: 'https://in.linkedin.com/company/appreciate-capital', method: 'manual-research', confidence: 'high' }
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
