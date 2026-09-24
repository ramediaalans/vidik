// Что стало с канвасом после входа в полный экран.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
await sleep(2500);

const c = q('.emu__canvas');
const s = q('.emu__screen');
const cs = getComputedStyle(c);
const r = c.getBoundingClientRect();
const sr = s.getBoundingClientRect();
return {
  fullscreenElement: document.fullscreenElement?.className ?? null,
  buffer: `${c.width}x${c.height}`,
  clientCss: `${c.clientWidth}x${c.clientHeight}`,
  canvasRect: `${Math.round(r.width)}x${Math.round(r.height)} @ ${Math.round(r.left)},${Math.round(r.top)}`,
  screenRect: `${Math.round(sr.width)}x${Math.round(sr.height)} @ ${Math.round(sr.left)},${Math.round(sr.top)}`,
  inlineStyle: c.getAttribute('style') || '',
  padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
  computedSize: `${cs.width} x ${cs.height}`,
  viewport: `${window.innerWidth}x${window.innerHeight}`
};
