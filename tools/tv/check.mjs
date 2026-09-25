// Проверка пулов YouTube для ТВ-раздела ВИДИК.
// Читает YT_API_KEY из .env, тянет плейлисты через Data API v3,
// проверяет живость/встраиваемость/гео и пишет отчёт в tools/tv/pool.raw.json.
// Ключ нигде не печатается.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');

function loadKey() {
  const raw = readFileSync(resolve(ROOT, '.env'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*YT_API_KEY\s*=\s*(.+?)\s*$/.exec(line);
    if (m) return m[1].replace(/^["']|["']$/g, '');
  }
  throw new Error('YT_API_KEY не найден в .env');
}
const KEY = loadKey();

const POOLS = [
  { id: 'ort-guide',  tier: 'B', name: 'Программы передач ОРТ 1997-1999', playlist: 'PLPJm59W3jZdi6cyR2eJxGtmoOqaEiaGzH' },
  { id: 'vhs-ads',    tier: 'B', name: 'Оцифровки VHS (СГ)',              playlist: 'PLtrWocuDZ3VFCIvR9iQQAKxdiUMg8Yjhp' },
  { id: 'ads-1',      tier: 'B', name: 'реклама 90-х годов',              playlist: 'PLdHC5zfVVF36TuSKtzgOVm6uz_0BS_NNk' },
  { id: 'ads-2',      tier: 'B', name: 'Русские рекламы 90-х',            playlist: 'PLKnCpGSOledeNuDQNiWooKZVefoWMOiBS' },
  { id: 'ads-social', tier: 'B', name: 'Социальная реклама 90-е',         playlist: 'PLQB_k9DumlTvqUulNUCxksCxBPDYe_M5j' },
  { id: 'idents-ort', tier: 'B', name: 'Реклама и заставки ОРТ',          playlist: 'PLvLAxijRtp4zPMK_Tf8D0fKlGjJYZSa31' },
  { id: 'idents-rus', tier: 'B', name: 'Заставки и часы (Rustin)',        playlist: 'PLq64p6qrM1UrcE4cE3PQVMuh7mAg9hYF5' },
  { id: 'cartoons',   tier: 'A', name: 'ГТРФ: Советские мультфильмы',     playlist: 'PL6t54Fq3Uh6bDvIOMz3jq8YVNP8Z4Pikm' },
  { id: 'vremya',     tier: 'A', name: 'ГТРФ: Программа Время',           playlist: 'PL6t54Fq3Uh6ayH70fzshTRc2M_nhghP0y' },
  { id: 'goodnight',  tier: 'A', name: 'ГТРФ: Спокойной ночи, малыши',    playlist: 'PL6t54Fq3Uh6ZE2ZTDqTEuG0Pwcr7IMFFs' },
  { id: 'films-year', tier: 'A', name: 'ГТРФ: Подборки фильмов по годам', playlist: 'PL6t54Fq3Uh6aC4CK-RsIAN1pe0XXJWcq2' },
  { id: 'films-rare', tier: 'A', name: 'ГТРФ: Редкие видео и фильмы',     playlist: 'PL6t54Fq3Uh6Y01_AquIrLEOPXDhe9gR7N' }
];

const api = async (path, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', KEY);
  const r = await fetch(url);
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`${path} ${r.status}: ${body.slice(0, 300).replace(KEY, '***')}`);
  }
  return r.json();
};

async function playlistVideoIds(playlistId) {
  const ids = [];
  let pageToken;
  do {
    const data = await api('playlistItems', {
      part: 'contentDetails',
      playlistId,
      maxResults: '50',
      ...(pageToken ? { pageToken } : {})
    });
    for (const it of data.items ?? []) {
      const vid = it.contentDetails?.videoId;
      if (vid) ids.push(vid);
    }
    pageToken = data.nextPageToken;
  } while (pageToken);
  return ids;
}

const iso = (d) => {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(d ?? '');
  if (!m) return 0;
  return (+(m[1] || 0)) * 86400 + (+(m[2] || 0)) * 3600 + (+(m[3] || 0)) * 60 + (+(m[4] || 0));
};

const yearOf = (title) => {
  const years = [...String(title).matchAll(/\b(19[5-9]\d|200\d)\b/g)].map((m) => +m[1]);
  return years.length ? Math.max(...years) : null;
};

async function videoDetails(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const data = await api('videos', {
      part: 'status,contentDetails,snippet',
      id: chunk.join(','),
      hl: 'ru',
      maxResults: '50'
    });
    const got = new Set();
    for (const v of data.items ?? []) {
      got.add(v.id);
      out.push({
        videoId: v.id,
        title: v.snippet?.title ?? '',
        channel: v.snippet?.channelTitle ?? '',
        durationSec: iso(v.contentDetails?.duration),
        embeddable: v.status?.embeddable === true,
        privacy: v.status?.privacyStatus ?? '?',
        blocked: v.contentDetails?.regionRestriction?.blocked ?? null,
        allowed: v.contentDetails?.regionRestriction?.allowed ?? null,
        year: yearOf(v.snippet?.title)
      });
    }
    for (const id of chunk) if (!got.has(id)) out.push({ videoId: id, dead: true });
  }
  return out;
}

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const report = { generatedAt: new Date().toISOString(), pools: [] };

