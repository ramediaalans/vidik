// Имитация полного экрана на большом мониторе: Fullscreen API в headless недоступен,
// но геометрия получается та же: 4:3 на весь экран.
// С --mismatch воспроизводит старое поведение (буфер меньше CSS).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
const report = {};
const MISMATCH = location.hash === '#mismatch';

const skip = q('.boot__skip') || Array.from(document.querySelectorAll('.boot button'))[0];
if (skip) skip.click();
await sleep(800);

const cart = q('.cart');
if (cart) cart.click();
for (let i = 0; i < 60; i += 1) {
  if (q('.emu__canvas')?.width > 16 && !q('.emu__overlay')) break;
  await sleep(500);
}
await sleep(3000);

const style = document.createElement('style');
style.textContent = `
.fs-sim { position: fixed; inset: 0; z-index: 9999; display: grid; place-items: center;
  padding: 0; border: 0; border-radius: 0; background: #000; }
.fs-sim .crt__screen { width: min(100vw, calc(100vh * 4 / 3)); height: min(100vh, calc(100vw * 3 / 4));
  max-width: 100vw; max-height: 100vh; border-radius: 0; box-shadow: none; }
`;
document.head.appendChild(style);
q('.emu__frame').classList.add('fs-sim');

await sleep(2500);

if (MISMATCH) {
  const s = q('.emu__screen').getBoundingClientRect();
  window.__vidikEmu?.resize({ width: Math.round(s.width * 0.75), height: Math.round(s.height * 0.75) });
  await sleep(2000);
}

const c = q('.emu__canvas');
const r = c.getBoundingClientRect();
report.buffer = `${c.width}x${c.height}`;
report.cssSize = `${c.clientWidth}x${c.clientHeight}`;
report.rect = `${Math.round(r.width)}x${Math.round(r.height)} @ ${Math.round(r.left)},${Math.round(r.top)}`;
report.match = c.width === c.clientWidth && c.height === c.clientHeight;
report.mismatchMode = MISMATCH;
await sleep(1500);
return report;
