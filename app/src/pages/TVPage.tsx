import { useEffect, useMemo, useState } from 'react';
import { SectionHeader } from '../components/core';
import { asset } from '../media/asset';
import { TVPlayer } from '../tv/TVPlayer';
import { tvChannels, tvData } from '../tv/data';
import {
  broadcastDateISO,
  broadcastSecondsOfDay,
  buildDay,
  guide,
  hhmm,
  nowPlaying,
  rotationForDate,
  slotLabel
} from '../tv/schedule';

const GUIDE_TICK_MS = 30_000;

export function TVPage() {
  const [channelId, setChannelId] = useState(tvChannels[0]?.id ?? '');
  const [date, setDate] = useState(() => broadcastDateISO());
  const [nowSec, setNowSec] = useState(() => broadcastSecondsOfDay());

  useEffect(() => {
    const tick = () => { setNowSec(broadcastSecondsOfDay()); setDate(broadcastDateISO()); };
    const id = window.setInterval(tick, GUIDE_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const dayByChannel = useMemo(() => new Map(tvChannels.map((c) => [c.id, buildDay(tvData, c.id, date)])), [date]);
  const rows = useMemo(() => guide(dayByChannel.get(channelId) ?? []), [dayByChannel, channelId]);
  const nowIndex = rows.findIndex((row) => nowSec >= row.start && nowSec < row.end);
  const next = rows.find((row) => row.start > nowSec);
  const rotation = rotationForDate(date);

  const stepChannel = (direction: -1 | 1) => {
    const index = tvChannels.findIndex((c) => c.id === channelId);
    setChannelId(tvChannels[(index + direction + tvChannels.length) % tvChannels.length].id);
  };

  return (
    <>
      <section className="hero vignette" style={{ minHeight: 'min(52vh, 460px)' }}>
        <div className="hero__media"><img src={asset('/images/tv/section-tv.webp')} alt="Небольшой телевизор на кухне" /></div>
        <div className="hero__inner container" style={{ paddingBottom: 48 }}>
          <div className="hero__kicker pixel">03 · Телевизор · день {rotation}</div>
          <h1 className="display display--l" style={{ margin: '12px 0' }}>Сейчас {hhmm(nowSec)} <small>UTC+3</small></h1>
          <p className="lead">Три канала идут сами по себе. Выбрать передачу и перемотать нельзя: включишь — попадёшь прямо в текущий эфир.</p>
        </div>
      </section>

      <section className="section container">
        <SectionHeader index="Эфир" title="Три кнопки" note={`Сегодня шаблон ${rotation}. После A, B и C цикл повторяется с теми же передачами и временем.`} />
        <div className="tv__layout">
          <TVPlayer channelId={channelId} onChannelStep={stepChannel} />
          <div>
            <div className="channels">
              {tvChannels.map((c) => {
                const onAir = nowPlaying(dayByChannel.get(c.id) ?? [], nowSec)?.slot;
                return <button key={c.id} className={`channel${c.id === channelId ? ' is-active' : ''}`} onClick={() => setChannelId(c.id)} aria-pressed={c.id === channelId}>
                  <span className="channel__num">{c.num}</span>
                  <span><span className="channel__name">{c.name}</span><span className="channel__now"> · {onAir ? slotLabel(onAir) : 'Профилактика'}</span></span>
                </button>;
              })}
            </div>
            {next ? <p className="mono tv__next">Далее в {hhmm(next.start)} — {next.label ?? next.title}</p> : null}
            <p className="tv__sourceNote mono">YouTube — архив · Vibix — кино и Disney · Kodik — аниме · локально — шум и тестовая таблица. У внешних плееров перемотка к текущей минуте зависит от их возможностей.</p>
          </div>
        </div>
      </section>

      <section className="section container">
        <SectionHeader index={`Программа · ${rotation}`} title="Что идёт сегодня" note="Время каноническое: Минск / Москва (UTC+3). Реклама скрыта из газетной программы." />
        <ol className="guide">
          {rows.map((row, i) => <li key={`${row.start}-${row.provider}-${row.mediaId}`} className={`guide__row${i === nowIndex ? ' is-now' : ''}${row.end <= nowSec ? ' is-past' : ''}`}>
            <span className="guide__time pixel">{hhmm(row.start)}</span>
            <span className="guide__title"><span className="guide__tag mono">{row.daypart}</span>{row.title}</span>
            <span className="guide__meta mono">{row.provider} · {Math.ceil((row.end - row.start) / 60)} мин</span>
            {i === nowIndex ? <span className="guide__live mono">в эфире</span> : null}
          </li>)}
        </ol>
      </section>
    </>
  );
}
