(() => {
  const storageKey = 'ethan-sat-access';
  const expectedHash = '7b8bd6c0abf53d22888beafc48830e1156907dd4ec7e6ea31e55a0dd6dc5a969';

  const getAccess = () => {
    try { return window.sessionStorage.getItem(storageKey) === 'granted'; }
    catch { return false; }
  };

  const setAccess = () => {
    try { window.sessionStorage.setItem(storageKey, 'granted'); }
    catch { /* Session storage is optional. */ }
  };

  const digest = async (value) => {
    const data = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  const reveal = () => {
    document.documentElement.classList.remove('access-pending');
    document.body.classList.remove('access-locked');
    document.querySelectorAll('body > [inert]').forEach((node) => { node.inert = false; });
    document.querySelector('.access-gate')?.remove();
  };

  if (getAccess()) {
    reveal();
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
    const submittedHash = await digest(input.value.trim());
    if (submittedHash !== expectedHash) {
      error.textContent = 'That password does not match. Please try again.';
      input.select();
      return;
    }
    setAccess();
    reveal();
    document.querySelector('main, .page')?.focus?.();
  });
})();

