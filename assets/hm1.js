(function () {
  'use strict';
  var homeworkConfig = window.ETHAN_HOMEWORK_CONFIG || {};
  var assignmentId = homeworkConfig.assignmentId || 'eth-class-00-hm1-boundaries-30q';
  var assignmentLabel = homeworkConfig.assignmentLabel || 'HM1 · Sentence Boundaries · 30 Questions';
  var questionCount = Number(homeworkConfig.count || 30);
  var submitButtonLabel = homeworkConfig.submitButtonLabel || 'Submit HM1';
  var endpoint = (window.ETHAN_PORTAL_CONFIG || {}).submissionEndpoint || '';
  var storageKey = homeworkConfig.storageKey || 'ethan-hm1-boundaries-first-attempt';
  var saveTimer = null;
  var submitting = false;
  var progressQueue = Promise.resolve();
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

  Array.from(document.querySelectorAll('textarea[id]')).forEach(function (field) {
    if (state.notes && Object.prototype.hasOwnProperty.call(state.notes, field.id)) field.value = state.notes[field.id];
    field.addEventListener('input', function () {
      if (state.submittedAt || submitting) return;
      state.notes[field.id] = field.value;
      saveLocal('Working notes saved on this browser.', 'success');
    });
  });

  document.querySelector('[data-print]')?.addEventListener('click', function () { window.print(); });
  document.querySelector('[data-clear]')?.addEventListener('click', function () {
    if (state.submittedAt || submitting) return;
    document.querySelectorAll('input[type="radio"]').forEach(function (input) { input.checked = false; });
    document.querySelectorAll('textarea').forEach(function (field) { field.value = ''; });
    state.responses = {};
    state.notes = {};
    saveLocal('Choices and working notes cleared.', '');
  });

  questions.forEach(function (question) {
    question.addEventListener('change', function (event) {
      var input = event.target.closest('input[type="radio"]');
      if (!input || state.submittedAt || submitting) return;
      state.responses[input.dataset.number] = input.value;
      saveLocal('Saving…', '');
      window.clearTimeout(saveTimer);
      saveTimer = window.setTimeout(queueProgress, 850);
    });
  });

  document.getElementById('submit-homework').addEventListener('click', submitHomework);
  if (!state.submittedAt) document.getElementById('submit-homework').textContent = submitButtonLabel;
  if (state.submittedAt) {
    submitting = true;
    lockInputs(true);
    document.getElementById('submit-homework').disabled = true;
    document.getElementById('submit-homework').textContent = 'Checking submission…';
    ready.then(function () { return pollForResult(0); }).catch(submissionUnconfirmed);
  }
  if (!token()) setStatus('Ready when you are.', '');

  function freshState() {
    return { assignmentId: assignmentId, assignmentLabel: assignmentLabel, saveId: createId(), studentName: 'Ethan', startedAt: new Date().toISOString(), submittedAt: null, responses: {}, notes: {}, result: null };
  }

  function loadState() {
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey));
      if (!saved || !saved.saveId || !saved.responses) return freshState();
      saved.assignmentId = assignmentId;
      saved.assignmentLabel = assignmentLabel;
      saved.notes = saved.notes || {};
      return saved;
    } catch (error) { return freshState(); }
  }

  function saveLocal(message, type) {
    localStorage.setItem(storageKey, JSON.stringify(state));
    setStatus(message, type);
  }

  function token() { return window.EthanPortalAccess ? window.EthanPortalAccess.getToken() : ''; }

  function queueProgress() {
    if (submitting || state.submittedAt || state.result) return;
    progressQueue = progressQueue.then(async function () {
      if (submitting || state.submittedAt || state.result) return;
      await ready;
      var receipt = await jsonp('getGradedResult', { assignmentId: assignmentId, saveId: state.saveId });
      if (receipt.found) { renderReceipt(receipt); return; }
      await checkReceiving();
      var snapshot = Object.assign({}, state.responses);
      await sendProgress(false, snapshot);
      var saved = await jsonp('getHomeworkProgress', { assignmentId: assignmentId, saveId: state.saveId });
      if (saved.pending || !sameAnswers(saved.responses, snapshot)) throw new Error('Your answers are saved on this browser, but we could not confirm the copy with your teacher. Please try again.');
      if (!submitting && !state.submittedAt && sameAnswers(state.responses, snapshot)) setStatus('Saved on this browser and with your teacher.', 'success');
    }).catch(function (error) {
      if (!submitting && !state.submittedAt) setStatus(error.message || 'Saved on this browser. We could not connect to your teacher.', 'error');
    });
  }

  function sameAnswers(left, right) {
    function values(input) {
      return Object.keys(input || {}).filter(function (key) {
        var item = input[key];
        return String(typeof item === 'object' ? item.answer || '' : item || '').trim();
      }).sort(function (a, b) { return Number(a) - Number(b); }).map(function (key) {
        var item = input[key];
        return [key, String(typeof item === 'object' ? item.answer || '' : item || '').trim()];
      });
    }
    return JSON.stringify(values(left)) === JSON.stringify(values(right));
  }

  async function checkReceiving() {
    var data = await jsonp('getAssignmentState', { assignmentId: assignmentId, saveId: state.saveId });
    if (!data.receiving) throw new Error('Your teacher has paused submissions for this homework. Your answers are still saved.');
  }

  async function sendProgress(submitted, responses) {
    if (!endpoint) throw new Error('Submission service unavailable.');
    await window.EthanPortalAccess.ensureFreshAccess(false);
    var controller = new AbortController();
    var timeout = window.setTimeout(function () { controller.abort(); }, 20000);
    try {
      return await fetch(endpoint, {
        method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, signal: controller.signal,
        body: JSON.stringify({ action: submitted ? 'submitHomework' : 'saveProgress', accessToken: token(), assignmentId: assignmentId, assignmentLabel: assignmentLabel, saveId: state.saveId, responses: responses || state.responses, studentName: state.studentName, submittedAt: submitted ? state.submittedAt : null })
      });
    } finally { window.clearTimeout(timeout); }
  }

  function lockInputs(locked) {
    document.querySelectorAll('input[type="radio"], textarea').forEach(function (input) { input.disabled = locked; });
  }

  async function submitHomework() {
    if (state.submittedAt || submitting || state.result) return;
    var missing = questionCount - Object.keys(state.responses).length;
    if (missing && !window.confirm('There are still ' + missing + ' unanswered questions.\n\nSubmit anyway? Blank answers will be counted as incorrect.')) return;
    var enteredName = window.prompt('Please type your name before submitting:', state.studentName || 'Ethan');
    if (enteredName === null || !enteredName.trim()) { setStatus('Submission cancelled. Type your name when ready.', 'error'); return; }
    state.studentName = enteredName.trim().slice(0, 80);
    submitting = true;
    lockInputs(true);
    window.clearTimeout(saveTimer);
    var button = document.getElementById('submit-homework');
    button.disabled = true;
    button.textContent = 'Connecting…';
    try {
      saveLocal('Checking your connection. Your answers are saved on this browser.', '');
      await progressQueue;
      await window.EthanPortalAccess.ensureFreshAccess(true);
      var receipt = await jsonp('getGradedResult', { assignmentId: assignmentId, saveId: state.saveId });
      if (receipt.found) { renderReceipt(receipt); return; }
      await checkReceiving();
      state.submittedAt = new Date().toISOString();
      saveLocal('Submitting…', '');
      button.textContent = 'Sending…';
      await sendProgress(true);
      await pollForResult(0);
    } catch (error) {
      submissionUnconfirmed(error && error.name === 'AbortError' ? new Error('The connection timed out. Your answers are still saved. Please try submitting again.') : error);
    }
  }

  function pollForResult(attempt) {
    return jsonp('getGradedResult', { assignmentId: assignmentId, saveId: state.saveId, submissionId: state.saveId }).then(function (data) {
      if (data && data.ok && data.found) { renderReceipt(data); return; }
      if (attempt < 8) return new Promise(function (resolve) { window.setTimeout(resolve, Math.min(1000 + attempt * 250, 3000)); }).then(function () { return pollForResult(attempt + 1); });
      else submissionUnconfirmed();
    }).catch(submissionUnconfirmed);
  }

  function renderReceipt(result) {
    state.result = result;
    state.submittedAt = result.submittedAt || state.submittedAt || new Date().toISOString();
    submitting = false;
    window.clearTimeout(saveTimer);
    saveLocal('Submitted successfully.', 'success');
    lockInputs(true);
    var button = document.getElementById('submit-homework');
    button.disabled = true;
    button.textContent = result.checkMode ? 'Answers checked' : 'Submitted';
    var receipt = document.getElementById('submission-receipt');
    receipt.hidden = false;
    (result.answers || []).forEach(function (selected, index) {
      var question = document.querySelector('[data-q="' + (index + 1) + '"]');
      if (!question) return;
      question.querySelectorAll('input[type="radio"]').forEach(function (input) { input.checked = input.value === selected; });
    });
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

  function submissionUnconfirmed(error) {
    if (state.result && state.result.found) { renderReceipt(state.result); return; }
    state.submittedAt = null;
    submitting = false;
    lockInputs(false);
    saveLocal(error && error.message ? error.message : 'We couldn\'t confirm the submission. Your answers are still here. Please try again.', 'error');
    var button = document.getElementById('submit-homework');
    button.disabled = false;
    button.textContent = 'Try submitting again';
  }

  function jsonp(action, parameters) {
    return window.EthanPortalAccess.request(action, parameters);
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
