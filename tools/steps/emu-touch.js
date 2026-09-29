// Проверка логики экранного пульта: шлём синтетические pointer-события и смотрим, что ушло в эмулятор.
// node tools/probe.mjs --url http://localhost:4173/igry#md --steps tools/steps/emu-touch.js --vw 390 --vh 844
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
for (let i = 0; i < 40 && !q('.cart'); i += 1) await sleep(500);
const want = location.hash.slice(1);
const re = want === 'md' ? /Mega Drive/i : want === 'snes' ? /Super Nintendo/i : /Dendy/i;
Array.from(document.querySelectorAll('.cart')).find((c) => re.test(c.getAttribute('aria-label') || '')).click();
for (let i = 0; i < 80 && !window.__vidikEmu; i += 1) await sleep(500);
await sleep(1500);

const emu = window.__vidikEmu;
const log = [];
const t0 = performance.now();
const od = emu.pressDown.bind(emu);
const ou = emu.pressUp.bind(emu);
emu.pressDown = (o) => { log.push(`+${o.button}@${Math.round(performance.now() - t0)}`); return od(o); };
emu.pressUp = (o) => { log.push(`-${o.button}@${Math.round(performance.now() - t0)}`); return ou(o); };

const fire = (type, x, y, id = 1) =>
  (document.elementFromPoint(x, y) || document.body).dispatchEvent(
    new PointerEvent(type, { pointerId: id, bubbles: true, cancelable: true, clientX: x, clientY: y, pointerType: 'touch', isPrimary: id === 1 })
  );
const center = (sel) => { const r = q(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

// 1) мгновенный тап по B
let [x, y] = center('[data-btn="b"]');
fire('pointerdown', x, y); fire('pointerup', x, y);
await sleep(150);
log.push('--tap done');
// 2) крестовина: верх-лево
const d = q('[data-dpad]').getBoundingClientRect();
fire('pointerdown', d.left + d.width * 0.2, d.top + d.height * 0.2);
await sleep(100);
fire('pointermove', d.left + d.width * 0.9, d.top + d.height * 0.5);
await sleep(100);
fire('pointerup', d.left + d.width * 0.9, d.top + d.height * 0.5);
await sleep(150);
log.push('--dpad done');
// 3) турбо
const turbo = q('[data-btn="turboB"]');
if (turbo) {
  [x, y] = center('[data-btn="turboB"]');
  fire('pointerdown', x, y);
  await sleep(200);
  fire('pointerup', x, y);
  await sleep(100);
}
// 4) скольжение пальца A -> B (MD/NES)
log.push('--slide');
const a = q('[data-btn="a"]');
if (a) {
  [x, y] = center('[data-btn="b"]');
  const [x2, y2] = center('[data-btn="a"]');
  fire('pointerdown', x, y); await sleep(60);
  fire('pointermove', x2, y2); await sleep(60);
  fire('pointerup', x2, y2);
}
await sleep(200);
return log.join(' ');
