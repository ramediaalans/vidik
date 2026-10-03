// «Календарь на стене»: отрывной календарь, где каждый листок — год.
// На листке — только то, что реально лежит в коллекции сайта за этот год:
// кассеты из видеосалона, мультики, картриджи, треки. Плюс одна запись на полях —
// только там, где факт проверяемый; где нечего сказать, поле пустое.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { asset } from '../media/asset';
import { usePlayer } from '../media/playerContext';
import { salon, disney } from '../data/films';
import { roms } from '../data/roms';
import { romArt } from '../data/rom-art';
import { romCart } from '../data/rom-carts';
import { tracks } from '../data/tracks';
import './calendar.css';

const FIRST = 1984;
const LAST = 2005;
const YEARS = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);

// Записи на полях. Только то, что легко проверить.
const MARGIN: Record<number, string> = {
  1984: 'В магазинах появилась «Электроника» с волком и яйцами. Одна на весь класс.',
  1985: 'Началась антиалкогольная кампания. Свадьбы стали «безалкогольными» — на словах.',
  1986: 'Мимо Земли пролетела комета Галлея. Следующий раз — в 2061-м.',
  1987: 'Матиас Руст посадил свою «Сессну» у Красной площади.',
  1988: '«Белые розы» «Ласкового мая» — из каждого окна и с каждой дискотеки.',
  1989: 'Кашпировский и Чумак по телевизору. Банки с водой на экране «заряжаются».',
  1990: 'На Пушкинской открылся первый «Макдоналдс». Очередь — через всю площадь.',
  1991: 'В августе по всем каналам весь день шло «Лебединое озеро».',
  1992: 'Цены отпустили в январе. К концу года в продаже появилась «Денди».',
  1994: 'Лёня Голубков и МММ в каждой рекламной паузе. По воскресеньям — «Денди — новая реальность».',
  1995: 'Первый канал стал ОРТ. В кино — «Особенности национальной охоты».',
  1997: 'Тамагочи. Умирали на уроках, пока хозяин не видел.',
  1998: 'Август, дефолт. Доллар за пару недель подорожал в разы.',
  1999: 'Новый год встречали под обращение Ельцина: «Я ухожу».',
  2000: 'Боялись «проблемы 2000» — компьютеры не сломались.'
};

const PLATFORM: Record<string, string> = {
  'Dendy / NES': 'Денди',
  'Sega Mega Drive': 'Сега',
  'Super Nintendo': 'SNES'
};

type Tape = { key: string; title: string; sub: string; image?: string; to: string };
type Cart = { key: string; title: string; sub: string; image?: string; to: string; isCart: boolean };
type Song = { key: string; title: string; artist: string; index: number };

const cleanTitle = (t: string) => t.replace(/\s*[—–-]\s*(все серии|коллекция серий|\d.*сезон.*)$/i, '');

function sheetFor(year: number) {
  const tapes: Tape[] = [
    ...salon
      .filter((f) => f.year === year)
      .map((f) => ({
        key: 'm:' + f.slug,
        title: f.title,
        sub: f.kind === 'serial' ? 'сериал' : f.genres.slice(0, 2).join(', '),
        image: f.poster ?? undefined,
        to: `/videosalon/${f.slug}`
      })),
    ...disney
      .filter((f) => f.year === year)
      .map((f) => ({
        key: 'c:' + f.slug,
        title: cleanTitle(f.title),
        sub: f.kind === 'serial' ? 'мультсериал' : 'мультфильм',
        image: f.poster ?? undefined,
        to: `/disney-klub/${f.slug}`
      }))
  ];
  const carts: Cart[] = roms
    .filter((r) => r.year === year && (romArt[r.id] || romCart[r.id]))
    .map((r) => ({
      key: 'g:' + r.id,
      title: r.title,
      sub: `${PLATFORM[r.platform] ?? r.platform} · ${r.genre}`,
      image: romCart[r.id] ?? romArt[r.id],
      isCart: Boolean(romCart[r.id]),
      to: `/igry/${r.id}`
    }));
  const songs: Song[] = tracks
    .map((t, index) => ({ t: t as typeof t & { year?: number }, index }))
    .filter(({ t }) => t.year === year)
    .map(({ t, index }) => ({ key: 't:' + t.id, title: t.title, artist: t.artist, index }));
  return { tapes, carts, songs, total: tapes.length + carts.length + songs.length };
}

const MAX_CARTS = 8;
const totals: Record<number, number> = Object.fromEntries(YEARS.map((y) => [y, sheetFor(y).total]));

