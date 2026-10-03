// «Модем на 33.6»: рабочий стол Windows 98. Сначала дозвон через модем,
// потом Internet Explorer открывает настоящие сайты тех лет из Wayback Machine.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { retroSites } from '../data/extra';
import { IcqChat } from './IcqChat';
import './retro.css';

type Win = 'dialup' | 'ie' | 'notepad' | 'pc' | 'bin' | 'icq';
type Net = 'off' | 'dialing' | 'on';

const TITLES: Record<Win, string> = {
  dialup: 'Удалённый доступ к сети',
  ie: 'Microsoft Internet Explorer',
  notepad: 'ИНТЕРНЕТ.txt — Блокнот',
  pc: 'Мой компьютер',
  bin: 'Корзина',
  icq: 'ICQ 99b'
};

const START: Record<Win, { x: number; y: number }> = {
  dialup: { x: 150, y: 40 },
  ie: { x: 110, y: 14 },
  notepad: { x: 300, y: 80 },
  pc: { x: 200, y: 60 },
  bin: { x: 260, y: 110 },
  icq: { x: 330, y: 24 }
};

const STEPS = [
  'Набор номера…',
  'Проверка имени пользователя и пароля…',
  'Регистрация компьютера в сети…'
];

const NOTE = `Номер дозвона и пароль — на карточке, под защитным слоем.
Стирать монеткой, не ногтем, а то цифры сотрутся.

После 22:00 час дешевле. До вечера — только почту проверить.

Предупредить маму, чтобы не снимала трубку.
В прошлый раз связь оборвалась на 98% загрузки.

Картинки отключить: Сервис → Свойства обозревателя.
Грузится в три раза быстрее.

НЕ ЗАБЫТЬ ОТКЛЮЧИТЬСЯ.`;

const TRASH = ['реферат_история_2.doc', 'Новый текстовый документ.txt', 'doom2_save.zip', 'ПРИВЕТ!!!.exe'];

// Тоны набора номера и короткий «скрежет» рукопожатия — синтез в браузере, без файлов.
function modemSound(ctx: AudioContext) {
  const DTMF: Record<string, [number, number]> = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477], '4': [770, 1209], '5': [770, 1336],
    '6': [770, 1477], '7': [852, 1209], '8': [852, 1336], '9': [852, 1477], '0': [941, 1336]
  };
  const out = ctx.createGain();
  out.gain.value = 0.06;
  out.connect(ctx.destination);
  let t = ctx.currentTime + 0.05;
  const tone = (f: number, start: number, dur: number) => {
    const o = ctx.createOscillator();
    o.frequency.value = f;
    o.connect(out);
    o.start(start);
    o.stop(start + dur);
  };
  for (const d of '2401698') {
    const [a, b] = DTMF[d];
    tone(a, t, 0.11);
    tone(b, t, 0.11);
    t += 0.17;
  }
  t += 0.4;
  tone(2100, t, 0.9);
  t += 1;
  const len = Math.floor(ctx.sampleRate * 1.6);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (i % 4000 < 2600 ? 1 : 0.3);
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 0.8;
  noise.connect(bp).connect(out);
  noise.start(t);
}

const Icon = ({ kind }: { kind: Win | 'net' }) => {
  switch (kind) {
    case 'pc':
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <rect x="4" y="4" width="24" height="17" fill="#c0c0c0" stroke="#000" />
          <rect x="7" y="7" width="18" height="11" fill="#008080" />
          <rect x="10" y="22" width="12" height="3" fill="#c0c0c0" stroke="#000" />
          <rect x="6" y="25" width="20" height="3" fill="#c0c0c0" stroke="#000" />
        </svg>
      );
    case 'ie':
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <ellipse cx="16" cy="16" rx="14" ry="6" fill="none" stroke="#e0b000" strokeWidth="2" transform="rotate(-25 16 16)" />
          <text x="16" y="23" textAnchor="middle" fontSize="22" fontWeight="700" fontFamily="Georgia, serif" fill="#1a5fd0">e</text>
        </svg>
      );
    case 'notepad':
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <rect x="7" y="4" width="18" height="24" fill="#fff" stroke="#000" />
          <rect x="7" y="4" width="18" height="4" fill="#1a5fd0" />
          <path d="M10 12h12M10 16h12M10 20h9" stroke="#000" />
        </svg>
      );
    case 'bin':
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M8 9h16l-2 19H10z" fill="#d8d8d8" stroke="#000" />
          <path d="M6 7h20v2H6z" fill="#a0a0a0" stroke="#000" />
          <path d="M13 12v13M16 12v13M19 12v13" stroke="#606060" />
        </svg>
      );
    case 'icq':
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          {[0, 51, 103, 154, 206, 257, 309].map((a, i) => (
            <ellipse key={a} cx="16" cy="7.5" rx="3.6" ry="6" fill={i === 0 ? '#e02020' : '#3cb043'} transform={`rotate(${a} 16 16)`} />
          ))}
          <circle cx="16" cy="16" r="3.5" fill="#ffd400" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <rect x="3" y="6" width="14" height="10" fill="#c0c0c0" stroke="#000" />
          <rect x="15" y="14" width="14" height="10" fill="#c0c0c0" stroke="#000" />
          <path d="M10 16v6h5" stroke="#000" fill="none" />
        </svg>
      );
  }
};

