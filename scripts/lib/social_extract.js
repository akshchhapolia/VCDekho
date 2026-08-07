/**
 * Extract LinkedIn / Twitter URLs from fetched HTML when they appear near
 * a person's name. Grounded only — never invents profiles.
 */
const { htmlToText } = require('./site_crawl');

const LINKEDIN_RE =
  /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([A-Za-z0-9_%\-À-ÿ.]+)\/?/gi;
const TWITTER_RE =
  /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/(@?[A-Za-z0-9_]{1,15})\/?/gi;

const TWITTER_RESERVED = new Set([
  'home',
  'i',
  'share',
  'intent',
  'search',
  'hashtag',
  'explore',
  'notifications',
  'messages',
  'login',
  'signup',
  'compose',
  'settings'
]);

function normalizeNameParts(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z\s.'-]/g, ' ')
    .split(/\s+/)
    .filter((p) => p.length > 1);
}

/** True if window text looks like it refers to this person. */
function nameAppearsIn(text, name) {
  const parts = normalizeNameParts(name);
  if (!parts.length) return false;
  const hay = String(text || '').toLowerCase();
  if (parts.length === 1) return hay.includes(parts[0]);
  // Prefer full-name match; fall back to first+last if 3+ tokens.
  const full = parts.join(' ');
  if (hay.includes(full)) return true;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return hay.includes(first) && hay.includes(last);
}

function normalizeLinkedIn(urlOrPath) {
  const s = String(urlOrPath || '').trim();
  if (!s) return '';
  const m = s.match(/linkedin\.com\/in\/([A-Za-z0-9_%\-À-ÿ.]+)/i);
  if (!m) return '';
  const slug = decodeURIComponent(m[1]).replace(/\/+$/, '');
  if (!slug || /^(pub|dir|company)$/i.test(slug)) return '';
  return `https://www.linkedin.com/in/${slug}`;
}

/** Require LinkedIn slug to share first or last name token with the person. */
function linkedinSlugMatchesName(linkedinUrl, name) {
  const m = String(linkedinUrl || '').match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (!m) return false;
  const slug = decodeURIComponent(m[1])
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ');
  const parts = normalizeNameParts(name);
  if (!parts.length) return false;
  const last = parts[parts.length - 1];
  const first = parts[0];
  // Last name is the strongest signal; allow first-only for single-token names.
  if (parts.length === 1) return slug.includes(first) || first.includes(slug.replace(/\s/g, ''));
  if (slug.includes(last) || last.length >= 4 && slug.replace(/\s/g, '').includes(last)) return true;
  // Compound / initial-heavy slugs: require first AND a meaningful chunk of last
  if (slug.includes(first) && last.length >= 4 && slug.includes(last.slice(0, 4))) return true;
  return false;
}

function normalizeTwitter(urlOrHandle) {
  const s = String(urlOrHandle || '').trim();
  if (!s) return '';
  let handle = '';
  const m = s.match(/(?:twitter|x)\.com\/(@?[A-Za-z0-9_]+)/i);
  if (m) handle = m[1];
  else if (/^@?[A-Za-z0-9_]{1,15}$/.test(s)) handle = s;
  handle = handle.replace(/^@/, '');
  if (!handle || TWITTER_RESERVED.has(handle.toLowerCase())) return '';
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return '';
  return `https://x.com/${handle}`;
}

function twitterHandleMatchesName(twitterUrl, name) {
  const m = String(twitterUrl || '').match(/x\.com\/([^/?#]+)/i);
  if (!m) return false;
  const handle = m[1].toLowerCase();
  const parts = normalizeNameParts(name).filter((p) => p.length > 2);
  if (!parts.length) return false;
  return parts.some((p) => handle.includes(p.slice(0, Math.min(5, p.length))) || p.includes(handle));
}

/**
 * Pull social hrefs from HTML (and bare URLs in text) that sit near the person name.
 * Window: ~900 chars of HTML around each match, converted to text for name check.
 */
function extractSocialsNearName(html, name) {
  const raw = String(html || '');
  if (!raw || !name) return { linkedinUrl: '', twitterUrl: '', evidence: [] };

  const evidence = [];
  let linkedinUrl = '';
  let twitterUrl = '';

  const hrefRe = /href=["']([^"']+)["']/gi;
  let m;
  while ((m = hrefRe.exec(raw))) {
    const href = m[1];
    const idx = m.index;
    const windowHtml = raw.slice(Math.max(0, idx - 900), Math.min(raw.length, idx + 500));
    const windowText = htmlToText(windowHtml);
    if (!nameAppearsIn(windowText, name)) continue;

    const li = normalizeLinkedIn(href);
    if (li && !linkedinUrl && linkedinSlugMatchesName(li, name)) {
      linkedinUrl = li;
      evidence.push({ type: 'linkedin', url: li, via: 'href' });
    }
    const tw = normalizeTwitter(href);
    if (tw && !twitterUrl && twitterHandleMatchesName(tw, name)) {
      twitterUrl = tw;
      evidence.push({ type: 'twitter', url: tw, via: 'href' });
    }
  }

  // Also scan plain text URLs (some pages put links only in JSON-LD / text).
  const text = htmlToText(raw);
  if (!linkedinUrl) {
    LINKEDIN_RE.lastIndex = 0;
    let lm;
    while ((lm = LINKEDIN_RE.exec(text))) {
      const start = Math.max(0, lm.index - 120);
      const chunk = text.slice(start, lm.index + lm[0].length + 80);
      if (!nameAppearsIn(chunk, name)) continue;
      const li = normalizeLinkedIn(lm[0]);
      if (li && linkedinSlugMatchesName(li, name)) {
        linkedinUrl = li;
        evidence.push({ type: 'linkedin', url: li, via: 'text' });
        break;
      }
    }
  }
  if (!twitterUrl) {
    TWITTER_RE.lastIndex = 0;
    let tm;
    while ((tm = TWITTER_RE.exec(text))) {
      const start = Math.max(0, tm.index - 120);
      const chunk = text.slice(start, tm.index + tm[0].length + 80);
      if (!nameAppearsIn(chunk, name)) continue;
      const tw = normalizeTwitter(tm[0]);
      if (tw && twitterHandleMatchesName(tw, name)) {
        twitterUrl = tw;
        evidence.push({ type: 'twitter', url: tw, via: 'text' });
        break;
      }
    }
  }

  return { linkedinUrl, twitterUrl, evidence };
}

function personKey(name, company) {
  return `${String(name || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .trim()}||${String(company || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')}`;
}

module.exports = {
  extractSocialsNearName,
  normalizeLinkedIn,
  normalizeTwitter,
  linkedinSlugMatchesName,
  twitterHandleMatchesName,
  nameAppearsIn,
  personKey
};
