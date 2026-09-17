#!/usr/bin/env node
/** One-off: merge round 9 of manually-researched (WebSearch, grounded) people. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Anay Ventures', name: 'Avantika Mandhani', title: 'Founding Partner', linkedinUrl: 'https://www.linkedin.com/in/avantika-mandhani-b18b11105', sourceUrl: 'https://www.linkedin.com/company/anay-ventures', method: 'manual-research', confidence: 'high' },
  { company: 'WaterBridge Ventures', name: 'Manish Kheterpal', title: 'Co-founder & Managing Partner', linkedinUrl: 'https://www.linkedin.com/in/mkheterpal', sourceUrl: 'https://informaconnect.com/superventure/speakers/manish-kheterpal/', method: 'manual-research', confidence: 'high' },
  { company: 'SRI Capital', name: 'Sashi Reddi', title: 'Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://www.cbinsights.com/investor/sri-capital', method: 'manual-research', confidence: 'high' },
  { company: 'Force Ventures', name: 'Karthik Bhat', title: 'Founder & Managing Partner', linkedinUrl: 'https://linkedin.com/in/karthik-bhat-8221b61', sourceUrl: 'https://f4.fund/firms/force-ventures', method: 'manual-research', confidence: 'high' },
  { company: '9Unicorns', name: 'Apoorva Ranjan Sharma', title: 'Co-Founder & Managing Director', linkedinUrl: 'https://www.linkedin.com/in/drapoorvsharma', sourceUrl: 'https://theorg.com/org/9unicorns-accelerator-fund/org-chart/apoorva-ranjan-sharma', method: 'manual-research', confidence: 'high' },
  { company: 'LetsVenture', name: 'Shanti Mohan', title: 'Founder & CEO', linkedinUrl: 'https://linkedin.com/in/shantimohanlv', sourceUrl: 'https://tracxn.com/d/companies/letsventure/__W1m-CELpZ-0ZI5-ozx4gOjFd6f-3sJcmfcpA6vE8Gfg', method: 'manual-research', confidence: 'high' },
  { company: 'Mumbai Angels Network', name: 'Nandini Mansinghka', title: 'Co-founder & CEO', linkedinUrl: 'https://www.linkedin.com/in/nandinimansinghka', sourceUrl: 'https://www.bloomberg.com/profile/person/21035076', method: 'manual-research', confidence: 'high' },
  { company: 'Hyderabad Angels', name: 'J A Chowdary', title: 'Founder & Chairman', linkedinUrl: '', sourceUrl: 'https://www.business-standard.com/article/finance/hyderabad-angels-gives-start-ups-a-boost-112112202001_1.html', method: 'manual-research', confidence: 'high' },
  { company: 'Lead Angels', name: 'Sushanto Mitra', title: 'Founder & CEO', linkedinUrl: 'https://in.linkedin.com/in/sushantomitra', sourceUrl: 'https://theorg.com/org/lead-angels/org-chart/sushanto-mitra', method: 'manual-research', confidence: 'high' },
  { company: 'Calcutta Angels Network', name: 'Raghav Kanoria', title: 'First Co-Founder', linkedinUrl: 'https://www.linkedin.com/in/raghav-kanoria-30195412', sourceUrl: 'https://startupintros.com/orgs/calcutta-angels', method: 'manual-research', confidence: 'high' }
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
