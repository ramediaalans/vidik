// Глобальный кассетник на Webamp (порт Winamp 2).
//
// Webamp рисует себя в собственный #webamp в конце <body>, вне дерева React.
// Именно поэтому музыка не обрывается при переходе между разделами: роутер
// пересобирает страницу, а плеер живёт рядом и ничего об этом не знает.
// Сворачивание — это display:none на #webamp (см. styles.css), звук при этом идёт.
// Сам бандл Webamp тяжёлый, поэтому грузится лениво — по первому клику.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type Webamp from 'webamp';
import { asset } from './asset';
import { AUDIO_CLAIM_EVENT, PlayerContext, usePlayer } from './playerContext';
import type { PlayerStatus as Status } from './playerContext';
import { tracks } from '../data/tracks';

export function PlayerProvider({ children }: { children: ReactNode }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const webampRef = useRef<Webamp | null>(null);
  const bootRef = useRef<Promise<Webamp | null> | null>(null);
  const closedRef = useRef(false);
  const [status, setStatus] = useState<Status>('idle');
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState<{ artist: string; title: string } | null>(null);

  useEffect(() => {
    document.body.classList.toggle('webamp-hidden', !visible);
    return () => document.body.classList.remove('webamp-hidden');
  }, [visible]);

  const boot = useCallback(async (): Promise<Webamp | null> => {
    if (webampRef.current) return webampRef.current;
    if (bootRef.current) return bootRef.current;
    const anchor = anchorRef.current;
    if (!anchor || tracks.length === 0) return null;

    setStatus('loading');
    bootRef.current = (async () => {
      try {
        const { default: WebampCtor } = await import('webamp');
        if (!WebampCtor.browserIsSupported()) {
          setStatus('error');
          return null;
        }
        const webamp = new WebampCtor({
          initialTracks: tracks.map((track) => ({
            url: asset(track.file),
            duration: track.duration || undefined,
            metaData: { artist: track.artist, title: track.title }
          })),
          enableHotkeys: false,
          enableMediaSession: true
        });

        webamp.onMinimize(() => setVisible(false));
        webamp.onClose(() => {
          closedRef.current = true;
          setVisible(false);
          setPlaying(false);
        });
        webamp.onTrackDidChange((track) => {
          setCurrent(
            track
              ? { artist: track.metaData.artist ?? '', title: track.metaData.title ?? '' }
              : null
          );
        });

        await webamp.renderWhenReady(anchor);
        // Webamp вешает своё окно в конец <body> с z-index 0 — там оно прячется под шапкой
        // и уезжает при прокрутке. Переносим в свой якорь (position: fixed, z-index 70).
        const node = document.getElementById('webamp');
        if (node && node.parentElement !== anchor) anchor.appendChild(node);
        webampRef.current = webamp;
        setStatus('ready');
        return webamp;
      } catch {
        setStatus('error');
        return null;
      }
    })();

    return bootRef.current;
  }, []);

  const play = useCallback(
    (index?: number) => {
      void (async () => {
        const webamp = await boot();
        if (!webamp) return;
        if (closedRef.current) {
          webamp.reopen();
          closedRef.current = false;
        }
        setVisible(true);
        if (typeof index === 'number') webamp.setCurrentTrack(index);
        webamp.play();
        setPlaying(true);
      })();
    },
    [boot]
  );

  const pause = useCallback(() => {
    webampRef.current?.pause();
    setPlaying(false);
  }, []);

  const toggleVisible = useCallback(() => {
    if (!webampRef.current) {
      play();
      return;
    }
    if (closedRef.current) {
      webampRef.current.reopen();
      closedRef.current = false;
      setVisible(true);
      return;
    }
    setVisible((v) => !v);
  }, [play]);

  // Webamp можно управлять и из своего окна — подглядываем реальное состоянией.
  useEffect(() => {
    if (status !== 'ready') return;
    const timer = window.setInterval(() => {
      const webamp = webampRef.current;
      if (webamp) setPlaying(webamp.getMediaStatus() === 'PLAYING');
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    const onClaim = () => {
      webampRef.current?.pause();
      setPlaying(false);
    };
    window.addEventListener(AUDIO_CLAIM_EVENT, onClaim);
    return () => window.removeEventListener(AUDIO_CLAIM_EVENT, onClaim);
  }, []);

  return (
    <PlayerContext.Provider value={{ status, visible, playing, current, play, pause, toggleVisible }}>
      <div ref={anchorRef} className="webamp-anchor" aria-hidden="true" />
      {children}
    </PlayerContext.Provider>
  );
}

/** Панель задач в духе Windows 95: свёрнутый плеер всегда под рукой. */
export function PlayerTaskbar() {
  const { status, visible, playing, current, play, pause, toggleVisible } = usePlayer();

  if (status === 'error' || tracks.length === 0) return null;

  const label =
    status === 'loading'
      ? 'Заряжаем кассету…'
      : current
        ? `${current.artist} — ${current.title}`
        : 'Кассетник · музыка 90-х';

  return (
    <div className={`taskbar${playing ? ' taskbar--playing' : ''}`} role="region" aria-label="Кассетник">
      <button
        className="taskbar__main"
        onClick={() => (status === 'ready' && playing ? pause() : play())}
        aria-label={playing ? 'Пауза' : 'Включить музыку'}
      >
        <span className="taskbar__eq" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="taskbar__text mono">{label}</span>
      </button>
      {status === 'ready' ? (
        <button
          className="taskbar__side pixel"
          onClick={toggleVisible}
          aria-label={visible ? 'Свернуть плеер' : 'Развернуть плеер'}
          title={visible ? 'Свернуть' : 'Развернуть'}
        >
          {visible ? '–' : '□'}
        </button>
      ) : null}
    </div>
  );
}
