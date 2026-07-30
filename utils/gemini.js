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
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
const FALLBACK_MODEL = 'gemini-flash-latest';
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
async function generateText({ system, user, maxOutputTokens = 1200, model = DEFAULT_MODEL }) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set.');

  async function call(modelName) {
    const res = await fetch(ENDPOINT(modelName), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens,
          // Prefer raw JSON when the model supports it.
          responseMimeType: 'application/json'
        }
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
  DEFAULT_MODEL,
  FALLBACK_MODEL
};
