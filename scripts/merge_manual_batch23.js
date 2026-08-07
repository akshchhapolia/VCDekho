#!/usr/bin/env node
/** One-off: merge round 23 — drain remaining unresolved (VC-heavy + skips). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: '108 Capital', name: 'Nimesh Kampani', title: 'Founding Partner', linkedinUrl: 'https://linkedin.com/in/nimeshkampani', sourceUrl: 'https://108.vc/team/nimesh-kampani', method: 'manual-research', confidence: 'high' },
  { company: '77 East Ventures', name: 'Mohanlal Parameshwara Menon', title: 'Designated Partner', linkedinUrl: '', sourceUrl: 'https://www.sensibook.com/companies/2902868/ABB-9261/77-EAST-VENTURE-PARTNERS-LLP', method: 'manual-research', confidence: 'medium' },
  { company: 'Advantedge', name: 'Kunal Khattar', title: 'Founding Partner', linkedinUrl: '', sourceUrl: 'https://www.advantedge.vc/post/yourstory-rapido-backer-advantedge-unveils-100m-fund-iii-to-take-bets-on-e-mobility', method: 'manual-research', confidence: 'high' },
  { company: 'Asha Ventures', name: 'Amit Mehta', title: 'Managing Partner', linkedinUrl: 'https://linkedin.com/in/amit-mehta-6b90b92', sourceUrl: 'https://www.vccircle.com/impactfocused-asha-ventures-marks-first-close-of-debut-fund', method: 'manual-research', confidence: 'high' },
  { company: 'Audacity Ventures', name: 'Kabir Kochhar', title: 'Founder & Managing Partner', linkedinUrl: 'https://linkedin.com/in/kabirkochhar', sourceUrl: 'https://www.linkedin.com/in/kabirkochhar', method: 'manual-research', confidence: 'high' },
  { company: 'AudTen Capital', name: 'Sanjay G Kothari', title: 'Founder & General Partner, AudTen Ventures', linkedinUrl: 'https://linkedin.com/in/sanjay-g-kothari', sourceUrl: 'https://www.linkedin.com/in/sanjay-g-kothari', method: 'manual-research', confidence: 'high' },
  { company: 'Beams VC', name: 'Sagar Agarvwal', title: 'Founder & Managing Partner, Beams Fintech Fund', linkedinUrl: '', sourceUrl: 'https://www.linkedin.com/company/beamsvc', method: 'manual-research', confidence: 'high' },
  { company: 'ConsumerX Ventures', name: 'Chhavi Bhardwaj Kargaonkar', title: 'Co-Founder & Partner', linkedinUrl: 'https://linkedin.com/in/chhavibk', sourceUrl: 'https://www.linkedin.com/in/chhavibk', method: 'manual-research', confidence: 'high' },
  { company: 'Dezerv', name: 'Sandeep Jethwani', title: 'Co-Founder', linkedinUrl: '', sourceUrl: 'https://www.onepercent.live/episodes/tag/founder+stories', method: 'manual-research', confidence: 'high' },
  { company: 'Equanimity Ventures', name: 'Rajesh Sehgal', title: 'Managing Partner', linkedinUrl: '', sourceUrl: 'https://www.equanimityinvestments.com/discover', method: 'manual-research', confidence: 'high' },
  { company: 'Green Marble VC', name: 'Ruchira Shukla', title: 'Founder & Managing Partner', linkedinUrl: 'https://linkedin.com/in/ruchirashukla', sourceUrl: 'https://www.ivca.in/greenReturns-2025/speakers/ruchira-shukla', method: 'manual-research', confidence: 'high' },
  { company: 'Induckt VC', name: 'Ayush Goyal', title: 'Founder & Managing General Partner', linkedinUrl: 'https://linkedin.com/in/passionforgoal', sourceUrl: 'https://induckt.vc/', method: 'manual-research', confidence: 'high' },
  { company: 'Jamwant Ventures', name: 'Navneet Kaushik', title: 'Founder', linkedinUrl: '', sourceUrl: 'https://jamwantventures.com/', method: 'manual-research', confidence: 'high' },
  { company: 'Lavni Ventures', name: 'Vasu Guruswamy', title: 'Co-Founder & General Partner', linkedinUrl: 'https://linkedin.com/in/vasu-guruswamy-0b80802', sourceUrl: 'https://www.vccircle.com/lavniventures-rolls-out-new-vc-fund-to-back-deep-tech-startups', method: 'manual-research', confidence: 'high' },
  { company: 'LongView Ventures', name: 'Akshat Poddar', title: 'Partner / Team lead', linkedinUrl: '', sourceUrl: 'https://longview-ventures.com/', method: 'manual-research', confidence: 'high' },
  { company: 'Navam Capital', name: 'Rajeev Mantri', title: 'Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://www.navamcapital.com/', method: 'manual-research', confidence: 'high' },
  { company: 'Pangram Ventures', name: 'Manoj Laddha', title: 'Founder & General Partner', linkedinUrl: '', sourceUrl: 'https://www.pangram.vc/team', method: 'manual-research', confidence: 'high' },
  { company: 'Paragon Partners', name: 'Siddharth Parekh', title: 'Co-Founder & Senior Partner', linkedinUrl: '', sourceUrl: 'https://www.paragonpartners.in/our-team/', method: 'manual-research', confidence: 'high' },
  { company: 'Phi Capital', name: 'Anupam Thareja', title: 'Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://phicapital.in/our-team/anupam-thareja/', method: 'manual-research', confidence: 'high' },
  { company: 'Silver Needle', name: 'Ajay Jain', title: 'Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://startupintros.com/orgs/silverneedle-ventures', method: 'manual-research', confidence: 'high' },
  { company: 'Sistema Asia Fund', name: 'Andrey Terebenin', title: 'Managing Partner, Sistema Asia Capital (India)', linkedinUrl: '', sourceUrl: 'https://sistemaasiacapital.com/index.html', method: 'manual-research', confidence: 'high' },
  { company: 'Startup-O', name: 'Anuj Jain', title: 'Co-Founder & CEO', linkedinUrl: 'https://linkedin.com/in/anujjainprofile', sourceUrl: 'https://www.startup-o.com/about-us/', method: 'manual-research', confidence: 'high' },
  { company: 'SucSEED Indovation', name: 'Vikrant Varshney', title: 'Founder & Managing Partner', linkedinUrl: 'https://linkedin.com/in/vikrantvarshney-indovation', sourceUrl: 'https://www.linkedin.com/in/vikrantvarshney-indovation', method: 'manual-research', confidence: 'high' },
  { company: 'Swishin Ventures', name: 'Mahavir Pratap Sharma', title: 'General Partner', linkedinUrl: 'https://linkedin.com/in/mahavir-pratap-sharma-26476915', sourceUrl: 'https://www.linkedin.com/in/mahavir-pratap-sharma-26476915', method: 'manual-research', confidence: 'high' },
  { company: 'Tryrock Capital', name: 'Manick Wadhwa', title: 'Leadership (Tryrock Ventures / SKI Capital group)', linkedinUrl: '', sourceUrl: 'https://www.linkedin.com/posts/skicap_our-group-entity-tryrock-ventures-has-signed-activity-7378413659959771136-8GXK', method: 'manual-research', confidence: 'medium' },
  { company: 'ValleyNXT Ventures', name: 'Madhu Vasepalli', title: 'Founder & Managing Partner', linkedinUrl: 'https://linkedin.com/in/dr-madhu-vasepalli-mds-43a24812', sourceUrl: 'https://www.vccircle.com/valleynxtventures-unveils-debut-fund-to-back-early-stage-startups', method: 'manual-research', confidence: 'high' },
  { company: 'W Health Ventures', name: 'Pankaj Jethwani', title: 'Managing Partner', linkedinUrl: '', sourceUrl: 'https://www.vcsheet.com/who/dr-pankaj-jethwani', method: 'manual-research', confidence: 'high' }
];

const UNRESOLVABLE = [
  '888 VC',
  'Alyxis Ventures',
  'Disruption Fund',
  'Ekamya',
  'FBC Fund',
  'First and Fast Capital',
  'First Assetz',
  'FirstPort Capital',
  'Fundamental Ventures',
  'Gnan Circle',
  'GrowthAlly Capital',
  'Hegd Investments',
  'IKP Venture',
  'Incube8 Ventures',
  'J4S Alliance',
  'Makia Capital',
  'Merisis Ventures',
  'New Leaf',
  'NilaCap',
  'OnePoint44',
  'PanIIT Alumni',
  'Prana Ventures',
  'Refex Capital',
  'Rockstud Capital',
  'Roots Ventures',
  'Roving Partners',
  'Takshil Ventures',
  'Tavasya Capital',
  'Tenacity Ventures',
  'Tilt Capital',
  'TransCon Capital',
  'V-Cube Ventures',
  'Venture Gurukool',
  'Vincere Partners'
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
  if (data.unresolved.length) {
    console.log('Still unresolved:', data.unresolved.map((u) => u.company).join(', '));
  }
}

main();
