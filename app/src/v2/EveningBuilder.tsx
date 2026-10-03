// «Собери свой вечер»: два вопроса — и случайное расписание из настоящей коллекции сайта.
// Фильмы — из видеосалона, мультики — из Дисней-клуба, игры — с полки картриджей,
// музыка — из кассетника. Каждый пункт ведёт на рабочую карточку или включает трек.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { asset } from '../media/asset';
import { usePlayer } from '../media/playerContext';
import { salon, disney } from '../data/films';
import { roms } from '../data/roms';
import { romArt } from '../data/rom-art';
import { romCart } from '../data/rom-carts';
import { tracks } from '../data/tracks';
import './evening.css';

type Day = 'week' | 'fri' | 'sun';
export type Era = 'early' | 'mid' | 'late';
type Who = 'solo' | 'friend' | 'yard';
type Slot = 'game' | 'cartoon' | 'movie' | 'music';

const DAYS: { id: Day; label: string }[] = [
  { id: 'week', label: 'Будний, после школы' },
  { id: 'fri', label: 'Пятница' },
  { id: 'sun', label: 'Воскресенье' }
];
export const ERAS: { id: Era; label: string; range: [number, number] }[] = [
  { id: 'early', label: 'Начало 90-х', range: [1980, 1994] },
  { id: 'mid', label: 'Конец 90-х', range: [1995, 1999] },
  { id: 'late', label: 'Нулевые', range: [2000, 2006] }
];
const WHO: { id: Who; label: string }[] = [
  { id: 'solo', label: 'Один дома' },
  { id: 'friend', label: 'С другом' },
  { id: 'yard', label: 'Всем двором' }
];

const PLAN: Record<Day, { time: string; slot: Slot }[]> = {
  week: [
    { time: '15:30', slot: 'game' },
    { time: '17:00', slot: 'cartoon' },
    { time: '19:30', slot: 'music' },
    { time: '21:30', slot: 'movie' }
  ],
  fri: [
    { time: '16:00', slot: 'game' },
    { time: '18:30', slot: 'cartoon' },
    { time: '20:00', slot: 'movie' },
    { time: '23:00', slot: 'music' }
  ],
  sun: [
    { time: '08:30', slot: 'cartoon' },
    { time: '12:00', slot: 'game' },
    { time: '17:00', slot: 'music' },
    { time: '21:00', slot: 'movie' }
  ]
};

const PLATFORM: Record<string, string> = {
  'Dendy / NES': 'Денди',
  'Sega Mega Drive': 'Сега',
  'Super Nintendo': 'Супер Нинтендо'
};

const NOTES: Record<Slot, Record<Who, string[]>> = {
  game: {
    solo: ['Пароль от уровня записан карандашом на обоях за диваном.', 'Успеть пройти до прихода родителей — сохранений нет.'],
    friend: ['Второй джойстик заедает. Кто проиграл — тот с ним и играет.', 'Картридж не идёт — подуть и вставить ещё раз.'],
    yard: ['Очередь на приставку: по одной жизни на человека.', 'Картридж взяли у Димона из третьего подъезда — до понедельника.']
  },
  cartoon: {
    solo: ['Звук потише — соседка снизу опять стучала по батарее.', 'Бутерброд с маслом и сахаром, кружка чая, ковёр.'],
    friend: ['Спорите до хрипоты, кто главный в серии.', 'Мама друга зовёт домой. Ещё одну серию — и всё.'],
    yard: ['Все на ковре. Кто опоздал — садится на подлокотник.', 'Чужие кроссовки в прихожей горой.']
  },
  movie: {
    solo: ['Сдать в прокат до завтра, иначе штраф.', 'Перевод одноголосый, гнусавый. Другого и не надо.'],
    friend: ['На страшном месте делаете вид, что не страшно.', 'Начало зажёвано — смотрите с середины, сюжет додумаете.'],
    yard: ['Смотрим у того, у кого видак. Табуретки несём с собой.', 'Плёнку крутят третий раз, но все смотрят, как в первый.']
  },
  music: {
    solo: ['Кассету перематывать карандашом — батарейки беречь.', 'Записывал с радио, в конце куска — голос диджея.'],
    friend: ['Переписываете друг у друга на двухкассетнике.', 'Вкладыш подписан от руки, половина названий с ошибками.'],
    yard: ['Магнитофон на подоконнике — слышно на весь двор.', 'Танцы у подъезда, пока не выглянет бабушка с третьего.']
  }
};

// У большинства треков в коллекции нет года — эпоху определяем по исполнителю.
const EARLY = /modern talking|c\.? ?c\.? ?catch|bad boys blue|blue sys|sandra|^joy$|fancy|savage|boney|kaoma|laid back|sabrina|baccara|ottawan|dschinghis|secret service|shocking blue|a-ha|alphavil|esireless|eurythmics|branigan|samanta|silent circle|mike mareen|london beat|pet shop|opus|esposito|radiorama|huntington|lian ross|lion ross|linda jo|patty ryan|roger meno|jason donovan|ken lazio|ce mc|tiggy|bam bee|key west|pam'n'pat|mr\.zivago|savage|laura|snap|technotronic|технология|кино|агата/i;
const LATE = /каста|многоточие|krec|городская тоска|bokser|mr maloy|маршал|демо|стрелки/i;
export function trackEra(t: { artist: string; year?: number }): Era {
  if (t.year) return t.year < 1995 ? 'early' : t.year < 2000 ? 'mid' : 'late';
  if (LATE.test(t.artist)) return 'late';
  if (EARLY.test(t.artist)) return 'early';
  return 'mid';
}

