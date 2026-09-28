// Заглушка рекламной вставки живёт только внутри состояния adBlocked, поэтому
// в пробе собираем ту же разметку руками и смотрим, что помехи реально играют.
return await (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(1200);

  const host = document.createElement('div');
  host.className = 'vplayer';
  host.style.cssText = 'position:fixed;left:5%;top:8%;width:90%;z-index:9999';
  host.innerHTML =
    '<div class="vplayer__privacy vplayer__privacy--ad">' +
    '<video class="vplayer__noise" src="/video/vhs-noise.mp4" poster="/video/vhs-noise-poster.webp" muted loop playsinline></video>' +
    '<span class="mono">Подготавливаем кассету…</span>' +
    '</div>';
  document.body.appendChild(host);

  const video = host.querySelector('video');
  video.muted = true;
  await video.play().catch(() => undefined);
  await sleep(1500);
  const t1 = video.currentTime;
  await sleep(900);

  const label = host.querySelector('.mono');
  const lr = label.getBoundingClientRect();
  const vr = video.getBoundingClientRect();
  return {
    источник: video.currentSrc.split('/').pop(),
    размерКадра: [video.videoWidth, video.videoHeight],
    длительность: Math.round(video.duration * 100) / 100,
    играет: !video.paused && video.currentTime > t1,
    времяСпустя: Math.round(video.currentTime * 100) / 100,
    ошибка: video.error ? video.error.code : null,
    надписьПоверх: lr.top >= vr.top && lr.bottom <= vr.bottom,
    ширинаВидео: Math.round(vr.width)
  };
})();
