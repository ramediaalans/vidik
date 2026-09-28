import { useCallback, useEffect, useRef, useState } from 'react';
import type { FilmVideoSource } from '../data/films';
import { useFullscreen } from '../media/fullscreen';
import { hotkeyChar, isTypingTarget } from '../media/hotkeys';

type VkPlayerState = { time?: number; duration?: number };
type VkPlayer = {
  play(): void;
  pause(): void;
  mute(): void;
  unmute(): void;
  seek(seconds: number): void;
  getCurrentTime(): number;
  getState(): string;
  getVolume(): number;
  setVolume(volume: number): void;
  isMuted(): boolean;
  on(event: string, listener: (state: VkPlayerState) => void): void;
  destroy(): void;
};
type VkFactory = {
  (iframe: HTMLIFrameElement): VkPlayer;
  Events: Record<string, string>;
  States: Record<string, string>;
};
type VkWindow = Window & { VK?: { VideoPlayer?: VkFactory } };

type PlayerMode = 'loading' | 'playing' | 'paused' | 'ended' | 'error';

let vkApiPromise: Promise<VkFactory> | null = null;

function loadVkApi(): Promise<VkFactory> {
  if (vkApiPromise) return vkApiPromise;
  vkApiPromise = new Promise((resolve, reject) => {
    const w = window as VkWindow;
    if (w.VK?.VideoPlayer) return resolve(w.VK.VideoPlayer);
    const script = document.createElement('script');
    script.src = 'https://vk.com/js/api/videoplayer.js';
    script.async = true;
    script.onload = () => w.VK?.VideoPlayer
      ? resolve(w.VK.VideoPlayer)
      : reject(new Error('VK Video API недоступен'));
    script.onerror = () => reject(new Error('Не удалось загрузить VK Video API'));
    document.head.appendChild(script);
  });
  return vkApiPromise;
}

function embedUrl(source: FilmVideoSource): string {
  if (source.provider === 'vk') {
    const [ownerId, videoId] = source.id.split('_');
    const at = Math.max(0, Math.floor(source.start ?? 0));
    return `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hd=2&autoplay=1&js_api=1&t=${at}`;
  }
  const start = Math.max(0, Math.floor(source.start ?? 0));
  // Стартуем всегда без звука: браузеры блокируют автозапуск со звуком,
  // а звук мы включаем сами сразу после реального начала воспроизведения.
  if (source.provider === 'rutube') {
    return `https://rutube.ru/play/embed/${source.id}/?autoStart=true&mute=1${start > 0 ? `&t=${start}` : ''}`;
  }
  const end = source.endTrim ? Math.max(start + 1, Math.floor(source.duration - source.endTrim)) : null;
  return `https://www.youtube-nocookie.com/embed/${source.id}?autoplay=1&mute=1&rel=0&cc_load_policy=0&enablejsapi=1&controls=0&modestbranding=1${start > 0 ? `&start=${start}` : ''}${end ? `&end=${end}` : ''}`;
}

