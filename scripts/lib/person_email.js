/** Shared helpers for person email columns in the Individuals CSV + people.json. */

const COL_PERSONAL = 'Personal Email';
const COL_PROFESSIONAL = 'Professional Email';
const COL_LEGACY = 'Email';

const PERSONAL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
  'me.com',
  'protonmail.com',
  'proton.me',
  'rediffmail.com',
  'aol.com'
]);

function isValidEmail(v) {
  const s = String(v || '').trim();
  return s.includes('@') && !/no email found/i.test(s);
}

function isLikelyPersonal(email) {
  const domain = String(email || '').split('@')[1]?.toLowerCase();
  return Boolean(domain && PERSONAL_DOMAINS.has(domain));
}

function readPersonal(row) {
  return String(row[COL_PERSONAL] || row.personalEmail || '').trim();
}

function readProfessional(row) {
  return String(row[COL_PROFESSIONAL] || row.professionalEmail || row[COL_LEGACY] || '').trim();
}

function displayEmail(row) {
  const professional = readProfessional(row);
  const personal = readPersonal(row);
  if (isValidEmail(professional)) return professional;
  if (isValidEmail(personal)) return personal;
  return '';
}

function hasDisplayEmail(row) {
  return Boolean(displayEmail(row));
}

function normLinkedin(u) {
  return String(u || '').toLowerCase().replace(/\/+$/, '');
}

module.exports = {
  COL_PERSONAL,
  COL_PROFESSIONAL,
  COL_LEGACY,
  isValidEmail,
  isLikelyPersonal,
  readPersonal,
  readProfessional,
  displayEmail,
  hasDisplayEmail,
  normLinkedin
};
