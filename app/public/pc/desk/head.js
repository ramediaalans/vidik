/* Шапка сайта на странице клуба: часы, меню, Esc. Поведение как у Header в src/components/Layout.tsx. */
(function () {
  var head = document.querySelector('.vhead');
  var menu = document.getElementById('vmenu');
  var btn = document.querySelector('.vburger');
  var label = document.querySelector('.vburger__label');
  var clock = document.getElementById('vclock');
  if (!head || !menu || !btn) return;

  function tick() {
    var d = new Date();
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    if (clock) {
      clock.innerHTML = '<i aria-hidden="true">●</i> ' + hh + ':' + mm;
      clock.setAttribute('aria-label', 'Сейчас ' + hh + ':' + mm);
    }
  }
  tick();
  setInterval(tick, 15000);

  var open = false;
  var prevOverflow = '';
  function setOpen(v) {
    open = v;
    head.classList.toggle('is-open', v);
    menu.classList.toggle('is-open', v);
    menu.setAttribute('aria-hidden', String(!v));
    if (v) menu.removeAttribute('inert'); else menu.setAttribute('inert', '');
    btn.setAttribute('aria-expanded', String(v));
    if (label) label.textContent = v ? 'Закрыть' : 'Меню';
    if (v) {
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      var first = menu.querySelector('a');
      if (first) first.focus();
    } else {
      document.body.style.overflow = prevOverflow;
      btn.focus();
    }
  }
  btn.addEventListener('click', function () { setOpen(!open); });
  // Пока меню открыто, клавиши не должны доходить до рабочего стола (F — полный экран и т.д.).
  window.addEventListener('keydown', function (e) {
    if (!open) return;
    if (e.key === 'Escape') setOpen(false);
    if (e.key !== 'Tab' && e.key !== 'Enter') e.stopImmediatePropagation();
  }, true);

  var imgs = menu.querySelectorAll('.vmenu__media img');
  menu.querySelectorAll('[data-img]').forEach(function (a) {
    function show() {
      var src = a.getAttribute('data-img');
      imgs.forEach(function (im) { im.classList.toggle('is-on', im.getAttribute('src') === src); });
    }
    a.addEventListener('mouseenter', show);
    a.addEventListener('focus', show);
  });
})();
