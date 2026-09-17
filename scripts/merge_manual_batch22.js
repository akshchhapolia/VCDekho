#!/usr/bin/env node
/** One-off: merge round 22 of manually-researched people (batch of 20). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Dasra', name: 'Neera Nundy', title: 'Co-founder & Managing Partner', linkedinUrl: 'https://linkedin.com/in/neera-nundy-4b14105', sourceUrl: 'https://skoll.org/contributor/neera-nundy/', method: 'manual-research', confidence: 'high' },
  { company: 'Acumen Academy India', name: 'Mahesh Yagnaraman', title: 'India Country Director & Chief of Operations (leads Academy in India)', linkedinUrl: '', sourceUrl: 'https://acumen.org/team/mahesh-yagnaraman/', method: 'manual-research', confidence: 'high' },
  { company: 'NASSCOM CoE IoT & AI', name: 'Sanjeev Malhotra', title: 'CEO, MeitY-NASSCOM CoE for IoT & AI', linkedinUrl: 'https://linkedin.com/in/jeevmalhotra', sourceUrl: 'https://ihwcouncil.org/dr-sanjeev-malhotra/', method: 'manual-research', confidence: 'high' },
  { company: 'Razorpay Rize', name: 'Nipun Jain', title: 'Senior Director – Business Management, Razorpay Rize', linkedinUrl: '', sourceUrl: 'https://www.linkedin.com/posts/cxo-sparks_cxosparks-razorpay-startupecosystem-activity-7466755241296834560-G-9a', method: 'manual-research', confidence: 'high' },
  { company: 'Ashoka University Entrepreneurship', name: 'Priyank Narayan', title: 'Director, InfoEdge Centre for Entrepreneurship', linkedinUrl: 'https://linkedin.com/in/priyankn', sourceUrl: 'https://www.linkedin.com/posts/cfeashoka_ashokauniversity-entrepreneurship-startupecosystem-activity-7435964825672814592-qVkB', method: 'manual-research', confidence: 'high' },
  { company: 'AIC NITTE', name: 'Puneeth Rai', title: 'CEO, AIC Nitte Incubation Centre', linkedinUrl: 'https://linkedin.com/in/puneeth-rai-02bb2a25', sourceUrl: 'https://www.linkedin.com/in/puneeth-rai-02bb2a25', method: 'manual-research', confidence: 'high' },
  { company: 'Manipal Universal TBI', name: 'Manohara Pai M M', title: 'Professor In-charge / Associate Director, MUTBI', linkedinUrl: '', sourceUrl: 'https://nstedb.com/institutional/tbi-center.htm', method: 'manual-research', confidence: 'medium' },
  { company: 'Goa Startup Mission', name: 'D S Prashant', title: 'CEO, Goa Startup Mission / SITPC', linkedinUrl: 'https://linkedin.com/in/dsprashant', sourceUrl: 'https://www.linkedin.com/in/dsprashant', method: 'manual-research', confidence: 'high' },
  { company: 'Startup Madhya Pradesh', name: 'Abha Rishi', title: 'Executive Head, Madhya Pradesh Startup Mission', linkedinUrl: 'https://linkedin.com/in/abharishi', sourceUrl: 'https://www.linkedin.com/posts/abharishi_startupindia-incubationexcellence-g20startup20-activity-7427296247390273536-BKVD', method: 'manual-research', confidence: 'high' },
  { company: 'Qualcomm Design in India Startup', name: 'Hemang Shah', title: 'Leads Qualcomm startup programs / Design in India Challenge (India)', linkedinUrl: 'https://linkedin.com/in/hemang', sourceUrl: 'https://www.linkedin.com/posts/hemang_startups-india-innovation-activity-7144010199719100416-JTVl', method: 'manual-research', confidence: 'high' }
];

const UNRESOLVABLE = [
  'NASSCOM CoE Fintech',
  'Plaksha University Launchpad',
  'Genome Valley Bio Incubators',
  'RKVY-RAFTAAR Incubators',
  'Startup Jharkhand',
  'Bihar Startup Fund programs',
  'Startup J&K',
  'Chhattisgarh Startup',
  'Village Capital India',
  'Bosch Startup Harbor India',
  'Intel India Ignite',
  'Cashfree for Startups'
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
