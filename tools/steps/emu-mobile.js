// Телефонная раскладка эмулятора без полного экрана: ищем горизонтальное
// переполнение. Запуск: node tools/probe.mjs --url .../igry --vw 390 --vh 844 --steps tools/steps/emu-mobile.js
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let cart = null;
for (let i = 0; i < 40; i += 1) {
  cart = document.querySelector('.cart');
  if (cart) break;
  await sleep(500);
}
if (!cart) return { error: 'нет картриджей на полке', url: location.href };
cart.click();

for (let i = 0; i < 80; i += 1) {
  if (window.__vidikEmu) break;
  await sleep(500);
}
if (!window.__vidikEmu) return { error: 'эмулятор не запустился' };
await sleep(3000);

const box = (selector) => {
  const node = document.querySelector(selector);
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  return `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`;
};

// Все элементы, что торчат за правый край экрана.
const overflowing = Array.from(document.querySelectorAll('.modal *'))
  .map((node) => ({ node, rect: node.getBoundingClientRect() }))
  .filter(({ rect }) => rect.width > 0 && rect.right > innerWidth + 1)
  .slice(0, 12)
  .map(({ node, rect }) => `${node.className || node.tagName} right=${Math.round(rect.right)} w=${Math.round(rect.width)}`);

return {
  viewport: `${innerWidth}x${innerHeight}`,
  coarsePointer: matchMedia('(pointer: coarse)').matches,
  docScrollWidth: document.documentElement.scrollWidth,
  modalWin: box('.modal__win'),
  screen: box('.crt__screen'),
  pad: box('.emu__pad'),
  dpad: box('.emu__dpad'),
  actions: box('.emu__actions'),
  center: box('.emu__padSide--center'),
  controls: box('.emu__controls'),
  overflowing
};
