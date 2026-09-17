#!/usr/bin/env node
/** One-off: merge round 12 of manually-researched people (batch of 20). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Kotak Private Equity', name: 'S. Sriniwasan', title: 'Managing Director', linkedinUrl: 'https://linkedin.com/in/srini-sriniwasan-4250016', sourceUrl: 'https://www.kotakalternateasset.com/leadership/', method: 'manual-research', confidence: 'high' },
  { company: 'Patamar Capital', name: 'Lee FitzGerald', title: 'Managing Partner', linkedinUrl: 'https://linkedin.com/in/lee-fitzgerald-433964148', sourceUrl: 'https://patamar.com/patamar-capital-launches-impact-investment-fund-drive-growth-womens-smes-southeast-asia/', method: 'manual-research', confidence: 'high' },
  { company: 'Greyhound Capital', name: 'Sergej Belozerov', title: 'Founder & Managing Director', linkedinUrl: '', sourceUrl: 'https://www.greyhoundcapital.net/', method: 'manual-research', confidence: 'high' },
  { company: 'Steadview Capital', name: 'Ravi Mehta', title: 'Founder, CIO & Managing Director', linkedinUrl: 'https://www.linkedin.com/in/ravi-mehta-29644826', sourceUrl: 'https://www.ashoka.edu.in/profile/ravi-mehta/', method: 'manual-research', confidence: 'high' },
  { company: 'Rebright Partners', name: 'Takeshi Ebihara', title: 'Founding General Partner', linkedinUrl: 'https://www.linkedin.com/in/ebihara', sourceUrl: 'https://rebrightpartners.com/about-us/', method: 'manual-research', confidence: 'high' },
  { company: 'Rebright Partners', name: 'Brij Bhasin', title: 'Partner (India Investments)', linkedinUrl: '', sourceUrl: 'https://rebrightpartners.com/team/brij-bhasin/', method: 'manual-research', confidence: 'high' },
  { company: 'Surge', name: 'Rajan Anandan', title: 'Managing Director', linkedinUrl: 'https://linkedin.com/in/rajan-anandan-2481b814', sourceUrl: 'https://www.forbesindia.com/article/take-one-big-story-of-the-day/peak-xv-sees-surge-programme-going-more-global-reveals-cohort-10/94446/1', method: 'manual-research', confidence: 'high' },
  { company: 'Y Combinator', name: 'Jared Friedman', title: 'Partner & Managing Director', linkedinUrl: '', sourceUrl: 'https://www.moneycontrol.com/news/business/startup/mc-interview-india-has-ai-talent-but-lacks-breakout-ideas-says-y-combinator-s-jared-friedman-13892532.html', method: 'manual-research', confidence: 'high' },
  { company: 'Techstars', name: 'Ray Newal', title: 'Managing Director, Techstars Bangalore', linkedinUrl: '', sourceUrl: 'https://www.techstars.com/newsroom/introducing-managing-director-ray-newal', method: 'manual-research', confidence: 'medium' },
  { company: 'Jungle Ventures', name: 'Amit Anand', title: 'Founding Partner & Managing Director', linkedinUrl: 'https://www.linkedin.com/in/amit-anand-6b72903', sourceUrl: 'https://www.jungle.vc/team/amit-anand', method: 'manual-research', confidence: 'high' },
  { company: 'Wavemaker Partners', name: 'Paul Santos', title: 'Managing Partner, Southeast Asia', linkedinUrl: '', sourceUrl: 'https://wavemakerpartners.com/team/', method: 'manual-research', confidence: 'high' },
  { company: 'Insignia Ventures Partners', name: 'Yinglan Tan', title: 'Founding Managing Partner', linkedinUrl: 'https://linkedin.com/in/yinglantan', sourceUrl: 'https://www.insignia.vc/team/yinglan', method: 'manual-research', confidence: 'high' },
  { company: 'JAFCO Asia', name: 'Supriya Singh', title: 'Senior Director & Head of Investment (SEA & India)', linkedinUrl: 'https://linkedin.com/in/supriya-singh-79789215', sourceUrl: 'https://www.linkedin.com/posts/jif-capital_we-are-pleased-to-announce-that-jafco-investment-activity-7439958029913006080-lHPk', method: 'manual-research', confidence: 'high' },
  { company: 'Pavilion Capital', name: 'Tow Heng Tan', title: 'CEO', linkedinUrl: '', sourceUrl: 'https://www.sevioragroup.com/resource-detail/pavilion-capital-to-join-seviora-group-in-building-a-leading-asia-based-asset-management-group', method: 'manual-research', confidence: 'high' },
  { company: 'General Atlantic', name: 'Shantanu Rastogi', title: 'Managing Director, Head of India', linkedinUrl: '', sourceUrl: 'https://www.generalatlantic.com/people/shantanu-rastogi/', method: 'manual-research', confidence: 'high' },
  { company: 'Bessemer Venture Partners', name: 'Vishal Gupta', title: 'Partner', linkedinUrl: 'https://linkedin.com/in/vishalguptabvp', sourceUrl: 'https://www.bvp.com/team/vishal-gupta', method: 'manual-research', confidence: 'high' },
  { company: 'Prosus Ventures', name: 'Ashutosh Sharma', title: 'Head of India & Southeast Asia Investments', linkedinUrl: '', sourceUrl: 'https://medial.app/news/prosus-elevates-ashutosh-sharma-to-lead-india-southeast-asia-deals-b48478a0255c5', method: 'manual-research', confidence: 'high' },
  { company: 'Prosus Ventures', name: 'Apoorve Goyal', title: 'Managing Director, India Investments', linkedinUrl: 'https://www.linkedin.com/in/apoorve-goyal-67967797', sourceUrl: 'https://www.linkedin.com/in/apoorve-goyal-67967797', method: 'manual-research', confidence: 'high' },
  { company: 'Temasek', name: 'Ravi Lambah', title: 'Head of India & Strategic Initiatives', linkedinUrl: 'https://www.linkedin.com/in/ravi-lambah-7b95a7a3', sourceUrl: 'https://www.temasek.com.sg/en/about-us/our-leadership', method: 'manual-research', confidence: 'high' },
  { company: 'SoftBank Investment Advisers', name: 'Sumer Juneja', title: 'Managing Partner, EMEA & India', linkedinUrl: 'https://www.linkedin.com/in/sumer-juneja-48288626', sourceUrl: 'https://visionfund.com/team/sarthak-misra', method: 'manual-research', confidence: 'high' }
];

const UNRESOLVABLE = [
  '500 Global',
  'Naspers Foundry'
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
