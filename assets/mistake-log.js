(function () {
  'use strict';
  var endpoint = (window.ETHAN_PORTAL_CONFIG || {}).submissionEndpoint || '';
  var ready = window.EthanPortalAccess && window.EthanPortalAccess.ready ? window.EthanPortalAccess.ready : Promise.resolve();
  ready.then(loadMistakes).catch(function () { showError('Your review list could not be loaded. Please refresh and try again.'); });

  function token() { return window.EthanPortalAccess ? window.EthanPortalAccess.getToken() : ''; }

  function loadMistakes() {
    return jsonp('getMistakeLog', {}).then(function (data) {
      if (!data || !data.ok || !Array.isArray(data.items)) throw new Error('Mistake log unavailable.');
      render(data.items);
    });
  }

  function render(items) {
    var needsReview = items.filter(function (item) { return item.recoveryState !== 'Recovered'; }).length;
    var recovered = items.length - needsReview;
    document.getElementById('past-count').textContent = items.length;
    document.getElementById('review-count').textContent = needsReview;
    document.getElementById('recovered-count').textContent = recovered;
    document.getElementById('queue-count').textContent = items.length + (items.length === 1 ? ' question' : ' questions');
    var status = document.getElementById('log-status');
    if (!items.length) {
      status.innerHTML = '<strong>No questions here yet.</strong><br>Questions you review will appear here for another try.';
      return;
    }
    status.hidden = true;
    document.getElementById('mistake-list').innerHTML = items.map(function (item) {
      var href = item.type === 'mock1' ? '../mock-1/#question-' + item.itemNumber : '../hm1-sentence-boundaries/#question-' + item.itemNumber;
      return '<article class="mistake-card"><div class="mistake-top"><h3>Review ' + escapeHtml(item.number) + ' · ' + escapeHtml(item.theme) + '</h3><span>' + escapeHtml(item.recoveryState) + '</span></div><div class="answer-pair"><div class="answer-box"><strong>Your first choice</strong>' + escapeHtml(item.studentChoice || 'Blank') + '</div><div class="answer-box"><strong>Correct answer</strong>' + escapeHtml(item.correctAnswer) + '</div></div><a class="question-link" href="' + href + '">Open original question →</a></article>';
    }).join('');
  }

  function showError(message) {
    document.getElementById('queue-count').textContent = 'Unavailable';
    document.getElementById('log-status').textContent = message;
  }

  function jsonp(action, parameters) {
    return new Promise(function (resolve, reject) {
      if (!endpoint) { reject(new Error('Endpoint unavailable.')); return; }
      var callbackName = '__ethanMistakes' + Date.now() + Math.random().toString(16).slice(2);
      var script = document.createElement('script');
      var args = Object.assign({}, parameters, { action: action, accessToken: token(), callback: callbackName, _: Date.now() });
      var timeout = window.setTimeout(function () { cleanup(); reject(new Error('Timed out')); }, 10000);
      function cleanup() { window.clearTimeout(timeout); delete window[callbackName]; script.remove(); }
      window[callbackName] = function (data) { cleanup(); resolve(data); };
      script.onerror = function () { cleanup(); reject(new Error('Unable to load')); };
      script.src = endpoint + '?' + Object.keys(args).map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(args[key]); }).join('&');
      document.head.appendChild(script);
    });
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, function (character) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character]; });
  }
}());
