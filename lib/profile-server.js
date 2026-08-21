const { getPersonBySlug, getPeopleByCompanySlug, toCard } = require('../utils/people');
const {
  getInvestorBySlug,
  ensureInvestorDetailExtras,
  filterInvestors,
  toCard: toFundCard
} = require('../utils/investors');
const { renderPersonPage } = require('../utils/render-person-page');
const { renderInvestorPage } = require('../utils/render-investor-page');
const { isMobileRequest } = require('../utils/profile-page-assets');
const {
  stripDocumentChrome,
  captureRenderHtml,
  extractTitle,
  extractMetaContent,
  extractCanonical,
  extractBodyClass
} = require('./html-page');

const GUIDE_ROOTS = { stages: true, themes: true, sectors: true };

function headerBagFromNext(headerList) {
  const get = (name) => {
    if (!headerList) return '';
    if (typeof headerList.get === 'function') return headerList.get(name) || '';
    return headerList[name] || headerList[name.toLowerCase()] || '';
  };
  return {
    headers: {
      'user-agent': get('user-agent'),
      'sec-ch-ua-mobile': get('sec-ch-ua-mobile')
    }
  };
}

async function loadPersonProfile(slug, headerList) {
  const person = getPersonBySlug(slug);
  if (!person) {
    const fund = getInvestorBySlug(slug);
    if (fund) return { redirectTo: '/funds/' + encodeURIComponent(slug) };
    return null;
  }
  if (person.companySlug) await ensureInvestorDetailExtras(person.companySlug);
  const colleagues = getPeopleByCompanySlug(person.companySlug, person.slug).map(toCard);
  const investor = person.companySlug ? getInvestorBySlug(person.companySlug) : null;
  const html = captureRenderHtml((res) =>
    renderPersonPage(person, colleagues, investor, res, {
      mwebFirstPaint: isMobileRequest(headerBagFromNext(headerList))
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

async function loadFundProfile(slug, headerList) {
  if (GUIDE_ROOTS[slug]) return { reserved: true };
  await ensureInvestorDetailExtras(slug);
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
      mwebFirstPaint: isMobileRequest(headerBagFromNext(headerList))
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

module.exports = { loadPersonProfile, loadFundProfile };
