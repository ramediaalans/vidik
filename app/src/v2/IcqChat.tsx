// ICQ 99b с ботами. Никакого сервера: контакты отвечают по ключевым словам,
// а советуют только то, что реально лежит в коллекции сайта (фильмы, картриджи, песни).
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { salon } from '../data/films';
import { roms } from '../data/roms';
import { tracks } from '../data/tracks';
import { usePlayer } from '../media/playerContext';

type Status = 'online' | 'away' | 'offline';
type BotId = 'lyoha' | 'katya' | 'kadr' | 'palych';
type Msg = {
  id: number;
  me: boolean;
  text: string;
  time: string;
  link?: { to: string; label: string };
  play?: { index: number; label: string };
};
type Reply = Omit<Msg, 'id' | 'me' | 'time'>;

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];
const now = () => {
  const d = new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const PLATFORM: Record<string, string> = { 'Dendy / NES': 'на Денди', 'Sega Mega Drive': 'на Сеге', 'Super Nintendo': 'на SNES' };

const game = (): Reply => {
  const r = pick(roms);
  return {
    text: pick([
      `заходи вечером, рубанём в ${r.title} ${PLATFORM[r.platform] ?? ''}. второй джойстик есть`,
      `вчера до ночи в ${r.title} сидел, мать телек отобрала на самом интересном`,
      `у Серого выменял ${r.title}. на наклейке написано одно, а внутри вроде то же самое)))`
    ]),
    link: { to: `/igry/${r.id}`, label: `вставить картридж: ${r.title}` }
  };
};

const song = (): Reply => {
  const i = Math.floor(Math.random() * tracks.length);
  const t = tracks[i];
  return {
    text: pick([
      `поставь вот это: ${t.artist} — ${t.title}. я на кассету с радио записала, только начало обрезалось`,
      `у меня сейчас ${t.artist} играет. ${t.title}. уже раз пятый перематываю`,
      `${t.artist} — ${t.title}. если не слышал, то ты вообще где живёшь`
    ]),
    play: { index: i, label: `▶ ${t.artist} — ${t.title}` }
  };
};

const film = (genre?: string): Reply => {
  const pool = genre ? salon.filter((f) => f.genres.some((g) => g.toLowerCase().includes(genre))) : salon;
  const f = pick(pool.length ? pool : salon);
  return {
    text: `На полке есть «${f.title}» (${f.year}). Возврат до 12:00 завтра, перемотка за ваш счёт.`,
    link: { to: `/videosalon/${f.slug}`, label: `взять кассету: ${f.title}` }
  };
};

type Bot = {
  id: BotId;
  nick: string;
  uin: string;
  status: Status;
  hello?: { delay: number; reply: () => Reply };
  answer: (q: string) => Reply;
};

const has = (q: string, re: RegExp) => re.test(q);

const BOTS: Bot[] = [
  {
    id: 'lyoha',
    nick: 'Лёха с 5-го',
    uin: '34512807',
    status: 'online',
    hello: { delay: 2500, reply: () => ({ text: 'здорово! ты где пропадал? я купил картридж 9999 в 1, половина игр повторяется))' }) },
    answer: (q) => {
      if (has(q, /прив|здоров|хай|салют/)) return { text: pick(['здоров', 'о, ты в сети! сто лет не видел', 'привет-привет']) };
      if (has(q, /код|чит|жизн|пароль/))
        return { text: 'в Контре на заставке: вверх, вверх, вниз, вниз, влево, вправо, влево, вправо, B, A, старт. будет 30 жизней. проверено' };
      if (has(q, /игр|картридж|денди|сег|приставк|во что|поиграть|рубан/)) return game();
      if (has(q, /двор|гулять|выход/)) return { text: 'щас поем и выхожу. мяч мой, у твоего ниппель травит' };
      if (has(q, /пок|пака|бб|давай/)) return { text: 'давай, до завтра' };
      return pick([
        { text: 'ага' },
        { text: 'погоди, мать зовёт' },
        { text: 'слушай, а у тебя джойстик с турбо есть? мой залипает' },
        { text: ')))' },
        game()
      ]);
    }
  },
  {
    id: 'katya',
    nick: 'Катюха',
    uin: '51207448',
    status: 'online',
    hello: { delay: 9000, reply: () => ({ text: 'приветик) ты сегодня в аське до скольки? у нас телефон до девяти, потом папе звонить будут' }) },
    answer: (q) => {
      if (has(q, /прив|хай|здрав/)) return { text: pick(['привет)))', 'приветик', 'о, привет! ты где был?']) };
      if (has(q, /музык|песн|кассет|слуша|послуш|магнитоф|плеер|постав/)) return song();
      if (has(q, /любл|нравишь|красив|симпат/)) return { text: 'ой всё :-[  подружка рядом сидит и читает' };
      if (has(q, /дискотек|суббот|танц/)) return { text: 'в субботу в школе дискотека. пойдёшь? только медляк не обещаю)' };
      if (has(q, /пок|пака|бб|спокойн/)) return { text: 'пока-пока) не пропадай' };
      return pick([
        { text: 'хихи' },
        { text: 'подожди, брат комп забирает, ему реферат печатать' },
        { text: 'пиши ещё)' },
        { text: 'а ты анкету мою заполнил? там 40 вопросов, не ленись' },
        song()
      ]);
    }
  },
  {
    id: 'kadr',
    nick: 'Видеопрокат «Кадр»',
    uin: '70011990',
    status: 'online',
    hello: { delay: 16000, reply: () => ({ text: 'Новые кассеты по пятницам. Напишите жанр — «боевик», «комедия», «ужасы» — или просто «фильм», подберём.' }) },
    answer: (q) => {
      if (has(q, /боев/)) return film('боевик');
      if (has(q, /комед|смешн|ржа/)) return film('комедия');
      if (has(q, /ужас|страшн/)) return film('ужасы');
      if (has(q, /фант/)) return film('фантастика');
      if (has(q, /мульт|дет/)) return film('мульт');
      if (has(q, /прив|здрав|добр/)) return { text: 'Здравствуйте! Что ищем сегодня?' };
      return film();
    }
  },
  {
    id: 'palych',
    nick: 'Палыч (сисадмин)',
    uin: '1188205',
    status: 'away',
    answer: () => ({ text: 'Автоответ: Я ушёл на обед. Если отвалился модем — выдерни шнур из телефонной розетки и воткни обратно. Не помогло — повтори.' })
  }
];

const OFFLINE = [
  { nick: 'Серый', uin: '62044190' },
  { nick: 'Танька из 9 «Б»', uin: '48810342' }
];

// Фирменное «о-оу» ICQ: два коротких тона, синтез, без файлов.
function uhOh(ctx: AudioContext) {
  const g = ctx.createGain();
  g.connect(ctx.destination);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  [[620, 0], [440, 0.16]].forEach(([f, d]) => {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t + d);
    o.frequency.exponentialRampToValueAtTime(f * 0.92, t + d + 0.14);
    o.connect(g);
    g.gain.setValueAtTime(0.09, t + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.15);
    o.start(t + d);
    o.stop(t + d + 0.16);
  });
}

