document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menu-toggle');
  const mainNav = document.getElementById('navigation-bar');
  const form = document.getElementById('auth-form');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const emailStep = document.getElementById('email-step');
  const otpStep = document.getElementById('otp-step');
  const nameGroup = document.getElementById('name-group');
  const nameInput = document.getElementById('full-name');
  const emailInput = document.getElementById('work-email');
  const otpInput = document.getElementById('otp-code');
  const submitBtn = document.getElementById('auth-submit-btn');
  const resendBtn = document.getElementById('resend-otp-btn');
  const changeEmailBtn = document.getElementById('change-email-btn');
  const googleBtn = document.getElementById('google-btn');
  const statusEl = document.getElementById('auth-status');
  const nameError = document.getElementById('name-error');
  const emailError = document.getElementById('email-error');
  const otpError = document.getElementById('otp-error');

  let mode = 'login';
  let step = 'email';
  let pendingEmail = '';
  let pendingName = '';
  let busy = false;
  let resendCooldownTimer = null;
  let resendCooldownUntil = 0;

  const RESEND_COOLDOWN_MS = 30000;

  const params = new URLSearchParams(window.location.search);
  const nextPath = params.get('next') || '/investors';
  if (params.get('mode') === 'signup') mode = 'signup';

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
    nameInput.classList.remove('invalid');
    emailInput.classList.remove('invalid');
    otpInput.classList.remove('invalid');
    if (nameError) nameError.style.display = 'none';
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
    nameInput.readOnly = busy && step === 'otp';
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
      pendingName = '';
      otpInput.value = '';
    }
    clearFieldErrors();
  }

  function setMode(nextMode, { resetStep = true } = {}) {
    mode = nextMode;
    const isSignup = mode === 'signup';
    tabLogin.classList.toggle('is-active', !isSignup);
    tabSignup.classList.toggle('is-active', isSignup);
    tabLogin.setAttribute('aria-selected', String(!isSignup));
    tabSignup.setAttribute('aria-selected', String(isSignup));
    nameGroup.classList.toggle('is-hidden', !isSignup);
    nameGroup.hidden = !isSignup;
    nameInput.required = isSignup;
    if (!isSignup) nameInput.value = '';
    setStatus('');
    if (resetStep) setStep('email');
    else syncNameVisibilityForStep();
  }

  function syncNameVisibilityForStep() {
    const isSignup = mode === 'signup';
    const showName = isSignup && step === 'email';
    nameGroup.classList.toggle('is-hidden', !showName);
    nameGroup.hidden = !showName;
    nameInput.required = showName;
  }

  setMode(mode);

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      mainNav.classList.toggle('active');
    });
  }

  tabLogin.addEventListener('click', () => {
    if (busy) return;
    setMode('login');
  });
  tabSignup.addEventListener('click', () => {
    if (busy) return;
    setMode('signup');
  });

  function validateEmailStep() {
    let ok = true;
    clearFieldErrors();
    const email = emailInput.value.trim();
    const name = nameInput.value.trim();

    if (mode === 'signup' && !name) {
      nameInput.classList.add('invalid');
      if (nameError) nameError.style.display = 'block';
      ok = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailInput.classList.add('invalid');
      emailError.style.display = 'block';
      ok = false;
    }
    return ok;
  }

  function validateOtpStep() {
    clearFieldErrors();
    const token = otpInput.value.trim().replace(/\s+/g, '');
    if (!/^\d{6,8}$/.test(token)) {
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
    if (context === 'send' && mode === 'login') {
      if (
        raw.includes('signups not allowed') ||
        raw.includes('user not found') ||
        raw.includes('unable to validate email') ||
        raw.includes('email not found')
      ) {
        return 'No account found for that email. Switch to Sign up.';
      }
    }
    if (context === 'verify') {
      if (raw.includes('expired') || raw.includes('otp') || raw.includes('token') || raw.includes('invalid')) {
        return 'Invalid or expired code. Request a new one.';
      }
    }
    return (err && err.message) || 'Something went wrong. Try again.';
  }

  async function sendOtpCode({ fromResend } = {}) {
    if (!validateEmailStep() && !fromResend) return false;
    if (fromResend && !pendingEmail) return false;
    if (Date.now() < resendCooldownUntil && fromResend) return false;

    const email = fromResend ? pendingEmail : emailInput.value.trim();
    const fullName = fromResend ? pendingName : nameInput.value.trim();

    setBusy(true);
    submitBtn.textContent = fromResend ? 'Resending…' : 'Sending…';
    setStatus('');

    try {
      await window.VCAuth.sendEmailOtp({
        email,
        createUser: mode === 'signup',
        fullName: mode === 'signup' ? fullName : undefined
      });
      pendingEmail = email;
      pendingName = mode === 'signup' ? fullName : '';
      setStep('otp');
      syncNameVisibilityForStep();
      startResendCooldown();
      setStatus('Check your inbox for a one-time code' + (email ? ' sent to ' + email : '') + '.', 'success');
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

      if (mode === 'signup' && pendingName) {
        const user = data && data.user;
        const metaName = user && user.user_metadata && user.user_metadata.full_name;
        if (!metaName) {
          try {
            await window.VCAuth.updateUserProfile({ full_name: pendingName });
          } catch (profileErr) {
            console.warn(profileErr);
          }
        }
      }

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
    syncNameVisibilityForStep();
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
