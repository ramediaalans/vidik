const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
const report = {};

const skip = q('.boot__skip') || Array.from(document.querySelectorAll('.boot button'))[0];
if (skip) skip.click();
await sleep(800);

const cart = q('.cart');
if (cart) cart.click();
await sleep(1200);

let canvas = null;
for (let i = 0; i < 40; i += 1) {
  canvas = q('.emu__canvas');
  if (canvas && canvas.width > 16 && !q('.emu__overlay')) break;
  await sleep(500);
}
await sleep(4000);

const geom = (label) => {
  const c = q('.emu__canvas');
  const r = c.getBoundingClientRect();
  report[label] = {
    buffer: `${c.width}x${c.height}`,
    css: `${Math.round(r.width)}x${Math.round(r.height)}`,
    at: `${Math.round(r.left)},${Math.round(r.top)}`,
    inline: c.getAttribute('style') || ''
  };
};

geom('window');

const frame = q('.emu__frame');
try {
  await frame.requestFullscreen();
} catch (error) {
  report.fsError = String(error);
}
await sleep(3000);
report.fullscreenActive = Boolean(document.fullscreenElement);
geom('fullscreen');

return report;