const coarse = () => window.matchMedia('(pointer: coarse), (max-width: 860px)').matches;

function clock() {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function RetroDesktop() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<Win[]>(['notepad', 'dialup']);
  const [pos, setPos] = useState(START);
  const [min, setMin] = useState<Win[]>([]);
  const [net, setNet] = useState<Net>('off');
  const [step, setStep] = useState(0);
  const [sound, setSound] = useState(true);
  const [online, setOnline] = useState(0);
  const [site, setSite] = useState(retroSites[0]);
  const [page, setPage] = useState<'loading' | 'ready' | 'slow'>('loading');
  const [startMenu, setStartMenu] = useState(false);
  const [trash, setTrash] = useState(TRASH);
  const [off, setOff] = useState(false);
  const [time, setTime] = useState(clock);
  const [icqNew, setIcqNew] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const desk = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);

  const top = open[open.length - 1];
  const focus = (w: Win) => {
    setMin((m) => m.filter((x) => x !== w));
    setOpen((o) => [...o.filter((x) => x !== w), w]);
    setStartMenu(false);
  };
  const close = (w: Win) => setOpen((o) => o.filter((x) => x !== w));

  useEffect(() => {
    const id = window.setInterval(() => setTime(clock()), 15000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (net !== 'on') return;
    const id = window.setInterval(() => setOnline((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [net]);

  useEffect(() => {
    if (net !== 'on') return;
    setPage('loading');
    const id = window.setTimeout(() => setPage((p) => (p === 'ready' ? p : 'slow')), 15000);
    return () => window.clearTimeout(id);
  }, [site.id, net]);

  useEffect(() => () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    audio.current?.close().catch(() => {});
  }, []);

  const dial = () => {
    if (net !== 'off') return;
    setNet('dialing');
    setStep(0);
    if (sound) {
      try {
        audio.current ??= new AudioContext();
        modemSound(audio.current);
      } catch {
        /* без звука */
      }
    }
    timers.current = [
      window.setTimeout(() => setStep(1), 1900),
      window.setTimeout(() => setStep(2), 3300),
      window.setTimeout(() => {
        setNet('on');
        setOnline(0);
        close('dialup');
        focus('ie');
      }, 4600)
    ];
  };

  const hangUp = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    setNet('off');
    setStep(0);
  };

  const drag = (w: Win) => (e: RPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || window.innerWidth < 860) return;
    focus(w);
    const box = desk.current?.getBoundingClientRect();
    const k = box && desk.current?.offsetWidth ? box.width / desk.current.offsetWidth : 1;
    const sx = e.clientX / k - pos[w].x;
    const sy = e.clientY / k - pos[w].y;
    const move = (ev: PointerEvent) => {
      const maxX = (box?.width ?? 800) / k - 120;
      const maxY = (box?.height ?? 560) / k - 70;
      setPos((p) => ({ ...p, [w]: { x: Math.min(Math.max(ev.clientX / k - sx, -60), maxX), y: Math.min(Math.max(ev.clientY / k - sy, 0), maxY) } }));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const mmss = `${String(Math.floor(online / 60)).padStart(2, '0')}:${String(online % 60).padStart(2, '0')}`;

  // keep: окно не размонтируется при сворачивании/закрытии (Аська живёт в трее).
  const frame = (w: Win, body: ReactNode, cls = '', keep = false) =>
    (open.includes(w) && !min.includes(w)) || keep ? (
      <div
        className={`w98-win ${cls}${top === w ? ' is-top' : ''}`}
        hidden={!(open.includes(w) && !min.includes(w))}
        style={{ left: pos[w].x, top: pos[w].y, zIndex: 10 + open.indexOf(w) }}
        onPointerDown={() => top !== w && focus(w)}
        role="dialog"
        aria-label={TITLES[w]}
      >
        <div className="w98-title" onPointerDown={drag(w)}>
          <span className="w98-title__ico"><Icon kind={w === 'dialup' ? 'net' : w} /></span>
          <span className="w98-title__txt">{TITLES[w]}</span>
          <button className="w98-tbtn" aria-label="Свернуть" onClick={() => setMin((m) => [...m, w])}>_</button>
          <button className="w98-tbtn" aria-label="Закрыть" onClick={() => close(w)}>×</button>
        </div>
        {body}
      </div>
    ) : null;

  if (off) {
    return (
      <div className="w98 w98--off">
        <p>Теперь компьютер можно выключить.</p>
        <button className="w98-btn" onClick={() => { setOff(false); setOpen(['notepad']); hangUp(); }}>
          Включить снова
        </button>
      </div>
    );
  }

  return (
    <div className="w98" ref={desk} onPointerDown={(e) => e.target === e.currentTarget && setStartMenu(false)}>
      <div className="w98-icons">
        {(['pc', 'ie', 'dialup', 'icq', 'notepad', 'bin'] as Win[]).map((w) => (
          <button key={w} className="w98-icon" onDoubleClick={() => focus(w)} onClick={(e) => (e.detail === 0 || coarse()) && focus(w)} onKeyDown={(e) => e.key === 'Enter' && focus(w)}>
            <Icon kind={w === 'dialup' ? 'net' : w} />
            <span>{w === 'dialup' ? 'Подключение' : w === 'ie' ? 'Internet Explorer' : w === 'notepad' ? 'ИНТЕРНЕТ.txt' : w === 'icq' ? 'ICQ' : TITLES[w]}</span>
          </button>
        ))}
        <p className="w98-hint">Двойной щелчок — открыть</p>
      </div>

      {frame(
        'dialup',
        <div className="w98-body w98-dial">
          <div className="w98-row"><label>Имя пользователя:</label><input className="w98-field" defaultValue="vasya_98" readOnly /></div>
          <div className="w98-row"><label>Пароль:</label><input className="w98-field" type="password" defaultValue="carta2001" readOnly /></div>
          <div className="w98-row"><label>Номер:</label><input className="w98-field" defaultValue="240-16-98" readOnly /></div>
          <label className="w98-check"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Звук модема</label>
          <div className="w98-status" role="status">
            {net === 'dialing' ? STEPS[step] : net === 'on' ? 'Подключено на скорости 33 600 бит/с' : 'Линия свободна. Трубку никто не снял.'}
          </div>
          <div className="w98-actions">
            {net === 'off' ? (
              <button className="w98-btn w98-btn--def" onClick={dial}>Подключить</button>
            ) : (
              <button className="w98-btn" onClick={hangUp}>{net === 'on' ? 'Отключить' : 'Отмена'}</button>
            )}
            <button className="w98-btn" onClick={() => close('dialup')}>Закрыть</button>
          </div>
        </div>,
        'w98-win--dial'
      )}

      {frame(
        'ie',
        <div className="w98-ie">
          <div className="w98-menu"><span>Файл</span><span>Правка</span><span>Вид</span><span>Избранное</span><span>Сервис</span><span>Справка</span></div>
          <div className="w98-addr">
            <span>Адрес</span>
            <span className="w98-field w98-field--addr">{net === 'on' ? site.url : 'about:blank'}</span>
            {net === 'on' ? <a className="w98-btn w98-btn--sm" href={site.url} target="_blank" rel="noreferrer noopener">Открыть</a> : null}
          </div>
          <div className="w98-fav">
            {retroSites.map((s) => (
              <button key={s.id} className={`w98-favbtn${s.id === site.id ? ' is-on' : ''}`} onClick={() => setSite(s)} title={s.note}>
                {s.title} <i>{s.year}</i>
              </button>
            ))}
          </div>
          {net === 'on' ? (
            <form
              className="w98-search"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
                if (q) window.open(searchUrl(site.id, q), '_blank', 'noopener,noreferrer');
              }}
            >
              <label htmlFor="w98-q">Поиск</label>
              <input id="w98-q" name="q" className="w98-field" placeholder={`Спросить ${engineName(site.id)}`} autoComplete="off" />
              <button className="w98-btn w98-btn--sm" type="submit">Найти!</button>
            </form>
          ) : null}
          <div className="w98-view">
            {net === 'on' ? (
              <>
                <iframe key={site.id} src={site.embedUrl} title={`${site.title}, ${site.year}`} onLoad={() => setPage('ready')} referrerPolicy="no-referrer" />
                {page !== 'ready' ? (
                  <div className="w98-loading">
                    {page === 'loading' ? (
                      <>Открывается {site.title} образца {site.year} года…<span className="w98-bar" /></>
                    ) : (
                      <>
                        Архив отвечает медленно — как и тогда.
                        <a className="w98-btn" href={site.embedUrl} target="_blank" rel="noreferrer noopener">Открыть в новом окне</a>
                      </>
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="w98-nopage">
                <h4>Не удаётся отобразить страницу</h4>
                <p>Нет подключения к Интернету. Модем молчит, а телефон, возможно, занят.</p>
                <button className="w98-btn" onClick={() => focus('dialup')}>Подключиться</button>
              </div>
            )}
          </div>
          <div className="w98-statusbar">
            <span>{net !== 'on' ? 'Автономная работа' : page === 'ready' ? 'Готово' : 'Загрузка…'}</span>
            <span>{net === 'on' ? site.note : ''}</span>
          </div>
        </div>,
        'w98-win--ie'
      )}

      {frame('notepad', <pre className="w98-pad">{NOTE}</pre>, 'w98-win--pad')}

      {frame(
        'pc',
        <div className="w98-body w98-pc">
          <p className="w98-small">Диск C: · 1,2 ГБ · свободно 37 МБ</p>
          {[
            ['Видеосалон', '/videosalon'],
            ['Диснеевские мультики', '/disney-klub'],
            ['Приставка', '/igry'],
            ['Телевизор', '/televizor'],
            ['Сборник на кассете', '/nostalgiya'],
            ['Календарь', '/po-godam'],
            ['Дневник двора', '/istorii']
          ].map(([n, to]) => (
            <button key={to} className="w98-folder" onDoubleClick={() => navigate(to)} onClick={(e) => (e.detail === 0 || coarse()) && navigate(to)}>
              <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 9h10l2 3h14v14H3z" fill="#f3d36b" stroke="#000" /></svg>
              <span>{n}</span>
            </button>
          ))}
        </div>,
        'w98-win--pc'
      )}

      {frame(
        'bin',
        <div className="w98-body">
          {trash.length ? (
            <ul className="w98-list">{trash.map((f) => <li key={f}>{f}</li>)}</ul>
          ) : (
            <p className="w98-small">Корзина пуста.</p>
          )}
          <div className="w98-actions">
            <button className="w98-btn" disabled={!trash.length} onClick={() => setTrash([])}>Очистить корзину</button>
          </div>
        </div>,
        'w98-win--bin'
      )}

      {frame(
        'icq',
        <IcqChat online={net === 'on'} onConnect={() => focus('dialup')} onUnread={setIcqNew} />,
        'w98-win--icq',
        true
      )}

      {startMenu ? (
        <div className="w98-start" role="menu">
          <div className="w98-start__side">Windows<b>98</b></div>
          <div className="w98-start__items">
            {(['ie', 'dialup', 'pc', 'notepad', 'icq'] as Win[]).map((w) => (
              <button key={w} role="menuitem" onClick={() => focus(w)}>
                <Icon kind={w === 'dialup' ? 'net' : w} /> {TITLES[w]}
              </button>
            ))}
            <hr />
            <button role="menuitem" onClick={() => { hangUp(); setStartMenu(false); setOff(true); }}>Завершение работы…</button>
          </div>
        </div>
      ) : null}

      <div className="w98-taskbar">
        <button className={`w98-btn w98-startbtn${startMenu ? ' is-down' : ''}`} onClick={() => setStartMenu((s) => !s)}>
          <span className="w98-flag" aria-hidden="true" /> Пуск
        </button>
        <div className="w98-tasks">
          {open.map((w) => (
            <button key={w} className={`w98-task${top === w && !min.includes(w) ? ' is-down' : ''}`} onClick={() => (top === w && !min.includes(w) ? setMin((m) => [...m, w]) : focus(w))}>
              {TITLES[w]}
            </button>
          ))}
        </div>
        <div className="w98-tray">
          {net === 'on' ? (
            <button className="w98-trayico" title={`Подключено: 33,6 Кбит/с · ${mmss}`} onClick={() => focus('dialup')}>
              <Icon kind="net" /> <span className="mono">{mmss}</span>
            </button>
          ) : null}
          {net === 'on' ? (
            <button className={`w98-trayico${icqNew ? ' is-blink' : ''}`} title={icqNew ? `ICQ: новых сообщений — ${icqNew}` : 'ICQ: в сети'} onClick={() => focus('icq')}>
              <Icon kind="icq" />
              {icqNew ? <span className="mono">{icqNew}</span> : null}
            </button>
          ) : null}
          <span>{time}</span>
        </div>
      </div>
    </div>
  );
}

function engineName(id: string) {
  if (id === 'r-rambler') return 'Рамблер';
  if (id === 'r-mail') return 'Mail.ru';
  return 'Яндекс';
}

function searchUrl(id: string, q: string) {
  const t = encodeURIComponent(q);
  if (id === 'r-rambler') return `https://nova.rambler.ru/search?query=${t}`;
  if (id === 'r-mail') return `https://go.mail.ru/search?q=${t}`;
  return `https://yandex.ru/search/?text=${t}`;
}
