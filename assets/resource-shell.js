(() => {
  const body = document.body;
  const statusNode = document.getElementById('resource-status');
  const resourceId = String(body.dataset.resourceId || '').replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 120);
  const portalConfig = window.ETHAN_PORTAL_CONFIG || {};

  const showState = (state, message) => {
    body.dataset.resourceState = state;
    statusNode.textContent = message;
  };

  const getResourceState = (accessToken) => new Promise((resolve, reject) => {
    if (!portalConfig.submissionEndpoint || !resourceId || !accessToken) {
      reject(new Error('Secure resource access is unavailable.'));
      return;
    }

    const callbackName = `__ethanResource${Date.now()}${Math.random().toString(16).slice(2)}`;
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('Resource access timed out.'));
    }, 12000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script.remove();
    };

    window[callbackName] = (data) => {
      cleanup();
      if (data && data.ok) resolve(data);
      else reject(new Error('Resource access could not be confirmed.'));
    };
    script.onerror = () => {
      cleanup();
      reject(new Error('Resource access service could not be reached.'));
    };

    const query = new URLSearchParams({
      action: 'getLearningResource',
      resourceId,
      accessToken,
      callback: callbackName,
      _: String(Date.now())
    });
    script.src = `${portalConfig.submissionEndpoint}?${query.toString()}`;
    document.head.appendChild(script);
  });

  const openResource = async () => {
    try {
      if (!window.EthanPortalAccess || !window.EthanPortalAccess.ready) throw new Error('Course access is unavailable.');
      await window.EthanPortalAccess.ready;
      const accessToken = window.EthanPortalAccess.getToken();
      if (!accessToken) throw new Error('Course access needs to be refreshed.');

      const data = await getResourceState(accessToken);
      if (!data.accessMode) {
        showState('locked', 'This handout is not currently available. Your other course pages are unchanged.');
        return;
      }
      if (!data.contentUrl) throw new Error('The handout route is unavailable.');

      const target = new URL(data.contentUrl);
      if (target.protocol !== 'https:' || target.hostname !== 'script.google.com') throw new Error('The handout route is invalid.');
      target.searchParams.set('accessToken', accessToken);
      window.location.replace(target.toString());
    } catch (error) {
      showState('error', 'We couldn’t open this handout right now. Return to the class page and try again later. No learning content has been loaded.');
    }
  };

  openResource();
})();
