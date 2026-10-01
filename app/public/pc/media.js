/* Откуда грузить данные игр (pc/games/): локально — с этого же сервера, на сайте — из R2 (media.art-ai.studio/pc/).
   ?media=local — принудительно с текущего домена, ?media=r2 — принудительно из R2.
   pcFetchGame(путь, onProgress) — скачивание с прогрессом; файл сохраняется в Cache Storage браузера,
   повторный запуск без скачивания. pcProgress / pcProgressDone / pcProgressError — плашка «Загрузка игры». */
(function () {
  var R2 = 'https://media.art-ai.studio/pc/';
  var h = location.hostname, s = location.search, top = '';
  try { top = window.top.location.search; } catch (e) {}
  var q = s + '&' + top;
  var local = /^(localhost|127\.|10\.|192\.168\.|\[::1\])/.test(h);
  if (/[?&]media=local/.test(q)) local = true;
  if (/[?&]media=r2/.test(q)) local = false;
  window.PC_MEDIA = local ? '/pc/' : R2;

  var CACHE = 'pc-games-v1';
  function abs(p) { return /^(https?:)?\//.test(p) ? p : window.PC_MEDIA + p; }

  window.pcFetchGame = async function (path, onProgress) {
    var url = abs(path), cache = null;
    try {
      if (window.caches) {
        cache = await caches.open(CACHE);
        var hit = await cache.match(url);
        if (hit) { var b = new Uint8Array(await hit.arrayBuffer()); if (onProgress) onProgress(b.length, b.length, true); return b; }
      }
    } catch (e) { cache = null; }
    var r = await fetch(url);
    if (!r.ok) throw new Error(path + ': ' + r.status);
    var total = +r.headers.get('content-length') || 0, out, off = 0;
    if (!total || !r.body) { out = new Uint8Array(await r.arrayBuffer()); off = out.length; if (onProgress) onProgress(off, off); }
    else {
      out = new Uint8Array(total); var rd = r.body.getReader();
      for (;;) {
        var c = await rd.read(); if (c.done) break;
        if (off + c.value.length > out.length) { var n = new Uint8Array(Math.max(out.length * 2, off + c.value.length)); n.set(out.subarray(0, off)); out = n; }
        out.set(c.value, off); off += c.value.length;
        if (onProgress) onProgress(off, total);
      }
      if (off !== out.length) out = out.slice(0, off);
    }
    if (cache) {
      try { await cache.put(url, new Response(out, { headers: { 'Content-Type': 'application/octet-stream' } })); } catch (e) {}
    }
    return out;
  };

  var box = null, last = 0;
  function el() {
    if (box) return box;
    if (!document.body) return null;
    box = document.createElement('div');
    box.id = 'pc-progress';
    box.innerHTML = '<div class="pp-win"><div class="pp-t">Загрузка игры</div><div class="pp-b"><div class="pp-m">Подготовка…</div><div class="pp-bar"><i></i></div><div class="pp-n"></div></div></div>';
    var st = document.createElement('style');
    st.textContent = '#pc-progress{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#000;font:13px Tahoma,Verdana,Arial,sans-serif}' +
      '#pc-progress .pp-win{width:min(420px,86vw);background:#c0c0c0;color:#000;box-shadow:inset -1px -1px #0a0a0a,inset 1px 1px #dfdfdf,inset -2px -2px #808080,inset 2px 2px #fff;padding:3px}' +
      '#pc-progress .pp-t{background:linear-gradient(90deg,#000080,#1084d0);color:#fff;font-weight:700;padding:3px 6px}' +
      '#pc-progress .pp-b{padding:12px 10px 10px}#pc-progress .pp-bar{height:18px;margin:10px 0 6px;background:#fff;box-shadow:inset 1px 1px #808080,inset -1px -1px #dfdfdf;padding:2px}' +
      '#pc-progress .pp-bar i{display:block;height:100%;width:0;background:repeating-linear-gradient(90deg,#000080 0 10px,transparent 10px 12px)}#pc-progress .pp-n{font-size:12px;color:#222}';
    document.head.appendChild(st);
    document.body.appendChild(box);
    return box;
  }
  function mb(n) { return Math.round(n / 1048576); }
  window.pcProgress = function (got, total, fromCache) {
    var now = Date.now(); if (now - last < 120 && got < total) return; last = now;
    var b = el(); if (!b) return;
    b.querySelector('.pp-m').textContent = fromCache ? 'Загружаю из кэша браузера…' : 'Скачиваю файлы игры… (первый раз дольше, потом — из кэша)';
    var p = total ? Math.min(100, got * 100 / total) : 0;
    b.querySelector('.pp-bar i').style.width = p.toFixed(1) + '%';
    b.querySelector('.pp-n').textContent = mb(got) + ' / ' + (total ? mb(total) : '?') + ' МБ' + (total ? ' (' + Math.round(p) + '%)' : '');
  };
  window.pcProgressStep = function (text) { var b = el(); if (b) b.querySelector('.pp-m').textContent = text; };
  window.pcProgressDone = function () { if (box) { box.remove(); box = null; } };
  window.pcProgressError = function (e) {
    var b = el(); if (!b) return;
    b.querySelector('.pp-t').textContent = 'Ошибка';
    b.querySelector('.pp-m').textContent = 'Не удалось загрузить игру: ' + (e && e.message || e) + '. Закройте окно и попробуйте ещё раз.';
  };
})();
