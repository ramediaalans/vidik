import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VibixPlayer } from '../components/VibixPlayer';
import { asset } from '../media/asset';
import { claimAudio } from '../media/playerContext';
import { tvData } from './data';
import {
  broadcastDateISO,
  broadcastSecondsOfDay,
  buildDay,
  hhmm,
  nowPlaying,
  slotLabel,
  type Slot
} from './schedule';

type YTPlayer = {
  playVideo(): void; mute(): void; unMute(): void; setVolume(v: number): void;
  getCurrentTime(): number; seekTo(seconds: number, allowSeekAhead: boolean): void;
  unloadModule(name: string): void; destroy(): void;
};
type YTNamespace = { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer };
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };
let apiPromise: Promise<YTNamespace> | null = null;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const w = window as YTWindow;
    if (w.YT?.Player) return resolve(w.YT);
    const previous = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (w.YT?.Player) resolve(w.YT); else reject(new Error('YouTube API недоступен'));
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('Не удалось загрузить YouTube'));
    document.head.appendChild(script);
  });
  return apiPromise;
}

function killCaptions(player: YTPlayer) {
  for (const module of ['captions', 'cc']) try { player.unloadModule(module); } catch { /* optional module */ }
}

function YouTubeAir({ slot, offset, muted, onReady, onError }: {
  slot: Slot; offset: number; muted: boolean; onReady: () => void; onError: () => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const expected = useRef(offset);
  const mutedRef = useRef(muted);
  const readyRef = useRef(onReady);
  const errorRef = useRef(onError);

  useEffect(() => { expected.current = offset; }, [offset]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { readyRef.current = onReady; }, [onReady]);
  useEffect(() => { errorRef.current = onError; }, [onError]);

  useEffect(() => {
    const node = mount.current;
    if (!node) return;
    let cancelled = false;
    let created: YTPlayer | null = null;
    void loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      const host = document.createElement('div');
      node.append(host);
      const p = new YT.Player(host, {
        host: 'https://www.youtube-nocookie.com', videoId: slot.mediaId,
        playerVars: { autoplay: 1, mute: 1, playsinline: 1, controls: 0, disablekb: 1, fs: 0, rel: 0,
          modestbranding: 1, iv_load_policy: 3, cc_load_policy: 0, hl: 'ru', start: Math.floor(expected.current) },
        events: {
          onReady: () => { player.current = p; killCaptions(p); if (mutedRef.current) p.mute(); else { p.unMute(); p.setVolume(70); } p.playVideo(); readyRef.current(); },
          onError: () => errorRef.current()
        }
      });
      created = p;
    }).catch(() => errorRef.current());
    return () => { cancelled = true; try { created?.destroy(); } catch { /* already gone */ } node.replaceChildren(); player.current = null; };
  // New scheduled item gets a new isolated player.
  }, [slot.mediaId, slot.start]);

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    if (muted) p.mute(); else { p.unMute(); p.setVolume(70); }
  }, [muted]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const p = player.current;
      if (!p) return;
      const actual = p.getCurrentTime();
      if (actual > 0 && Math.abs(actual - expected.current) > 7) p.seekTo(expected.current, true);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  return <div className="tv__mount" ref={mount} />;
}

function ScheduledMedia({ slot, offset, muted, onReady, onError }: {
  slot: Slot; offset: number; muted: boolean; onReady: () => void; onError: () => void;
}) {
  if (slot.provider === 'youtube') return <YouTubeAir {...{ slot, offset, muted, onReady, onError }} />;
  if (slot.provider === 'vibix') {
    return <div className="tv__mount tv__mount--vibix"><VibixPlayer type={slot.mediaType === 'movie' ? 'movie' : 'serial'} id={slot.mediaId} season={slot.season} label={slot.title} /></div>;
  }
  if ((slot.provider === 'rutube' || slot.provider === 'kodik') && slot.publicRef) {
    return <iframe className="tv__mount" src={slot.publicRef} title={slot.title} allow="autoplay; fullscreen" onLoad={onReady} />;
  }
  return (
    <div className="tv__generated" role="img" aria-label={slot.title}>
      <div className="tv__testMark">ТВ</div><strong>{slot.label ?? slot.title}</strong>
      <span>{hhmm(slot.start)}—{hhmm(slot.end)} · UTC+3</span>
      <small>{slot.title}</small>
    </div>
  );
}

export type TVPlayerProps = {
  channelId: string;
  onSlotChange?: (slot: Slot | null) => void;
  onChannelStep?: (direction: -1 | 1) => void;
};

