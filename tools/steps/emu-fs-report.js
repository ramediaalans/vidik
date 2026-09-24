// Что стало с канвасом после входа в полный экран.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
await sleep(3000);

const c = q('.emu__canvas');
const s = q('.emu__screen');
const cs = getComputedStyle(c);
const r = c.getBoundingClientRect();
const sr = s.getBoundingClientRect();
const gl = c.getContext('webgl2') || c.getContext('webgl');
const vp = gl ? Array.from(gl.getParameter(gl.VIEWPORT)) : null;

const snap = () => {
  const g = c.getContext('webgl2') || c.getContext('webgl');
  return {
    buffer: `${c.width}x${c.height}`,
    viewport: g ? Array.from(g.getParameter(g.VIEWPORT)).join(',') : null
  };
};
const first = snap();
await sleep(2500);
const second = snap();

return {
  fullscreenElement: document.fullscreenElement?.className ?? null,
  buffer: `${c.width}x${c.height}`,
  clientCss: `${c.clientWidth}x${c.clientHeight}`,
  glViewport: vp ? vp.join(',') : null,
  stable: JSON.stringify(first) === JSON.stringify(second),
  first,
  second,
  canvasRect: `${Math.round(r.width)}x${Math.round(r.height)} @ ${Math.round(r.left)},${Math.round(r.top)}`,
  screenRect: `${Math.round(sr.width)}x${Math.round(sr.height)} @ ${Math.round(sr.left)},${Math.round(sr.top)}`,
  inlineStyle: c.getAttribute('style') || '',
  padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
  dpr: window.devicePixelRatio,
  info: window.__vidikEmuInfo ? window.__vidikEmuInfo() : null
};
