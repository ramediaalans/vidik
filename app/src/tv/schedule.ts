// Линейный ТВ-эфир: три точных суточных шаблона A/B/C в каноническом UTC+3.
// Сетка лежит в grid.json — выгрузка листа «ТВ» мастер-таблицы vidik-content-audit.xlsx
// (та же сетка, что в газетной программе program.ts). После дня C снова начинается A;
// браузерный часовой пояс на сетку не влияет.
import gridJson from './grid.json';

export const DAY_SEC = 86_400;
export const BROADCAST_UTC_OFFSET_HOURS = 3;
export const ROTATION_EPOCH = '2026-01-01'; // день A
export type RotationDay = 'A' | 'B' | 'C';
export type Provider = 'youtube' | 'rutube' | 'vk' | 'kodik' | 'generated';
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
  /** С какой секунды исходника начинается слот (фрагмент сборника, обрезка заставки). */
  from: number;
  sourceDurationSec: number;
  title: string;
  kind: 'program' | 'interstitial' | 'technical';
  label?: string;
  daypart: string;
  rotation: RotationDay;
};

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
  const n = (((dayNumber(dateISO) - dayNumber(ROTATION_EPOCH)) % 3) + 3) % 3;
  return (['A', 'B', 'C'] as const)[n];
}

// Готовая сетка из мастер-таблицы (лист «ТВ»): каждый слот — точное время, ролик и
// стартовая точка внутри исходника. Реклама и заставки уже стоят в сетке между передачами.
type GridRow = [start: number, kind: 'p' | 'i' | 't', media: number, from: number, block: number];
type Grid = {
  media: [provider: string, id: string, title: string][];
  blocks: string[];
  days: Record<RotationDay, Record<string, GridRow[]>>;
};
const grid = gridJson as unknown as Grid;
const KIND = { p: 'program', i: 'interstitial', t: 'technical' } as const;
const SEEKABLE: Provider[] = ['youtube', 'rutube', 'vk', 'generated'];

function publicRefOf(provider: Provider, id: string): string {
  if (provider === 'youtube') return `https://www.youtube.com/watch?v=${id}`;
  if (provider === 'rutube') return `https://rutube.ru/video/${id}/`;
  if (provider === 'vk') return `https://vk.com/video${id}`;
  return 'local://tv-generator';
}

function dayPartOf(sec: number): string {
  const h = Math.floor(sec / 3600);
  if (h < 6) return 'Ночной эфир';
  if (h < 12) return 'Утро';
  if (h < 17) return 'День';
  if (h < 21) return 'Вечер';
  return 'Прайм-тайм';
}

export function buildDay(data: TvData, channelId: string, dateISO: string): Slot[] {
  const rotation = rotationForDate(dateISO);
  const rows = grid.days[rotation]?.[channelId];
  if (!data.channels[channelId] || !rows) return [];
  // Секундные зазоры между строками таблицы (округление до минут) закрываем:
  // слот длится до начала следующего, последний — до конца суток.
  return rows.map(([start, k, m, from, b], i) => {
    const [rawProvider, mediaId, title] = grid.media[m];
    const provider = rawProvider as Provider;
    const kind = KIND[k];
    const end = i + 1 < rows.length ? rows[i + 1][0] : DAY_SEC;
    return {
      start,
      end,
      from,
      sourceDurationSec: from + (end - start),
      title,
      kind,
      label: kind === 'interstitial' ? 'Реклама / заставка' : grid.blocks[b],
      daypart: dayPartOf(start),
      rotation,
      provider,
      mediaId,
      mediaType: provider === 'generated' ? 'testcard' : 'video',
      publicRef: publicRefOf(provider, mediaId),
      canSeek: SEEKABLE.includes(provider),
      reportsTime: SEEKABLE.includes(provider)
    };
  });
}

export function nowPlaying(slots: Slot[], secOfDay: number): { slot: Slot; offsetSec: number; index: number } | null {
  const index = slots.findIndex((s) => secOfDay >= s.start && secOfDay < s.end);
  return index < 0 ? null : { slot: slots[index], offsetSec: secOfDay - slots[index].start, index };
}
export const guide = (slots: Slot[]): Slot[] => slots.filter((s) => s.kind !== 'interstitial');
export const slotLabel = (slot: Slot): string =>
  slot.kind === 'interstitial' ? 'Реклама / заставка' : (slot.label ?? slot.title);
