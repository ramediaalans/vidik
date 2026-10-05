// Панель плеера: запуск фильма и показ панели (дальше probe кликает мышью по кнопке «Тихо»).
// node tools/probe.mjs --url http://localhost:4173/videosalon/terminator-1984 --steps tools/steps/vplayer-bar-start.js \
//   --click ".vplayer__bar button:nth-child(4)" --afterClick 500 --postSteps tools/steps/vplayer-bar-check.js
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
(q('.boot__skip') || document.querySelector('.boot button'))?.click();
for (let i = 0; i < 30 && !q('.vplayer__osd'); i += 1) await sleep(500);
q('.vplayer__osd')?.click();
for (let i = 0; i < 30 && !q('.vplayer__bar'); i += 1) await sleep(500);
await sleep(4000);
q('.vplayer__bar')?.scrollIntoView({ block: 'center' });
q('.vplayer__contentShield')?.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
await sleep(300);
return { bar: Boolean(q('.vplayer__bar')), opacity: q('.vplayer__bar') && getComputedStyle(q('.vplayer__bar')).opacity };
