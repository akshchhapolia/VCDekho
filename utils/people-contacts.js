const fs = require('fs');
const path = require('path');
const { displayEmail } = require('../scripts/lib/person_email');

const CONTACTS_PATH = path.join(__dirname, '_data', 'people-contacts.bySlug.json');

let cache = null;

function loadContactsBySlug() {
  if (cache) return cache;
  if (!fs.existsSync(CONTACTS_PATH)) {
    cache = {};
    return cache;
  }
  cache = JSON.parse(fs.readFileSync(CONTACTS_PATH, 'utf8'));
  return cache;
}

/** Server-only lookup — never expose this file as a static asset. */
function getPersonContact(slug) {
  const row = loadContactsBySlug()[slug];
  if (!row) return null;
  const email = displayEmail(row);
  if (!email) return null;
  return {
    email,
    professionalEmail: row.professionalEmail || '',
    personalEmail: row.personalEmail || ''
  };
}

module.exports = {
  getPersonContact,
  loadContactsBySlug,
  CONTACTS_PATH
};
