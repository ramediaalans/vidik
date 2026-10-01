/* Откуда грузить данные игр (pc/games/): локально — с этого же сервера, на сайте — из R2 (media.art-ai.studio/pc/).
   ?media=local — принудительно с текущего домена, ?media=r2 — принудительно из R2.
   Использование: PC_MEDIA + 'games/hl/valve.zip'. */
(function () {
  var R2 = 'https://media.art-ai.studio/pc/';
  var h = location.hostname, s = location.search, top = '';
  try { top = window.top.location.search; } catch (e) {}
  var q = s + '&' + top;
  var local = /^(localhost|127\.|10\.|192\.168\.|\[::1\])/.test(h);
  if (/[?&]media=local/.test(q)) local = true;
  if (/[?&]media=r2/.test(q)) local = false;
  window.PC_MEDIA = local ? '/pc/' : R2;
})();
