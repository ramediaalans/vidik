import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  unloadModule(name: string): void; setOption(module: string, option: string, value: unknown): void; destroy(): void;
};
type YTNamespace = { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer };
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };
let apiPromise: Promise<YTNamespace> | null = null;

type VkPlayerState = { time?: number; duration?: number };
type VkPlayer = {
  play(): void; pause(): void; mute(): void; unmute(): void; seek(seconds: number): void;
  getCurrentTime(): number; getState(): string; on(event: string, cb: (state: VkPlayerState) => void): void;
};
type VkVideoPlayerFactory = {
  (iframe: HTMLIFrameElement): VkPlayer;
  Events: { TIMEUPDATE: string };
  States: { PLAYING: string };
};
type VkWindow = Window & { VK?: { VideoPlayer?: VkVideoPlayerFactory } };
let vkApiPromise: Promise<{ VideoPlayer: VkVideoPlayerFactory }> | null = null;

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

function loadVkApi(): Promise<{ VideoPlayer: VkVideoPlayerFactory }> {
  if (vkApiPromise) return vkApiPromise;
  vkApiPromise = new Promise((resolve, reject) => {
    const w = window as VkWindow;
    if (w.VK?.VideoPlayer) return resolve({ VideoPlayer: w.VK.VideoPlayer });
    const script = document.createElement('script');
    script.src = 'https://vk.com/js/api/videoplayer.js';
    script.async = true;
    script.onload = () => w.VK?.VideoPlayer
      ? resolve({ VideoPlayer: w.VK.VideoPlayer })
      : reject(new Error('VK Video API недоступен'));
    script.onerror = () => reject(new Error('Не удалось загрузить VK Video'));
    document.head.appendChild(script);
  });
  return vkApiPromise;
}

function killCaptions(player: YTPlayer) {
  // YouTube can restore a viewer's saved caption preference after onReady,
  // so clear the active track first and then unload both caption modules.
  for (const module of ['captions', 'cc']) {
    try { player.setOption(module, 'track', {}); } catch { /* optional module */ }
    try { player.unloadModule(module); } catch { /* optional module */ }
  }
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
          onReady: () => {
            player.current = p;
            node.querySelector('iframe')?.setAttribute('tabindex', '-1');
            killCaptions(p);
            if (mutedRef.current) p.mute(); else { p.unMute(); p.setVolume(70); }
            p.playVideo();
            readyRef.current();
          },
          onApiChange: () => killCaptions(p),
          onStateChange: () => killCaptions(p),
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
      killCaptions(p);
      const actual = p.getCurrentTime();
      if (actual > 0 && Math.abs(actual - expected.current) > 7) p.seekTo(expected.current, true);
    }, 4000);
    return () => window.clearInterval(id);
  }, []);

  return <div className="tv__mount" ref={mount} />;
}

// Rutube работает как линейный эфир: контроллы скрыты, пауза и перемотка отменяются.
function RutubeAir({ slot, offset, muted, onReady }: {
  slot: Slot; offset: number; muted: boolean; onReady: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const expected = useRef(offset);
  const mutedRef = useRef(muted);
  const readyRef = useRef(onReady);
  const [src] = useState(
    () => `https://rutube.ru/play/embed/${slot.mediaId}/?t=${Math.floor(offset)}&autoStart=true`
  );
  useEffect(() => { expected.current = offset; }, [offset]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { readyRef.current = onReady; }, [onReady]);

  const command = useCallback((type: string, data: Record<string, unknown> = {}) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ type, data, ...data }), '*');
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      let message: { type?: string; data?: { time?: number; state?: string } };
      try { message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
      if (message.type === 'player:ready') {
        command('player:hideControls');
        command(mutedRef.current ? 'player:mute' : 'player:unMute');
        command('player:setCurrentTime', { time: expected.current });
        command('player:play');
        readyRef.current();
      }
      if (message.type === 'player:currentTime') {
        const actual = message.data?.time;
        if (typeof actual === 'number' && Math.abs(actual - expected.current) > 7) {
          command('player:setCurrentTime', { time: expected.current });
        }
      }
      if (message.type === 'player:changeState' && message.data?.state === 'paused') command('player:play');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [command]);

  useEffect(() => { command(muted ? 'player:mute' : 'player:unMute'); }, [command, muted]);

  return <iframe ref={frame} className="tv__mount" src={src} title={slot.title} allow="autoplay" tabIndex={-1} />;
}

