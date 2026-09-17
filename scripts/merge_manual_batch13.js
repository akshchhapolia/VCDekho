#!/usr/bin/env node
/** One-off: merge round 13 of manually-researched people (batch of 20). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'SoftBank Ventures Asia', name: 'JP Lee', title: 'CEO & Managing Partner', linkedinUrl: '', sourceUrl: 'https://startupintros.com/orgs/softbank-ventures-asia', method: 'manual-research', confidence: 'high' },
  { company: 'Insight Partners', name: 'Nikhil Sachdev', title: 'Managing Director', linkedinUrl: '', sourceUrl: 'https://me.sh/profile/nikhil-sachdev', method: 'manual-research', confidence: 'high' },
  { company: 'Coatue Management', name: 'Rahul Kishore', title: 'Managing Director', linkedinUrl: '', sourceUrl: 'https://talent4boards.com/vedantu-announces-rahul-kishore-to-its-board-along-with-raising-100m-series-d-funding-led-by-coatue/', method: 'manual-research', confidence: 'high' },
  { company: 'DST Global', name: 'Yuri Milner', title: 'Founder', linkedinUrl: '', sourceUrl: 'https://breakthroughprize.org/Yuri_Milner', method: 'manual-research', confidence: 'high' },
  { company: 'Blackstone Growth', name: 'Mukesh Mehta', title: 'CIO & Senior Managing Director, PE India', linkedinUrl: '', sourceUrl: 'https://www.ivca.in/committee/member/mukeshh-mehta', method: 'manual-research', confidence: 'high' },
  { company: 'Warburg Pincus', name: 'Narendra Ostawal', title: 'Managing Director, Head of India Private Equity', linkedinUrl: '', sourceUrl: 'https://warburgpincus.com/team/narendra-ostawal/', method: 'manual-research', confidence: 'high' },
  { company: 'Bain Capital', name: 'Amit Chandra', title: 'Partner & Chair of India', linkedinUrl: '', sourceUrl: 'https://www.baincapital.com/people/amit-chandra', method: 'manual-research', confidence: 'high' },
  { company: 'Carlyle Group', name: 'Amit Jain', title: 'Managing Director & Head of Carlyle India Advisors', linkedinUrl: 'https://linkedin.com/in/amit-jain-3227088', sourceUrl: 'https://www.carlyle.com/about-carlyle/team/amit-jain', method: 'manual-research', confidence: 'high' },
  { company: 'Creador', name: 'Brahmal Vasudevan', title: 'Founder & CEO', linkedinUrl: '', sourceUrl: 'https://en.wikipedia.org/wiki/Creador', method: 'manual-research', confidence: 'high' },
  { company: 'Creador', name: 'Kabir Thakur', title: 'Managing Director, Head of India', linkedinUrl: '', sourceUrl: 'https://en.wikipedia.org/wiki/Creador', method: 'manual-research', confidence: 'high' },
  { company: 'British International Investment', name: 'Shilpa Kumar', title: 'Managing Director & Head of India', linkedinUrl: 'https://www.linkedin.com/in/shilpankumar', sourceUrl: 'https://economictimes.indiatimes.com/industry/banking/finance/bii-appoints-shilpa-kumar-as-managing-director-and-head-of-india/articleshow/120757471.cms', method: 'manual-research', confidence: 'high' },
  { company: 'Proparco', name: 'Vincent Vandenbussche', title: 'Acting Regional Director, South Asia', linkedinUrl: 'https://linkedin.com/in/vincent-vandenbussche-656a6039', sourceUrl: 'https://proparco.fr/en/regional-office-covering-south-asia-located-new-delhi', method: 'manual-research', confidence: 'high' },
  { company: 'Michael & Susan Dell Foundation', name: 'Prachi Windlass', title: 'Head of India', linkedinUrl: '', sourceUrl: 'https://www.dell.org/employee/prachi-windlass/', method: 'manual-research', confidence: 'high' },
  { company: 'Cisco Investments', name: 'Sachin Chiramel', title: 'India Lead', linkedinUrl: '', sourceUrl: 'https://www.ciscoinvestments.com/team/sachin-chiramel', method: 'manual-research', confidence: 'high' },
  { company: 'Samsung Ventures', name: 'Snehal Deshpande', title: 'Investment Director & Head, Samsung Venture India', linkedinUrl: 'https://www.linkedin.com/in/snehal-deshpande-19a7422a', sourceUrl: 'https://www.linkedin.com/in/snehal-deshpande-19a7422a', method: 'manual-research', confidence: 'high' },
  { company: 'Amazon Smbhav Venture Fund', name: 'Abhijeet Muzumdar', title: 'VP & Head, Amazon Smbhav Venture Fund', linkedinUrl: 'https://www.linkedin.com/in/abhijeetmuzumdar', sourceUrl: 'https://smbhav.amazon.in/initiatives/smbhav-venture-fund', method: 'manual-research', confidence: 'high' },
  { company: 'SC Ventures', name: 'Alex Manson', title: 'CEO', linkedinUrl: '', sourceUrl: 'https://www.sc.com/en/people/alex-manson/', method: 'manual-research', confidence: 'high' },
  { company: 'Unilever Ventures', name: 'Pawan Chaturvedi', title: 'Partner & Head of Asia', linkedinUrl: 'https://www.linkedin.com/in/pawan-chaturvedi-b0058620', sourceUrl: 'https://www.unileverventures.com/team/pawn-chaturvedi/', method: 'manual-research', confidence: 'high' }
];

const UNRESOLVABLE = [
  'Dragoneer Investment Group',
  'Norfund',
  'FMO Entrepreneurial Development Bank'
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
    data.skipped.push({ company, reason: 'no-credible-india-lead', method: 'manual-research' });
  }

  fs.writeFileSync(CANDIDATES_PATH, JSON.stringify(data, null, 2));

  console.log(`found: ${beforeFound} -> ${data.found.length} (+${NEW_FOUND.length})`);
  console.log(`unresolved: ${beforeUnresolved} -> ${data.unresolved.length} (-${beforeUnresolved - data.unresolved.length} orgs; ${UNRESOLVABLE.length} skipped)`);
}

main();
