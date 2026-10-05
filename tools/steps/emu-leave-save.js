// Автосохранение при уходе со страницы игры: запускаем картридж, уходим по ссылке
// внутри SPA и проверяем, что в IndexedDB появился свежий автослот.
// Запуск: node tools/probe.mjs --url http://localhost:4173/igry/contra --steps tools/steps/emu-leave-save.js --wait 90000
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const q = (s) => document.querySelector(s);

const readSlots = () =>
  new Promise((resolve) => {
    const request = indexedDB.open('vidik-saves');
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('slots')) return resolve([]);
      const all = db.transaction('slots', 'readonly').objectStore('slots').getAll();
      all.onsuccess = () => resolve(all.result.map((r) => ({ key: r.key, state: r.state?.size ?? 0, savedAt: r.savedAt })));
      all.onerror = () => resolve([]);
    };
    request.onerror = () => resolve([]);
  });

(q('.boot__skip') || document.querySelector('.boot button'))?.click();
for (let i = 0; i < 40 && !q('.emu__overlay--start button'); i += 1) await sleep(500);
q('.emu__overlay--start button')?.click();
for (let i = 0; i < 80 && !window.__vidikEmu; i += 1) await sleep(500);
if (!window.__vidikEmu) return { error: 'эмулятор не запустился' };
await sleep(5000);

const before = await readSlots();
const leftAt = Date.now();
const link = Array.from(document.querySelectorAll('a[href="/videosalon"]'))[0];
if (!link) return { error: 'нет ссылки на /videosalon' };
link.click();
await sleep(7000);
const after = await readSlots();
const fresh = after.filter((r) => r.key.endsWith('::auto') && r.savedAt >= leftAt);
return { path: location.pathname, before, after, freshAuto: fresh.length, emuCanvasGone: !q('.emu__canvas') };
