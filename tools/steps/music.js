// Кассетник: включаем трек на /muzyka, ждём Webamp, переходим в другой раздел
// и проверяем, что музыка не оборвалась.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
const report = { errors: [], bad: [] };

window.addEventListener('error', (e) => report.errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => report.errors.push(String(e.reason)));

const origFetch = window.fetch;
window.fetch = async (...args) => {
  const res = await origFetch(...args);
  if (!res.ok) report.bad.push(`${res.status} ${res.url}`);
  return res;
};

const skip = q('.boot__skip') || Array.from(document.querySelectorAll('.boot button'))[0];
if (skip) skip.click();
await sleep(800);

report.taskbarBefore = Boolean(q('.taskbar'));
report.deckRows = document.querySelectorAll('.deck__row').length;

const playAll = Array.from(document.querySelectorAll('.btn')).find((b) =>
  /Включить всё/.test(b.textContent || '')
);
if (!playAll) {
  report.fatal = 'кнопка «Включить всё подряд» не найдена';
  return report;
}
playAll.click();

for (let i = 0; i < 60; i += 1) {
  if (q('#webamp')) break;
  await sleep(500);
}
report.webampMounted = Boolean(q('#webamp'));
report.webampInAnchor = Boolean(q('.webamp-anchor #webamp'));
report.webampParent = q('#webamp')?.parentElement?.className ?? q('#webamp')?.parentElement?.tagName ?? null;
report.webampZIndex = q('#webamp') ? getComputedStyle(q('#webamp')).zIndex : null;
report.webampPosition = q('#webamp') ? getComputedStyle(q('#webamp')).position : null;

await sleep(4000);
const audio = document.querySelector('audio');
report.audioSrc = audio ? audio.currentSrc.split('/').pop() : null;
const t1 = audio ? audio.currentTime : 0;
await sleep(2500);
const t2 = audio ? audio.currentTime : 0;
report.audioAdvanced = Number((t2 - t1).toFixed(2));
report.audioPaused = audio ? audio.paused : null;
report.taskbarPlaying = Boolean(q('.taskbar--playing'));
report.taskbarText = q('.taskbar__text')?.textContent ?? null;

// Часы в окне Webamp — честный признак, что звук реально идёт.
const digits = () =>
  Array.from(document.querySelectorAll('#webamp .character, #webamp .digit'))
    .map((el) => el.className)
    .join('|');
const dg1 = digits();
await sleep(2500);
report.webampClockMoves = digits() !== dg1;

// Сворачивание не должно глушить звук.
q('.taskbar__side')?.click();
await sleep(600);
report.hiddenClass = document.body.classList.contains('webamp-hidden');
report.webampDisplay = q('#webamp') ? getComputedStyle(q('#webamp')).display : null;
q('.taskbar__side')?.click();
await sleep(400);

// Переход в другой раздел через SPA-ссылку.
const link = Array.from(document.querySelectorAll('a[href]')).find((a) =>
  /\/(kino|tv|igry|shtuki)/.test(a.getAttribute('href') || '')
);
report.navTo = link ? link.getAttribute('href') : null;
if (link) link.click();
await sleep(2500);

report.pathAfter = location.pathname;
report.webampAfterNav = Boolean(q('#webamp'));
const audio2 = document.querySelector('audio');
const t3 = audio2 ? audio2.currentTime : 0;
await sleep(2500);
report.audioAdvancedAfterNav = audio2 ? Number((audio2.currentTime - t3).toFixed(2)) : null;
report.taskbarAfterNav = Boolean(q('.taskbar'));
report.taskbarPlayingAfterNav = Boolean(q('.taskbar--playing'));
report.taskbarTextAfterNav = q('.taskbar__text')?.textContent ?? null;
return report;
