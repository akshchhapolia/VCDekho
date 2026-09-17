#!/usr/bin/env node
/** One-off: merge round 19 of manually-researched people (batch of 20). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CANDIDATES_PATH = path.join(ROOT, 'data', 'candidates', 'people-candidates.json');

const NEW_FOUND = [
  { company: 'Andhra Pradesh Innovation Society', name: 'Suryateja Mallavarapu', title: 'CEO', linkedinUrl: 'https://linkedin.com/in/suryateja-mallavarapu-ias-59820283', sourceUrl: 'https://www.linkedin.com/posts/andhra-pradesh-innovation-society-4a3483217_codespark2025-apinnovationsociety-innovationleadership-activity-7358473594290532354-QYv3', method: 'manual-research', confidence: 'high' },
  { company: 'Gujarat Student Startup Innovation Hub / i-Hub', name: 'Jaykumar Joshi', title: 'Program Head', linkedinUrl: 'https://linkedin.com/in/jaykumar-joshi-490b8039', sourceUrl: 'https://ihubgujarat.in/about', method: 'manual-research', confidence: 'high' },
  { company: 'Karnataka Innovation Authority / Elevate', name: 'Sanjeev Kumar Gupta', title: 'CEO, Karnataka Digital Economy Mission', linkedinUrl: '', sourceUrl: 'https://karnatakadigital.in/about-us/', method: 'manual-research', confidence: 'high' },
  { company: 'Tamil Nadu Startup & Innovation Mission', name: 'L. Nirmal Raj', title: 'CEO (additional charge); Industries Commissioner', linkedinUrl: '', sourceUrl: 'https://www.newindianexpress.com/states/tamil-nadu/2026/Jun/25/ramanathan-resigns-as-ceo-of-startuptn-after-45-year-stint', method: 'manual-research', confidence: 'high' },
  { company: 'Odisha Startup / Startup Odisha', name: 'Smruti Ranjan Pradhan', title: 'CEO', linkedinUrl: '', sourceUrl: 'https://startupodisha.gov.in/', method: 'manual-research', confidence: 'high' },
  { company: 'Telangana TSIC / T-Hub related programs', name: 'Kavikrut', title: 'CEO, T-Hub', linkedinUrl: 'https://www.linkedin.com/in/kavikrut', sourceUrl: 'https://timesofindia.indiatimes.com/city/hyderabad/telangana-govt-ropes-in-former-oyo-cxo-kavikrut-to-helm-t-hub/articleshow/118782337.cms', method: 'manual-research', confidence: 'high' },
  { company: 'Unitus Ventures', name: 'Surya Mantha', title: 'Managing Partner (Capria / former Unitus Ventures)', linkedinUrl: '', sourceUrl: 'https://yourstory.com/2023/09/unitus-ventures-combines-with-capria-ventures-to-form-single-entity', method: 'manual-research', confidence: 'high' },
  { company: 'Seedfund', name: 'Bharati Jacob', title: 'Founder & Managing Partner', linkedinUrl: '', sourceUrl: 'https://www.seedfund.in/', method: 'manual-research', confidence: 'high' },
  { company: 'Infuse Ventures', name: 'Shyam Menon', title: 'Co-Founder & Investment Director', linkedinUrl: 'https://in.linkedin.com/in/shyam-menon-b908314', sourceUrl: 'https://indiaai.gov.in/investment-fund/infuse-ventures', method: 'manual-research', confidence: 'high' },
  { company: 'Asha Impact', name: 'Vikram Gandhi', title: 'Founder', linkedinUrl: '', sourceUrl: 'https://vikramsgandhi.com/', method: 'manual-research', confidence: 'high' },
  { company: 'Circulate Capital', name: 'Rob Kaplan', title: 'Founder & CEO', linkedinUrl: 'https://www.linkedin.com/in/robbykaplan', sourceUrl: 'https://www.circulatecapital.com/team/rob-kaplan/', method: 'manual-research', confidence: 'high' },
  { company: 'Amicus Capital', name: 'Mahesh Parasuraman', title: 'Partner & Co-Founder', linkedinUrl: '', sourceUrl: 'https://www.amicuscapital.in/news/niif-announces-inr-207-crore-usd-25-mn-commitment-to-amicus-capital/', method: 'manual-research', confidence: 'high' },
  { company: 'Zodius Capital', name: 'Neeraj Bhargava', title: 'Founder, Senior Managing Director & CEO', linkedinUrl: '', sourceUrl: 'https://www.marketsandmarkets.com/leadership/NeerajBhargava.asp', method: 'manual-research', confidence: 'high' },
  { company: 'Soonicorn Club Ventures', name: 'Vijay Singh Rathore', title: 'Co-Founder & CEO', linkedinUrl: 'https://linkedin.com/in/vijayrathorenucleus', sourceUrl: 'https://startupintros.com/orgs/soonicorn-ventures', method: 'manual-research', confidence: 'high' },
  { company: 'UnLtd India', name: 'Akhil Shahani', title: 'Managing Director (UnLtd India via SAGE Foundation)', linkedinUrl: '', sourceUrl: 'https://idronline.org/article/ecosystem-development/making-acquisitions-work-for-nonprofits/', method: 'manual-research', confidence: 'high' },
  { company: 'C-CAMP', name: 'Taslimarif Saiyed', title: 'CEO & Director', linkedinUrl: 'https://www.linkedin.com/in/taslimarif', sourceUrl: 'https://indianexpress.com/article/technology/tech-news-technology/antimicrobial-resistance-taslimarif-saiyed-ceo-c-camp-interview-9032500/', method: 'manual-research', confidence: 'high' }
];

const UNRESOLVABLE = [
  'Know3 Ventures',
  'Locomotive Ventures',
  'Beej Capital',
  'Systemiq Capital'
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
