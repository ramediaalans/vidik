import { useEffect, useMemo, useState } from 'react';
import { SectionHeader } from '../components/core';
import { asset } from '../media/asset';
import { TVPlayer } from '../tv/TVPlayer';
import { tvChannels, tvData } from '../tv/data';
import {
  buildDay,
  guide,
  hhmm,
  localDateISO,
  nowPlaying,
  secondsOfDay,
  slotLabel
} from '../tv/schedule';

// Строку «сейчас» достаточно двигать раз в полминуты: секунды в программе не показываем.
const GUIDE_TICK_MS = 30000;

export function TVPage() {
  const [channelId, setChannelId] = useState(tvChannels[0]?.id ?? '');
  const [date, setDate] = useState(() => localDateISO());
  const [nowSec, setNowSec] = useState(() => secondsOfDay());

  useEffect(() => {
    const tick = () => {
      setNowSec(secondsOfDay());
      setDate(localDateISO());
    };
    const id = window.setInterval(tick, GUIDE_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Полная сетка каждого канала — с рекламой и заставками: именно по ней видно,
  // что реально идёт в эфире прямо сейчас.
  const dayByChannel = useMemo(
    () => new Map(tvChannels.map((c) => [c.id, buildDay(tvData, c.id, date)])),
    [date]
  );
  const rows = useMemo(() => guide(dayByChannel.get(channelId) ?? []), [dayByChannel, channelId]);
  const airing = nowPlaying(dayByChannel.get(channelId) ?? [], nowSec)?.slot ?? null;
  const onBreak = airing?.kind === 'interstitial';
  // Текущая строка — последняя начавшаяся: между передачами идёт реклама,
  // и в газетной программе её тоже никогда не печатали.
  const nowIndex = useMemo(() => {
    let found = -1;
    for (let i = 0; i < rows.length; i++) if (rows[i].start <= nowSec) found = i;
    return found;
  }, [rows, nowSec]);

  const next = rows[nowIndex + 1];

  return (
    <>
      <section className="hero vignette" style={{ minHeight: 'min(52vh, 460px)' }}>
        <div className="hero__media">
          <img src={asset('/images/tv/section-tv.webp')} alt="Небольшой телевизор на кухне" />
        </div>
        <div className="hero__inner container" style={{ paddingBottom: 48 }}>
          <div className="hero__kicker pixel">03 · Телевизор</div>
          <h1 className="display display--l" style={{ margin: '12px 0' }}>
            Сейчас {hhmm(nowSec)}
          </h1>
          <p className="lead">
            Здесь нельзя выбрать, что смотреть. Три канала идут сами по себе — как тогда.
            Опоздал к началу — застанешь с середины.
          </p>
        </div>
      </section>

      <section className="section container">
        <SectionHeader
          index="Эфир"
          title="Три канала"
          note="У всех зрителей одно и то же время и один и тот же эфир. Завтра программа будет другой."
        />

        <div className="tv__layout">
          <TVPlayer channelId={channelId} />

          <div>
            <div className="channels">
              {tvChannels.map((c) => {
                const onAir = nowPlaying(dayByChannel.get(c.id) ?? [], nowSec)?.slot;
                return (
                  <button
                    key={c.id}
                    className={`channel${c.id === channelId ? ' is-active' : ''}`}
                    onClick={() => setChannelId(c.id)}
                    aria-pressed={c.id === channelId}
                  >
                    <span className="channel__num">{c.num}</span>
                    <span>
                      <span className="channel__name">{c.name}</span>
                      <span className="channel__now">
                        {' · '}
                        {onAir ? slotLabel(onAir) : 'Профилактика'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {next ? (
              <p className="mono tv__next">
                Далее в {hhmm(next.start)} — {next.title}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section container">
        <SectionHeader
          index="Программа"
          title="Что идёт сегодня"
          note="Реклама и заставки между передачами в расписание не попадают."
        />
        <ol className="guide">
          {rows.map((row, i) => (
            <li
              key={`${row.start}-${row.id}`}
              className={`guide__row${i === nowIndex ? ' is-now' : ''}${i < nowIndex ? ' is-past' : ''}`}
            >
              <span className="guide__time pixel">{hhmm(row.start)}</span>
              <span className="guide__title">
                {row.label ? <span className="guide__tag mono">{row.label}</span> : null}
                {row.title}
              </span>
              {i === nowIndex ? (
                <span className={`guide__live mono${onBreak ? ' guide__live--break' : ''}`}>
                  {onBreak && airing ? slotLabel(airing) : 'в эфире'}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
