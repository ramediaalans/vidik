// Режим «игра на экране ПК»: страница игры открыта во фрейме рабочего стола /pc/ (параметр ?embed=1).
// Подключается первым скриптом в <head>, чтобы перехват клавиши F стоял раньше обработчиков движков.
(function () {
  var q = new URLSearchParams(location.search);
  // Выход из игры (пункт «Выход» в меню самой игры): на экране ПК — закрыть окно игры и вернуться на рабочий стол,
  // на отдельной странице — вернуться в клуб. Вызывают страницы игр, когда движок завершился.
  var quitting = false;
  window.pcGameQuit = function (why) {
    if (quitting) return; quitting = true;
    try { console.warn('[pc-quit]', why || ''); } catch (e) {}
    try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) {}
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    setTimeout(function () {
      var h = null; try { if (window.parent !== window && window.parent.pcDesk) h = window.parent.pcDesk; } catch (e) {}
      if (h) h.close(); else location.href = '/pc/';
    }, 60);
  };
  if (!q.has('embed')) return;
  var host = null;
  try { if (window.parent !== window && window.parent.pcDesk) host = window.parent.pcDesk; } catch (e) { host = null; }
  window.PC_EMBED = true;
  var root = document.documentElement;
  root.classList.add('embed');

  var css = [
    'html.embed,html.embed body{margin:0;height:100%;background:#000;overflow:hidden}',
    'html.embed header.top,html.embed .mobile-block,html.embed main>h1,html.embed .panel .meta,html.embed #vidik-back,html.embed #fs,html.embed #file{display:none!important}',
    'html.embed .desk{display:block!important}',
    'html.embed main{max-width:none!important;padding:0!important;margin:0!important}',
    'html.embed .stage{position:fixed!important;inset:0;border:0!important;max-height:none!important;max-width:none!important;aspect-ratio:auto!important;width:100%!important;height:100%!important;margin:0!important;background:#000}',
    // js-dos сам вписывает canvas с сохранением пропорций (inline left/width) — его canvas не растягиваем
    'html.embed .stage canvas:not(.jsdos-rso canvas){width:100%!important;height:100%!important;object-fit:contain;outline:none}',
    // окно загрузки в стиле Windows 98
    'html.embed .panel{position:fixed!important;left:50%;top:50%;transform:translate(-50%,-50%);z-index:50;width:min(92%,440px);margin:0!important;padding:28px 12px 12px!important;background:#c0c0c0!important;color:#000!important;border:0!important;box-shadow:inset -1px -1px #0a0a0a,inset 1px 1px #fff,inset -2px -2px #808080,inset 2px 2px #dfdfdf,0 8px 30px rgba(0,0,0,.6);font:12px/1.4 Tahoma,"MS Sans Serif","Microsoft Sans Serif",Arial,sans-serif!important}',
    'html.embed .panel::before{content:"' + (document.title.split(' — ')[0] || 'Загрузка') + '";position:absolute;left:3px;right:3px;top:3px;height:18px;padding:0 6px;background:linear-gradient(90deg,#000080,#1084d0);color:#fff;font:700 12px/18px Tahoma,Arial,sans-serif;white-space:nowrap;overflow:hidden}',
    'html.embed .panel p{margin:4px 0 10px}',
    'html.embed .panel button{background:#c0c0c0!important;color:#000!important;text-transform:none!important;font:12px Tahoma,Arial,sans-serif!important;padding:5px 14px!important;margin:0 6px 4px 0;box-shadow:inset -1px -1px #0a0a0a,inset 1px 1px #fff,inset -2px -2px #808080,inset 2px 2px #dfdfdf}',
    'html.embed .panel button:active{box-shadow:inset 1px 1px #0a0a0a,inset -1px -1px #fff,inset 2px 2px #808080}',
    'html.embed .panel progress{height:16px}',
    'html.embed.pc-running .panel{display:none!important}'
  ].join('\n');
  var st = document.createElement('style'); st.textContent = css; (document.head || root).appendChild(st);

  // F (на русской раскладке «А» — та же физическая клавиша) — полный экран экрана ПК. Игра эту клавишу не получает.
  function isF(e) { return (e.code === 'KeyF' || e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') && !e.ctrlKey && !e.altKey && !e.metaKey && e.isTrusted; }
  function swallow(e) { e.preventDefault(); e.stopImmediatePropagation(); }
  window.addEventListener('keydown', function (e) { if (!isF(e)) return; swallow(e); if (!e.repeat && host) host.toggleFullscreen(); }, true);
  window.addEventListener('keyup', function (e) { if (isF(e)) swallow(e); }, true);
  window.addEventListener('keypress', function (e) { if (isF(e)) swallow(e); }, true);

  // ?mousey=0 — мышь только поворачивает (Wolf3D, Doom): вертикальное движение мыши в игру не передаём,
  // иначе движок двигает героя вперёд/назад. Настоящее событие гасим и отправляем копию с movementY=0.
  // ?mousey=inv — вертикаль мыши перевёрнута (Duke3D: в игре нет настройки «не инвертировать обзор»).
  var mouseYMode = q.get('mousey');
  if (mouseYMode === '0' || mouseYMode === 'inv') {
    var inv = mouseYMode === 'inv';
    var fixY = null;
    var mouseFilter = function (e) {
      if (!e.isTrusted) return;
      if (fixY === null) fixY = { c: e.clientY, s: e.screenY };
      e.stopImmediatePropagation(); e.preventDefault();
      var dy = inv ? -(e.movementY || 0) : 0;
      if (inv) { fixY.c += dy; fixY.s += dy; } // «виртуальный» курсор движется по Y в обратную сторону
      var init = { bubbles: true, cancelable: true, composed: true, view: window,
        clientX: e.clientX, clientY: fixY.c, screenX: e.screenX, screenY: fixY.s,
        movementX: e.movementX, movementY: dy, button: e.button, buttons: e.buttons,
        ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, metaKey: e.metaKey };
      if (e.pointerId !== undefined) { init.pointerId = e.pointerId; init.pointerType = e.pointerType; init.isPrimary = e.isPrimary; init.width = e.width; init.height = e.height; init.pressure = e.pressure; }
      var copy = new e.constructor(e.type, init);
      (e.target || window).dispatchEvent(copy);
    };
    window.addEventListener('mousemove', mouseFilter, true);
    window.addEventListener('pointermove', mouseFilter, true);
    window.addEventListener('pointerrawupdate', function (e) { if (e.isTrusted) e.stopImmediatePropagation(); }, true);
  }

  // статус игры → заголовок окна на рабочем столе; «запущена» → убрать окно загрузки
  var startId = q.get('start') || 'go';
  var clicked = false, t0 = Date.now(), lastStatus = '';
  function running() { if (!root.classList.contains('pc-running')) { root.classList.add('pc-running'); if (host) host.status('running'); } }
  function tick() {
    var s = document.getElementById('status') || document.getElementById('msg');
    var text = s ? (s.textContent || '').trim() : '';
    if (text !== lastStatus) { lastStatus = text; if (host && text) host.status(text); }
    if (/запустилась|запущена/i.test(text)) setTimeout(running, 600);
    // Diablo (DiabloWeb): своего #status нет, признак запуска — класс .App.started
    if (document.querySelector('.App.started')) running();
    if (!clicked) {
      var b = document.getElementById(startId);
      if (b && !b.hidden && b.offsetParent !== null) { clicked = true; b.click(); }
    }
    if (Date.now() - t0 < 600000 && !root.classList.contains('pc-running')) setTimeout(tick, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick); else tick();
  window.pcEmbedRunning = running;
})();
