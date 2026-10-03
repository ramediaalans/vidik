import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { asset } from '../media/asset';
import { MORE, ROOMS, type Room } from '../v2/rooms';
import { useClock } from '../v2/fx';
import { useFootParallax } from '../v2/footParallax';

// Компьютерный клуб — отдельные статические страницы (свои заголовки COOP/COEP),
// поэтому обычная ссылка с перезагрузкой, а не роут SPA. Только для ПК.
function RoomLink({ room, className, onClick, children, onEnter }: {
  room: Room;
  className?: string;
  onClick?: () => void;
  onEnter?: () => void;
  children: ReactNode;
}) {
  if (room.href) {
    return (
      <a className={className} href={room.href} onMouseEnter={onEnter} onFocus={onEnter}>
        {children}
      </a>
    );
  }
  return (
    <NavLink
      to={room.to!}
      className={({ isActive }) => `${className ?? ''}${isActive ? ' is-active' : ''}`}
      onClick={onClick}
      onMouseEnter={onEnter}
      onFocus={onEnter}
    >
      {children}
    </NavLink>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  const [preview, setPreview] = useState(ROOMS[0].image);
  const clock = useClock();
  const { pathname } = useLocation();
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Меню закрывается при любой смене маршрута (вычисляем в рендере, без эффекта).
  const [route, setRoute] = useState(pathname);
  if (route !== pathname) {
    setRoute(pathname);
    setOpen(false);
  }

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = window.scrollY;
        setSolid(y > 40);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    const btn = btnRef.current;
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
      btn?.focus();
    };
  }, [open]);

  return (
    <>
      <header className={`vhead${solid ? ' is-solid' : ''}${open ? ' is-open' : ''}`}>
        <div className="vhead__inner">
          <Link to="/" className="vlogo" aria-label="ВИДИК — на главную">
            <span className="vlogo__rec" aria-hidden="true" />
            <span className="vlogo__word">ВИДИК</span>
          </Link>

          <nav className="vnav" aria-label="Основное меню">
            {ROOMS.map((r) => (
              <RoomLink key={r.id} room={r} className="vnav__link">
                <span className="vnav__time">{r.time}</span>
                {r.label}
              </RoomLink>
            ))}
          </nav>

          <div className="vhead__actions">
            <span className="vhead__clock mono" aria-label={`Сейчас ${clock}`}>
              <i aria-hidden="true" /> {clock}
            </span>
            <Link className="vhead__search" to="/poisk" aria-label="Поиск по архиву">
              <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="5.5" />
                <path d="m13 13 4.5 4.5" />
              </svg>
            </Link>
            <button
              ref={btnRef}
              className="vburger"
              aria-expanded={open}
              aria-controls="vmenu"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="vburger__label">{open ? 'Закрыть' : 'Меню'}</span>
              <span className="vburger__lines" aria-hidden="true">
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div
        id="vmenu"
        ref={menuRef}
        className={`vmenu${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Меню сайта"
        aria-hidden={!open}
        inert={!open}
      >
        <div className="vmenu__media" aria-hidden="true">
          {[...ROOMS.map((r) => r.image), ...MORE.map((m) => m.image)].map((src) => (
            <img key={src} src={asset(src)} alt="" className={src === preview ? 'is-on' : ''} loading="lazy" />
          ))}
        </div>
        <div className="vmenu__inner">
          <div className="vmenu__col">
            <div className="vmenu__eyebrow mono">Программа дня</div>
            <ol className="vmenu__rooms">
              {ROOMS.map((r, i) => (
                <li key={r.id} style={{ ['--d' as string]: i }}>
                  <RoomLink room={r} className="vmenu__room" onClick={() => setOpen(false)} onEnter={() => setPreview(r.image)}>
                    <span className="vmenu__time">{r.time}</span>
                    <span className="vmenu__label">{r.label}</span>
                    <span className="vmenu__when">{r.when}</span>
                  </RoomLink>
                </li>
              ))}
            </ol>
          </div>
          <div className="vmenu__col vmenu__col--more">
            <div className="vmenu__eyebrow mono">Ещё в квартире</div>
            <ul className="vmenu__more">
              {MORE.map((m, i) => (
                <li key={m.to} style={{ ['--d' as string]: i + ROOMS.length }}>
                  <NavLink to={m.to} onClick={() => setOpen(false)} onMouseEnter={() => setPreview(m.image)} onFocus={() => setPreview(m.image)}>
                    {m.label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <p className="vmenu__hint mono">Esc — закрыть · ↑↑↓↓←→←→BA — секрет</p>
          </div>
        </div>
      </div>
    </>
  );
}

export function Footer() {
  const wordRef = useFootParallax();
  return (
    <footer className="vfoot">
      <div className="vfoot__media" aria-hidden="true">
        <img src={asset('/images/v2/vhs-eject.webp')} alt="" loading="lazy" decoding="async" />
      </div>
      <div className="container vfoot__inner">
        <div className="vfoot__top" data-reveal>
          <div className="mono vfoot__osd">■ STOP · ◀◀ REW · ⏏ EJECT</div>
          <h2 className="vfoot__title">
            Перемотай <em>и включи ещё раз</em>
          </h2>
        </div>

        <div className="vfoot__grid">
          <div>
            <div className="mono vfoot__h">Программа дня</div>
            {ROOMS.map((r) =>
              r.href ? (
                <a key={r.id} href={r.href}>
                  <span>{r.time}</span> {r.label}
                </a>
              ) : (
                <Link key={r.id} to={r.to!}>
                  <span>{r.time}</span> {r.label}
                </Link>
              )
            )}
          </div>
          <div>
            <div className="mono vfoot__h">Ещё в квартире</div>
            {MORE.map((m) => (
              <Link key={m.to} to={m.to}>
                {m.label}
              </Link>
            ))}
          </div>
          <div>
            <div className="mono vfoot__h">Архив</div>
            <Link to="/muzyka">Вся полка кассет</Link>
            <Link to="/igry">Полка с картриджами</Link>
            <a href="https://archive.org" target="_blank" rel="noreferrer noopener">
              Интернет-архив ↗
            </a>
          </div>
          <p className="vfoot__note">
            Здесь то, что мы смотрели, во что играли и что слушали с 1990 по 2005-й.
          </p>
        </div>

        <div className="vfoot__word" aria-hidden="true" ref={wordRef}>
          ВИДИК
        </div>
        <div className="vfoot__base mono">
          <span>1990–2005 · сделано с помехами</span>
          <span>Ковёр на стене — в комплекте</span>
        </div>
      </div>
    </footer>
  );
}
