import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { asset } from '../media/asset';
import { useFullscreen } from '../media/fullscreen';
import { hotkeyChar, isTypingTarget } from '../media/hotkeys';
import { claimAudio } from '../media/playerContext';
import { tvData } from './data';
import {
  broadcastDateISO,
  broadcastSecondsOfDay,
  buildDay,
  hhmm,
  nowPlaying,

  type Slot
} from './schedule';

// Ресинхронизация с расписанием должна быть редкой: частые seek на старте ролика
// дают зацикливание: плеер буферизуется, время «отстаёт» и мы секаем снова.
const RESYNC_TOLERANCE_SEC = 12;
const RESYNC_COOLDOWN_MS = 12_000;

type YTPlayer = {
  playVideo(): void; mute(): void; unMute(): void; setVolume(v: number): void; isMuted(): boolean;
  getPlayerState(): number;
  getCurrentTime(): number; seekTo(seconds: number, allowSeekAhead: boolean): void;
  unloadModule(name: string): void; setOption(module: string, option: string, value: unknown): void; destroy(): void;
};
type YTNamespace = { Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer };
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void };
let apiPromise: Promise<YTNamespace> | null = null;
// Сколько ждём ответа от внешнего плеера, прежде чем счесть источник недоступным.
const PROVIDER_TIMEOUT_MS = 15_000;

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
    const timer = window.setTimeout(() => reject(new Error('YouTube не ответил')), PROVIDER_TIMEOUT_MS);
    script.onerror = () => { window.clearTimeout(timer); script.remove(); reject(new Error('Не удалось загрузить YouTube')); };
    const ready = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => { window.clearTimeout(timer); ready?.(); };
    document.head.appendChild(script);
  });
  // Неудачу не кешируем: иначе после одного сбоя сети YouTube не заработает до перезагрузки.
  apiPromise.catch(() => { apiPromise = null; });
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
    script.onerror = () => { script.remove(); reject(new Error('Не удалось загрузить VK Video')); };
    document.head.appendChild(script);
  });
  vkApiPromise.catch(() => { vkApiPromise = null; });
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
  const lastSeek = useRef(0);

  useEffect(() => { expected.current = offset; }, [offset]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { readyRef.current = onReady; }, [onReady]);
  useEffect(() => { errorRef.current = onError; }, [onError]);

  // Браузер может заглушить автозапуск, поэтому звук применяем повторно:
  // на onReady, на старте воспроизведения и на первом действии пользователя.
  const applySound = useCallback(() => {
    const p = player.current;
    if (!p) return;
    try {
      if (mutedRef.current) { p.mute(); return; }
      p.unMute();
      p.setVolume(70);
    } catch { /* плеер между состояниями */ }
  }, []);

  useEffect(() => {
    const onGesture = () => applySound();
    window.addEventListener('pointerdown', onGesture);
    window.addEventListener('keydown', onGesture);
    return () => {
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('keydown', onGesture);
    };
  }, [applySound]);

  useEffect(() => {
    const node = mount.current;
    if (!node) return;
    let cancelled = false;
    let created: YTPlayer | null = null;
    lastSeek.current = Date.now();
    void loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      const host = document.createElement('div');
      node.append(host);
      const p = new YT.Player(host, {
        host: 'https://www.youtube-nocookie.com', videoId: slot.mediaId,
        // Автозапуск разрешён браузерами только без звука, поэтому стартуем в mute
        // и снимаем заглушку сразу после того, как ролик реально пошёл.
        playerVars: { autoplay: 1, mute: 1, playsinline: 1, controls: 0, disablekb: 1, fs: 0, rel: 0,
          modestbranding: 1, iv_load_policy: 3, cc_load_policy: 0, hl: 'ru', start: Math.floor(expected.current) },
        events: {
          onReady: () => {
            player.current = p;
            node.querySelector('iframe')?.setAttribute('tabindex', '-1');
            killCaptions(p);
            try { p.mute(); } catch { /* плеер ещё не готов */ }
            p.playVideo();
            lastSeek.current = Date.now();
            readyRef.current();
          },
          onApiChange: () => killCaptions(p),
          onStateChange: (event: { data?: number }) => {
            // 1 = PLAYING: ролик пошёл — включаем звук и гасим субтитры.
            if (event?.data === 1) { applySound(); killCaptions(p); return; }
            // -1 unstarted / 2 paused: автозапуск мог быть заблокирован — толкаем снова в тишине.
            if (event?.data === -1 || event?.data === 2) {
              try { p.mute(); p.playVideo(); } catch { /* плеер между состояниями */ }
            }
          },
          onError: () => errorRef.current()
        }
      });
      created = p;
    }).catch(() => errorRef.current());
    return () => { cancelled = true; try { created?.destroy(); } catch { /* already gone */ } node.replaceChildren(); player.current = null; };
  // New scheduled item gets a new isolated player.
  }, [applySound, slot.mediaId, slot.start]);

  useEffect(() => { applySound(); }, [applySound, muted]);

  // Сторож: если ролик застрял на заставке YouTube (заблокирован автозапуск), толкаем его.
  useEffect(() => {
    const id = window.setInterval(() => {
      const p = player.current;
      if (!p) return;
      let state = 1;
      try { state = p.getPlayerState(); } catch { return; }
      if (state === -1 || state === 2 || state === 5) {
        try { p.mute(); p.playVideo(); } catch { /* плеер между состояниями */ }
      }
    }, 1500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const p = player.current;
      if (!p) return;
      const now = Date.now();
      if (now - lastSeek.current < RESYNC_COOLDOWN_MS) return;
      let actual = 0;
      try { actual = p.getCurrentTime(); } catch { return; }
      if (actual > 0 && Math.abs(actual - expected.current) > RESYNC_TOLERANCE_SEC) {
        p.seekTo(expected.current, true);
        lastSeek.current = now;
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  return <div className="tv__mount" ref={mount} />;
}

// Rutube работает как линейный эфир: контроллы скрыты, пауза и перемотка отменяются.
function RutubeAir({ slot, offset, muted, onReady, onError }: {
  slot: Slot; offset: number; muted: boolean; onReady: () => void; onError: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const expected = useRef(offset);
  const mutedRef = useRef(muted);
  const readyRef = useRef(onReady);
  const errorRef = useRef(onError);
  const lastSeek = useRef(0);
  const [src] = useState(
    () => `https://rutube.ru/play/embed/${slot.mediaId}/?t=${Math.floor(offset)}&autoStart=true`
  );
  useEffect(() => { expected.current = offset; }, [offset]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { readyRef.current = onReady; }, [onReady]);
  useEffect(() => { errorRef.current = onError; }, [onError]);

  const command = useCallback((type: string, data: Record<string, unknown> = {}) => {
    frame.current?.contentWindow?.postMessage(JSON.stringify({ type, data, ...data }), '*');
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      let message: { type?: string; data?: { time?: number; state?: string } };
      try { message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
      if (message.type === 'player:error') { window.clearTimeout(watchdog); errorRef.current(); return; }
      if (message.type === 'player:ready') {
        window.clearTimeout(watchdog);
        command('player:hideControls');
        command(mutedRef.current ? 'player:mute' : 'player:unMute');
        command('player:setCurrentTime', { time: expected.current });
        command('player:play');
        lastSeek.current = Date.now();
        readyRef.current();
      }
      if (message.type === 'player:currentTime') {
        const actual = message.data?.time;
        const now = Date.now();
        if (now - lastSeek.current < RESYNC_COOLDOWN_MS) return;
        if (typeof actual === 'number' && Math.abs(actual - expected.current) > RESYNC_TOLERANCE_SEC) {
          command('player:setCurrentTime', { time: expected.current });
          lastSeek.current = now;
        }
      }
      if (message.type === 'player:changeState' && message.data?.state === 'paused') command('player:play');
    };
    lastSeek.current = Date.now();
    // Ролик удалён или Rutube недоступен — плеер молчит. Не держим «кинескоп» вечно.
    const watchdog = window.setTimeout(() => errorRef.current(), PROVIDER_TIMEOUT_MS);
    window.addEventListener('message', onMessage);
    return () => { window.clearTimeout(watchdog); window.removeEventListener('message', onMessage); };
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
  const lastSeek = useRef(0);
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
    lastSeek.current = Date.now();
    void loadVkApi().then((VK) => {
      if (cancelled) return;
      const p = VK.VideoPlayer(iframe);
      player.current = p;
      p.on(VK.VideoPlayer.Events.TIMEUPDATE, (state) => {
        if (cancelled || typeof state.time !== 'number') return;
        // Стартуем без звука ради автозапуска и возвращаем его, как только эфир пошёл.
        if (!mutedRef.current) { try { p.unmute(); } catch { /* между состояниями */ } }
        const now = Date.now();
        if (now - lastSeek.current < RESYNC_COOLDOWN_MS) return;
        if (Math.abs(state.time - expected.current) > RESYNC_TOLERANCE_SEC) {
          p.seek(expected.current);
          lastSeek.current = now;
        }
      });
      p.mute();
      p.seek(expected.current);
      p.play();
      lastSeek.current = Date.now();
      readyRef.current();
      timer = window.setInterval(() => {
        try {
          const now = Date.now();
          if (now - lastSeek.current >= RESYNC_COOLDOWN_MS
            && Math.abs(p.getCurrentTime() - expected.current) > RESYNC_TOLERANCE_SEC) {
            p.seek(expected.current);
            lastSeek.current = now;
          }
          if (p.getState() !== VK.VideoPlayer.States.PLAYING) p.play();
          if (!mutedRef.current) p.unmute();
        } catch { /* iframe can be between states */ }
      }, 5000);
    }).catch(() => errorRef.current());
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      // У VK API destroy есть не во всех версиях — вызываем, если он есть.
      const p = player.current as (VkPlayer & { destroy?: () => void }) | null;
      try { p?.destroy?.(); } catch { /* плеер уже снят */ }
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
    return <RutubeAir key={`${slot.mediaId}:${slot.start}`} {...{ slot, offset, muted, onReady, onError }} />;
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
      <span>{hhmm(slot.start)}—{hhmm(slot.end)}</span>
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
  // Телевизор включается со звуком: кнопка «Включить» — жест пользователя, автоплей разрешён.
  const [muted, setMuted] = useState(false);
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(() => broadcastDateISO());
  const screenRef = useRef<HTMLDivElement>(null);
  const [clock, setClock] = useState(() => hhmm(broadcastSecondsOfDay()));
  const [air, setAir] = useState<{ slot: Slot; offset: number } | null>(null);
  const airKey = air ? `${air.slot.provider}:${air.slot.mediaId}:${air.slot.start}` : null;
  // Чёрные шторки прячут служебные плашки плеера в первые секунды эфира.
  const [bars, setBars] = useState(false);
  // Накопленный угол ручки переключателя каналов (шаг = один щелчок).
  const [knobTurn, setKnobTurn] = useState(0);
  const failed = useRef(new Set<string>());
  const channel = tvData.channels[channelId];
  const slots = useMemo(() => buildDay(tvData, channelId, date), [channelId, date]);

  const resolve = useCallback(() => {
    const current = nowPlaying(slots, broadcastSecondsOfDay());
    if (!current) return null;
    let i = current.index;
    // offset — позиция внутри исходника: слот может начинаться с середины сборника (slot.from).
    let offset = slots[i].from + current.offsetSec;
    // Недоступный источник заменяем следующей передачей. Позицию считаем от текущего
    // времени эфира, а не замораживаем на slot.from: иначе ожидаемое время стоит на месте,
    // ресинк через 12 секунд отматывает подмену в начало — и так по кругу.
    while (i < slots.length && failed.current.has(`${slots[i].provider}:${slots[i].mediaId}`)) {
      i++;
      const next = slots[i];
      if (next) {
        const length = next.end - next.start;
        offset = next.from + (length > 0 ? current.offsetSec % length : 0);
      }
    }
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
    // readyFor здесь не сбрасываем: он привязан к airKey, и новая передача и так
    // не совпадёт со старым ключом. Сброс через setTimeout мог прийти уже после
    // onReady плеера (VK с закэшированным API отвечает почти мгновенно), и тогда
    // плашка «Прогревается кинескоп…» оставалась поверх идущего эфира.
    const begin = window.setTimeout(() => { setStaticBurst(true); setError(null); }, 0);
    const end = window.setTimeout(() => setStaticBurst(false), 320);
    return () => { window.clearTimeout(begin); window.clearTimeout(end); };
  }, [channelId, on]);

  const turnOn = () => {
    claimAudio(); setOn(true); setWarm(true); setReadyFor(null);
    window.setTimeout(() => setWarm(false), 900);
  };
  const mediaReady = air && ['youtube', 'rutube', 'vk'].includes(air.slot.provider) ? readyFor === airKey : Boolean(air);

  // Шторки опускаются при включении, смене канала и новой передаче.
  useEffect(() => {
    const id = window.setTimeout(() => setBars(on), 0);
    return () => window.clearTimeout(id);
  }, [on, airKey, channelId]);
  // …и уходят через 7 секунд после того, как картинка реально пошла.
  useEffect(() => {
    if (!on || !bars || !mediaReady) return;
    const id = window.setTimeout(() => setBars(false), 7000);
    return () => window.clearTimeout(id);
  }, [on, bars, mediaReady, airKey, channelId]);

  const step = useCallback((direction: -1 | 1) => {
    setKnobTurn((turn) => turn + direction);
    onChannelStep?.(direction);
  }, [onChannelStep]);
  const togglePower = () => { if (on) setOn(false); else turnOn(); };

  const mediaError = () => {
    if (!air) return;
    failed.current.add(`${air.slot.provider}:${air.slot.mediaId}`);
    setError('Источник не ответил — переключаем эфир');
    window.setTimeout(() => setError(null), 1800);
  };

  // На телефоне клавиатуры нет: есть кнопка на пульте и автораскрытие при повороте экрана.
  const { isFullscreen, pseudo, toggle: toggleFullscreen } = useFullscreen(screenRef, {
    autoLandscape: true,
    active: on
  });

  // Горячие клавиши не зависят от раскладки: смотрим на физическую клавишу.
  useEffect(() => {
    if (!on) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      const key = hotkeyChar(event);
      if (key === 'f') { event.preventDefault(); toggleFullscreen(); return; }
      if (key === 'm') { event.preventDefault(); setMuted((v) => !v); return; }
      if (key === 'ArrowLeft') { event.preventDefault(); step(-1); return; }
      if (key === 'ArrowRight') { event.preventDefault(); step(1); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [on, step, toggleFullscreen]);

  if (!channel) return null;
  return (
    <div className="tv">
      <div className="tv__set">
        <div className="tv__screenFrame">
          <div className={`crt__screen scanlines tv__screen${isFullscreen ? ' is-fullscreen' : ''}${pseudo ? ' is-pseudoFullscreen' : ''}`} ref={screenRef}>
            {on && air ? <ScheduledMedia slot={air.slot} offset={air.offset} muted={muted} onReady={() => setReadyFor(airKey)} onError={mediaError} /> : null}
            {!on ? <button className="tv__power pixel" onClick={turnOn}><span className="tv__powerDot" />Включить телевизор</button> : null}
            {on && (warm || !mediaReady) ? <div className="tv__overlay tv__warm pixel">Прогревается кинескоп…</div> : null}
            {staticBurst ? <div className="tv__static" aria-hidden="true" /> : null}
            {error ? <div className="tv__overlay pixel">{error}</div> : null}
            {on && air ? <div className="tv__interactionShield" aria-hidden="true" /> : null}
            {on ? <div className={`tv__bar tv__bar--top${bars ? '' : ' is-hidden'}`} aria-hidden="true" /> : null}
            {on ? <div className={`tv__bar tv__bar--bottom${bars ? '' : ' is-hidden'}`} aria-hidden="true" /> : null}
            {isFullscreen ? <button className="tv__exitFs mono" onClick={toggleFullscreen} aria-label="Выйти из полного экрана">✕</button> : null}
            <div className="crt__glass" aria-hidden="true" />
            {on ? <div className="tv__osd pixel"><span className="tv__osdNum">{channel.num}</span><span>{channel.name}</span><span className="tv__osdTime mono">{clock}</span></div> : null}
          </div>
          <img className="tv__cabinet" src={asset('/images/tv/tv-frame.webp')} alt="" aria-hidden="true" draggable={false} />
          <button type="button" className="tv__knob" onClick={() => step(1)} aria-label="Повернуть переключатель каналов" title="Щёлк — следующий канал">
            <img src={asset('/images/tv/tv-knob.webp')} alt="" draggable={false} style={{ transform: `rotate(${knobTurn * 30}deg)` }} />
          </button>
          <button type="button" className={`tv__cabPower${on ? ' is-on' : ''}`} onClick={togglePower} aria-pressed={on} aria-label={on ? 'Выключить телевизор' : 'Включить телевизор'} title={on ? 'Выключить' : 'Включить'} />
        </div>
      </div>

      <div className="tv__remote" aria-label="Пульт телевизора">
        <button className="tv__remoteButton" onClick={() => step(-1)} aria-label="Предыдущий канал">CH−</button>
        <button className="tv__remoteButton tv__remoteButton--power" onClick={togglePower}>{on ? 'Выкл' : 'Вкл'}</button>
        <button className="tv__remoteButton" onClick={() => step(1)} aria-label="Следующий канал">CH+</button>
        <button className="tv__remoteButton" onClick={() => setMuted((v) => !v)} disabled={!on}>{muted ? 'Звук' : 'Тихо'}</button>
        <button className="tv__remoteButton" onClick={toggleFullscreen} disabled={!on} aria-label={isFullscreen ? 'Выйти из полного экрана' : 'Открыть телевизор на весь экран'}>{isFullscreen ? 'Окно' : 'Полный экран'}</button>
      </div>

      {air ? <p className="mono tv__onAir">Сейчас: {air.slot.title}</p> : null}
    </div>
  );
}
