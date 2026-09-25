// Детерминированная сетка вещания.
// Одна и та же пара (канал, дата) всегда даёт один и тот же эфир у всех зрителей.
// Ничего не хранится на сервере: расписание вычисляется из seed'а.

export const DAY_SEC = 86400;

export type PoolItem = {
  p: string; // id пула-источника
  id: string;
  t: string;
  ch: string;
  sec: number;
  year: number | null;
  kind: string;
};

export type Pool = { tier: string; era: string; name: string; items: PoolItem[] };

export type Anchor = { at: string; pool: string; label?: string };

export type ChannelCfg = {
  num: string;
  name: string;
  note?: string;
  pools: string[];
  anchors?: Anchor[];
};

export type TvData = {
  pools: Record<string, Pool>;
  channels: Record<string, ChannelCfg>;
  interstitials: string[];
};

export type Slot = {
  start: number; // секунды от 00:00 локального времени
  end: number;
  id: string; // videoId
  title: string;
  kind: 'program' | 'interstitial' | 'replay';
  pool: string;
  label?: string;
};

// Чем именно заполнен промежуток между передачами — чтобы интерфейс не врал.
const POOL_LABEL: Record<string, string> = {
  'ort-guide': 'Программа передач',
  'ort-guide-replay': 'Эфир целиком',
  'idents-ort': 'Заставка',
  'idents-rus': 'Заставка',
  'ads-1': 'Реклама',
  'ads-2': 'Реклама',
  'ads-social': 'Социальная реклама',
  'vhs-ads': 'Реклама с кассеты'
};

/** Чем подписать слот в интерфейсе: передачу — названием, перебивку — типом. */
export const slotLabel = (slot: Slot): string =>
  slot.kind === 'interstitial' ? (POOL_LABEL[slot.pool] ?? 'Перерыв') : slot.title;

/* ---------- детерминированный рандом ---------- */

