const fs = require('fs');
const path = require('path');
const { getInvestorBySlug, getFilters: getInvestorFilters, chequeOverlaps } = require('./investors');

let cache = null;

/** Show on site only when we have LinkedIn or a professional work email. */
function hasLinkedIn(person) {
  return /linkedin\.com/i.test(String(person?.linkedin || '').trim());
}

function isPersonPublic(person) {
  return hasLinkedIn(person) || Boolean(person?.hasProfessionalEmail);
}

const PERSON_ROLES = [
  { id: 'angel', label: 'Angel Investor' },
  { id: 'partner', label: 'Partner / GP' },
  { id: 'principal', label: 'Principal / Director' },
  { id: 'founder-ceo', label: 'Founder / CEO' },
  { id: 'operator', label: 'Operator / Advisor' },
  { id: 'analyst', label: 'Analyst / Associate' }
];

function loadPeopleData() {
  if (cache) return cache;
  const filePath = path.join(__dirname, '..', 'data', 'people.json');
  cache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return cache;
}

function getFilters() {
  const peopleFilters = loadPeopleData().filters || {};
  const invFilters = getInvestorFilters() || {};
  return {
    companyTypes: peopleFilters.companyTypes || [],
    roles: PERSON_ROLES,
    stages: invFilters.stages || [],
    sectors: invFilters.sectors || [],
    thesisThemes: invFilters.thesisThemes || [],
    chequeRanges: invFilters.chequeRanges || []
  };
}

function getAllPeople(opts = {}) {
  const people = loadPeopleData().people;
  if (opts.includeHidden) return people;
  return people.filter(isPersonPublic);
}

function getPersonBySlug(slug) {
  return getAllPeople().find((p) => p.slug === slug) || null;
}

function getPeopleByCompanySlug(companySlug, excludeSlug) {
  if (!companySlug) return [];
  return getAllPeople().filter((p) => p.companySlug === companySlug && p.slug !== excludeSlug);
}

/** Map free-text title → curated role id (or null if unmapped). */
function normalizePersonRole(title) {
  const t = String(title || '')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return null;

  if (/\bangel\b/.test(t)) return 'angel';

  if (/\boperating\s+partner\b/.test(t)) return 'operator';
  if (/\b(managing|general|venture|founding)\s+partner\b/.test(t)) return 'partner';
  if (/\bco[-\s]?founder\b/.test(t) && /\bpartner\b/.test(t)) return 'partner';
  if (/\bpartner\b/.test(t) || /\bgp\b/.test(t) || t === 'partner') return 'partner';

  if (
    /\b(advisor|adviser|board\s+member|board\s+observer|observer)\b/.test(t)
  ) {
    return 'operator';
  }

  if (
    /\b(founder|co[-\s]?founder|ceo|chief\s+executive|president)\b/.test(t)
  ) {
    return 'founder-ceo';
  }

  if (
    /\bprincipal\b/.test(t) ||
    /\bmanaging\s+director\b/.test(t) ||
    /\bdirector\b/.test(t) ||
    /\bvice\s+president\b/.test(t) ||
    /\bvp\b/.test(t) ||
    t === 'investments' ||
    /\binvestments\b/.test(t)
  ) {
    return 'principal';
  }

  if (
    /\b(analyst|associate|investment\s+professional|investment\s+team)\b/.test(t) ||
    t === 'investor' ||
    t === 'venture capitalist'
  ) {
    return 'analyst';
  }

  return null;
}

function firmForPerson(person) {
  if (!person || !person.companySlug) return null;
  return getInvestorBySlug(person.companySlug);
}

function filterPeople(query = {}) {
  const data = loadPeopleData();
  let list = data.people.filter(isPersonPublic);

  const q = (query.q || '').trim().toLowerCase();
  const companyType = query.companyType || '';
  const role = query.role || '';
  const stage = query.stage || '';
  const sector = query.sector || '';
  const thesis = query.thesis || '';
  const cheque = query.cheque || '';
  const needsFirm = Boolean(stage || sector || thesis || cheque);

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
  if (role) {
    list = list.filter((p) => normalizePersonRole(p.title) === role);
  }

  if (needsFirm) {
    const invFilters = getInvestorFilters() || {};
    const chequeRange = cheque
      ? (invFilters.chequeRanges || []).find((r) => r.id === cheque)
      : null;

    list = list.filter((p) => {
      const firm = firmForPerson(p);
      if (!firm) return false;
      if (stage && !(firm.stageIds || []).includes(stage)) return false;
      if (sector && !(firm.sectorIds || []).includes(sector)) return false;
      if (thesis && !(firm.thesisThemeIds || []).includes(thesis)) return false;
      if (cheque) {
        if (!chequeRange || !chequeOverlaps(firm, chequeRange)) return false;
      }
      return true;
    });
  }

  list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function toCard(person, opts = {}) {
  const card = {
    slug: person.slug,
    name: person.name,
    title: person.title,
    company: person.company,
    companySlug: person.companySlug,
    companyType: person.companyType,
    companyLogo: person.companyLogo || null,
    photo: person.photo || null,
    hasEmail: Boolean(person.hasEmail),
    linkedin: person.linkedin || '',
    twitter: person.twitter || ''
  };
  if (opts.email) card.email = opts.email;
  return card;
}

module.exports = {
  loadPeopleData,
  getFilters,
  getAllPeople,
  getPersonBySlug,
  getPeopleByCompanySlug,
  filterPeople,
  toCard,
  normalizePersonRole,
  isPersonPublic,
  hasLinkedIn,
  PERSON_ROLES
};
