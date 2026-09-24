// Полный цикл: окно -> полный экран -> обратно.
// Проверяем главное: GL-viewport должен занимать весь буфер по высоте
// и быть отцентрованным, а коробка на странице — повторять стороны буфера.
const canvas = document.querySelector('canvas.emu__canvas');
const screenEl = document.querySelector('.emu__screen');
const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

const shot = (tag) => {
  const v = Array.from(gl.getParameter(gl.VIEWPORT));
  const r = screenEl.getBoundingClientRect();
  const bufAr = canvas.width / canvas.height;
  const boxAr = r.width / r.height;
  return {
    tag,
    buffer: `${canvas.width}x${canvas.height}`,
    viewport: v.join(','),
    box: `${Math.round(r.width)}x${Math.round(r.height)}`,
    // картинка по вертикали должна заполнять буфер целиком
    fillsHeight: v[3] === canvas.height && v[1] === 0,
    centered: Math.abs(v[0] * 2 + v[2] - canvas.width) <= 2,
    aspectMatch: Math.abs(bufAr - boxAr) < 0.02,
    // собственное соотношение сторон самой картинки на экране
    pictureAr: ((v[2] / v[3]) * (r.width / canvas.width) / (r.height / canvas.height)).toFixed(3)
  };
};

// в полный экран нас уже ввёл probe через --click (нужен жест пользователя)
const out = [shot('fullscreen')];
await new Promise((r) => setTimeout(r, 1500));
out.push(shot('fullscreen+1.5s'));
await document.exitFullscreen();
await new Promise((r) => setTimeout(r, 2000));
out.push(shot('back-to-window'));
return out;
