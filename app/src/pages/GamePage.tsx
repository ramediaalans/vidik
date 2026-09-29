// Карточка игры: телевизор с приставкой прямо на странице, как у фильма в видеосалоне.
import { Suspense, lazy } from 'react';
import { Link, useParams } from 'react-router-dom';
import { asset } from '../media/asset';
import { roms } from '../data/roms';
import { romArt } from '../data/rom-art';
import { romCart } from '../data/rom-carts';

const Emulator = lazy(() => import('../components/Emulator').then((m) => ({ default: m.Emulator })));

export function GamePage() {
  const { id } = useParams();
  const rom = roms.find((r) => r.id === id);

  if (!rom) {
    return (
      <section className="section container">
        <div className="mono">Картриджа нет</div>
        <h1 className="display display--l" style={{ margin: '12px 0' }}>Такой игры нет</h1>
        <p className="lead">Может, её забрали соседи и не вернули.</p>
        <div className="row" style={{ marginTop: 24 }}>
          <Link className="btn btn--primary" to="/igry">Назад на полку</Link>
        </div>
      </section>
    );
  }

  const cover = romCart[rom.id] ?? romArt[rom.id];
  const neighbours = roms.filter((r) => r.platform === rom.platform && r.id !== rom.id).slice(0, 8);

  return (
    <>
      <section className="film-hero">
        <div className="container film-hero__inner">
          <Link className="btn btn--sm" to="/igry" style={{ alignSelf: 'flex-start' }}>
            ← Назад на полку
          </Link>

          <div className="film-hero__grid game-hero__grid">
            {cover ? (
              <img
                className={romCart[rom.id] ? 'game-cart' : 'film-poster'}
                src={asset(cover)}
                alt={`Картридж: ${rom.title}`}
              />
            ) : null}

            <div>
              <div className="mono">
                {rom.platform} · {rom.year}
              </div>
              <h1 className="display display--l" style={{ margin: '10px 0' }}>
                {rom.title}
              </h1>
              <div className="muted" style={{ marginBottom: 14 }}>Во дворе звали «{rom.nick}»</div>

              <div className="row film-meta">
                <span className="chip chip--active">{rom.genre}</span>
                <span className="chip">{rom.platform}</span>
                <span className="chip">{rom.players === 2 ? '1–2 игрока' : '1 игрок'}</span>
              </div>

              <p className="lead" style={{ marginTop: 18, color: 'var(--amber)' }}>«{rom.memory}»</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <Suspense fallback={<div className="pixel">Греется приставка…</div>}>
          <Emulator key={rom.id} rom={rom} />
        </Suspense>
      </section>

      {neighbours.length ? (
        <section className="section container section--tight">
          <div className="mono" style={{ marginBottom: 12 }}>Рядом на полке</div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {neighbours.map((r) => (
              <Link key={r.id} className="chip" to={`/igry/${r.id}`}>
                {r.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
