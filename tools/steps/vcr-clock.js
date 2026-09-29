// Скроллим к телевизору и возвращаем положение дисплея счётчика деки (x y w h на странице).
return await (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(1200);
  const r = document.querySelector('.vcrclock').getBoundingClientRect();
  return [r.left + scrollX, r.top + scrollY, r.width, r.height].map(Math.round).join(' ');
})();
