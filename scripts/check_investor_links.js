#!/usr/bin/env node
/**
 * Check Website + Company Linkedin URLs in Org.csv.
 *
 * Usage:
 *   node scripts/check_investor_links.js
 *   node scripts/check_investor_links.js --apply   # write safe fixes back to CSV
 *
 * Safe applies:
 *   - prefix https:// when scheme missing
 *   - trim / strip junk
 *   - follow permanent redirects and store final URL (websites)
 *   - clear clearly dead websites (DNS fail, connection error, hard 404/410)
 * LinkedIn: often bot-blocked; only clear on DNS fail / invalid host / obvious junk.
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'Updated VC Dekho Sheet - Org.csv');
const OUT_DIR = path.join(ROOT, 'data', 'candidates');
const REPORT_PATH = path.join(OUT_DIR, 'link-check-report.json');
const APPLY = process.argv.includes('--apply');
const CONCURRENCY = 12;
const TIMEOUT_MS = 12000;
const USER_AGENT =
  'Mozilla/5.0 (compatible; VCDekhoLinkCheck/1.0; +https://vcdekho.com)';

function normalizeUrl(raw, kind) {
  let s = String(raw || '').trim();
  if (!s) return { url: '', reason: 'empty' };
  s = s.replace(/\s+/g, '');
  // common junk
  if (/^(n\/a|na|none|null|-|\.|tba|tbd)$/i.test(s)) {
    return { url: '', reason: 'junk' };
  }
  if (!/^https?:\/\//i.test(s)) {
    if (/^\/\//.test(s)) s = 'https:' + s;
    else if (/^(www\.|linkedin\.com|[\w-]+\.[\w.-]+)/i.test(s)) s = 'https://' + s;
    else return { url: '', reason: 'invalid_scheme' };
  }
  let u;
  try {
    u = new URL(s);
  } catch {
    return { url: '', reason: 'invalid_url' };
  }
  if (!['http:', 'https:'].includes(u.protocol)) {
    return { url: '', reason: 'invalid_protocol' };
  }
  if (kind === 'linkedin') {
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) {
      return { url: '', reason: 'not_linkedin_host' };
    }
    // prefer https www
    u.protocol = 'https:';
    if (u.hostname === 'linkedin.com') u.hostname = 'www.linkedin.com';
  }
  // strip tracking noise lightly
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((k) =>
    u.searchParams.delete(k)
  );
  let out = u.toString();
  if (out.endsWith('/') && u.pathname === '/') out = out.slice(0, -1) + '/';
  return { url: out, reason: 'ok', changed: out !== String(raw || '').trim() };
}

async function probeUrl(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const result = {
    url,
    ok: false,
    status: null,
    finalUrl: url,
    error: null,
    kind: 'unknown'
  };
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' }
    });
    // some hosts reject HEAD or return false 404 on HEAD — retry GET
    if (
      res.status === 405 ||
      res.status === 501 ||
      res.status === 403 ||
      res.status === 404 ||
      res.status === 410
    ) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml'
        }
      });
    }
    result.status = res.status;
    result.finalUrl = res.url || url;
    if (res.status >= 200 && res.status < 400) {
      result.ok = true;
      result.kind = 'ok';
    } else if (res.status === 404 || res.status === 410) {
      result.kind = 'dead';
    } else if (res.status === 401 || res.status === 403 || res.status === 999) {
      // LinkedIn / WAF often blocks bots — treat as uncertain-alive
      result.ok = true;
      result.kind = 'blocked_but_likely_alive';
    } else {
      result.kind = 'http_error';
    }
  } catch (err) {
    const msg = (err && err.message) || String(err);
    result.error = msg;
    if (/abort/i.test(msg)) result.kind = 'timeout';
    else if (/ENOTFOUND|getaddrinfo|DNS/i.test(msg)) result.kind = 'dns_fail';
    else if (/ECONNREFUSED|ECONNRESET|CERT|SSL|TLS/i.test(msg)) result.kind = 'connect_fail';
    else result.kind = 'fetch_error';
  } finally {
    clearTimeout(timer);
  }
  return result;
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function loadCsv() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  return parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

function saveCsv(rows) {
  const columns = Object.keys(rows[0] || {});
  const body = stringify(rows, { header: true, columns });
  fs.writeFileSync(CSV_PATH, body);
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const rows = loadCsv();
  console.log(`Loaded ${rows.length} rows from Org.csv`);

  const jobs = [];
  rows.forEach((row, idx) => {
    const company = row.Company || '';
    const webNorm = normalizeUrl(row.Website, 'website');
    const liNorm = normalizeUrl(row['Company Linkedin'], 'linkedin');
    if (webNorm.url) {
      jobs.push({ idx, company, field: 'Website', raw: row.Website, norm: webNorm });
    } else if ((row.Website || '').trim()) {
      jobs.push({
        idx,
        company,
        field: 'Website',
        raw: row.Website,
        norm: webNorm,
        skipProbe: true
      });
    }
    if (liNorm.url) {
      jobs.push({ idx, company, field: 'Company Linkedin', raw: row['Company Linkedin'], norm: liNorm });
    } else if ((row['Company Linkedin'] || '').trim()) {
      jobs.push({
        idx,
        company,
        field: 'Company Linkedin',
        raw: row['Company Linkedin'],
        norm: liNorm,
        skipProbe: true
      });
    }
  });

  console.log(`Probing ${jobs.filter((j) => !j.skipProbe).length} URLs…`);
  const probed = await mapPool(jobs, CONCURRENCY, async (job) => {
    if (job.skipProbe || !job.norm.url) {
      return {
        ...job,
        probe: {
          ok: false,
          status: null,
          finalUrl: '',
          error: job.norm.reason,
          kind: 'invalid'
        }
      };
    }
    const probe = await probeUrl(job.norm.url);
    process.stdout.write('.');
    return { ...job, probe };
  });
  process.stdout.write('\n');

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      rows: rows.length,
      checked: probed.length,
      websiteOk: 0,
      websiteBad: 0,
      linkedinOk: 0,
      linkedinBad: 0,
      linkedinBlocked: 0,
      applied: 0
    },
    issues: [],
    fixes: []
  };

  const clearWebsiteKinds = new Set(['dns_fail', 'dead', 'invalid']);
  // connect_fail / timeout are softer — report but don't auto-clear unless DNS/invalid

  for (const item of probed) {
    const { field, company, raw, norm, probe: p, idx } = item;
    const isWeb = field === 'Website';
    const entry = {
      company,
      field,
      raw,
      normalized: norm.url,
      status: p.status,
      kind: p.kind,
      finalUrl: p.finalUrl,
      error: p.error
    };

    if (isWeb) {
      if (p.ok) report.totals.websiteOk++;
      else report.totals.websiteBad++;
    } else {
      if (p.kind === 'blocked_but_likely_alive') report.totals.linkedinBlocked++;
      if (p.ok) report.totals.linkedinOk++;
      else report.totals.linkedinBad++;
    }

    let action = null;
    let nextVal = raw;

    if (!norm.url) {
      action = 'clear_invalid';
      nextVal = '';
      report.issues.push({ ...entry, action });
    } else if (isWeb && clearWebsiteKinds.has(p.kind)) {
      action = 'clear_dead';
      nextVal = '';
      report.issues.push({ ...entry, action });
    } else if (isWeb && p.ok && p.finalUrl && p.finalUrl !== norm.url) {
      // only adopt https final if same-ish host or permanent redirect
      try {
        const a = new URL(norm.url);
        const b = new URL(p.finalUrl);
        if (a.hostname.replace(/^www\./, '') === b.hostname.replace(/^www\./, '') || p.status === 200) {
          action = 'update_redirect';
          nextVal = p.finalUrl;
          report.fixes.push({ ...entry, action, nextVal });
        }
      } catch {
        /* ignore */
      }
    } else if (norm.changed && p.ok) {
      action = 'normalize';
      nextVal = norm.url;
      report.fixes.push({ ...entry, action, nextVal });
    } else if (!p.ok) {
      report.issues.push({ ...entry, action: 'review' });
    } else if (norm.changed) {
      action = 'normalize';
      nextVal = norm.url;
      report.fixes.push({ ...entry, action, nextVal });
    }

    // LinkedIn invalid host / junk → clear
    if (!isWeb && (p.kind === 'invalid' || norm.reason === 'not_linkedin_host' || norm.reason === 'junk')) {
      action = 'clear_invalid';
      nextVal = '';
      report.issues.push({ ...entry, action });
    }

    if (APPLY && action && nextVal !== raw) {
      rows[idx][field] = nextVal;
      report.totals.applied++;
    } else if (APPLY && action === 'normalize' && nextVal !== raw) {
      rows[idx][field] = nextVal;
      report.totals.applied++;
    }
  }

  // Second pass apply: ensure clears happen
  if (APPLY) {
    for (const item of probed) {
      const p = item.probe;
      const isWeb = item.field === 'Website';
      if (!item.norm.url) {
        rows[item.idx][item.field] = '';
        continue;
      }
      if (isWeb && clearWebsiteKinds.has(p.kind)) {
        rows[item.idx][item.field] = '';
        continue;
      }
      if (!isWeb && (p.kind === 'invalid' || item.norm.reason === 'not_linkedin_host')) {
        rows[item.idx][item.field] = '';
        continue;
      }
      if (item.norm.changed && (p.ok || p.kind === 'blocked_but_likely_alive')) {
        rows[item.idx][item.field] = item.norm.url;
      }
      if (
        isWeb &&
        p.ok &&
        p.finalUrl &&
        p.finalUrl !== item.norm.url
      ) {
        try {
          const a = new URL(item.norm.url);
          const b = new URL(p.finalUrl);
          if (a.hostname.replace(/^www\./, '') === b.hostname.replace(/^www\./, '')) {
            rows[item.idx][item.field] = p.finalUrl;
          }
        } catch {
          /* ignore */
        }
      }
    }
    saveCsv(rows);
    console.log(`Applied safe fixes to ${CSV_PATH}`);
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log('Report →', REPORT_PATH);
  console.log(JSON.stringify(report.totals, null, 2));
  console.log(`Issues: ${report.issues.length}, Fixes noted: ${report.fixes.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
