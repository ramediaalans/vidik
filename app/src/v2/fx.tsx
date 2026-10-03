// Общая «плёночная» механика редизайна: появление при прокрутке, вспышка помех между
// маршрутами, счётчик и штамп даты как у видеокамеры. Всё уважает prefers-reduced-motion.
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Элементы с data-reveal получают класс is-in, когда въезжают в кадр. */
export function RevealObserver() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (reducedMotion() || !('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-reveal]').forEach((n) => n.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );
    const scan = () => document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((n) => io.observe(n));
    scan();
    // Ленивые разделы дорисовываются позже — подхватываем их тоже.
    const mo = new MutationObserver(scan);
    mo.observe(document.getElementById('main') ?? document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [pathname]);

  return null;
}

/** Короткая вспышка VHS-помех при смене маршрута — как переключение кассеты. */
export function RouteNoise() {
  const { pathname } = useLocation();
  const [seen, setSeen] = useState(pathname);
  const [tick, setTick] = useState(0);

  // Смена маршрута ловим прямо в рендере (без эффекта): первая загрузка помех не даёт.
  if (seen !== pathname) {
    setSeen(pathname);
    if (!reducedMotion()) setTick((t) => t + 1);
  }

  if (!tick) return null;
  return <div key={tick} className="route-noise" aria-hidden="true" />;
}

const MONTHS = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];

/** Штамп даты как у любительской видеокамеры: сегодняшний день, но в 1999-м. */
export function camDate(d = new Date()) {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} 1999`;
}

/** Счётчик ленты: идёт с момента открытия страницы. */
export function useTapeCounter() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = window.setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Часы для шапки, по местному времени посетителя. */
export function useClock() {
  const fmt = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  const [now, setNow] = useState(fmt);
  useEffect(() => {
    const id = window.setInterval(() => setNow(fmt()), 15_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Буквы заголовка по отдельности — для «выезда» строки из-под маски. */
export function SplitChars({ text, offset = 0 }: { text: string; offset?: number }) {
  return (
    <>
      {Array.from(text).map((ch, i) => (
        <span key={i} className="ch" style={{ ['--i' as string]: i + offset }} aria-hidden="true">
          {ch === ' ' ? '\u00a0' : ch}
        </span>
      ))}
    </>
  );
}
