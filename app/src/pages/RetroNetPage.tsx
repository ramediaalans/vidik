import { useCallback, useEffect, useRef, useState } from 'react';
import { SectionHeader } from '../components/core';
import { PageHero } from '../v2/PageHero';
import { RetroDesktop } from '../v2/RetroDesktop';

const DIRECTORY = [
  {
    title: 'Сам архив',
    note: 'Тут лежат миллиарды старых страниц. Вбиваешь адрес — выбираешь год.',
    links: [
      { label: 'Wayback Machine', url: 'https://web.archive.org' },
      { label: 'Internet Archive', url: 'https://archive.org' }
    ]
  },
  {
    title: 'Старые программы',
    note: 'Игры и софт для DOS и Windows, которые запускаются прямо в браузере.',
    links: [{ label: 'Библиотека софта', url: 'https://archive.org/details/softwarelibrary' }]
  },
  {
    title: 'Журналы из киоска',
    note: 'Те самые номера, которые покупали ради постера и диска с демками.',
    links: [{ label: 'Журнальная стойка', url: 'https://archive.org/details/magazine_rack' }]
  }
];

// Экран рабочего стола вписан в монитор с картинки. Внутри рабочий стол
// всегда 960×712, а на нужный размер его масштабирует transform.
// Клавиша F (в русской раскладке — А) разворачивает экран на весь монитор.
function RetroPC() {
  const frame = useRef<HTMLDivElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const el = screen.current;
    if (!el) return;
    const fit = () => el.style.setProperty('--k', String(el.clientWidth / 960));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toggle = useCallback(() => {
    setFull((was) => {
      const next = !was;
      const el = frame.current;
      if (next) el?.requestFullscreen?.().catch(() => undefined);
      else if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.code === 'KeyF') { e.preventDefault(); toggle(); }
      else if (e.code === 'Escape' && full) setFull(false);
    };
    const onFs = () => { if (!document.fullscreenElement) setFull(false); };
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs); };
  }, [toggle, full]);

  return (
    <div className="pcwrap">
      <div className={'pcframe' + (full ? ' is-full' : '')} ref={frame}>
        <div className="pcframe__glass" aria-hidden="true" />
        <div className="pcframe__screen" ref={screen}>
          <RetroDesktop />
        </div>
        <img className="pcframe__img" src="/images/retro/pc-frame.webp" alt="" aria-hidden="true" width={1536} height={1024} draggable={false} />
        {full && <div className="pcframe__exit">F или Esc — вернуться к столу</div>}
      </div>
      <button type="button" className="pcframe__hint" onClick={toggle}>
        <kbd>F</kbd> — развернуть экран на весь монитор
      </button>
    </div>
  );
}

export function RetroNetPage() {
  return (
    <>
      <PageHero
        compact
        index="08"
        kicker="Ретроинтернет"
        title="Интернет, который пищал"
        lead="Сначала нужна свободная линия и чтобы никто не снял трубку. Потом — Яндекс, Рамблер и почта ровно такими, какими они были в конце девяностых."
        image="/images/games/game-5.webp"
        alt="Домашний компьютер конца 90-х"
      />

      <section className="section container">
        <SectionHeader
          index="Модем на 33.6"
          title="Подключись, как тогда"
          note="Нажми «Подключить» и дождись писка. Страницы настоящие — из архива Wayback Machine."
        />
        <RetroPC />
      </section>

      <section className="section container">
        <SectionHeader index="Закладки" title="Где копать дальше" />
        <div className="grid grid--3">
          {DIRECTORY.map((d) => (
            <div className="card" key={d.title}>
              <div className="card__body">
                <h3 className="card__title">{d.title}</h3>
                <p className="card__desc">{d.note}</p>
                <div className="stack" style={{ gap: 6, marginTop: 8 }}>
                  {d.links.map((l) => (
                    <a className="chip" key={l.url} href={l.url} target="_blank" rel="noreferrer noopener">
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
