const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
const report = {};

const skip = q('.boot__skip') || Array.from(document.querySelectorAll('.boot button'))[0];
if (skip) skip.click();
await sleep(800);

const cart = q('.cart');
if (cart) cart.click();

for (let i = 0; i < 40; i += 1) {
  if (q('.emu__canvas')?.width > 16 && !q('.emu__overlay')) break;
  await sleep(500);
}
await sleep(4000);

function key(type, code, keyName) {
  const event = new KeyboardEvent(type, { key: keyName, code, bubbles: true, cancelable: true });
  document.dispatchEvent(event);
  window.dispatchEvent(event);
}

// Start x2 to get past the title screen
for (let i = 0; i < 2; i += 1) {
  key('keydown', 'Enter', 'Enter');
  await sleep(120);
  key('keyup', 'Enter', 'Enter');
  await sleep(1200);
}

// walk right for a moment
key('keydown', 'ArrowRight', 'ArrowRight');
await sleep(1500);
key('keyup', 'ArrowRight', 'ArrowRight');
await sleep(2500);

report.overlay = q('.emu__overlay')?.textContent ?? null;
report.canvas = q('.emu__canvas') ? `${q('.emu__canvas').width}x${q('.emu__canvas').height}` : 'none';
return report;