const Flower = ({ status }: { status: Status }) => {
  const petal = status === 'online' ? '#3cb043' : status === 'away' ? '#3cb043' : '#d12a2a';
  return (
    <svg viewBox="0 0 32 32" className="icq-flower" aria-hidden="true">
      {[0, 51, 103, 154, 206, 257, 309].map((a, i) => (
        <ellipse key={a} cx="16" cy="7.5" rx="3.6" ry="6" fill={status === 'online' && i === 0 ? '#e02020' : petal} transform={`rotate(${a} 16 16)`} />
      ))}
      <circle cx="16" cy="16" r="3.5" fill="#ffd400" />
      {status === 'away' ? <circle cx="25" cy="25" r="6" fill="#ffd400" stroke="#806000" /> : null}
    </svg>
  );
};

export function IcqChat({ online, onConnect, onUnread }: { online: boolean; onConnect: () => void; onUnread?: (n: number) => void }) {
  const { play } = usePlayer();
  const [chats, setChats] = useState<Record<BotId, Msg[]>>({ lyoha: [], katya: [], kadr: [], palych: [] });
  const [unread, setUnread] = useState<Record<BotId, number>>({ lyoha: 0, katya: 0, kadr: 0, palych: 0 });
  const [active, setActive] = useState<BotId | null>(null);
  const [typing, setTyping] = useState<BotId | null>(null);
  const [draft, setDraft] = useState('');
  const [sound, setSound] = useState(true);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);
  const audio = useRef<AudioContext | null>(null);
  const activeRef = useRef(active);
  const soundRef = useRef(sound);
  const awayTold = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  activeRef.current = active;
  soundRef.current = sound;

  const total = Object.values(unread).reduce((a, b) => a + b, 0);
  useEffect(() => onUnread?.(total), [total, onUnread]);

  const ding = () => {
    if (!soundRef.current) return;
    try {
      audio.current ??= new AudioContext();
      if (audio.current.state === 'running') uhOh(audio.current);
      else audio.current.resume().then(() => audio.current && uhOh(audio.current)).catch(() => {});
    } catch {
      /* без звука */
    }
  };

  const push = (bot: BotId, m: Omit<Msg, 'id' | 'time'>) => {
    setChats((c) => ({ ...c, [bot]: [...c[bot], { ...m, id: ++seq.current, time: now() }] }));
    if (!m.me) {
      ding();
      if (activeRef.current !== bot) setUnread((u) => ({ ...u, [bot]: u[bot] + 1 }));
    }
  };

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // Подключились — контакты «выходят в сеть» и пишут первыми.
  useEffect(() => {
    if (!online) return;
    BOTS.forEach((b) => b.hello && later(() => push(b.id, { me: false, ...b.hello!.reply() }), b.hello.delay));
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      setTyping(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  useEffect(() => () => void audio.current?.close().catch(() => {}), []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [chats, active, typing]);

  const open = (id: BotId) => {
    setActive(id);
    setUnread((u) => ({ ...u, [id]: 0 }));
  };

  const send = () => {
    const text = draft.trim();
    if (!text || !active) return;
    const bot = BOTS.find((b) => b.id === active)!;
    setDraft('');
    push(bot.id, { me: true, text });
    if (bot.status === 'away') {
      if (!awayTold.current || Math.random() < 0.5) later(() => push(bot.id, { me: false, ...bot.answer(text) }), 600);
      awayTold.current = true;
      return;
    }
    const reply = bot.answer(text.toLowerCase());
    const wait = 900 + Math.min(reply.text.length * 35, 3200);
    later(() => setTyping(bot.id), 500);
    later(() => {
      setTyping((t) => (t === bot.id ? null : t));
      push(bot.id, { me: false, ...reply });
    }, wait);
  };

  if (!online) {
    return (
      <div className="icq icq--off">
        <Flower status="offline" />
        <p><b>Не в сети</b></p>
        <p className="w98-small">ICQ не может соединиться с сервером. Сначала дозвонитесь до провайдера.</p>
        <button className="w98-btn w98-btn--def" onClick={onConnect}>Подключиться</button>
      </div>
    );
  }

  const bot = BOTS.find((b) => b.id === active);

  return (
    <div className={`icq${bot ? ' has-chat' : ''}`}>
      <div className="icq-list" role="list">
        <div className="icq-group">Друзья · в сети</div>
        {BOTS.map((b) => (
          <button key={b.id} role="listitem" className={`icq-contact${b.id === active ? ' is-on' : ''}${unread[b.id] ? ' is-new' : ''}`} onClick={() => open(b.id)}>
            <Flower status={b.status} />
            <span className="icq-nick">{b.nick}</span>
            {unread[b.id] ? <span className="icq-badge" aria-label={`новых: ${unread[b.id]}`}>{unread[b.id]}</span> : null}
          </button>
        ))}
        <div className="icq-group">Не в сети</div>
        {OFFLINE.map((o) => (
          <div key={o.uin} className="icq-contact is-off" title={`UIN ${o.uin}`}>
            <Flower status="offline" />
            <span className="icq-nick">{o.nick}</span>
          </div>
        ))}
        <div className="icq-me">
          <span>Мой UIN: 52981144</span>
          <label className="w98-check"><input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> «О-оу»</label>
        </div>
      </div>

      {bot ? (
        <div className="icq-chat">
          <div className="icq-head">
            <button className="w98-btn w98-btn--sm icq-back" onClick={() => setActive(null)} aria-label="К списку контактов">‹</button>
            <Flower status={bot.status} />
            <span><b>{bot.nick}</b> <i>UIN {bot.uin}</i></span>
          </div>
          <div className="icq-log" ref={logRef} aria-live="polite">
            {chats[bot.id].length === 0 ? <p className="icq-empty">Сообщений пока нет. Напишите первым.</p> : null}
            {chats[bot.id].map((m) => (
              <div key={m.id} className={`icq-msg${m.me ? ' is-me' : ''}`}>
                <div className="icq-who">{m.me ? 'Я' : bot.nick} <span>({m.time})</span></div>
                <div className="icq-text">{m.text}</div>
                {m.link ? <Link className="icq-link" to={m.link.to}>{m.link.label}</Link> : null}
                {m.play ? <button className="icq-link" onClick={() => play(m.play!.index)}>{m.play.label}</button> : null}
              </div>
            ))}
            {typing === bot.id ? <div className="icq-typing">{bot.nick} печатает…</div> : null}
          </div>
          <form className="icq-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <textarea
              className="w98-field"
              rows={2}
              value={draft}
              maxLength={300}
              placeholder="Сообщение…"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || !e.shiftKey)) { e.preventDefault(); send(); }
              }}
            />
            <button className="w98-btn w98-btn--def" type="submit" disabled={!draft.trim()}>Отправить</button>
          </form>
        </div>
      ) : (
        <div className="icq-chat icq-chat--idle">
          <p className="w98-small">Выберите, кому написать. Цветок с жёлтым кружком значит «Отошёл».</p>
        </div>
      )}
    </div>
  );
}
