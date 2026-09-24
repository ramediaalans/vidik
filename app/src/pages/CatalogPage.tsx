import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { asset } from '../media/asset';
import { SectionHeader } from '../components/core';
import { MediaCard } from '../components/MediaCard';
import { MediaViewer } from '../components/MediaViewer';
import type { CatalogItem } from '../media/types';

type Props = {
  index: string;
  title: string;
  note: string;
  items: CatalogItem[];
  cover: string;
  coverAlt: string;
  findTitle?: string;
  extra?: ReactNode;
};

export function CatalogPage({ index, title, note, items, cover, coverAlt, findTitle, extra }: Props) {
  const [active, setActive] = useState<CatalogItem | null>(null);
  const [genre, setGenre] = useState('Все');
  const [sort, setSort] = useState<'year-asc' | 'year-desc' | 'title'>('year-asc');
  const [query, setQuery] = useState('');

  const genres = useMemo(() => ['Все', ...new Set(items.map((i) => i.genre))], [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter(
      (i) =>
        (genre === 'Все' || i.genre === genre) &&
        (q === '' ||
          i.title.toLowerCase().includes(q) ||
          (i.original ?? '').toLowerCase().includes(q) ||
          (i.artist ?? '').toLowerCase().includes(q))
    );
    return [...filtered].sort((a, b) =>
      sort === 'title' ? a.title.localeCompare(b.title) : sort === 'year-desc' ? b.year - a.year : a.year - b.year
    );
  }, [items, genre, sort, query]);

  return (
    <>
      <section className="hero vignette" style={{ minHeight: 'min(56vh, 520px)' }}>
        <div className="hero__media">
          <img src={asset(cover)} alt={coverAlt} />
        </div>
        <div className="hero__inner container" style={{ paddingBottom: 48 }}>
          <div className="hero__kicker pixel">{index}</div>
          <h1 className="display display--l" style={{ margin: '12px 0' }}>
            {title}
          </h1>
          <p className="lead">{note}</p>
        </div>
      </section>

      {extra}

      <section className="section container">
        <SectionHeader index="Фильтры" title={findTitle ?? 'Найди своё'} />
        <div className="stack" style={{ marginBottom: 32 }}>
          <div className="row">
            <label className="mono" htmlFor="q">
              Поиск
            </label>
            <input
              id="q"
              className="btn"
              style={{ minWidth: 240, textTransform: 'none' }}
              placeholder="Название или исполнитель"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="row">
            <span className="mono">Жанр:</span>
            {genres.map((g) => (
              <button
                key={g}
                className={`chip${genre === g ? ' chip--active' : ''}`}
                onClick={() => setGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
          <div className="row">
            <span className="mono">Сортировка:</span>
            <button
              className={`chip${sort === 'year-asc' ? ' chip--active' : ''}`}
              onClick={() => setSort('year-asc')}
            >
              Сначала ранние
            </button>
            <button
              className={`chip${sort === 'year-desc' ? ' chip--active' : ''}`}
              onClick={() => setSort('year-desc')}
            >
              Сначала поздние
            </button>
            <button
              className={`chip${sort === 'title' ? ' chip--active' : ''}`}
              onClick={() => setSort('title')}
            >
              По алфавиту
            </button>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="source">
            <span>Ничего не нашлось. Попробуй другой жанр или слово попроще.</span>
          </div>
        ) : (
          <div className="grid grid--3">
            {visible.map((item) => (
              <MediaCard key={item.id} item={item} onOpen={setActive} />
            ))}
          </div>
        )}
      </section>

      {active ? <MediaViewer item={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}
