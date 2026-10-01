// Включает ТВ, прощёлкивает каналы и сверяет эфир плеера с подсветкой в газете.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s === '.tv__mount iframe' ? 'iframe.tv__mount, .tv__mount iframe' : s);
const clean = (el) => el?.textContent.replace(/\s+/g, ' ').trim() ?? null;
q('.boot__skip')?.click();
await sleep(800);
q('.tv__power')?.click();
const out = { paperNow: [...document.querySelectorAll('.paper__row.is-now')].map(clean), channels: [] };
for (const btn of document.querySelectorAll('.channel')) {
  btn.click();
  for (let i = 0; i < 30 && !q('.tv__mount iframe'); i += 1) await sleep(500);
  await sleep(5000);
  out.channels.push({ btn: clean(btn).slice(0, 50), onAir: clean(q('.tv__onAir')), src: q('.tv__mount iframe')?.src.slice(0, 140) ?? clean(q('.tv__generated')), overlay: clean(q('.tv__overlay')) });
}
return out;
