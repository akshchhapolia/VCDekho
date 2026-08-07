#!/usr/bin/env node
/** One-off: merge round 17 of manually-researched people (batch of 20). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Forge Innovation & Ventures', name: 'Vish Sahasranamam', title: 'Co-Founder & CEO', linkedinUrl: 'https://www.linkedin.com/in/vishforge', sourceUrl: 'https://www.forge-iv.co/forge-people/', method: 'manual-research', confidence: 'high' },
  { company: 'KIIT-TBI', name: 'Mrutyunjay Suar', title: 'CEO', linkedinUrl: '', sourceUrl: 'https://tto.kiitincubator.in/team/mrutyunjay-suar/', method: 'manual-research', confidence: 'high' },
  { company: 'PSG-STEP', name: 'K. Suresh Kumar', title: 'Executive Director', linkedinUrl: 'https://linkedin.com/in/k-suresh-kumar-0b3ab29', sourceUrl: 'http://www.psgstep.org/index.php?page_id=3&sub_id=20', method: 'manual-research', confidence: 'high' },
  { company: 'AIC-SMU Technology Business Incubation Foundation', name: 'Tejbanta S. Chingtham', title: 'CEO', linkedinUrl: '', sourceUrl: 'https://www.smutbi.com/in-news-2/', method: 'manual-research', confidence: 'high' },
  { company: 'Nativelead Foundation / Nativelead Angels', name: 'Nagaraja Prakasam', title: 'Co-Founder, Chairman & Interim CEO', linkedinUrl: '', sourceUrl: 'https://www.nativelead.org/team_nativelead.php', method: 'manual-research', confidence: 'high' },
  { company: 'TiE Delhi-NCR Angels', name: 'Alok Mittal', title: 'President, TiE Delhi-NCR', linkedinUrl: 'https://linkedin.com/in/alok-mittal-590a', sourceUrl: 'https://www.tice.news/tice-dispatch/tie-delhi-ncr-elevates-leadership-announces-new-appointments-4755504', method: 'manual-research', confidence: 'high' },
  { company: 'TiE Mumbai Angels', name: 'Apoorva Ranjan Sharma', title: 'President, TiE Mumbai', linkedinUrl: '', sourceUrl: 'https://www.linkedin.com/posts/drapoorvsharma_im-honored-to-share-that-ive-joined-as-activity-7321112764549095424-s542', method: 'manual-research', confidence: 'high' },
  { company: 'TiE Chennai Angels', name: 'Shankar V', title: 'Head of Executive Committee, The Chennai Angels', linkedinUrl: '', sourceUrl: 'https://thechennaiangels.com/about-us/', method: 'manual-research', confidence: 'high' },
  { company: 'JITO Angel Network', name: 'Seema Baid', title: 'President', linkedinUrl: '', sourceUrl: 'https://in.linkedin.com/company/jitojiif', method: 'manual-research', confidence: 'high' },
  { company: 'Tata Capital Innovations', name: 'Vineet Chadha', title: 'Partner & Head, Venture Start-up Investments', linkedinUrl: 'https://www.linkedin.com/in/vineetchadhacfa', sourceUrl: 'https://theorg.com/org/tata-capital-limited/org-chart/vineet-chadha', method: 'manual-research', confidence: 'high' },
  { company: 'NIIF', name: 'Sanjiv Aggarwal', title: 'Managing Director & CEO', linkedinUrl: '', sourceUrl: 'https://niifindia.in/about/', method: 'manual-research', confidence: 'high' },
  { company: 'NABKISAN Finance / NABARD ecosystem', name: 'Immanuvel Ganesan', title: 'Managing Director & CEO, NABKISAN Finance', linkedinUrl: 'https://www.linkedin.com/in/immanuvel-ganesan-28494172', sourceUrl: 'https://www.nabkisan.org/board-of-director', method: 'manual-research', confidence: 'high' },
  { company: 'Wipro Ventures', name: 'Ali Wasti', title: 'Managing Partner', linkedinUrl: 'https://www.linkedin.com/in/aliwasti', sourceUrl: 'https://www.wipro.com/ventures/team/ali-wasti/', method: 'manual-research', confidence: 'high' },
  { company: 'Freshworks Capital', name: 'Girish Mathrubootham', title: 'Founder & CEO, Freshworks', linkedinUrl: '', sourceUrl: 'https://inc42.com/buzz/together-sets-up-early-stage-vc-fund-with-a-corpus-of-85-mn/', method: 'manual-research', confidence: 'high' },
  { company: 'Postman Capital', name: 'Abhinav Asthana', title: 'Co-Founder & CEO, Postman', linkedinUrl: '', sourceUrl: 'https://www.avcj.com/avcj/news/3024785/postman-becomes-india-s-top-saas-unicorn', method: 'manual-research', confidence: 'medium' },
  { company: 'BrowserStack Investments', name: 'Ritesh Arora', title: 'Co-Founder & CEO, BrowserStack', linkedinUrl: '', sourceUrl: 'https://inc42.com/buzz/together-sets-up-early-stage-vc-fund-with-a-corpus-of-85-mn/', method: 'manual-research', confidence: 'high' },
  { company: 'Chargebee Investments', name: 'Krish Subramanian', title: 'Co-Founder & CEO, Chargebee', linkedinUrl: '', sourceUrl: 'https://inc42.com/buzz/together-sets-up-early-stage-vc-fund-with-a-corpus-of-85-mn/', method: 'manual-research', confidence: 'high' },
  { company: 'Infosys Innovation Fund', name: 'Shyam Mundhada', title: 'Head of Corporate Development (M&A | Start-up fund)', linkedinUrl: 'https://linkedin.com/in/shyam-mundhada-5151001', sourceUrl: 'https://linkedin.com/in/shyam-mundhada-5151001', method: 'manual-research', confidence: 'high' },
  { company: 'TCS Co-Innovation / TCS Ventures', name: 'Anil Sharma', title: 'Global Head, TCS Co-Innovation Network (COIN)', linkedinUrl: 'https://www.linkedin.com/in/tcs-anilsharma', sourceUrl: 'https://www.linkedin.com/in/tcs-anilsharma', method: 'manual-research', confidence: 'high' }
];

const UNRESOLVABLE = [
  'NASSCOM 10000 Startups'
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
