import { useEffect, useMemo, useState } from 'react';
import { asset } from '../media/asset';
import { useNavigate } from 'react-router-dom';
import { channels, mixtape, yearCards } from '../data/extra';
import { catalog } from '../data/catalog';
import type { CatalogItem } from '../media/types';

/* ---------------- Ретро-телевизор ---------------- */

export function RetroTV() {
  const [index, setIndex] = useState(0);
  const [noise, setNoise] = useState(false);
  const [on, setOn] = useState(true);
  const channel = channels[index];

  const switchTo = (next: number) => {
    setNoise(true);
    window.setTimeout(() => {
      setIndex((next + channels.length) % channels.length);
      setNoise(false);
    }, 220);
  };

  return (
    <div className="grid grid--2" style={{ alignItems: 'start' }}>
      <div className="crt">
        <div className="crt__screen scanlines">
          {on ? (
            <img src={asset(channel.image)} alt={channel.alt} loading="lazy" />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#05070a' }} />
          )}
          <div className={`noise${noise || !on ? ' is-on' : ''}`} aria-hidden="true" />
          <div className="crt__glass" aria-hidden="true" />
          {on ? (
            <div
              className="pixel"
              style={{
                position: 'absolute',
                top: 14,
                right: 18,
                zIndex: 5,
                color: 'var(--acid)',
                fontSize: 24,
                textShadow: '0 0 12px rgba(201,240,58,.6)'
              }}
            >
              {channel.num}
            </div>
          ) : null}
        </div>
        <div className="crt__panel">
          <div className="crt__knobs" aria-hidden="true">
            <span className="knob" />
            <span className="knob" />
          </div>
          <div className="row">
            <button className="btn btn--sm" onClick={() => switchTo(index - 1)} aria-label="Предыдущий канал">
              ← Канал
            </button>
            <button className="btn btn--sm" onClick={() => switchTo(index + 1)} aria-label="Следующий канал">
              Канал →
            </button>
            <button className="btn btn--sm" onClick={() => setOn((v) => !v)}>
              {on ? 'Выключить' : 'Включить'}
            </button>
          </div>
        </div>
      </div>

      <div className="stack">
        <div>
          <div className="mono">Сейчас в эфире</div>
          <h3 className="display display--m" style={{ marginTop: 6 }}>
            {channel.name}
          </h3>
          <p className="lead" style={{ marginTop: 8 }}>{channel.caption}</p>
          <p className="mono" style={{ marginTop: 8 }}>{channel.now} · {channel.next}</p>
        </div>
        <div className="channels" role="listbox" aria-label="Каналы">
          {channels.map((c, i) => (
            <button
              key={c.num}
              role="option"
              aria-selected={i === index}
              className={`channel${i === index ? ' is-active' : ''}`}
              onClick={() => switchTo(i)}
            >
              <span className="channel__num">{c.num}</span>
              <span>
                <span className="channel__name">{c.name}</span>
                <br />
                <span className="channel__now">{c.now}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Кассетный магнитофон ---------------- */

export function CassettePlayer() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const track = mixtape[index];

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setPos((p) => {
        if (p >= 100) {
          setIndex((i) => (i + 1) % mixtape.length);
          return 0;
        }
        return p + 1.4;
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [playing]);

  const pick = (i: number) => {
    setIndex(i);
    setPos(0);
  };

  return (
    <div className="tape">
      <div>
        <div className="tape__body">
          <div className="tape__label">
            <span>Сторона {track.side}</span>
            <span>C-90</span>
          </div>
          <div className="tape__reels">
            <span className={`reel${playing ? ' is-playing' : ''}`} aria-hidden="true" />
            <span className={`reel${playing ? ' is-playing' : ''}`} aria-hidden="true" />
          </div>
          <div className="progress">
            <div className="progress__bar" style={{ width: `${Math.min(pos, 100)}%` }} />
          </div>
        </div>
        <div className="tape__controls" style={{ marginTop: 16 }}>
          <button className="btn btn--sm" onClick={() => pick((index - 1 + mixtape.length) % mixtape.length)}>
            ◀◀ Назад
          </button>
          <button className="btn btn--sm btn--primary" onClick={() => setPlaying((v) => !v)}>
            {playing ? '‖ Пауза' : '▶ Играть'}
          </button>
          <button className="btn btn--sm" onClick={() => pick((index + 1) % mixtape.length)}>
            ▶▶ Дальше
          </button>
        </div>
      </div>

      <div className="stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="mono">Сборник «Для себя»</div>
            <h3 className="display display--m" style={{ marginTop: 6 }}>{track.title}</h3>
            <div className="card__sub">
              {track.artist} · {track.year} · {track.duration}
            </div>
          </div>
          {playing ? (
            <div className="equalizer" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                <span key={i} style={{ animationDelay: `${i * 90}ms` }} />
              ))}
            </div>
          ) : null}
        </div>

        <p className="lead" style={{ color: 'var(--amber)' }}>«{track.note}»</p>

        <div className="channels">
          {mixtape.map((t, i) => (
            <button key={t.id} className={`channel${i === index ? ' is-active' : ''}`} onClick={() => pick(i)}>
              <span className="channel__num">{t.side}</span>
              <span>
                <span className="channel__name">{t.title}</span>
                <br />
                <span className="channel__now">
                  {t.artist} · {t.year}
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="source">
          <span>
            Звука здесь нет: мы не храним чужую музыку. Это кассета-воспоминание —
            треклист и подписи на вкладыше.
          </span>
          <a
            className="btn btn--sm"
            href={`https://ru.wikipedia.org/w/index.php?search=${encodeURIComponent(`${track.artist} ${track.title}`)}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            Узнать о треке
          </a>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Генератор ностальгии ---------------- */

const DECADES = [
  { id: 'early', label: '1990–1994' },
  { id: 'mid', label: '1995–1999' },
  { id: 'late', label: '2000–2005' }
];

const MOODS = [
  { id: 'home', label: 'Дома у телевизора' },
  { id: 'club', label: 'В компьютерном клубе' },
  { id: 'yard', label: 'Во дворе с плеером' }
];

export function NostalgiaGenerator({ onOpen }: { onOpen: (item: CatalogItem) => void }) {
  const [decade, setDecade] = useState('mid');
  const [mood, setMood] = useState('home');
  const [seed, setSeed] = useState(0);

  const result = useMemo(() => {
    const range =
      decade === 'early' ? [1985, 1994] : decade === 'mid' ? [1995, 1999] : [2000, 2005];
    const inRange = catalog.filter((i) => i.year >= range[0] && i.year <= range[1]);
    const pool = inRange.length >= 3 ? inRange : catalog;
    const order: CatalogItem['kind'][][] =
      mood === 'club'
        ? [['game'], ['movie', 'cartoon'], ['music']]
        : mood === 'yard'
          ? [['music'], ['game'], ['movie', 'cartoon']]
          : [['movie'], ['cartoon'], ['music']];

    const pick = (kinds: CatalogItem['kind'][], taken: Set<string>) => {
      const bucket = pool.filter((i) => kinds.includes(i.kind) && !taken.has(i.id));
      const fallback = pool.filter((i) => !taken.has(i.id));
      const list = bucket.length ? bucket : fallback;
      if (!list.length) return undefined;
      return list[(seed * 7 + kinds.length * 3 + taken.size * 5) % list.length];
    };

    const taken = new Set<string>();
    const out: CatalogItem[] = [];
    for (const kinds of order) {
      const item = pick(kinds, taken);
      if (item) {
        taken.add(item.id);
        out.push(item);
      }
    }
    return out;
  }, [decade, mood, seed]);

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="stack" style={{ gap: 12 }}>
        <div className="row">
          <span className="mono">Когда:</span>
          {DECADES.map((d) => (
            <button
              key={d.id}
              className={`chip${decade === d.id ? ' chip--active' : ''}`}
              onClick={() => setDecade(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="row">
          <span className="mono">Где:</span>
          {MOODS.map((m) => (
            <button
              key={m.id}
              className={`chip${mood === m.id ? ' chip--active' : ''}`}
              onClick={() => setMood(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div>
          <button className="btn btn--primary" onClick={() => setSeed((s) => s + 1)}>
            Собрать вечер
          </button>
        </div>
      </div>

      <div className="grid grid--3">
        {result.map((item) => (
          <button key={item.id} className="card" onClick={() => onOpen(item)}>
            <div className="card__media">
              <span className="card__year pixel">{item.year}</span>
              <img src={asset(item.image)} alt={item.imageAlt} loading="lazy" />
            </div>
            <div className="card__body">
              <h3 className="card__title">{item.title}</h3>
              <p className="card__desc">{item.memory}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Год ---------------- */

export function YearSelector() {
  const [active, setActive] = useState(yearCards[3].year);
  const card = yearCards.find((y) => y.year === active) ?? yearCards[0];

  return (
    <div className="stack" style={{ gap: 24 }}>
      <div className="years" role="tablist" aria-label="Годы">
        {yearCards.map((y) => (
          <button
            key={y.year}
            role="tab"
            aria-selected={y.year === active}
            className={`year-btn${y.year === active ? ' is-active' : ''}`}
            onClick={() => setActive(y.year)}
          >
            {y.year}
          </button>
        ))}
      </div>

      <div className="grid grid--3">
        <div className="tile" style={{ minHeight: 160 }}>
          <div className="tile__content">
            <div className="mono">Смотрели</div>
            <p className="lead">{card.watched}</p>
          </div>
        </div>
        <div className="tile" style={{ minHeight: 160 }}>
          <div className="tile__content">
            <div className="mono">Играли</div>
            <p className="lead">{card.played}</p>
          </div>
        </div>
        <div className="tile" style={{ minHeight: 160 }}>
          <div className="tile__content">
            <div className="mono">Слушали</div>
            <p className="lead">{card.listened}</p>
          </div>
        </div>
        <div className="tile" style={{ minHeight: 160 }}>
          <div className="tile__content">
            <div className="mono">Техника</div>
            <p className="lead">{card.tech}</p>
          </div>
        </div>
        <div className="tile" style={{ minHeight: 160, gridColumn: 'span 2' }}>
          <div className="tile__content">
            <div className="mono">Настроение года</div>
            <p className="lead" style={{ color: 'var(--amber)' }}>{card.mood}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Ретро-компьютер ---------------- */

const DESKTOP = [
  { id: 'movies', label: 'Фильмы.exe', to: '/filmy' },
  { id: 'games', label: 'Игры.exe', to: '/igry' },
  { id: 'music', label: 'Музыка.exe', to: '/muzyka' },
  { id: 'tv', label: 'ТВ.exe', to: '/televizor' },
  { id: 'stories', label: 'Истории.txt', to: '/istorii' },
  { id: 'net', label: 'Интернет.lnk', to: '/retrointernet' }
];

export function RetroComputer() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(DESKTOP[0].id);
  const item = DESKTOP.find((d) => d.id === selected) ?? DESKTOP[0];

  return (
    <div className="crt">
      <div
        className="crt__screen scanlines"
        style={{ aspectRatio: '16 / 10', background: '#0b1c2c', padding: 18 }}
      >
        <div
          style={{
            position: 'relative',
            zIndex: 5,
            display: 'grid',
            gridTemplateColumns: 'minmax(140px, 200px) 1fr',
            gap: 18,
            height: '100%'
          }}
        >
          <div className="stack" style={{ gap: 8 }}>
            {DESKTOP.map((d) => (
              <button
                key={d.id}
                className="mono"
                onClick={() => setSelected(d.id)}
                onDoubleClick={() => navigate(d.to)}
                style={{
                  textAlign: 'left',
                  color: selected === d.id ? 'var(--ink)' : 'var(--beige)',
                  background: selected === d.id ? 'var(--beige)' : 'transparent',
                  padding: '4px 8px',
                  borderRadius: 2
                }}
              >
                ■ {d.label}
              </button>
            ))}
          </div>
          <div
            style={{
              background: 'rgba(237,230,214,.92)',
              color: '#14110f',
              borderRadius: 4,
              border: '2px solid #7d766a',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            <div
              className="mono"
              style={{ color: '#14110f', borderBottom: '1px solid #b5ab99', paddingBottom: 8 }}
            >
              {item.label}
            </div>
            <p style={{ margin: 0, fontSize: 14 }}>
              Двойной клик откроет раздел. Как раньше: если не открылось с первого раза —
              кликни ещё пять.
            </p>
            <button className="btn btn--sm btn--primary" onClick={() => navigate(item.to)}>
              Открыть
            </button>
          </div>
        </div>
        <div className="crt__glass" aria-hidden="true" />
      </div>
    </div>
  );
}
