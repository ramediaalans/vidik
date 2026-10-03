// Шкаф видеосалона: кассеты лежат горизонтально стопками, корешком к зрителю.
// Шкаф — отдельный слой (ассет с прозрачностью) поверх размытого фона салона.
// Наведение выдвигает кассету, клик «вынимает» её и открывает карточку фильма.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Film } from '../data/films';
import { asset } from '../media/asset';
import './salon-shelf.css';

// Геометрия ниш в пикселях исходника шкафа (1536×1024).
const W = 1536;
const H = 1024;
const ROWS = [
  { top: 64, floor: 256 },
  { top: 286, floor: 455 },
  { top: 490, floor: 640 },
  { top: 676, floor: 848 }
];
const STACKS = [105, 428, 797, 1125];
const SPINE_W = 308;
// Высоты корешка от крупной до минимально читаемой. Мельче не делаем — вместо этого ставим ещё шкаф.
const SPINE_HEIGHTS = [60, 52, 46, 40];
const capOf = (r: { top: number; floor: number }, h: number) => Math.floor((r.floor - r.top - 8) / h);
const fits = (h: number) => ROWS.reduce((sum, r) => sum + capOf(r, h) * STACKS.length, 0);
const CABINET_CAP = fits(SPINE_HEIGHTS[SPINE_HEIGHTS.length - 1]);

const LABELS = ['#e8e1cf', '#d9c9a3', '#f0ead8', '#cfd6cf', '#e6d2b5'];
const STRIPES = ['#2f6bff', '#b8323f', '#2a8a57', '#7a4bd0', '#d86a22', '#1b7f9e'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

interface Slot {
  film: Film;
  left: number;
  top: number;
  h: number;
}

function layout(films: Film[]): Slot[] {
  const h = SPINE_HEIGHTS.find((x) => fits(x) >= films.length) ?? SPINE_HEIGHTS[SPINE_HEIGHTS.length - 1];
  // Стопки растут равномерно по всему шкафу (слой за слоем), а фильмы идут по порядку:
  // слева направо, сверху вниз, в стопке — с верхней кассеты.
  const stacks = ROWS.flatMap((r) =>
    STACKS.map((x) => ({ r, x, cap: capOf(r, h), n: 0 }))
  );
  const maxCap = Math.max(...stacks.map((s) => s.cap));
  let left = films.length;
  for (let level = 0; left > 0 && level < maxCap; level += 1) {
    for (const s of stacks) {
      if (left > 0 && s.cap > level) {
        s.n += 1;
        left -= 1;
      }
    }
  }
  const slots: Slot[] = [];
  let i = 0;
  for (const s of stacks) {
    for (let k = s.n - 1; k >= 0; k -= 1, i += 1) {
      const film = films[i];
      const jitter = (hash(film.slug) % 17) - 8;
      slots.push({ film, left: s.x + jitter, top: s.r.floor - (k + 1) * h, h });
    }
  }
  return slots;
}

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function Spine({ slot }: { slot: Slot }) {
  const navigate = useNavigate();
  const [pulling, setPulling] = useState(false);
  const { film } = slot;
  const hv = hash(film.slug);
  const to = `/videosalon/${film.slug}`;
  const tilt = (((hv >> 5) % 100) / 100 - 0.5) * 0.9;

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0 || reduceMotion()) return;
    e.preventDefault();
    setPulling(true);
    window.setTimeout(() => navigate(to), 360);
  };

  const meta = [film.genres[0], film.duration ? `${film.duration} мин` : null, film.rating ? `★ ${film.rating}` : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link
      to={to}
      onClick={onClick}
      className={`spine${pulling ? ' is-pulling' : ''}${film.title.length > 12 ? ' spine--long' : ''}`}
      style={
        {
          left: pct(slot.left, W),
          top: pct(slot.top, H),
          width: pct(SPINE_W, W),
          height: pct(slot.h - 3, H),
          '--sh': `${((slot.h - 3) / W) * 100}cqw`,
          '--label': LABELS[(hv >> 3) % LABELS.length],
          '--stripe': STRIPES[hv % STRIPES.length],
          '--tilt': `${tilt.toFixed(2)}deg`,
          '--sleeve': `url(${asset('/images/v2/vhs-sleeve.webp')})`,
          '--sleeve-x': `${hv % 100}%`
        } as CSSProperties
      }
      aria-label={`${film.title} (${film.year}) — открыть кассету`}
    >
      <span className="spine__body">
        {film.poster ? (
          <img className="spine__poster" src={asset(film.poster)} alt="" loading="lazy" decoding="async" />
        ) : (
          <span className="spine__poster spine__poster--none" />
        )}
        <span className="spine__label">
          <span className="spine__title">{film.title}</span>
        </span>
        <span className="spine__year">
          <b>{film.year}</b>
          <i>VHS</i>
        </span>
      </span>
      <span className="spine__tip" aria-hidden="true">
        {meta || 'запись с ТВ'}
      </span>
    </Link>
  );
}

export function SalonShelf({ films }: { films: Film[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // Если фильмов больше, чем влезает в один шкаф при минимальном корешке, — ставим ещё шкафы
  // и делим кассеты между ними поровну, порядок сохраняется.
  const cabinets = useMemo(() => {
    const n = Math.max(1, Math.ceil(films.length / CABINET_CAP));
    const size = Math.ceil(films.length / n);
    return Array.from({ length: n }, (_, i) => layout(films.slice(i * size, (i + 1) * size)));
  }, [films]);

  // Параллакс: фон салона уезжает сильнее, шкаф — слабее. Только CSS-переменные.
  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion() || window.matchMedia('(max-width: 860px), (pointer: coarse)').matches) return;
    let raf = 0;
    let mx = 0;
    let my = 0;
    const apply = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const sy = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / vh));
      el.style.setProperty('--sy', sy.toFixed(3));
      el.style.setProperty('--mx', mx.toFixed(3));
      el.style.setProperty('--my', my.toFixed(3));
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const r = el.getBoundingClientRect();
      mx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      my = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      queue();
    };
    const onLeave = () => {
      mx = 0;
      my = 0;
      queue();
    };
    apply();
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div className="salon-cab" ref={ref}>
      <div
        className="salon-cab__room"
        aria-hidden="true"
        style={{ backgroundImage: `url(${asset('/images/v2/salon-room.webp')})` } as CSSProperties}
      />
      <div className="salon-cab__scroll">
        {cabinets.map((slots, ci) => (
          <div
            key={ci}
            className="salon-cab__stage"
            style={{ '--shelf': `url(${asset('/images/v2/salon-shelf.webp')})` } as CSSProperties}
          >
            <img
              className="salon-cab__wood"
              src={asset('/images/v2/salon-shelf.webp')}
              alt=""
              aria-hidden="true"
              decoding="async"
            />
            <span className="salon-cab__light" aria-hidden="true" />
            <ul
              className="salon-cab__tapes"
              aria-label={
                cabinets.length > 1
                  ? `Шкаф ${ci + 1}: кассет ${slots.length}`
                  : `Кассеты на полке: ${slots.length}`
              }
            >
              {slots.map((s) => (
                <li key={s.film.slug}>
                  <Spine slot={s} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="salon-cab__hint mono" aria-hidden="true">листай шкаф →</p>
    </div>
  );
}
