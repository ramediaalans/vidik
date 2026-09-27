// Проверка блока «Игры»: сенсорный пульт, слоты памяти, автосохранение.
// Запуск: node tools/probe.mjs --url http://localhost:4173/igry --steps tools/steps/emu-pad-saves.js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const cart = document.querySelector('.cart');
if (!cart) return { error: 'нет картриджей на полке' };
cart.click();

for (let i = 0; i < 80; i += 1) {
  if (window.__vidikEmu) break;
  await sleep(500);
}
if (!window.__vidikEmu) return { error: 'эмулятор не запустился' };
await sleep(4000);

const text = (node) => (node?.textContent ?? '').trim();
const buttons = Array.from(document.querySelectorAll('.emu__controls .btn'));
const quickSave = buttons.find((button) => text(button).startsWith('Быстрое'));
if (quickSave) quickSave.click();
await sleep(2500);

// Смотрим напрямую в базу: именно там окажется сохранёнка, если всё работает.
const records = await new Promise((resolve) => {
  const request = indexedDB.open('vidik-saves');
  request.onsuccess = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains('slots')) return resolve([]);
    const all = db.transaction('slots', 'readonly').objectStore('slots').getAll();
    all.onsuccess = () =>
      resolve(
        all.result.map((item) => ({
          slot: item.slot,
          romId: item.romId,
          state: item.state?.size ?? 0,
          sram: item.sram?.size ?? 0,
          thumb: item.thumb?.size ?? 0,
          playedMs: item.playedMs
        }))
      );
    all.onerror = () => resolve([]);
  };
  request.onerror = () => resolve([]);
});

// Клик мышью в probe.mjs идёт по координатам вьюпорта, поэтому подтягиваем
// кнопку «На весь экран» в видимую часть страницы.
document.querySelector('[data-qa=fullscreen]')?.scrollIntoView({ block: 'center' });
await sleep(600);

return {
  emuRoot: Boolean(document.querySelector('.emu')),
  fsButtonBox: (() => {
    const button = document.querySelector('[data-qa=fullscreen]');
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)} vp ${innerWidth}x${innerHeight}`;
  })(),
  padLeft: document.querySelectorAll('.emu__padSide--left .emu__padBtn').length,
  padRight: document.querySelectorAll('.emu__padSide--right .emu__padBtn').length,
  padCenter: document.querySelectorAll('.emu__padSide--center .emu__padBtn').length,
  controls: buttons.map(text),
  saves: records,
  canvas: (() => {
    const canvas = document.querySelector('.emu__canvas');
    return canvas ? `${canvas.width}x${canvas.height}` : null;
  })()
};