function VkAir({ slot, offset, muted, onReady, onError }: {
  slot: Slot; offset: number; muted: boolean; onReady: () => void; onError: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<VkPlayer | null>(null);
  const expected = useRef(offset);
  const mutedRef = useRef(muted);
  const readyRef = useRef(onReady);
  const errorRef = useRef(onError);
  const [ownerId, videoId] = slot.mediaId.split('_');
  // Freeze the iframe URL for the scheduled item. `offset` advances every
  // second; using it directly in src reloads VK on every clock tick.
  const [src] = useState(
    () => `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hd=2&js_api=1&t=${Math.floor(offset)}&autoplay=1`
  );

  useEffect(() => { expected.current = offset; }, [offset]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { readyRef.current = onReady; }, [onReady]);
  useEffect(() => { errorRef.current = onError; }, [onError]);

  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    let cancelled = false;
    let timer = 0;
    void loadVkApi().then((VK) => {
      if (cancelled) return;
      const p = VK.VideoPlayer(iframe);
      player.current = p;
      p.on(VK.VideoPlayer.Events.TIMEUPDATE, (state) => {
        if (cancelled || typeof state.time !== 'number') return;
        if (Math.abs(state.time - expected.current) > 7) p.seek(expected.current);
      });
      if (mutedRef.current) p.mute(); else p.unmute();
      p.seek(expected.current);
      p.play();
      readyRef.current();
      timer = window.setInterval(() => {
        try {
          if (Math.abs(p.getCurrentTime() - expected.current) > 7) p.seek(expected.current);
          if (p.getState() !== VK.VideoPlayer.States.PLAYING) p.play();
        } catch { /* iframe can be between states */ }
      }, 4000);
    }).catch(() => errorRef.current());
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      player.current = null;
    };
  }, [slot.mediaId, slot.start]);

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    if (muted) p.mute(); else p.unmute();
  }, [muted]);

  return <iframe ref={frame} className="tv__mount" src={src} title={slot.title} allow="autoplay" tabIndex={-1} />;
}

function ScheduledMedia({ slot, offset, muted, onReady, onError }: {
  slot: Slot; offset: number; muted: boolean; onReady: () => void; onError: () => void;
}) {
  if (slot.provider === 'youtube') {
    return <YouTubeAir key={`${slot.mediaId}:${slot.start}`} {...{ slot, offset, muted, onReady, onError }} />;
  }
  if (slot.provider === 'rutube') {
    return <RutubeAir key={`${slot.mediaId}:${slot.start}`} slot={slot} offset={offset} muted={muted} onReady={onReady} />;
  }
  if (slot.provider === 'vk') {
    return <VkAir key={`${slot.mediaId}:${slot.start}`} {...{ slot, offset, muted, onReady, onError }} />;
  }
  if (slot.provider === 'kodik' && slot.publicRef) {
    return <iframe className="tv__mount" src={slot.publicRef} title={slot.title} allow="autoplay" tabIndex={-1} onLoad={onReady} />;
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
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(() => broadcastDateISO());
  const screenRef = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState(() => hhmm(broadcastSecondsOfDay()));
  const [air, setAir] = useState<{ slot: Slot; offset: number } | null>(null);
  const airKey = air ? `${air.slot.provider}:${air.slot.mediaId}:${air.slot.start}` : null;
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
    const begin = window.setTimeout(() => { setStaticBurst(true); setReadyFor(null); setError(null); }, 0);
    const end = window.setTimeout(() => setStaticBurst(false), 320);
    return () => { window.clearTimeout(begin); window.clearTimeout(end); };
  }, [channelId, on]);

  const turnOn = () => {
    claimAudio(); setOn(true); setWarm(true); setReadyFor(null);
    window.setTimeout(() => setWarm(false), 900);
  };
  const mediaReady = air && ['youtube', 'rutube', 'vk'].includes(air.slot.provider) ? readyFor === airKey : Boolean(air);

  const mediaError = () => {
    if (!air) return;
    failed.current.add(`${air.slot.provider}:${air.slot.mediaId}`);
    setError('Источник не ответил — переключаем эфир');
    window.setTimeout(() => setError(null), 1800);
  };

  const enterFullscreen = useCallback(() => {
    const screen = screenRef.current;
    if (!screen || !document.fullscreenEnabled) {
      setError('Полноэкранный режим недоступен в этом браузере');
      return;
    }
    void screen.requestFullscreen().catch(() => setError('Не удалось открыть полный экран'));
  }, []);

  if (!channel) return null;
  return (
    <div className="tv">
      <div className="tv__set">
        <div className="tv__screenFrame">
          <div className="crt__screen scanlines tv__screen" ref={screenRef}>
            {on && air ? <ScheduledMedia slot={air.slot} offset={air.offset} muted={muted} onReady={() => setReadyFor(airKey)} onError={mediaError} /> : null}
            {!on ? <button className="tv__power pixel" onClick={turnOn}><span className="tv__powerDot" />Включить телевизор</button> : null}
            {on && (warm || !mediaReady) ? <div className="tv__overlay tv__warm pixel">Прогревается кинескоп…</div> : null}
            {staticBurst ? <div className="tv__static" aria-hidden="true" /> : null}
            {error ? <div className="tv__overlay pixel">{error}</div> : null}
            {on && air ? <div className="tv__interactionShield" aria-hidden="true" /> : null}
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
        <button className="tv__remoteButton" onClick={enterFullscreen} disabled={!on} aria-label="Открыть телевизор на весь экран">Полный экран</button>
      </div>

      {air ? <p className="mono tv__onAir">Сейчас: {slotLabel(air.slot)} · {air.slot.title}
        {!air.slot.canSeek && air.offset > 5 ? <span> · источник включается с начала</span> : null}
      </p> : null}
    </div>
  );
}