export function TVPlayer({ channelId, onSlotChange, onChannelStep }: TVPlayerProps) {
  const [on, setOn] = useState(false);
  const [warm, setWarm] = useState(false);
  const [staticBurst, setStaticBurst] = useState(false);
  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(() => broadcastDateISO());
  const [clock, setClock] = useState(() => hhmm(broadcastSecondsOfDay()));
  const [air, setAir] = useState<{ slot: Slot; offset: number } | null>(null);
  const failed = useRef(new Set<string>());
  const channel = tvData.channels[channelId];
  const slots = useMemo(() => buildDay(tvData, channelId, date), [channelId, date]);

  const resolve = useCallback(() => {
    const current = nowPlaying(slots, broadcastSecondsOfDay());
    if (!current) return null;
    let i = current.index;
    let offset = current.offsetSec;
    while (i < slots.length && failed.current.has(`${slots[i].provider}:${slots[i].mediaId}`)) { i++; offset = 0; }
    return i < slots.length ? { slot: slots[i], offset } : null;
  }, [slots]);

  useEffect(() => {
    const tick = () => {
      const nextDate = broadcastDateISO();
      setClock(hhmm(broadcastSecondsOfDay()));
      if (nextDate !== date) return setDate(nextDate);
      const next = resolve();
      setAir((previous) => {
        if (!next) return null;
        if (previous && previous.slot.start === next.slot.start && previous.slot.mediaId === next.slot.mediaId) {
          return { slot: previous.slot, offset: next.offset };
        }
        return next;
      });
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [date, resolve]);

  useEffect(() => onSlotChange?.(air?.slot ?? null), [air?.slot, onSlotChange]);

  useEffect(() => {
    if (!on) return;
    const begin = window.setTimeout(() => { setStaticBurst(true); setReady(false); setError(null); }, 0);
    const end = window.setTimeout(() => setStaticBurst(false), 320);
    return () => { window.clearTimeout(begin); window.clearTimeout(end); };
  }, [channelId, on]);

  const turnOn = () => {
    claimAudio(); setOn(true); setWarm(true); setReady(false);
    window.setTimeout(() => setWarm(false), 900);
  };
  const mediaReady = air?.slot.provider === 'youtube' ? ready : Boolean(air);

  const mediaError = () => {
    if (!air) return;
    failed.current.add(`${air.slot.provider}:${air.slot.mediaId}`);
    setError('Источник не ответил — переключаем эфир');
    window.setTimeout(() => setError(null), 1800);
  };

  if (!channel) return null;
  return (
    <div className="tv">
      <div className="tv__set">
        <div className="tv__screenFrame">
          <div className="crt__screen scanlines tv__screen">
            {on && air ? <ScheduledMedia slot={air.slot} offset={air.offset} muted={muted} onReady={() => setReady(true)} onError={mediaError} /> : null}
            {!on ? <button className="tv__power pixel" onClick={turnOn}><span className="tv__powerDot" />Включить телевизор</button> : null}
            {on && (warm || !mediaReady) ? <div className="tv__overlay tv__warm pixel">Прогревается кинескоп…</div> : null}
            {staticBurst ? <div className="tv__static" aria-hidden="true" /> : null}
            {error ? <div className="tv__overlay pixel">{error}</div> : null}
            <div className="crt__glass" aria-hidden="true" />
            {on ? <div className="tv__osd pixel"><span className="tv__osdNum">{channel.num}</span><span>{channel.name}</span><span className="tv__osdTime mono">{clock} UTC+3</span></div> : null}
          </div>
          <img className="tv__cabinet" src={asset('/images/tv/tv-frame.webp')} alt="" aria-hidden="true" draggable={false} />
        </div>
      </div>

      <div className="tv__remote" aria-label="Пульт телевизора">
        <button className="tv__remoteButton" onClick={() => onChannelStep?.(-1)} aria-label="Предыдущий канал">CH−</button>
        <button className="tv__remoteButton tv__remoteButton--power" onClick={() => { if (on) setOn(false); else turnOn(); }}>{on ? 'Выкл' : 'Вкл'}</button>
        <button className="tv__remoteButton" onClick={() => onChannelStep?.(1)} aria-label="Следующий канал">CH+</button>
        <button className="tv__remoteButton" onClick={() => setMuted((v) => !v)} disabled={!on}>{muted ? 'Звук' : 'Тихо'}</button>
      </div>

      {air ? <p className="mono tv__onAir">Сейчас: {slotLabel(air.slot)} · {air.slot.title}
        {!air.slot.canSeek && air.offset > 5 ? <span> · источник включается с начала</span> : null}
      </p> : null}
    </div>
  );
}
