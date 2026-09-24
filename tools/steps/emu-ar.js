// Имитируем широкий телевизор: ядро сделало буфер 16:9 — коробка обязана пойти за ним.
const canvas = document.querySelector('canvas.emu__canvas');
const screenEl = document.querySelector('.emu__screen');
const ar = () => {
  const r = screenEl.getBoundingClientRect();
  return `${Math.round(r.width)}x${Math.round(r.height)} ar=${(r.width / r.height).toFixed(3)} var=${screenEl.style.getPropertyValue('--emu-ar')}`;
};
const out = ['before: buf=' + canvas.width + 'x' + canvas.height + ' box=' + ar()];
canvas.width = 1920;
canvas.height = 1080;
await new Promise((r) => setTimeout(r, 400));
out.push('after 16:9 buffer: box=' + ar());
canvas.width = 1920;
canvas.height = 1440;
await new Promise((r) => setTimeout(r, 400));
out.push('back to 4:3 buffer: box=' + ar());
return out;
