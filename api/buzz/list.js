const db = require('../../utils/db');

module.exports = async function handler(req, res) {
  const { investor, topic, limit: limitRaw } = req.query;
  const limit = Math.min(parseInt(limitRaw, 10) || 40, 60);

  if (!process.env.DATABASE_URL) {
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=3600');
    return res.status(200).json([]);
  }

  let query = `
    SELECT id, slug, source, subreddit, title, ai_summary, topics, sentiment,
           founder_quotes, investor_slugs, investor_names, comment_count,
           upvote_score, source_url, published_at, published_at_source
    FROM investor_buzz
    WHERE status = 'published'
  `;
  const params = [];

  if (investor) {
    params.push(investor);
    query += ` AND $${params.length} = ANY(investor_slugs)`;
  }
  if (topic) {
    params.push(topic);
    query += ` AND $${params.length} = ANY(topics)`;
  }

  params.push(limit);
  query += ` ORDER BY published_at DESC NULLS LAST LIMIT $${params.length}`;

  try {
    const { rows } = await db.query(query, params);
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=3600');
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
