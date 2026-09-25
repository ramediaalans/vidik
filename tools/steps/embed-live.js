return await (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const snap = (t) => ({
    секунда: t,
    текст: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200),
    video: document.querySelectorAll('video').length,
    source: document.querySelectorAll('source').length,
    iframe: document.querySelectorAll('iframe').length,
    кнопок: document.querySelectorAll('button').length,
    длинаHTML: document.documentElement.outerHTML.length
  });

  const out = [snap(0)];
  await sleep(4000);
  out.push(snap(4));
  await sleep(6000);
  out.push(snap(10));

  // попробуем ткнуть в центр — вдруг плеер ждёт клика
  document.body.click();
  await sleep(4000);
  out.push({ ...snap(14), послеКлика: true });

  const v = document.querySelector('video');
  return {
    снимки: out,
    видео: v ? { src: v.currentSrc || v.src, readyState: v.readyState, duration: v.duration } : null
  };
})();
