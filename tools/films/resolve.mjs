// Подбор содержимого для видеосалона и Дисней-клуба → tools/films/selection.json.
//
// Источники:
//   1. TMDB (основной): название, описание, постер, фон, жанры, страны, длительность,
//      сезоны, режиссёры и актёры. Ключ — TMDB_API_KEY в .env.
//   2. Локальный архив Vibix archive/vibix/cards.json (запасной, см. tools/vibix-archive):
//      ID и рейтинг Кинопоиска, озвучки, русское описание, если у TMDB его нет,
//      а также всё целиком, если фильма нет в TMDB.
//
// Уже подобранные записи selection.json не трогаем (там могут быть ручные правки).
// Флаги:  --refresh  переподобрать всё заново;  --dry  только показать, не записывать.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { netFetch } from '../lib/net.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const REFRESH = process.argv.includes('--refresh');
const DRY = process.argv.includes('--dry');

const env = {};
for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = /^\s*(?:export\s+)?([A-Za-z0-9_.-]+)\s*=\s*(.*)$/.exec(line);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const TMDB_KEY = env.TMDB_API_KEY;
if (!TMDB_KEY) console.log('⚠ TMDB_API_KEY не задан в .env — подбор только по архиву Vibix');

/* ==================== ВИДЕОСАЛОН ====================
   То, что реально брали на кассетах и крутили в видеосалонах. */
const SALON = [
  // боевики-легенды видеосалонов
  ['Терминатор 2: Судный день', 1991],
  ['Терминатор', 1984],
  ['Крепкий орешек', 1988],
  ['Хищник', 1987],
  ['Коммандо', 1985],
  ['Кобра', 1986],
  ['Робокоп', 1987],
  ['Кровавый спорт', 1988],
  ['Кикбоксер', 1989],
  ['Универсальный солдат', 1992],
  ['Разрушитель', 1993],
  ['Скалолаз', 1993],
  ['Смертельная битва', 1995],
  ['Скорость', 1994],
  // фантастика и блокбастеры
  ['Назад в будущее', 1985],
  ['Чужие', 1986],
  ['Парк Юрского периода', 1993],
  ['Парк Юрского периода 2: Затерянный мир', 1997],
  ['Пятый элемент', 1997],
  ['Матрица', 1999],
  ['День независимости', 1996],
  ['Мумия', 1999],
  // комедии и семейное
  ['Один дома', 1990],
  ['Маска', 1994],
  ['Тупой и ещё тупее', 1994],
  // большое кино, которое смотрели всей квартирой
  ['Титаник', 1997],
  ['Криминальное чтиво', 1994],
  ['Леон', 1994],
  ['Побег из Шоушенка', 1994],
  ['Форрест Гамп', 1994],
  // своё
  ['Брат', 1997],
  ['Брат 2', 2000],
  ['Особенности национальной охоты', 1995]
];

/* ==================== ДИСНЕЙ-КЛУБ ====================
   Мультсериалы из того самого воскресного блока на ОРТ. */
const DISNEY = [
  ['Утиные истории', 1987],
  ['Чип и Дейл спешат на помощь', 1989],
  ['Чёрный плащ', 1991],
  ['Гуфи и его команда', 1992],
  ['Приключения мишек Гамми', 1985],
  ['Аладдин', 1994],
  ['Тимон и Пумба', 1995],
  ['Русалочка', 1992],
  ['Мышиный дом', 2001],
  // добрано вручную: мультсериалы 90-х без рекламы и чужих логотипов
  ['Космические спасатели лейтенанта Марша', 1993],
  ['Погонщики динозавров', 1988],
  ['Дракулито-вампирёныш', 1991],
  ['Настоящие охотники за привидениями', 1986],
  ['Война гоботов', 1984]
];

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- архив Vibix ---------- */
const ARCHIVE = resolve(ROOT, 'archive/vibix/cards.json');
const archive = existsSync(ARCHIVE) ? JSON.parse(readFileSync(ARCHIVE, 'utf8')) : [];
const byImdb = new Map();
const byKp = new Map();
for (const c of archive) {
  if (c.imdb_id && !byImdb.has(c.imdb_id)) byImdb.set(c.imdb_id, c);
  if (c.kp_id && !byKp.has(c.kp_id)) byKp.set(c.kp_id, c);
}
if (!archive.length) console.log('⚠ архив Vibix не найден (archive/vibix/cards.json) — без рейтинга КП и озвучек');

