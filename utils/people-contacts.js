const fs = require('fs');
const path = require('path');
const { displayEmail } = require('../scripts/lib/person_email');
const { repoRoot } = require('./data-root');

let cache = null;

function loadContactsBySlug() {
  if (cache) return cache;

  // Webpack compiles this file into .next/server/pages/api/*.js, so
  // path.join(__dirname, '_data', ...) looks next to the API route and
  // misses the JSON. require() inlines it into the serverless bundle.
  try {
    cache = require('./_data/people-contacts.bySlug.json');
  } catch (_) {
    cache = null;
  }
  if (cache && typeof cache === 'object' && !Array.isArray(cache)) {
    return cache;
  }

  const candidates = [
    path.join(__dirname, '_data', 'people-contacts.bySlug.json'),
    path.join(repoRoot(), 'utils', '_data', 'people-contacts.bySlug.json'),
    path.join(process.cwd(), 'utils', '_data', 'people-contacts.bySlug.json')
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      cache = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return cache;
    }
  }

  cache = {};
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
  CONTACTS_PATH: path.join(repoRoot(), 'utils', '_data', 'people-contacts.bySlug.json')
};
