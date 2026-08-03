const db = require('./db');
const { fetchRedditPost } = require('./reddit-fetch');

const MAX_BODY_LEN = 50000;

/**
 * Pull full Reddit OP text into body_excerpt when we only have a search snippet.
 * @returns {Promise<string|null>} full body if fetched
 */
async function ensureBuzzFullBody(item) {
  const current = String(item.body_excerpt || '').trim();
  if (current.length >= 800) return current;

  const fetched = await fetchRedditPost(item.source_url);
  if (!fetched?.selftext) return current || null;

  const body = fetched.selftext.slice(0, MAX_BODY_LEN);
  await db.query(
    `UPDATE investor_buzz SET
      body_excerpt = $2,
      comment_count = CASE WHEN $3 > 0 THEN $3 ELSE comment_count END,
      subreddit = COALESCE($4, subreddit),
      title = CASE WHEN length($5) > 0 THEN left($5, 500) ELSE title END
     WHERE id = $1`,
    [
      item.id,
      body,
      fetched.comment_count || 0,
      fetched.subreddit,
      fetched.title || ''
    ]
  );
  return body;
}

module.exports = { ensureBuzzFullBody, MAX_BODY_LEN };
