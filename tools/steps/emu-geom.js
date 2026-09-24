const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(2500);
const c = document.querySelector('.emu__canvas');
const r = c.getBoundingClientRect();
return {
  fullscreenActive: Boolean(document.fullscreenElement),
  buffer: `${c.width}x${c.height}`,
  css: `${Math.round(r.width)}x${Math.round(r.height)}`,
  at: `${Math.round(r.left)},${Math.round(r.top)}`,
  viewport: `${window.innerWidth}x${window.innerHeight}`
};
