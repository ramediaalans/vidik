// Проверяем заметку «докуда досмотрели»: пишем закладку, уходим со страницы
// и возвращаемся — плеер должен предложить продолжить и стартовать с той же секунды.
return await (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const AT = 1234;
  const slug = location.pathname.split('/').pop();
  const click = (sel) => {
    const el = document.querySelector(sel);
    if (!el) throw new Error(`нет элемента ${sel}`);
    el.click();
    return true;
  };

  localStorage.setItem('vidik:watch:v1', JSON.stringify({ [slug]: { t: AT, at: Date.now() } }));

  // SPA-навигация туда-обратно: так карточка пересобирается и закладка читается заново.
  const section = location.pathname.split('/')[1];
  click(`a[href="/${section}"]`);
  await sleep(2500);
  const link = document.querySelector(`a[href$="/${slug}"]`);
  if (!link) return { ошибка: 'нет ссылки на карточку', ссылки: [...document.querySelectorAll('a')].slice(0, 12).map((a) => a.getAttribute('href')) };
  link.click();
  await sleep(1500);

  const note = document.querySelector('.vplayer__osdNote')?.textContent?.trim() ?? null;
  const sub = document.querySelector('.vplayer__osdSub')?.textContent?.trim() ?? null;

  click('.vplayer__start .vplayer__osd');
  await sleep(1800);
  const src = document.querySelector('.tvset__screen iframe')?.getAttribute('src') ?? '';
  const t = Number(/[?&]t=(\d+)/.exec(src)?.[1] ?? /[?&]start=(\d+)/.exec(src)?.[1] ?? -1);

  return {
    slug,
    закладка: AT,
    надпись: note,
    кнопкаСНачала: sub,
    секундаВiframe: t,
    совпало: t === AT,
    вХранилище: localStorage.getItem('vidik:watch:v1')
  };
})();
