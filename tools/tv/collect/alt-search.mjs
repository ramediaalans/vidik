// Искатель альтернатив Vibix-позициям на Rutube и YouTube.
// Главное — найти ЦЕЛЫЙ фильм/серию, а не трейлер и не нарезку: жёсткий фильтр по длительности.
import fs from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const KEY = process.env.YT_API_KEY || (env.match(/YT_API_KEY\s*=\s*(\S+)/) || [])[1] || '';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const items = JSON.parse(fs.readFileSync('tools/tv/collect/vibix-resolved.json', 'utf8'));
const list = args.only ? items.filter((i) => args.only.split(',').includes(i.key)) : items;

const norm = (s) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9 ]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const STOP = new Set(['и', 'в', 'на', 'с', 'за', 'из', 'не', 'а', 'по', 'к', 'у', 'о', 'для', 'the', 'of', 'a']);
const words = (s) => norm(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w));

// Слова, после которых ролик точно не является самим фильмом.
const BAD =
  /трейлер|trailer|обзор|разбор|нарезк|момент|сцена|сцены|отрывок|фрагмент|реакци|reaction|интересные факт|за кадром|как снимал|ошибк|вырезан|клип|песня|саундтрек|музыка из|топ \d|подборк|edit|shorts|мем|пересказ|сюжет|спойл|концовк|фильм о фильме|игра по |геймплей|мульт в мин|за \d+ минут|все серии подряд|сборник|скрытый смысл|смысл фильм|объяснени|теори|факты|почему|чем законч|подкаст|лекци|история создан|стрим|премьера трейл/i;

async function rutube(q) {
  const out = [];
  for (let page = 1; page <= 2; page += 1) {
    const r = await fetch(
      `https://rutube.ru/api/search/video/?query=${encodeURIComponent(q)}&limit=20&page=${page}`,
      { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } },
    ).catch(() => null);
    if (!r || !r.ok) break;
    const j = await r.json().catch(() => null);
    if (!j?.results?.length) break;
    for (const v of j.results)
      out.push({
        p: 'rutube',
        id: v.id,
        t: v.title,
        dur: v.duration,
        up: (v.created_ts ?? '').slice(0, 10),
        hits: v.hits ?? 0,
        official: !!v.is_official,
        adult: !!v.is_adult,
        author: v.author?.name ?? '',
      });
  }
  return out;
}

// Поиск по YouTube без квоты: читаем ytInitialData со страницы выдачи.
async function ytSearchIds(q) {
  const r = await fetch(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&hl=ru&gl=RU&sp=EgIQAQ%253D%253D`,
    { headers: { 'User-Agent': UA, 'Accept-Language': 'ru-RU,ru' } },
  ).catch(() => null);
  if (!r || !r.ok) return [];
  const html = await r.text();
  const ids = [...html.matchAll(/"videoId":"([\w-]{11})"/g)].map((m) => m[1]);
  return [...new Set(ids)].slice(0, 28);
}

async function youtube(q) {
  if (!KEY) return [];
  const ids = await ytSearchIds(q);
  if (!ids.length) return [];
  const d = await (
    await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet,status,statistics&id=${ids.join(',')}&key=${KEY}`,
    )
  ).json();
  if (d.error) {
    console.log('YT ERROR', JSON.stringify(d.error.errors ?? d.error).slice(0, 200));
    return null;
  }
  return (d.items ?? []).map((it) => {
    const m = it.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || [];
    return {
      p: 'youtube',
      id: it.id,
      t: it.snippet.title,
      dur: +(m[1] || 0) * 3600 + +(m[2] || 0) * 60 + +(m[3] || 0),
      up: it.snippet.publishedAt.slice(0, 10),
      hits: +(it.statistics?.viewCount ?? 0),
      official: false,
      adult: it.contentDetails.contentRating?.ytRating === 'ytAgeRestricted',
      region: !!it.contentDetails.regionRestriction,
      embeddable: it.status.embeddable,
      author: it.snippet.channelTitle,
    };
  });
}

// Номер части франшизы: «Один дома 2» → 2. Без номера → 1.
const part = (s) => {
  const m = norm(s).match(/(?:^|\s)([2-5])(?:\s|$)/);
  return m ? +m[1] : 1;
};
const yearIn = (s) => [...s.matchAll(/\b(19\d{2}|200\d)\b/g)].map((m) => +m[1]);

