return await (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(2500);

  const tapes = [...document.querySelectorAll('.vhs')];
  const clipped = tapes
    .map((t) => {
      const hand = t.querySelector('.vhs__hand');
      const scr = t.querySelector('.vhs__scribble');
      const win = t.querySelector('.vhs__window');
      const label = t.querySelector('.vhs__label');
      const lr = label.getBoundingClientRect();
      const wr = win.getBoundingClientRect();
      return {
        name: hand.textContent.slice(0, 26),
        текстОбрезан: hand.scrollHeight > hand.clientHeight + 2,
        годВиден: scr.getBoundingClientRect().bottom <= lr.bottom + 1,
        наклейкаНакрылаОкно: lr.bottom > wr.top + 1,
        шрифт: getComputedStyle(hand).fontFamily.split(',')[0]
      };
    })
    .filter((x) => x.текстОбрезан || !x.годВиден || x.наклейкаНакрылаОкно);

  const first = tapes[0]?.getBoundingClientRect();
  return {
    кассет: tapes.length,
    размерПервой: first ? [Math.round(first.width), Math.round(first.height)] : null,
    шрифтНадписи: tapes[0] ? getComputedStyle(tapes[0].querySelector('.vhs__hand')).fontFamily : null,
    проблемные: clipped,
    горизонтальныйСкролл: document.documentElement.scrollWidth > window.innerWidth + 1
  };
})();
