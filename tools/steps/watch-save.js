// Закладка пишется сама: запускаем плеер и смотрим, появилась ли секунда в localStorage.
// Нужен интернет: время приходит из событий самого VK/Rutube-плеера.
return await (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const KEY = 'vidik:watch:v1';
  localStorage.removeItem(KEY);
  await sleep(800);

  const play = document.querySelector('.vplayer__start .vplayer__osd');
  if (!play) return { ошибка: 'нет кнопки PLAY' };
  play.click();

  // Закладка пишется только после первой минуты просмотра, поэтому
  // стартуем с заведомо позднего места самим плеером не получится — ждём.
  const deadline = Date.now() + 100_000;
  let raw = null;
  while (Date.now() < deadline) {
    await sleep(2500);
    raw = localStorage.getItem(KEY);
    if (raw && raw.length > 5) break;
  }

  const iframe = document.querySelector('.tvset__screen iframe');
  return {
    запись: raw,
    естьЗакладка: Boolean(raw && raw.length > 5),
    источник: iframe?.getAttribute('src')?.slice(0, 90) ?? null
  };
})();
