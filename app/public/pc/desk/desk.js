// Компьютерный клуб: рабочий стол «Windows 98» на экране ПК, запуск игр во фрейме, полный экран (F/А), геймпад.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var screenEl = $('screen'), desk = $('desktop'), iconsEl = $('icons'), menu = $('startmenu'), startBtn = $('start'),
      tasks = $('tasks'), gw = $('gamewin'), toastEl = $('toast'), gwStatus = $('gw-status');
  var games = [], sel = 0, msel = -1, cur = null, minimized = false;
  var kb = navigator.keyboard;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var toastT = 0;
  function toast(text, ms) {
    toastEl.textContent = text; toastEl.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.hidden = true; }, ms || 3500);
  }

  // ---------- масштаб рабочего стола под экран ----------
  function layout() {
    var W = screenEl.clientWidth, H = screenEl.clientHeight;
    if (!W || !H) return;
    var k = Math.min(W / 512, H / 384);
    screenEl.style.setProperty('--k', k.toFixed(4));
    desk.style.width = (W / k) + 'px';
    desk.style.height = (H / k) + 'px';
    // игра в окне рисуется как минимум в 640 px ширины и уменьшается под экран ПК; в полном экране — 1:1
    screenEl.style.setProperty('--gs', Math.min(1, W / 640).toFixed(4));
  }
  if (window.ResizeObserver) new ResizeObserver(layout).observe(screenEl); else window.addEventListener('resize', layout);
  layout();

  function isFs() { return document.fullscreenElement === screenEl; }
  function lockKeys() { if (isFs() && cur && kb && kb.lock) kb.lock(['Escape']).catch(function () {}); }
  function unlockKeys() { if (kb && kb.unlock) kb.unlock(); }
  document.addEventListener('fullscreenchange', function () {
    layout();
    if (isFs()) { lockKeys(); toast(cur ? 'Полный экран. Выход — F (или удерживайте Esc)' : 'Полный экран. Выход — F или Esc', 3000); }
    else unlockKeys();
    focusGame();
  });
  function toggleFullscreen() {
    if (document.fullscreenElement) { document.exitFullscreen().catch(function () {}); return; }
    if (!screenEl.requestFullscreen) { toast('Браузер не поддерживает полный экран'); return; }
    screenEl.requestFullscreen({ navigationUI: 'hide' }).catch(function (e) { toast('Полный экран недоступен: ' + e.message); });
  }

  // ---------- часы ----------
  function clock() { var d = new Date(); $('clock').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); }
  clock(); setInterval(clock, 15000);

  // ---------- значки и меню «Пуск» ----------
  function render() {
    iconsEl.innerHTML = games.map(function (g, i) {
      return '<button class="icon" role="option" data-i="' + i + '" title="' + esc(g.title + ' (' + g.year + ') — ' + (g.note || '')) + '"><img src="/pc/' + esc(g.icon) + '" alt=""><span>' + esc(g.label || g.title) + '</span></button>';
    }).join('');
    $('menu-games').innerHTML = games.map(function (g, i) {
      return '<button class="menu-item" data-i="' + i + '"><img src="/pc/' + esc(g.icon) + '" alt="">' + esc(g.title) + '</button>';
    }).join('');
    select(0);
  }
  function select(i) {
    sel = i;
    for (var j = 0; j < iconsEl.children.length; j++) iconsEl.children[j].classList.toggle('sel', j === i);
  }
  function rows() {
    var els = iconsEl.children; if (!els.length) return 1;
    var x = els[0].offsetLeft, n = 0;
    for (var j = 0; j < els.length && els[j].offsetLeft === x; j++) n++;
    return n || 1;
  }
  function move(dx, dy) {
    var n = games.length; if (!n) return;
    var i = sel + dy + dx * rows();
    if (i < 0 || i >= n) { if (!dy) return; i = Math.max(0, Math.min(n - 1, i)); }
    select(i);
  }
  function menuItems() { return Array.prototype.slice.call(menu.querySelectorAll('.menu-item')); }
  function menuSel(i) { var it = menuItems(); msel = (i + it.length) % it.length; it.forEach(function (e, j) { e.classList.toggle('sel', j === msel); }); }
  function openMenu() { menu.classList.add('open'); startBtn.classList.add('on'); menuSel(0); }
  function closeMenu() { menu.classList.remove('open'); startBtn.classList.remove('on'); menuItems().forEach(function (e) { e.classList.remove('sel'); }); msel = -1; }
  function menuOpen() { return menu.classList.contains('open'); }

  iconsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.icon'); if (!b) return;
    select(+b.dataset.i); launch(games[+b.dataset.i]);
  });
  startBtn.addEventListener('click', function () { menuOpen() ? closeMenu() : openMenu(); });
  menu.addEventListener('click', function (e) {
    var b = e.target.closest('.menu-item'); if (!b) return;
    if (b.dataset.i) { closeMenu(); launch(games[+b.dataset.i]); }
    else if (b.dataset.act === 'fs') { closeMenu(); toggleFullscreen(); }
  });
  document.addEventListener('mousedown', function (e) {
    if (menuOpen() && !menu.contains(e.target) && !startBtn.contains(e.target)) closeMenu();
    if (gameVisible() && !e.target.closest('a,button')) setTimeout(focusGame, 0);
  });

  // ---------- окно игры ----------
  function gameVisible() { return !!cur && !minimized; }
  function focusGame() {
    if (!gameVisible()) return;
    try { cur.iframe.focus(); cur.iframe.contentWindow.focus(); } catch (e) {}
  }
  function gameUrl(g) {
    var p = g.page;
    return '/pc/' + p + (p.indexOf('?') >= 0 ? '&' : '?') + 'embed=1' + (g.start ? '&start=' + encodeURIComponent(g.start) : '') + (g.mouseY === false ? '&mousey=0' : g.mouseY === 'invert' ? '&mousey=inv' : '');
  }
  function launch(g) {
    if (!g) return;
    closeMenu();
    if (cur && cur.g === g) { restore(); return; }
    if (cur) closeGame();
    var f = document.createElement('iframe');
    f.src = gameUrl(g);
    f.setAttribute('allow', 'autoplay; fullscreen; gamepad');
    f.title = g.title;
    f.addEventListener('load', function () { if (cur && cur.iframe === f) focusGame(); });
    $('gw-body').appendChild(f);
    $('gw-ico').src = '/pc/' + g.icon;
    $('gw-title').textContent = g.title;
    gwStatus.textContent = '— загрузка…';
    var t = document.createElement('button');
    t.className = 'task bevel on';
    t.innerHTML = '<img src="/pc/' + esc(g.icon) + '" alt=""><span>' + esc(g.label || g.title) + '</span>';
    t.addEventListener('click', function () { minimized ? restore() : minimize(); });
    tasks.appendChild(t);
    cur = { g: g, iframe: f, task: t };
    minimized = false; gw.hidden = false;
    pad.reset();
    lockKeys();
  }
  function minimize() {
    if (!cur) return;
    pad.releaseAll(); minimized = true; gw.hidden = true; cur.task.classList.remove('on');
    unlockKeys(); window.focus();
  }
  function restore() {
    if (!cur) return;
    minimized = false; gw.hidden = false; cur.task.classList.add('on'); lockKeys(); focusGame();
  }
  function closeGame() {
    if (!cur) return;
    pad.releaseAll();
    var f = cur.iframe;
    try { f.src = 'about:blank'; } catch (e) {}
    setTimeout(function () { f.remove(); }, 50);
    cur.task.remove();
    cur = null; minimized = false; gw.hidden = true;
    unlockKeys(); window.focus();
  }
  gw.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    if (b.dataset.act === 'min') minimize();
    else if (b.dataset.act === 'fs') toggleFullscreen();
    else if (b.dataset.act === 'close') closeGame();
  });
  function status(text) {
    if (!cur) return;
    if (text === 'running') { gwStatus.textContent = ''; return; }
    text = String(text).replace(/\s+/g, ' ').trim();
    gwStatus.textContent = text ? '— ' + (text.length > 70 ? text.slice(0, 68) + '…' : text) : '';
  }

  // ---------- клавиатура на рабочем столе ----------
  function isF(e) {
    return (e.code === 'KeyF' || e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') && !e.ctrlKey && !e.altKey && !e.metaKey;
  }
  window.addEventListener('keydown', function (e) {
    if (isF(e)) { e.preventDefault(); if (!e.repeat) toggleFullscreen(); return; }
    if (gameVisible()) return;
    var k = e.key;
    if (menuOpen()) {
      if (k === 'ArrowDown') menuSel(msel + 1);
      else if (k === 'ArrowUp') menuSel(msel - 1);
      else if (k === 'Enter' && msel >= 0) menuItems()[msel].click();
      else if (k === 'Escape') closeMenu();
      else return;
      e.preventDefault(); return;
    }
    if (k === 'ArrowLeft') move(-1, 0);
    else if (k === 'ArrowRight') move(1, 0);
    else if (k === 'ArrowUp') move(0, -1);
    else if (k === 'ArrowDown') move(0, 1);
    else if (k === 'Enter') launch(games[sel]);
    else if (k === 'Meta' || k === 'OS') openMenu();
    else return;
    e.preventDefault();
  });

  // ---------- геймпад ----------
  // Движки DOS/Xash/ioquake3/Diablo геймпад сами не понимают, поэтому кнопки превращаются в нажатия клавиш во фрейме игры.
  // Профиль native — игра читает геймпад сама (Doom через RetroArch), маппер только слушает Home / Back+Start.
  var KEYS = {
    KeyW: [87, 'w'], KeyA: [65, 'a'], KeyS: [83, 's'], KeyD: [68, 'd'], KeyE: [69, 'e'], KeyR: [82, 'r'], KeyL: [76, 'l'],
    KeyJ: [74, 'j'], KeyK: [75, 'k'], KeyB: [66, 'b'], KeyI: [73, 'i'], KeyC: [67, 'c'], KeyY: [89, 'y'], KeyZ: [90, 'z'],
    Space: [32, ' '], ControlLeft: [17, 'Control'], ShiftLeft: [16, 'Shift'], AltLeft: [18, 'Alt'], Enter: [13, 'Enter'],
    Escape: [27, 'Escape'], Tab: [9, 'Tab'], ArrowUp: [38, 'ArrowUp'], ArrowDown: [40, 'ArrowDown'], ArrowLeft: [37, 'ArrowLeft'],
    ArrowRight: [39, 'ArrowRight'], PageUp: [33, 'PageUp'], PageDown: [34, 'PageDown'], BracketLeft: [219, '['], BracketRight: [221, ']'],
    Comma: [188, ','], Period: [190, '.'], Digit1: [49, '1'], Digit2: [50, '2'], Digit3: [51, '3'], Digit4: [52, '4'],
    Numpad4: [100, '4'], Numpad6: [102, '6']
  };
  // самый большой видимый canvas фрейма (в Diablo первыми идут скрытые 28×28 из тач-панели)
  function mainCanvas(d) {
    var best = null, area = 0, list = d.querySelectorAll('canvas');
    for (var i = 0; i < list.length; i++) { var r = list[i].getBoundingClientRect(), a = r.width * r.height; if (a > area) { area = a; best = list[i]; } }
    return best;
  }
  function btn(p, i) { var b = p.buttons[i]; return !!b && (b.pressed || b.value > 0.5); }
  function ax(p, i) { var v = p.axes[i] || 0; return Math.abs(v) < 0.12 ? 0 : v; }
  function addIf(out, cond, codes) { if (cond) for (var i = 0; i < codes.length; i++) out.push(codes[i]); }

  // карта: номер кнопки стандартного геймпада → клавиши
  var FPS_BTNS = { 0: ['Space', 'Enter'], 1: ['ControlLeft'], 2: ['KeyR'], 3: ['KeyE'], 4: ['BracketLeft'], 5: ['BracketRight'], 6: ['KeyK'], 7: ['KeyJ'], 8: ['KeyL'], 9: ['Escape'], 10: ['ShiftLeft'], 12: ['ArrowUp'], 13: ['ArrowDown'], 14: ['ArrowLeft'], 15: ['ArrowRight'] };
  function merge(base, over) { var o = {}, k; for (k in base) o[k] = base[k]; for (k in over) o[k] = over[k]; return o; }
  var PROFILES = {
    hl: { btns: FPS_BTNS, sticks: fpsSticks },
    cs: { btns: merge(FPS_BTNS, { 8: ['KeyB'], 12: ['Digit1'], 15: ['Digit2'], 13: ['Digit3'], 14: ['Digit4'] }), sticks: fpsSticks },
    q3: { btns: merge(FPS_BTNS, { 2: ['BracketRight'], 8: ['Tab'] }), sticks: fpsSticks },
    wolf3d: { btns: { 0: ['ControlLeft', 'Enter'], 1: ['Space'], 2: ['Enter'], 3: ['ShiftLeft'], 4: ['AltLeft'], 5: ['AltLeft'], 6: ['AltLeft'], 7: ['ControlLeft'], 8: ['KeyY'], 9: ['Escape'], 12: ['ArrowUp'], 13: ['ArrowDown'], 14: ['ArrowLeft'], 15: ['ArrowRight'] },
      sticks: function (p, out) { var lx = ax(p, 0), ly = ax(p, 1), rx = ax(p, 2); addIf(out, ly < -0.45, ['ArrowUp']); addIf(out, ly > 0.45, ['ArrowDown']); addIf(out, lx < -0.45, ['ArrowLeft']); addIf(out, lx > 0.45, ['ArrowRight']); addIf(out, rx < -0.35, ['Numpad4']); addIf(out, rx > 0.35, ['Numpad6']); } },
    duke3d: { btns: { 0: ['KeyA'], 1: ['Space'], 2: ['KeyZ'], 3: ['Enter'], 4: ['BracketLeft'], 5: ['BracketRight'], 6: ['ShiftLeft'], 7: ['ControlLeft'], 8: ['Tab'], 9: ['Escape'], 12: ['ArrowUp'], 13: ['ArrowDown'], 14: ['ArrowLeft'], 15: ['ArrowRight'] },
      sticks: function (p, out) { var lx = ax(p, 0), ly = ax(p, 1), rx = ax(p, 2); addIf(out, ly < -0.45, ['ArrowUp']); addIf(out, ly > 0.45, ['ArrowDown']); addIf(out, lx < -0.45, ['Comma']); addIf(out, lx > 0.45, ['Period']); addIf(out, rx < -0.35, ['Numpad4']); addIf(out, rx > 0.35, ['Numpad6']); } },
    diablo: { btns: { 2: ['KeyI'], 3: ['KeyC'], 4: ['KeyS'], 5: ['KeyB'], 8: ['Tab'], 9: ['Escape'], 12: ['Digit1'], 15: ['Digit2'], 13: ['Digit3'], 14: ['Digit4'] }, sticks: function () {}, mouse: true }
  };
  function fpsSticks(p, out) {
    var lx = ax(p, 0), ly = ax(p, 1), rx = ax(p, 2), ry = ax(p, 3);
    addIf(out, ly < -0.45, ['KeyW']); addIf(out, ly > 0.45, ['KeyS']); addIf(out, lx < -0.45, ['KeyA']); addIf(out, lx > 0.45, ['KeyD']);
    addIf(out, rx < -0.35, ['ArrowLeft']); addIf(out, rx > 0.35, ['ArrowRight']); addIf(out, ry < -0.5, ['PageUp']); addIf(out, ry > 0.5, ['PageDown']);
  }

  var pad = (function () {
    var held = {}, mouseHeld = {}, prevBtns = [], padId = '', dirLast = null, dirNext = 0, cursor = null, lastT = 0;
    function frameCtx() {
      if (!gameVisible()) return null;
      try { var w = cur.iframe.contentWindow, d = cur.iframe.contentDocument; if (!w || !d || !d.body) return null; return { w: w, d: d }; } catch (e) { return null; }
    }
    function target(c) {
      var a = c.d.activeElement;
      if (a && a !== c.d.body && a !== c.d.documentElement && a.tagName !== 'IFRAME') return a;
      return mainCanvas(c.d) || c.d.body;
    }
    function key(type, code) {
      var c = frameCtx(), def = KEYS[code]; if (!c || !def) return;
      var ev = new c.w.KeyboardEvent(type, { key: def[1], code: code, bubbles: true, cancelable: true, composed: true, location: /Left$/.test(code) ? 1 : 0 });
      Object.defineProperty(ev, 'keyCode', { get: function () { return def[0]; } });
      Object.defineProperty(ev, 'which', { get: function () { return def[0]; } });
      target(c).dispatchEvent(ev);
    }
    function canvasRect(c) { var cv = mainCanvas(c.d); return cv ? { el: cv, r: cv.getBoundingClientRect() } : null; }
    function mouse(type, button) {
      var c = frameCtx(); if (!c) return; var cr = canvasRect(c); if (!cr) return;
      if (!cursor) cursor = { x: cr.r.width / 2, y: cr.r.height / 2 };
      var buttons = (mouseHeld[0] ? 1 : 0) | (mouseHeld[2] ? 2 : 0);
      var init = { bubbles: true, cancelable: true, composed: true, view: c.w, clientX: cr.r.left + cursor.x, clientY: cr.r.top + cursor.y, button: button || 0, buttons: buttons };
      cr.el.dispatchEvent(new c.w.MouseEvent(type, init));
      if (type === 'mouseup' && button === 2) cr.el.dispatchEvent(new c.w.MouseEvent('contextmenu', init));
    }
    function releaseAll() {
      for (var code in held) key('keyup', code);
      held = {};
      for (var b in mouseHeld) if (mouseHeld[b]) { mouseHeld[b] = false; mouse('mouseup', +b); }
    }
    function reset() { held = {}; mouseHeld = {}; cursor = null; }
    function getPad() {
      var list = [];
      try { list = Array.prototype.slice.call(navigator.getGamepads() || []); } catch (e) {}
      var c = frameCtx();
      if (c) {
        try {
          var l2 = c.w.navigator.getGamepads() || [];
          for (var i = 0; i < l2.length; i++) { var a = list[i], b = l2[i]; if (b && (!a || b.timestamp > a.timestamp)) list[i] = b; }
        } catch (e) {}
      }
      var p = null;
      for (var j = 0; j < list.length; j++) if (list[j] && list[j].connected) { if (list[j].mapping === 'standard') return list[j]; if (!p) p = list[j]; }
      return p;
    }
    function announce(p) {
      var id = p ? p.id : '';
      if (id === padId) return;
      padId = id;
      $('tray-pad').classList.toggle('on', !!p);
      var h = $('hint-pad');
      if (p) { h.textContent = '🎮 геймпад подключён: A — запуск, Start — меню, Home или Back+Start — закрыть игру'; h.className = 'pad-on'; toast('Геймпад подключён: ' + id.replace(/\s*\(.*$/, '').slice(0, 40)); }
      else { h.textContent = '🎮 подключите геймпад и нажмите любую кнопку'; h.className = ''; toast('Геймпад отключён'); }
    }
    function desktopPad(p, edge, now) {
      var lx = ax(p, 0), ly = ax(p, 1);
      var dir = btn(p, 12) || ly < -0.5 ? 'u' : btn(p, 13) || ly > 0.5 ? 'd' : btn(p, 14) || lx < -0.5 ? 'l' : btn(p, 15) || lx > 0.5 ? 'r' : null;
      var act = false;
      if (dir !== dirLast) { act = !!dir; dirNext = now + 380; dirLast = dir; }
      else if (dir && now >= dirNext) { act = true; dirNext = now + 140; }
      if (menuOpen()) {
        if (act && dir === 'u') menuSel(msel - 1);
        if (act && dir === 'd') menuSel(msel + 1);
        if (edge(0) && msel >= 0) menuItems()[msel].click();
        if (edge(1) || edge(9)) closeMenu();
        return;
      }
      if (act) move(dir === 'l' ? -1 : dir === 'r' ? 1 : 0, dir === 'u' ? -1 : dir === 'd' ? 1 : 0);
      if (edge(0)) launch(games[sel]);
      if (edge(9)) openMenu();
      if (edge(1) && cur && minimized) restore();
    }
    function gamePad(p, edge, now, dt) {
      var prof = PROFILES[cur.g.pad];
      if (!prof) return; // native: игра читает геймпад сама
      var combo = btn(p, 8) && btn(p, 9);
      var want = [];
      if (!combo) {
        for (var b in prof.btns) if (btn(p, +b)) want = want.concat(prof.btns[b]);
        prof.sticks(p, want);
      }
      var set = {}, i, code;
      for (i = 0; i < want.length; i++) set[want[i]] = true;
      for (code in held) if (!set[code]) { key('keyup', code); delete held[code]; }
      for (code in set) if (!held[code]) { held[code] = true; key('keydown', code); }
      if (prof.mouse) {
        var c = frameCtx(), cr = c && canvasRect(c);
        if (cr) {
          if (!cursor) cursor = { x: cr.r.width / 2, y: cr.r.height / 2 };
          var lx = ax(p, 0), ly = ax(p, 1);
          if (lx || ly) {
            var sp = cr.r.width * 0.9 * dt;
            cursor.x = Math.max(0, Math.min(cr.r.width - 1, cursor.x + lx * Math.abs(lx) * sp));
            cursor.y = Math.max(0, Math.min(cr.r.height - 1, cursor.y + ly * Math.abs(ly) * sp));
            mouse('mousemove', 0);
          }
          var L = !combo && (btn(p, 0) || btn(p, 7)), R = !combo && (btn(p, 1) || btn(p, 6));
          if (L !== !!mouseHeld[0]) { mouseHeld[0] = L; mouse(L ? 'mousedown' : 'mouseup', 0); }
          if (R !== !!mouseHeld[2]) { mouseHeld[2] = R; mouse(R ? 'mousedown' : 'mouseup', 2); }
        }
      }
    }
    function loop(now) {
      requestAnimationFrame(loop);
      var dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0; lastT = now;
      var p = getPad();
      announce(p);
      if (!p) { prevBtns = []; return; }
      var pressed = p.buttons.map(function (b, i) { return btn(p, i); });
      var edge = function (i) { return pressed[i] && !prevBtns[i]; };
      if (cur && (edge(16) || (pressed[8] && pressed[9] && (edge(8) || edge(9))))) { closeGame(); toast('Игра закрыта'); }
      else if (gameVisible()) gamePad(p, edge, now, dt);
      else desktopPad(p, edge, now);
      prevBtns = pressed;
    }
    requestAnimationFrame(loop);
    return { releaseAll: releaseAll, reset: reset };
  })();

  window.addEventListener('blur', function () { /* фокус ушёл во фрейм игры — это нормально */ });
  window.pcDesk = { toggleFullscreen: toggleFullscreen, status: status, close: closeGame, minimize: minimize, launch: function (id) { launch(games.filter(function (g) { return g.id === id; })[0]); } };

  // ---------- запуск ----------
  fetch('/pc/games.json').then(function (r) { return r.json(); }).then(function (list) {
    games = list.filter(function (g) { return g.status === 'playable' && g.icon; });
    render();
    var q = new URLSearchParams(location.search).get('game');
    if (q) window.pcDesk.launch(q);
  }).catch(function () { toast('Не удалось загрузить список игр', 10000); });

  var first = !sessionStorage.getItem('pc-boot');
  setTimeout(function () {
    screenEl.classList.remove('off');
    if (first) { sessionStorage.setItem('pc-boot', '1'); screenEl.classList.add('boot'); setTimeout(function () { screenEl.classList.remove('boot'); }, 1200); }
  }, first ? 350 : 0);
})();
