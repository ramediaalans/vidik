// Включить телевизор и дождаться картинки с YouTube.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);

const skip = q('.boot__skip') || Array.from(document.querySelectorAll('.boot button'))[0];
if (skip) skip.click();
await sleep(800);

const guideRows = document.querySelectorAll('.guide__row').length;
const nowRow = q('.guide__row.is-now');

q('.tv__power')?.click();
for (let i = 0; i < 60; i += 1) {
  if (q('.tv__mount iframe') && !q('.tv__overlay')) break;
  await sleep(500);
}
await sleep(6000);

const iframe = q('.tv__mount iframe');
const box = iframe?.getBoundingClientRect();
return {
  guideRows,
  nowRow: nowRow ? nowRow.textContent.trim().slice(0, 80) : null,
  osd: q('.tv__osd')?.textContent.trim() ?? null,
  onAir: Array.from(document.querySelectorAll('.tv .mono'))
    .map((n) => n.textContent.trim())
    .find((t) => t.startsWith('Сейчас в эфире')) ?? null,
  iframe: iframe ? `${Math.round(box.width)}x${Math.round(box.height)} ${iframe.src.slice(0, 60)}` : null,
  overlay: q('.tv__overlay')?.textContent.trim() ?? null,
  channels: Array.from(document.querySelectorAll('.channel')).map((b) => b.textContent.trim().slice(0, 60))
};
