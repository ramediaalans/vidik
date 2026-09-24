// Два вопроса разом: не включается ли кассетник сам при старте игры
// и что происходит с геометрией канваса в полном экране.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
const report = {};

const skip = q('.boot__skip') || Array.from(document.querySelectorAll('.boot button'))[0];
if (skip) skip.click();
await sleep(800);

report.webampBefore = Boolean(q('#webamp'));

const cart = q('.cart');
if (cart) cart.click();

for (let i = 0; i < 60; i += 1) {
  if (q('.emu__canvas')?.width > 16 && !q('.emu__overlay')) break;
  await sleep(500);
}
await sleep(4000);

report.webampAfterLaunch = Boolean(q('#webamp'));
report.taskbarPlaying = Boolean(q('.taskbar--playing'));
report.taskbarText = q('.taskbar__text')?.textContent ?? null;
report.activeElement = document.activeElement?.className || document.activeElement?.tagName || null;

const geom = (label) => {
  const c = q('.emu__canvas');
  const s = q('.emu__screen');
  const r = c.getBoundingClientRect();
  const sr = s.getBoundingClientRect();
  report[label] = {
    buffer: `${c.width}x${c.height}`,
    clientCss: `${c.clientWidth}x${c.clientHeight}`,
    rect: `${Math.round(r.width)}x${Math.round(r.height)} @ ${Math.round(r.left)},${Math.round(r.top)}`,
    screenRect: `${Math.round(sr.width)}x${Math.round(sr.height)}`,
    dpr: window.devicePixelRatio
  };
};

geom('window');

try {
  await q('.emu__frame').requestFullscreen();
} catch (error) {
  report.fsError = String(error);
}
await sleep(3500);
report.fullscreenActive = Boolean(document.fullscreenElement);
geom('fullscreen');
return report;