function score(names, target, year, itemYear, typeOk) {
  let s = 0;
  const n = names.map(norm);
  if (n.includes(target)) s += 100;
  else if (n.some((x) => x.startsWith(target))) s += 60;
  else if (n.some((x) => x.includes(target))) s += 30;
  const dy = Math.abs(Number(itemYear) - year);
  if (dy === 0) s += 50;
  else if (dy <= 1) s += 30;
  else if (dy <= 3) s += 5;
  else s -= Number.isFinite(dy) ? dy : 50;
  s += typeOk ? 25 : -25;
  return { s, dy };
}

function archiveFind(title, year, wantType) {
  const target = norm(title);
  let best = null;
  for (const c of archive) {
    // по русскому названию — полное совпадение или начало; по оригинальному — только полное
    const ru = [c.name_rus, c.name].map(norm);
    const orig = [c.name_eng, c.name_original].map(norm);
    if (!ru.some((n) => n === target || n.startsWith(target + ' ')) && !orig.includes(target)) continue;
    const { s, dy } = score([c.name, c.name_rus, c.name_eng, c.name_original], target, year, c.year, c.type === wantType);
    if (s >= 60 && (!best || s > best.s)) best = { c, s, dy };
  }
  return best;
}

/* ---------- TMDB ---------- */
const IMG = 'https://image.tmdb.org/t/p/';
async function tmdb(path, params = {}) {
  const q = new URLSearchParams({ api_key: TMDB_KEY, language: 'ru-RU', ...params });
  for (let a = 0; a < 4; a++) {
    try {
      const r = await netFetch(`https://api.themoviedb.org/3${path}?${q}`, { headers: { Accept: 'application/json' } });
      if (r.status === 404) return null;
      if (r.status === 429) { await sleep(1500 * (a + 1)); continue; }
      if (!r.ok) throw new Error(`TMDB ${r.status}`);
      return await r.json();
    } catch (e) {
      if (a === 3) throw e;
      await sleep(800 * (a + 1));
    }
  }
  return null;
}

async function tmdbFind(title, year, wantType) {
  const kind = wantType === 'serial' ? 'tv' : 'movie';
  const r = await tmdb(`/search/${kind}`, { query: title, include_adult: 'false' });
  const target = norm(title);
  let best = null;
  for (const it of r?.results ?? []) {
    const y = String(it.release_date ?? it.first_air_date ?? '').slice(0, 4);
    const { s: base, dy } = score([it.title, it.name, it.original_title, it.original_name], target, year, y, true);
    // при равенстве побеждает известный фильм, а не однофамилец («Коммандо» vs «Коммандо-леопард»)
    const s = base + Math.min(15, Math.log10(1 + (it.vote_count ?? 0)) * 4);
    if (base >= 60 && (!best || s > best.s)) best = { it, s, dy };
  }
  return best ? { ...best, kind } : null;
}

const COUNTRY_FIX = { US: 'США', SU: 'СССР', GB: 'Великобритания', XC: 'Чехословакия', XG: 'ГДР', YU: 'Югославия' };
const regionRu = new Intl.DisplayNames(['ru'], { type: 'region' });
const countryRu = (iso) => COUNTRY_FIX[iso] ?? (() => { try { return regionRu.of(iso); } catch { return iso; } })();

