(() => {
  const storageKey = 'ethan-sat-access';
  const tokenKey = 'ethan-sat-access-token';
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

  const getAccess = () => {
      try { return window.sessionStorage.getItem(storageKey) === 'granted' && Boolean(window.sessionStorage.getItem(tokenKey)); }
    catch { return false; }
  };

  const setAccess = (token) => {
    try {
      window.sessionStorage.setItem(storageKey, 'granted');
      window.sessionStorage.setItem(tokenKey, token);
    }
    catch { /* Session storage is optional. */ }
  };

  const authorize = (code) => new Promise((resolve, reject) => {
    if (!portalConfig.submissionEndpoint) {
      reject(new Error('Course access service is unavailable.'));
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
      if (data && data.ok && data.accessToken) resolve(data.accessToken);
      else reject(new Error((data && data.error) || 'Incorrect course password.'));
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('Course access service could not be reached.'));
    };
    const query = new URLSearchParams({ action: 'authorizeAccess', code, callback: callbackName, _: String(Date.now()) });
    script.src = `${portalConfig.submissionEndpoint}?${query.toString()}`;
    document.head.appendChild(script);
  });

  const reveal = () => {
    document.documentElement.classList.remove('access-pending');
    document.body.classList.remove('access-locked');
    document.querySelectorAll('body > [inert]').forEach((node) => { node.inert = false; });
    document.querySelector('.access-gate')?.remove();
  };

  if (getAccess()) {
    reveal();
    resolveReady();
    return;
  }

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
      <h1 id="access-title">Open your workspace</h1>
      <p>Enter the course password to continue.</p>
      <label for="course-password">Course password</label>
      <div class="access-row">
        <input id="course-password" name="password" type="password" autocomplete="current-password" required>
        <button type="submit">Enter</button>
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
    try {
      const token = await authorize(input.value.trim());
      setAccess(token);
      reveal();
      resolveReady();
      document.querySelector('main, .page')?.focus?.();
    } catch (accessError) {
      error.textContent = accessError.message || 'That password does not match. Please try again.';
      input.select();
      button.disabled = false;
      button.textContent = 'Enter';
    }
  });
})();
