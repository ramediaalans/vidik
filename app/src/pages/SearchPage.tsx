// Поиск по настоящей коллекции сайта: видеосалон, Дисней-клуб, приставка, кассетник, истории.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { asset } from '../media/asset';
import { SectionHeader } from '../components/core';
import { usePlayer } from '../media/playerContext';
import { salon, disney } from '../data/films';
import type { Film } from '../data/films';
import { roms } from '../data/roms';
import { romCart } from '../data/rom-carts';
import { romArt } from '../data/rom-art';
import { tracks } from '../data/tracks';
import { stories } from '../data/stories';

type Kind = 'all' | 'film' | 'cartoon' | 'game' | 'music' | 'story';

const KINDS: { id: Kind; label: string }[] = [
  { id: 'all', label: 'Всё' },
  { id: 'film', label: 'Видеосалон' },
  { id: 'cartoon', label: 'Дисней-клуб' },
  { id: 'game', label: 'Приставка' },
  { id: 'music', label: 'Кассетник' },
  { id: 'story', label: 'Истории' }
];

const HINTS = ['Терминатор', 'Чип и Дейл', 'Контра', 'Sega', 'Кино', '1994'];

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/ё/g, 'е');
const img = (src: string | null | undefined) =>
  !src ? '' : /^https?:/.test(src) ? src : asset('/' + src.replace(/^\/+/, ''));
const time = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

function hit(q: string, fields: unknown[]): boolean {
  const hay = fields.map(norm).join(' · ');
  return q.split(/\s+/).every((w) => hay.includes(w));
}

const filmFields = (f: Film) => [f.title, f.titleOrig, f.year, ...f.genres, ...f.countries];

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const { play, current, playing } = usePlayer();

  const q = norm(query.trim());
  const limit = kind === 'all' ? 6 : 60;

  const res = useMemo(() => {
    if (!q) return null;
    return {
      film: salon.filter((f) => hit(q, filmFields(f))),
      cartoon: disney.filter((f) => hit(q, filmFields(f))),
      game: roms.filter((r) => hit(q, [r.title, r.nick, r.platform, r.genre, r.year])),
      music: tracks.map((t, index) => ({ ...t, index })).filter((t) => hit(q, [t.artist, t.title, t.album, t.year])),
      story: stories.filter((s) => hit(q, [s.title, s.when, s.excerpt, ...s.body]))
    };
  }, [q]);

  const count = (k: Exclude<Kind, 'all'>) => res?.[k].length ?? 0;
  const total = res ? count('film') + count('cartoon') + count('game') + count('music') + count('story') : 0;
  const show = (k: Exclude<Kind, 'all'>) => res && (kind === 'all' || kind === k) && count(k) > 0;

  const more = (k: Exclude<Kind, 'all'>) =>
    kind === 'all' && count(k) > limit ? (
      <button className="btn" style={{ marginTop: 16 }} onClick={() => setKind(k)}>
        Ещё {count(k) - limit}
      </button>
    ) : null;

  const filmGrid = (list: Film[], base: string) => (
    <div className="grid grid--3">
      {list.slice(0, limit).map((f) => (
        <Link className="card" key={f.slug} to={`${base}/${f.slug}`}>
          <div className="card__media">{f.poster ? <img src={img(f.poster)} alt={f.title} loading="lazy" /> : null}</div>
          <div className="card__body">
            <h3 className="card__title">{f.title}</h3>
            <p className="card__desc mono">
              {f.year}
              {f.genres.length ? ` · ${f.genres.slice(0, 2).join(', ')}` : ''}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <section className="section container">
      <SectionHeader index="Поиск" title="Найди воспоминание" note="Фильм, мультик, игра, песня или история — пиши, как помнишь." />

      <div className="stack" style={{ marginBottom: 32 }}>
        <input
          className="btn"
          style={{ textTransform: 'none', width: '100%', maxWidth: 520 }}
          placeholder="Например: Терминатор, Контра, Кино"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Поисковый запрос"
          autoFocus
        />
        {res ? (
          <>
            <div className="row">
              {KINDS.map((k) => (
                <button key={k.id} className={`chip${kind === k.id ? ' chip--active' : ''}`} onClick={() => setKind(k.id)}>
                  {k.label}
                  {k.id !== 'all' ? ` · ${count(k.id)}` : ''}
                </button>
              ))}
            </div>
            <span className="mono">Найдено: {total}</span>
          </>
        ) : (
          <div className="row">
            <span className="mono">Попробуй:</span>
            {HINTS.map((h) => (
              <button key={h} className="chip" onClick={() => setQuery(h)}>
                {h}
              </button>
            ))}
          </div>
        )}
      </div>

      {res && total === 0 ? (
        <div className="source">
          <span>Ничего не нашлось. Попробуй короче или по-другому: «Сега» вместо «Sega Mega Drive».</span>
        </div>
      ) : null}

      {show('film') ? (
        <div style={{ marginBottom: 48 }}>
          <SectionHeader index="Видеосалон" title={`Фильмы · ${count('film')}`} />
          {filmGrid(res!.film, '/videosalon')}
          {more('film')}
        </div>
      ) : null}

      {show('cartoon') ? (
        <div style={{ marginBottom: 48 }}>
          <SectionHeader index="Дисней-клуб" title={`Мультфильмы · ${count('cartoon')}`} />
          {filmGrid(res!.cartoon, '/disney-klub')}
          {more('cartoon')}
        </div>
      ) : null}

      {show('game') ? (
        <div style={{ marginBottom: 48 }}>
          <SectionHeader index="Приставка" title={`Игры · ${count('game')}`} />
          <div className="grid grid--3">
            {res!.game.slice(0, limit).map((r) => {
              const pic = romCart[r.id] ?? romArt[r.id];
              return (
                <Link className="card" key={r.id} to={`/igry/${r.id}`}>
                  <div className="card__media">{pic ? <img src={img(pic)} alt={r.title} loading="lazy" /> : null}</div>
                  <div className="card__body">
                    <h3 className="card__title">{r.nick || r.title}</h3>
                    <p className="card__desc mono">
                      {r.platform} · {r.year} · {r.genre}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
          {more('game')}
        </div>
      ) : null}

      {show('music') ? (
        <div style={{ marginBottom: 48 }}>
          <SectionHeader index="Кассетник" title={`Песни · ${count('music')}`} />
          <ol className="deck">
            {res!.music.slice(0, kind === 'all' ? 8 : 60).map((t) => {
              const on = playing && current?.artist === t.artist && current?.title === t.title;
              return (
                <li key={t.id}>
                  <button className={`mix__row${on ? ' is-on' : ''}`} onClick={() => play(t.index)}>
                    <span className="mix__n mono">{on ? '▶' : '♪'}</span>
                    <span>
                      {t.artist} — {t.title}
                    </span>
                    <span className="mix__dur mono">{time(t.duration || 0)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {kind === 'all' && count('music') > 8 ? (
            <button className="btn" style={{ marginTop: 16 }} onClick={() => setKind('music')}>
              Ещё {count('music') - 8}
            </button>
          ) : null}
        </div>
      ) : null}

      {show('story') ? (
        <div style={{ marginBottom: 48 }}>
          <SectionHeader index="Истории" title={`Дневник двора · ${count('story')}`} />
          <div className="grid grid--3">
            {res!.story.slice(0, limit).map((s) => (
              <Link className="card" key={s.id} to="/istorii">
                <div className="card__media">
                  <img src={asset(s.image)} alt={s.alt} loading="lazy" />
                </div>
                <div className="card__body">
                  <h3 className="card__title">{s.title}</h3>
                  <p className="card__desc">{s.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
