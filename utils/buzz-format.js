/** Shared Buzz card helpers (server + client parity). */

function cleanBuzzTitle(title) {
  return String(title || '')
    .replace(/\s*:\s*r\/\w+\s*-\s*Reddit\s*$/i, '')
    .replace(/\s*-\s*Reddit\s*$/i, '')
    .trim();
}

function stripBuzzBody(raw) {
  return String(raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Map to 3 display levels: positive | neutral | negative */
function normalizeSentiment(s) {
  const v = String(s || 'neutral').toLowerCase();
  if (v === 'positive') return 'positive';
  if (v === 'negative') return 'negative';
  return 'neutral';
}

function sentimentLabel(s) {
  const n = normalizeSentiment(s);
  return { positive: 'Positive', neutral: 'Neutral', negative: 'Negative' }[n];
}

module.exports = {
  cleanBuzzTitle,
  stripBuzzBody,
  normalizeSentiment,
  sentimentLabel
};
