// «Сейчас в эфире» на главной. Берём ту же газетную программу, что и раздел «Телевизор»
// (кнопки каналов и газета), чтобы подписи везде совпадали. Без плеера.
// Отдельный ленивый модуль, чтобы программа не утяжеляла первый экран.
import { useEffect, useMemo, useState } from 'react';
import { tvChannels } from '../tv/data';
import { broadcastSecondsOfDay } from '../tv/schedule';
import { clockOf, programOnAir } from '../tv/onAir';

// Газетный день идёт с 06:00 до 06:00, эфир заканчивается в 03:00.
const DAY_START_MIN = 6 * 60;
const AIR_END_MIN = 3 * 60 + 1440;
const paper = (min: number) => (min < DAY_START_MIN ? min + 1440 : min);

export default function HomeOnAir() {
  const [nowSec, setNowSec] = useState(() => broadcastSecondsOfDay());

  useEffect(() => {
    const id = window.setInterval(() => setNowSec(broadcastSecondsOfDay()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo(() => tvChannels.map((c) => ({ c, air: programOnAir(c.id) })), [nowSec]);
  const nowMin = paper(nowSec / 60);

  return (
    <ul className="onair" aria-label="Сейчас в эфире">
      {rows.map(({ c, air }) => {
        const start = air.now ? paper(air.now[0]) : 0;
        const end = air.next && !air.pause ? paper(air.next[0]) : AIR_END_MIN;
        const pct = air.now ? Math.min(100, Math.max(0, ((nowMin - start) / Math.max(1, end - start)) * 100)) : 0;
        return (
          <li key={c.id} className="onair__row">
            <span className="onair__num">{c.num}</span>
            <span className="onair__body">
              <span className="onair__name">{c.name}</span>
              <span className="onair__now">{air.now ? air.now[1] : 'Настроечная таблица'}</span>
              <span className="onair__bar" aria-hidden="true">
                <i style={{ width: `${pct}%` }} />
              </span>
              {air.next ? (
                <span className="onair__next">
                  Далее в {clockOf(air.next[0])} — {air.next[1]}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
