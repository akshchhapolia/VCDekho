/**
 * Article publish dates — align titles, slugs, and published_at (IST news day).
 */
const IST = 'Asia/Kolkata';

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

/** Best-effort original news timestamp from a raw_content row. */
function rawContentDate(item) {
  const d = item?.published_at_source || item?.scraped_at;
  return d ? new Date(d) : new Date();
}

/** YYYY-MM-DD in IST. */
function istCalendarDay(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(new Date(date));
}

/** e.g. "31 Jul" for digest titles. */
function formatDigestLabel(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    timeZone: IST,
    month: 'short',
    day: 'numeric'
  });
}

/** Digest goes live ~18:00 IST on the news day (= 12:30 UTC). */
function digestPublishedAtFromDay(dayStr) {
  return new Date(`${dayStr}T12:30:00.000Z`);
}

/** Parse "Startup & Tech Daily Digest: 31 Jul" → YYYY-MM-DD (IST news day). */
function parseDigestDayFromTitle(title, year = new Date().getFullYear()) {
  const m = String(title || '').match(/Daily Digest:\s*(\d{1,2})\s+([A-Za-z]{3})/i);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (month == null) return null;
  const day = parseInt(m[1], 10);
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** Group raw_content rows by IST news day. */
function groupItemsByNewsDay(items) {
  const map = new Map();
  for (const item of items) {
    const day = istCalendarDay(rawContentDate(item));
    if (!map.has(day)) map.set(day, []);
    map.get(day).push(item);
  }
  return map;
}

/** published_at for a funding-round / news article. */
function articlePublishedAt(item) {
  return rawContentDate(item);
}

module.exports = {
  IST,
  rawContentDate,
  istCalendarDay,
  formatDigestLabel,
  digestPublishedAtFromDay,
  parseDigestDayFromTitle,
  groupItemsByNewsDay,
  articlePublishedAt
};
