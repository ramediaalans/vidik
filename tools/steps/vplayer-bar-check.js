// Через 4 с после клика панель должна спрятаться, фокус — на экране плеера.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const bar = document.querySelector('.vplayer__bar');
const now = getComputedStyle(bar).opacity;
await sleep(4000);
return { rightAfterClick: now, after4s: getComputedStyle(bar).opacity, active: document.activeElement?.className };
