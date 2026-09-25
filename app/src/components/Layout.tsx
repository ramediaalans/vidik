import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

const LINKS = [
  { to: '/videosalon', label: 'Видеосалон' },
  { to: '/disney-klub', label: 'Дисней-клуб' },
  { to: '/televizor', label: 'Телевизор' },
  { to: '/igry', label: 'Игры' },
  { to: '/muzyka', label: 'Музыка' },
  { to: '/istorii', label: 'Истории' },
  { to: '/nostalgiya', label: 'Ностальгия' },
  { to: '/retrointernet', label: 'Ретроинтернет' }
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="logo" aria-label="ВИДИК — на главную">
          <span className="logo__dot" aria-hidden="true" />
          ВИДИК
        </Link>

        <nav className="nav" aria-label="Основное меню">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'is-active' : '')}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="header__actions">
          <Link className="btn btn--sm" to="/poisk">
            Поиск
          </Link>
          <button
            className="btn btn--sm burger"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Закрыть' : 'Меню'}
          </button>
        </div>
      </div>

      {open ? (
        <div id="mobile-menu" className="container" style={{ paddingBottom: 16 }}>
          <div className="stack" style={{ gap: 6 }}>
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="channel"
                style={{ display: 'block' }}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <div className="logo" style={{ marginBottom: 12 }}>
              <span className="logo__dot" aria-hidden="true" />
              ВИДИК
            </div>
            <p className="lead" style={{ fontSize: 15 }}>
              Интерактивный архив постсоветского детства. Фильмы, мультики и телеэфир идут
              со сторонних плееров — у нас не хранится ни одного чужого видеофайла.
            </p>
          </div>
          <div>
            <div className="mono" style={{ marginBottom: 8 }}>Разделы</div>
            {LINKS.slice(0, 4).map((l) => (
              <Link key={l.to} to={l.to}>
                {l.label}
              </Link>
            ))}
          </div>
          <div>
            <div className="mono" style={{ marginBottom: 8 }}>Ещё</div>
            {LINKS.slice(4).map((l) => (
              <Link key={l.to} to={l.to}>
                {l.label}
              </Link>
            ))}
          </div>
          <div>
            <div className="mono" style={{ marginBottom: 8 }}>Про проект</div>
            <Link to="/po-godam">По годам</Link>
            <Link to="/poisk">Поиск</Link>
            <Link to="/filmy">Архив кино</Link>
            <Link to="/multfilmy">Архив мультфильмов</Link>
            <a href="https://archive.org" target="_blank" rel="noreferrer noopener">
              Интернет-архив
            </a>
          </div>
        </div>
        <div className="divider" style={{ margin: '32px 0 16px' }} />
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <span className="mono">Оформление сделано для этого проекта</span>
          <span className="mono">1990–2005 · сделано с помехами</span>
        </div>
      </div>
    </footer>
  );
}
