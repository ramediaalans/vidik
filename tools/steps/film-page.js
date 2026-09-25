return await (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(2500);

  const btn = document.querySelector('.vplayer__start');
  const before = {
    заголовок: document.querySelector('h1')?.textContent,
    постер: !!document.querySelector('.film-poster'),
    кнопка: btn?.textContent ?? null,
    чипов: document.querySelectorAll('.film-meta .chip').length,
    описание: (document.querySelector('.film-text p')?.textContent ?? '').length
  };

  let claimed = false;
  window.addEventListener('vidik:audio-claim', () => (claimed = true));
  btn?.click();
  await sleep(7000);

  const mount = document.querySelector('.vplayer__mount');
  const ifr = mount?.querySelector('iframe');
  const r = document.querySelector('.vplayer')?.getBoundingClientRect();
  return {
    before,
    звукПерехвачен: claimed,
    iframe: ifr ? ifr.src : null,
    размерПлеера: r ? [Math.round(r.width), Math.round(r.height)] : null,
    размерiframe: ifr ? [Math.round(ifr.getBoundingClientRect().width), Math.round(ifr.getBoundingClientRect().height)] : null
  };
})();
