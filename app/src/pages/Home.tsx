// Главная: один день 1999 года. Герой-кадр, манифест, пять «комнат» по времени суток
// (стопкой, как кадры на плёнке), живая полка кассет и картриджей, остальные комнаты.
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { asset } from '../media/asset';
import { disney, salon } from '../data/films';
import { roms } from '../data/roms';
import { romCart } from '../data/rom-carts';
import { MORE, ROOMS, type Room } from '../v2/rooms';
import { Arrow } from '../v2/PageHero';
import { SplitChars, camDate, reducedMotion, useTapeCounter } from '../v2/fx';
const HomeOnAir = lazy(() => import('../v2/HomeOnAir'));


function RoomCta({ room, children }: { room: Room; children: ReactNode }) {
  return room.href ? (
    <a className="btn btn--primary btn--xl" href={room.href}>
      {children}
      <Arrow />
    </a>
  ) : (
    <Link className="btn btn--primary btn--xl" to={room.to!}>
      {children}
      <Arrow />
    </Link>
  );
}

export function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const counter = useTapeCounter();
  const [pcCount, setPcCount] = useState<number | null>(null);

  const episodes = useMemo(
    () => disney.reduce((n, f) => n + (f.seasons ?? []).reduce((m, s) => m + s.episodes, 0), 0),
    []
  );
  const platforms = useMemo(() => new Set(roms.map((r) => r.platform)).size, []);
  const years = useMemo(() => {
    const ys = salon.map((f) => f.year);
    return `${Math.min(...ys)}–${Math.max(...ys)}`;
  }, []);

  const posters = useMemo(() => salon.filter((f) => f.poster).slice(0, 18), []);
  const toons = useMemo(() => disney.filter((f) => f.poster).slice(0, 18), []);
  const carts = useMemo(
    () =>
      roms
        .filter((r) => romCart[r.id])
        .sort((a, b) => a.title.localeCompare(b.title))
        .filter((_, i) => i % 3 === 0)
        .slice(0, 22),
    []
  );

  // Число игр компьютерного клуба берём из его собственного каталога.
  useEffect(() => {
    let alive = true;
    fetch(asset('/pc/games.json'))
      .then((r) => (r.ok ? r.json() : null))
      .then((list) => {
        if (alive && Array.isArray(list)) setPcCount(list.length);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // Один rAF-цикл на всю прокрутку: параллакс героя, «подсветка» манифеста,
  // уход предыдущей главы вглубь, когда на неё наезжает следующая.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion()) {
      root?.style.setProperty('--mprog', '1');
      return;
    }
    const hero = root.querySelector<HTMLElement>('.vhero');
    const chapters = Array.from(root.querySelectorAll<HTMLElement>('.chapter'));
    let raf = 0;

    const frame = () => {
      raf = 0;
      const vh = window.innerHeight;
      if (hero) {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--hs', String(Math.min(1, Math.max(0, -r.top / r.height))));
      }
      chapters.forEach((ch, i) => {
        const r = ch.getBoundingClientRect();
        const next = chapters[i + 1];
        const own = Math.min(1, Math.max(-1, r.top / vh));
        ch.style.setProperty('--own', own.toFixed(4));
        if (next) {
          const nt = next.getBoundingClientRect().top;
          const p = Math.min(1, Math.max(0, 1 - nt / vh));
          ch.style.setProperty('--p', p.toFixed(4));
        }
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    frame();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Превью-картинка «ещё в квартире» едет за курсором.
  const [moreImg, setMoreImg] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const onMoreMove = (e: MouseEvent) => {
    const el = previewRef.current;
    if (!el) return;
    el.style.setProperty('--x', `${e.clientX}px`);
    el.style.setProperty('--y', `${e.clientY}px`);
  };

  const facts: Record<string, { v: ReactNode; l: string }[]> = {
    disney: [
      { v: disney.length, l: 'мультсериалов' },
      { v: episodes, l: 'серий целиком' }
    ],
    games: [
      { v: roms.length, l: 'картриджей' },
      { v: platforms, l: 'приставки' }
    ],
    pc: [
      { v: pcCount ?? '—', l: 'игр на рабочем столе' },
      { v: '98', l: 'Windows, как тогда' }
    ],
    salon: [
      { v: salon.length, l: 'кассет на полке' },
      { v: years, l: 'годы выпуска' }
    ]
  };
  const copy: Record<string, { title: ReactNode; lead: string; cta: string; note?: string }> = {
    disney: {
      title: (
        <>
          Половина <em>девятого</em>
        </>
      ),
      lead: 'Тот самый воскресный блок, ради которого вставали раньше, чем в школу. Выбирай мультсериал — серии идут подряд, закладка помнит, где остановился.',
      cta: 'Включить Дисней-клуб'
    },
    games: {
      title: (
        <>
          Дунуть <em>в картридж</em>
        </>
      ),
      lead: 'Денди, Сега и Super Nintendo. Сохраниться можно где угодно — не то что тогда, когда свет вырубали на последнем уровне. Есть геймпад, а на телефоне — экранный джойстик.',
      cta: 'К полке с картриджами'
    },
    pc: {
      title: (
        <>
          Час <em>до закрытия</em>
        </>
      ),
      lead: 'Doom, Half-Life, CS 1.6, Quake III и Diablo. Админ уже косится на часы, а у тебя ещё раунд на de_dust. Полный экран — клавиша F.',
      cta: 'Сесть за свободный',
      note: 'Только для компьютера с клавиатурой и мышью'
    },
    tv: {
      title: (
        <>
          Три кнопки, <em>и все идут сами</em>
        </>
      ),
      lead: 'Включаешь — и попадаешь на середину передачи, как тогда. Перемотать нельзя, переключить можно.',
      cta: 'Включить телевизор'
    },
    salon: {
      title: (
        <>
          Дверь <em>без вывески</em>
        </>
      ),
      lead: 'Кассеты с одноголосым переводом, названия подписаны от руки. Бери любую с полки и смотри целиком — счётчик ленты запомнит, где ты уснул.',
      cta: 'Выбрать кассету'
    }
  };

  return (
    <div ref={rootRef} className="home">
      {/* ---------- 1. Герой ---------- */}
      <section className="vhero" data-od-id="hero">
        <div className="vhero__media">
          <img
            src={asset('/images/v2/hero-night.webp')}
            alt="Ночная комната 90-х: телевизор с помехами, видеомагнитофон, лампа и ковёр на стене"
            fetchPriority="high"
          />
        </div>
        <div className="vhero__shade" aria-hidden="true" />

        <div className="osd osd--tl" aria-hidden="true">
          <span className="osd__play">▶ PLAY</span>
          <span>SP</span>
        </div>
        <div className="osd osd--tr" aria-hidden="true">
          <span>CH 03</span>
        </div>
        <div className="osd osd--br" aria-hidden="true">
          <span className="osd__counter">{counter}</span>
          <span className="osd__date">{camDate()}</span>
        </div>

        <div className="vhero__inner container">
          <p className="vhero__kicker mono">
            <span className="rec-dot" aria-hidden="true" /> 1990 — 2005 · запись с эфира
          </p>
          <h1 className="vhero__title" aria-label="Твоё детство на перемотке">
            <span className="vhero__l1">
              <SplitChars text="Твоё детство" />
            </span>
            <span className="vhero__l2">
              <SplitChars text="на перемотке" offset={8} />
            </span>
          </h1>
          <div className="vhero__row">
            <p className="vhero__lead">
              Телевизор на три кнопки, кассеты, подписанные шариковой ручкой, Денди, в которую дуют перед
              включением, и компьютерный клуб через дорогу. Включается всё.
            </p>
            <div className="vhero__actions">
              <Link className="btn btn--primary btn--xl" to="/televizor">
                Включить телевизор
                <Arrow />
              </Link>
              <Link className="btn btn--ghost btn--xl" to="/videosalon">
                Выбрать кассету
              </Link>
            </div>
          </div>
        </div>

        <a className="vhero__cue mono" href="#den">
          <span aria-hidden="true">▶▶</span> листай — перемотка
        </a>
      </section>

      {/* ---------- 2. Записка на холодильнике ---------- */}
      <section className="fnote" id="den" data-od-id="fridge-note">
        <div className="container fnote__grid">
          <div className="fnote__intro" data-reveal>
            <div className="mono fnote__eyebrow">Пятница, 15:20 · дома никого</div>
            <h2 className="fnote__title">
              Квартира твоя <em>до семи вечера</em>
            </h2>
            <p className="fnote__lead">
              Родители на работе, уроки «потом». Впереди целый вечер: мультики, картриджи, кассета с полки
              и компьютерный клуб через дорогу. Главное — всё выключить, пока в замке не повернулся ключ.
            </p>
          </div>
          <figure className="fnote__paper" aria-label="Записка от мамы на холодильнике">
            <span className="fnote__magnet" aria-hidden="true" />
            <p>Суп на плите — разогрей, не ешь холодный.</p>
            <p>Кассету с «Братом» не перематывай, папа не досмотрел.</p>
            <p>Приставку — только после уроков!</p>
            <p>Телефон не занимай, в три буду звонить.</p>
            <p className="fnote__sign">Целую. Мама</p>
            <p className="fnote__ps">P.S. Ключ на шнурке — не потеряй.</p>
          </figure>
        </div>
      </section>

      {/* ---------- 3. Программа дня ---------- */}
      <section className="day" data-od-id="day-program" aria-labelledby="day-title">
        <div className="container day__head" data-reveal>
          <div className="mono day__eyebrow">Программа на день</div>
          <h2 id="day-title" className="day__title">
            Пять комнат, <em>пять времён суток</em>
          </h2>
          <ol className="day__rail" aria-hidden="true">
            {ROOMS.map((r) => (
              <li key={r.id}>
                <span>{r.time}</span>
                {r.label}
              </li>
            ))}
          </ol>
        </div>

        <div className="chapters">
          {ROOMS.map((room, i) => {
            const c = copy[room.id];
            return (
              <article key={room.id} className={`chapter chapter--${room.id}`} aria-labelledby={`ch-${room.id}`}>
                <div className="chapter__frame">
                  <div className="chapter__media">
                    <img src={asset(room.image)} alt={room.alt} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
                  </div>
                  <div className="chapter__shade" aria-hidden="true" />
                  <div className="chapter__time" aria-hidden="true">
                    {room.time}
                  </div>
                  <div className="osd osd--tl" aria-hidden="true">
                    <span className="osd__play">▶ PLAY</span>
                    <span>
                      {String(i + 1).padStart(2, '0')} / {String(ROOMS.length).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="container chapter__inner">
                    <div className="chapter__kicker mono">
                      <span className="chapter__clock">{room.time}</span> {room.when} · {room.label}
                    </div>
                    <h3 id={`ch-${room.id}`} className="chapter__title">
                      {c.title}
                    </h3>
                    <div className="chapter__grid">
                      <p className="chapter__lead">{c.lead}</p>
                      <div className="chapter__side">
                        {room.id === 'tv' ? (
                          <Suspense fallback={<div className="onair onair--loading mono">Ловим сигнал…</div>}>
                            <HomeOnAir />
                          </Suspense>
                        ) : (
                          <dl className="chapter__facts">
                            {facts[room.id].map((f) => (
                              <div key={f.l}>
                                <dd>{f.v}</dd>
                                <dt>{f.l}</dt>
                              </div>
                            ))}
                          </dl>
                        )}
                      </div>
                    </div>
                    <div className="chapter__actions">
                      <RoomCta room={room}>{c.cta}</RoomCta>
                      {c.note ? <span className="mono chapter__note">{c.note}</span> : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ---------- 4. Полка ---------- */}
      <section className="wall" data-od-id="shelf-wall" aria-labelledby="wall-title">
        <div className="container wall__head" data-reveal>
          <div className="mono">Полка в прихожей</div>
          <h2 id="wall-title" className="wall__title">
            Всё это <em>можно трогать</em>
          </h2>
          <p className="wall__note">
            Настоящие обложки кассет и наклейки картриджей. Нажми на любую — откроется плеер или приставка.
          </p>
        </div>

        <div className="wall__rows">
          <ShelfRow label="Видеосалон" speed={90}>
            {posters.map((f) => (
              <Link key={f.slug} className="wcard wcard--poster" to={`/videosalon/${f.slug}`}>
                <img src={asset(f.poster!)} alt={`Постер: ${f.title}`} loading="lazy" decoding="async" />
                <span className="wcard__cap">
                  {f.title} <i>{f.year}</i>
                </span>
              </Link>
            ))}
          </ShelfRow>
          <ShelfRow label="Картриджи" speed={110} reverse>
            {carts.map((r) => (
              <Link key={r.id} className="wcard wcard--cart" to={`/igry/${r.id}`}>
                <img src={asset(romCart[r.id])} alt={`Картридж: ${r.title}`} loading="lazy" decoding="async" />
                <span className="wcard__cap">
                  {r.title} <i>{r.platform}</i>
                </span>
              </Link>
            ))}
          </ShelfRow>
          <ShelfRow label="Дисней-клуб" speed={95}>
            {toons.map((f) => (
              <Link key={f.slug} className="wcard wcard--poster" to={`/disney-klub/${f.slug}`}>
                <img src={asset(f.poster!)} alt={`Постер: ${f.title}`} loading="lazy" decoding="async" />
                <span className="wcard__cap">
                  {f.title} <i>{f.year}</i>
                </span>
              </Link>
            ))}
          </ShelfRow>
        </div>
      </section>

      {/* ---------- 5. Ещё в квартире ---------- */}
      <section className="more" data-od-id="more-rooms" aria-labelledby="more-title">
        <div className="container">
          <div className="more__head" data-reveal>
            <div className="mono">Ещё в квартире</div>
            <h2 id="more-title" className="more__title">
              Кухня, балкон <em>и антресоль</em>
            </h2>
          </div>
          <ul className="more__list" onMouseMove={onMoreMove} onMouseLeave={() => setMoreImg(null)}>
            {MORE.map((m, i) => (
              <li key={m.to} data-reveal style={{ ['--d' as string]: i }}>
                <Link
                  className="more__row"
                  to={m.to}
                  onMouseEnter={() => setMoreImg(m.image)}
                  onFocus={() => setMoreImg(m.image)}
                  onBlur={() => setMoreImg(null)}
                >
                  <span className="more__num mono">{String(i + 1).padStart(2, '0')}</span>
                  <span className="more__label">{m.label}</span>
                  <span className="more__note">{m.note}</span>
                  <span className="more__thumb" aria-hidden="true">
                    <img src={asset(m.image)} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className="more__arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div ref={previewRef} className={`more__preview${moreImg ? ' is-on' : ''}`} aria-hidden="true">
          {MORE.map((m) => (
            <img key={m.image} src={asset(m.image)} alt="" className={moreImg === m.image ? 'is-on' : ''} loading="lazy" />
          ))}
        </div>
      </section>
    </div>
  );
}

function ShelfRow({ label, children, speed, reverse }: { label: string; children: ReactNode; speed: number; reverse?: boolean }) {
  // Копия ленты нужна для бесшовной прокрутки. Раньше она была inert и не реагировала на мышь,
  // поэтому половина карточек «мёртвая». Теперь копия кликабельна, но убрана из Tab-навигации.
  const dupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dupRef.current?.querySelectorAll('a,button').forEach((el) => el.setAttribute('tabindex', '-1'));
  });
  return (
    <div className={`wrow${reverse ? ' wrow--rev' : ''}`} style={{ ['--dur' as string]: `${speed}s` }}>
      <div className="wrow__label mono">{label}</div>
      <div className="wrow__viewport">
        <div className="wrow__track">
          <div className="wrow__set">{children}</div>
          <div className="wrow__set" aria-hidden="true" ref={dupRef}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
