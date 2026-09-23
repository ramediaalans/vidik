import { useEffect, useRef, useState } from 'react';
import { asset } from '../media/asset';
import { SectionHeader } from '../components/core';
import { retroSites } from '../data/extra';

const DIRECTORY = [
  {
    title: 'Архивы и сохранение',
    note: 'Сайты, где легально хранят цифровую историю.',
    links: [
      { label: 'Internet Archive', url: 'https://archive.org' },
      { label: 'Wayback Machine', url: 'https://web.archive.org' },
      { label: 'Открытая библиотека', url: 'https://openlibrary.org' }
    ]
  },
  {
    title: 'Игровая история',
    note: 'Каталоги и документация эпохи 8 и 16 бит.',
    links: [
      { label: 'Каталог игр в Internet Archive', url: 'https://archive.org/details/softwarelibrary' },
      { label: 'Статьи на Википедии', url: 'https://ru.wikipedia.org/wiki/История_компьютерных_игр' }
    ]
  },
  {
    title: 'Журналы и печать',
    note: 'То, что покупали в киоске ради постера на развороте.',
    links: [
      { label: 'Журнальные коллекции', url: 'https://archive.org/details/magazine_rack' }
    ]
  }
];

export function RetroNetPage() {
  const [active, setActive] = useState(retroSites[0]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'slow'>('loading');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setStatus((s) => (s === 'ready' ? s : 'slow'));
    }, 15000);
    return () => window.clearTimeout(timer.current);
  }, [active.id]);

  const selectSite = (site: (typeof retroSites)[number]) => {
    if (site.id === active.id) return;
    setStatus('loading');
    setActive(site);
  };

  return (
    <>
      <section className="hero vignette" style={{ minHeight: 'min(52vh, 460px)' }}>
        <div className="hero__media">
          <img src={asset('/images/games/game-5.webp')} alt="Домашний компьютер конца 90-х" />
        </div>
        <div className="hero__inner container" style={{ paddingBottom: 48 }}>
          <div className="hero__kicker pixel">08 · Ретроинтернет</div>
          <h1 className="display display--l" style={{ margin: '12px 0' }}>
            Интернет, который пищал
          </h1>
          <p className="lead">
            Старые сайты открываются через Wayback Machine — это официальный архив, а не наша копия.
          </p>
        </div>
      </section>

      <section className="section container">
        <SectionHeader index="Архив сайтов" title="Открой старую страницу" note="Страницы грузятся с серверов Internet Archive." />
        <div className="grid grid--2" style={{ alignItems: 'start' }}>
          <div className="crt">
            <div className="crt__screen" style={{ aspectRatio: '4 / 3', background: '#0b0b0c' }}>
              <iframe
                key={active.id}
                src={active.embedUrl}
                title={`${active.title} · ${active.year}`}
                style={{ width: '100%', height: '100%', border: 0, background: '#fff' }}
                onLoad={() => setStatus('ready')}
                referrerPolicy="no-referrer"
              />
              {status !== 'ready' && (
                <div className="dialup" role="status">
                  {status === 'loading' ? (
                    <>
                      <span className="pixel dialup__title">Соединение с архивом…</span>
                      <span className="mono">web.archive.org · {active.year}</span>
                      <span className="dialup__bar" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      <span className="pixel dialup__title">Архив отвечает медленно</span>
                      <span className="mono">Страница ещё грузится или провайдер её не отдаёт.</span>
                      <a className="btn btn--sm" href={active.embedUrl} target="_blank" rel="noreferrer noopener">
                        Открыть в новой вкладке
                      </a>
                    </>
                  )}
                </div>
              )}
              <div className="crt__glass" aria-hidden="true" />
            </div>
            <div className="crt__panel">
              <span className="mono">Источник: Internet Archive · официальный</span>
              <a className="btn btn--sm" href={active.url} target="_blank" rel="noreferrer noopener">
                Открыть у провайдера
              </a>
            </div>
          </div>

          <div className="channels">
            {retroSites.map((s) => (
              <button
                key={s.id}
                className={`channel${s.id === active.id ? ' is-active' : ''}`}
                onClick={() => selectSite(s)}
              >
                <span className="channel__num">{s.year.slice(2)}</span>
                <span>
                  <span className="channel__name">{s.title}</span>
                  <br />
                  <span className="channel__now">{s.note}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section container">
        <SectionHeader index="Каталог" title="Где искать дальше" note="Собственная подборка легальных источников для самостоятельных раскопок." />
        <div className="grid grid--3">
          {DIRECTORY.map((d) => (
            <div className="card" key={d.title}>
              <div className="card__body">
                <h3 className="card__title">{d.title}</h3>
                <p className="card__desc">{d.note}</p>
                <div className="stack" style={{ gap: 6, marginTop: 8 }}>
                  {d.links.map((l) => (
                    <a
                      className="chip"
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
