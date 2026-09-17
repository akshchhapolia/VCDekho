const { getPersonBySlug, getPeopleByCompanySlug, toCard, getAllPeople } = require('../utils/people');
const {
  getInvestorBySlug,
  filterInvestors,
  toCard: toFundCard,
  getAllInvestors
} = require('../utils/investors');
const { renderPersonPage } = require('../utils/render-person-page');
const { renderInvestorPage } = require('../utils/render-investor-page');
const {
  stripDocumentChrome,
  captureRenderHtml,
  extractTitle,
  extractMetaContent,
  extractCanonical,
  extractBodyClass
} = require('./html-page');

const GUIDE_ROOTS = { stages: true, themes: true, sectors: true };

async function loadPersonProfile(slug) {
  const person = getPersonBySlug(slug);
  if (!person) {
    const fund = getInvestorBySlug(slug);
    if (fund) return { redirectTo: '/funds/' + encodeURIComponent(slug) };
    return null;
  }
  const colleagues = getPeopleByCompanySlug(person.companySlug, person.slug).map(toCard);
  const investor = person.companySlug ? getInvestorBySlug(person.companySlug) : null;
  const html = captureRenderHtml((res) =>
    renderPersonPage(person, colleagues, investor, res, {
      mwebFirstPaint: true
    })
  );
  return {
    title: extractTitle(html),
    description: extractMetaContent(html, 'description'),
    canonical: extractCanonical(html),
    bodyClass: extractBodyClass(html) || 'scrollable-page inv-page inv-person-profile',
    mainHtml: stripDocumentChrome(html)
  };
}

async function loadFundProfile(slug) {
  if (GUIDE_ROOTS[slug]) return { reserved: true };
  const investor = getInvestorBySlug(slug);
  if (!investor) return null;
  const related = filterInvestors({
    sector: (investor.sectorIds && investor.sectorIds[0]) || '',
    type: investor.typeId || ''
  })
    .filter((i) => i.slug !== investor.slug)
    .slice(0, 3)
    .map(toFundCard);
  const html = captureRenderHtml((res) =>
    renderInvestorPage(investor, related, res, {
      mwebFirstPaint: true
    })
  );
  return {
    title: extractTitle(html),
    description: extractMetaContent(html, 'description'),
    canonical: extractCanonical(html),
    bodyClass: extractBodyClass(html) || 'scrollable-page inv-page inv-fund-profile',
    mainHtml: stripDocumentChrome(html)
  };
}

function listPersonSlugs() {
  return getAllPeople()
    .map((p) => p && p.slug)
    .filter(Boolean)
    .map((slug) => ({ slug }));
}

function listFundSlugs() {
  return getAllInvestors()
    .map((i) => i && i.slug)
    .filter((slug) => slug && !GUIDE_ROOTS[slug])
    .map((slug) => ({ slug }));
}

module.exports = { loadPersonProfile, loadFundProfile, listPersonSlugs, listFundSlugs };
