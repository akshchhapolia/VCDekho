/**
 * Shared logic for mining the existing news pipeline (Postgres `articles` +
 * `raw_content.extracted_facts`) for investor "checks" (funding mentions),
 * and fuzzy-matching mention names to known investors.
 *
 * Used by:
 *  - scripts/build_investor_activity.js (manual/local dry-run + apply)
 *  - api/cron/investor-activity.js (automated, writes to the DB)
 */
const db = require('./db');
const { mergeChecks, RECENT_ACTIVITY_LIMIT } = require('./investor-activity-store');

// Words that add no matching signal — stripped before comparing fund names.
const FILLER_WORDS = new Set([
  'ventures', 'venture', 'capital', 'partners', 'partner', 'fund', 'funds', 'vc',
  'investment', 'investments', 'investor', 'investors', 'associates', 'group',
  'holdings', 'llp', 'pvt', 'ltd', 'limited', 'inc', 'co', 'company', 'network',
  'networks', 'syndicate', 'angels', 'angel', 'ecosystem', 'accelerator', 'studio',
  'the', 'and', 'india'
]);

function coreTokens(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[()/]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    // Drop single-letter tokens (initials) — "J & A Partners" vs "J.A. Chowdary"
    // would otherwise "share" two tokens ("j", "a") that carry no real signal.
    .filter((t) => t.length >= 2)
    .filter((t) => !FILLER_WORDS.has(t));
}

/**
 * Returns a match descriptor, or null if the names don't correspond with high
 * enough confidence. Two ways to match, both deliberately conservative:
 *
 *  - "exact": token sets are identical after filler-stripping (e.g.
 *    "Norwest Capital" / "Norwest Venture Partners" both reduce to
 *    {norwest}). Single shared distinctive words are fine here because
 *    there's nothing left over on either side to disagree about.
 *
 *  - "multi": the smaller token set is fully contained in the larger one AND
 *    at least 2 distinct tokens are shared. This is what catches
 *    "Peak XV Partners" -> "Sequoia (India) / Peak XV" without also letting
 *    a single common word (e.g. "Bharat", "Amazon", "Tata", "Cloud") pull in
 *    an unrelated fund that just happens to share that one word.
 *
 * A lone shared token where the two sets otherwise differ (one side has
 * extra words the other doesn't) is rejected — that's exactly the shape of
 * the false positives seen in testing (e.g. "Google Cloud" vs. "Cloud
 * Capital", "Bharat Value Fund" vs. "Bharat Angels Fund").
 */
function matchScore(mentionName, investorTokens) {
  const mentionTokens = coreTokens(mentionName);
  if (!mentionTokens.length || !investorTokens.length) return null;

  const mentionSet = new Set(mentionTokens);
  const investorSet = new Set(investorTokens);

  const isIdentical =
    mentionSet.size === investorSet.size && [...mentionSet].every((t) => investorSet.has(t));
  if (isIdentical) {
    if ([...mentionSet].some((t) => t.length >= 3)) return { kind: 'exact', shared: mentionSet.size };
    return null;
  }

  const [smallSet, largeSet] = mentionSet.size <= investorSet.size
    ? [mentionSet, investorSet]
    : [investorSet, mentionSet];
  const fullyContained = [...smallSet].every((t) => largeSet.has(t));
  if (fullyContained && smallSet.size >= 2) {
    return { kind: 'multi', shared: smallSet.size };
  }

  return null;
}

function buildInvestorIndex(investors) {
  return investors.map((inv) => ({
    slug: inv.slug,
    name: inv.name,
    tokens: coreTokens(inv.name)
  }));
}

function findBestMatch(mentionName, index) {
  const matches = [];
  for (const inv of index) {
    const score = matchScore(mentionName, inv.tokens);
    if (score) matches.push({ inv, score });
  }
  if (!matches.length) return null;
  // If more than one investor matches the same mention, it's too ambiguous to trust — skip.
  if (matches.length > 1) return null;
  return matches[0];
}

