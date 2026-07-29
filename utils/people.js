const fs = require('fs');
const path = require('path');

let cache = null;

function loadPeopleData() {
  if (cache) return cache;
  const filePath = path.join(__dirname, '..', 'data', 'people.json');
  cache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return cache;
}

function getFilters() {
  return loadPeopleData().filters;
}

function getAllPeople() {
  return loadPeopleData().people;
}

function getPersonBySlug(slug) {
  return getAllPeople().find((p) => p.slug === slug) || null;
}

function getPeopleByCompanySlug(companySlug, excludeSlug) {
  if (!companySlug) return [];
  return getAllPeople().filter((p) => p.companySlug === companySlug && p.slug !== excludeSlug);
}

function filterPeople(query = {}) {
  const data = loadPeopleData();
  let list = data.people;

  const q = (query.q || '').trim().toLowerCase();
  const companyType = query.companyType || '';

  if (q) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.title || '').toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q)
    );
  }
  if (companyType) {
    const match = (data.filters.companyTypes || []).find((t) => t.id === companyType);
    if (match) list = list.filter((p) => p.companyType === match.label);
  }

  list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function toCard(person) {
  return {
    slug: person.slug,
    name: person.name,
    title: person.title,
    company: person.company,
    companySlug: person.companySlug,
    companyType: person.companyType,
    companyLogo: person.companyLogo || null,
    photo: person.photo || null,
    email: person.email || '',
    linkedin: person.linkedin || '',
    twitter: person.twitter || ''
  };
}

module.exports = {
  loadPeopleData,
  getFilters,
  getAllPeople,
  getPersonBySlug,
  getPeopleByCompanySlug,
  filterPeople,
  toCard
};