export function WallCalendar() {
  const { play } = usePlayer();
  const [params, setParams] = useSearchParams();
  const fromUrl = Number(params.get('god'));
  const [year, setYear] = useState(YEARS.includes(fromUrl) ? fromUrl : 1993);
  const [torn, setTorn] = useState<{ year: number; dir: 1 | -1 } | null>(null);
  const [allCarts, setAllCarts] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const sheet = useMemo(() => sheetFor(year), [year]);
  const tornSheet = torn ? torn.year : null;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const go = (next: number) => {
    if (next === year || next < FIRST || next > LAST) return;
    setTorn({ year, dir: next > year ? 1 : -1 });
    setYear(next);
    setAllCarts(false);
    const p = new URLSearchParams(params);
    p.set('god', String(next));
    setParams(p, { replace: true });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTorn(null), 650);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(year + 1);
    if (e.key === 'ArrowLeft') go(year - 1);
  };

  const carts = allCarts ? sheet.carts : sheet.carts.slice(0, MAX_CARTS);

  return (
    <div className="wcal" onKeyDown={onKey}>
      {/* Лента годов: едет сама, как полки на главной. Навёл — остановилась, нажал — оторвал листок. */}
      <nav className="wcal__years" aria-label="Годы">
        <div className="wcal__ytrack">
          {[0, 1].map((copy) => (
            <div className="wcal__yset" key={copy} aria-hidden={copy ? 'true' : undefined}>
              {YEARS.map((y) => {
                const n = totals[y];
                return (
                  <button
                    key={y}
                    tabIndex={copy ? -1 : undefined}
                    className={`wcal__y${y === year ? ' is-on' : ''}${n === 0 ? ' is-empty' : ''}`}
                    aria-current={!copy && y === year ? 'true' : undefined}
                    onClick={() => go(y)}
                  >
                    {y}
                    <span className="wcal__dots" aria-hidden="true" style={{ ['--n' as string]: Math.min(n, 12) }} />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      <div className="wcal__wall">
        <div className="wcal__nail" aria-hidden="true" />
        <div className="wcal__pad">
          <div className="wcal__rings" aria-hidden="true" />
          <div className="wcal__under" aria-hidden="true" />
          {tornSheet !== null ? (
            <div className={`wcal__sheet wcal__sheet--torn${torn!.dir < 0 ? ' is-back' : ''}`} aria-hidden="true">
              <div className="wcal__big">{tornSheet}</div>
            </div>
          ) : null}

          <article className="wcal__sheet" key={year} aria-live="polite">
            <header className="wcal__top">
              <button className="wcal__arrow" onClick={() => go(year - 1)} disabled={year <= FIRST} aria-label="Предыдущий год">
                ‹
              </button>
              <div className="wcal__big">{year}</div>
              <button className="wcal__arrow" onClick={() => go(year + 1)} disabled={year >= LAST} aria-label="Следующий год">
                ›
              </button>
            </header>

            {MARGIN[year] ? <p className="wcal__margin">{MARGIN[year]}</p> : null}

            {sheet.tapes.length ? (
              <section className="wcal__block">
                <h3 className="wcal__h mono">На кассетах</h3>
                <div className="wcal__tapes">
                  {sheet.tapes.map((t) => (
                    <Link key={t.key} to={t.to} className="wcal__tape">
                      {t.image ? <img src={asset(t.image)} alt={`Обложка: ${t.title}`} loading="lazy" decoding="async" /> : <span className="wcal__noimg" />}
                      <span className="wcal__t">{t.title}</span>
                      <span className="wcal__s mono">{t.sub}</span>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {sheet.carts.length ? (
              <section className="wcal__block">
                <h3 className="wcal__h mono">
                  В приставке <span>{sheet.carts.length}</span>
                </h3>
                <div className="wcal__carts">
                  {carts.map((c) => (
                    <Link key={c.key} to={c.to} className="wcal__cart" title={c.title}>
                      <span className={`wcal__cimg${c.isCart ? ' is-cart' : ''}`}>
                        {c.image ? <img src={asset(c.image)} alt={`Картридж: ${c.title}`} loading="lazy" decoding="async" /> : null}
                      </span>
                      <span className="wcal__t">{c.title}</span>
                      <span className="wcal__s mono">{c.sub}</span>
                    </Link>
                  ))}
                </div>
                {sheet.carts.length > MAX_CARTS ? (
                  <button className="wcal__more" onClick={() => setAllCarts((v) => !v)}>
                    {allCarts ? 'Свернуть' : `Ещё ${sheet.carts.length - MAX_CARTS}`}
                  </button>
                ) : null}
              </section>
            ) : null}

            {sheet.songs.length ? (
              <section className="wcal__block">
                <h3 className="wcal__h mono">В магнитофоне</h3>
                <ul className="wcal__songs">
                  {sheet.songs.map((s) => (
                    <li key={s.key}>
                      <button className="wcal__song" onClick={() => play(s.index)}>
                        <span aria-hidden="true">▶</span> {s.artist} — {s.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {sheet.total === 0 ? (
              <p className="wcal__empty">За этот год в коллекции пока пусто. Листок оставили — год-то был.</p>
            ) : null}

            <footer className="wcal__foot mono">
              <span>{sheet.total ? `в коллекции: ${sheet.total}` : 'в коллекции: —'}</span>
              <span>← → листать</span>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
}