console.log('pool                 tier  total  живых  embed-  гео   90-05  медиана');
console.log('-'.repeat(78));

for (const pool of POOLS) {
  let ids = [];
  try {
    ids = await playlistVideoIds(pool.playlist);
  } catch (e) {
    console.log(`${pool.id.padEnd(20)} ОШИБКА: ${e.message}`);
    report.pools.push({ ...pool, error: e.message });
    continue;
  }
  const vids = await videoDetails(ids);
  const alive = vids.filter((v) => !v.dead);
  const usable = alive.filter((v) => v.embeddable);
  const geo = alive.filter((v) => v.blocked || v.allowed);
  const era = usable.filter((v) => v.year !== null && v.year >= 1988 && v.year <= 2005);
  const durs = usable.map((v) => v.durationSec).sort((a, b) => a - b);
  const med = durs.length ? durs[Math.floor(durs.length / 2)] : 0;
  const mmss = `${Math.floor(med / 60)}:${String(med % 60).padStart(2, '0')}`;

  console.log(
    pool.id.padEnd(20) +
      pool.tier.padEnd(6) +
      String(ids.length).padEnd(7) +
      `${alive.length}`.padEnd(7) +
      `${alive.length - usable.length}`.padEnd(7) +
      `${geo.length}`.padEnd(6) +
      `${era.length}`.padEnd(7) +
      mmss
  );

  report.pools.push({
    ...pool,
    counts: {
      inPlaylist: ids.length,
      alive: alive.length,
      embeddable: usable.length,
      notEmbeddable: alive.length - usable.length,
      geoRestricted: geo.length,
      inEra: era.length,
      medianSec: med,
      embeddablePct: pct(usable.length, ids.length)
    },
    notEmbeddableIds: alive.filter((v) => !v.embeddable).map((v) => v.videoId),
    videos: vids
  });
}

mkdirSync(HERE, { recursive: true });
writeFileSync(resolve(HERE, 'pool.raw.json'), JSON.stringify(report, null, 2), 'utf8');

const all = report.pools.flatMap((p) => p.videos ?? []);
const aliveAll = all.filter((v) => !v.dead);
console.log('-'.repeat(78));
console.log(
  `ИТОГО: ${all.length} ID · живых ${aliveAll.length} · встраиваемых ${aliveAll.filter((v) => v.embeddable).length} · ` +
    `не встраиваемых ${aliveAll.filter((v) => !v.embeddable).length} · мёртвых ${all.length - aliveAll.length}`
);
console.log('отчёт: tools/tv/pool.raw.json');
