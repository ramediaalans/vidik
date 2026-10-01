/* Параллакс фона клуба: колесо мыши (вне экрана ПК) и движение курсора смещают фон относительно ПК. */
(function () {
  var bg = document.querySelector('.club-bg');
  if (!bg || !window.requestAnimationFrame) return;
  var mq = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  var screen = document.getElementById('screen');
  var gamewin = document.getElementById('gamewin');
  var RANGE = 56;            // макс. смещение по прокрутке, px
  var MX = 16, MY = 10;      // макс. смещение от курсора, px
  var scrollT = 0, mxT = 0, myT = 0;  // цели
  var sx = 0, sy = 0;                 // текущее
  var raf = 0;

  function busy() {
    // пока идёт игра — фон стоит, чтобы не отнимать кадры у эмулятора
    return (gamewin && !gamewin.hidden) || document.pointerLockElement || document.fullscreenElement || document.webkitFullscreenElement;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }
  function tick() {
    raf = 0;
    if (busy()) return;
    var tx = -mxT * MX, ty = -scrollT - myT * MY;
    sx += (tx - sx) * 0.08; sy += (ty - sy) * 0.08;
    if (Math.abs(tx - sx) < 0.05 && Math.abs(ty - sy) < 0.05) { sx = tx; sy = ty; }
    else kick();
    bg.style.transform = 'translate3d(' + sx.toFixed(2) + 'px,' + sy.toFixed(2) + 'px,0)';
  }

  addEventListener('wheel', function (e) {
    if ((mq && mq.matches) || busy()) return;
    if (screen && screen.contains(e.target)) return;   // колесо на экране ПК — для игр/меню
    var d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
    scrollT = Math.max(-RANGE, Math.min(RANGE, scrollT + d * 0.12));
    kick();
  }, { passive: true });

  addEventListener('mousemove', function (e) {
    if ((mq && mq.matches) || busy()) return;
    mxT = Math.max(-1, Math.min(1, e.clientX / innerWidth * 2 - 1));
    myT = Math.max(-1, Math.min(1, e.clientY / innerHeight * 2 - 1));
    kick();
  }, { passive: true });

  document.addEventListener('mouseleave', function () { mxT = myT = 0; kick(); });
  if (mq && mq.addEventListener) mq.addEventListener('change', function () {
    if (mq.matches) { scrollT = mxT = myT = 0; kick(); }
  });
})();
