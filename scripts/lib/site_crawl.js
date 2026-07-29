/**
 * Best-effort crawler: given an org's website, try to find and fetch its
 * team/about/people page so we have real, grounded text to extract names from.
 */
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const TEAM_KEYWORDS = ['team', 'people', 'about', 'partners', 'founders', 'who-we-are', 'leadership', 'our-team', 'management'];
const GUESSED_PATHS = [
  '/team', '/team/', '/about-us', '/about-us/', '/about', '/about/', '/people', '/people/',
  '/our-team', '/our-team/', '/partners', '/partners/', '/founders', '/founders/',
  '/who-we-are', '/who-we-are/', '/leadership', '/leadership/', '/management', '/management/'
];

function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTeamLinks(html, baseUrl) {
  const links = new Set();
  const re = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const href = m[1];
    const anchorText = htmlToText(m[2]).toLowerCase();
    const hrefLower = href.toLowerCase();
    const isTeamLike = TEAM_KEYWORDS.some((kw) => hrefLower.includes(kw) || anchorText === kw || anchorText.includes(kw));
    if (!isTeamLike) continue;
    try {
      const abs = new URL(href, baseUrl).toString();
      const u = new URL(abs);
      if (u.hostname !== new URL(baseUrl).hostname) continue; // stay on-site
      links.add(abs);
    } catch {
      /* ignore malformed */
    }
  }
  return [...links];
}

async function fetchOne(url, timeoutMs = 9000) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (res.status >= 400) return { ok: false, status: res.status };
    const html = await res.text();
    return { ok: true, status: res.status, html, finalUrl: res.url || url };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function normalizeBase(website) {
  let s = String(website || '').trim();
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    return new URL(s).toString();
  } catch {
    return '';
  }
}

/**
 * Crawl a website for team/about content.
 * Returns { ok, homepageUrl, teamUrl, text, sourceUrl, attempted } — `text` is the
 * best available page text (team page preferred over homepage), always real
 * fetched content (never invented).
 */
async function crawlForTeamPage(website) {
  const base = normalizeBase(website);
  if (!base) return { ok: false, reason: 'no-website' };

  const attempted = [];
  const home = await fetchOne(base);
  attempted.push(base);
  if (!home.ok) return { ok: false, reason: 'homepage-fetch-failed', error: home.error || home.status, attempted };

  const homeUrl = home.finalUrl || base;
  const homeText = htmlToText(home.html);

  const linkCandidates = extractTeamLinks(home.html, homeUrl);
  const guessCandidates = GUESSED_PATHS.map((p) => {
    try {
      return new URL(p, homeUrl).toString();
    } catch {
      return null;
    }
  }).filter(Boolean);

  const candidates = [...new Set([...linkCandidates, ...guessCandidates])].filter((u) => u !== homeUrl);

  let best = null;
  for (const url of candidates.slice(0, 8)) {
    if (attempted.includes(url)) continue;
    attempted.push(url);
    const res = await fetchOne(url, 7000);
    if (!res.ok) continue;
    const text = htmlToText(res.html);
    if (text.length < 200) continue; // too thin to be a real team page
    if (!best || text.length > best.text.length) {
      best = { url: res.finalUrl || url, text };
    }
    // Good enough signal found via an explicit team-labeled link — stop early to save requests.
    if (linkCandidates.includes(url) && text.length > 500) break;
  }

  if (best) {
    return { ok: true, homepageUrl: homeUrl, teamUrl: best.url, text: best.text.slice(0, 8000), sourceUrl: best.url, attempted };
  }

  // Fall back to homepage text if nothing better was found (some small sites list team on the homepage).
  if (homeText.length > 200) {
    return { ok: true, homepageUrl: homeUrl, teamUrl: null, text: homeText.slice(0, 8000), sourceUrl: homeUrl, attempted };
  }

  return { ok: false, reason: 'no-usable-text', attempted };
}

module.exports = { crawlForTeamPage, htmlToText, extractTeamLinks };
