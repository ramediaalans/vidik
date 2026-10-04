// Уменьшенные копии больших картинок для телефонов: name.webp -> name.m.webp (ширина 1000px).
// Список путей пишется в src/media/mobileImages.ts, asset() подставляет копию на экранах <= 760px.
// Запуск вручную после добавления/замены картинок: node scripts/mobile-images.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const DIRS = ['images', 'ui'];
const W = 1000; // телефон 390px x DPR 2,5-3 — с запасом
const MIN_W = 1100; // меньше — не трогаем
const MIN_BYTES = 60 * 1024;
const list = [];
let before = 0, after = 0;

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(webp|jpe?g|png)$/i.test(f) && !/\.m\.webp$/i.test(f)) files.push(p);
  }
}
const files = [];
for (const d of DIRS) if (fs.existsSync(path.join(PUB, d))) walk(path.join(PUB, d));

for (const p of files) {
  const size = fs.statSync(p).size;
  if (size < MIN_BYTES) continue;
  const meta = await sharp(p).metadata();
  if (!meta.width || meta.width < MIN_W) continue;
  const out = p.replace(/\.(webp|jpe?g|png)$/i, '.m.webp');
  const buf = await sharp(p)
    .resize({ width: W, withoutEnlargement: true })
    .webp({ quality: 74, alphaQuality: 90, effort: 5, smartSubsample: true })
    .toBuffer();
  if (buf.length > size * 0.8) continue; // выигрыш мал — не плодим файлы
  fs.writeFileSync(out, buf);
  const rel = path.relative(PUB, p).split(path.sep).join('/');
  list.push(rel);
  before += size; after += buf.length;
  console.log(`${rel}  ${meta.width}px ${Math.round(size / 1024)}K -> ${Math.round(buf.length / 1024)}K`);
}
list.sort();
fs.writeFileSync(
  path.join(ROOT, 'src/media/mobileImages.ts'),
  '// Сгенерировано scripts/mobile-images.mjs — руками не править.\n' +
    `export const MOBILE_IMAGES: readonly string[] = ${JSON.stringify(list, null, 2).replace(/"/g, "'")};\n`,
);
console.log(`файлов: ${list.length}, ${Math.round(before / 1024)}K -> ${Math.round(after / 1024)}K`);
