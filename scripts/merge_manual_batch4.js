#!/usr/bin/env node
/** One-off: merge round 4 of manually-researched (WebSearch, grounded) people. */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Teja Ventures', name: 'Virginia Tan', title: 'Founding & Managing Partner', linkedinUrl: '', sourceUrl: 'https://www.tejaventures.com/team', method: 'manual-research', confidence: 'medium' },
  { company: 'UpsideDown VC', name: 'Jonathan Sun', title: 'Founder', linkedinUrl: 'https://linkedin.com/in/jonathan-sun-652541131', sourceUrl: 'https://upsidedown.vc/', method: 'manual-research', confidence: 'medium' },
  { company: 'Unpopular Ventures', name: 'Peter Livingston', title: 'Founder & Managing Partner', linkedinUrl: 'https://www.linkedin.com/in/pliv', sourceUrl: 'https://f4.fund/firms/unpopular-ventures', method: 'manual-research', confidence: 'high' },
  { company: 'Unpopular Ventures', name: 'Thibault Reichelt', title: 'Partner (India, Africa & LatAm)', linkedinUrl: '', sourceUrl: 'https://f4.fund/firms/unpopular-ventures', method: 'manual-research', confidence: 'high' },
  { company: 'Orbit Startups', name: 'Aditya Kathpalia', title: 'Director of India & MENA', linkedinUrl: 'https://www.linkedin.com/in/akathpalia/', sourceUrl: 'https://icoholder.com/hi/companies/orbit-startups-22319', method: 'manual-research', confidence: 'high' },
  { company: 'Unitus Capital', name: 'Abhijit Ray', title: 'Co-founder & Managing Director', linkedinUrl: 'https://linkedin.com/in/abhijit-ray-0697b47', sourceUrl: 'https://unituscapital.com/our-team/', method: 'manual-research', confidence: 'high' },
  { company: 'Unitus Capital', name: 'Kylie Charlton', title: 'Co-founder & Managing Director', linkedinUrl: '', sourceUrl: 'https://unituscapital.com/board-of-directors/', method: 'manual-research', confidence: 'high' },
  { company: 'Menterra Ventures', name: 'Mukesh Sharma', title: 'Co-founder, Partner & Head-Investment Management', linkedinUrl: '', sourceUrl: 'https://menterra.com/', method: 'manual-research', confidence: 'high' },
  { company: 'Menterra Ventures', name: 'Paul Basil', title: 'Co-founder, Partner & Head-Impact Management', linkedinUrl: '', sourceUrl: 'https://menterra.com/', method: 'manual-research', confidence: 'high' },
  { company: 'Gaja Capital', name: 'Gopal Jain', title: 'Co-founder, Managing Partner & CEO', linkedinUrl: '', sourceUrl: 'https://gajacapital.com/team/gopal-jain', method: 'manual-research', confidence: 'high' },
  { company: 'Kedaara Capital', name: 'Manish Kejriwal', title: 'Founder & Managing Partner', linkedinUrl: 'https://www.linkedin.com/in/manish-kejriwal-1a7336', sourceUrl: 'https://kedaara.com/team-member/manish-kejriwal/', method: 'manual-research', confidence: 'high' },
  { company: 'Kedaara Capital', name: 'Sunish Sharma', title: 'Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://kedaara.com/team-member/sunish-sharma/', method: 'manual-research', confidence: 'high' }
];

function main() {
  const data = JSON.parse(fs.readFileSync(CANDIDATES_PATH, 'utf8'));
  const resolvedCompanies = new Set(NEW_FOUND.map((p) => p.company));

  const beforeFound = data.found.length;
  const beforeUnresolved = data.unresolved.length;

  data.found.push(...NEW_FOUND);
  data.unresolved = data.unresolved.filter((u) => !resolvedCompanies.has(u.company));

  fs.writeFileSync(CANDIDATES_PATH, JSON.stringify(data, null, 2));

  console.log(`found: ${beforeFound} -> ${data.found.length} (+${NEW_FOUND.length})`);
  console.log(`unresolved: ${beforeUnresolved} -> ${data.unresolved.length} (-${resolvedCompanies.size} orgs resolved)`);
}

main();