export const realTracks = tracks
  .map((t, index) => ({ ...t, index }))
  .filter((t) => !/неизвестн/i.test(t.artist));

type Pick = {
  key: string;
  year?: number;
  title: string;
  sub: string;
  label: string;
  image?: string;
  to?: string;
  trackIndex?: number;
};

const withYear = <T extends { year: number }>(list: T[]) => list;

const MOVIES: Pick[] = withYear(salon).map((f) => ({
  key: 'm:' + f.slug,
  year: f.year,
  title: f.title,
  sub: [f.year, f.genres.slice(0, 2).join(', ')].filter(Boolean).join(' · '),
  label: f.kind === 'serial' ? 'Сериал на кассете' : 'Кассета из проката',
  image: f.poster ?? undefined,
  to: `/videosalon/${f.slug}`
}));

const CARTOONS: Pick[] = disney.map((f) => ({
  key: 'c:' + f.slug,
  year: f.year,
  title: f.title.replace(/\s*[—–-]\s*(все серии|коллекция серий|\d.*сезон.*)$/i, ''),
  sub: f.kind === 'serial' ? 'Мультсериал' : 'Мультфильм',
  label: 'Мультики',
  image: f.poster ?? undefined,
  to: `/disney-klub/${f.slug}`
}));

const GAMES: Pick[] = roms
  .filter((r) => romArt[r.id] || romCart[r.id])
  .map((r) => ({
    key: 'g:' + r.id,
    year: r.year,
    title: r.title,
    sub: `${r.nick} · ${r.genre}${r.players === 2 ? ' · на двоих' : ''}`,
    label: `Приставка · ${PLATFORM[r.platform] ?? r.platform}`,
    image: romArt[r.id] ?? romCart[r.id],
    to: `/igry/${r.id}`
  }));

const SOURCE: Record<Exclude<Slot, 'music'>, Pick[]> = { movie: MOVIES, cartoon: CARTOONS, game: GAMES };

// Детерминированный «случайный» выбор по seed.
export function rnd(seed: number, salt: number) {
  const x = Math.sin(seed * 9301 + salt * 49297) * 233280;
  return x - Math.floor(x);
}

// Случайная подборка из всей коллекции — без привязки к годам.
function pickFrom<T>(list: T[], seed: number, salt: number) {
  return list[Math.floor(rnd(seed, salt) * list.length)];
}

const newSeed = () => Math.floor(Math.random() * 1e6) + 1;

export function EveningBuilder() {
  const { play } = usePlayer();
  const [day, setDay] = useState<Day>('fri');
  const [who, setWho] = useState<Who>('solo');
  const [seed, setSeed] = useState(newSeed);

  const evening = useMemo(() => {
    const base = seed * 7 + day.length * 3;
    return PLAN[day].map(({ time, slot }, i) => {
      let item: Pick | undefined;
      if (slot === 'music') {
        const t = pickFrom(realTracks, base, i + 31);
        if (t) item = { key: 't:' + t.id, title: t.title, sub: t.artist, label: 'Магнитофон', trackIndex: t.index };
      } else {
        item = pickFrom(SOURCE[slot], base, i + 1);
      }
      const notes = NOTES[slot][who];
      const note = notes[Math.floor(rnd(base, i + 11) * notes.length)];
      return { time, slot, item, note };
    });
  }, [day, who, seed]);

  const chips = <T extends string>(list: { id: T; label: string }[], value: T, set: (v: T) => void, name: string) => (
    <div className="eve__q" role="radiogroup" aria-label={name}>
      <span className="eve__qlabel mono">{name}</span>
      {list.map((o) => (
        <button
          key={o.id}
          role="radio"
          aria-checked={value === o.id}
          className={`chip${value === o.id ? ' chip--active' : ''}`}
          onClick={() => set(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  const body = (item: Pick, note: string) => (
    <>
      {item.image?.includes('/carts/') ? (
        // Картриджи горизонтальные — ставим их на ребро, чтобы не резать.
        <span className="eve__cart">
          <img src={asset(item.image)} alt={`Картридж: ${item.title}`} loading="lazy" decoding="async" />
        </span>
      ) : item.image ? (
        <img src={asset(item.image)} alt={`Обложка: ${item.title}`} loading="lazy" decoding="async" />
      ) : (
        <span className="eve__tape" aria-hidden="true">
          <img src={asset('/ui/cassette.webp')} alt="" loading="lazy" decoding="async" />
        </span>
      )}
      <span className="eve__txt">
        <span className="eve__title">
          {item.title} {item.year ? <i>{item.year}</i> : null}
        </span>
        <span className="eve__sub mono">{item.trackIndex !== undefined ? `▶ ${item.sub}` : item.sub}</span>
        <span className="eve__note">{note}</span>
      </span>
    </>
  );

  return (
    <div className="eve">
      <div className="eve__ask">
        {chips(DAYS, day, setDay, 'Какой день')}
        {chips(WHO, who, setWho, 'С кем')}
        <button className="btn btn--primary eve__again" onClick={() => setSeed(newSeed())}>
          Другой вечер
        </button>
      </div>

      <ol className="eve__plan" aria-live="polite">
        {evening.map(({ time, slot, item, note }) => (
          <li key={time + slot} className="eve__row">
            <span className="eve__time">{time}</span>
            <span className="eve__slot mono">{item?.label ?? slot}</span>
            {item?.to ? (
              <Link className="eve__item" to={item.to}>
                {body(item, note)}
              </Link>
            ) : item ? (
              <button className="eve__item" onClick={() => play(item.trackIndex)}>
                {body(item, note)}
              </button>
            ) : (
              <span className="eve__note">{note}</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
