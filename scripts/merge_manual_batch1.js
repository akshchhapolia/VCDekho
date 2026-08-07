#!/usr/bin/env node
/**
 * One-off: merge manually-researched (WebSearch, grounded) people for the
 * first 15 orgs of followup-batches/batch-1.json directly into the staged
 * people-candidates.json, and remove those orgs from the unresolved list.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Stride Ventures', name: 'Ishpreet Singh Gandhi', title: 'Founder & Managing Partner', linkedinUrl: 'https://www.linkedin.com/in/ishpreet-singh-gandhi-539893b', sourceUrl: 'https://www.strideventures.global/team/ishpreet-singh-gandhi', method: 'manual-research', confidence: 'high' },
  { company: 'Better Capital', name: 'Vaibhav Domkundwar', title: 'Founder & CEO', linkedinUrl: 'https://www.linkedin.com/in/better', sourceUrl: 'https://www.bettercapital.vc/media', method: 'manual-research', confidence: 'high' },
  { company: 'Arkam Ventures', name: 'Rahul Chandra', title: 'Co-founder & Managing Director', linkedinUrl: '', sourceUrl: 'https://www.forbesindia.com/article/take-one-big-story-of-the-day/riders-of-the-next-ark-inside-arkams-plan-for-middle-indias-limitless-founders/86139/1', method: 'manual-research', confidence: 'high' },
  { company: 'Arkam Ventures', name: 'Bala Srinivasa', title: 'Co-founder & Managing Director', linkedinUrl: '', sourceUrl: 'https://www.forbesindia.com/article/take-one-big-story-of-the-day/riders-of-the-next-ark-inside-arkams-plan-for-middle-indias-limitless-founders/86139/1', method: 'manual-research', confidence: 'high' },
  { company: 'Shastra VC', name: 'Ashis Nayak', title: 'Founding Partner', linkedinUrl: 'https://www.linkedin.com/in/ashisnayak19', sourceUrl: 'https://in.linkedin.com/company/shastravc', method: 'manual-research', confidence: 'high' },
  { company: 'Shastra VC', name: 'Avijeet Alagathi', title: 'Managing Partner', linkedinUrl: 'https://linkedin.com/in/avialagathi', sourceUrl: 'https://in.linkedin.com/company/shastravc', method: 'manual-research', confidence: 'high' },
  { company: 'FreeFlow Ventures', name: 'Suraj Juneja', title: 'Founder', linkedinUrl: 'https://linkedin.com/in/suraj-juneja-615488a', sourceUrl: 'https://in.linkedin.com/company/freeflow-venture-builders', method: 'manual-research', confidence: 'high' },
  { company: 'FreeFlow Ventures', name: 'Aaquib Hussain', title: 'Founding Partner', linkedinUrl: 'https://linkedin.com/in/aaquibh', sourceUrl: 'https://in.linkedin.com/company/freeflow-venture-builders', method: 'manual-research', confidence: 'high' },
  { company: 'Venture Highway', name: 'Neeraj Arora', title: 'Co-founder', linkedinUrl: '', sourceUrl: 'https://inc42.com/buzz/venture-highway-founder-samir-sood-steps-down-partner/', method: 'manual-research', confidence: 'high' },
  { company: 'Venture Highway', name: 'Priya Mohan', title: 'Managing Partner', linkedinUrl: '', sourceUrl: 'https://inc42.com/buzz/venture-highway-founder-samir-sood-steps-down-partner/', method: 'manual-research', confidence: 'high' },
  { company: 'Sauce.vc', name: 'Manu Chandra', title: 'Founder & Managing Partner', linkedinUrl: 'https://www.linkedin.com/in/manuchandra', sourceUrl: 'https://sauce.vc/team/', method: 'manual-research', confidence: 'high' },
  { company: 'Saama', name: 'Ash Lilani', title: 'Managing Partner & Co-Founder', linkedinUrl: 'https://www.linkedin.com/in/ashlilani', sourceUrl: 'https://startupintros.com/orgs/saama-capital', method: 'manual-research', confidence: 'high' },
  { company: 'Saama', name: 'Suresh Shanmugham', title: 'Managing Partner & Co-Founder', linkedinUrl: '', sourceUrl: 'https://startupintros.com/orgs/saama-capital', method: 'manual-research', confidence: 'high' },
  { company: 'Tomorrow Capital', name: 'Rohini Prakash', title: 'Founder & CEO', linkedinUrl: 'https://in.linkedin.com/in/rohini-prakash-472b654', sourceUrl: 'https://in.marketscreener.com/insider/ROHINI-PRAKASH-A2OSH0/', method: 'manual-research', confidence: 'medium' },
  { company: 'Iron Pillar', name: 'Anand Prasanna', title: 'Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://theorg.com/org/iron-pillar/org-chart/anand-prasanna', method: 'manual-research', confidence: 'high' },
  { company: 'Inflexor Ventures', name: 'Venkat Vallabhaneni', title: 'Founder & Managing Director', linkedinUrl: '', sourceUrl: 'https://www.inflexor.vc/about', method: 'manual-research', confidence: 'high' },
  { company: 'Inflexor Ventures', name: 'Jatin Desai', title: 'Founder & Managing Director', linkedinUrl: '', sourceUrl: 'https://www.inflexor.vc/about', method: 'manual-research', confidence: 'high' },
  { company: 'Sorin Investments', name: 'Sanjay Nayar', title: 'Founder & Chairman', linkedinUrl: '', sourceUrl: 'https://www.sorininvestments.com/team/sanjay-nayar', method: 'manual-research', confidence: 'high' },
  { company: 'Enzia Ventures', name: 'Jayshree Kanther Patodi', title: 'Co-Founder & Managing Partner', linkedinUrl: 'https://linkedin.com/in/jayshreekanther', sourceUrl: 'https://www.enzia.vc/people', method: 'manual-research', confidence: 'high' },
  { company: 'GrowthCap Ventures', name: 'Pratekk Agarwaal', title: 'Founder & General Partner', linkedinUrl: 'https://www.linkedin.com/in/pratekk', sourceUrl: 'https://growthcap.vc/', method: 'manual-research', confidence: 'high' },
  { company: 'DeVC', name: 'Divyanshi Chowdhary', title: 'Head of Investments', linkedinUrl: '', sourceUrl: 'https://www.privateequityinternational.com/institution-profiles/devc.html', method: 'manual-research', confidence: 'medium' }
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
