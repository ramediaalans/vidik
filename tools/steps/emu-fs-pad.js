// Проверка полноэкранной раскладки: запускается как --postSteps после клика
// по кнопке «На всь экран».
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(1200);

const box = (node) => {
  if (!node) return null;
  const rect = node.getBoundingClientRect();
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    w: Math.round(rect.width),
    h: Math.round(rect.height)
  };
};
const css = (node, props) => {
  if (!node) return null;
  const style = getComputedStyle(node);
  return Object.fromEntries(props.map((prop) => [prop, style.getPropertyValue(prop)]));
};
const q = (selector) => document.querySelector(selector);

const root = q('.emu');
const pad = q('.emu__pad');

return {
  fullscreenClass: document.fullscreenElement?.className ?? null,
  fullscreenIsEmuRoot: document.fullscreenElement === root,
  viewport: `${innerWidth}x${innerHeight}`,
  pad: {
    exists: Boolean(pad),
    box: box(pad),
    css: css(pad, ['display', 'position', 'z-index', 'opacity', 'visibility', 'pointer-events']),
    buttons: pad
      ? Array.from(pad.querySelectorAll('button')).map((button) => ({
          label: (button.getAttribute('aria-label') || button.textContent || '').trim(),
          box: box(button)
        }))
      : []
  },
  fsExit: box(q('.emu__fsExit')),
  hiddenInFs: {
    controls: css(q('.emu__controls'), ['display']),
    keysWrap: css(q('.emu__keysWrap'), ['display']),
    note: css(q('.emu__note'), ['display'])
  },
  screen: box(q('.crt__screen')),
  canvas: box(q('.emu__canvas'))
};
