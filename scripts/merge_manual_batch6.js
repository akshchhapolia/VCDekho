#!/usr/bin/env node
/** One-off: merge round 6 of manually-researched (WebSearch, grounded) people. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Samara Capital', name: 'Sumeet Narang', title: 'Founder & Managing Director', linkedinUrl: 'https://in.linkedin.com/in/sumeet-narang111', sourceUrl: 'https://samaracapital.com/', method: 'manual-research', confidence: 'high' },
  { company: 'Chona Family Office', name: 'Nirali Solani', title: 'Head - Family Office', linkedinUrl: 'https://linkedin.com/in/nirali-solani-83105a4b', sourceUrl: 'https://www.vccircle.com/whychona-family-office-hit-a-pause-on-lp-investments', method: 'manual-research', confidence: 'high' },
  { company: 'MGA Ventures', name: 'Gautam Ashra', title: 'Promoter', linkedinUrl: '', sourceUrl: 'http://mgaventures.in/', method: 'manual-research', confidence: 'high' },
  { company: 'MGA Ventures', name: 'Jay Desai', title: 'Partner & Head of Investments', linkedinUrl: 'https://linkedin.com/in/jaydesai91', sourceUrl: 'http://mgaventures.in/', method: 'manual-research', confidence: 'high' },
  { company: 'Madison India Capital', name: 'Surya Chadha', title: 'Founder & Managing Director', linkedinUrl: 'https://www.linkedin.com/in/suryachadha', sourceUrl: 'https://www.madison-india.com/team', method: 'manual-research', confidence: 'high' },
  { company: 'PeerCapital', name: 'Ankur Pahwa', title: 'Managing Partner', linkedinUrl: '', sourceUrl: 'https://peercapital.in/', method: 'manual-research', confidence: 'high' },
  { company: 'PeerCapital', name: 'Karthik Prabhakar', title: 'Managing Partner', linkedinUrl: '', sourceUrl: 'https://peercapital.in/', method: 'manual-research', confidence: 'high' },
  { company: 'The Venture Folks', name: 'Nishtha Sethi', title: 'Founder', linkedinUrl: 'https://in.linkedin.com/in/nishtha-sethi', sourceUrl: 'https://linkedin.com/company/theventurefolks', method: 'manual-research', confidence: 'high' },
  { company: 'RPSG Capital Ventures', name: 'Abhishek Goenka', title: 'Managing Partner & CIO', linkedinUrl: 'https://www.linkedin.com/in/abhishekgoenka', sourceUrl: 'https://rpsgcapital.vc/team/abhishek-goenka', method: 'manual-research', confidence: 'high' },
  { company: 'GVFL Limited', name: 'Mihir Joshi', title: 'Managing Director', linkedinUrl: 'https://linkedin.com/in/mihirjoshi-mj', sourceUrl: 'https://gvfl.com/team', method: 'manual-research', confidence: 'high' },
  { company: 'Axilor Ventures', name: 'Ganapathy Venugopal', title: 'Co-founder & CEO', linkedinUrl: '', sourceUrl: 'https://www.axilor.com/person/ganapathy-venugopal/', method: 'manual-research', confidence: 'high' },
  { company: 'VenturEast', name: 'Sarath Naru', title: 'Founder & Managing Partner', linkedinUrl: 'https://linkedin.com/in/sarathnaru', sourceUrl: 'https://www.ventureast.net/team/sarath-naru', method: 'manual-research', confidence: 'high' }
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
