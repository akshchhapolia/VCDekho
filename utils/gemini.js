/**
 * Thin Gemini generateContent client for structured JSON extraction.
 * Replaces Anthropic Haiku in investor-activity / portfolio websearch —
 * ~10x cheaper (Flash-Lite) for the same snippet→JSON job.
 *
 * Env: GEMINI_API_KEY
 * Model override: GEMINI_MODEL (default gemini-2.5-flash-lite, falls back
 * to gemini-flash-latest if the preferred model isn't available).
 */
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
// flash-lite avoids the "thinking" truncation we saw on gemini-flash-latest
// (answers like "YES|$7M|" cut mid-line).
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
/** Long-form news/blog HTML (override with GEMINI_NEWS_MODEL). */
const PROSE_MODEL = process.env.GEMINI_NEWS_MODEL || 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Operator cost estimates only ($ per million tokens).
const PRICING = {
  'gemini-2.5-flash-lite': { input: 0.1, output: 0.4 },
  'gemini-flash-latest': { input: 0.3, output: 2.5 },
  'gemini-2.5-flash': { input: 0.3, output: 2.5 }
};

function estimateCostUsd(model, usage) {
  const rates = PRICING[model] || PRICING['gemini-2.5-flash-lite'];
  if (!usage) return 0;
  return (
    ((usage.inputTokens || 0) / 1e6) * rates.input +
    ((usage.outputTokens || 0) / 1e6) * rates.output
  );
}

function stripCodeFences(text) {
  return String(text || '')
    .replace(/^```(?:html|json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

/** Pull the first JSON object/array from a Gemini response. */
function parseJsonResponse(text) {
  let t = stripCodeFences(text);
  const startObj = t.indexOf('{');
  const startArr = t.indexOf('[');
  let start = -1;
  if (startObj === -1) start = startArr;
  else if (startArr === -1) start = startObj;
  else start = Math.min(startObj, startArr);
  const endObj = t.lastIndexOf('}');
  const endArr = t.lastIndexOf(']');
  const end = Math.max(endObj, endArr);
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(t.slice(start, end + 1));
  } catch (_) {
    return null;
  }
}

function isFatalGeminiError(err) {
  if (!err) return false;
  const msg = err.message || '';
  return (
    err.status === 401 ||
    err.status === 403 ||
    /prepayment credits are depleted|RESOURCE_EXHAUSTED|API_KEY_INVALID|PERMISSION_DENIED|billing/i.test(
      msg
    )
  );
}

/**
 * @param {object} opts
 * @param {string} opts.system
 * @param {string} opts.user
 * @param {number} [opts.maxOutputTokens]
 * @param {string} [opts.model]
 * @returns {Promise<{ text: string, usage: { inputTokens: number, outputTokens: number, costUsd: number }, model: string }>}
 */
async function generateText({
  system,
  user,
  maxOutputTokens = 1200,
  model = DEFAULT_MODEL,
  jsonMode = true
}) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set.');

  async function call(modelName) {
    const generationConfig = {
      temperature: 0.1,
      maxOutputTokens
    };
    // jsonMode helps most extractors, but some flash builds truncate mid-object
    // when the schema is wide — callers can turn it off for longer payloads.
    if (jsonMode) generationConfig.responseMimeType = 'application/json';

    const res = await fetch(ENDPOINT(modelName), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig
      })
    });

    const bodyText = await res.text();
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (_) {
      data = null;
    }

    if (!res.ok) {
      const msg =
        (data && data.error && data.error.message) || bodyText.slice(0, 300) || res.statusText;
      const err = new Error(`Gemini ${modelName} failed (${res.status}): ${msg}`);
      err.status = res.status;
      err.code = data && data.error && data.error.status;
      // Model not found → try fallback once.
      if (res.status === 404 && modelName !== FALLBACK_MODEL) {
        err.retryWithFallback = true;
      }
      throw err;
    }

    const text = (((data || {}).candidates || [])[0] || {}).content?.parts
      ?.map((p) => p.text || '')
      .join('') || '';

    const meta = (data && data.usageMetadata) || {};
    const usage = {
      inputTokens: meta.promptTokenCount || 0,
      outputTokens: meta.candidatesTokenCount || meta.totalTokenCount || 0,
      costUsd: 0
    };
    usage.costUsd = estimateCostUsd(modelName, usage);
    return { text, usage, model: modelName };
  }

  try {
    return await call(model);
  } catch (err) {
    if (err.retryWithFallback) {
      return await call(FALLBACK_MODEL);
    }
    throw err;
  }
}

module.exports = {
  generateText,
  estimateCostUsd,
  isFatalGeminiError,
  stripCodeFences,
  parseJsonResponse,
  DEFAULT_MODEL,
  PROSE_MODEL,
  FALLBACK_MODEL
};
