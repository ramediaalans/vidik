// Карточка-кассета для видеосалона. Никаких картинок: корпус, окошко с катушками
// и наклейка рисуются CSS. Надпись — настоящее название фильма от руки.
import { Link } from 'react-router-dom';
import type { Film } from '../data/films';

// Цвет полосы и наклон наклейки должны быть разными у разных кассет,
// но одинаковыми при каждой отрисовке — берём хеш от slug.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const STRIPES = ['#2f6bff', '#7a1f2b', '#1f7a4a', '#7a4bd0', '#c2571a', '#1b5f7a'];
const SHELLS = ['#141416', '#17171b', '#101012', '#1b1a1d'];

export function VhsTape({ film, to }: { film: Film; to: string }) {
  const h = hash(film.slug);
  const stripe = STRIPES[h % STRIPES.length];
  const shell = SHELLS[(h >> 3) % SHELLS.length];
  const tilt = (((h >> 6) % 240) / 100 - 1.2).toFixed(2);
  const wear = (h >> 11) % 3;

  return (
    <Link
      to={to}
      className={`vhs vhs--wear${wear}${film.title.length > 20 ? ' vhs--long' : ''}`}
      style={
        {
          '--vhs-stripe': stripe,
          '--vhs-shell': shell,
          '--vhs-tilt': `${tilt}deg`
        } as React.CSSProperties
      }
      aria-label={`${film.title} (${film.year}) — открыть кассету`}
    >
      <span className="vhs__shell">
        <span className="vhs__label">
          <span className="vhs__stripe">
            <b>VHS</b>
            <i>E-180</i>
          </span>
          <span className="vhs__hand">{film.title}</span>
          <span className="vhs__scribble">
            {film.year} · {film.duration ? `${film.duration} мин` : 'запись с ТВ'}
          </span>
        </span>
        <span className="vhs__window" aria-hidden="true">
          <span className="vhs__reel" />
          <span className="vhs__tape" />
          <span className="vhs__reel" />
        </span>
        <span className="vhs__notch" aria-hidden="true" />
      </span>
    </Link>
  );
}