function VkVideoPlayer({ source, label, poster }: {
  source: FilmVideoSource;
  label: string;
  poster?: string | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const player = useRef<VkPlayer | null>(null);
  const ending = useRef(false);
  const pauseAt = useRef<number | null>(null);
  const adActive = useRef(false);
  const soundPrimed = useRef(false);
  const recommendationFixing = useRef(false);
  const [mode, setMode] = useState<PlayerMode>('loading');
  const [soundOff, setSoundOff] = useState(false);
  const [adBlocked, setAdBlocked] = useState(false);
  const [controlsOn, setControlsOn] = useState(true);
  const soundOffRef = useRef(false);
  const { isFullscreen, pseudo, toggle: toggleFullscreen } = useFullscreen(container, {
    autoLandscape: true,
    active: mode === 'playing' || mode === 'paused'
  });
  const start = Math.max(0, source.start ?? 0);
  const endAt = source.endTrim ? Math.max(start, source.duration - source.endTrim) : null;

  useEffect(() => { soundOffRef.current = soundOff; }, [soundOff]);

  // Единая точка управления звуком: во время рекламы всегда тишина.
  const applySound = useCallback(() => {
    const p = player.current;
    if (!p) return;
    try {
      if (adActive.current || soundOffRef.current) { p.mute(); return; }
      p.setVolume(1);
      p.unmute();
    } catch { /* плеер между состояниями */ }
  }, []);

  // VK может снять заглушку с рекламы после нашего mute(), поэтому давим звук циклом.
  useEffect(() => {
    if (!adBlocked) return;
    const id = window.setInterval(() => {
      try { player.current?.mute(); } catch { /* рекламный плеер пересоздаётся */ }
    }, 400);
    // Защита от зависания заглушки: реклама не длится дольше полутора минут.
    const watchdog = window.setTimeout(() => {
      adActive.current = false;
      setAdBlocked(false);
      applySound();
    }, 90_000);
    return () => { window.clearInterval(id); window.clearTimeout(watchdog); };
  }, [adBlocked, applySound]);

  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    let cancelled = false;
    let instance: VkPlayer | null = null;

    void loadVkApi().then((factory) => {
      if (cancelled) return;
      const p = factory(iframe);
      instance = p;
      player.current = p;
      const e = factory.Events;

      const beginAd = () => {
        if (adActive.current) return;
        adActive.current = true;
        soundPrimed.current = false;
        setAdBlocked(true);
        setMode('loading');
        try { p.mute(); } catch { /* рекламный плеер ещё не готов */ }
      };
      const endAd = () => {
        if (!adActive.current) return;
        adActive.current = false;
        setAdBlocked(false);
        applySound();
      };

      // Список рекламных событий VK не зафиксирован, поэтому подписываемся на все AD*:
      // любое начало рекламы — тишина и наша заглушка поверх картинки.
      for (const [name, event] of Object.entries(factory.Events)) {
        if (!name.startsWith('AD') || typeof event !== 'string') continue;
        const finishes = /COMPLET|END|SKIP|STOP|CLOSE|ERROR|FAIL|EMPTY/.test(name);
        p.on(event, finishes ? endAd : beginAd);
      }

      p.on(e.INITED, () => {
        // До подтверждённого контента звука нет: первым может пойти преролл.
        try { p.mute(); } catch { /* нет доступа к звуку */ }
        if (start > 0) p.seek(start);
      });
      p.on(e.STARTED, () => {
        ending.current = false;
        if (adActive.current) return;
        if (!soundPrimed.current) {
          applySound();
          soundPrimed.current = true;
        }
        if (start > 0 && p.getState() === factory.States.PLAYING) p.seek(start);
        setMode('playing');
      });
      p.on(e.RESUMED, () => {
        if (pauseAt.current === null) setMode('playing');
      });
      p.on(e.PAUSED, () => {
        if (pauseAt.current === null) pauseAt.current = p.getCurrentTime();
        setMode(ending.current ? 'ended' : 'paused');
      });
      p.on(e.ENDED, () => {
        ending.current = true;
        setMode('ended');
      });
      p.on(e.ERROR, () => setMode('error'));
      p.on(e.RECOMMENDATIONS_LOADED, () => {
        if (adActive.current) return;
        if (pauseAt.current !== null || recommendationFixing.current) return;
        const state = p.getState();
        if (state === factory.States.ENDED) {
          setMode('ended');
          return;
        }
        recommendationFixing.current = true;
        const current = p.getCurrentTime();
        p.seek(Math.max(start, current + 0.1));
        p.play();
        setMode('playing');
        window.setTimeout(() => { recommendationFixing.current = false; }, 2000);
      });
      p.on(e.TIMEUPDATE, (state) => {
        if (typeof state.time !== 'number') return;
        // Страховка, если AD-события не пришли: рекламный ролик короткий (до 3 минут).
        // Длительность самого VK-ролика сравнивать нельзя: серии часто вырезаны из сборников.
        const duration = state.duration;
        const looksLikeAd = typeof duration === 'number' && duration > 0 && duration <= 180
          && source.duration > 300;
        if (looksLikeAd) { beginAd(); return; }
        if (adActive.current) endAd();
        if (start > 0 && state.time < start - 1) {
          p.seek(start);
          return;
        }
        if (endAt !== null && state.time >= endAt) {
          ending.current = true;
          p.pause();
          setMode('ended');
        }
      });
    }).catch(() => setMode('error'));

    return () => {
      cancelled = true;
      try { instance?.destroy(); } catch { /* iframe already gone */ }
      player.current = null;
    };
  }, [applySound, endAt, source.duration, start]);

  const resume = useCallback(() => {
    ending.current = false;
    const p = player.current;
    if (p) {
      const target = pauseAt.current ?? p.getCurrentTime();
      pauseAt.current = null;
      if (!adActive.current) p.seek(Math.max(start, target));
      p.play();
      applySound();
    }
    setMode(adActive.current ? 'loading' : 'playing');
  }, [applySound, start]);
  const replay = () => {
    ending.current = false;
    pauseAt.current = null;
    player.current?.seek(start);
    player.current?.play();
    applySound();
    setMode('loading');
  };

  const seekBy = useCallback((delta: number) => {
    const p = player.current;
    if (!p) return;
    const current = pauseAt.current ?? p.getCurrentTime();
    const next = Math.min(endAt ?? source.duration, Math.max(start, current + delta));
    if (pauseAt.current !== null) pauseAt.current = next;
    else p.seek(next);
  }, [endAt, source.duration, start]);

  const togglePlay = useCallback(() => {
    const p = player.current;
    if (!p) return;
    if (pauseAt.current === null) {
      pauseAt.current = p.getCurrentTime();
      p.mute();
      setMode('paused');
    } else {
      resume();
    }
  }, [resume]);

  const toggleSound = useCallback(() => {
    const next = !soundOffRef.current;
    soundOffRef.current = next;
    setSoundOff(next);
    applySound();
  }, [applySound]);

  // Кнопки висят пару секунд и гаснут; касание или клик по экрану возвращает их.
  const hideTimer = useRef(0);
  const revealControls = useCallback(() => {
    setControlsOn(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsOn(false), 3000);
  }, []);

  useEffect(() => {
    hideTimer.current = window.setTimeout(() => setControlsOn(false), 3000);
    return () => window.clearTimeout(hideTimer.current);
  }, []);

  // Хоткеи работают при любой раскладке: смотрим на физическую клавишу.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (!player.current) return;
      const key = hotkeyChar(event);
      if ([' ', 'm', 'f', 'ArrowLeft', 'ArrowRight'].includes(key) || event.code === 'Space') revealControls();

      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        event.preventDefault();
        seekBy(key === 'ArrowLeft' ? -10 : 10);
        return;
      }
      if (key === ' ' || event.code === 'Space') {
        event.preventDefault();
        togglePlay();
        return;
      }
      if (key === 'm') {
        event.preventDefault();
        toggleSound();
        return;
      }
      if (key === 'f') {
        event.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [revealControls, seekBy, toggleFullscreen, togglePlay, toggleSound]);

  return (
    <div className={`vplayer${isFullscreen ? ' is-fullscreen' : ''}${pseudo ? ' is-pseudoFullscreen' : ''}`} ref={container}>
      <div className="vplayer__mount">
        <iframe
          ref={frame}
          src={embedUrl(source)}
          title={label}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div
        className="vplayer__contentShield"
        role="application"
        tabIndex={0}
        aria-label="Плеер: стрелки влево и вправо — перемотка, пробел — пауза, M — звук, F — полный экран"
        onClick={(event) => { event.currentTarget.focus(); revealControls(); }}
        onPointerMove={revealControls}
        style={{ position: 'absolute', zIndex: 2, inset: 0, background: 'transparent' }}
      />
      <div
        className={`vplayer__bar${controlsOn ? ' is-on' : ''}`}
        role="toolbar"
        aria-label="Управление плеером"
        onPointerDown={revealControls}
        onPointerMove={revealControls}
        onFocus={revealControls}
      >
        <button type="button" className="vplayer__barBtn" onClick={() => seekBy(-10)} aria-label="Назад 10 секунд">◀◀ 10</button>
        <button type="button" className="vplayer__barBtn" onClick={togglePlay} aria-label={mode === 'paused' ? 'Продолжить' : 'Пауза'}>{mode === 'paused' ? '▶' : '❙❙'}</button>
        <button type="button" className="vplayer__barBtn" onClick={() => seekBy(10)} aria-label="Вперёд 10 секунд">10 ▶▶</button>
        <button type="button" className="vplayer__barBtn" onClick={toggleSound} aria-label={soundOff ? 'Включить звук' : 'Выключить звук'}>{soundOff ? 'Звук' : 'Тихо'}</button>
        <button type="button" className="vplayer__barBtn" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Выйти из полного экрана' : 'Полный экран'}>{isFullscreen ? '✕ Экран' : '⛶ Экран'}</button>
      </div>
      {mode !== 'playing' || adBlocked ? (
        <div
          className={`vplayer__privacy vplayer__privacy--${adBlocked ? 'ad' : mode}`}
          onPointerDown={revealControls}
          style={poster ? { backgroundImage: `linear-gradient(rgba(0,0,0,.62), rgba(0,0,0,.82)), url(${poster})` } : undefined}
        >
          {adBlocked ? (
            <span className="mono">Подготавливаем кассету…</span>
          ) : mode === 'paused' ? (
            <button className="btn btn--primary" onClick={resume}>Продолжить ▶</button>
          ) : mode === 'ended' ? (
            <>
              <span className="mono">Просмотр завершён</span>
              <button className="btn btn--primary" onClick={replay}>Смотреть сначала ↻</button>
            </>
          ) : mode === 'error' ? (
            <span className="mono">Плеер не отвечает. Попробуйте обновить страницу.</span>
          ) : (
            <span className="mono">Подготавливаем кассету…</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

type FrameCmd = 'play' | 'pause' | 'mute' | 'unmute' | 'seek';

// Rutube и YouTube умеют postMessage, поэтому родные контролы убираем под щит
// и крутим их теми же кнопками и хоткеями, что и VK.
function FramePlayer({ source, label }: { source: FilmVideoSource; label: string }) {
  const container = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const at = useRef(Math.max(0, source.start ?? 0));
  const pausedRef = useRef(false);
  const soundOffRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [soundOff, setSoundOff] = useState(false);
  const [controlsOn, setControlsOn] = useState(true);
  const [shielded, setShielded] = useState(true);
  const { isFullscreen, pseudo, toggle: toggleFullscreen } = useFullscreen(container, {
    autoLandscape: true,
    active: true
  });
  const startAt = Math.max(0, source.start ?? 0);
  const endAt = source.endTrim ? Math.max(startAt, source.duration - source.endTrim) : source.duration;

  const send = useCallback((cmd: FrameCmd, value?: number) => {
    const win = frame.current?.contentWindow;
    if (!win) return;
    if (source.provider === 'rutube') {
      const names: Record<FrameCmd, string> = {
        play: 'player:play',
        pause: 'player:pause',
        mute: 'player:mute',
        unmute: 'player:unMute',
        seek: 'player:setCurrentTime'
      };
      win.postMessage(JSON.stringify({ type: names[cmd], data: cmd === 'seek' ? { time: value ?? 0 } : {} }), '*');
      return;
    }
    const funcs: Record<FrameCmd, string> = {
      play: 'playVideo',
      pause: 'pauseVideo',
      mute: 'mute',
      unmute: 'unMute',
      seek: 'seekTo'
    };
    win.postMessage(
      JSON.stringify({ event: 'command', func: funcs[cmd], args: cmd === 'seek' ? [value ?? 0, true] : [] }),
      '*'
    );
  }, [source.provider]);

  // Пока плеер молчит, считаем, что воспроизведение ещё не началось.
  const playing = useRef(false);

  // Собственного API у нас нет, поэтому текущую позицию берём из событий плеера.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      let payload: unknown;
      try { payload = JSON.parse(event.data); } catch { return; }
      const msg = payload as {
        type?: string;
        data?: { time?: number; currentTime?: number };
        event?: string;
        info?: { currentTime?: number };
      };
      const time = msg.type === 'player:currentTime'
        ? msg.data?.time ?? msg.data?.currentTime
        : msg.event === 'infoDelivery' ? msg.info?.currentTime : undefined;
      if (typeof time !== 'number' || time <= 0) return;
      at.current = time;
      if (!playing.current) {
        playing.current = true;
        // Звук возвращаем только когда картинка уже пошла.
        if (!soundOffRef.current) send('unmute');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [send]);

  // Сторож автозапуска: если плеер встал на своей кнопке Play, жмём его сами.
  useEffect(() => {
    let tries = 0;
    const id = window.setInterval(() => {
      if (playing.current || pausedRef.current) {
        window.clearInterval(id);
        return;
      }
      if (tries >= 6) {
        // Плеер не ответил: открываем ему клики, иначе запустить его будет нечем.
        window.clearInterval(id);
        setShielded(false);
        return;
      }
      tries++;
      send('mute');
      send('play');
    }, 1200);
    return () => window.clearInterval(id);
  }, [send]);

  const onFrameLoad = useCallback(() => {
    if (source.provider !== 'youtube') return;
    // Без этого YouTube не присылает infoDelivery с текущим временем.
    frame.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }),
      '*'
    );
  }, [source.provider]);

  const seekBy = useCallback((delta: number) => {
    const next = Math.min(endAt, Math.max(startAt, at.current + delta));
    at.current = next;
    send('seek', next);
  }, [endAt, send, startAt]);

  const togglePlay = useCallback(() => {
    const next = !pausedRef.current;
    pausedRef.current = next;
    send(next ? 'pause' : 'play');
    setPaused(next);
  }, [send]);

  const toggleSound = useCallback(() => {
    const next = !soundOffRef.current;
    soundOffRef.current = next;
    send(next ? 'mute' : 'unmute');
    setSoundOff(next);
  }, [send]);

  const hideTimer = useRef(0);
  const revealControls = useCallback(() => {
    setControlsOn(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setControlsOn(false), 3000);
  }, []);

  useEffect(() => {
    hideTimer.current = window.setTimeout(() => setControlsOn(false), 3000);
    return () => window.clearTimeout(hideTimer.current);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const key = hotkeyChar(event);
      if ([' ', 'm', 'f', 'ArrowLeft', 'ArrowRight'].includes(key) || event.code === 'Space') revealControls();

      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        event.preventDefault();
        seekBy(key === 'ArrowLeft' ? -10 : 10);
        return;
      }
      if (key === ' ' || event.code === 'Space') {
        event.preventDefault();
        togglePlay();
        return;
      }
      if (key === 'm') {
        event.preventDefault();
        toggleSound();
        return;
      }
      if (key === 'f') {
        event.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [revealControls, seekBy, toggleFullscreen, togglePlay, toggleSound]);

  return (
    <div className={`vplayer${isFullscreen ? ' is-fullscreen' : ''}${pseudo ? ' is-pseudoFullscreen' : ''}`} ref={container}>
      <div className="vplayer__mount">
        <iframe
          ref={frame}
          src={embedUrl(source)}
          title={label}
          onLoad={onFrameLoad}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div
        className="vplayer__contentShield"
        role="application"
        tabIndex={0}
        aria-label="Плеер: стрелки влево и вправо — перемотка, пробел — пауза, M — звук, F — полный экран"
        onClick={(event) => { event.currentTarget.focus(); revealControls(); }}
        onPointerMove={revealControls}
        style={{ position: 'absolute', zIndex: 2, inset: 0, background: 'transparent', pointerEvents: shielded ? 'auto' : 'none' }}
      />
      <div
        className={`vplayer__bar${controlsOn ? ' is-on' : ''}`}
        role="toolbar"
        aria-label="Управление плеером"
        onPointerDown={revealControls}
        onPointerMove={revealControls}
        onFocus={revealControls}
      >
        <button type="button" className="vplayer__barBtn" onClick={() => seekBy(-10)} aria-label="Назад 10 секунд">◀◀ 10</button>
        <button type="button" className="vplayer__barBtn" onClick={togglePlay} aria-label={paused ? 'Продолжить' : 'Пауза'}>{paused ? '▶' : '❙❙'}</button>
        <button type="button" className="vplayer__barBtn" onClick={() => seekBy(10)} aria-label="Вперёд 10 секунд">10 ▶▶</button>
        <button type="button" className="vplayer__barBtn" onClick={toggleSound} aria-label={soundOff ? 'Включить звук' : 'Выключить звук'}>{soundOff ? 'Звук' : 'Тихо'}</button>
        <button type="button" className="vplayer__barBtn" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Выйти из полного экрана' : 'Полный экран'}>{isFullscreen ? '✕ Экран' : '⛶ Экран'}</button>
      </div>
    </div>
  );
}

export function ExternalVideoPlayer({ source, label, poster }: {
  source: FilmVideoSource;
  label: string;
  poster?: string | null;
}) {
  if (source.provider === 'vk') {
    return <VkVideoPlayer source={source} label={label} poster={poster} />;
  }
  return <FramePlayer source={source} label={label} />;
}
