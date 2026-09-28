// Заглушки плеера живут только внутри состояний React (ad, loading, paused,
// ended, error), поэтому в пробе собираем ту же разметку руками.
return await (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(1200);

  const poster = '/films/salon/matrica-1999-bg.webp';
  const cases = [
    ['ad', '<span class="mono">Подготавливаем кассету…</span>', false],
    ['paused', '<button class="btn btn--primary">Продолжить ▶</button>', true],
    ['ended', '<span class="mono">Просмотр завершён</span><button class="btn btn--primary">Смотреть сначала ↻</button>', true],
    ['error', '<span class="mono">Плеер не отвечает. Попробуйте обновить страницу.</span>', true]
  ];

  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:2%;top:4%;width:96%;z-index:9999;display:grid;grid-template-columns:1fr 1fr;gap:12px';
  host.innerHTML = cases
    .map(
      ([state, body, withPoster]) =>
        `<div class="vplayer"><div class="vplayer__privacy vplayer__privacy--${state}"${
          withPoster
            ? ` style="background-image:linear-gradient(rgba(0,0,0,.62), rgba(0,0,0,.82)), url(${poster})"`
            : ''
        }>` +
        '<video class="vplayer__noise" src="/video/vhs-noise.mp4" poster="/video/vhs-noise-poster.webp" muted loop playsinline></video>' +
        `${body}</div></div>`
    )
    .join('');
  document.body.appendChild(host);

  const videos = [...host.querySelectorAll('video')];
  for (const v of videos) {
    v.muted = true;
    await v.play().catch(() => undefined);
  }
  await sleep(1500);
  const marks = videos.map((v) => v.currentTime);
  await sleep(900);

  return {
    состояний: cases.length,
    источник: videos[0].currentSrc.split('/').pop(),
    размерКадра: [videos[0].videoWidth, videos[0].videoHeight],
    играютВсе: videos.every((v, i) => !v.paused && v.currentTime > marks[i]),
    ошибки: videos.filter((v) => v.error).length,
    прозрачность: videos.map((v) => getComputedStyle(v).opacity),
    поверхШума: [...host.querySelectorAll('.mono, .btn')].every(
      (el) => Number(getComputedStyle(el).zIndex) >= 2
    )
  };
})();
