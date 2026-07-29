(function (global) {
  var SUPABASE_URL = 'https://qviyhvnubhduyhgwzuzc.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_8oN7IM2mUNSe8Q7WbaV2lw_86x1NPzb';
  var COOKIE_NAME = 'vd_access_token';
  var clientPromise = null;

  function setAccessCookie(token, maxAge) {
    var secure = global.location && global.location.protocol === 'https:' ? '; Secure' : '';
    if (token) {
      var age = typeof maxAge === 'number' ? maxAge : 3600;
      document.cookie =
        COOKIE_NAME +
        '=' +
        encodeURIComponent(token) +
        '; Path=/; Max-Age=' +
        age +
        '; SameSite=Lax' +
        secure;
    } else {
      document.cookie = COOKIE_NAME + '=; Path=/; Max-Age=0; SameSite=Lax' + secure;
    }
  }

  function syncCookie(session) {
    if (session && session.access_token) {
      setAccessCookie(session.access_token, session.expires_in || 3600);
    } else {
      setAccessCookie(null);
    }
  }

  function getClient() {
    if (clientPromise) return clientPromise;
    clientPromise = new Promise(function (resolve, reject) {
      function ready() {
        if (!global.supabase || !global.supabase.createClient) {
          reject(new Error('Supabase client failed to load'));
          return;
        }
        var client = global.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce'
          }
        });
        client.auth.onAuthStateChange(function (_event, session) {
          syncCookie(session);
        });
        client.auth.getSession().then(function (result) {
          syncCookie(result.data && result.data.session);
          resolve(client);
        }).catch(reject);
      }

      if (global.supabase && global.supabase.createClient) {
        ready();
        return;
      }

      var existing = document.querySelector('script[data-vc-supabase]');
      if (existing) {
        existing.addEventListener('load', ready);
        existing.addEventListener('error', function () {
          reject(new Error('Supabase script failed to load'));
        });
        return;
      }

      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.49.1/dist/umd/supabase.min.js';
      script.async = true;
      script.dataset.vcSupabase = '1';
      script.onload = ready;
      script.onerror = function () {
        reject(new Error('Supabase script failed to load'));
      };
      document.head.appendChild(script);
    });
    return clientPromise;
  }

  function loginUrl(nextPath) {
    var next = nextPath || (global.location.pathname + global.location.search);
    return '/login?next=' + encodeURIComponent(next);
  }

  async function getSession() {
    var client = await getClient();
    var result = await client.auth.getSession();
    return (result.data && result.data.session) || null;
  }

  async function requireSession(nextPath) {
    var session = await getSession();
    if (!session) {
      global.location.replace(loginUrl(nextPath));
      return null;
    }
    return session;
  }

  async function authFetch(url, options) {
    options = options || {};
    var session = await getSession();
    var headers = new Headers(options.headers || {});
    if (session && session.access_token) {
      headers.set('Authorization', 'Bearer ' + session.access_token);
    }
    return fetch(url, Object.assign({}, options, { headers: headers }));
  }

  async function signOut() {
    var client = await getClient();
    await client.auth.signOut();
    setAccessCookie(null);
  }

  async function sendEmailOtp(options) {
    options = options || {};
    var email = (options.email || '').trim();
    if (!email) throw new Error('Email is required');
    var client = await getClient();
    var result = await client.auth.signInWithOtp({
      email: email,
      options: {
        shouldCreateUser: options.createUser !== false
      }
    });
    if (result.error) throw result.error;
    return result.data;
  }

  async function verifyEmailOtp(options) {
    options = options || {};
    var email = (options.email || '').trim();
    var token = String(options.token || '').trim().replace(/\s+/g, '');
    if (!email || !token) throw new Error('Email and code are required');
    var client = await getClient();
    var result = await client.auth.verifyOtp({
      email: email,
      token: token,
      type: 'email'
    });
    if (result.error) throw result.error;
    syncCookie(result.data && result.data.session);
    return result.data;
  }

  function wireLogout(selector) {
    var el = document.querySelector(selector || '#logout-link');
    if (!el) return;
    el.addEventListener('click', function (e) {
      e.preventDefault();
      signOut().then(function () {
        global.location.href = '/login';
      });
    });
  }

  global.VCAuth = {
    SUPABASE_URL: SUPABASE_URL,
    SUPABASE_ANON_KEY: SUPABASE_ANON_KEY,
    getClient: getClient,
    getSession: getSession,
    requireSession: requireSession,
    authFetch: authFetch,
    signOut: signOut,
    sendEmailOtp: sendEmailOtp,
    verifyEmailOtp: verifyEmailOtp,
    wireLogout: wireLogout,
    loginUrl: loginUrl,
    syncCookie: syncCookie
  };
})(window);
