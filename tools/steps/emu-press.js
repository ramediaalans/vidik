const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
const report = {};

const skip = q('.boot__skip') || Array.from(document.querySelectorAll('.boot button'))[0];
if (skip) skip.click();
await sleep(800);

const cart = q('.cart');
if (cart) cart.click();

for (let i = 0; i < 40; i += 1) {
  if (q('.emu__canvas')?.width > 16 && !q('.emu__overlay')) break;
  await sleep(500);
}
await sleep(4000);

const emu = window.__vidikEmu;
report.hook = Boolean(emu);
if (emu) {
  for (let i = 0; i < 2; i += 1) {
    await emu.press({ button: 'start' });
    await sleep(1500);
  }
  emu.pressDown({ button: 'right' });
  await sleep(1200);
  emu.pressUp({ button: 'right' });
  await sleep(2500);
}

report.overlay = q('.emu__overlay')?.textContent ?? null;
return report;
