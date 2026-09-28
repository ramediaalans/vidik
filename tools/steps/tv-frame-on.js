// Проверяем включённый телевизор: iframe плеера ровно в окне кинескопа.
return await (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(800);
  const start = document.querySelector('.vplayer__start');
  if (start) start.click();
  await sleep(2500);

  const screen = document.querySelector('.tvset__screen');
  const player = screen?.firstElementChild;
  const frameImg = document.querySelector('.tvset__frame');
  const sr = screen.getBoundingClientRect();
  const pr = player.getBoundingClientRect();
  const iframe = screen.querySelector('iframe');
  const ir = iframe?.getBoundingClientRect();

  return {
    классПлеера: player.className,
    окно: [Math.round(sr.width), Math.round(sr.height)],
    плеер: [Math.round(pr.width), Math.round(pr.height)],
    iframe: ir ? [Math.round(ir.width), Math.round(ir.height)] : null,
    совпадает: ir ? Math.abs(ir.width - sr.width) < 2 && Math.abs(ir.height - sr.height) < 2 : null,
    рамкаСверху: frameImg ? getComputedStyle(frameImg).zIndex : null,
    наклейка: document.querySelector('.tvset__label')?.innerText.replace(/\s+/g, ' ').trim()
  };
})();
