const fs = require('fs');
const path = require('path');
const { INVESTMENT_STAGES } = require('../data/investment-stages');

let cache = null;
let activityCacheAt = 0;
let portfolioCacheAt = 0;
const ACTIVITY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min — avoids a DB round trip on every request
const PORTFOLIO_CACHE_TTL_MS = 5 * 60 * 1000;

const STAGE_GUIDE_IDS = new Set(INVESTMENT_STAGES.map(s => s.id));

// How recent a mined news mention has to be for an investor to be shown as
// "actively deploying". Kept as a rolling window (not a stored boolean) so
// the badge ages out correctly even if data/investor-activity.json isn't
// regenerated for a while — see scripts/build_investor_activity.js.
const ACTIVE_WINDOW_DAYS = 180;

function isActivelyDeploying(inv) {
  if (!inv || !inv.lastCheckDate) return false;
  const ageDays = (Date.now() - new Date(inv.lastCheckDate).getTime()) / (24 * 60 * 60 * 1000);
  return ageDays >= 0 && ageDays <= ACTIVE_WINDOW_DAYS;
}

function loadInvestorsData() {
  if (cache) return cache;
  const filePath = path.join(__dirname, '..', 'data', 'investors.json');
  cache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return cache;
}

/**
 * Merges the live investor_activity table (kept fresh by
 * api/cron/investor-activity.js and api/cron/investor-activity-backfill.js)
 * on top of the static investors.json data, in place, with a short TTL so
 * request handlers can just `await` this once and use the normal sync
 * getters/filters. Failures fall back silently to whatever's already cached
 * (badge freshness degrades gracefully; the site never breaks on a DB hiccup).
 */
async function ensureActivityFresh() {
  const now = Date.now();
  if (now - activityCacheAt < ACTIVITY_CACHE_TTL_MS) return;
  try {
    const db = require('./db');
    const { rows } = await db.query(
      `SELECT slug, last_check_date, last_check_sector, last_check_highlight, last_check_source, last_check_source_title, recent_check_count, recent_checks
       FROM investor_activity WHERE last_check_date IS NOT NULL`
    );
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    const data = loadInvestorsData();
    data.investors.forEach((inv) => {
      const r = bySlug.get(inv.slug);
      if (!r) return;
      inv.lastCheckDate = r.last_check_date;
      inv.lastCheckSector = r.last_check_sector;
      inv.lastCheckHighlight = r.last_check_highlight;
      inv.lastCheckSource = r.last_check_source;
      inv.lastCheckSourceTitle = r.last_check_source_title;
      inv.recentCheckCount = r.recent_check_count;
      inv.recentChecks = r.recent_checks || [];
    });
    activityCacheAt = now;
  } catch (err) {
    console.error('ensureActivityFresh: failed to load investor_activity from DB:', err.message);
  }
}

/**
 * Merges live investor_portfolio rows onto cached investor profiles so the
 * portfolio widget updates without a redeploy. Same TTL pattern as activity.
 */
async function ensurePortfolioFresh() {
  const now = Date.now();
  if (now - portfolioCacheAt < PORTFOLIO_CACHE_TTL_MS) return;
  try {
    const db = require('./db');
    const { rows } = await db.query(
      `SELECT slug, companies, company_count FROM investor_portfolio WHERE company_count > 0`
    );
    const bySlug = new Map(rows.map((r) => [r.slug, r]));
    const data = loadInvestorsData();
    data.investors.forEach((inv) => {
      const r = bySlug.get(inv.slug);
      if (!r) return;
      inv.portfolioCompanies = r.companies || [];
      inv.portfolioCount = r.company_count || 0;
    });
    portfolioCacheAt = now;
  } catch (err) {
    console.error('ensurePortfolioFresh: failed to load investor_portfolio from DB:', err.message);
  }
}

function getFilters() {
  return loadInvestorsData().filters;
}

function getAllInvestors() {
  return loadInvestorsData().investors;
}

function getInvestorBySlug(slug) {
  return getAllInvestors().find(i => i.slug === slug) || null;
}

function hasStageGuide(id) {
  return Boolean(id && STAGE_GUIDE_IDS.has(id));
}

function getStageGuideLabel(id) {
  const stage = INVESTMENT_STAGES.find(s => s.id === id);
  return stage ? stage.label : id;
}

function chequeOverlaps(inv, range) {
  if (inv.chequeMin == null && inv.chequeMax == null) return false;
  const min = inv.chequeMin != null ? inv.chequeMin : inv.chequeMax;
  const max = inv.chequeMax != null ? inv.chequeMax : inv.chequeMin;
  const rMin = range.min == null ? 0 : range.min;
  const rMax = range.max == null ? Number.POSITIVE_INFINITY : range.max;
  return max >= rMin && min <= rMax;
}

function filterInvestors(query = {}) {
  const data = loadInvestorsData();
  let list = data.investors;

  const q = (query.q || '').trim().toLowerCase();
  const sector = query.sector || '';
  const stage = query.stage || '';
  const type = query.type || '';
  const thesis = query.thesis || '';
  const cheque = query.cheque || '';
  const active = query.active === '1' || query.active === 'true';

  if (active) list = list.filter(isActivelyDeploying);

  if (q) {
    list = list.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.thesis || '').toLowerCase().includes(q) ||
      (i.writeup || '').toLowerCase().includes(q) ||
      i.sectors.join(' ').toLowerCase().includes(q)
    );
  }
  if (sector) list = list.filter(i => i.sectorIds.includes(sector));
  if (stage) list = list.filter(i => i.stageIds.includes(stage));
  if (type) list = list.filter(i => i.typeId === type);
  if (thesis) list = list.filter(i => i.thesisThemeIds.includes(thesis));
  if (cheque) {
    const range = (data.filters.chequeRanges || []).find(r => r.id === cheque);
    if (range) list = list.filter(i => chequeOverlaps(i, range));
  }

  list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function toCard(investor) {
  return {
    slug: investor.slug,
    name: investor.name,
    type: investor.type,
    typeId: investor.typeId,
    stages: investor.stages,
    stageIds: investor.stageIds || [],
    sectors: investor.sectors.slice(0, 4),
    thesisThemes: investor.thesisThemes.slice(0, 3),
    thesisThemeIds: (investor.thesisThemeIds || []).slice(0, 3),
    thesis: investor.thesis,
    chequeSize: investor.chequeSize,
    website: investor.website,
    logo: investor.logo || null,
    activelyDeploying: isActivelyDeploying(investor),
    lastCheckDate: investor.lastCheckDate || null,
    lastCheckHighlight: investor.lastCheckHighlight || null
  };
}

/**
 * Derive top stage guides from a list of investors/cards (by stageId frequency).
 */
function deriveRelatedStages(investors, limit = 4) {
  const counts = Object.create(null);
  (investors || []).forEach(inv => {
    (inv.stageIds || []).forEach(id => {
      if (!hasStageGuide(id)) return;
      counts[id] = (counts[id] || 0) + 1;
    });
  });
  return Object.keys(counts)
    .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
    .slice(0, limit)
    .map(id => ({
      id,
      label: getStageGuideLabel(id),
      count: counts[id]
    }));
}

module.exports = {
  loadInvestorsData,
  getFilters,
  getAllInvestors,
  getInvestorBySlug,
  filterInvestors,
  toCard,
  hasStageGuide,
  getStageGuideLabel,
  deriveRelatedStages,
  isActivelyDeploying,
  ensureActivityFresh,
  ensurePortfolioFresh,
  ACTIVE_WINDOW_DAYS,
  STAGE_GUIDE_IDS
};
