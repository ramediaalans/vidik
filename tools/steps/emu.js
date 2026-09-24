const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => document.querySelector(s);
const report = {};

const skip = q('.boot__skip') || Array.from(document.querySelectorAll('.boot button'))[0];
if (skip) skip.click();
await sleep(800);
report.bootClosed = !q('.boot');

const cart = q('.cart');
report.cartFound = Boolean(cart);
if (cart) cart.click();
await sleep(1200);
report.modalOpen = Boolean(q('.modal'));

// wait for the emulator to actually start rendering
let canvas = null;
for (let i = 0; i < 40; i += 1) {
  canvas = q('.emu__canvas');
  if (canvas && canvas.width > 16 && !q('.emu__overlay')) break;
  await sleep(500);
}

report.canvasSize = canvas ? `${canvas.width}x${canvas.height}` : 'none';
report.overlayText = q('.emu__overlay')?.textContent ?? null;

// give the game a few seconds of real time to draw its title screen
await sleep(6000);

if (canvas) {
  try {
    const shot = document.createElement('canvas');
    shot.width = canvas.width;
    shot.height = canvas.height;
    shot.getContext('2d').drawImage(canvas, 0, 0);
    const data = shot.getContext('2d').getImageData(0, 0, shot.width, shot.height).data;
    let lit = 0;
    for (let i = 0; i < data.length; i += 4 * 97) {
      if (data[i] + data[i + 1] + data[i + 2] > 40) lit += 1;
    }
    report.litSamples = lit;
  } catch (error) {
    report.readError = String(error);
  }
}

const modal = q('.modal__win');
if (modal) modal.scrollTop = 0;
return report;
