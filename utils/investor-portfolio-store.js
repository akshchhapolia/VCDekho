/**
 * Reads/writes the `investor_portfolio` table — portfolio companies per
 * investor. Primary producer today is the Searlo+Haiku backfill
 * (scripts/investor_portfolio_websearch.js). Future enrichments (fund-site
 * scrape, news-pipeline cross-ref) call the same upsert and merge by
 * companySlug so lists only grow / get richer, never get clobbered.
 */
const db = require('./db');

// Site scrapes can return large official portfolios (e.g. 100Unicorns ~150).
const MAX_STORED_COMPANIES = 150;

function companyKey(c) {
  if (c && c.companySlug) return String(c.companySlug);
  return String((c && c.name) || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Merge two company lists. Incoming wins on non-null field values when the
 * same companySlug already exists; otherwise the company is appended.
 * Sorted by date desc (undated last), capped at MAX_STORED_COMPANIES.
 */
function mergeCompanies(existing, incoming) {
  const map = new Map();
  for (const c of [...(existing || []), ...(incoming || [])]) {
    if (!c || !c.name) continue;
    const key = companyKey(c);
    if (!key) continue;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...c, companySlug: key });
      continue;
    }
    map.set(key, {
      ...prev,
      ...Object.fromEntries(
        Object.entries(c).filter(([, v]) => v != null && v !== '')
      ),
      companySlug: key,
      name: prev.name || c.name
    });
  }
  return sortAndCap(map);
}

/**
 * Official website portfolios are authoritative for the company *set*.
 * Keep news-enriched fields (amount/date/article) from existing rows when
 * the same companySlug appears in the site list; drop junk names that are
 * no longer on the official page.
 */
function mergePreferOfficialSet(existing, official) {
  const existingBy = new Map();
  for (const c of existing || []) {
    const key = companyKey(c);
    if (key) existingBy.set(key, c);
  }
  const map = new Map();
  for (const c of official || []) {
    if (!c || !c.name) continue;
    const key = companyKey(c);
    if (!key) continue;
    const prev = existingBy.get(key);
    if (!prev) {
      map.set(key, { ...c, companySlug: key });
      continue;
    }
    map.set(key, {
      ...c,
      amount: prev.amount || c.amount,
      stage: prev.stage || c.stage,
      date: prev.date || c.date,
      highlight: prev.highlight || c.highlight,
      investmentType: prev.investmentType || c.investmentType,
      sourceUrl: c.sourceUrl || prev.sourceUrl,
      sourceTitle: c.sourceTitle || prev.sourceTitle,
      website: c.website || prev.website,
      logoUrl: c.logoUrl || prev.logoUrl,
      sector: c.sector || prev.sector,
      companySlug: key,
      name: c.name || prev.name
    });
  }
  return sortAndCap(map);
}

function sortAndCap(map) {
  return [...map.values()]
    .sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db_ = b.date ? new Date(b.date).getTime() : 0;
      return db_ - da;
    })
    .slice(0, MAX_STORED_COMPANIES);
}

function isOfficialSiteSource(sourceMethod) {
  return /^(site_json|site_paths|site_scrape)$/i.test(String(sourceMethod || ''));
}

/**
 * Upsert portfolio for one investor. Always bumps checked_at (queue cursor).
 * If companies is empty/null, only bumps checked_at unless the row is new.
 * Official site scrapes (json/paths, >=8 cos) replace the company set so
 * junk logo-alt rows don't stick forever.
 */
