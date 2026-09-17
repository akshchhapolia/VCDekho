#!/usr/bin/env node
/** One-off: merge round 21 of manually-researched people (batch of 20). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'IISc SID', name: 'Balan Gurumoorthy', title: 'Chief Executive, SID / Director, FSID (IISc)', linkedinUrl: 'https://linkedin.com/in/balan-gurumoorthy-827955a', sourceUrl: 'https://sid.iisc.ac.in/about/', method: 'manual-research', confidence: 'high' },
  { company: 'IIT Hyderabad i-TIC', name: 'Keyur Punjani', title: 'Chief Operating Officer, iTIC Incubator', linkedinUrl: 'https://linkedin.com/in/keyurpunjani91', sourceUrl: 'https://www.linkedin.com/posts/bharatcxo_leadershipspotlight-leadershipmoves-deeptech-activity-7459901209706151936-64BN', method: 'manual-research', confidence: 'high' },
  { company: 'IIT Guwahati Technology Incubation Centre', name: 'Urmi Buragohain', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/urmi-buragohain-9629516', sourceUrl: 'https://iitgtic.com/index_page_team', method: 'manual-research', confidence: 'high' },
  { company: 'IIT Mandi Catalyst', name: 'Anil Singh', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/anilsinghiitmandi', sourceUrl: 'https://www.linkedin.com/posts/iitmandicatalyst_iitmandi-iitmandicatalyst-ceo-activity-7376579042633953281-EQe2', method: 'manual-research', confidence: 'high' },
  { company: 'IIT Indore Innovation', name: 'Bhupesh Kumar Lad', title: 'Project Director, IITI DRISHTI CPS (Launchpad Incubation & Innovation)', linkedinUrl: 'https://linkedin.com/in/bhupesh-kumar-lad-39227510', sourceUrl: 'https://www.linkedin.com/posts/iiti-drishti-cps-foundation-iit-indore_when-vision-meets-execution-timelines-turn-activity-7444230395187052544-i_Tn', method: 'manual-research', confidence: 'medium' },
  { company: 'IIT Bhubaneswar Research & Entrepreneurship Park', name: 'Soobhankar Pati', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/moxst', sourceUrl: 'https://rep.iitbbs.ac.in/team/', method: 'manual-research', confidence: 'high' },
  { company: 'IIT Roorkee TIDES', name: 'Azam Ali Khan', title: 'CEO', linkedinUrl: '', sourceUrl: 'https://tides.iitr.ac.in/governing-body', method: 'manual-research', confidence: 'high' },
  { company: 'NITK STEP', name: 'Subray R. Hegde', title: 'Director In-Charge', linkedinUrl: '', sourceUrl: 'https://step.nitk.ac.in/', method: 'manual-research', confidence: 'high' },
  { company: 'NIT Trichy TBI', name: 'Susil Kumar Kanagaraj Victor', title: 'CEO, CEDI-NIT Trichy', linkedinUrl: 'https://linkedin.com/in/susil-kumar-8a312a61', sourceUrl: 'https://www.nitt.edu/home/rc/cedi', method: 'manual-research', confidence: 'high' },
  { company: 'BITS Pilani TBI', name: 'Sachin Arya', title: 'CEO, Incubation & Entrepreneurship / Head, PIEDS', linkedinUrl: 'https://linkedin.com/in/sachinarya', sourceUrl: 'https://www.bits-pilani.ac.in/tec/team/', method: 'manual-research', confidence: 'high' },
  { company: 'Amrita TBI', name: 'Krishnashree Achuthan', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/krishnashree-achuthan', sourceUrl: 'https://www.amrita.edu/faculty/krishnashree/', method: 'manual-research', confidence: 'high' },
  { company: 'VIT-TBI', name: 'A. Balachandran', title: 'Director', linkedinUrl: '', sourceUrl: 'https://vittbi.com/wp-content/uploads/2025/01/VITTBI-Newsletter-Jan25.pdf', method: 'manual-research', confidence: 'high' },
  { company: 'IIM Lucknow Enterprise Incubator', name: 'Yamini Bhushan Pandey', title: 'Managing Director, IIML EIC', linkedinUrl: 'https://linkedin.com/in/yaminibhushanpandey', sourceUrl: 'https://www.linkedin.com/in/yaminibhushanpandey', method: 'manual-research', confidence: 'high' },
  { company: 'IIM Kozhikode LIVE', name: 'Ashutosh Sarkar', title: 'Executive Director', linkedinUrl: 'https://linkedin.com/in/ashutosh-sarkar-5a4167b', sourceUrl: 'https://www.linkedin.com/posts/iimklive_impactful-contribution-contribution-by-mr-activity-7432685247584174080-4vgZ', method: 'manual-research', confidence: 'high' },
  { company: 'iCreate', name: 'Avinash Punekar', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/avinashpunekar', sourceUrl: 'https://www.saurenergy.com/solar-energy-news/avinash-punekar-the-new-chief-executive-officer-at-icreate', method: 'manual-research', confidence: 'high' },
  { company: 'Startup Punjab', name: 'Somveer Anand', title: 'CEO & Mission Director, Innovation Mission Punjab', linkedinUrl: 'https://linkedin.com/in/somveeranand', sourceUrl: 'https://www.linkedin.com/in/somveeranand', method: 'manual-research', confidence: 'high' },
  { company: 'RTBI IIT Madras', name: 'Suma Prashant', title: 'Director', linkedinUrl: '', sourceUrl: 'https://nstedb.com/institutional/tbi-center.htm', method: 'manual-research', confidence: 'medium' }
];

const UNRESOLVABLE = [
  'IIT Ropar Incubation Foundation',
  'SRM Innovation Incubation Centre',
  'Startup Haryana'
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
