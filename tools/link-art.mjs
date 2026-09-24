// Берёт сырые арты картриджей из assets_raw/games_art, жмёт в WebP
// и пересобирает app/src/data/rom-art.ts.
// Имя файла может совпадать либо с id игры, либо с именем файла ROM.
// Usage: node tools/link-art.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve('.');
const SRC = path.join(ROOT, 'assets_raw/games_art');
const OUT = path.join(ROOT, 'app/public/images/games/art');
const DATA = path.join(ROOT, 'app/src/data/rom-art.ts');
const ROMS = path.join(ROOT, 'app/src/data/roms.ts');

const source = fs.readFileSync(ROMS, 'utf8');
const entries = [...source.matchAll(/id:\s*'([^']+)',\s*file:\s*'roms\/([^']+)'/g)].map((m) => ({
  id: m[1],
  slug: path.basename(m[2], path.extname(m[2]))
}));

if (!fs.existsSync(SRC)) {
  console.log(`нет папки ${SRC} — положи туда PNG и запусти снова`);
  process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });

const map = {};
const noText = [];
const skipped = [];

for (const file of fs.readdirSync(SRC)) {
  if (!/\.(png|jpe?g|webp)$/i.test(file)) continue;
  const raw = path.basename(file, path.extname(file)).toLowerCase();
  const plain = raw.endsWith('-notext');
  const base = plain ? raw.slice(0, -'-notext'.length) : raw;
  const match = entries.find((e) => e.id === base || e.slug === base);
  if (!match) {
    skipped.push(file);
    continue;
  }
  const target = path.join(OUT, `${match.id}.webp`);
  await sharp(path.join(SRC, file))
    .resize({ width: 900, height: 675, fit: 'cover', position: 'centre' })
    .webp({ quality: 82 })
    .toFile(target);
  map[match.id] = `images/games/art/${match.id}.webp`;
  if (plain) noText.push(match.id);
  console.log(`ok ${file} -> ${match.id}.webp${plain ? ' (без надписи)' : ''}`);
}

const body = Object.keys(map)
  .sort()
  .map((id) => `  '${id}': '${map[id]}'`)
  .join(',\n');

fs.writeFileSync(
  DATA,
  `// Генерируется скриптом tools/link-art.mjs. Руками не править.\n` +
    `export const romArt: Record<string, string> = {\n${body}\n};\n\n` +
    `// Арты без встроенной надписи — для них название рисует сайт.\n` +
    `export const romArtNoText: string[] = [${noText
      .sort()
      .map((id) => `'${id}'`)
      .join(', ')}];\n`,
  'utf8'
);

console.log(`\nподключено ${Object.keys(map).length} из ${entries.length}`);
if (skipped.length) console.log('не узнал имя:', skipped.join(', '));
const missing = entries.filter((e) => !map[e.id]).map((e) => e.id);
if (missing.length) console.log('ещё нет арта:', missing.join(', '));
