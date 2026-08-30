const { filterPeople, getFilters, toCard, getAllPeople, normalizePersonRole } = require('../utils/people');
const { renderPeopleRows } = require('../utils/render-people-rows');
const {
  filterInvestors,
  getFilters: getFundFilters,
  toCard: toFundCard,
  getAllInvestors
} = require('../utils/investors');
const { renderFundRows } = require('../utils/render-directory-rows');

const PAGE_SIZE = 15;

function assertNoEmails(cards) {
  for (const card of cards || []) {
    if (card && Object.prototype.hasOwnProperty.call(card, 'email')) {
      delete card.email;
    }
  }
  return cards;
}

function getPeopleListPayload() {
  const all = filterPeople({});
  const page = all.slice(0, PAGE_SIZE).map((p) => toCard(p));
  assertNoEmails(page);
  return {
    total: all.length,
    offset: 0,
    limit: PAGE_SIZE,
    filters: getFilters(),
    people: page,
    prerendered: true,
    rowsHtml: renderPeopleRows(page)
  };
}

function getFundsListPayload() {
  const all = filterInvestors({});
  const page = all.slice(0, PAGE_SIZE).map(toFundCard);
  return {
    total: all.length,
    offset: 0,
    limit: PAGE_SIZE,
    filters: getFundFilters(),
    investors: page,
    prerendered: true,
    rowsHtml: renderFundRows(page)
  };
}

function slimIds(ids) {
  return Array.isArray(ids) && ids.length ? ids : undefined;
}

/** Full public people list for in-memory filter/page (Founder Tape model). No emails. */
function getPeopleDirectoryIndex() {
  const firms = new Map();
  for (const inv of getAllInvestors()) firms.set(inv.slug, inv);

  const people = getAllPeople()
    .map((p) => {
      const firm = p.companySlug ? firms.get(p.companySlug) : null;
      const card = toCard(p);
      const row = {
        slug: card.slug,
        name: card.name,
        title: card.title,
        company: card.company,
        companySlug: card.companySlug || '',
        companyType: card.companyType || '',
        companyLogo: card.companyLogo,
        photo: card.photo,
        hasEmail: card.hasEmail,
        linkedin: card.linkedin || '',
        twitter: card.twitter || '',
        role: normalizePersonRole(p.title) || ''
      };
      if (firm) {
        const stageIds = slimIds(firm.stageIds);
        const sectorIds = slimIds(firm.sectorIds);
        const thesisThemeIds = slimIds(firm.thesisThemeIds);
        if (stageIds) row.stageIds = stageIds;
        if (sectorIds) row.sectorIds = sectorIds;
        if (thesisThemeIds) row.thesisThemeIds = thesisThemeIds;
        if (firm.chequeMin != null) row.chequeMin = firm.chequeMin;
        if (firm.chequeMax != null) row.chequeMax = firm.chequeMax;
      }
      return row;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  assertNoEmails(people);
  return {
    total: people.length,
    filters: getFilters(),
    people
  };
}

/** Full funds list for in-memory filter/page. */
function getFundsDirectoryIndex() {
  const investors = filterInvestors({}).map((i) => {
    const card = toFundCard(i);
    const row = {
      slug: card.slug,
      name: card.name,
      type: card.type,
      typeId: card.typeId || '',
      stages: card.stages,
      sectors: card.sectors,
      thesisThemes: card.thesisThemes,
      thesis: card.thesis || '',
      chequeSize: card.chequeSize,
      logo: card.logo,
      activelyDeploying: Boolean(card.activelyDeploying)
    };
    const stageIds = slimIds(i.stageIds);
    const sectorIds = slimIds(i.sectorIds);
    const thesisThemeIds = slimIds(i.thesisThemeIds);
    if (stageIds) row.stageIds = stageIds;
    if (sectorIds) row.sectorIds = sectorIds;
    if (thesisThemeIds) row.thesisThemeIds = thesisThemeIds;
    if (i.chequeMin != null) row.chequeMin = i.chequeMin;
    if (i.chequeMax != null) row.chequeMax = i.chequeMax;
    return row;
  });

  return {
    total: investors.length,
    filters: getFundFilters(),
    investors
  };
}

module.exports = {
  PAGE_SIZE,
  getPeopleListPayload,
  getFundsListPayload,
  getPeopleDirectoryIndex,
  getFundsDirectoryIndex,
  assertNoEmails
};
