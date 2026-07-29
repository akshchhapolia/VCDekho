/**
 * Minimal Icypeas API client.
 * Docs: https://api-doc.icypeas.com
 *
 * Auth: single `Authorization` header containing ONLY the raw API key
 * (no "Bearer " prefix — confirmed against the live API).
 */
const BASE = 'https://app.icypeas.com/api';

function apiKey() {
  const key = process.env.ICYPEAS_API_KEY;
  if (!key) throw new Error('ICYPEAS_API_KEY missing from environment');
  return key;
}

async function post(pathname, body, { retries = 3 } = {}) {
  const url = `${BASE}${pathname}`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey()
      },
      body: JSON.stringify(body)
    });

    if (res.status === 429) {
      const wait = 2000 * (attempt + 1);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const err = new Error(`Icypeas ${pathname} → HTTP ${res.status}: ${text.slice(0, 300)}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }
  throw new Error(`Icypeas ${pathname} → rate limited after ${retries} retries`);
}

/**
 * Synchronous single email search. Costs 1 credit ONLY if an email is found
 * (per Icypeas billing: you don't pay for "not found" results).
 */
async function emailSearchSync({ firstname = '', lastname = '', domainOrCompany }) {
  if (!domainOrCompany) throw new Error('domainOrCompany is required');
  if (!firstname && !lastname) throw new Error('firstname or lastname is required');
  return post('/sync/email-search', { firstname, lastname, domainOrCompany });
}

/** Synchronous email verification for an already-known/guessed address. */
async function emailVerificationSync({ email }) {
  if (!email) throw new Error('email is required');
  return post('/sync/email-verification', { email });
}

/** Synchronous domain-wide search (generic mailbox patterns for a company). */
async function domainSearchSync({ domainOrCompany }) {
  if (!domainOrCompany) throw new Error('domainOrCompany is required');
  return post('/sync/domain-search', { domainOrCompany });
}

/** Subscription + remaining credits. `email` must match the account owner's login email. */
async function subscriptionInfo({ email }) {
  if (!email) throw new Error('email is required (Icypeas account owner email)');
  return post('/a/actions/subscription-information', { email });
}

module.exports = {
  emailSearchSync,
  emailVerificationSync,
  domainSearchSync,
  subscriptionInfo
};
