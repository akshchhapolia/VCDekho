#!/usr/bin/env node
/** One-off: merge round 14 of manually-researched people (batch of 20). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Brand Capital', name: 'Srini Vudayagiri', title: 'President, The Times of India & Head of Brand Capital', linkedinUrl: 'https://linkedin.com/in/srinivudayagiri', sourceUrl: 'https://brandcapital.co.in/', method: 'manual-research', confidence: 'high' },
  { company: 'Nazara Ventures', name: 'Nitish Mittersain', title: 'Founder, CEO & Joint MD', linkedinUrl: '', sourceUrl: 'https://investors.nazara.com/about', method: 'manual-research', confidence: 'high' },
  { company: 'Sony Innovation Fund', name: 'Yoko Fukata', title: 'Head of Sony Ventures India', linkedinUrl: 'https://www.linkedin.com/in/yoko-fukata-94633a173', sourceUrl: 'https://www.sonyinnovationfund.com/team/', method: 'manual-research', confidence: 'high' },
  { company: 'Shell Ventures', name: 'Robert Linck', title: 'Chief Investment Officer & Co-Founder (leads India team)', linkedinUrl: '', sourceUrl: 'https://staging.indiaenergyweek.com/strategic-conference-speakers/executive-session-speakers/robert-linck/', method: 'manual-research', confidence: 'high' },
  { company: 'IAN Fund', name: 'Padmaja Ruparel', title: 'Co-Founder & Senior Managing Partner', linkedinUrl: 'https://www.linkedin.com/in/padmajaruparel', sourceUrl: 'https://iangroup.vc/team_members/padmaja-ruparel-bioangels/', method: 'manual-research', confidence: 'high' },
  { company: 'IAN Fund', name: 'Rajnish Kapur', title: 'Managing Partner', linkedinUrl: 'https://linkedin.com/in/kapurrajnish', sourceUrl: 'https://alphafund.iangroup.vc/', method: 'manual-research', confidence: 'high' },
  { company: 'CIIE.CO', name: 'Priyanka Agarwal Chopra', title: 'CEO & Managing Partner', linkedinUrl: 'https://in.linkedin.com/in/priyanka-agarwal-chopra', sourceUrl: 'https://iimaventures.com/team/', method: 'manual-research', confidence: 'high' },
  { company: 'T-Hub', name: 'Kavikrut', title: 'CEO', linkedinUrl: 'https://www.linkedin.com/in/kavikrut', sourceUrl: 'https://timesofindia.indiatimes.com/city/hyderabad/telangana-govt-ropes-in-former-oyo-cxo-kavikrut-to-helm-t-hub/articleshow/118782337.cms', method: 'manual-research', confidence: 'high' },
  { company: 'CIE IIIT Hyderabad', name: 'C. V. Jawahar', title: 'CEO', linkedinUrl: '', sourceUrl: 'https://cie.iiit.ac.in/the-team/', method: 'manual-research', confidence: 'high' },
  { company: 'Zone Startups India', name: 'Hemant Gupta', title: 'Managing Director', linkedinUrl: '', sourceUrl: 'https://in.marketscreener.com/insider/HEMANT-GUPTA-A3KDJV/', method: 'manual-research', confidence: 'high' },
  { company: 'Piramal Alternatives', name: 'Kalpesh Kikani', title: 'Managing Director & CEO', linkedinUrl: 'https://www.linkedin.com/in/kalpesh-kikani-5275901b3', sourceUrl: 'https://theorg.com/org/piramal-group/org-chart/kalpesh-kikani', method: 'manual-research', confidence: 'high' },
  { company: 'Edelweiss Alternative Asset Advisors', name: 'Amit Agarwal', title: 'CEO', linkedinUrl: '', sourceUrl: 'https://www.vccircle.com/eaaaindia-alts-names-amit-agarwal-sole-ceo-as-co-ceo-steps-down', method: 'manual-research', confidence: 'high' },
  { company: 'Motilal Oswal Private Equity', name: 'Vishal Tulsyan', title: 'Founder, MD & CEO', linkedinUrl: '', sourceUrl: 'https://www.motilaloswal.com/our-businesses/private-equity', method: 'manual-research', confidence: 'high' },
  { company: 'JM Financial Private Equity', name: 'Darius Pandole', title: 'Managing Director & CEO', linkedinUrl: '', sourceUrl: 'https://mergr.com/investor/jm-financial-private-equity/team/darius-pandole', method: 'manual-research', confidence: 'high' }
];

const UNRESOLVABLE = [
  'BP Ventures',
  'Energy Impact Partners',
  'Valar Ventures',
  'Thrive Capital',
  'New Enterprise Associates',
  'Andreessen Horowitz',
  'Founders Fund'
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
