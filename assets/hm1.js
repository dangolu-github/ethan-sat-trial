(function () {
  'use strict';
  var assignmentId = 'eth-class-00-hm1-boundaries-30q';
  var assignmentLabel = 'HM1 · Sentence Boundaries · 30 Questions';
  var endpoint = (window.ETHAN_PORTAL_CONFIG || {}).submissionEndpoint || '';
  var storageKey = 'ethan-hm1-boundaries-first-attempt';
  var saveTimer = null;
  var ready = window.EthanPortalAccess && window.EthanPortalAccess.ready ? window.EthanPortalAccess.ready : Promise.resolve();
  var state = loadState();
  var questions = Array.from(document.querySelectorAll('[data-q]'));

  questions.forEach(function (question) {
    var number = Number(question.dataset.q);
    question.id = 'question-' + number;
    Array.from(question.querySelectorAll('.option')).forEach(function (label, index) {
      var input = label.querySelector('input[type="radio"]');
      if (!input) return;
      input.value = String.fromCharCode(65 + index);
      input.dataset.number = String(number);
      if (state.responses[number] === input.value) input.checked = true;
    });
  });

  document.querySelector('[data-print]')?.addEventListener('click', function () { window.print(); });
  document.querySelector('[data-clear]')?.addEventListener('click', function () {
    if (state.submittedAt) return;
    document.querySelectorAll('input[type="radio"]').forEach(function (input) { input.checked = false; });
    state.responses = {};
    saveLocal('Choices cleared.', '');
  });

  questions.forEach(function (question) {
    question.addEventListener('change', function (event) {
      var input = event.target.closest('input[type="radio"]');
      if (!input || state.submittedAt) return;
      state.responses[input.dataset.number] = input.value;
      saveLocal('Saving…', '');
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(function () { sendProgress(false); }, 850);
    });
  });

  document.getElementById('submit-homework').addEventListener('click', submitHomework);
  if (state.submittedAt) pollForResult(0);
  if (!token()) setStatus('Ready when you are.', '');

  function freshState() {
    return { assignmentId: assignmentId, assignmentLabel: assignmentLabel, saveId: createId(), studentName: 'Ethan', startedAt: new Date().toISOString(), submittedAt: null, responses: {}, result: null };
  }

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey));
      return saved && saved.saveId && saved.responses ? saved : freshState();
    } catch (error) { return freshState(); }
  }

  function saveLocal(message, type) {
    localStorage.setItem(storageKey, JSON.stringify(state));
    setStatus(message, type);
  }

  function token() { return window.EthanPortalAccess ? window.EthanPortalAccess.getToken() : ''; }

  function sendProgress(submitted) {
    if (!endpoint) return Promise.reject(new Error('Submission service unavailable.'));
    return ready.then(function () {
      return fetch(endpoint, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: submitted ? 'submitHomework' : 'saveProgress', accessToken: token(), assignmentId: assignmentId, assignmentLabel: assignmentLabel, saveId: state.saveId, responses: state.responses, studentName: state.studentName, submittedAt: submitted ? state.submittedAt : null })
      });
    }).then(function () {
      if (!submitted) setStatus('Progress saved.', 'success');
    });
  }

  function submitHomework() {
    if (state.submittedAt) return;
    var missing = 30 - Object.keys(state.responses).length;
    if (missing && !window.confirm('There are still ' + missing + ' unanswered questions.\n\nSubmit anyway? Blank answers will be counted as incorrect.')) return;
    var enteredName = window.prompt('Please type your name before submitting:', state.studentName || 'Ethan');
    if (enteredName === null || !enteredName.trim()) { setStatus('Submission cancelled. Type your name when ready.', 'error'); return; }
    state.studentName = enteredName.trim().slice(0, 80);
    state.submittedAt = new Date().toISOString();
    saveLocal('Submitting…', '');
    var button = document.getElementById('submit-homework');
    button.disabled = true;
    button.textContent = 'Sending…';
    sendProgress(true).then(function () { pollForResult(0); }).catch(function () {
      state.submittedAt = null;
      saveLocal('We couldn\'t submit. Your answers are still here. Please try again.', 'error');
      button.disabled = false;
      button.textContent = 'Try submitting again';
    });
  }

  function pollForResult(attempt) {
    jsonp('getGradedResult', { assignmentId: assignmentId, saveId: state.saveId, submissionId: state.saveId }).then(function (data) {
      if (data && data.ok && data.found) { renderReceipt(data); return; }
      if (attempt < 12) window.setTimeout(function () { pollForResult(attempt + 1); }, Math.min(1000 + attempt * 250, 3000));
      else submissionUnconfirmed();
    }).catch(function () {
      if (attempt < 12) window.setTimeout(function () { pollForResult(attempt + 1); }, 1700);
      else submissionUnconfirmed();
    });
  }

  function renderReceipt(result) {
    state.result = result;
    saveLocal('Submitted successfully.', 'success');
    document.querySelectorAll('input[type="radio"]').forEach(function (input) { input.disabled = true; });
    var button = document.getElementById('submit-homework');
    button.disabled = true;
    button.textContent = result.checkMode ? 'Answers checked' : 'Submitted';
    var receipt = document.getElementById('submission-receipt');
    receipt.hidden = false;
    if (result.checkMode) {
      receipt.innerHTML = '<strong>' + result.score + ' / ' + result.total + ' checked</strong><br>Correct answers are marked in green; incorrect first choices are marked in red.';
      result.answers.forEach(function (selected, index) {
        var question = document.querySelector('[data-q="' + (index + 1) + '"]');
        var labels = Array.from(question.querySelectorAll('.option'));
        labels.forEach(function (label) {
          var value = label.querySelector('input').value;
          if (value === result.correctAnswers[index]) label.classList.add('is-correct');
          if (value === selected && value !== result.correctAnswers[index]) label.classList.add('is-wrong');
        });
      });
    } else receipt.innerHTML = '<strong>Submitted.</strong><br>Your answers have been saved. Feedback will appear here when it is ready.';
  }

  function submissionUnconfirmed() {
    state.submittedAt = null;
    saveLocal('We couldn\'t confirm the submission. Your answers are still here. Please try again.', 'error');
    var button = document.getElementById('submit-homework');
    button.disabled = false;
    button.textContent = 'Try submitting again';
  }

  function jsonp(action, parameters) {
    return ready.then(function () { return new Promise(function (resolve, reject) {
      if (!endpoint) { reject(new Error('Submission service unavailable.')); return; }
      var callbackName = '__ethanHm1' + Date.now() + Math.random().toString(16).slice(2);
      var script = document.createElement('script');
      var args = Object.assign({}, parameters, { action: action, accessToken: token(), callback: callbackName, _: Date.now() });
      var timeout = window.setTimeout(function () { cleanup(); reject(new Error('Timed out')); }, 10000);
      function cleanup() { window.clearTimeout(timeout); delete window[callbackName]; script.remove(); }
      window[callbackName] = function (data) { cleanup(); resolve(data); };
      script.onerror = function () { cleanup(); reject(new Error('Unable to load')); };
      script.src = endpoint + '?' + Object.keys(args).map(function (key) { return encodeURIComponent(key) + '=' + encodeURIComponent(args[key]); }).join('&');
      document.head.appendChild(script);
    }); });
  }

  function setStatus(message, type) {
    var status = document.getElementById('save-status');
    status.textContent = message;
    status.classList.toggle('is-success', type === 'success');
    status.classList.toggle('is-error', type === 'error');
  }

  function createId() {
    return window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : 'ethan-hm1-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }
}());
