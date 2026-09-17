/**
 * Fire-and-forget ops alert. Never throws into the caller.
 * Uses Resend via notify.sendAlert (6h dedupe per source+subject).
 */
function reportError(opts) {
  const source = String((opts && opts.source) || 'app');
  const subject = String((opts && opts.subject) || 'Unhandled error').slice(0, 200);
  const body = String((opts && opts.body) || '');
  const severity = String((opts && opts.severity) || 'error');
  console.error('[vc-report]', source, subject, body.slice(0, 300));
  Promise.resolve()
    .then(function () {
      const { sendAlert } = require('./notify');
      return sendAlert({ source: source, subject: subject, body: body, severity: severity });
    })
    .catch(function () {});
}

function isPoolExhausted(err) {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || err);
  return (
    code === 'EMAXCONN' ||
    code === '53300' ||
    /EMAXCONN|too many clients|remaining connection slots|max clients/i.test(msg)
  );
}

module.exports = { reportError, isPoolExhausted };
