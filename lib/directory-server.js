const { filterPeople, getFilters, toCard } = require('../utils/people');
const { renderPeopleRows } = require('../utils/render-people-rows');
const {
  filterInvestors,
  getFilters: getFundFilters,
  toCard: toFundCard
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

module.exports = {
  PAGE_SIZE,
  getPeopleListPayload,
  getFundsListPayload,
  assertNoEmails
};
