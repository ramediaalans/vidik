// Разведка по концепции: есть ли вообще такой контент в виде, пригодном для встраивания.
// Считает: сколько нашлось, сколько из них embeddable, сколько длинных (полноценных).
//   node tools/tv/probe-concept.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
const KEY = /YT_API_KEY\s*=\s*(\S+)/.exec(env)?.[1];
if (!KEY) throw new Error('нет YT_API_KEY в .env');

const QUERIES = [
  ['Зов джунглей Супонев выпуск', 'К1 Супонев'],
  ['Звёздный час Супонев выпуск 1995', 'К1 Супонев'],
  ['Поле чудес Якубович 1996 выпуск', 'К1 прайм'],
  ['Любовь с первого взгляда выпуск 1995', 'К1 шоу'],
  ['Сам себе режиссёр выпуск 1996', 'К1 шоу'],
  ['Городок Стоянов Олейников выпуск', 'К1 юмор'],
  ['МузОБОЗ Демидов выпуск', 'К1 музыка'],
  ['Каламбур Деревня дураков выпуск', 'К2 скетчи'],
  ['Осторожно Модерн Нагиев выпуск', 'К2 скетчи'],
  ['От винта Бонус Гамовер выпуск', 'К2 игры'],
  ['Dendy Новая реальность Супонев выпуск', 'К2 игры'],
  ['Элен и ребята серия', 'К2 сериал'],
  ['Секретные материалы 1 сезон серия полностью', 'К2 сериал'],
  ['Сейлор Мун серия русская озвучка', 'К2 аниме'],
  ['Бивис и Баттхед MTV выпуск', 'К2 ночь'],
  ['Утиные истории серия советский дубляж', 'К1 Disney'],
  ['Терминатор 2 фильм целиком перевод Гаврилов', 'К3 блокбастер'],
  ['Кровавый спорт Ван Дамм фильм целиком', 'К3 боевик'],
  ['Пьяный мастер Джеки Чан фильм целиком', 'К3 боевик'],
  ['Игрушка Пьер Ришар фильм целиком', 'К3 комедия'],
  ['Настроечная таблица УЭИТ сигнал 1000 Гц', 'ночная пауза'],
  ['реклама банк Империал все ролики', 'перебивки'],
  ['заставка телекомпания ВИД маска', 'перебивки'],
  ['Спокойной ночи малыши выпуск 90х Хрюша', 'К1 ритуал']
];

const api = async (path, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) url.searchParams.set(k, v);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${path} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const iso = (d) => {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(d ?? '') ?? [];
  return (+(m[1] ?? 0)) * 3600 + (+(m[2] ?? 0)) * 60 + (+(m[3] ?? 0));
};

const report = [];
for (const [q, tag] of QUERIES) {
  const found = await api('search', {
    part: 'id',
    q,
    type: 'video',
    maxResults: 25,
    videoEmbeddable: 'true', // сразу только то, что в принципе можно встроить
    videoSyndicated: 'true'
  });
  const ids = found.items.map((i) => i.id.videoId).filter(Boolean);
  let long = 0;
  let restricted = 0;
  let total = 0;
  const samples = [];
  if (ids.length) {
    const det = await api('videos', {
      part: 'contentDetails,status,snippet',
      id: ids.join(',')
    });
    for (const v of det.items) {
      total++;
      const sec = iso(v.contentDetails.duration);
      if (v.contentDetails.contentRating?.ytRating === 'ytAgeRestricted') restricted++;
      if (sec >= 900) long++;
      if (samples.length < 2 && sec >= 900)
        samples.push(`${Math.round(sec / 60)}м ${v.snippet.channelTitle}: ${v.snippet.title.slice(0, 44)}`);
    }
  }
  report.push({ q, tag, total, long, restricted, samples });
  console.log(
    `${tag.padEnd(16)} ${String(total).padStart(2)} встраиваемых, из них от 15 мин: ${String(long).padStart(2)}  18+: ${restricted}  | ${q}`
  );
  for (const s of samples) console.log(`                    └ ${s}`);
}

writeFileSync(new URL('./concept-probe.json', import.meta.url), JSON.stringify(report, null, 2), 'utf8');
console.log('\nсохранено: tools/tv/concept-probe.json');