async function tmdbDetails(id, kind) {
  const d = await tmdb(`/${kind}/${id}`, { append_to_response: kind === 'tv' ? 'aggregate_credits,external_ids' : 'credits,external_ids' });
  if (!d) return null;
  let en = null;
  if (!d.overview) en = await tmdb(`/${kind}/${id}`, { language: 'en-US' });
  const credits = kind === 'tv' ? d.aggregate_credits : d.credits;
  const directors = kind === 'tv'
    ? (d.created_by ?? []).map((p) => p.name)
    : (credits?.crew ?? []).filter((p) => p.job === 'Director').map((p) => p.name);
  const cast = (credits?.cast ?? []).slice(0, 10).map((p) => ({
    name: p.name,
    character: p.character ?? p.roles?.[0]?.character ?? null
  }));
  const seasons = kind === 'tv'
    ? (d.seasons ?? [])
        .filter((s) => s.season_number > 0 && s.episode_count > 0)
        .map((s) => ({ name: s.season_number, series: Array.from({ length: s.episode_count }, (_, i) => ({ id: i + 1, name: i + 1 })) }))
    : null;
  return {
    tmdbId: d.id,
    imdbId: d.imdb_id ?? d.external_ids?.imdb_id ?? null,
    title: d.title ?? d.name,
    titleOrig: d.original_title ?? d.original_name ?? null,
    year: Number(String(d.release_date ?? d.first_air_date ?? '').slice(0, 4)) || null,
    tmdbRating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : null,
    duration: d.runtime ?? d.episode_run_time?.[0] ?? null,
    genres: (d.genres ?? []).map((g) => g.name.toLowerCase()),
    countries: (d.production_countries ?? d.origin_country?.map((c) => ({ iso_3166_1: c })) ?? []).map((c) => countryRu(c.iso_3166_1)),
    poster: d.poster_path ? `${IMG}w780${d.poster_path}` : null,
    backdrop: d.backdrop_path ? `${IMG}w1280${d.backdrop_path}` : null,
    tagline: d.tagline || null,
    description: d.overview || null,
    descriptionEn: en?.overview || null,
    directors,
    cast,
    seasons: seasons?.length ? { seasons } : null
  };
}

/* ---------- сборка записи ---------- */
function fromArchive(c) {
  let seasons = null;
  if (c.seasons?.length) seasons = { seasons: c.seasons };
  return {
    kpId: c.kp_id ?? null,
    imdbId: c.imdb_id ?? null,
    title: c.name_rus ?? c.name,
    titleOrig: c.name_original ?? c.name_eng ?? null,
    year: Number(c.year) || null,
    kpRating: c.kp_rating ? Number(c.kp_rating) : null,
    duration: c.duration ?? null,
    quality: c.quality ?? null,
    genres: c.genre ? [].concat(c.genre) : [],
    countries: c.country ? [].concat(c.country) : [],
    poster: c.poster_local ? resolve(ROOT, 'archive/vibix', c.poster_local) : c.poster_url ?? null,
    backdrop: c.backdrop_url ?? null,
    short: c.description_short ?? null,
    description: c.description ?? null,
    voiceovers: (c.voiceovers ?? []).map((v) => ({ id: v.id, name: v.name })),
    seasons
  };
}

async function pick(title, year, wantType) {
  const t = TMDB_KEY ? await tmdbFind(title, year, wantType) : null;
  const det = t ? await tmdbDetails(t.it.id, t.kind) : null;
  let arc = det?.imdbId ? byImdb.get(det.imdbId) : null;
  let via = det ? 'tmdb' : null;
  if (!arc) {
    const f = archiveFind(title, year, wantType);
    // по названию архиву верим, только если TMDB не нашёл ничего или год совпадает
    if (f && (!det || Math.abs(Number(f.c.year) - (det.year ?? year)) <= 1)) arc = f.c;
  }
  if (!det && !arc) return null;
  const a = arc ? fromArchive(arc) : {};
  if (!det) via = 'archive';
  else if (arc) via = 'tmdb+archive';

  return {
    rec: {
      ask: { title, year },
      source: via,
      id: arc?.id ?? null,
      tmdbId: det?.tmdbId ?? null,
      kpId: a.kpId ?? null,
      imdbId: det?.imdbId ?? a.imdbId ?? null,
      type: wantType,
      playerType: null,
      playerId: null,
      title: det?.title ?? a.title,
      titleOrig: det?.titleOrig ?? a.titleOrig ?? null,
      year: det?.year ?? a.year ?? year,
      kpRating: a.kpRating ?? null,
      tmdbRating: det?.tmdbRating ?? null,
      duration: det?.duration ?? a.duration ?? null,
      quality: a.quality ?? null,
      genres: det?.genres?.length ? det.genres : a.genres ?? [],
      countries: det?.countries?.length ? det.countries : a.countries ?? [],
      poster: det?.poster ?? a.poster ?? null,
      backdrop: det?.backdrop ?? a.backdrop ?? null,
      short: a.short ?? det?.tagline ?? null,
      description: det?.description ?? a.description ?? det?.descriptionEn ?? null,
      voiceovers: a.voiceovers ?? [],
      directors: det?.directors ?? [],
      cast: det?.cast ?? [],
      seasons: det?.seasons ?? a.seasons ?? null
    },
    dy: Math.abs((det?.year ?? a.year ?? year) - year)
  };
}

