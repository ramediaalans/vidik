// Часы на дисплее видеомагнитофона: плеер сообщает сюда секунду просмотра,
// а дисплей (components/VcrClock.tsx) показывает её как ЧЧ:ММ — как счётчик на настоящей деке.
import { useSyncExternalStore } from 'react';

let minutes: number | null = null; // null — кассета не идёт, на дисплее «12:00»
let lastLive = 0; // когда в последний раз приходило время живого воспроизведения
const subs = new Set<() => void>();

/** seconds — сколько прошло от начала ролика; live=false — пауза (colon не мигает) */
export function setVcrTime(seconds: number | null, live = true) {
  if (live) lastLive = performance.now();
  const next = seconds === null || !Number.isFinite(seconds) ? null : Math.floor(Math.max(0, seconds) / 60);
  if (next === minutes) return;
  minutes = next;
  subs.forEach((fn) => fn());
}

/** идёт ли воспроизведение прямо сейчас (время обновлялось недавно) */
export function vcrIsLive() {
  return performance.now() - lastLive < 3500;
}

export function useVcrMinutes() {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn);
      return () => { subs.delete(fn); };
    },
    () => minutes
  );
}
