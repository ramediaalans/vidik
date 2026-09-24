// Контрольный замер: обычный монитор 60 Гц. Ограничитель не должен отъедать кадры.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
const report = {};

let ticks = 0;
window.requestAnimationFrame = (cb) => {
  ticks += 1;
  return setTimeout(() => cb(performance.now()), 1000 / 60);
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

const cart = q('.cart');
if (cart) cart.click();

for (let i = 0; i < 60; i += 1) {
  if (q('.emu__canvas')?.width > 16 && !q('.emu__overlay')) break;
  await sleep(500);
}
await sleep(3000);

const t0 = performance.now();
const d0 = draws;
const r0 = ticks;
await sleep(5000);
const seconds = (performance.now() - t0) / 1000;

report.simulatedDisplayHz = Math.round((ticks - r0) / seconds);
report.drawCallsPerSecond = Math.round((draws - d0) / seconds);
report.note = q('.emu p.mono')?.textContent ?? null;
return report;
