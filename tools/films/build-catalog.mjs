// Собирает tools/films/selection.json в статический каталог app/src/data/films.ts
// и качает постеры в app/public/films/. В рантайм никаких токенов не уезжает:
// в бандл попадают только названия, описания и kinopoisk_id.
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FFMPEG = ['C:/ffmpeg/bin/ffmpeg.exe', 'ffmpeg'].find((p) => {
  try {
    execFileSync(p, ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
});

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const PUB = resolve(ROOT, 'app/public/films');
const sel = JSON.parse(readFileSync(resolve(HERE, 'selection.json'), 'utf8'));

const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .split('')
    .map((ch) => (ch in MAP ? MAP[ch] : ch))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// качает картинку и сразу перегоняет в webp нужной ширины
async function grab(url, file, maxWidth) {
  const webp = `${file}.webp`;
  const outPath = resolve(PUB, webp);
  if (existsSync(outPath) && statSync(outPath).size > 1500) return `/films/${webp}`;
  const tmp = resolve(PUB, `${file}.src`);
  mkdirSync(dirname(outPath), { recursive: true });

  let ok = false;
  for (let i = 0; i < 3 && !ok; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(String(r.status));
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 2000) throw new Error('пусто');
      writeFileSync(tmp, buf);
      ok = true;
    } catch {
      await new Promise((x) => setTimeout(x, 500));
    }
  }
  if (!ok) {
    console.log(`  ⚠ не скачался ${file}`);
    return null;
  }

  if (!FFMPEG) {
    console.log('  ⚠ ffmpeg не найден, картинки без сжатия');
    return null;
  }
  try {
    execFileSync(
      FFMPEG,
      ['-y', '-loglevel', 'error', '-i', tmp, '-vf', `scale='min(${maxWidth},iw)':-2:flags=lanczos`, '-quality', '78', outPath],
      { stdio: 'ignore' }
    );
  } catch {
    console.log(`  ⚠ ffmpeg не справился с ${file}`);
    return null;
  } finally {
    rmSync(tmp, { force: true });
  }
  return `/films/${webp}`;
}

const clean = (s) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();

async function convert(rec, group) {
  const slug = slugify(`${rec.title}-${rec.year}`);
  const poster = rec.poster ? await grab(rec.poster, `${group}/${slug}`, 400) : null;
  const backdrop = rec.backdrop ? await grab(rec.backdrop, `${group}/${slug}-bg`, 1100) : null;

  let seasons;
  const raw = rec.seasons?.seasons;
  if (Array.isArray(raw) && raw.length) {
    seasons = raw
      .map((s) => ({ season: Number(s.name), episodes: (s.series ?? []).length }))
      .filter((s) => Number.isFinite(s.season) && s.episodes > 0)
      .sort((a, b) => a.season - b.season);
  }

  return {
    slug,
    kpId: rec.kpId,
    title: clean(rec.title),
    titleOrig: clean(rec.titleOrig) || null,
    year: rec.year,
    kind: rec.type === 'serial' ? 'serial' : 'movie',
    duration: rec.duration ?? null,
    rating: rec.kpRating ?? null,
    genres: (rec.genres ?? []).slice(0, 3),
    countries: (rec.countries ?? []).slice(0, 2),
    poster,
    backdrop,
    short: clean(rec.short) || null,
    description: clean(rec.description) || null,
    seasons: seasons?.length ? seasons : undefined
  };
}

console.log('видеосалон…');
const salon = [];
for (const r of sel.salon) salon.push(await convert(r, 'salon'));
console.log('дисней-клуб…');
const disney = [];
for (const r of sel.disney) disney.push(await convert(r, 'disney'));

const ts = `// Сгенерировано tools/films/build-catalog.mjs — руками не править.
// Источник метаданных и потока — балансер Vibix, воспроизведение идёт через его плеер по kinopoisk_id.

export interface FilmSeason {
  season: number;
  episodes: number;
}

export interface Film {
  slug: string;
  kpId: number;
  title: string;
  titleOrig: string | null;
  year: number;
  kind: 'movie' | 'serial';
  duration: number | null;
  rating: number | null;
  genres: string[];
  countries: string[];
  poster: string | null;
  backdrop: string | null;
  short: string | null;
  description: string | null;
  seasons?: FilmSeason[];
}

export const salon: Film[] = ${JSON.stringify(salon, null, 2)};

export const disney: Film[] = ${JSON.stringify(disney, null, 2)};

export const allFilms: Film[] = [...salon, ...disney];

const bySlug = new Map(allFilms.map((f) => [f.slug, f]));
export const findFilm = (slug: string | undefined): Film | undefined => (slug ? bySlug.get(slug) : undefined);
`;

const outFile = resolve(ROOT, 'app/src/data/films.ts');
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, ts);
console.log(`\nвидеосалон ${salon.length}, дисней-клуб ${disney.length}`);
console.log(`постеров нет у: ${[...salon, ...disney].filter((f) => !f.poster).map((f) => f.title).join(', ') || '—'}`);
console.log(`фонов нет у: ${[...salon, ...disney].filter((f) => !f.backdrop).map((f) => f.title).join(', ') || '—'}`);
console.log(`записано ${outFile}`);
