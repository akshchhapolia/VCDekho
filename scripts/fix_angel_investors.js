#!/usr/bin/env node
/**
 * Fix angel investor rows: map to operating company, clear bad LinkedIn slugs,
 * apply verified LinkedIn, optionally DDG-search replacements.
 *
 * Usage:
 *   node scripts/fix_angel_investors.js [--search] [--limit 30] [--dry-run]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const { execSync } = require('child_process');
const { fetchOne } = require('./lib/site_crawl');
const {
  normalizeLinkedIn,
  linkedinSlugMatchesName
} = require('./lib/social_extract');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const CORRECTIONS_PATH = path.join(ROOT, 'data', 'candidates', 'angel-investor-corrections.json');

const BAD_SLUGS = new Set(`
agarwalritesh,binnybansalofficial,sachin-bansal-9b7a551,falguninayar,aman-gupta-boAt,shashank-kumar-92014b1b,
vidit-aatrey,sujeet-kumar-b2a4b45,sharad-sharma-iSPIRT,phanindrasama,varun-alagh,ghazal-alagh,ashneer-grover,
yashish-dahiya-07b5bb4,alok-bansal-pb,kalyan-krishnamurthy-b657b65,meenaganesh,revathi-kant-,saireechahal,
manish-tandon-b2a3a,sridharvembu,abheek-anand,raviadusumalli,karthik-reddy-blume,anandladsariya,rehanyahya,
balaparthasarathy,ashishguptavc,rishadpremji,tvmohandaspai,piyush-shah-browserstack,akash-sinha-cashfree,
ravi-venkatesan-076b731,kiran-mazumdar-shaw,zia-mody-1b6b5a1,sandeep-tandon-b2b6a01,sanjivrangrass,
pushkarmukewar,thirukumaran-nagarajan,raghunandan-g-6a09a74,kavinmittal,aakritvaish,swapanrajdev,maneeshbhandari,
saurabh-srivastava-b3b5a91,sanjeevbarnwal,adwaita-nayar,anchit-nayar-b8b4b411,amit-chaudhary-lenskart,
sumeetvadera,ambareesh-murty,sachingupta-hackerearth,mayank-kumar-upgrad,phalgun-kompalli,ishan-gupta-foundit,
karan-bajwa-08b8961,kiran-karnik-6a11b45,chetna-sinha-31b3b214,roopa-kudva-8b69a75,parikshitdar,
ranjan-pai-b3a3b41,ravigururaj,maninder-gulati-oyo,upasanataku,harshvardhanlunia,bhavesh-manglani-1b44b315,
sahilbarua,suraj-saharan,mekinmaheshwari,ashutosh-lawania,rishi-navani,akhil-gupta-bharti,sumir-chadha-0b3b5,
farhad-forbes-1b1b5b5,pranaychulet,farid-ahsan,akshay-bk-93b3a814,abhayhanjura,meher-pudumjee-8a0b8a5,
swati-piramal,pushpendra-vishal-kaushal-cissp
`.split(/[\s,]+/).filter(Boolean).map((s) => s.toLowerCase()));

function parseArgs(argv) {
  const args = { search: false, limit: 40, dryRun: false, delayMs: 1200 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--search') args.search = true;
    else if (argv[i] === '--limit') args.limit = Number(argv[++i]);
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--delay') args.delayMs = Number(argv[++i]);
  }
  return args;
}

function slugFromUrl(url) {
  const m = String(url || '').match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]).replace(/\/+$/, '').toLowerCase() : '';
}

function isBadLinkedIn(url) {
  return BAD_SLUGS.has(slugFromUrl(url));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractResultUrls(html) {
  const urls = [];
  const seen = new Set();
  for (const m of String(html || '').matchAll(/uddg=([^&"]+)/gi)) {
    try {
      const decoded = decodeURIComponent(m[1].replace(/\+/g, ' '));
      if (decoded.startsWith('http') && !seen.has(decoded)) {
        seen.add(decoded);
        urls.push(decoded);
      }
    } catch (_) {}
  }
  return urls;
}

async function ddgFindLinkedIn(name, company) {
  const queries = [
    `"${name}" "${company}" linkedin`,
    `"${name}" ${company} site:linkedin.com/in`,
    `"${name}" founder ${company} linkedin`
  ];
  for (const q of queries) {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    const res = await fetchOne(url, 12000);
    if (!res.ok || !res.html) continue;
    for (const u of extractResultUrls(res.html)) {
      const li = normalizeLinkedIn(u);
      if (li && linkedinSlugMatchesName(li, name)) return li;
    }
    await sleep(400);
  }
  return '';
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const corrections = JSON.parse(fs.readFileSync(CORRECTIONS_PATH, 'utf8'));
  const companyByName = corrections.companyByName || {};
  const verifiedByName = corrections.verifiedLinkedInByName || {};

  const rows = parse(fs.readFileSync(CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  let companyUpdated = 0;
  let cleared = 0;
  let verifiedApplied = 0;
  let searched = 0;
  let searchFound = 0;
  const pendingSearch = [];

  for (const row of rows) {
    const name = (row['First Name'] || '').trim();
    if (!name) continue;

    const li = (row['LinkedIn URL'] || '').trim();
    const bad = isBadLinkedIn(li);
    const isAngel = /^angel investor$/i.test((row.Company || '').trim()) ||
      /^angel investor$/i.test((row.Title || '').trim());

    if (!bad && !companyByName[name]) continue;
    if (!bad && !isAngel) continue;

    const company = companyByName[name];
    if (company && row.Company !== company) {
      console.log(`Company: ${name} → ${company}`);
      if (!args.dryRun) row.Company = company;
      companyUpdated++;
    }

    if (bad) {
      console.log(`Clear bad LI: ${name} (${li})`);
      if (!args.dryRun) row['LinkedIn URL'] = '';
      cleared++;
    }

    const verified = verifiedByName[name];
    if (verified) {
      console.log(`Verified LI: ${name} → ${verified}`);
      if (!args.dryRun) row['LinkedIn URL'] = verified;
      verifiedApplied++;
      continue;
    }

    if (bad && args.search && company) {
      pendingSearch.push({ row, name, company });
    }
  }

  const slice = pendingSearch.slice(0, args.limit);
  for (const item of slice) {
    searched++;
    process.stdout.write(`Search LI: ${item.name} @ ${item.company} ... `);
    const found = await ddgFindLinkedIn(item.name, item.company);
    if (found) {
      console.log(found);
      if (!args.dryRun) item.row['LinkedIn URL'] = found;
      searchFound++;
    } else {
      console.log('not found');
    }
    await sleep(args.delayMs);
  }

  if (!args.dryRun && (companyUpdated || cleared || verifiedApplied || searchFound)) {
    fs.writeFileSync(CSV_PATH, stringify(rows, { header: true, columns: Object.keys(rows[0] || {}) }));
    execSync('node scripts/build_people_json.js', { cwd: ROOT, stdio: 'inherit' });
  }

  console.log(`\nCompany updated: ${companyUpdated}`);
  console.log(`Bad LinkedIn cleared: ${cleared}`);
  console.log(`Verified LinkedIn applied: ${verifiedApplied}`);
  console.log(`DDG searched: ${searched}, found: ${searchFound}${args.dryRun ? ' (dry run)' : ''}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
