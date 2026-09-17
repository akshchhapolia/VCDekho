/**
 * Helpers to derive a clean {firstname, lastname} for a person when the
 * source sheet only reliably gives us a "First Name" field (sometimes a
 * full name) plus a LinkedIn profile URL slug.
 */

const CREDENTIAL_SUFFIXES = new Set([
  'ca', 'cfa', 'mba', 'phd', 'md', 'jr', 'sr', 'esq', 'llb', 'llm', 'frm', 'cpa', 'cma'
]);

function titleCase(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

function linkedinSlug(url) {
  if (!url) return '';
  try {
    const u = new URL(String(url).trim());
    const m = u.pathname.match(/\/in\/([^/]+)/i);
    if (!m) return '';
    return decodeURIComponent(m[1]).toLowerCase();
  } catch {
    return '';
  }
}

/** Strip trailing numeric IDs / random hash suffixes LinkedIn appends, e.g. "jane-doe-1234abcd". */
function stripSlugNoise(tokens) {
  const out = [...tokens];
  while (out.length > 1) {
    const last = out[out.length - 1];
    const isNumericIdish = /^[0-9]+$/.test(last) || (/[0-9]/.test(last) && /^[a-z0-9]{5,}$/.test(last) && /[a-z]/.test(last) && /[0-9]/.test(last));
    const isCredential = CREDENTIAL_SUFFIXES.has(last);
    if (isNumericIdish || isCredential) out.pop();
    else break;
  }
  return out;
}

/**
 * Derive {firstname, lastname} from a row's raw "First Name" field (which may
 * already contain a full name) and, as a fallback, the LinkedIn slug.
 * Returns lastname: '' when it cannot be determined confidently.
 */
function deriveName(rawFirstName, linkedinUrl) {
  const raw = String(rawFirstName || '').trim().replace(/\s+/g, ' ');
  if (!raw) return { firstname: '', lastname: '', source: 'none' };

  if (raw.includes(' ')) {
    const parts = raw.split(' ');
    return {
      firstname: parts[0],
      lastname: parts.slice(1).join(' '),
      source: 'sheet-full-name'
    };
  }

  const firstname = raw;
  const slug = linkedinSlug(linkedinUrl);
  if (!slug) return { firstname, lastname: '', source: 'first-only' };

  const firstLower = firstname.toLowerCase();

  if (slug.includes('-')) {
    let tokens = stripSlugNoise(slug.split('-').filter(Boolean));
    if (tokens[0] === firstLower) tokens = tokens.slice(1);
    tokens = stripSlugNoise(tokens);
    if (tokens.length) {
      return { firstname, lastname: titleCase(tokens.join(' ')), source: 'linkedin-slug-dashed' };
    }
    return { firstname, lastname: '', source: 'first-only' };
  }

  // No dashes: try "firstnamelastname" concatenation (common LinkedIn pattern).
  if (slug.startsWith(firstLower) && slug.length > firstLower.length) {
    const rest = slug.slice(firstLower.length).replace(/[0-9]+$/, '');
    if (rest.length >= 2) {
      return { firstname, lastname: titleCase(rest), source: 'linkedin-slug-concat' };
    }
  }

  return { firstname, lastname: '', source: 'first-only' };
}

module.exports = { deriveName, linkedinSlug, titleCase };
