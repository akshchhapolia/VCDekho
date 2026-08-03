const db = require('./db');

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch (_) {
      return {};
    }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw || '{}');
  } catch (_) {
    return {};
  }
}

async function recordBuzzVote(slug, voterKey, vote) {
  const cleanSlug = String(slug || '').trim();
  const cleanVoter = String(voterKey || '').trim().slice(0, 64);
  const v = Number(vote);

  if (!cleanSlug || !cleanVoter) {
    throw new Error('slug and voterKey required');
  }
  if (![1, -1, 0].includes(v)) {
    throw new Error('vote must be 1, -1, or 0');
  }

  const { rows } = await db.query(
    `SELECT id FROM investor_buzz WHERE slug = $1 AND status = 'published' LIMIT 1`,
    [cleanSlug]
  );
  const buzz = rows[0];
  if (!buzz) throw new Error('Discussion not found');

  if (v === 0) {
    await db.query(`DELETE FROM investor_buzz_votes WHERE buzz_id = $1 AND voter_key = $2`, [
      buzz.id,
      cleanVoter
    ]);
  } else {
    await db.query(
      `INSERT INTO investor_buzz_votes (buzz_id, voter_key, vote)
       VALUES ($1, $2, $3)
       ON CONFLICT (buzz_id, voter_key)
       DO UPDATE SET vote = EXCLUDED.vote, updated_at = NOW()`,
      [buzz.id, cleanVoter, v]
    );
  }

  const counts = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE vote = 1)::int AS interest_up,
       COUNT(*) FILTER (WHERE vote = -1)::int AS interest_down
     FROM investor_buzz_votes WHERE buzz_id = $1`,
    [buzz.id]
  );

  await db.query(
    `UPDATE investor_buzz SET interest_up = $2, interest_down = $3 WHERE id = $1`,
    [buzz.id, counts.rows[0].interest_up, counts.rows[0].interest_down]
  );

  const user = await db.query(
    `SELECT vote FROM investor_buzz_votes WHERE buzz_id = $1 AND voter_key = $2`,
    [buzz.id, cleanVoter]
  );

  return {
    interest_up: counts.rows[0].interest_up,
    interest_down: counts.rows[0].interest_down,
    user_vote: user.rows[0] ? user.rows[0].vote : 0
  };
}

module.exports = { readJsonBody, recordBuzzVote };
