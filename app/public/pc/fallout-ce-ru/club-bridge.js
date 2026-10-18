/* Club shell only: the accepted CE runtime, data and IDBFS namespace are unchanged. */
(function () {
  'use strict';
  var diag = window.__FCE__, runtime = window.Module;
  if (!diag || !runtime) return;
  var get = function (id) { return document.getElementById(id); };
  var host = diag.host = { version: 'club-shell-v3', mainPending: false, finished: false };
  var loading = false, starting = false, closing = false, lastStage = '';
  var qaMute = new URLSearchParams(location.search).has('qaMute');
  try { qaMute = qaMute || new URLSearchParams(window.parent.location.search).has('qaMute'); } catch (_) { /* Cross-origin standalone caller. */ }
  get('mute').checked = qaMute;
  get('mute').dispatchEvent(new Event('change', { bubbles: true }));

  function desktopStatus(text) {
    try { if (window.parent !== window && window.parent.location.origin === location.origin && window.parent.pcDesk) window.parent.pcDesk.status(text); } catch (_) { /* No parent access. */ }
  }
  function fail(error) {
    diag.stage = 'error';
    host.error = String(error && error.message || error);
    document.documentElement.classList.remove('pc-running');
    document.body.classList.remove('game-running');
    get('overlay').classList.remove('hidden');
    get('message').textContent = 'Не удалось продолжить игру.';
    get('error').textContent = host.error;
    get('error').style.display = 'block';
    get('retry').hidden = false;
    get('cancel').textContent = 'На рабочий стол';
    desktopStatus('ошибка Fallout');
  }
  async function quit(reason) {
    if (closing) return;
    closing = true;
    try {
      if (diag.saveMount) await diag.syncSaves();
      host.finished = true;
      if (window.pcGameQuit) window.pcGameQuit(reason);
      else location.href = '/pc/';
    } catch (error) { closing = false; fail(error); }
  }
  function completed(code) {
    host.mainPending = false;
    if (code !== undefined && code !== null && code !== 0) { fail('Игра завершилась с кодом ' + code); return; }
    diag.stage = 'exited';
    quit('fallout main returned');
  }
  function rejected(error) {
    if (error && error.name === 'ExitStatus' && error.status === 0) completed(0);
    else fail(error);
  }
  // CE keeps the runtime alive, so onExit alone cannot detect the native menu's Exit.
  // Asyncify.whenDone resolves only after the sleeping native main actually returns.
  var callMain = runtime.callMain;
  runtime.callMain = function () {
    var result;
    try { result = callMain.apply(runtime, arguments); }
    catch (error) {
      if (error !== 'unwind') { rejected(error); return; }
    }
    var asyncify = window.Asyncify;
    if (asyncify && asyncify.currData) {
      host.mainPending = true;
      if (asyncify.asyncPromiseHandlers) {
        var previous = asyncify.asyncPromiseHandlers;
        asyncify.asyncPromiseHandlers = {
          resolve: function (code) { try { previous.resolve(code); } finally { completed(code); } },
          reject: function (error) { try { previous.reject(error); } finally { rejected(error); } }
        };
      } else asyncify.whenDone().then(completed, rejected);
    } else if (result && typeof result.then === 'function') result.then(completed, rejected);
    else completed(result);
    return result;
  };
  var onExit = runtime.onExit;
  runtime.onExit = function (code) { if (onExit) onExit(code); completed(code); };
  get('cancel').addEventListener('click', function () { quit('fallout cancelled'); });
  get('retry').addEventListener('click', function () { location.reload(); });

  // Embedded keyboard capture is owned by embed.js and works even with canvas focus.
  function tick() {
    if (closing) return;
    var stage = diag.stage;
    if (stage === 'ready' && !loading) { loading = true; diag.loadGame(); }
    if (stage === 'loaded' && !starting && !document.hidden) { starting = true; get('start').click(); }
    var ratio = Math.max(0, Math.min(1, Number(get('progress').value) || 0));
    var percent = Math.floor(ratio * 100);
    get('meter-fill').style.width = percent + '%';
    document.querySelector('.meter').setAttribute('aria-valuenow', String(percent));
    if (diag.totalBytes) get('transfer').textContent = percent + '% · ' + Math.floor(ratio * diag.totalBytes / 1048576) + ' из ' + Math.ceil(diag.totalBytes / 1048576) + ' МБ';
    if (stage !== lastStage) {
      lastStage = stage;
      if (stage === 'loading') { get('message').textContent = 'Загрузка Fallout…'; desktopStatus('загрузка Fallout…'); }
      if (stage === 'loaded') get('message').textContent = 'Запуск Fallout…';
      if (stage === 'running') {
        get('overlay').classList.add('hidden');
        if (window.pcEmbedRunning) window.pcEmbedRunning();
        desktopStatus('running');
      }
      if (stage === 'error') fail(get('error').textContent || 'Ошибка запуска Fallout.');
    }
  }
  document.addEventListener('visibilitychange', tick);
  setInterval(tick, 150);
  tick();
})();
