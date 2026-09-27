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
    const start = Math.max(0, Math.floor(source.start ?? 0));
    return `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hd=2&autoplay=1&js_api=1&t=${start}`;
  }
  if (source.provider === 'rutube') {
    return `https://rutube.ru/play/embed/${source.id}/?autoStart=true`;
  }
  return `https://www.youtube-nocookie.com/embed/${source.id}?autoplay=1&rel=0&cc_load_policy=0`;
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
    return () => window.clearInterval(id);
  }, [adBlocked]);

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
        // Рекламный ролик отличается длительностью: это страховка, если AD-события не пришли.
        const duration = state.duration;
        const looksLikeAd = typeof duration === 'number' && duration > 0
          && Math.abs(duration - source.duration) > Math.max(60, source.duration * 0.15);
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
            <span className="mono">Реклама VK — переждём без звука…</span>
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

export function ExternalVideoPlayer({ source, label, poster }: {
  source: FilmVideoSource;
  label: string;
  poster?: string | null;
}) {
  if (source.provider === 'vk') {
    return <VkVideoPlayer source={source} label={label} poster={poster} />;
  }
  return (
    <div className="vplayer">
      <div className="vplayer__mount">
        <iframe
          src={embedUrl(source)}
          title={label}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
}
