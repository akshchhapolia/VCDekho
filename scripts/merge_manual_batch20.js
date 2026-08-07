#!/usr/bin/env node
/** One-off: merge round 20 of manually-researched people (batch of 20). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'IKP Knowledge Park', name: 'Satya Prakash Dash', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/spdash', sourceUrl: 'https://medicalbuyer.co.in/dr-satya-prakash-dash-named-ikp-knowledge-park-ceo/', method: 'manual-research', confidence: 'high' },
  { company: 'a-IDEA NAARM', name: 'Ranjit Kumar', title: 'CEO, a-IDEA & Principal Scientist, ICAR-NAARM', linkedinUrl: '', sourceUrl: 'https://aidea.naarm.org.in/ceo', method: 'manual-research', confidence: 'high' },
  { company: 'Pusa Krishi', name: 'Akriti Sharma', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/dr-akriti-sharma-2b864910a', sourceUrl: 'https://pusakrishi.in/', method: 'manual-research', confidence: 'high' },
  { company: 'Agri Udaan', name: 'Ranjit Kumar', title: 'CEO, a-IDEA (Agri Udaan program lead org)', linkedinUrl: '', sourceUrl: 'https://aidea.naarm.org.in/ceo', method: 'manual-research', confidence: 'high' },
  { company: 'NABI Mohali', name: 'Ashwani Pareek', title: 'Executive Director, BRIC-NABI', linkedinUrl: '', sourceUrl: 'https://nabi.res.in/', method: 'manual-research', confidence: 'high' },
  { company: 'Electropreneur Park', name: 'Sanjeev Chopra', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/sanjeevc', sourceUrl: 'https://www.linkedin.com/in/sanjeevc', method: 'manual-research', confidence: 'high' },
  { company: 'STPI Centres of Entrepreneurship', name: 'Arvind Kumar', title: 'Director General, STPI', linkedinUrl: 'https://linkedin.com/in/arvind-kumar71', sourceUrl: 'https://www.linkedin.com/posts/elets-world-fintech-summit_wfs2026-fintechindia-digitalfinance-activity-7452586528330977280-rwzp', method: 'manual-research', confidence: 'high' },
  { company: 'T-Works', name: 'Joginder Tanikella', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/jogindertanikella', sourceUrl: 'https://www.linkedin.com/in/jogindertanikella', method: 'manual-research', confidence: 'high' },
  { company: 'SAP.iO Foundry India', name: 'Aparna V.', title: 'Head, Startup & Ecosystem Programs (SAP Startup Studio; successor to SAP.iO Foundry)', linkedinUrl: 'https://linkedin.com/in/aparna-veerarouthu', sourceUrl: 'https://news.sap.com/india/2026/06/sap-labs-india-unveils-2026-startup-studio-cohort-focused-on-enterprise-ai-and-deep-tech-innovation/', method: 'manual-research', confidence: 'medium' },
  { company: 'Google for Startups Accelerator India', name: 'Ragini Das', title: 'Head, Google for Startups – India', linkedinUrl: '', sourceUrl: 'https://www.peoplematters.in/news/appointments/google-startup-programme-in-india-gets-new-head-ragini-das-46704', method: 'manual-research', confidence: 'high' },
  { company: 'Microsoft for Startups India', name: 'Kapil Chawla', title: 'Director & Head of Startups, VC & Strategic Partnerships', linkedinUrl: 'https://linkedin.com/in/kapilchawla', sourceUrl: 'https://www.linkedin.com/in/kapilchawla', method: 'manual-research', confidence: 'high' },
  { company: 'AWS Activate India', name: 'Amitabh Nagpal', title: 'Head of Startup Ecosystem, India (AWS)', linkedinUrl: 'https://linkedin.com/in/amitabhnagpal', sourceUrl: 'https://www.linkedin.com/in/amitabhnagpal', method: 'manual-research', confidence: 'high' },
  { company: 'NVIDIA Inception', name: 'Arundhati Banerjee', title: 'Senior Inception Partner (India)', linkedinUrl: 'https://linkedin.com/in/arundhati-banerjee-130912a0', sourceUrl: 'https://www.linkedin.com/posts/arundhati-banerjee-130912a0_startups-founders-nvidia-activity-7438130574399266816-oc4f', method: 'manual-research', confidence: 'high' },
  { company: 'Yes Fintech', name: 'Gaurav Goel', title: 'National Head – Start Up, Fintech & New Economy Business, YES BANK', linkedinUrl: 'https://linkedin.com/in/ggaurav77', sourceUrl: 'https://www.linkedin.com/in/ggaurav77', method: 'manual-research', confidence: 'high' },
  { company: 'TiE Nurture', name: 'Seshadri Kannan', title: 'Created & led TiE Nurture (TiE Global)', linkedinUrl: 'https://linkedin.com/in/seshadri-kannan-tie', sourceUrl: 'https://www.linkedin.com/in/seshadri-kannan-tie', method: 'manual-research', confidence: 'high' },
  { company: 'Founders Institute Hyderabad', name: 'Sujit Jagirdar', title: 'Director & Chapter Leader, Founder Institute Hyderabad', linkedinUrl: 'https://linkedin.com/in/sujitjagirdar', sourceUrl: 'https://fi.co/insight/build-a-fundable-global-startup-in-hyderabad-in-11-weeks', method: 'manual-research', confidence: 'high' }
];

const UNRESOLVABLE = [
  'Cisco LaunchPad',
  'TiE ScaleUp',
  'Founders Institute Bangalore',
  'Founders Institute Mumbai'
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
