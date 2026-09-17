#!/usr/bin/env node
/** One-off: merge round 11 of manually-researched people (batch of 20). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'LightPace VC', name: 'Chenelle Ansah', title: 'General Partner', linkedinUrl: '', sourceUrl: 'https://aeroleads.com/c/lightpace-vc', method: 'manual-research', confidence: 'medium' },
  { company: 'Tiger Global Management', name: 'Deep Verma', title: 'Head of India & Southeast Asia', linkedinUrl: '', sourceUrl: 'https://www.newsbytesapp.com/news/business/tiger-global-revamps-investment-approach-in-india-s-start-up-ecosystem/story', method: 'manual-research', confidence: 'high' },
  { company: 'Omidyar Network India', name: 'Badri Pillapakkam', title: 'Partner', linkedinUrl: 'https://www.linkedin.com/in/badripillapakkam', sourceUrl: 'https://www.omidyarnetwork.in/team/badri-pillapakkam', method: 'manual-research', confidence: 'high' },
  { company: 'East Ventures', name: 'Willson Cuaca', title: 'Co-founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://east.vc/news/insights/key-facts-east-ventures', method: 'manual-research', confidence: 'high' },
  { company: 'VentureStudio', name: 'Jeremy Fritzhand', title: 'Chief Executive Officer', linkedinUrl: 'https://linkedin.com/in/fritzhand', sourceUrl: 'https://ahduni.edu.in/faculty/jeremy-fritzhand/', method: 'manual-research', confidence: 'high' },
  { company: 'Ribbit Capital', name: 'Micky Malka', title: 'Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://economictimes.indiatimes.com/small-biz/startups/newsbuzz/ribbit-leads-21-m-round-in-groww/articleshow/71194973.cms', method: 'manual-research', confidence: 'high' },
  { company: 'Valia Ventures', name: 'Khaled Jalanbo', title: 'Co-Founder & Managing Partner', linkedinUrl: 'https://www.linkedin.com/in/khaled-jalanbo', sourceUrl: 'https://www.cbinsights.com/investor/valia-investments-1', method: 'manual-research', confidence: 'high' },
  { company: 'Mana Ventures', name: 'Morgan Schwanke', title: 'Founder & General Partner', linkedinUrl: 'https://www.linkedin.com/in/morganschwanke', sourceUrl: 'https://www.linkedin.com/company/manaventures', method: 'manual-research', confidence: 'high' },
  { company: 'Hustle Fund', name: 'Elizabeth Yin', title: 'Co-Founder & Partner', linkedinUrl: '', sourceUrl: 'https://foundry.vc/blog/2021/02/our-investment-in-hustle-fund/', method: 'manual-research', confidence: 'high' },
  { company: 'Hustle Fund', name: 'Shiyan Koh', title: 'Co-Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://foundry.vc/blog/2021/02/our-investment-in-hustle-fund/', method: 'manual-research', confidence: 'high' },
  { company: 'Superscout', name: 'David Haddad', title: 'Founder', linkedinUrl: 'https://linkedin.com/in/davidhaddad', sourceUrl: 'https://superscout.co/', method: 'manual-research', confidence: 'high' },
  { company: 'SIDBI Venture Capital', name: 'Arup Kumar', title: 'MD & CEO', linkedinUrl: '', sourceUrl: 'https://www.sidbiventure.co.in/Our_Team.html', method: 'manual-research', confidence: 'high' },
  { company: 'Canbank Venture Capital Fund', name: 'Sanjeev Kumar Shrivastava', title: 'Managing Director', linkedinUrl: 'https://www.linkedin.com/in/sanjeev-kumar-shrivastava-5b270b101', sourceUrl: 'https://www.canbank.vc/board_of_directors.php', method: 'manual-research', confidence: 'high' },
  { company: 'IFCI Venture Capital Funds', name: 'V. Anish Babu', title: 'Managing Director', linkedinUrl: '', sourceUrl: 'https://www.ifciventure.com/directors-information.aspx', method: 'manual-research', confidence: 'high' },
  { company: 'ICICI Venture', name: 'Puneet Nanda', title: 'Managing Director & CEO', linkedinUrl: 'https://in.linkedin.com/in/puneet-nanda-3b643467', sourceUrl: 'https://www.bloomberg.com/profile/person/16477319', method: 'manual-research', confidence: 'high' }
];

/** Orgs researched with no credible India-relevant person / not a traditional investor org. */
const UNRESOLVABLE = [
  'Venture Cooperative',
  'Index Ventures ',
  'Cherry Ventures',
  'Upfront Ventures',
  'Native Smart Capital',
  'Reliance Ventures'
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
    data.skipped.push({ company, reason: 'no-credible-india-lead-or-not-investor-org', method: 'manual-research' });
  }

  fs.writeFileSync(CANDIDATES_PATH, JSON.stringify(data, null, 2));

  console.log(`found: ${beforeFound} -> ${data.found.length} (+${NEW_FOUND.length})`);
  console.log(`unresolved: ${beforeUnresolved} -> ${data.unresolved.length} (-${beforeUnresolved - data.unresolved.length} orgs resolved; ${UNRESOLVABLE.length} skipped)`);
}

main();
