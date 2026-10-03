import { useEffect, useMemo, useState } from 'react';
import { SectionHeader } from '../components/core';
import { PageHero } from '../v2/PageHero';
import { TVPlayer } from '../tv/TVPlayer';
import { TvNewspaper } from '../tv/TvNewspaper';
import { tvChannels } from '../tv/data';
import { broadcastSecondsOfDay } from '../tv/schedule';
import { clockOf, programOnAir } from '../tv/onAir';

const GUIDE_TICK_MS = 30_000;

export function TVPage() {
  const [channelId, setChannelId] = useState(tvChannels[0]?.id ?? '');
  const [nowSec, setNowSec] = useState(() => broadcastSecondsOfDay());

  useEffect(() => {
    const tick = () => setNowSec(broadcastSecondsOfDay());
    const id = window.setInterval(tick, GUIDE_TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  // Подписи берём из той же газетной программы, что ниже на странице (nowSec — тик для пересчёта).
  const onAir = useMemo(() => new Map(tvChannels.map((c) => [c.id, programOnAir(c.id)])), [nowSec]);
  const next = onAir.get(channelId)?.next ?? null;

  const stepChannel = (direction: -1 | 1) => {
    const index = tvChannels.findIndex((c) => c.id === channelId);
    setChannelId(tvChannels[(index + direction + tvChannels.length) % tvChannels.length].id);
  };

  return (
    <>
      <PageHero
        index="19:30"
        time="19:30"
        kicker="Телевизор · вечерний эфир"
        title={<>Что сейчас <em>по ящику</em></>}
        lead="Три кнопки и никакой перемотки. Включил — и попал на середину фильма. Как тогда."
        image="/images/v2/ch-tv.webp"
        alt="Кухня вечером: телевизор с антенной, чайник и хлеб на клеёнке"
        facts={[
          { v: tvChannels.length, l: 'кнопки на ящике' },
          { v: '0', l: 'перемоток' }
        ]}
      />

      <section className="section container">
        <SectionHeader index="Эфир" title="Три кнопки" note="Не нравится — щёлкай. Больше ничего не идёт, проверено." />
        <div className="tv__layout">
          <TVPlayer channelId={channelId} onChannelStep={stepChannel} />
          <div className="tv__guide">
            <div className="channels">
              {tvChannels.map((c) => {
                const air = onAir.get(c.id);
                return <button key={c.id} className={`channel${c.id === channelId ? ' is-active' : ''}`} onClick={() => setChannelId(c.id)} aria-pressed={c.id === channelId}>
                  <span className="channel__num">{c.num}</span>
                  <span className="channel__text"><span className="channel__name">{c.name}</span><span className="channel__now">{air?.now ? air.now[1] : 'Настроечная таблица'}</span></span>
                </button>;
              })}
            </div>
            {next ? <p className="mono tv__next">Далее в {clockOf(next[0])} — {next[1]}</p> : null}
          </div>
        </div>
      </section>

      <section className="section container">
        <SectionHeader index="Программа" title="Что идёт по телевизору" note="Обведи ручкой, что смотреть вечером." />
        <TvNewspaper />
      </section>
    </>
  );
}
