#!/usr/bin/env node
/**
 * Build normalized people JSON from the Individuals CSV, cross-linked to
 * the already-built Org directory (data/investors.json) via company name.
 * Usage: node scripts/build_people_json.js
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { resolveOrg, normStrict } = require('./lib/org_lookup');
const { slugify } = require('./lib/slugify');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'VC Dekho Sheet - Investor - Individuals.csv');
const INVESTORS_JSON_PATH = path.join(ROOT, 'data', 'investors.json');
const PHOTOS_META_PATH = path.join(ROOT, 'data', 'people-photos.json');
const OUT_PATH = path.join(ROOT, 'data', 'people.json');

function build() {
  const rows = parse(fs.readFileSync(CSV_PATH, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  const investorsData = JSON.parse(fs.readFileSync(INVESTORS_JSON_PATH, 'utf8'));
  const orgByNormName = new Map();
  for (const inv of investorsData.investors) {
    orgByNormName.set(normStrict(inv.name), inv);
  }

  const usedSlugs = new Set();
  const people = [];

  for (const row of rows) {
    const name = (row['First Name'] || '').trim();
    const companyRaw = (row.Company || '').trim();
    const title = (row.Title || '').trim();
    if (!name) continue; // skip blank rows

    const isSoloAngel = /^angel investor$/i.test(title);

    let companySlug = '';
    let companyType = '';
    let companyLogo = null;
    let companyName = companyRaw;

    // Solo angels: Firm column shows "Angel Investor". Resolve their org page
    // via person name when Company is already the display label (or self-named).
    const lookupName = isSoloAngel
      ? (companyRaw && !/^angel investor$/i.test(companyRaw) ? companyRaw : name)
      : companyRaw;

    if (lookupName) {
      const resolved = resolveOrg(lookupName);
      const key = resolved.match ? normStrict(resolved.match.company) : normStrict(lookupName);
      const org = orgByNormName.get(key);
      if (org) {
        companySlug = org.slug;
        companyType = org.type;
        companyLogo = org.logo || null;
        companyName = org.name;
      }
    }

    if (isSoloAngel) {
      companyName = 'Angel Investor';
    }

    let slug = slugify(name) || 'person';
    let base = slug;
    let n = 2;
    while (usedSlugs.has(slug)) {
      slug = `${base}-${n++}`;
    }
    usedSlugs.add(slug);

    people.push({
      id: String(people.length + 1),
      slug,
      name,
      title,
      company: companyName,
      companySlug,
      companyType,
      companyLogo,
      email: (row.Email || '').trim(),
      linkedin: (row['LinkedIn URL'] || '').trim(),
      twitter: (row['Twitter URL'] || '').trim()
    });
  }

  const typeCounts = new Map();
  people.forEach((p) => {
    if (!p.companyType) return;
    typeCounts.set(p.companyType, (typeCounts.get(p.companyType) || 0) + 1);
  });
  const companyTypes = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => ({ id: slugify(label) || 'other', label }));

  // Preserve previously fetched Twitter/X photos across rebuilds
  if (fs.existsSync(PHOTOS_META_PATH)) {
    try {
      const photosMeta = JSON.parse(fs.readFileSync(PHOTOS_META_PATH, 'utf8'));
      people.forEach((p) => {
        if (photosMeta[p.slug] && photosMeta[p.slug].path) p.photo = photosMeta[p.slug].path;
      });
    } catch (_) {}
  }

  const linkedCount = people.filter((p) => p.companySlug).length;

  const payload = {
    generatedAt: new Date().toISOString(),
    count: people.length,
    linkedToOrgCount: linkedCount,
    filters: { companyTypes },
    people
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload), 'utf8');
  console.log(`Wrote ${people.length} people (${linkedCount} linked to an org) → ${OUT_PATH}`);
  console.log('Sample:', people[0] && people[0].name, people[0] && people[0].slug, people[0] && people[0].companySlug);
}

build();
