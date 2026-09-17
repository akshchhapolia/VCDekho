/** Controlled topic taxonomy for Founder Buzz chips and filters. */
const BUZZ_TOPICS = [
  'Due Diligence',
  'Decision Speed',
  'Term Sheet',
  'Valuation',
  'Partner Access',
  'Follow-on Funding',
  'Portfolio Support',
  'Interview Experience',
  'Rejection',
  'Sector Fit',
  'Angel vs VC',
  'Fundraising Process',
  'SAFE / Note Terms',
  'Founder Experience',
  'General Discussion'
];

const BUZZ_TOPIC_SET = new Set(BUZZ_TOPICS);

function normalizeTopics(topics) {
  if (!Array.isArray(topics)) return [];
  return topics
    .map((t) => String(t || '').trim())
    .filter((t) => BUZZ_TOPIC_SET.has(t))
    .slice(0, 5);
}

module.exports = { BUZZ_TOPICS, BUZZ_TOPIC_SET, normalizeTopics };
