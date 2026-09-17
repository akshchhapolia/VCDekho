/**
 * Bitscale External API client.
 * Docs: https://docs.bitscale.ai/ingredients/bitscale-api-reference
 *
 * Env:
 *   BITSCALE_API_KEY — workspace API key (Settings → Accounts → API Keys)
 *   BITSCALE_EMAIL_GRID_ID — grid UUID for email waterfall (optional)
 *
 * Note: POST /grids/:id/run requires an Enterprise plan. Growth/Free can still
 * use workspace + grid metadata endpoints; bulk enrichment via UI or CSV export.
 */
const BASE = 'https://api.bitscale.ai/api/v1';

function apiKey() {
  const key = process.env.BITSCALE_API_KEY;
  if (!key) throw new Error('BITSCALE_API_KEY is missing');
  return key;
}

async function request(method, path, body, { retries = 2 } = {}) {
  const url = `${BASE}${path}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey()
      },
      body: body != null ? JSON.stringify(body) : undefined
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (res.status === 429 && attempt < retries) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }

    if (!res.ok) {
      const msg =
        (data && data.error && data.error.message) ||
        (data && data.message) ||
        text.slice(0, 300) ||
        res.statusText;
      const code = (data && data.error && data.error.code) || null;
      const err = new Error(`Bitscale ${method} ${path} → ${res.status}: ${msg}`);
      err.status = res.status;
      err.code = code;
      err.data = data;
      throw err;
    }
    return data;
  }
  throw new Error(`Bitscale ${method} ${path} rate limited`);
}

async function getWorkspace() {
  return request('GET', '/workspace');
}

async function listGrids({ search = '', page = 1, limit = 50 } = {}) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) q.set('search', search);
  return request('GET', `/grids?${q}`);
}

async function getGrid(gridId) {
  return request('GET', `/grids/${gridId}`);
}

async function getGridCurl(gridId, outputColumns) {
  const q = outputColumns?.length
    ? `?output_columns=${outputColumns.map(encodeURIComponent).join(',')}`
    : '';
  return request('GET', `/grids/${gridId}/curl${q}`);
}

/**
 * Run an email enrichment grid. Requires Enterprise + BitScale API source on grid.
 * @param {string} gridId
 * @param {object} inputs — column-key → value (see GET /grids/:id/curl)
 * @param {object} [opts]
 */
async function runGrid(gridId, inputs, opts = {}) {
  const body = {
    mode: opts.mode || 'sync',
    inputs,
    ...(opts.outputColumns ? { output_columns: opts.outputColumns } : {}),
    ...(opts.sourceId ? { source_id: opts.sourceId } : {})
  };
  return request('POST', `/grids/${gridId}/run`, body);
}

async function getRunStatus(requestId) {
  return request('GET', `/run/status/${requestId}`);
}

/** Poll until completed or failed (max ~3 min). */
async function waitForRun(requestId, { intervalMs = 3000, maxAttempts = 60 } = {}) {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getRunStatus(requestId);
    if (status.status === 'completed') return status;
    if (status.status === 'failed' || status.status === 'error') {
      const err = new Error(status.message || 'Bitscale run failed');
      err.data = status;
      throw err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Bitscale run ${requestId} timed out`);
}

function extractEmailFromOutputs(outputs) {
  if (!outputs || typeof outputs !== 'object') return null;
  for (const col of Object.values(outputs)) {
    const name = String(col?.name || '').toLowerCase();
    const val = col?.value;
    if (!val) continue;
    if (name.includes('email') && typeof val === 'string' && val.includes('@')) {
      return val.trim();
    }
  }
  for (const col of Object.values(outputs)) {
    const val = col?.value;
    if (typeof val === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim())) {
      return val.trim();
    }
  }
  return null;
}

module.exports = {
  getWorkspace,
  listGrids,
  getGrid,
  getGridCurl,
  runGrid,
  getRunStatus,
  waitForRun,
  extractEmailFromOutputs
};
