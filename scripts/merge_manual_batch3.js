#!/usr/bin/env node
/** One-off: merge round 3 of manually-researched (WebSearch, grounded) people. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Spiral Ventures Pte. Ltd.', name: 'Sujit Kunte', title: 'Partner and Head of India', linkedinUrl: '', sourceUrl: 'https://spiral-ventures.com/teams/', method: 'manual-research', confidence: 'high' },
  { company: 'Lodha Ventures', name: 'Abhinandan Lodha', title: 'Chief Executive Officer & Owner', linkedinUrl: '', sourceUrl: 'https://www.thecompanycheck.com/company/b/lodha-ventures/53x9aak0ai4jymqm7', method: 'manual-research', confidence: 'high' },
  { company: 'Wami Capital - Single Family Office', name: 'Anisha Ramakrishnan', title: 'Chief Executive Officer', linkedinUrl: 'https://ae.linkedin.com/in/anisha-ramakrishnan-1a61785b', sourceUrl: 'https://wamicapital.com/', method: 'manual-research', confidence: 'high' },
  { company: '3 Peaks Ventures', name: 'Akshat Chaudhary', title: 'Director & Partner', linkedinUrl: 'https://linkedin.com/in/akshat-chaudhary-a1388189', sourceUrl: 'https://in.linkedin.com/company/3-peaks-ventures', method: 'manual-research', confidence: 'high' },
  { company: 'Superb Capital', name: 'Shilpin Tater', title: 'Founder', linkedinUrl: 'https://www.linkedin.com/in/shilpin-tater-baa25013', sourceUrl: 'https://superbcapital.in/', method: 'manual-research', confidence: 'high' },
  { company: 'Agility Ventures', name: 'Dhianu Das', title: 'Co-founder', linkedinUrl: '', sourceUrl: 'https://india.entrepreneur.com/news-and-trends/always-agile-dhianu-das-co-founder-agility-ventures/456216', method: 'manual-research', confidence: 'high' },
  { company: 'Agility Ventures', name: 'Prashant Narang', title: 'Co-founder', linkedinUrl: '', sourceUrl: 'https://india.entrepreneur.com/news-and-trends/always-agile-dhianu-das-co-founder-agility-ventures/456216', method: 'manual-research', confidence: 'high' },
  { company: 'Eternal Capital (India)', name: 'Dhruv Dhanraj Bahl', title: 'Founder & Managing Partner', linkedinUrl: 'https://linkedin.com/in/dhruv-dhanraj-bahl-3857a033', sourceUrl: 'https://www.business-standard.com/companies/start-ups/former-bharatpe-coo-bahl-led-eternal-capital-launches-rs-120-crore-vc-fund-124050200009_1.html', method: 'manual-research', confidence: 'high' },
  { company: '888vc', name: 'Rohit Bafna', title: 'Founder & CEO', linkedinUrl: 'https://www.linkedin.com/in/iamrohitbafna', sourceUrl: 'https://www.888vc.co/about', method: 'manual-research', confidence: 'high' },
  { company: 'Blue Ashva Capital', name: 'Satya Bansal', title: 'Founder & CEO', linkedinUrl: 'https://www.linkedin.com/in/satyabansal', sourceUrl: 'https://blueashvacapital.com/our-team', method: 'manual-research', confidence: 'high' },
  { company: '1818 Venture Capital', name: 'Richard Avery-Wright', title: 'Founding Partner & CEO', linkedinUrl: '', sourceUrl: 'https://www.1818venturecapital.com/about', method: 'manual-research', confidence: 'medium' }
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