function score(c, want, lo, hi, it) {
  if (c.adult || c.region || c.embeddable === false) return -1;
  if (BAD.test(c.t)) return -1;
  if (!c.dur || c.dur < lo || c.dur > hi) return -1;
  const t = words(c.t);
  const hit = want.filter((w) => t.includes(w)).length;
  const cover = hit / want.length;
  if (cover < 0.7) return -1;
  if (!t.includes(want[0])) return -1; // первое значимое слово названия обязательно

  // Год в заголовке, если есть, должен совпадать с оригиналом.
  const ys = yearIn(c.t);
  const want0 = +it.year;
  if (ys.length && want0 && !ys.some((y) => Math.abs(y - want0) <= 1)) return -1;
  // Номер части должен совпадать: не путаем «Бетховен» с «Бетховен 3».
  if (it.dataType === 'movie' && part(c.t) !== part(it.name)) return -1;

  if (it.dataType === 'movie') {
    // Целый фильм почти всегда подписан годом, словом «фильм» либо просто названием.
    const plain = norm(c.t).length <= norm(it.name).length + 28;
    if (!ys.length && !/фильм|кино|movie|hd|дубляж|полный/i.test(c.t) && !plain) return -1;
  } else {
    // У сериала нужна пометка серии.
    if (!/серия|сезон|эпизод|\d\s*[xх]\s*\d|episode|season|s\d+e\d+/i.test(c.t)) return -1;
  }

  const age = c.up ? Math.max(0, 2026 - +c.up.slice(0, 4)) : 0;
  return cover * 100 + Math.min(age, 12) * 2 + Math.min(Math.log10(c.hits + 10), 7) * 3 + (c.official ? 8 : 0);
}

const results = [];
let ytDead = false;

for (const it of list) {
  const movie = it.dataType === 'movie';
  const base = it.name.replace(/\s*[:—-].*$/, '').trim();
  const want = words(base.length > 3 ? base : it.name);
  // Окно длительности: у фильмов от эталона Vibix, у сериалов — типовая серия.
  const [lo, hi] = movie
    ? it.dur
      ? [it.dur * 60 * 0.82, it.dur * 60 * 1.2]
      : [70 * 60, 180 * 60]
    : [17 * 60, 70 * 60];

  const queries = movie
    ? [`${it.name} ${it.year}`, `${base} ${it.year} фильм`, base]
    : [`${base} 1 сезон 1 серия`, `${base} 1 серия`, `${base} ${it.year} серия`];

  const pool = [];
  for (const q of queries) pool.push(...(await rutube(q)));
  const rtBest = pool
    .map((c) => ({ ...c, s: score(c, want, lo, hi, it) }))
    .filter((c) => c.s > 0)
    .sort((a, b) => b.s - a.s);

  let ytBest = [];
  if (!ytDead) {
    const ypool = [];
    for (const q of queries.slice(0, movie ? 2 : 2)) {
      const r = await youtube(q);
      if (r === null) {
        ytDead = true;
        break;
      }
      ypool.push(...r);
    }
    ytBest = ypool
      .map((c) => ({ ...c, s: score(c, want, lo, hi, it) }))
      .filter((c) => c.s > 0)
      .sort((a, b) => b.s - a.s);
  }

  const uniq = (arr) => {
    const seen = new Set();
    return arr.filter((c) => (seen.has(c.id) ? false : seen.add(c.id)));
  };
  const row = {
    key: it.key,
    name: it.name,
    year: it.year,
    type: it.dataType,
    vibixDur: it.dur,
    window: [Math.round(lo / 60), Math.round(hi / 60)],
    rutube: uniq(rtBest).slice(0, 6),
    youtube: uniq(ytBest).slice(0, 6),
  };
  results.push(row);
  const fmt = (c) => `${c.p}:${c.id} ${Math.round(c.dur / 60)}м ${c.up} «${c.t.slice(0, 48)}»`;
  console.log(
    `\n${it.key} — ${it.name} (${it.year}) ${movie ? it.dur + 'м' : 'сериал'} | окно ${row.window[0]}–${row.window[1]}м`,
  );
  if (!row.rutube.length && !row.youtube.length) console.log('  — альтернатив нет');
  for (const c of [...row.rutube.slice(0, 2), ...row.youtube.slice(0, 2)]) console.log('  ' + fmt(c));
}

fs.writeFileSync(args.out ?? 'tools/tv/collect/alt-found.json', JSON.stringify(results, null, 1), 'utf8');
const withAlt = results.filter((r) => r.rutube.length || r.youtube.length);
console.log(`\nИТОГО: альтернативы найдены для ${withAlt.length}/${results.length}${ytDead ? ' (YouTube отключился по квоте)' : ''}`);
