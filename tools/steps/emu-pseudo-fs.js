// Эмулируем фуллскрин без Fullscreen API: headless Chrome его не даёт,
// но резкое изменение размера контейнера воспроизводит ту же ситуацию.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
const geom = () => {
  const c = q('.emu__canvas');
  const r = c.getBoundingClientRect();
  return {
    buffer: `${c.width}x${c.height}`,
    css: `${Math.round(r.width)}x${Math.round(r.height)}`,
    at: `${Math.round(r.left)},${Math.round(r.top)}`
  };
};
const report = { before: geom() };

const frame = q('.emu__frame');
frame.style.cssText =
  'position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:0;border:0;background:#000;';
const screen = q('.emu__screen');
screen.style.cssText =
  'width:min(100vw, calc(100vh * 4 / 3));height:min(100vh, calc(100vw * 3 / 4));border-radius:0;';

await sleep(2500);
report.after = geom();
report.viewport = `${window.innerWidth}x${window.innerHeight}`;
await sleep(2500);
return report;
