// Телевизор с приставкой: запуск игры по id (по умолчанию первая карточка) и геометрия.
// node tools/probe.mjs --url http://localhost:4173/igry --steps tools/steps/emu-tv.js --out qa/tv.png --w 1400 --h 900
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);

for (let i = 0; i < 40 && !q('.cart'); i += 1) await sleep(500);
const carts = Array.from(document.querySelectorAll('.cart'));
// #md / #snes в URL выбирает платформу, по умолчанию Dendy
const want = location.hash.slice(1);
const re = want === 'md' ? /Mega Drive/i : want === 'snes' ? /Super Nintendo/i : /Dendy/i;
const pick = carts.find((c) => re.test(c.getAttribute('aria-label') || '')) || carts[0];
pick.click();
for (let i = 0; i < 80 && !window.__vidikEmu; i += 1) await sleep(500);
await sleep(3500);
const box = (s) => {
  const n = q(s);
  if (!n) return null;
  const r = n.getBoundingClientRect();
  return `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`;
};
return {
  game: pick.getAttribute('aria-label'),
  coarse: matchMedia('(pointer: coarse)').matches,
  tv: box('.emu__tv'),
  hole: box('.emu__tvHole'),
  screen: box('.crt__screen'),
  tpad: box('.tpad'),
  tpadDisplay: q('.tpad') && getComputedStyle(q('.tpad')).display
};