function xfnv1a(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Бесконечная колода: кончилась — перетасовываем заново. Повторы допустимы. */
function deck<T>(items: readonly T[], rnd: () => number) {
  let queue: T[] = shuffled(items, rnd);
  let i = 0;
  let last: T | undefined;
  return () => {
    if (!items.length) return undefined;
    if (i >= queue.length) {
      queue = shuffled(items, rnd);
      i = 0;
      // На стыке колод один и тот же ролик не должен идти два раза подряд.
      if (queue.length > 1 && queue[0] === last) [queue[0], queue[1]] = [queue[1], queue[0]];
    }
    last = queue[i++];
    return last;
  };
}

/* ---------- сетка ---------- */

const hhmmToSec = (s: string): number => {
  const [h, m] = s.split(':').map(Number);
  return (h || 0) * 3600 + (m || 0) * 60;
};

/** Номер дня от эпохи — основа seed'а. dateISO в формате YYYY-MM-DD. */
export const dayNumber = (dateISO: string): number =>
  Math.floor(Date.UTC(+dateISO.slice(0, 4), +dateISO.slice(5, 7) - 1, +dateISO.slice(8, 10)) / 86400000);

export function localDateISO(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const secondsOfDay = (d: Date = new Date()): number =>
  d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();

// Рекламная пауза между передачами. Считаем её в секундах, а не в роликах:
// среди перебивок есть и тридцатисекундные заставки, и пятиминутные блоки.
const BREAK_MIN_SEC = 60;
const BREAK_MAX_SEC = 240;
// Жёсткий потолок: даже если коротких роликов не нашлось, зритель не ждёт дольше.
const BREAK_HARD_CAP_SEC = 8 * 60;

/**
 * Собирает сутки эфира для одного канала.
 * Порядок псевдослучаен, но одинаков для всех при той же дате.
 */
export function buildDay(data: TvData, channelId: string, dateISO: string): Slot[] {
  const ch = data.channels[channelId];
  if (!ch) return [];

  const rnd = mulberry32(xfnv1a(`${channelId}|${dateISO}`));

  const programs = ch.pools.flatMap((p) => data.pools[p]?.items ?? []);
  const inters = data.interstitials.flatMap((p) => data.pools[p]?.items ?? []);
  if (!programs.length) return [];

  const nextProgram = deck(programs, rnd);
  const nextInter = deck(inters, rnd);

  // Перебивки разной длины — от тридцати секунд до семи минут. Чтобы пауза
  // не раздувалась, берём ту, что влезает в остаток. Неподошедшие кладём на полку
  // и используем позже — иначе длинные ролики никогда не попадут в эфир.
  const bench: PoolItem[] = [];
  const takeInter = (maxSec: number): PoolItem | undefined => {
    for (let i = 0; i < bench.length; i++) {
      if (bench[i].sec <= maxSec) return bench.splice(i, 1)[0];
    }
    for (let tries = 0; tries < 8; tries++) {
      const item = nextInter();
      if (!item) return undefined;
      if (item.sec <= maxSec) return item;
      if (bench.length < 32) bench.push(item);
    }
    return undefined;
  };

  // Якоря: события в фиксированное время (например «Эфир целиком» в 21:30)
  const anchors: Array<{ at: number; item: PoolItem; label?: string }> = [];
  for (const a of ch.anchors ?? []) {
    const pool = data.pools[a.pool]?.items ?? [];
    if (!pool.length) continue;
    anchors.push({
      at: hhmmToSec(a.at),
      item: pool[dayNumber(dateISO) % pool.length],
      label: a.label
    });
  }
  anchors.sort((x, y) => x.at - y.at);

  const slots: Slot[] = [];
  let t = 0;
  let anchorIdx = 0;
  let guard = 0;

  const push = (item: PoolItem, kind: Slot['kind'], label?: string) => {
    slots.push({
      start: t,
      end: t + item.sec,
      id: item.id,
      title: item.t,
      kind,
      pool: item.p,
      label
    });
    t += item.sec;
  };

  while (t < DAY_SEC && guard++ < 5000) {
    const anchor = anchors[anchorIdx];

    // Добиваем перебивками до времени якоря, потом ставим сам якорь.
    if (anchor && t >= anchor.at) {
      push(anchor.item, 'replay', anchor.label);
      anchorIdx++;
      continue;
    }

    const program = nextProgram();
    if (!program) break;

    const wouldCrossAnchor = anchor && t + program.sec > anchor.at;
    if (wouldCrossAnchor) {
      // В зазор перед якорем сначала ищем передачу покороче: полчаса
      // сплошной рекламы — это не эфир, а поломка.
      const gap = anchor.at - t;
      const fits = programs.filter((p) => p.sec <= gap);
      if (fits.length) {
        push(fits[Math.floor(rnd() * fits.length)], 'program');
        continue;
      }
      const filler = takeInter(gap);
      if (filler && t + filler.sec <= anchor.at) {
        push(filler, 'interstitial');
      } else {
        push(anchor.item, 'replay', anchor.label); // зазор меньше перебивки — начинаем чуть раньше
        anchorIdx++;
      }
      continue;
    }

    push(program, 'program');

    const budget = BREAK_MIN_SEC + rnd() * (BREAK_MAX_SEC - BREAK_MIN_SEC);
    let spent = 0;
    while (spent < budget && t < DAY_SEC) {
      const filler = takeInter(Math.min(budget - spent, BREAK_HARD_CAP_SEC - spent));
      if (!filler) break;
      push(filler, 'interstitial');
      spent += filler.sec;
    }
  }

  // Последний слот обрезаем по полночи — следующие сутки начнутся со своего seed'а.
  const last = slots[slots.length - 1];
  if (last && last.end > DAY_SEC) last.end = DAY_SEC;

  return slots;
}

/** Что идёт в заданную секунду суток и с какого момента ролика вступать. */
export function nowPlaying(
  slots: Slot[],
  secOfDay: number
): { slot: Slot; offsetSec: number; index: number } | null {
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (secOfDay >= s.start && secOfDay < s.end) {
      return { slot: s, offsetSec: secOfDay - s.start, index: i };
    }
  }
  return null;
}

/** Программа передач: только передачи, без рекламы и заставок. */
export const guide = (slots: Slot[]): Slot[] => slots.filter((s) => s.kind !== 'interstitial');

export const hhmm = (sec: number): string => {
  const s = ((sec % DAY_SEC) + DAY_SEC) % DAY_SEC;
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
};
