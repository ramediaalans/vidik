// Линейный ТВ-эфир: три точных суточных шаблона A/B/C в каноническом UTC+3.
// Сетка и контент лежат в airtime.json (собирается tools/tv/collect/build-final.mjs).
// После дня C снова начинается A; браузерный часовой пояс на сетку не влияет.
import airtimeJson from './airtime.json';

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
  sourceDurationSec: number;
  title: string;
  kind: 'program' | 'interstitial' | 'technical';
  label?: string;
  daypart: string;
  rotation: RotationDay;
};

type Asset = Omit<MediaRef, 'publicRef'> & { title: string; sec: number; publicRef?: string; label?: string };
type Block = { at: string; daypart: string; label: string; assets: Asset[]; kind?: Slot['kind'] };

// Сырой ассет из airtime.json
type RawAsset = {
  provider: string;
  id: string;
  dur: number | null;
  title: string;
  up?: string | null;
  src?: string;
  mediaType?: string;
  season?: number;
  episode?: number;
  kp?: number;
};
type RawBlock = { at: string; label: string; kind?: string; assets: RawAsset[] };
type Airtime = {
  meta: Record<string, string>;
  interstitials: Record<string, RawAsset[]>;
  channels: Record<string, { title: string } & Record<string, unknown>>;
};

const airtime = airtimeJson as unknown as Airtime;

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

function dayPartOf(at: string): string {
  const h = Math.floor(hhmmToSec(at) / 3600);
  if (h < 6) return 'Ночной эфир';
  if (h < 12) return 'Утро';
  if (h < 17) return 'День';
  if (h < 21) return 'Вечер';
  return 'Прайм-тайм';
}

function toAsset(raw: RawAsset, kind: Slot['kind']): Asset {
  const provider = raw.provider as Provider;
  const mediaType: MediaType = provider === 'generated' ? 'testcard' : 'video';
  const sec = raw.dur && raw.dur > 0 ? raw.dur : 30 * 60;
  const publicRef =
    provider === 'youtube'
      ? `https://www.youtube.com/watch?v=${raw.id}`
      : provider === 'rutube'
        ? `https://rutube.ru/video/${raw.id}/`
        : provider === 'vk'
          ? `https://vk.com/video${raw.id}`
          : 'local://tv-generator';
  return {
    provider,
    mediaId: raw.id,
    mediaType,
    title: raw.title,
    sec,
    publicRef,
    season: raw.season,
    episode: raw.episode,
    canSeek: provider === 'youtube' || provider === 'rutube' || provider === 'vk' || provider === 'generated',
    reportsTime: provider === 'youtube' || provider === 'rutube' || provider === 'vk' || provider === 'generated',
    label: kind === 'interstitial' ? 'Реклама / заставка' : undefined
  };
}

// Реклама и заставки: ровно один ролик после каждой программы внутри блока.
function interstitialFor(channelId: string, rotation: RotationDay, n: number): Asset {
  const groups = channelId === 'kabelny' ? ['vhs', 'ads'] : ['ads', 'idents'];
  const group = airtime.interstitials[groups[n % groups.length]] ?? [];
  const salt = ({ A: 0, B: 5, C: 10 } as const)[rotation];
  const raw = group[(n + salt) % Math.max(group.length, 1)];
  return toAsset(raw, 'interstitial');
}

function blocksFor(channelId: string, rotation: RotationDay): Block[] {
  const channel = airtime.channels[channelId];
  // В источнике эфирный день начинается в 06:00, а ночные блоки стоят в конце списка.
  // Сетка живёт в календарных сутках, поэтому сортируем по времени и тянем первый блок к 00:00.
  const raw = [...((channel?.[rotation] as RawBlock[] | undefined) ?? [])].sort(
    (a, b) => hhmmToSec(a.at) - hhmmToSec(b.at)
  );
  let counter = 0;
  return raw.map((block, index) => {
    const kind = (block.kind as Slot['kind'] | undefined) ?? 'program';
    const programs = block.assets.map((a) => toAsset(a, kind));
    const assets: Asset[] =
      kind === 'program'
        ? programs.flatMap((a) => [a, interstitialFor(channelId, rotation, counter++)])
        : programs;
    const at = index === 0 ? '00:00' : block.at;
    return { at, daypart: dayPartOf(at), label: block.label, assets, kind };
  });
}

export function buildDay(data: TvData, channelId: string, dateISO: string): Slot[] {
  if (!data.channels[channelId] || !airtime.channels[channelId]) return [];
  const rotation = rotationForDate(dateISO);
  const blocks = blocksFor(channelId, rotation);
  const slots: Slot[] = [];
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    let t = hhmmToSec(block.at);
    const end = b + 1 < blocks.length ? hhmmToSec(blocks[b + 1].at) : DAY_SEC;
    let i = 0;
    while (t < end && block.assets.length > 0) {
      const asset = block.assets[i % block.assets.length];
      const duration = Math.min(Math.max(1, asset.sec), end - t);
      slots.push({
        start: t,
        end: t + duration,
        sourceDurationSec: asset.sec,
        title: asset.title,
        kind: asset.label === 'Реклама / заставка' ? 'interstitial' : (block.kind ?? 'program'),
        label: asset.label ?? block.label,
        daypart: block.daypart,
        rotation,
        provider: asset.provider,
        mediaId: asset.mediaId,
        mediaType: asset.mediaType,
        publicRef: asset.publicRef ?? '',
        season: asset.season,
        episode: asset.episode,
        canSeek: asset.canSeek,
        reportsTime: asset.reportsTime
      });
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
export const slotLabel = (slot: Slot): string =>
  slot.kind === 'interstitial' ? 'Реклама / заставка' : (slot.label ?? slot.title);
