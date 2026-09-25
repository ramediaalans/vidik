// Видеосалон: полка кассет. Клик по кассете ведёт на карточку фильма.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { asset } from '../media/asset';
import { SectionHeader } from '../components/core';
import { VhsTape } from '../components/VhsTape';
import { salon } from '../data/films';

const SORTS = [
  { id: 'year-asc', label: 'Сначала ранние' },
  { id: 'year-desc', label: 'Сначала поздние' },
  { id: 'rating', label: 'По рейтингу' },
  { id: 'title', label: 'По алфавиту' }
] as const;

type SortId = (typeof SORTS)[number]['id'];

export function SalonPage() {
  const [genre, setGenre] = useState('Все');
  const [sort, setSort] = useState<SortId>('year-asc');
  const [query, setQuery] = useState('');

  const genres = useMemo(() => {
    const counted = new Map<string, number>();
    for (const f of salon) for (const g of f.genres) counted.set(g, (counted.get(g) ?? 0) + 1);
    return [
      'Все',
      ...[...counted.entries()]
        .filter(([, n]) => n >= 3)
        .sort((a, b) => b[1] - a[1])
        .map(([g]) => g)
    ];
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = salon.filter(
      (f) =>
        (genre === 'Все' || f.genres.includes(genre)) &&
        (q === '' ||
          f.title.toLowerCase().includes(q) ||
          (f.titleOrig ?? '').toLowerCase().includes(q))
    );
    return [...list].sort((a, b) =>
      sort === 'title'
        ? a.title.localeCompare(b.title)
        : sort === 'rating'
          ? (b.rating ?? 0) - (a.rating ?? 0)
          : sort === 'year-desc'
            ? b.year - a.year
            : a.year - b.year
    );
  }, [genre, sort, query]);

  return (
    <>
      <section className="hero vignette" style={{ minHeight: 'min(56vh, 520px)' }}>
        <div className="hero__media">
          <img src={asset('/images/movies/section-movies.webp')} alt="Полки видеопроката с кассетами" />
        </div>
        <div className="hero__inner container" style={{ paddingBottom: 48 }}>
          <div className="hero__kicker pixel">01 · Видеосалон</div>
          <h1 className="display display--l" style={{ margin: '12px 0' }}>
            Дверь без вывески, три рубля за сеанс
          </h1>
          <p className="lead">
            {salon.length} кассет на полке. Названия подписаны от руки — как тогда, шариковой по наклейке.
            Возьми любую и смотри целиком.
          </p>
        </div>
      </section>

      <section className="section container">
        <SectionHeader index="Полка" title="Выбери кассету" />

        <div className="stack" style={{ marginBottom: 32 }}>
          <div className="row">
            <label className="mono" htmlFor="salon-q">Поиск</label>
            <input
              id="salon-q"
              className="btn"
              style={{ minWidth: 240, textTransform: 'none' }}
              placeholder="Название фильма"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="row">
            <span className="mono">Жанр:</span>
            {genres.map((g) => (
              <button key={g} className={`chip${genre === g ? ' chip--active' : ''}`} onClick={() => setGenre(g)}>
                {g}
              </button>
            ))}
          </div>
          <div className="row">
            <span className="mono">Сортировка:</span>
            {SORTS.map((s) => (
              <button key={s.id} className={`chip${sort === s.id ? ' chip--active' : ''}`} onClick={() => setSort(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="source">
            <span>Такой кассеты нет. Всё разобрали до тебя.</span>
          </div>
        ) : (
          <div className="vhs-shelf">
            {visible.map((f) => (
              <VhsTape key={f.slug} film={f} to={`/videosalon/${f.slug}`} />
            ))}
          </div>
        )}
      </section>

      <section className="section container section--tight">
        <div className="source">
          <span>
            Хочешь не смотреть, а вспоминать? В архиве есть заметки и кадры о том же кино.
          </span>
          <Link className="btn btn--sm" to="/filmy">Архив кино</Link>
        </div>
      </section>
    </>
  );
}
