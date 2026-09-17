#!/usr/bin/env node
/** One-off: merge round 15 of manually-researched people (batch of 20). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Polygon Ventures', name: 'Shreyansh Singh', title: 'Head of Investments', linkedinUrl: '', sourceUrl: 'https://incubatorlist.com/shreyansh-singh', method: 'manual-research', confidence: 'high' },
  { company: 'Woodstock Fund', name: 'Pranav Sharma', title: 'Co-Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://yourstory.com/2020/07/indian-blockchain-ecosystem-startups-woodstock-fund', method: 'manual-research', confidence: 'high' },
  { company: 'Woodstock Fund', name: 'Himanshu Yadav', title: 'Founding Partner / General Partner', linkedinUrl: 'https://linkedin.com/in/hyws', sourceUrl: 'https://yourstory.com/2021/10/woodstock-fund-blockchain-crypto-investor-dlt-startups', method: 'manual-research', confidence: 'high' },
  { company: 'Dream Sports Ventures', name: 'Harsh Jain', title: 'Co-Founder & CEO, Dream Sports', linkedinUrl: '', sourceUrl: 'https://www.dreamsports.group/', method: 'manual-research', confidence: 'high' },
  { company: 'Varanium Capital Advisors', name: 'T. S. Anantakrishnan', title: 'Founder & Managing Partner', linkedinUrl: 'https://www.linkedin.com/in/t-s-anantakrishnan-46a358', sourceUrl: 'https://varanium.vc/our-team-2/', method: 'manual-research', confidence: 'high' },
  { company: 'Varanium Capital Advisors', name: 'Aparajit Bhandarkar', title: 'Partner, Venture Capital', linkedinUrl: '', sourceUrl: 'https://varanium.vc/our-team-2/', method: 'manual-research', confidence: 'high' },
  { company: 'CoinDCX Ventures', name: 'Rohit Jain', title: 'Head of Ventures and Investments', linkedinUrl: '', sourceUrl: 'https://economictimes.indiatimes.com/markets/cryptocurrency/coindcx-launches-coindcx-ventures-to-deploy-rs-100-cr-in-web3-ecosystem/articleshow/91463662.cms', method: 'manual-research', confidence: 'high' },
  { company: 'SBI Caps Ventures / SBICAP Ventures', name: 'Prem Prabhakar', title: 'Managing Director & CEO', linkedinUrl: '', sourceUrl: 'https://sbiventures.co.in/about-us/our-people/', method: 'manual-research', confidence: 'high' },
  { company: 'Kerala Startup Mission', name: 'Anoop Ambika', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/anoopambika', sourceUrl: 'https://www.ciol.com/serial-entrepreneur-anoop-ambika-new-ceo-kerala-startup-mission/', method: 'manual-research', confidence: 'high' }
];

const UNRESOLVABLE = [
  'Atomico',
  'Balderton Capital',
  'Coinbase Ventures',
  'YZi Labs',
  'SBI Investment',
  'Honda Ventures',
  'Toyota Ventures',
  'Hyundai CRADLE',
  'Bosch Ventures',
  'Invert by Groww',
  'Cipla New Ventures',
  'Apollo Connect / Apollo Hospitals Ventures',
  'Mechanism Capital'
];

function main() {
  const data = JSON.parse(fs.readFileSync(CANDIDATES_PATH, 'utf8'));
  const resolvedCompanies = new Set([
    ...NEW_FOUND.map((p) => p.company),
    ...UNRESOLVABLE
  ]);

  const beforeFound = data.found.length;
  const beforeUnresolved = data.unresolved.length;

  data.found.push(...NEW_FOUND);
  data.unresolved = data.unresolved.filter((u) => !resolvedCompanies.has(u.company));

  if (!data.skipped) data.skipped = [];
  for (const company of UNRESOLVABLE) {
    data.skipped.push({ company, reason: 'no-credible-india-lead-or-inactive', method: 'manual-research' });
  }

  fs.writeFileSync(CANDIDATES_PATH, JSON.stringify(data, null, 2));

  console.log(`found: ${beforeFound} -> ${data.found.length} (+${NEW_FOUND.length})`);
  console.log(`unresolved: ${beforeUnresolved} -> ${data.unresolved.length} (-${beforeUnresolved - data.unresolved.length} orgs; ${UNRESOLVABLE.length} skipped)`);
}

main();
