// То же, что game-page.js, но ждём дольше (для медленных заставок) и нажимаем Start.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
for (let i = 0; i < 40 && !q('.emu'); i += 1) await sleep(500);
q('.emu__overlay--start button')?.click();
for (let i = 0; i < 80 && !window.__vidikEmu; i += 1) await sleep(500);
await sleep(9000);
return { url: location.pathname };
