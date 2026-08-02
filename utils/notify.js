/**
 * Resend-based ops alerts → team@vcdekho.com (or ALERT_TO).
 * Never throws into the caller path.
 */
const crypto = require('crypto');
const db = require('./db');
const { ensureOpsTables } = require('./ops-tables');

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEDUPE_HOURS = 6;

function hashDedupe(source, subject) {
  return crypto
    .createHash('sha256')
    .update(String(source || '') + '|' + String(subject || ''))
    .digest('hex')
    .slice(0, 40);
}

async function recentlySent(dedupeKey) {
  try {
    const { rows } = await db.query(
      `SELECT id FROM ops_alerts
       WHERE dedupe_key = $1 AND sent_at > NOW() - INTERVAL '6 hours'
       LIMIT 1`,
      [dedupeKey]
    );
    return rows.length > 0;
  } catch (_) {
    return false;
  }
}

async function recordAlert({ source, severity, subject, body, dedupeKey }) {
  try {
    await db.query(
      `INSERT INTO ops_alerts (source, severity, subject, body, dedupe_key)
       VALUES ($1, $2, $3, $4, $5)`,
      [source, severity, subject, body, dedupeKey]
    );
  } catch (err) {
    console.error('recordAlert failed:', err.message);
  }
}

/**
 * @param {{ subject: string, body?: string, severity?: string, source?: string, force?: boolean }} opts
 * @returns {Promise<{ sent: boolean, skipped?: string, error?: string }>}
 */
async function sendAlert(opts) {
  const subject = String((opts && opts.subject) || 'VC Dekho alert').slice(0, 200);
  const body = String((opts && opts.body) || '');
  const severity = String((opts && opts.severity) || 'error');
  const source = String((opts && opts.source) || 'ops');
  const force = Boolean(opts && opts.force);

  const apiKey = process.env.RESEND_API_KEY || '';
  const to = process.env.ALERT_TO || 'team@vcdekho.com';
  const from = process.env.ALERT_FROM || 'VC Dekho Alerts <alerts@vcdekho.com>';

  try {
    await ensureOpsTables();
    const dedupeKey = hashDedupe(source, subject);
    if (!force && (await recentlySent(dedupeKey))) {
      return { sent: false, skipped: 'deduped' };
    }

    if (!apiKey) {
      console.warn('sendAlert: RESEND_API_KEY not set — logging only');
      await recordAlert({ source, severity, subject, body: body + '\n\n[NOT SENT: no RESEND_API_KEY]', dedupeKey });
      return { sent: false, skipped: 'no_api_key' };
    }

    const text =
      `[${severity.toUpperCase()}] ${source}\n\n` +
      body +
      `\n\n—\nVC Dekho ops · ${new Date().toISOString()}`;

    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: '[VC Dekho] ' + subject,
        text
      })
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error('Resend failed:', res.status, errBody.slice(0, 300));
      await recordAlert({
        source,
        severity,
        subject,
        body: body + '\n\n[SEND FAILED: ' + res.status + ' ' + errBody.slice(0, 200) + ']',
        dedupeKey
      });
      return { sent: false, error: 'resend_' + res.status };
    }

    await recordAlert({ source, severity, subject, body, dedupeKey });
    return { sent: true };
  } catch (err) {
    console.error('sendAlert error:', err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendAlert, hashDedupe };
