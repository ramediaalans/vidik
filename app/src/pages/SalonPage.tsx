// Видеосалон: шкаф с кассетами стопками. Клик по корешку ведёт на карточку фильма.
import { useMemo, useState } from 'react';
import { SectionHeader } from '../components/core';
import { PageHero } from '../v2/PageHero';
import { SalonShelf } from '../v2/SalonShelf';
import { salon } from '../data/films';

const SORTS = [
  { id: 'title', label: 'По алфавиту' },
  { id: 'year-asc', label: 'Сначала ранние' },
  { id: 'year-desc', label: 'Сначала поздние' },
  { id: 'rating', label: 'По рейтингу' }
] as const;

type SortId = (typeof SORTS)[number]['id'];

export function SalonPage() {
  const [genre, setGenre] = useState('Все');
  const [sort, setSort] = useState<SortId>('title');
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
        ? a.title.localeCompare(b.title, 'ru')
        : sort === 'rating'
          ? (b.rating ?? 0) - (a.rating ?? 0)
          : sort === 'year-desc'
            ? b.year - a.year
            : a.year - b.year
    );
  }, [genre, sort, query]);

  return (
    <>
      <PageHero
        index="22:00"
        time="22:00"
        kicker="Ночной сеанс · Видеосалон"
        title={<>Дверь без вывески, <em>три рубля за сеанс</em></>}
        lead="Названия подписаны от руки — как тогда, шариковой по наклейке. Возьми любую кассету и смотри целиком."
        image="/images/v2/ch-salon.webp"
        alt="Уютный видеосалон: кресла, телевизор с видеомагнитофоном, полки кассет и тёплая лампа"
        facts={[
          { v: salon.length, l: 'кассет на полке' },
          { v: genres.length - 1, l: 'жанров' }
        ]}
      />

      <section className="section container" style={{ paddingBottom: 0 }}>
        <SectionHeader index="Шкаф" title="Выбери кассету" />

        <div className="stack">
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

      </section>

      {/* Шкаф — на всю ширину страницы, как герой: фон салона без рамки */}
      {visible.length === 0 ? (
        <section className="section container">
          <div className="source">
            <span>Такой кассеты нет. Всё разобрали до тебя.</span>
          </div>
        </section>
      ) : (
        <SalonShelf films={visible} />
      )}
    </>
  );
}
