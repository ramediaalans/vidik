// Линейный ТВ-эфир: три точных суточных шаблона A/B/C в каноническом UTC+3.
// После дня C снова начинается A; браузерный часовой пояс на сетку не влияет.

export const DAY_SEC = 86_400;
export const BROADCAST_UTC_OFFSET_HOURS = 3;
export const ROTATION_EPOCH = '2026-01-01'; // день A
export type RotationDay = 'A' | 'B' | 'C';
export type Provider = 'youtube' | 'rutube' | 'vibix' | 'kodik' | 'generated';
export type MediaType = 'video' | 'movie' | 'serial' | 'episode' | 'testcard';

export type PoolItem = { p: string; id: string; t: string; ch: string; sec: number; year: number | null; kind: string };
export type Pool = { tier: string; era: string; name: string; items: PoolItem[] };
export type ChannelCfg = { num: string; name: string; note?: string; pools?: string[] };
export type TvData = { pools: Record<string, Pool>; channels: Record<string, ChannelCfg>; interstitials: string[] };

export type MediaRef = {
  provider: Provider;
  mediaId: string;
  mediaType: MediaType;
  publicRef: string;
  season?: number;
  episode?: number;
  canSeek: boolean;
  reportsTime: boolean;
};

export type Slot = MediaRef & {
  start: number;
  end: number;
  sourceDurationSec: number;
  title: string;
  kind: 'program' | 'interstitial' | 'technical';
  label?: string;
  daypart: string;
  rotation: RotationDay;
};

type Asset = Omit<MediaRef, 'publicRef'> & { title: string; sec: number; publicRef?: string; label?: string };
type Block = { at: string; daypart: string; label: string; assets: Asset[]; kind?: Slot['kind'] };

const pad = (n: number) => String(n).padStart(2, '0');
export const hhmmToSec = (value: string): number => {
  const [h, m] = value.split(':').map(Number);
  return h * 3600 + m * 60;
};
export const hhmm = (sec: number): string => {
  const s = ((sec % DAY_SEC) + DAY_SEC) % DAY_SEC;
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}`;
};

export const dayNumber = (dateISO: string): number =>
  Math.floor(Date.UTC(+dateISO.slice(0, 4), +dateISO.slice(5, 7) - 1, +dateISO.slice(8, 10)) / 86_400_000);

export function broadcastDateISO(d: Date = new Date()): string {
  const shifted = new Date(d.getTime() + BROADCAST_UTC_OFFSET_HOURS * 3_600_000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

export function broadcastSecondsOfDay(d: Date = new Date()): number {
  const shifted = new Date(d.getTime() + BROADCAST_UTC_OFFSET_HOURS * 3_600_000);
  return shifted.getUTCHours() * 3600 + shifted.getUTCMinutes() * 60 + shifted.getUTCSeconds();
}

// Старые имена оставлены как совместимые алиасы для существующих импортов.
export const localDateISO = broadcastDateISO;
export const secondsOfDay = broadcastSecondsOfDay;

export function rotationForDate(dateISO: string): RotationDay {
  const n = ((dayNumber(dateISO) - dayNumber(ROTATION_EPOCH)) % 3 + 3) % 3;
  return (['A', 'B', 'C'] as const)[n];
}

const yt = (item: PoolItem, label?: string): Asset => ({
  provider: 'youtube', mediaId: item.id, mediaType: 'video', title: item.t, sec: item.sec,
  publicRef: `https://www.youtube.com/watch?v=${item.id}`, canSeek: true, reportsTime: true, label
});
const vibixMovie = (id: string, title: string, minutes: number, slug: string): Asset => ({
  provider: 'vibix', mediaId: id, mediaType: 'movie', title, sec: minutes * 60,
  publicRef: `https://ramediaalans.github.io/vidik/videosalon/${slug}`, canSeek: false, reportsTime: false
});
const vibixEpisode = (id: string, title: string, season: number, episode: number, slug: string): Asset => ({
  provider: 'vibix', mediaId: id, mediaType: 'episode', title: `${title} · ${season} сезон, ${episode} серия`, sec: 24 * 60,
  publicRef: `https://ramediaalans.github.io/vidik/disney-klub/${slug}`, season, episode, canSeek: false, reportsTime: false
});
const kodikEpisode = (id: string, title: string, episode: number, embedPath: string, translation: string): Asset => ({
  provider: 'kodik', mediaId: id, mediaType: 'episode',
  title: `${title} · 1 сезон, ${episode} серия · ${translation}`, sec: 24 * 60,
  publicRef: `https:${embedPath}?season=1&episode=${episode}&autoplay=1`, season: 1, episode,
  canSeek: false, reportsTime: false
});
const generated = (id: string, title: string, sec: number, label?: string): Asset => ({
  provider: 'generated', mediaId: id, mediaType: 'testcard', title, sec, publicRef: 'local://tv-generator',
  canSeek: true, reportsTime: true, label
});

