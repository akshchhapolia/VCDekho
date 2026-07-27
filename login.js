document.addEventListener('DOMContentLoaded', () => {
  const menuToggle = document.getElementById('menu-toggle');
  const mainNav = document.getElementById('navigation-bar');
  const form = document.getElementById('auth-form');
  const tabLogin = document.getElementById('tab-login');
  const tabSignup = document.getElementById('tab-signup');
  const nameGroup = document.getElementById('name-group');
  const nameInput = document.getElementById('full-name');
  const emailInput = document.getElementById('work-email');
  const passwordInput = document.getElementById('password');
  const submitBtn = document.getElementById('auth-submit-btn');
  const googleBtn = document.getElementById('google-btn');
  const statusEl = document.getElementById('auth-status');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');

  let mode = 'login';

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

  function setMode(nextMode) {
    mode = nextMode;
    const isSignup = mode === 'signup';
    tabLogin.classList.toggle('is-active', !isSignup);
    tabSignup.classList.toggle('is-active', isSignup);
    tabLogin.setAttribute('aria-selected', String(!isSignup));
    tabSignup.setAttribute('aria-selected', String(isSignup));
    nameGroup.hidden = !isSignup;
    nameInput.required = isSignup;
    passwordInput.autocomplete = isSignup ? 'new-password' : 'current-password';
    submitBtn.textContent = isSignup ? 'Create account' : 'Log in';
    setStatus('');
  }

  setMode(mode);

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      mainNav.classList.toggle('active');
    });
  }

  tabLogin.addEventListener('click', () => setMode('login'));
  tabSignup.addEventListener('click', () => setMode('signup'));

  function validate() {
    let ok = true;
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    emailInput.classList.remove('invalid');
    passwordInput.classList.remove('invalid');
    emailError.style.display = 'none';
    passwordError.style.display = 'none';

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailInput.classList.add('invalid');
      emailError.style.display = 'block';
      ok = false;
    }
    if (!password || password.length < 6) {
      passwordInput.classList.add('invalid');
      passwordError.style.display = 'block';
      ok = false;
    }
    return ok;
  }

  async function redirectAfterAuth() {
    window.location.href = safeNext(nextPath);
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
    if (!validate()) return;

    submitBtn.disabled = true;
    const original = submitBtn.textContent;
    submitBtn.textContent = mode === 'signup' ? 'Creating…' : 'Signing in…';
    setStatus('');

    try {
      const client = await window.VCAuth.getClient();
      const email = emailInput.value.trim();
      const password = passwordInput.value;

      if (mode === 'signup') {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: nameInput.value.trim() || undefined },
            emailRedirectTo: window.location.origin + '/login?next=' + encodeURIComponent(safeNext(nextPath))
          }
        });
        if (error) throw error;

        if (data.session) {
          window.VCAuth.syncCookie(data.session);
          await redirectAfterAuth();
          return;
        }

        setStatus('Account created. Check your email to confirm, then log in.', 'success');
        setMode('login');
      } else {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.VCAuth.syncCookie(data.session);
        await redirectAfterAuth();
      }
    } catch (err) {
      const message = (err && err.message) || 'Something went wrong. Try again.';
      setStatus(message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = original;
    }
  });

  googleBtn.addEventListener('click', async () => {
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