async function upsertPortfolio(slug, companies, sourceMethod) {
  const existing = await db.query(`SELECT * FROM investor_portfolio WHERE slug = $1`, [slug]);
  const row = existing.rows[0] || null;
  const existingCompanies = (row && row.companies) || [];
  let merged = existingCompanies;
  if (companies && companies.length) {
    if (isOfficialSiteSource(sourceMethod) && companies.length >= 8) {
      merged = mergePreferOfficialSet(existingCompanies, companies);
    } else {
      merged = mergeCompanies(existingCompanies, companies);
    }
  }

  if (!merged.length) {
    await db.query(
      `INSERT INTO investor_portfolio (slug, checked_at, source_method, updated_at)
       VALUES ($1, NOW(), COALESCE($2, (SELECT source_method FROM investor_portfolio WHERE slug = $1)), NOW())
       ON CONFLICT (slug) DO UPDATE SET checked_at = NOW(), updated_at = NOW()`,
      [slug, row ? null : sourceMethod]
    );
    return { slug, updated: false, companyCount: 0 };
  }

  await db.query(
    `INSERT INTO investor_portfolio
       (slug, companies, company_count, source_method, checked_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (slug) DO UPDATE SET
       companies = EXCLUDED.companies,
       company_count = EXCLUDED.company_count,
       source_method = EXCLUDED.source_method,
       checked_at = NOW(),
       updated_at = NOW()`,
    [slug, JSON.stringify(merged), merged.length, sourceMethod]
  );
  return { slug, updated: true, companyCount: merged.length };
}

async function getAllPortfolios() {
  const { rows } = await db.query(
    `SELECT slug, companies, company_count FROM investor_portfolio WHERE company_count > 0`
  );
  return rows;
}

/**
 * Slugs least-recently checked first (never-checked first).
 */
async function getStalePortfolioSlugs(allSlugs, limit, staleAfterDays) {
  const { rows } = await db.query(
    `SELECT slug, checked_at FROM investor_portfolio WHERE checked_at > NOW() - INTERVAL '1 day' * $1`,
    [staleAfterDays]
  );
  const recentlyChecked = new Set(rows.map((r) => r.slug));
  const candidates = allSlugs.filter((slug) => !recentlyChecked.has(slug));

  const { rows: allRows } = await db.query(`SELECT slug, checked_at FROM investor_portfolio`);
  const checkedAtBySlug = new Map(
    allRows.map((r) => [r.slug, r.checked_at ? new Date(r.checked_at).getTime() : 0])
  );
  candidates.sort((a, b) => (checkedAtBySlug.get(a) || 0) - (checkedAtBySlug.get(b) || 0));
  return candidates.slice(0, limit);
}

/**
 * Investors whose stored portfolio is empty or thin (company_count <= maxCompanies).
 * Used to re-run improved lookups against weak coverage. Ordered by fewest
 * companies first, then oldest checked_at.
 */
async function getLowCoverageSlugs(allSlugs, limit, maxCompanies) {
  // Load ALL rows so investors with company_count > max are excluded correctly.
  // (Previously we only SELECTed low-count rows, then treated everyone missing
  // from that map as count 0 — which incorrectly re-queued rich portfolios.)
  const { rows } = await db.query(`SELECT slug, company_count, checked_at FROM investor_portfolio`);
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const allowed = new Set(allSlugs);
  const candidates = [];
  for (const slug of allSlugs) {
    const row = bySlug.get(slug);
    const count = row ? Number(row.company_count) || 0 : 0;
    if (count > maxCompanies) continue;
    candidates.push({
      slug,
      count,
      checkedAt: row && row.checked_at ? new Date(row.checked_at).getTime() : 0
    });
  }
  // Also include any DB low-coverage rows whose slug is still in our directory.
  for (const row of rows) {
    if (!allowed.has(row.slug)) continue;
    if (candidates.some((c) => c.slug === row.slug)) continue;
    const count = Number(row.company_count) || 0;
    if (count > maxCompanies) continue;
    candidates.push({
      slug: row.slug,
      count,
      checkedAt: row.checked_at ? new Date(row.checked_at).getTime() : 0
    });
  }

  candidates.sort((a, b) => a.count - b.count || a.checkedAt - b.checkedAt);
  return candidates.slice(0, limit).map((c) => c.slug);
}

module.exports = {
  upsertPortfolio,
  getAllPortfolios,
  getStalePortfolioSlugs,
  getLowCoverageSlugs,
  mergeCompanies
};
