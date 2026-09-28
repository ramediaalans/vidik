// Проверяем, что плеер попадает в окно кинескопа, а наклейка — на кассету.
return await (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(1200);

  const set = document.querySelector('.tvset');
  const frame = document.querySelector('.tvset__frame');
  const screen = document.querySelector('.tvset__screen');
  const label = document.querySelector('.tvset__label');
  if (!set || !screen) return { ошибка: 'нет .tvset на странице' };

  const box = set.getBoundingClientRect();
  const pct = (el) => {
    const r = el.getBoundingClientRect();
    return {
      left: +(((r.left - box.left) / box.width) * 100).toFixed(2),
      top: +(((r.top - box.top) / box.height) * 100).toFixed(2),
      width: +((r.width / box.width) * 100).toFixed(2),
      height: +((r.height / box.height) * 100).toFixed(2)
    };
  };

  const inner = screen.firstElementChild;
  const ir = inner?.getBoundingClientRect();
  const sr = screen.getBoundingClientRect();

  return {
    ширинаРамки: Math.round(box.width),
    пропорцияРамки: +(box.width / box.height).toFixed(3),
    картинкаЗагружена: frame ? frame.naturalWidth > 0 : null,
    размерКартинки: frame ? [frame.naturalWidth, frame.naturalHeight] : null,
    окно: pct(screen),
    наклейка: label ? pct(label) : null,
    текстНаклейки: label ? label.innerText.replace(/\s+/g, ' ').trim() : null,
    шрифтНаклейки: label
      ? getComputedStyle(label.querySelector('.tvset__labelTitle')).fontFamily
      : null,
    плеерВОкне: ir
      ? Math.abs(ir.width - sr.width) < 1.5 && Math.abs(ir.height - sr.height) < 1.5
      : null,
    рамкаНеЛовитКлики: frame ? getComputedStyle(frame).pointerEvents : null,
    слои: {
      окно: getComputedStyle(screen).zIndex,
      рамка: frame ? getComputedStyle(frame).zIndex : null,
      наклейка: label ? getComputedStyle(label).zIndex : null
    }
  };
})();