const pick = (data: TvData, pool: string, indexes: number[], label?: string): Asset[] => {
  const items = data.pools[pool]?.items ?? [];
  return indexes.map((i) => items[i % Math.max(items.length, 1)]).filter(Boolean).map((x) => yt(x, label));
};
const ads = (data: TvData, day: number, salt: number): Asset[] => [
  ...pick(data, 'idents-ort', [day * 5 + salt]),
  ...pick(data, day % 2 ? 'ads-2' : 'ads-1', [day * 11 + salt, day * 11 + salt + 1])
];

function blocksFor(data: TvData, channelId: string, rotation: RotationDay): Block[] {
  const d = ({ A: 0, B: 1, C: 2 } as const)[rotation];
  const cartoons = (salt: number) => pick(data, 'cartoons', [d * 18 + salt, d * 18 + salt + 1, d * 18 + salt + 2]);
  const archive = (salt: number) => pick(data, 'films-rare', [d * 7 + salt]);
  const replay = (salt: number) => pick(data, 'ort-guide-replay', [d + salt]);
  const night = (label: string) => generated(`testcard-${rotation}`, `Технический перерыв · таблица ${rotation}`, 3 * 60 * 60, label);

  if (channelId === 'pervaya') return [
    { at: '00:00', daypart: 'Ночной эфир', label: 'Музыкальная ночь', assets: [...replay(3), ...ads(data, d, 0)] },
    { at: '03:00', daypart: 'Технический перерыв', label: 'Профилактика', assets: [night('Технический перерыв')], kind: 'technical' },
    { at: '06:00', daypart: 'Доброе утро', label: 'Утренние мультфильмы', assets: [...cartoons(0), ...ads(data, d, 2)] },
    { at: '08:00', daypart: 'Семейное утро', label: 'Семейное кино', assets: [
      [vibixMovie('63592', 'Один дома', 103, 'odin-doma-1990'), vibixMovie('4613', 'Маска', 101, 'maska-1994'), vibixMovie('18530', 'Джуманджи', 104, 'dzhumandzhi-1995')][d], ...ads(data, d, 4)
    ] },
    { at: '11:00', daypart: 'Детский час', label: 'Игра для школьников', assets: [...archive(0), ...cartoons(4), ...ads(data, d, 6)] },
    { at: '14:00', daypart: 'Disney-клуб', label: 'Disney-клуб', assets: [[
      vibixEpisode('2159', 'Утиные истории', 1, 1, 'utinye-istorii-1987'), vibixEpisode('322', 'Чип и Дейл спешат на помощь', 1, 1, 'chip-i-deyl-speshat-na-pomosch-1989'), vibixEpisode('3181', 'Чёрный Плащ', 1, 1, 'chernyy-plasch-1991')
    ][d], ...cartoons(7), ...ads(data, d, 8)] },
    { at: '17:00', daypart: 'Вечер', label: 'Шоу и юмор', assets: [...archive(4), ...replay(0), ...ads(data, d, 10)] },
    { at: '20:45', daypart: 'Детский вечер', label: 'Спокойной ночи, малыши!', assets: pick(data, 'goodnight', [d], 'Спокойной ночи, малыши!') },
    { at: '21:00', daypart: 'Главный эфир', label: 'Время', assets: pick(data, 'vremya', [d], 'Время') },
    { at: '22:00', daypart: 'Вечернее кино', label: 'Большое кино', assets: [[
      vibixMovie('4487', 'Назад в будущее', 116, 'nazad-v-buduschee-1985'), vibixMovie('4762', 'Парк Юрского периода', 127, 'park-yurskogo-perioda-1993'), vibixMovie('4528', 'Пятый элемент', 126, 'pyatyy-element-1997')
    ][d], ...ads(data, d, 12)] }
  ];

  if (channelId === 'shestaya') return [
    { at: '00:00', daypart: 'Ночной эфир', label: 'Клипы и ночной MTV', assets: [...replay(4), ...ads(data, d, 20)] },
    { at: '03:00', daypart: 'Технический перерыв', label: 'Профилактика', assets: [night('Технический перерыв')], kind: 'technical' },
    { at: '06:00', daypart: 'Мульт-утро', label: 'Анимационный блок', assets: [...cartoons(9), ...ads(data, d, 22)] },
    { at: '09:00', daypart: 'Молодёжное утро', label: 'Сериальный марафон', assets: [[
      vibixEpisode('4030', 'Гуфи и его команда', 1, 1 + d, 'gufi-i-ego-komanda-1992'), vibixEpisode('1908', 'Мишки Гамми', 1, 1 + d, 'priklyucheniya-mishek-gammi-1985'), vibixEpisode('7616', 'Аладдин', 1, 1 + d, 'aladdin-1994')
    ][d], ...cartoons(12), ...ads(data, d, 24)] },
    { at: '13:00', daypart: 'Игровой клуб', label: 'Игры и приставки', assets: [...archive(8), ...replay(1), ...ads(data, d, 26)] },
    { at: '16:00', daypart: 'Аниме', label: 'Аниме-блок', assets: [[
      kodikEpisode('serial-8488', 'Красавица-воин Сейлор Мун', 1, '//kodikplayer.com/serial/8488/0afa5659b62fc925edce02c1c151978d/720p', '2x2'),
      kodikEpisode('serial-5877', 'Евангелион', 1, '//kodikplayer.com/serial/5877/c366b8af7a1a826bf38e9a158f213624/720p', 'MC Entertainment'),
      kodikEpisode('serial-2024', 'Крутой учитель Онидзука', 1, '//kodikplayer.com/serial/2024/4b6b44fbc0fb303b827fc2b1786ad2a1/720p', 'MC Entertainment')
    ][d], ...cartoons(15)] },
    { at: '18:00', daypart: 'Прайм-тайм', label: 'Фэнтези и мистика', assets: [[
      vibixMovie('5210', 'Смертельная битва', 101, 'smertelnaya-bitva-1995'), vibixMovie('4753', 'Мумия', 124, 'mumiya-1999'), vibixMovie('4469', 'Матрица', 136, 'matrica-1999')
    ][d], ...ads(data, d, 28)] },
    { at: '21:00', daypart: 'Вечер', label: 'Скетчи и редкое ТВ', assets: [...archive(12), ...replay(2), ...ads(data, d, 30)] }
  ];

  return [
    { at: '00:00', daypart: 'Полуночный сеанс', label: 'Триллер / хоррор', assets: [[
      vibixMovie('4589', 'Чужие', 137, 'chuzhie-1986'), vibixMovie('4681', 'Хищник', 104, 'hischnik-1987'), vibixMovie('22293', 'Терминатор 2: Судный день', 137, 'terminator-2-sudnyy-den-1991')
    ][d], ...pick(data, 'vhs-ads', [d])] },
    { at: '03:00', daypart: 'Технический перерыв', label: 'Профилактика', assets: [night('Технический перерыв')], kind: 'technical' },
    { at: '06:00', daypart: 'Семейный сеанс', label: 'Семейная анимация', assets: [[
      vibixMovie('23652', 'Черепашки-ниндзя', 93, 'cherepashki-nindzya-1990'), vibixMovie('63592', 'Один дома', 103, 'odin-doma-1990'), vibixMovie('18530', 'Джуманджи', 104, 'dzhumandzhi-1995')
    ][d], ...pick(data, 'vhs-ads', [d + 1])] },
    { at: '09:00', daypart: 'Комедия', label: 'Комедийный сеанс', assets: [[
      vibixMovie('4613', 'Маска', 101, 'maska-1994'), vibixMovie('5192', 'Майор Пэйн', 95, 'mayor-peyn-1995'), vibixMovie('6292', 'Тупой и ещё тупее', 107, 'tupoy-i-esche-tupee-1994')
    ][d], ...pick(data, 'vhs-ads', [d + 2])] },
    { at: '12:00', daypart: 'Восточные единоборства', label: 'Карате-сеанс', assets: [[
      vibixMovie('5651', 'Кровавый спорт', 92, 'krovavyy-sport-1988'), vibixMovie('220448', 'Кикбоксер', 97, 'kikbokser-1989'), vibixMovie('5210', 'Смертельная битва', 101, 'smertelnaya-bitva-1995')
    ][d], ...pick(data, 'vhs-ads', [d + 3])] },
    { at: '15:00', daypart: 'Боевик', label: 'Дневной боевик', assets: [[
      vibixMovie('5551', 'Коммандос', 87, 'kommandos-1985'), vibixMovie('5193', 'Робокоп', 102, 'robokop-1987'), vibixMovie('4600', 'Крепкий орешек', 133, 'krepkiy-oreshek-1988')
    ][d], ...pick(data, 'vhs-ads', [d + 4])] },
    { at: '18:00', daypart: 'Блокбастер', label: 'Большой сеанс', assets: [[
      vibixMovie('4762', 'Парк Юрского периода', 127, 'park-yurskogo-perioda-1993'), vibixMovie('5138', 'День независимости', 145, 'den-nezavisimosti-1996'), vibixMovie('4528', 'Пятый элемент', 126, 'pyatyy-element-1997')
    ][d], ...pick(data, 'vhs-ads', [d + 5])] },
    { at: '21:00', daypart: 'Вечерний сеанс', label: 'Триллер', assets: [[
      vibixMovie('4795', 'Скорость', 116, 'skorost-1994'), vibixMovie('19891', 'Леон', 133, 'leon-1994'), vibixMovie('4627', 'Терминатор', 108, 'terminator-1984')
    ][d], ...pick(data, 'vhs-ads', [d + 6])] }
  ];
}

