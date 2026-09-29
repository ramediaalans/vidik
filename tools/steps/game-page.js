// Страница игры /igry/:id. Если в URL есть #play — жмём PLAY и ждём кадр.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
for (let i = 0; i < 40 && !q('.emu'); i += 1) await sleep(500);
if (location.hash === '#play') {
  q('.emu__overlay--start button')?.click();
  for (let i = 0; i < 80 && !window.__vidikEmu; i += 1) await sleep(500);
  await sleep(3500);
}
await sleep(1000);
const box = (s) => { const n = q(s); if (!n) return null; const r = n.getBoundingClientRect(); return `${Math.round(r.x)},${Math.round(r.y + scrollY)} ${Math.round(r.width)}x${Math.round(r.height)}`; };
return { url: location.pathname, tv: box('.emu__tv'), side: box('.emu__side'), screen: box('.crt__screen'), tpad: box('.tpad'), docW: document.documentElement.scrollWidth, vw: innerWidth };
