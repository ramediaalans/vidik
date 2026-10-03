// «Сейчас в эфире» на главной: настоящая сетка трёх кнопок по UTC+3, без плеера.
// Отдельный ленивый модуль, чтобы grid.json/pool.json не утяжеляли первый экран.
import { useEffect, useMemo, useState } from 'react';
import { tvChannels, tvData } from '../tv/data';
import { broadcastDateISO, broadcastSecondsOfDay, buildDay, guide, hhmm, nowPlaying, slotLabel } from '../tv/schedule';

export default function HomeOnAir() {
  const [date, setDate] = useState(() => broadcastDateISO());
  const [now, setNow] = useState(() => broadcastSecondsOfDay());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNow(broadcastSecondsOfDay());
      setDate(broadcastDateISO());
    }, 20_000);
    return () => window.clearInterval(id);
  }, []);

  const days = useMemo(() => tvChannels.map((c) => ({ c, day: buildDay(tvData, c.id, date) })), [date]);

  return (
    <ul className="onair" aria-label="Сейчас в эфире">
      {days.map(({ c, day }) => {
        const cur = nowPlaying(day, now);
        const progs = guide(day);
        // В блоке рекламы/заставки показываем передачу, внутри которой она идёт.
        const prog = cur ? [...progs].reverse().find((s) => s.start <= now) ?? cur.slot : null;
        const next = progs.find((s) => s.start > now);
        const pct = prog ? Math.min(100, Math.max(0, ((now - prog.start) / Math.max(1, prog.end - prog.start)) * 100)) : 0;
        return (
          <li key={c.id} className="onair__row">
            <span className="onair__num">{c.num}</span>
            <span className="onair__body">
              <span className="onair__name">{c.name}</span>
              <span className="onair__now">{prog ? slotLabel(prog) : 'Профилактика'}</span>
              <span className="onair__bar" aria-hidden="true">
                <i style={{ width: `${pct}%` }} />
              </span>
              {next ? (
                <span className="onair__next">
                  {hhmm(next.start)} — {next.label ?? next.title}
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
