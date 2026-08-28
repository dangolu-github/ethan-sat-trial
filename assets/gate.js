(() => {
  const sessionAccessKey = 'ethan-sat-access';
  const trustedBrowserKey = 'ethan-sat-trusted-browser-v1';
  const deviceTokenKey = 'ethan-sat-device-token-v1';
  const tokenKey = 'ethan-sat-access-token';
  const expectedHash = '7b8bd6c0abf53d22888beafc48830e1156907dd4ec7e6ea31e55a0dd6dc5a969';
  const portalConfig = window.ETHAN_PORTAL_CONFIG || {};
  let resolveReady;
  const ready = new Promise((resolve) => { resolveReady = resolve; });

  window.EthanPortalAccess = {
    ready,
    getToken: () => {
      try { return window.sessionStorage.getItem(tokenKey) || ''; }
      catch { return ''; }
    }
  };

  const readStorage = (storage, key) => {
    try { return storage.getItem(key) || ''; }
    catch { return ''; }
  };

  const writeStorage = (storage, key, value) => {
    try { storage.setItem(key, value); return true; }
    catch { return false; }
  };

  const getAccess = () => (
    readStorage(window.localStorage, trustedBrowserKey) === 'granted' ||
    readStorage(window.sessionStorage, sessionAccessKey) === 'granted'
  );

  const getDeviceToken = () => readStorage(window.localStorage, deviceTokenKey);

  const setAccess = (token, deviceToken) => {
    writeStorage(window.sessionStorage, sessionAccessKey, 'granted');
    if (token) writeStorage(window.sessionStorage, tokenKey, token);
    writeStorage(window.localStorage, trustedBrowserKey, 'granted');
    if (deviceToken) writeStorage(window.localStorage, deviceTokenKey, deviceToken);
  };

  const consumeTrustedDevice = () => {
    try {
      const parameters = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const token = String(parameters.get('ethan-trusted-device') || '').replace(/[^a-f0-9]/gi, '').slice(0, 128);
      if (!token) return '';
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      return token;
    }
    catch { return ''; }
  };

  const digest = async (value) => {
    const data = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  const requestAccess = (action, parameters) => new Promise((resolve, reject) => {
    if (!portalConfig.submissionEndpoint) {
      reject(new Error('Access is unavailable.'));
      return;
    }
    const callbackName = `__ethanAccess${Date.now()}${Math.random().toString(16).slice(2)}`;
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Course access timed out.'));
    }, 12000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    };
    window[callbackName] = (data) => {
      cleanup();
      if (data && data.ok && data.accessToken) resolve(data);
      else reject(new Error((data && data.error) || 'Access could not be confirmed.'));
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('Course access service could not be reached.'));
    };
    const query = new URLSearchParams(Object.assign({}, parameters, { action, callback: callbackName, _: String(Date.now()) }));
    script.src = `${portalConfig.submissionEndpoint}?${query.toString()}`;
    document.head.appendChild(script);
  });

  const authorize = (code) => requestAccess('authorizeAccess', { code });
  const renewAccess = (deviceToken) => requestAccess('renewAccess', { deviceToken });

  const reveal = () => {
    document.body.dataset.access = 'granted';
    document.documentElement.classList.remove('access-pending');
    document.body.classList.remove('access-locked');
    document.querySelectorAll('body > [inert]').forEach((node) => { node.inert = false; });
    document.querySelector('.access-gate')?.remove();
  };

  const showGate = () => {
    document.body.dataset.access = 'locked';
    document.body.classList.add('access-locked');
    Array.from(document.body.children).forEach((node) => { node.inert = true; });

    const gate = document.createElement('div');
    gate.className = 'access-gate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'access-title');
    gate.innerHTML = `
      <form class="access-card">
        <p class="access-kicker">Ethan · SAT Reading & Writing</p>
        <h1 id="access-title">Welcome back</h1>
        <p>Enter your course password.</p>
        <label for="course-password">Password</label>
        <div class="access-row">
          <input id="course-password" name="password" type="password" autocomplete="current-password" required>
          <button type="submit">Continue</button>
        </div>
        <p class="access-error" role="alert" aria-live="polite"></p>
      </form>`;
    document.body.append(gate);
    gate.inert = false;
    document.documentElement.classList.remove('access-pending');

    const form = gate.querySelector('form');
    const input = gate.querySelector('input');
    const error = gate.querySelector('.access-error');
    input.focus();

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.textContent = '';
      const button = form.querySelector('button');
      button.disabled = true;
      button.textContent = 'Opening…';
      const code = input.value.trim();
      const submittedHash = await digest(code);
      if (submittedHash !== expectedHash) {
        error.textContent = 'That password does not match. Please try again.';
        input.select();
        button.disabled = false;
        button.textContent = 'Continue';
        return;
      }
      try {
        const access = await authorize(code);
        setAccess(access.accessToken, access.deviceToken);
      } catch (accessError) {
        setAccess('', '');
      }
      reveal();
      resolveReady();
      document.querySelector('main, .page')?.focus?.();
    });
  };

  const trustedDevice = consumeTrustedDevice() || getDeviceToken();
  if (trustedDevice) {
    renewAccess(trustedDevice).then((access) => {
      setAccess(access.accessToken, trustedDevice);
      reveal();
      resolveReady();
    }).catch(() => {
      if (getAccess()) {
        reveal();
        resolveReady();
      } else showGate();
    });
    return;
  }

  if (getAccess()) {
    reveal();
    resolveReady();
    return;
  }

  showGate();
})();
