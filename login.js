document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('auth-form');
  const emailStep = document.getElementById('email-step');
  const otpStep = document.getElementById('otp-step');
  const emailInput = document.getElementById('work-email');
  const otpInput = document.getElementById('otp-code');
  const submitBtn = document.getElementById('auth-submit-btn');
  const resendBtn = document.getElementById('resend-otp-btn');
  const changeEmailBtn = document.getElementById('change-email-btn');
  const googleBtn = document.getElementById('google-btn');
  const statusEl = document.getElementById('auth-status');
  const emailError = document.getElementById('email-error');
  const otpError = document.getElementById('otp-error');

  let step = 'email';
  let pendingEmail = '';
  let busy = false;
  let clientReady = false;
  let resendCooldownTimer = null;
  let resendCooldownUntil = 0;

  const RESEND_COOLDOWN_MS = 30000;
  const LABEL_SEND = 'Send OTP';
  const LABEL_VERIFY = 'Verify & continue';

  const params = new URLSearchParams(window.location.search);
  const nextPath = params.get('next') || '/funds';

  function safeNext(path) {
    if (!path || typeof path !== 'string') return '/funds';
    if (!path.startsWith('/') || path.startsWith('//')) return '/funds';
    return path;
  }

  function setStatus(message, type) {
    if (!message) {
      statusEl.hidden = true;
      statusEl.textContent = '';
      statusEl.className = 'auth-status';
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = message;
    statusEl.className = 'auth-status is-' + (type || 'info');
  }

  function clearFieldErrors() {
    emailInput.classList.remove('invalid');
    otpInput.classList.remove('invalid');
    emailError.style.display = 'none';
    otpError.style.display = 'none';
  }

  function readEmail() {
    // Autofill can look filled but leave .value empty until a user gesture settles.
    let email = (emailInput.value || '').trim();
    if (!email && form) {
      try {
        email = String(new FormData(form).get('email') || '').trim();
      } catch (_) {
        /* ignore */
      }
    }
    return email;
  }

  function updateResendLabel() {
    const remaining = Math.ceil((resendCooldownUntil - Date.now()) / 1000);
    if (remaining > 0) {
      resendBtn.disabled = true;
      resendBtn.textContent = 'Resend in ' + remaining + 's';
      return;
    }
    resendBtn.disabled = busy;
    resendBtn.textContent = 'Resend OTP';
  }

  function startResendCooldown() {
    resendCooldownUntil = Date.now() + RESEND_COOLDOWN_MS;
    updateResendLabel();
    if (resendCooldownTimer) clearInterval(resendCooldownTimer);
    resendCooldownTimer = setInterval(() => {
      if (Date.now() >= resendCooldownUntil) {
        clearInterval(resendCooldownTimer);
        resendCooldownTimer = null;
      }
      updateResendLabel();
    }, 250);
  }

  function setBusy(nextBusy) {
    busy = nextBusy;
    // Do not set submitBtn.disabled synchronously inside a submit handler —
    // that cancels the first click in some browsers after a hard refresh.
    submitBtn.classList.toggle('is-busy', busy);
    submitBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
    googleBtn.disabled = busy;
    changeEmailBtn.disabled = busy;
    emailInput.readOnly = busy && step === 'otp';
    otpInput.readOnly = busy;
    updateResendLabel();
  }

  function setStep(nextStep) {
    step = nextStep;
    const onOtp = step === 'otp';
    emailStep.classList.toggle('is-hidden', onOtp);
    emailStep.hidden = onOtp;
    otpStep.classList.toggle('is-hidden', !onOtp);
    otpStep.hidden = !onOtp;
    emailInput.required = !onOtp;
    otpInput.required = onOtp;
    submitBtn.textContent = onOtp ? LABEL_VERIFY : LABEL_SEND;
    if (onOtp) {
      otpInput.value = '';
      setTimeout(() => otpInput.focus(), 0);
    } else {
      pendingEmail = '';
      otpInput.value = '';
    }
    clearFieldErrors();
  }

  function sanitizeOtpValue(raw) {
    return String(raw || '').replace(/\D/g, '').slice(0, 8);
  }

  function applyOtpDigitsOnly() {
    const cleaned = sanitizeOtpValue(otpInput.value);
    if (otpInput.value !== cleaned) {
      const start = otpInput.selectionStart;
      otpInput.value = cleaned;
      if (typeof start === 'number') {
        const nextPos = Math.min(cleaned.length, start);
        try {
          otpInput.setSelectionRange(nextPos, nextPos);
        } catch (_) {
          /* ignore */
        }
      }
    }
    if (cleaned.length && !/^\d+$/.test(cleaned)) {
      otpInput.classList.add('invalid');
      otpError.textContent = 'OTP must be digits only.';
      otpError.style.display = 'block';
    } else if (otpError.style.display === 'block' && otpError.textContent === 'OTP must be digits only.') {
      otpInput.classList.remove('invalid');
      otpError.style.display = 'none';
      otpError.textContent = 'Enter the 8-digit code from your email.';
    }
  }

  otpInput.addEventListener('beforeinput', (e) => {
    if (e.inputType && e.inputType.startsWith('delete')) return;
    if (e.data != null && /\D/.test(e.data)) {
      e.preventDefault();
      otpInput.classList.add('invalid');
      otpError.textContent = 'OTP must be digits only (0–9).';
      otpError.style.display = 'block';
    }
  });

  otpInput.addEventListener('input', applyOtpDigitsOnly);
  otpInput.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const digits = sanitizeOtpValue(text);
    otpInput.value = digits;
    applyOtpDigitsOnly();
    if (text && !digits) {
      otpInput.classList.add('invalid');
      otpError.textContent = 'OTP must be digits only (0–9).';
      otpError.style.display = 'block';
    }
  });

  function validateEmailStep() {
    clearFieldErrors();
    const email = readEmail();
    if (email && emailInput.value.trim() !== email) {
      emailInput.value = email;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailInput.classList.add('invalid');
      emailError.style.display = 'block';
      return false;
    }
    return true;
  }

  function validateOtpStep() {
    clearFieldErrors();
    otpError.textContent = 'Enter the 8-digit code from your email.';
    const token = sanitizeOtpValue(otpInput.value);
    otpInput.value = token;
    if (!token) {
      otpInput.classList.add('invalid');
      otpError.textContent = 'Enter the 8-digit code from your email.';
      otpError.style.display = 'block';
      return false;
    }
    if (/\D/.test(otpInput.value) || !/^\d+$/.test(token)) {
      otpInput.classList.add('invalid');
      otpError.textContent = 'OTP must be digits only (0–9).';
      otpError.style.display = 'block';
      return false;
    }
    if (!/^\d{8}$/.test(token)) {
      otpInput.classList.add('invalid');
      otpError.textContent = 'Enter the full 8-digit code from your email.';
      otpError.style.display = 'block';
      return false;
    }
    return true;
  }

  async function redirectAfterAuth() {
    window.location.href = safeNext(nextPath);
  }

  function friendlyAuthError(err, context) {
    const raw = ((err && err.message) || '').toLowerCase();
    if (context === 'verify') {
      if (raw.includes('expired') || raw.includes('otp') || raw.includes('token') || raw.includes('invalid')) {
        return 'Invalid or expired code. Request a new one.';
      }
    }
    return (err && err.message) || 'Something went wrong. Try again.';
  }

  async function ensureClient() {
    if (!window.VCAuth || typeof window.VCAuth.getClient !== 'function') {
      throw new Error('Auth is still loading. Try again in a moment.');
    }
    await window.VCAuth.getClient();
    clientReady = true;
  }

  async function sendOtpCode({ fromResend } = {}) {
    if (!fromResend && !validateEmailStep()) return false;
    if (fromResend && !pendingEmail) return false;
    if (fromResend && Date.now() < resendCooldownUntil) return false;

    const email = fromResend ? pendingEmail : readEmail();

    setBusy(true);
    submitBtn.textContent = fromResend ? 'Resending…' : 'Sending OTP…';
    setStatus(clientReady ? '' : 'Connecting…', clientReady ? undefined : 'info');

    try {
      await ensureClient();
      setStatus('');
      await window.VCAuth.sendEmailOtp({
        email,
        createUser: true
      });
      pendingEmail = email;
      setStep('otp');
      startResendCooldown();
      if (window.VCAnalytics) window.VCAnalytics.track('login_start', { method: 'email_otp' });
      setStatus('Check your inbox for a one-time code sent to ' + email + '.', 'success');
      return true;
    } catch (err) {
      setStatus(friendlyAuthError(err, 'send'), 'error');
      return false;
    } finally {
      setBusy(false);
      submitBtn.textContent = step === 'otp' ? LABEL_VERIFY : LABEL_SEND;
    }
  }

  async function verifyOtpCode() {
    if (!validateOtpStep()) return;
    const token = otpInput.value.trim().replace(/\s+/g, '');

    setBusy(true);
    submitBtn.textContent = 'Verifying…';
    setStatus('');

    try {
      await ensureClient();
      const data = await window.VCAuth.verifyEmailOtp({
        email: pendingEmail,
        token
      });
      if (data && data.session) {
        window.VCAuth.syncCookie(data.session);
      }
      if (window.VCAnalytics) window.VCAnalytics.track('login_success', { method: 'email_otp' });
      await redirectAfterAuth();
    } catch (err) {
      setStatus(friendlyAuthError(err, 'verify'), 'error');
      setBusy(false);
      submitBtn.textContent = LABEL_VERIFY;
    }
  }

  // Defer Supabase (~113KB) so first paint isn't blocked.
  // Logged-in users (cookie present): check ASAP. Everyone else: idle / after load.
  function hasAccessCookie() {
    return /(?:^|;\s*)vd_access_token=/.test(document.cookie || '');
  }

  function warmSupabaseCache() {
    try {
      if (document.querySelector('link[data-vc-supabase-preload]')) return;
      var link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js';
      link.setAttribute('data-vc-supabase-preload', '1');
      document.head.appendChild(link);
    } catch (_) {
      /* ignore */
    }
  }

  async function checkExistingSession() {
    try {
      await ensureClient();
      const client = await window.VCAuth.getClient();
      const { data } = await client.auth.getSession();
      if (data.session) {
        await redirectAfterAuth();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function scheduleSessionCheck() {
    if (hasAccessCookie()) {
      checkExistingSession();
      return;
    }
    warmSupabaseCache();
    var run = function () {
      checkExistingSession();
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(run, { timeout: 4000 });
    } else {
      window.addEventListener('load', function () {
        setTimeout(run, 100);
      });
    }
  }

  scheduleSessionCheck();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    if (step === 'email') {
      await sendOtpCode();
    } else {
      await verifyOtpCode();
    }
  });

  resendBtn.addEventListener('click', async () => {
    if (busy || Date.now() < resendCooldownUntil) return;
    await sendOtpCode({ fromResend: true });
  });

  changeEmailBtn.addEventListener('click', () => {
    if (busy) return;
    setStep('email');
    setStatus('');
    emailInput.focus();
  });

  googleBtn.addEventListener('click', async () => {
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      await ensureClient();
      const client = await window.VCAuth.getClient();
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo:
            window.location.origin +
            '/login?next=' +
            encodeURIComponent(safeNext(nextPath))
        }
      });
      if (error) throw error;
    } catch (err) {
      setBusy(false);
      setStatus((err && err.message) || 'Google sign-in failed.', 'error');
    }
  });
});
