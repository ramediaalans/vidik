// Просто запустить первый картридж и дождаться картинки.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);

const skip = q('.boot__skip') || Array.from(document.querySelectorAll('.boot button'))[0];
if (skip) skip.click();
await sleep(800);
q('.cart')?.click();
for (let i = 0; i < 60; i += 1) {
  if (q('.emu__canvas')?.width > 16 && !q('.emu__overlay')) break;
  await sleep(500);
}
await sleep(3000);
return { started: Boolean(q('.emu__canvas')), webamp: Boolean(q('#webamp')) };
