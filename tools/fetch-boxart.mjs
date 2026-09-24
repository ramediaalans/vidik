// Качает официальные обложки из архива libretro-thumbnails и кладёт их локально.
// Запуск: node tools/fetch-boxart.mjs
// Никаких внешних CDN в рантайме: качаем один раз, дальше всё своё.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'app', 'public', 'images', 'games', 'art');
const BASE = 'https://thumbnails.libretro.com';

const map = JSON.parse(await readFile(path.join(root, 'tools', 'boxart.map.json'), 'utf8'));
delete map._;

// Ключи карты — слаги файлов РОМов, а в UI используются короткие id из data/roms.ts.
// Связываем их через имя файла.
const romsSrc = await readFile(path.join(root, 'app', 'src', 'data', 'roms.ts'), 'utf8');
const slugToId = new Map();
for (const block of romsSrc.split(/\n\s*\{/)) {
  const id = block.match(/id:\s*'([^']+)'/)?.[1];
  const file = block.match(/file:\s*'([^']+)'/)?.[1];
  if (id && file) slugToId.set(path.basename(file).replace(/\.[^.]+$/, ''), id);
}

await mkdir(outDir, { recursive: true });

const done = [];
const failed = [];

for (const [fileSlug, [system, name]] of Object.entries(map)) {
  const slug = slugToId.get(fileSlug);
  if (!slug) {
    failed.push(`${fileSlug}: нет такой игры в data/roms.ts`);
    process.stdout.write('?');
    continue;
  }
  const url = `${BASE}/${encodeURIComponent(system)}/Named_Boxarts/${encodeURIComponent(name)}.png`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const png = Buffer.from(await res.arrayBuffer());
    // Обложки разного размера и пропорций — вписываем в квадрат без обрезки.
    await sharp(png)
      .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 86 })
      .toFile(path.join(outDir, `${slug}.webp`));
    done.push(slug);
    process.stdout.write('.');
  } catch (error) {
    failed.push(`${slug}: ${error.message}`);
    process.stdout.write('x');
  }
}

const lines = [
  '// Генерируется скриптом tools/fetch-boxart.mjs. Руками не править.',
  '// Обложки — из архива libretro-thumbnails, хранятся локально.',
  'export const romArt: Record<string, string> = {',
  ...done.sort().map((slug) => `  '${slug}': 'images/games/art/${slug}.webp',`),
  '};',
  '',
  '// У коробочных обложек название уже нарисовано, но мелко — подпись оставляем.',
  'export const romArtNoText: string[] = [',
  ...done.sort().map((slug) => `  '${slug}',`),
  '];',
  ''
];

await writeFile(path.join(root, 'app', 'src', 'data', 'rom-art.ts'), lines.join('\n'), 'utf8');

console.log(`\nСкачано обложек: ${done.length} / ${done.length + failed.length}`);
if (failed.length) console.log('Не вышло:\n' + failed.join('\n'));