/* ---------- запуск ---------- */
const SEL = resolve(HERE, 'selection.json');
const old = existsSync(SEL) ? JSON.parse(readFileSync(SEL, 'utf8')) : { salon: [], disney: [] };
const key = (t, y) => `${norm(t)}|${y}`;

const manual = JSON.parse(readFileSync(resolve(HERE, 'manual-selection.json'), 'utf8'));
const manualKeys = new Set((manual.disney ?? []).map((r) => key(r.title, r.year)));

async function processList(list, wantType, label, prevList) {
  console.log('\n' + '='.repeat(96));
  console.log(label);
  console.log('='.repeat(96));
  // Без --refresh сохраняем прежний список целиком и в прежнем порядке
  // (там бывают ручные правки и позиции не из списка), новые позиции дописываем в конец.
  const out = REFRESH ? [] : [...prevList];
  const have = new Set(out.filter((r) => r.ask).map((r) => key(r.ask.title, r.ask.year)));
  if (!REFRESH && out.length) console.log(`  =  без изменений: ${out.length}`);
  for (const [title, year] of list) {
    if (have.has(key(title, year))) continue;
    if (manualKeys.has(key(title, year))) continue; // есть ручная карточка — её добавим ниже
    const got = await pick(title, year, wantType);
    if (!got) {
      console.log(`  —  ${title} (${year})  не найдено ни в TMDB, ни в архиве`);
      continue;
    }
    const r = got.rec;
    out.push(r);
    const eps = r.seasons?.seasons?.reduce((n, s) => n + s.series.length, 0);
    console.log(
      `  ✓  ${String(r.title).slice(0, 34).padEnd(36)} ${String(r.year).padEnd(6)} [${r.source}] kp=${r.kpId ?? '-'} tmdb=${r.tmdbId ?? '-'}` +
        ` кп=${r.kpRating ?? '-'} озвучек=${r.voiceovers.length} режиссёр=${r.directors[0] ?? '-'}` +
        (r.seasons ? ` сезонов=${r.seasons.seasons.length} серий=${eps}` : '') +
        (r.poster ? '' : '  БЕЗ ПОСТЕРА') + (r.description ? '' : '  БЕЗ ОПИСАНИЯ') + (r.kpId ? '' : '  БЕЗ KP_ID') +
        (got.dy ? `  [год расходится на ${got.dy}]` : '')
    );
  }
  return out;
}

const salon = await processList(SALON, 'movie', 'ВИДЕОСАЛОН — фильмы', old.salon ?? []);
const disney = await processList(DISNEY, 'serial', 'ДИСНЕЙ-КЛУБ — мультсериалы', old.disney ?? []);

// Редкие мультсериалы 90-х, которых нет в базах, — из ручного списка (если их ещё нет).
const titled = new Set(disney.map((r) => key(r.title, r.year)));
for (const rec of manual.disney ?? []) {
  const { episodes, ...rest } = rec;
  if (titled.has(key(rest.title, rest.year))) continue;
  disney.push({
    ...rest,
    seasons: episodes
      ? { seasons: [{ name: 1, series: Array.from({ length: episodes }, (_, i) => ({ id: i + 1, name: i + 1 })) }] }
      : null
  });
  console.log(`  +  ${rest.title} (${rest.year})  ручная карточка, серий ${episodes ?? '—'}`);
}

console.log(`\nИтого: видеосалон ${salon.length} из ${SALON.length}, Дисней-клуб ${disney.length}`);
if (DRY) {
  writeFileSync(resolve(HERE, 'selection.dry.json'), JSON.stringify({ generatedAt: new Date().toISOString(), salon, disney }, null, 2));
  console.log('--dry: selection.json не изменён, результат в tools/films/selection.dry.json');
} else {
  writeFileSync(SEL, JSON.stringify({ generatedAt: new Date().toISOString(), salon, disney }, null, 2));
  console.log('сохранено: tools/films/selection.json');
}
