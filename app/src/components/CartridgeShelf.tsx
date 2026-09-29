import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SectionHeader } from './core';
import { asset } from '../media/asset';
import { roms, romPlatforms } from '../data/roms';
import { romArt, romArtNoText } from '../data/rom-art';
import { romCart } from '../data/rom-carts';

export function CartridgeShelf() {
  const [platform, setPlatform] = useState('Все');
  const [genre, setGenre] = useState('Все');
  const [query, setQuery] = useState('');

  const genres = useMemo(() => ['Все', ...new Set(roms.map((r) => r.genre))], []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const order = (p: string) => (p.includes('NES') ? 0 : p.includes('Sega') ? 1 : p.includes('Super') ? 2 : 3);
    return [...roms]
      .sort((a, b) => order(a.platform) - order(b.platform) || a.title.localeCompare(b.title, 'ru', { sensitivity: 'base' }))
      .filter(
      (r) =>
        (platform === 'Все' || r.platform === platform) &&
        (genre === 'Все' || r.genre === genre) &&
        (q === '' || r.title.toLowerCase().includes(q) || r.nick.toLowerCase().includes(q))
    );
  }, [platform, genre, query]);

  return (
    <section className="section container">
      <SectionHeader
        index="Играет в браузере"
        title="Полка с картриджами"
        note={`${roms.length} игр запускаются прямо здесь, без установки. Играть можно вдвоём на одной клавиатуре.`}
      />

      <div className="row" style={{ marginBottom: 16 }}>
        <span className="mono">Приставка:</span>
        {romPlatforms.map((p) => (
          <button
            key={p}
            className={`chip${platform === p ? ' chip--active' : ''}`}
            onClick={() => setPlatform(p)}
          >
            {p}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <span className="mono">Жанр:</span>
        {genres.map((g) => (
          <button key={g} className={`chip${genre === g ? ' chip--active' : ''}`} onClick={() => setGenre(g)}>
            {g}
          </button>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 28 }}>
        <label className="mono" htmlFor="rom-q">
          Поиск
        </label>
        <input
          id="rom-q"
          className="btn"
          style={{ minWidth: 240, textTransform: 'none', color: '#f1ead8', caretColor: '#f1ead8' }}
          placeholder="Название игры"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="mono">Найдено: {visible.length}</span>
      </div>

      <div className="cart-grid">
        {visible.map((rom) => (
          <Link
            key={rom.id}
            className={`cart${romCart[rom.id] ? ' cart--real' : ''}`}
            to={`/igry/${rom.id}`}
            aria-label={`Запустить ${rom.title}, ${rom.platform}, ${rom.year}`}
          >
            {romCart[rom.id] ? (
              <span className="cart__pic">
                <img src={asset(romCart[rom.id])} alt="" loading="lazy" decoding="async" />
              </span>
            ) : null}
            <span className="cart__label">
              <span className="cart__art">
                {romArt[rom.id] ? (
                  <img src={asset(romArt[rom.id])} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className="cart__artStub pixel">{rom.platform.split(' ')[0]}</span>
                )}
              </span>
              {/* если арт уже содержит надпись — свою не дублируем */}
              {!romCart[rom.id] && romArt[rom.id] && !romArtNoText.includes(rom.id) ? null : (
                <span className="cart__name display">{rom.title}</span>
              )}
              <span className="cart__meta pixel">
                {rom.year} · {rom.genre}
              </span>
            </span>
            <span className="cart__foot">
              <span className="mono">{rom.platform}</span>
              <span className="pixel">{rom.players === 2 ? '1–2 игрока' : '1 игрок'}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