export function buildDay(data: TvData, channelId: string, dateISO: string): Slot[] {
  if (!data.channels[channelId]) return [];
  const rotation = rotationForDate(dateISO);
  const blocks = blocksFor(data, channelId, rotation);
  const slots: Slot[] = [];
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    let t = hhmmToSec(block.at);
    const end = b + 1 < blocks.length ? hhmmToSec(blocks[b + 1].at) : DAY_SEC;
    let i = 0;
    while (t < end) {
      const asset = block.assets[i % block.assets.length];
      const duration = Math.min(Math.max(1, asset.sec), end - t);
      slots.push({ start: t, end: t + duration, sourceDurationSec: asset.sec, title: asset.title,
        kind: block.kind ?? (asset.provider === 'youtube' && /реклам|застав/i.test(asset.title) ? 'interstitial' : 'program'),
        label: asset.label ?? block.label, daypart: block.daypart, rotation, provider: asset.provider,
        mediaId: asset.mediaId, mediaType: asset.mediaType, publicRef: asset.publicRef ?? '', season: asset.season,
        episode: asset.episode, canSeek: asset.canSeek, reportsTime: asset.reportsTime });
      t += duration;
      i++;
    }
  }
  return slots;
}

export function nowPlaying(slots: Slot[], secOfDay: number): { slot: Slot; offsetSec: number; index: number } | null {
  const index = slots.findIndex((s) => secOfDay >= s.start && secOfDay < s.end);
  return index < 0 ? null : { slot: slots[index], offsetSec: secOfDay - slots[index].start, index };
}
export const guide = (slots: Slot[]): Slot[] => slots.filter((s) => s.kind !== 'interstitial');
export const slotLabel = (slot: Slot): string => slot.kind === 'interstitial' ? 'Реклама / заставка' : (slot.label ?? slot.title);
