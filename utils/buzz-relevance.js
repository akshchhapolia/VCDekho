/**
 * Relevance rules for Founder Buzz — founder VC reviews/experiences only.
 * Rejects fundraising asks, hiring, co-founder requests, etc.
 */

const HARD_REJECT_RE =
  /\b(looking for|seeking|need|want|searching for)\s+(an?\s+)?(angel|investor|vc|venture|funding|co[- ]?founder|business partner|collaborator|mentor)\b|\b(hiring|job opening|we are hiring|open role|resume|cv)\b|\bidea validation\b|\bcollaboration opportunity\b|\bneed some career guidance\b|\bneed a (logo|designer|developer)\b|\bsolo founder\b.*\b(stuck|first customer|customers)\b|\bwho wants to join\b|\bco[- ]?founder wanted\b|\bpm me if interested\b|\bopen to connect\b.*\b(invest|fund)/i;

const EXPERIENCE_SIGNAL_RES = [
  /\bmy experience (with|raising|fundraising|pitching)\b/i,
  /\b(our|my) (fundraising|fundraise) (journey|experience|story|process)\b/i,
  /\b(pitched to|met with|interview(ed)? with|spoke (to|with))\s+(a\s+)?(vc|investor|partner|fund)\b/i,
  /\b(rejected by|ghosted by|passed on|turned down by)\b/i,
  /\b(ghosted|stringing along|intel[- ]gathering)\b.*\b(vc|investor|fund)\b/i,
  /\b(due diligence|term sheet|cap table|valuation|drag along|liquidation preference)\b/i,
  /\b(raised|closed|signed)\s+(our\s+)?(seed|pre-seed|series [a-e]|round)\b/i,
  /\b(vc|investor|partner)s?\s+(said|told|asked|demanded|wanted)\b/i,
  /\b(post[- ]mortem|lessons learned|what i learned|honest (take|review))\b.*\b(fundraising|vc|investor)/i,
  /\b(indian\s+)?vc\s+(scene|ecosystem|culture)\b/i,
  /\b(slams?|criticiz(es|ing)|calling out)\b.*\b(vc|investor|venture)\b/i,
  /\bmonths (to|of) raise\b/i,
  /\binterview experience with\b/i,
  /\b(hated|loved|regret)\b.*\b(interview|diligence|fundraising|vc|investor)\b/i,
  /\bfeedback on (my )?pitch\b/i,
  /\b(bootstrapping|bootstrapped)\s+or\s+vc\b/i,
  /\b(struggled|struggling)\s+to\s+(raise|close)\b/i,
  /\b\d+\s+investors?\s+(rejected|passed|said no)\b/i,
  /\bpartner\s+(call|meeting|round)\b/i,
  /\b(ic|investment committee)\b/i
];

const INDIA_SIGNAL_RE =
  /\b(india|indian|bangalore|bengaluru|mumbai|delhi|hyderabad|chennai|gurgaon|noida|iit|iim)\b/i;

const NAMED_INVESTOR_RE =
  /\b(peak xv|sequoia|blume|matrix|elevation|accel|tiger global|nexus|lightspeed|bessemer|100x\.vc|3one4|stellaris|kalaari|nexus venture|iron pillar|prime venture|chiratae|saama|waterbridge|venture highway|unitus|ankur capital|exfinity|growx|java capital|ah! ventures|ah ventures|antler|wtf fund|nikhil kamath|y combinator|surge|techstars)\b/i;

const ASKING_NOT_REVIEW_RE =
  /\b(should i|any advice|how do i|how to|tips for|what should i|is it worth|am i ready to)\s+(raise|pitch|approach|contact|email)\b/i;

function isHardRejectBuzzPost(title, body) {
  const text = `${title || ''}\n${body || ''}`;
  return HARD_REJECT_RE.test(text);
}

function scoreBuzzExperience(title, body) {
  let score = 0;
  const text = `${title || ''}\n${body || ''}`;

  for (const re of EXPERIENCE_SIGNAL_RES) {
    if (re.test(text)) score += 1;
  }
  if (INDIA_SIGNAL_RE.test(text)) score += 1;
  if (NAMED_INVESTOR_RE.test(text)) score += 2;
  if (ASKING_NOT_REVIEW_RE.test(text) && score < 2) score -= 2;

  return Math.max(0, score);
}

/** Pre-AI gate: queue only likely founder VC experience / review threads. */
function shouldQueueBuzzPost(title, body) {
  if (isHardRejectBuzzPost(title, body)) return { queue: false, score: 0, reason: 'hard_reject' };
  const score = scoreBuzzExperience(title, body);
  if (score >= 2) return { queue: true, score, reason: 'experience_signals' };
  return { queue: false, score, reason: 'weak_signals' };
}

module.exports = {
  isHardRejectBuzzPost,
  scoreBuzzExperience,
  shouldQueueBuzzPost,
  HARD_REJECT_RE,
  EXPERIENCE_SIGNAL_RES
};
