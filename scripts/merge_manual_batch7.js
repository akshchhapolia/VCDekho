#!/usr/bin/env node
/** One-off: merge round 7 of manually-researched (WebSearch, grounded) people. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Marwari Catalysts', name: 'Sushil Sharma', title: 'Founder & CEO', linkedinUrl: 'https://www.linkedin.com/in/sushilsharmamcats', sourceUrl: 'https://www.marwaricatalysts.com/team', method: 'manual-research', confidence: 'high' },
  { company: 'Tanas Capital', name: 'Amit Sharma', title: 'Managing Director & Founder', linkedinUrl: 'https://sg.linkedin.com/in/aamitsharma', sourceUrl: 'https://www.tcapital.sg/people', method: 'manual-research', confidence: 'high' },
  { company: 'GUSEC', name: 'Srinivasa Rao Sureddi', title: 'Chief Executive Officer', linkedinUrl: 'https://linkedin.com/in/srinivasa-rao-sureddi-a4a14a68', sourceUrl: 'https://gusec.edu.in/team/', method: 'manual-research', confidence: 'high' },
  { company: 'AUM Ventures', name: 'Chetan Mehta', title: 'Founding Partner', linkedinUrl: 'https://www.linkedin.com/in/chetanmehta-aumvc', sourceUrl: 'https://aumvc.com/team', method: 'manual-research', confidence: 'high' },
  { company: 'TVentures', name: 'Abhishek Gupta', title: 'Managing Partner', linkedinUrl: '', sourceUrl: 'https://edugrowth.org.au/2021/06/12/international-investor-lens-with-abhishek-gupta/', method: 'manual-research', confidence: 'high' },
  { company: 'Foster Ventures', name: 'Priya Ramachandran', title: 'Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://www.fostervc.com/', method: 'manual-research', confidence: 'medium' },
  { company: 'Alfa Ventures', name: 'Dhianu Das', title: 'Founder', linkedinUrl: 'https://www.linkedin.com/in/dhianu', sourceUrl: 'https://www.vccircle.com/angel-investor-dhianu-das-floats-proprietary-seed-fund', method: 'manual-research', confidence: 'high' },
  { company: 'Auxano Capital', name: 'Brijesh Damodaran Nair', title: 'Managing Partner & Co-founder', linkedinUrl: 'https://www.linkedin.com/in/brijeshdamodaran', sourceUrl: 'https://bridgeindia.org.uk/speaker/brijesh-damodaran/', method: 'manual-research', confidence: 'high' }
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