// `articles.category` is hardcoded to 'funding-round' at write time (see
// api/cron/ai-process.js), so it can't be trusted as a real classifier —
// fall back to a title keyword check so a fund merely *mentioned* in a
// non-funding story (an exit, an acquisition, a corporate earnings piece)
// doesn't get counted as a fresh check.
const FUNDING_TITLE_RE =
  /\b(raise[sd]?|round|funding|invest(s|ed|ment)?|back(s|ed)?|led by|co-led|closes?|corpus|seed|series\s*[a-e]|pre[-\s]?seed|pre[-\s]?series|crore|lakh|million|billion|\$|₹|valuation)\b/i;

async function collectMentions(index) {
  const mentions = [];
  const unmatchedCounts = new Map();

  function record(rawName, date, highlight, sourceType, sourceUrl, sourceTitle, sector) {
    const name = String(rawName || '').trim();
    if (!name || name.length < 3) return;
    const best = findBestMatch(name, index);
    if (!best) {
      const key = name.toLowerCase();
      unmatchedCounts.set(key, unmatchedCounts.get(key) || { name, count: 0 });
      unmatchedCounts.get(key).count += 1;
      return;
    }
    mentions.push({
      investorSlug: best.inv.slug,
      investorName: best.inv.name,
      matchedMentionName: name,
      date,
      highlight: highlight || null,
      sector: sector || null,
      sourceType,
      sourceUrl: sourceUrl || null,
      sourceTitle: sourceTitle || null
    });
  }

  // Source 1: published articles — LLM-extracted "internal_link_entities".
  const articles = await db.query(
    `SELECT slug, title, internal_link_entities, published_at, category
     FROM articles
     WHERE status = 'published' AND internal_link_entities IS NOT NULL AND array_length(internal_link_entities, 1) > 0`
  );
  for (const row of articles.rows) {
    if (!FUNDING_TITLE_RE.test(row.title || '')) continue;
    for (const entity of row.internal_link_entities) {
      record(
        entity,
        row.published_at,
        row.title,
        'article',
        row.slug ? `/news/${row.slug}` : null,
        row.title,
        null // `category` is a hardcoded stub on this table, not real sector data
      );
    }
  }

  // Source 2: raw_content.extracted_facts — lead_investors / other_investors.
  // Restrict to news_category = 'Funding': other categories (Milestone,
  // Product Launch, Acquisition...) often name a company's *existing*
  // investors in passing (e.g. a profitability update), which is not a
  // "check" and would make a fund look active when it isn't.
  const facts = await db.query(
    `SELECT id, title, source_url, source_name, published_at_source, scraped_at, extracted_facts
     FROM raw_content
     WHERE extracted_facts IS NOT NULL AND extracted_facts->>'news_category' = 'Funding'`
  );
  for (const row of facts.rows) {
    const f = row.extracted_facts || {};
    const date = row.published_at_source || row.scraped_at;
    const names = [...(f.lead_investors || []), ...(f.other_investors || [])];
    for (const n of names) {
      record(n, date, f.key_highlight || row.title, 'raw_content', row.source_url, row.title, f.industry);
    }
  }

  return { mentions, unmatchedCounts };
}

function aggregateMentions(mentions, windowDays) {
  const now = Date.now();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const bySlug = new Map();

  for (const m of mentions) {
    if (!bySlug.has(m.investorSlug)) bySlug.set(m.investorSlug, []);
    bySlug.get(m.investorSlug).push(m);
  }

  const activity = {};
  for (const [slug, list] of bySlug) {
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentChecks = mergeChecks(
      [],
      list.map((m) => ({
        date: m.date,
        highlight: m.highlight,
        sector: m.sector,
        sourceType: m.sourceType,
        source: m.sourceUrl,
        sourceTitle: m.sourceTitle
      }))
    );
    const recentCheckCount = list.filter((m) => now - new Date(m.date).getTime() <= windowMs).length;
    const top = recentChecks[0] || list[0];
    activity[slug] = {
      lastCheckDate: top.date,
      lastCheckSector: top.sector,
      lastCheckHighlight: top.highlight,
      lastCheckSource: top.source,
      lastCheckSourceTitle: top.sourceTitle,
      recentCheckCount,
      totalMentions: list.length,
      recentChecks
    };
  }
  return activity;
}

module.exports = {
  FILLER_WORDS,
  coreTokens,
  matchScore,
  buildInvestorIndex,
  findBestMatch,
  collectMentions,
  aggregateMentions
};
