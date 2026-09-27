import { useCallback, useEffect, useRef, useState } from 'react';
import type { FilmVideoSource } from '../data/films';

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
  const start = Math.max(0, source.start ?? 0);
  const endAt = source.endTrim ? Math.max(start, source.duration - source.endTrim) : null;

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

      p.on(e.INITED, () => {
        p.setVolume(1);
        p.unmute();
        if (start > 0) p.seek(start);
      });
      p.on(e.STARTED, () => {
        ending.current = false;
        if (!adActive.current && !soundPrimed.current) {
          p.setVolume(1);
          p.unmute();
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
      p.on(e.ADSTARTED, () => {
        adActive.current = true;
        soundPrimed.current = false;
        p.mute();
        setMode('loading');
      });
      p.on(e.ADCOMPLETED, () => {
        adActive.current = false;
        p.setVolume(1);
        p.unmute();
        if (start > 0) p.seek(start);
        setMode('loading');
      });
      p.on(e.RECOMMENDATIONS_LOADED, () => {
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
  }, [endAt, start]);

  const resume = useCallback(() => {
    ending.current = false;
    const p = player.current;
    if (p) {
      const target = pauseAt.current ?? p.getCurrentTime();
      pauseAt.current = null;
      p.seek(Math.max(start, target));
      p.setVolume(1);
      p.unmute();
      p.play();
    }
    setMode('playing');
  }, [start]);
  const replay = () => {
    ending.current = false;
    pauseAt.current = null;
    player.current?.seek(start);
    player.current?.setVolume(1);
    player.current?.unmute();
    player.current?.play();
    setMode('loading');
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const p = player.current;
      if (!p) return;

      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        event.preventDefault();
        const delta = event.code === 'ArrowLeft' ? -10 : 10;
        const current = pauseAt.current ?? p.getCurrentTime();
        const next = Math.min(endAt ?? source.duration, Math.max(start, current + delta));
        if (pauseAt.current !== null) pauseAt.current = next;
        else p.seek(next);
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        if (pauseAt.current === null) {
          pauseAt.current = p.getCurrentTime();
          p.mute();
          setMode('paused');
        } else {
          resume();
        }
        return;
      }
      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        if (p.isMuted()) p.unmute(); else p.mute();
        return;
      }
      if (event.key.toLowerCase() === 'f') {
        event.preventDefault();
        void container.current?.requestFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [endAt, resume, source.duration, start]);

  return (
    <div className="vplayer" ref={container}>
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
        onClick={(event) => event.currentTarget.focus()}
        style={{ position: 'absolute', zIndex: 2, inset: 0, background: 'transparent' }}
      />
      {mode !== 'playing' ? (
        <div
          className={`vplayer__privacy vplayer__privacy--${mode}`}
          style={poster ? { backgroundImage: `linear-gradient(rgba(0,0,0,.62), rgba(0,0,0,.82)), url(${poster})` } : undefined}
        >
          {mode === 'paused' ? (
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
