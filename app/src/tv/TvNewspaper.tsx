import { useEffect, useMemo, useState } from 'react';
import { tvChannels } from './data';
import { TV_PROGRAM } from './program';
import { broadcastDateISO, broadcastSecondsOfDay, dayNumber, rotationForDate } from './schedule';
import './newspaper.css';

// Газетная программа: день начинается в 06:00 по Москве, ночные передачи стоят в конце дня.
const PAPER_DAY_START_MIN = 6 * 60;
const NIGHT_END_MIN = 3 * 60; // после 03:00 — настроечная таблица, в газете её нет
const TICK_MS = 30_000;
const DAYS_SHOWN = 3;

const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const WEEKDAYS_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

type PaperDay = { iso: string; weekday: number; day: number; month: number; year: number };

function paperDay(iso: string, offset: number): PaperDay {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + offset));
  const out = d.toISOString().slice(0, 10);
  return { iso: out, weekday: d.getUTCDay(), day: d.getUTCDate(), month: d.getUTCMonth(), year: d.getUTCFullYear() };
}

// Минуты газетного дня: ночь после 00:00 считается продолжением суток.
const paperMinutes = (min: number) => (min < PAPER_DAY_START_MIN ? min + 1440 : min);
// «90-х», «80-х»: запрещаем перенос после дефиса (U+2060 — невидимая неразрывная склейка).
const typeset = (title: string) => title.replace(/(\d)-/g, '$1-\u2060');
const clock = (min: number) => `${Math.floor(min / 60)}-${String(min % 60).padStart(2, '0')}`;

function usePaperNow() {
  const read = () => {
    const sec = broadcastSecondsOfDay();
    return { base: broadcastDateISO(new Date(Date.now() - PAPER_DAY_START_MIN * 60_000)), min: Math.floor(sec / 60) };
  };
  const [now, setNow] = useState(read);
  useEffect(() => {
    const id = window.setInterval(() => setNow(read()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

export function TvNewspaper() {
  const now = usePaperNow();
  const days = useMemo(() => Array.from({ length: DAYS_SHOWN }, (_, i) => paperDay(now.base, i)), [now.base]);
  const [selected, setSelected] = useState(0);
  const day = days[selected];
  const rotation = rotationForDate(day.iso);
  const issue = dayNumber(day.iso) - dayNumber(`${day.year}-01-01`) + 1;

  // Текущая передача подсвечивается только в «сегодняшнем» газетном дне и не во время техпаузы.
  const nowPaper = paperMinutes(now.min);
  const live = selected === 0 && !(now.min >= NIGHT_END_MIN && now.min < PAPER_DAY_START_MIN);

  return (
    <article className="paper" aria-label="Программа телевидения">
      <header className="paper__masthead">
        <h2 className="paper__title">Программа телевидения</h2>
        <p className="paper__issue">№ {issue} <span aria-hidden="true">●</span> {day.day} {MONTHS[day.month]} {day.year} года</p>
      </header>
      <div className="paper__rule" aria-hidden="true" />

      <div className="paper__days" role="tablist" aria-label="День программы">
        {days.map((d, i) => (
          <button key={d.iso} type="button" role="tab" aria-selected={i === selected} className={`paper__day${i === selected ? ' is-active' : ''}`} onClick={() => setSelected(i)}>
            {WEEKDAYS_SHORT[d.weekday]}, {d.day} {MONTHS[d.month]}{i === 0 ? <span className="paper__today"> · сегодня</span> : null}
          </button>
        ))}
      </div>

      <h3 className="paper__dayHead">
        <span>{WEEKDAYS[day.weekday]}, {day.day} {MONTHS[day.month]}</span>
        <span className="paper__dots" aria-hidden="true" />
      </h3>

      <div className="paper__cols">
        {tvChannels.map((channel) => {
          const items = TV_PROGRAM[rotation][channel.id] ?? [];
          let nowIdx = -1;
          if (live) items.forEach(([min], i) => { if (paperMinutes(min) <= nowPaper) nowIdx = i; });
          return (
            <section key={channel.id} className="paper__col" aria-label={channel.name}>
              <h4 className="paper__channel">{channel.name}</h4>
              <ol className="paper__list">
                {items.map(([min, title], i) => (
                  <li key={`${min}-${title}`} className={`paper__row${i === nowIdx ? ' is-now' : ''}`} aria-current={i === nowIdx ? 'true' : undefined}>
                    <time className="paper__time">{clock(min)}</time>
                    <span className="paper__dash" aria-hidden="true">–</span>
                    <span className="paper__name">{typeset(title)}.</span>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
      <p className="paper__foot">Время московское. В программе возможны изменения.</p>
    </article>
  );
}
