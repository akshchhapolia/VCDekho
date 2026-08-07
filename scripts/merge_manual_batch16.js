#!/usr/bin/env node
/** One-off: merge round 16 of manually-researched people (batch of 20). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'NSRCEL', name: 'Rasika Prashant', title: 'CEO', linkedinUrl: '', sourceUrl: 'https://www.thehindubusinessline.com/news/education/srcel-at-iim-bangalore-appoints-rasika-prashant-as-ceo/article71109955.ece', method: 'manual-research', confidence: 'high' },
  { company: 'IIFL Seed Venture Fund / IIFL PE', name: 'Sameer Nath', title: 'CIO & Head, Venture Capital & Private Equity (360 ONE Asset / formerly IIFL AMC)', linkedinUrl: 'https://www.linkedin.com/in/sameer-nath-089698109', sourceUrl: 'https://www.vccircle.com/iiflamc-onboards-truescale-capital-with-sameer-nath-to-head-alternative-biz', method: 'manual-research', confidence: 'high' },
  { company: 'Lighthouse Canton', name: 'Sumegh Bhatia', title: 'CEO & Managing Director, India', linkedinUrl: 'https://in.linkedin.com/in/sumeghbhatia', sourceUrl: 'https://cxotoday.com/interviews/lighthouse-canton-focuses-on-building-its-portfolio-in-india-bets-big-on-providing-optimized-client-experience/', method: 'manual-research', confidence: 'high' },
  { company: 'Marico Growth Ventures', name: 'Suranjana Ghosh', title: 'Head, Marico Innovation Foundation', linkedinUrl: '', sourceUrl: 'https://www.maricoinnovationfoundation.org/about-us/', method: 'manual-research', confidence: 'high' },
  { company: 'upGrad Ventures', name: 'Ronnie Screwvala', title: 'Founder & CEO (leads AI incubator / early investments)', linkedinUrl: '', sourceUrl: 'https://www.business-standard.com/companies/news/upgrad-earmarks-rs-100-cr-for-creating-ai-incubator-ronnie-screwvala-125022600415_1.html', method: 'manual-research', confidence: 'high' },
  { company: 'PayU Ventures', name: 'Himanshu Kapoor', title: 'Senior Director, Investments & M&A', linkedinUrl: 'https://linkedin.com/in/himanshu-kapoor-93896b18', sourceUrl: 'https://linkedin.com/in/himanshu-kapoor-93896b18', method: 'manual-research', confidence: 'high' },
  { company: 'Mitsubishi UFJ Capital', name: 'Mayank Shiromani', title: 'Deputy CIO, MUFG Innovation Partners (leads India fund)', linkedinUrl: 'https://linkedin.com/in/mayankshiromani', sourceUrl: 'https://economictimes.indiatimes.com/tech/startups/japans-mufg-bets-250-million-on-india/articleshow/131445576.cms', method: 'manual-research', confidence: 'high' },
  { company: 'Accion Venture Lab', name: 'Rahil Rangwala', title: 'Managing Partner', linkedinUrl: '', sourceUrl: 'https://people.equilar.com/bio/person/rahil-rangwala-accion-international/28067366', method: 'manual-research', confidence: 'high' },
  { company: 'Villgro', name: 'Srinivas Ramanujam', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/srinivas1729', sourceUrl: 'https://villgro.org/our-team/', method: 'manual-research', confidence: 'high' },
  { company: 'IIT Madras Incubation Cell', name: 'Tamaswati Ghosh', title: 'CEO', linkedinUrl: 'https://www.linkedin.com/in/tamaswati', sourceUrl: 'http://rtbi.in/incubationiitm/about-us/management.html', method: 'manual-research', confidence: 'high' },
  { company: 'SINE IIT Bombay', name: 'Shaji Varghese', title: 'CEO', linkedinUrl: '', sourceUrl: 'https://indianexpress.com/article/technology/tech-news-technology/our-playbook-on-tech-incubation-is-being-followed-across-india-shaji-varghese-ceo-sine-iit-bombay-9529587/', method: 'manual-research', confidence: 'high' },
  { company: 'SIIC IIT Kanpur', name: 'Ashutosh Agnihotri', title: 'CEO', linkedinUrl: 'https://www.linkedin.com/in/ashutoshagnihotri/', sourceUrl: 'https://www.siicincubator.com/about/team.php', method: 'manual-research', confidence: 'high' },
  { company: 'IIM Calcutta Innovation Park', name: 'V. K. Rai', title: 'CEO', linkedinUrl: '', sourceUrl: 'http://iimcip.org/topic/iim-calcutta-innovation-park-appoints-dr-v-k-rai-as-chief-executive-officer/', method: 'manual-research', confidence: 'high' },
  { company: 'ISB DLabs / CEL', name: 'Saumya Kumar', title: 'CEO, DLabs | Director, ISB I-Venture', linkedinUrl: '', sourceUrl: 'https://isbdlabs.org/about/', method: 'manual-research', confidence: 'high' },
  { company: 'Startup Oasis', name: 'Chintan Bakshi', title: 'CEO', linkedinUrl: '', sourceUrl: 'https://tryforgood.com/chintan-bakshi-ceo-start-oasis-jaipur/', method: 'manual-research', confidence: 'high' }
];

const UNRESOLVABLE = [
  'TotalEnergies Ventures',
  'Nestlé Ventures',
  'Sun Pharma Ventures',
  'Biocon Innovation / Biocon Ventures',
  'Delivery Hero Ventures'
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
