/* Versioned club host adapter. Shared frozen assets stay byte-identical; MP2 has an isolated graphics candidate. */
(function () {
  'use strict';
  var state = window.pcBottleHost = { version: 'club-bottleship-v17', phase: 'preparing', events: [], errors: [], ready: false, firstPresent: false, exited: false };
  var get = function (id) { return document.getElementById(id); };
  var query = new URLSearchParams(location.search), qaMute = query.has('qaMute');
  var supportedGames = {
    'age-of-empires-full': { title: 'Age of Empires', icon: 'aoe.ico' },
    'heroes3-full': { title: 'Heroes III Complete', icon: 'heroes3.ico' },
    'max-payne-full': { title: 'Max Payne', icon: 'max-payne.ico' },
    'max-payne2-full': { title: 'Max Payne 2', icon: 'max-payne2.ico', worker: 'emulator.worker-mp2-gfx-f8790126-v1.js' },
    'generals-full': { title: 'C&C Generals', icon: 'generals.ico' },
    'renegade-full': { title: 'C&C Renegade', icon: 'renegade.ico' },
    'starcraft-full-ru': { title: 'StarCraft FULL RU 1.16.1', icon: 'starcraft.ico' },
    'stronghold-full-ru': { title: 'Stronghold FULL RU', icon: 'stronghold.ico', worker: 'emulator.worker-stronghold-exit-6c542f4c73cb-v1.js' },
    'rtcw-full-ru': { title: 'Return to Castle Wolfenstein FULL RU', icon: 'rtcw.ico' },
    'nfsu-full': { title: 'Need for Speed Underground', icon: 'nfsu.ico' }
  };
  var selectedGame = Object.prototype.hasOwnProperty.call(supportedGames, query.get('game')) ? supportedGames[query.get('game')] : null;
  if (selectedGame) {
    document.title = selectedGame.title + ' — Компьютерный клуб';
    get('bs-dialog').setAttribute('data-game-title', selectedGame.title);
    get('bs-dialog').setAttribute('aria-label', 'Запуск ' + selectedGame.title);
    get('bs-icon').setAttribute('href', '/pc/icons/' + selectedGame.icon);
  }
  try { qaMute = qaMute || new URLSearchParams(parent.location.search).has('qaMute'); } catch (_) { /* Standalone. */ }
  function status(text) { try { if (parent !== window && parent.pcDesk) parent.pcDesk.status(text); } catch (_) { /* Standalone. */ } }
  function fail(error) {
    stopExitWatch();
    state.phase = 'error'; state.errors.push(String(error && error.message || error));
    get('bs-message').textContent = state.firstPresent ? 'Игра остановлена.' : 'Не удалось запустить игру.';
    get('bs-error').textContent = state.errors[state.errors.length - 1];
    get('bs-error').hidden = false; get('bs-retry').hidden = false; get('bs-cancel').disabled = false;
    get('bs-cancel').textContent = 'На рабочий стол';
    get('bs-overlay').hidden = false;
    status('ошибка запуска');
  }
  function quit() {
    if (state.exited) return;
    stopExitWatch(); state.exited = true;
    if (window.pcGameQuit) window.pcGameQuit('bottleship exit'); else location.href = '/pc/';
  }
  // AoE's frozen runtime can fault in DefWindowProcA after native PostQuitMessage(0).
  // Recover only that proved teardown, never black pixels, FPS=0, or a missing window alone.
  var exitWatch = null, exitProbeBusy = false;
  function stopExitWatch() {
    if (exitWatch !== null) { clearInterval(exitWatch); exitWatch = null; }
  }
  function unsignedValue(value) {
    if (value === null || value === undefined || value === '') return null;
    var number = Number(value); return Number.isFinite(number) ? number >>> 0 : null;
  }
  function sameAoeTeardownFault(fault) {
    if (!fault || fault.lastThunk !== 'user32:DefWindowProcA') return false;
    if (unsignedValue(fault.eip) === 0 && unsignedValue(fault.faultAddr) === 0xffffffe8 && unsignedValue(fault.gameEsp) === 0xffffffe8) return true;
    // Fatal reports may name the emulator's interrupt handler; require the latest enriched guest fault, not an old trace.
    var latest = Array.isArray(fault.faults) ? fault.faults[fault.faults.length - 1] : null;
    return !!latest && unsignedValue(latest.eip) === 0 && unsignedValue(latest.faultAddr) === 0xffffffe8 &&
      unsignedValue(latest.gameEsp) === 0xffffffe8 && latest.lastThunk === 'user32:DefWindowProcA' &&
      Array.isArray(latest.recentCalls) && latest.recentCalls.some(function (call) {
        return /user32:PostQuitMessage\(arg0=0x0\).* -> 0x0$/.test(call);
      });
  }
  function cleanAoeTeardown(report) {
    if (!report || !Array.isArray(report.faults) || (report.crash && !sameAoeTeardownFault(report.crash))) return null;
    return report.faults.find(function (fault) {
      return sameAoeTeardownFault(fault) && Array.isArray(fault.recentCalls) && fault.recentCalls.some(function (call) {
        return /user32:PostQuitMessage\(arg0=0x0\).* -> 0x0$/.test(call);
      });
    }) || null;
  }
  async function completeAoeQuit(harness, fault, nativeExit) {
    if (state.exited) return;
    state.phase = 'closing'; stopExitWatch();
    state.exit = { code: 0, crashed: false, source: 'aoe-postquit-cleanup', recoveredTeardown: true,
      nativeExitCode: nativeExit ? nativeExit.exitCode : null, nativeCrashed: nativeExit ? !!nativeExit.crashed : false,
      fault: { eip: fault.eip, faultAddr: fault.faultAddr, gameEsp: fault.gameEsp, lastThunk: fault.lastThunk } };
    get('bs-message').textContent = 'Сохранение данных и выход…';
    get('bs-retry').hidden = true; get('bs-cancel').disabled = true;
    get('bs-overlay').hidden = false; status('выход…');
    var flushed = await harness.rpc('fsFlush', [], { timeoutMs: 15000 });
    if (!flushed || flushed.flushed !== true) throw Error('Синхронизация файлов не подтверждена.');
    if (state.exited || state.phase !== 'closing') return;
    state.exit.filesFlushed = true; state.phase = 'exited'; quit();
  }
  async function verifyAoeCrashExit(message) {
    stopExitWatch(); state.phase = 'checking-exit';
    var harness = window.__BS__ && window.__BS__.harness;
    try {
      if (!harness || typeof harness.rpc !== 'function') throw Error('Проверка завершения недоступна.');
      // A real in-game crash must not be normalized merely because its code is ACCESS_VIOLATION.
      if (message.fault && !sameAoeTeardownFault(message.fault)) throw Error('Другой сбой движка.');
      var snapshot = await harness.rpc('state', [['windows']], { timeoutMs: 4000 });
      var report = await harness.rpc('report', [], { timeoutMs: 4000 });
      var fault = cleanAoeTeardown(report);
      if (state.exited) return;
      if (!snapshot || !Array.isArray(snapshot.windows) || snapshot.windows.length || !fault) throw Error('Штатный выход не подтверждён.');
      await completeAoeQuit(harness, fault, message);
    } catch (error) {
      if (state.exited) return;
      if (state.phase === 'closing') fail('Не удалось сохранить данные перед выходом: ' + String(error && error.message || error));
      else fail('Игра завершилась с ошибкой (' + message.exitCode + ').');
    }
  }
  async function inspectNativeExit() {
    if (exitProbeBusy || state.exited || state.phase !== 'running' || state.gameId !== 'app:age-of-empires') return;
    var harness = window.__BS__ && window.__BS__.harness;
    if (!harness || typeof harness.rpc !== 'function') return;
    exitProbeBusy = true;
    try {
      var snapshot = await harness.rpc('state', [['windows']], { timeoutMs: 4000 });
      if (!snapshot || !Array.isArray(snapshot.windows) || snapshot.windows.length) return;
      var report = await harness.rpc('report', [], { timeoutMs: 4000 });
      var fault = cleanAoeTeardown(report);
      if (!fault || state.exited || state.phase !== 'running') return;
      await completeAoeQuit(harness, fault, null);
    } catch (error) {
      if (state.phase === 'closing') fail('Не удалось сохранить данные перед выходом: ' + String(error && error.message || error));
      else state.lifecycleProbeError = String(error && error.message || error).slice(0, 240);
    } finally { exitProbeBusy = false; }
  }
  function startExitWatch() {
    if (exitWatch === null && query.get('game') === 'age-of-empires-full') exitWatch = setInterval(inspectNativeExit, 1000);
  }
  window.addEventListener('pagehide', stopExitWatch);
  // Stronghold-only diagnostics: keep a fatal exit fatal; never read guest files or saves.
  function exitFaultSummary(fault, depth) {
    if (!fault || typeof fault !== 'object' || depth > 2) return null;
    var out = {};
    ['reason', 'eip', 'faultAddr', 'errorCode', 'threadId', 'lastThunk', 'gameEsp'].forEach(function (key) {
      if (typeof fault[key] === 'number' || typeof fault[key] === 'boolean') out[key] = fault[key];
      else if (typeof fault[key] === 'string') out[key] = fault[key].slice(0, 1200);
    });
    ['recentCalls', 'backtrace', 'callStack', 'stackTrace'].forEach(function (key) {
      if (Array.isArray(fault[key])) out[key] = fault[key].slice(-80).filter(function (v) { return typeof v === 'string'; }).map(function (v) { return v.slice(0, 1200); });
    });
    if (fault.regs && typeof fault.regs === 'object') {
      out.regs = {};
      ['eax', 'ebx', 'ecx', 'edx', 'esi', 'edi', 'esp', 'ebp', 'eip', 'eflags'].forEach(function (key) {
        if (typeof fault.regs[key] === 'number' || typeof fault.regs[key] === 'string') out.regs[key] = String(fault.regs[key]).slice(0, 32);
      });
    }
    if (Array.isArray(fault.faults)) out.faults = fault.faults.slice(-8).map(function (f) { return exitFaultSummary(f, depth + 1); });
    return out;
  }
  function captureStrongholdExit(message) {
    if (query.get('game') !== 'stronghold-full-ru' || state.gameId !== 'app:stronghold-full-ru-v1' ||
        !(message.crashed || message.exitCode)) return;
    var diagnostic = state.exitDiagnostic = {
      format: 'stronghold-exit-v1', host: state.version, gameId: state.gameId,
      worker: state.runtimeWorker, capturedAt: new Date().toISOString(), firstPresent: state.firstPresent,
      exitCode: unsignedValue(message.exitCode), crashed: !!message.crashed,
      fault: exitFaultSummary(message.fault, 0),
      flushError: typeof message.flushError === 'string' ? message.flushError.slice(0, 1200) : null,
      events: state.events.slice(-20), reportStatus: 'unavailable'
    };
    get('bs-diagnostic').hidden = false;
    var harness = window.__BS__ && window.__BS__.harness;
    if (!harness || typeof harness.rpc !== 'function') return;
    diagnostic.reportStatus = 'pending';
    Promise.resolve().then(function () { return harness.rpc('report', [], { timeoutMs: 4000 }); }).then(function (report) {
      diagnostic.report = exitFaultSummary(report, 0);
      diagnostic.crash = exitFaultSummary(report && report.crash, 0);
      diagnostic.reportStatus = 'captured';
    }).catch(function () { diagnostic.reportStatus = 'unavailable'; });
  }
  get('bs-diagnostic').addEventListener('click', function () {
    if (!state.exitDiagnostic) return;
    var blob = new Blob([JSON.stringify(state.exitDiagnostic, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = 'stronghold-exit-report.json';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });

  function receive(message) {
    if (!message || typeof message.type !== 'string') return;
    if (!['ready', 'loading_progress', 'install_progress', 'first_present', 'process_exit', 'error', 'bundle_meta', 'app_resize'].includes(message.type)) return;
    state.events.push({ type: message.type, phase: message.phase, percent: message.percent, at: Date.now() });
    if (state.events.length > 50) state.events.shift();
    if (message.type === 'ready') { state.ready = true; state.phase = 'loading'; }
    if (message.type === 'bundle_meta') { state.gameId = message.gameId; }
    if (message.type === 'app_resize') { state.guest = { width: message.width, height: message.height }; }
    if (message.type === 'loading_progress' || message.type === 'install_progress') {
      var percent = Number(message.percent);
      if (message.totalBytes > 0) percent = message.doneBytes / message.totalBytes * 100;
      state.phase = String(message.phase || 'loading');
      get('bs-message').textContent = /boot|start|done/.test(state.phase) ? 'Запуск игры…' : /install|cach/.test(state.phase) ? 'Подготовка игровых файлов…' : 'Загрузка игры…';
      if (Number.isFinite(percent)) {
        percent = Math.max(0, Math.min(100, percent));
        get('bs-fill').style.width = percent + '%';
        get('bs-meter').setAttribute('aria-valuenow', String(Math.floor(percent)));
        get('bs-transfer').textContent = Math.floor(percent) + '%';
      }
      status('загрузка…');
    }
    if (message.type === 'first_present') {
      state.phase = 'running'; state.firstPresent = true;
      get('bs-overlay').hidden = true; document.body.classList.add('bs-running');
      var canvas = document.querySelector('canvas[class*="app__canvas"]'); if (canvas) canvas.focus();
      if (window.pcEmbedRunning) window.pcEmbedRunning(); status('running'); startExitWatch();
    }
    if (message.type === 'error') fail(message.message || 'Ошибка движка.');
    if (message.type === 'process_exit') {
      captureStrongholdExit(message);
      state.exit = { code: message.exitCode, crashed: !!message.crashed };
      if (message.crashed || message.exitCode) {
        if (query.get('game') === 'age-of-empires-full' && state.gameId === 'app:age-of-empires' &&
            state.firstPresent && unsignedValue(message.exitCode) === 0xc0000005) return verifyAoeCrashExit(message);
        fail('Игра завершилась с ошибкой (' + message.exitCode + ').');
      }
      else { state.phase = 'exited'; quit(); }
    }
  }
  // Observe the public worker protocol; do not patch the compiled emulator.
  var NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(url, options) {
      // Keep the accepted UI/main/CSS and all non-MP2 workers unchanged.
      var isEmulator = String(url).includes('emulator.worker-BloCnTYL.js');
      var effectiveUrl = isEmulator && selectedGame && selectedGame.worker ? '/assets/' + selectedGame.worker : url;
      super(effectiveUrl, options);
      if (isEmulator) {
        state.runtimeWorker = String(effectiveUrl);
        this.addEventListener('message', function (event) { return receive(event.data); });
        this.addEventListener('error', function (event) { fail(event.message || 'Ошибка игрового процесса.'); });
      }
    }
  };
  get('bs-cancel').addEventListener('click', quit);
  get('bs-retry').addEventListener('click', function () {
    // A failed durability barrier must be retried in the same worker, not by unloading its data.
    if (state.exit && state.exit.recoveredTeardown && !state.exit.filesFlushed && !state.exited) {
      state.phase = 'running'; get('bs-retry').hidden = true;
      return inspectNativeExit();
    }
    location.reload();
  });
  window.addEventListener('error', function (event) { fail(event.message || 'Ошибка загрузки.'); });
  window.addEventListener('unhandledrejection', function (event) { fail(event.reason || 'Ошибка загрузки.'); });
  async function boot() {
    try {
      if (!crossOriginIsolated || typeof SharedArrayBuffer === 'undefined') throw Error('Откройте игру через компьютерный клуб. Не удалось включить изоляцию игрового окна.');
      if (!navigator.gpu || !await navigator.gpu.requestAdapter()) throw Error('Для этой игры нужен WebGPU. Откройте сайт в актуальном Chrome или Edge с доступным графическим ускорением.');
      if (!selectedGame) throw Error('Игра пока не подключена к этому стенду.');
      if (qaMute) {
        var key = 'bottleship_ui_settings_v1', settings = {};
        try { settings = JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) { /* Empty settings. */ }
        settings.muted = true; localStorage.setItem(key, JSON.stringify(settings));
      }
      await import('/assets/index-jyZ66EUc.js');
    } catch (error) { fail(error); }
  }
  boot();
})();
