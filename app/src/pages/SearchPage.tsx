import { useMemo, useState } from 'react';
import { asset } from '../media/asset';
import { SectionHeader } from '../components/core';
import { MediaCard } from '../components/MediaCard';
import { MediaViewer } from '../components/MediaViewer';
import { catalog } from '../data/catalog';
import { stories } from '../data/extra';
import type { CatalogItem } from '../media/types';

const KINDS = [
  { id: 'all', label: 'Всё' },
  { id: 'movie', label: 'Фильмы' },
  { id: 'cartoon', label: 'Мультфильмы' },
  { id: 'game', label: 'Игры' },
  { id: 'music', label: 'Музыка' }
];

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [active, setActive] = useState<CatalogItem | null>(null);

  const q = query.trim().toLowerCase();

  const items = useMemo(
    () =>
      catalog.filter(
        (i) =>
          (kind === 'all' || i.kind === kind) &&
          (q === '' ||
            [i.title, i.original, i.artist, i.genre, i.platform, ...i.tags]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)))
      ),
    [q, kind]
  );

  const storyHits = useMemo(
    () =>
      q === ''
        ? []
        : stories.filter((s) => (s.title + s.excerpt).toLowerCase().includes(q)),
    [q]
  );

  return (
    <>
      <section className="section container">
        <SectionHeader
          index="Поиск"
          title="Найди воспоминание"
          note="Ищем по фильмам, мультфильмам, играм, музыке и историям."
        />

        <div className="stack" style={{ marginBottom: 32 }}>
          <input
            className="btn"
            style={{ textTransform: 'none', width: '100%', maxWidth: 520 }}
            placeholder="Например: Покемон, Sega, 1999"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Поисковый запрос"
          />
          <div className="row">
            {KINDS.map((k) => (
              <button
                key={k.id}
                className={`chip${kind === k.id ? ' chip--active' : ''}`}
                onClick={() => setKind(k.id)}
              >
                {k.label}
              </button>
            ))}
          </div>
          <span className="mono">Найдено: {items.length + storyHits.length}</span>
        </div>

        {items.length === 0 && storyHits.length === 0 ? (
          <div className="source">
            <span>Пусто. Попробуй короче: «Сега», «кассета», «1997».</span>
          </div>
        ) : (
          <div className="grid grid--3">
            {items.map((item) => (
              <MediaCard key={item.id} item={item} onOpen={setActive} />
            ))}
          </div>
        )}

        {storyHits.length > 0 ? (
          <div style={{ marginTop: 48 }}>
            <SectionHeader index="Истории" title="Тексты по запросу" />
            <div className="grid grid--3">
              {storyHits.map((s) => (
                <article className="card" key={s.id}>
                  <div className="card__media">
                    <img src={asset(s.image)} alt={s.alt} loading="lazy" />
                  </div>
                  <div className="card__body">
                    <h3 className="card__title">{s.title}</h3>
                    <p className="card__desc">{s.excerpt}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {active ? <MediaViewer item={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}
