// PNG -> WebP optimizer for VIDIK assets.
// Usage: node tools/optimize.mjs
import { readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = path.resolve('assets_raw');
const OUT = path.resolve('app/public/images');

const PLAN = {
  'hero-room': { dir: 'hero', w: 2000 },
  'club-night': { dir: 'hero', w: 1800 },
  'yard-golden': { dir: 'hero', w: 1800 },
  'section-movies': { dir: 'movies', w: 1600 },
  'section-cartoons': { dir: 'cartoons', w: 1600 },
  'section-games': { dir: 'games', w: 1600 },
  'section-music': { dir: 'music', w: 1600 },
  'section-tv': { dir: 'tv', w: 1600 },
  'section-stories': { dir: 'stories', w: 1600 },
  'texture-paper': { dir: 'textures', w: 1200 },
  'texture-carpet': { dir: 'textures', w: 1200 },
  'texture-vhs': { dir: 'textures', w: 1600 },
  'og-cover': { dir: 'ui', w: 1600 }
};

const defaultsFor = (name) => {
  if (name.startsWith('movie-')) return { dir: 'movies', w: 900 };
  if (name.startsWith('cartoon-')) return { dir: 'cartoons', w: 900 };
  if (name.startsWith('game-')) return { dir: 'games', w: 900 };
  if (name.startsWith('music-')) return { dir: 'music', w: 900 };
  if (name.startsWith('tv-')) return { dir: 'tv', w: 900 };
  if (name.startsWith('story-')) return { dir: 'stories', w: 1200 };
  if (name.startsWith('ui-')) return { dir: 'ui', w: 900 };
  return { dir: 'ui', w: 1200 };
};

const files = (await readdir(SRC)).filter((f) => /\.(png|jpg|jpeg)$/i.test(f));
let done = 0;
for (const file of files) {
  const name = path.basename(file, path.extname(file));
  const plan = PLAN[name] ?? defaultsFor(name);
  const outDir = path.join(OUT, plan.dir);
  await mkdir(outDir, { recursive: true });
  const outFile = path.join(outDir, `${name}.webp`);
  await sharp(path.join(SRC, file))
    .resize({ width: plan.w, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outFile);
  done++;
  console.log(`${name} -> images/${plan.dir}/${name}.webp`);
}
console.log(`\nOK: ${done} files`);


