/**
 * Grounded extraction: ask Claude to pull named people OUT OF real scraped
 * page text — never from background knowledge — then re-verify each name
 * literally appears in that text before we trust it.
 */

function normForMatch(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z\s]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** True if every "significant" token of `name` appears somewhere in `text`. */
function nameGroundedInText(name, text) {
  const textNorm = normForMatch(text);
  const tokens = normForMatch(name)
    .split(' ')
    .filter((t) => t.length > 1);
  if (!tokens.length) return false;
  return tokens.every((t) => textNorm.includes(t));
}

function buildPrompt(company, text) {
  return `You are extracting factual data from a SCRAPED WEB PAGE. Do not use any outside knowledge about "${company}" — only what appears verbatim in the TEXT below.

TEXT (scraped from ${company}'s website):
"""
${text}
"""

Task: identify up to 2 of the most senior investment professionals at this firm mentioned BY NAME in the text above (prefer Founder / Managing Partner / General Partner / Managing Director; if none of those titles appear, use the most senior title present, e.g. Partner, Principal, Director).

Rules:
- Only include a person if their full name literally appears in the TEXT above.
- Copy the name and title exactly as written in the text (fix only obvious capitalization).
- If the text is just marketing copy / portfolio companies / news and does not name any team member, return [].
- Never invent, guess, or supplement with outside knowledge.
- Max 2 people.

Return ONLY a JSON array, nothing else:
[{"name": "...", "title": "..."}]`;
}

async function extractPeople(anthropic, { company, text, model = 'claude-sonnet-4-6' }) {
  const msg = await anthropic.messages.create({
    model,
    max_tokens: 500,
    system: 'You extract facts strictly from provided text. Output JSON only. Never use outside knowledge. Never invent.',
    messages: [{ role: 'user', content: buildPrompt(company, text) }]
  });
  const raw = msg.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  let data;
  try {
    data = JSON.parse(cleaned);
  } catch {
    return { people: [], raw, parseError: true };
  }
  if (!Array.isArray(data)) return { people: [], raw };

  const verified = [];
  for (const item of data.slice(0, 2)) {
    const name = String(item?.name || '').trim();
    const title = String(item?.title || '').trim();
    if (!name) continue;
    if (!nameGroundedInText(name, text)) continue; // anti-hallucination gate
    verified.push({ name, title });
  }
  return { people: verified, raw };
}

module.exports = { extractPeople, nameGroundedInText };
