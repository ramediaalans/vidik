// Ноут 240 Гц → телевизор 60 Гц прямо во время игры: ограничитель обязан подстроиться.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
const report = {};

let hz = 144;
let ticks = 0;
window.requestAnimationFrame = (cb) => {
  ticks += 1;
  return setTimeout(() => cb(performance.now()), 1000 / hz);
};

let draws = 0;
for (const Ctor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
  if (!Ctor) continue;
  for (const name of ['drawArrays', 'drawElements']) {
    const orig = Ctor.prototype[name];
    if (!orig) continue;
    Ctor.prototype[name] = function (...args) {
      draws += 1;
      return orig.apply(this, args);
    };
  }
}

const skip = q('.boot__skip') || Array.from(document.querySelectorAll('.boot button'))[0];
if (skip) skip.click();
await sleep(800);
q('.cart')?.click();
for (let i = 0; i < 60; i += 1) {
  if (q('.emu__canvas')?.width > 16 && !q('.emu__overlay')) break;
  await sleep(500);
}
await sleep(3000);

const measure = async (label, seconds = 5) => {
  const t0 = performance.now();
  const d0 = draws;
  const r0 = ticks;
  await sleep(seconds * 1000);
  const s = (performance.now() - t0) / 1000;
  report[label] = {
    displayHz: Math.round((ticks - r0) / s),
    gameFps: Math.round((draws - d0) / s),
    note: q('.emu p.mono')?.textContent ?? null
  };
};

await measure('before144');
hz = 60; // «воткнули телевизор»
await sleep(2500);
await measure('afterTv60');
hz = 240; // «вернулись на ноутбук»
await sleep(2500);
await measure('backTo240');
return report;
