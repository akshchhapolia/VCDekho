#!/usr/bin/env node
/** One-off: merge round 18 of manually-researched people (batch of 20). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'HCL Software Investments', name: 'Sachin Varshney', title: 'Director, Corporate Development (M&A and Corporate Venturing)', linkedinUrl: 'https://linkedin.com/in/sachinvarshney', sourceUrl: 'https://linkedin.com/in/sachinvarshney', method: 'manual-research', confidence: 'medium' },
  { company: 'Mphasis NEXT Labs Investments', name: 'Srikumar Ramanathan', title: 'Chief Solutions Officer (NEXT Labs / Sparkle Innovation)', linkedinUrl: '', sourceUrl: 'https://cio.economictimes.indiatimes.com/news/strategy-and-management/inside-mphasis-next-labs-rolling-out-quantum-for-enterprises/95416593', method: 'manual-research', confidence: 'high' },
  { company: 'Persistent Ventures', name: 'Saurabh Dwivedi', title: 'Head, Corporate Development & Investor Relations', linkedinUrl: 'https://linkedin.com/in/saurabhdwivedipersistentsystems', sourceUrl: 'https://www.persistent.com/company-overview/management-team/saurabh-dwivedi/', method: 'manual-research', confidence: 'high' },
  { company: 'Mindtree Ventures / LTIMindtree Investments', name: 'Nupur Hemant', title: 'Head of Investments', linkedinUrl: '', sourceUrl: 'https://theorg.com/org/ltimindtree/org-chart/vipul-chandra', method: 'manual-research', confidence: 'high' },
  { company: 'Godrej Family Office', name: 'Jishnu Batabyal', title: 'Group Head, M&A and Business Development (incl. family office)', linkedinUrl: 'https://www.linkedin.com/in/jishnu-batabyal-a0276311', sourceUrl: 'https://www.linkedin.com/in/jishnu-batabyal-a0276311', method: 'manual-research', confidence: 'high' },
  { company: 'Bharti Family Office', name: 'Kapil Agarwal', title: 'SVP & Head, Family Office', linkedinUrl: 'https://in.linkedin.com/in/kapilagarwal1', sourceUrl: 'https://in.linkedin.com/in/kapilagarwal1', method: 'manual-research', confidence: 'high' },
  { company: 'Murugappa Family Office', name: 'Vellayan Subbiah', title: 'Director, Ambadi Investments (Murugappa Group holding company)', linkedinUrl: '', sourceUrl: 'https://ambadiinvestments.com/BOD.html', method: 'manual-research', confidence: 'medium' },
  { company: 'Goenka Family Office', name: 'Subodh Gupta', title: 'Executive Director, Growth and Investments', linkedinUrl: 'https://www.linkedin.com/in/subodhg', sourceUrl: 'https://www.linkedin.com/in/subodhg', method: 'manual-research', confidence: 'high' },
  { company: 'Amansa Holdings', name: 'Akash Prakash', title: 'Founder, Director & CEO', linkedinUrl: '', sourceUrl: 'https://www.flame.edu.in/academics/flame-investment-lab/speakers-repository/akash-prakash', method: 'manual-research', confidence: 'high' },
  { company: 'Malabar Investments', name: 'Sumeet Nagar', title: 'Founder & Portfolio Manager', linkedinUrl: '', sourceUrl: 'https://www.malabarinvest.com/team-4', method: 'manual-research', confidence: 'high' },
  { company: 'KITVEN', name: 'P. V. Harikrishnan', title: 'CEO', linkedinUrl: 'https://in.linkedin.com/in/pvhari71', sourceUrl: 'http://www.kitven.in/about-us', method: 'manual-research', confidence: 'high' },
  { company: 'Stanford Angels & Entrepreneurs India', name: 'Paula Mariwala', title: 'Co-Founder & President', linkedinUrl: '', sourceUrl: 'https://stanfordangels.co.in/', method: 'manual-research', confidence: 'high' },
  { company: 'IIT Bombay Alumni Angels', name: 'Sushanto Mitra', title: 'Founder & CEO, Lead Angels (IIT Bombay alumni network)', linkedinUrl: 'https://www.linkedin.com/in/sushantomitra', sourceUrl: 'https://yourstory.com/companies/lead-angels-network', method: 'manual-research', confidence: 'high' },
  { company: 'Maharashtra State Innovation Society', name: 'Shrikant Patil', title: 'CEO', linkedinUrl: '', sourceUrl: 'https://msins.in/Aboutus', method: 'manual-research', confidence: 'high' }
];

const UNRESOLVABLE = [
  'Tech Mahindra Ventures',
  'L&T Technology Services Ventures',
  'CitiusTech Investments',
  'Bajaj Family Office',
  'Helion Venture Partners',
  'Chartered Angels Network'
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
