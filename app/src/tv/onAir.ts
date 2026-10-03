// «Что сейчас идёт» для кнопок каналов — по той же газетной программе, что и TvNewspaper,
// чтобы подписи на кнопках и выделенная строка в газете всегда совпадали.
// Газетный день идёт с 06:00 до 06:00: ночь после полуночи — продолжение вчерашнего дня.
import { TV_PROGRAM, type ProgramItem } from './program';
import { broadcastDateISO, broadcastSecondsOfDay, rotationForDate } from './schedule';

const PAPER_DAY_START_MIN = 6 * 60;
const NIGHT_END_MIN = 3 * 60;
const paperMinutes = (min: number) => (min < PAPER_DAY_START_MIN ? min + 1440 : min);

export type OnAir = { now: ProgramItem | null; next: ProgramItem | null; pause: boolean };

export function programOnAir(channelId: string, at: Date = new Date()): OnAir {
  const min = Math.floor(broadcastSecondsOfDay(at) / 60);
  const pause = min >= NIGHT_END_MIN && min < PAPER_DAY_START_MIN;
  const base = broadcastDateISO(new Date(at.getTime() - PAPER_DAY_START_MIN * 60_000));
  const items = TV_PROGRAM[rotationForDate(base)][channelId] ?? [];
  if (pause) {
    // Техпауза: следующая передача — первая строка нового газетного дня.
    const nextBase = broadcastDateISO(at);
    const nextItems = TV_PROGRAM[rotationForDate(nextBase)][channelId] ?? [];
    return { now: null, next: nextItems[0] ?? null, pause };
  }
  const p = paperMinutes(min);
  let now: ProgramItem | null = null;
  let next: ProgramItem | null = null;
  for (const item of items) {
    if (paperMinutes(item[0]) <= p) now = item;
    else { next = item; break; }
  }
  return { now, next, pause };
}

export const clockOf = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
