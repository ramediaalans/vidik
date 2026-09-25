// Подбор содержимого для видеосалона и Дисней-клуба.
// Сверяет ручной список с базой Vibix, тянет полные карточки
// и пишет tools/films/selection.json. Токен нигде не печатается.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const env = {};
for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = /^\s*(?:export\s+)?([A-Za-z0-9_.-]+)\s*=\s*(.*)$/.exec(line);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const V = env.BALANCER2_BASE.replace(/\/+$/, '');
const auth = { headers: { Authorization: `Bearer ${env.BALANCER2_TOKEN}`, Accept: 'application/json' } };

const api = async (path, init) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`${V}${path}`, { ...auth, ...init });
      const t = await r.text();
      try {
        return { status: r.status, json: JSON.parse(t) };
      } catch {
        return { status: r.status, json: null, text: t };
      }
    } catch {
      await new Promise((x) => setTimeout(x, 400));
    }
  }
  return { status: 0, json: null };
};

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
  ['Стиратель', 1996],
  ['Скорость', 1994],
  ['Черепашки-ниндзя', 1990],
  // фантастика и блокбастеры
  ['Назад в будущее', 1985],
  ['Чужие', 1986],
  ['Парк Юрского периода', 1993],
  ['Пятый элемент', 1997],
  ['Матрица', 1999],
  ['День независимости', 1996],
  ['Мумия', 1999],
  // комедии и семейное
  ['Один дома', 1990],
  ['Маска', 1994],
  ['Джуманджи', 1995],
  ['Майор Пэйн', 1995],
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
  ['Особенности национальной охоты', 1995],
  ['Жмурки', 2005],
  ['Бумер', 2003]
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
  ['101 далматинец', 1997],
  ['Мышиный дом', 2001],
  ['Лило и Стич', 2003]
];

const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^a-zа-я0-9]+/gi, ' ')
    .trim();

async function findOne(title, year, wantType) {
  const r = await api(`/api/v1/publisher/videos/search?name=${encodeURIComponent(title)}`, { method: 'POST' });
  const list = r.json?.data ?? [];
  const target = norm(title);
  const scored = list
    .map((it) => {
      const names = [it.name, it.name_rus, it.name_eng, it.name_original].map(norm);
      let score = 0;
      if (names.includes(target)) score += 100;
      else if (names.some((n) => n.startsWith(target))) score += 60;
      else if (names.some((n) => n.includes(target))) score += 30;
      const dy = Math.abs(Number(it.year) - year);
      if (dy === 0) score += 50;
      else if (dy <= 1) score += 30;
      else if (dy <= 3) score += 5;
      else score -= dy;
      if (wantType && it.type === wantType) score += 25;
      else if (wantType) score -= 25;
      if (it.kp_id) score += 5;
      return { it, score, dy };
    })
    .sort((a, b) => b.score - a.score);

  return { best: scored[0], all: scored, found: list.length, status: r.status };
}

async function card(kpId) {
  const r = await api(`/api/v1/publisher/videos/kp/${kpId}`);
  return r.json ?? null;
}

async function seasons(kpId) {
  const r = await api(`/api/v1/serials/kp/${kpId}`);
  return r.json ?? null;
}

async function process(list, wantType, label) {
  console.log('\n' + '='.repeat(96));
  console.log(label);
  console.log('='.repeat(96));
  const out = [];
  for (const [title, year] of list) {
    const { best, found, status } = await findOne(title, year, wantType);
    if (!best || best.score < 60) {
      console.log(`  —  ${title} (${year})  не найдено [вариантов ${found}, http ${status}]`);
      continue;
    }
    const it = best.it;
    const full = it.kp_id ? await card(it.kp_id) : null;
    const ser = wantType === 'serial' && it.kp_id ? await seasons(it.kp_id) : null;
    const embedCode = full?.embed_code ?? '';
    const playerType = /data-type="([^"]+)"/.exec(embedCode)?.[1] ?? null;
    const playerId = /data-id="([^"]+)"/.exec(embedCode)?.[1] ?? null;
    const rec = {
      ask: { title, year },
      id: it.id,
      kpId: it.kp_id ?? null,
      imdbId: full?.imdb_id ?? it.imdb_id ?? null,
      type: it.type,
      playerType,
      playerId,
      title: full?.name_rus ?? full?.name ?? it.name,
      titleOrig: full?.name_original ?? full?.name_eng ?? null,
      year: Number(full?.year ?? it.year) || null,
      kpRating: full?.kp_rating ? Number(full.kp_rating) : null,
      duration: full?.duration ?? null,
      quality: full?.quality ?? it.quality ?? null,
      genres: full?.genre ?? [],
      countries: full?.country ?? [],
      poster: full?.poster_url ?? it.poster_url ?? null,
      backdrop: full?.backdrop_url ?? null,
      short: full?.description_short ?? null,
      description: full?.description ?? null,
      voiceovers: (full?.voiceovers ?? []).map((v) => ({ id: v.id, name: v.name })),
      seasons: ser?.data ?? ser ?? null
    };
    out.push(rec);
    let sInfo = '';
    if (wantType === 'serial') {
      const arr = Array.isArray(rec.seasons) ? rec.seasons : (rec.seasons?.seasons ?? []);
      if (Array.isArray(arr) && arr.length) {
        const eps = arr.reduce((n, s) => n + (s.episodes?.length ?? s.episodes_count ?? 0), 0);
        sInfo = `  сезонов=${arr.length} серий=${eps}`;
      } else sInfo = '  СЕЗОНЫ НЕ ПРИШЛИ';
    }
    console.log(
      `  ✓  ${String(rec.title).slice(0, 34).padEnd(36)} ${String(rec.year).padEnd(6)} kp=${String(rec.kpId).padEnd(8)} ${String(rec.type).padEnd(7)} player=${String(rec.playerType)}/${String(rec.playerId)} ${String(rec.quality ?? '').padEnd(8)} кп=${String(rec.kpRating ?? '-').padEnd(5)} ${rec.duration ? rec.duration + 'мин' : ''} озвучек=${rec.voiceovers.length}${rec.poster ? '' : '  БЕЗ ПОСТЕРА'}${rec.description ? '' : '  БЕЗ ОПИСАНИЯ'}` +
        sInfo +
        (best.dy ? `  [год расходится на ${best.dy}]` : '')
    );
  }
  return out;
}

const salon = await process(SALON, 'movie', 'ВИДЕОСАЛОН — фильмы');
const disney = await process(DISNEY, 'serial', 'ДИСНЕЙ-КЛУБ — мультсериалы');

writeFileSync(
  resolve(HERE, 'selection.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), salon, disney }, null, 2)
);
console.log(`\nИтого: видеосалон ${salon.length} из ${SALON.length}, Дисней-клуб ${disney.length} из ${DISNEY.length}`);
console.log('сохранено: tools/films/selection.json');
