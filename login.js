document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menu-toggle');
  const mainNav = document.getElementById('navigation-bar');
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
  let resendCooldownTimer = null;
  let resendCooldownUntil = 0;

  const RESEND_COOLDOWN_MS = 30000;

  const params = new URLSearchParams(window.location.search);
  const nextPath = params.get('next') || '/investors';

  function safeNext(path) {
    if (!path || typeof path !== 'string') return '/investors';
    if (!path.startsWith('/') || path.startsWith('//')) return '/investors';
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

  function updateResendLabel() {
    const remaining = Math.ceil((resendCooldownUntil - Date.now()) / 1000);
    if (remaining > 0) {
      resendBtn.disabled = true;
      resendBtn.textContent = 'Resend in ' + remaining + 's';
      return;
    }
    resendBtn.disabled = busy;
    resendBtn.textContent = 'Resend code';
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
    submitBtn.disabled = busy;
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
    submitBtn.textContent = onOtp ? 'Verify & continue' : 'Send code';
    if (onOtp) {
      otpInput.value = '';
      setTimeout(() => otpInput.focus(), 0);
    } else {
      pendingEmail = '';
      otpInput.value = '';
    }
    clearFieldErrors();
  }

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      mainNav.classList.toggle('active');
    });
  }

  function validateEmailStep() {
    clearFieldErrors();
    const email = emailInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailInput.classList.add('invalid');
      emailError.style.display = 'block';
      return false;
    }
    return true;
  }

  function validateOtpStep() {
    clearFieldErrors();
    const token = otpInput.value.trim().replace(/\s+/g, '');
    if (!/^\d{8}$/.test(token)) {
      otpInput.classList.add('invalid');
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

  async function sendOtpCode({ fromResend } = {}) {
    if (!fromResend && !validateEmailStep()) return false;
    if (fromResend && !pendingEmail) return false;
    if (fromResend && Date.now() < resendCooldownUntil) return false;

    const email = fromResend ? pendingEmail : emailInput.value.trim();

    setBusy(true);
    submitBtn.textContent = fromResend ? 'Resending…' : 'Sending…';
    setStatus('');

    try {
      await window.VCAuth.sendEmailOtp({
        email,
        createUser: true
      });
      pendingEmail = email;
      setStep('otp');
      startResendCooldown();
      setStatus('Check your inbox for a one-time code sent to ' + email + '.', 'success');
      return true;
    } catch (err) {
      setStatus(friendlyAuthError(err, 'send'), 'error');
      return false;
    } finally {
      setBusy(false);
      submitBtn.textContent = step === 'otp' ? 'Verify & continue' : 'Send code';
    }
  }

  async function verifyOtpCode() {
    if (!validateOtpStep()) return;
    const token = otpInput.value.trim().replace(/\s+/g, '');

    setBusy(true);
    submitBtn.textContent = 'Verifying…';
    setStatus('');

    try {
      const data = await window.VCAuth.verifyEmailOtp({
        email: pendingEmail,
        token
      });
      if (data && data.session) {
        window.VCAuth.syncCookie(data.session);
      }
      await redirectAfterAuth();
    } catch (err) {
      setStatus(friendlyAuthError(err, 'verify'), 'error');
      setBusy(false);
      submitBtn.textContent = 'Verify & continue';
    }
  }

  (async function bootstrap() {
    try {
      const client = await window.VCAuth.getClient();
      const { data } = await client.auth.getSession();
      if (data.session) {
        await redirectAfterAuth();
      }
    } catch (err) {
      console.error(err);
    }
  })();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
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
    googleBtn.disabled = true;
    setStatus('');
    try {
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
      googleBtn.disabled = false;
      setStatus((err && err.message) || 'Google sign-in failed.', 'error');
    }
  });
});
