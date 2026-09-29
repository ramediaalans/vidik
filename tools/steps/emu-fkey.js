// F / «А» переключают полный экран; на десктопе пульта нет. Оставляет игру в полном экране (для скриншота).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
for (let i = 0; i < 40 && !q('.cart'); i += 1) await sleep(500);
const want = location.hash.slice(1);
const re = want === 'md' ? /Mega Drive/i : want === 'snes' ? /Super Nintendo/i : /Dendy/i;
Array.from(document.querySelectorAll('.cart')).find((c) => re.test(c.getAttribute('aria-label') || '')).click();
for (let i = 0; i < 80 && !window.__vidikEmu; i += 1) await sleep(500);
await sleep(2500);
const key = (type, k, code) => window.dispatchEvent(new KeyboardEvent(type, { key: k, code, bubbles: true, cancelable: true }));
const state = () => ({
  fs: Boolean(q('.emu--fs') || document.fullscreenElement),
  native: Boolean(document.fullscreenElement),
  tvImg: q('.emu__tvImg') && getComputedStyle(q('.emu__tvImg')).display,
  tpad: q('.tpad') && getComputedStyle(q('.tpad')).display,
  screen: (() => { const r = q('.crt__screen').getBoundingClientRect(); return `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`; })()
});
const out = { before: state() };
key('keydown', 'f', 'KeyF'); key('keyup', 'f', 'KeyF');
await sleep(1500);
out.afterF = state();
key('keydown', 'а', 'KeyF'); key('keyup', 'а', 'KeyF');
await sleep(1500);
out.afterRuA = state();
key('keydown', 'а', 'KeyF'); key('keyup', 'а', 'KeyF');
await sleep(1500);
out.final = state();
return out;
