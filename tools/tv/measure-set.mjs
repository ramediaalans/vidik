// Находит чёрный прямоугольник экрана на картинке телевизора и выдаёт CSS-переменные,
// чтобы плеер встал ровно в экран.
//
//   node tools/tv/measure-set.mjs [путь]   (по умолчанию app/public/images/tv/tv-set.webp)
import sharp from 'sharp';

const file = process.argv[2] ?? 'app/public/images/tv/tv-set.webp';
// Экран считаем тёмным: яркость ниже порога и малая насыщенность.
const DARK = Number(process.env.DARK ?? 46);

const { data, info } = await sharp(file)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width: W, height: H, channels } = info;
const isDark = (x, y) => {
  const i = (y * W + x) * channels;
  return data[i] < DARK && data[i + 1] < DARK && data[i + 2] < DARK;
};

// Идём от центра кадра в четыре стороны, пока пиксели тёмные.
// Для анфасного кадра этого достаточно и надёжнее поиска контуров.
const cx = W >> 1;
const cy = H >> 1;
if (!isDark(cx, cy)) {
  console.error(
    `В центре кадра не чёрный экран. Проверь, что телевизор снят анфас и экран пустой,\n` +
      `либо подними порог: DARK=70 node tools/tv/measure-set.mjs`
  );
  process.exit(1);
}

let left = cx;
while (left > 0 && isDark(left - 1, cy)) left--;
let right = cx;
while (right < W - 1 && isDark(right + 1, cy)) right++;
let top = cy;
while (top > 0 && isDark(cx, top - 1)) top--;
let bottom = cy;
while (bottom < H - 1 && isDark(cx, bottom + 1)) bottom++;

const pct = (v, total) => `${((v / total) * 100).toFixed(2)}%`;
const w = right - left + 1;
const h = bottom - top + 1;

console.log(`файл:   ${file}  ${W}x${H}`);
console.log(`экран:  ${w}x${h}  стороны ${(w / h).toFixed(3)}`);
console.log('\nВставь в styles.css в правило .tv--photo:\n');
console.log(`  --tv-screen-left: ${pct(left, W)};`);
console.log(`  --tv-screen-top: ${pct(top, H)};`);
console.log(`  --tv-screen-width: ${pct(w, W)};`);
console.log(`  --tv-screen-height: ${pct(h, H)};`);
