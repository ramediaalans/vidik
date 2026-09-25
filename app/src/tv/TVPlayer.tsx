import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { claimAudio } from '../media/playerContext';
import { tvData } from './data';
import {
  buildDay,
  hhmm,
  localDateISO,
  nowPlaying,
  secondsOfDay,
  slotLabel,
  type Slot
} from './schedule';

/** Субтитры в эфире 1997 года неуместны, а автоматические ещё и врут. */
function killCaptions(player: YTPlayer) {
  for (const mod of ['captions', 'cc']) {
    try {
      player.unloadModule(mod);
    } catch {
      // модуля субтитров может и не быть
    }
  }
}

/* ---------- минимальные типы IFrame Player API ---------- */
// Подключать @types/youtube ради десятка методов не стали.

type YTPlayer = {
  loadVideoById(o: { videoId: string; startSeconds?: number }): void;
  playVideo(): void;
  pauseVideo(): void;
  mute(): void;
  unMute(): void;
  setVolume(v: number): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  unloadModule(name: string): void;
  destroy(): void;
};

type YTNamespace = {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
};

type YTWindow = Window & {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
};

let apiPromise: Promise<YTNamespace> | null = null;

/** Скрипт API грузим один раз и только после клика (facade-паттерн). */
function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const w = window as YTWindow;
    if (w.YT?.Player) {
      resolve(w.YT);
      return;
    }
    const prev = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (w.YT?.Player) resolve(w.YT);
      else reject(new Error('Плеер YouTube загрузился не полностью'));
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => reject(new Error('Не удалось загрузить плеер YouTube'));
    document.head.appendChild(script);
  });
  return apiPromise;
}

/* ---------- компонент ---------- */

// Рассинхрон больше этого — перематываем. Меньше — не дёргаем картинку зря.
const DRIFT_TOLERANCE_SEC = 6;
// Последние секунды слота не начинаем ролик — всё равно не успеет прогрузиться.
const TAIL_SKIP_SEC = 5;

export type TVPlayerProps = {
  channelId: string;
  /** Сообщаем странице, что идёт сейчас — для подсветки строки в программе. */
  onSlotChange?: (slot: Slot | null) => void;
};

export function TVPlayer({ channelId, onSlotChange }: TVPlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const slotKeyRef = useRef<string>('');
  const skipRef = useRef<Set<string>>(new Set());

  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(() => localDateISO());
  const [slot, setSlot] = useState<Slot | null>(null);
  const [clock, setClock] = useState(() => hhmm(secondsOfDay()));

  const channel = tvData.channels[channelId];
  const slots = useMemo(() => buildDay(tvData, channelId, date), [channelId, date]);

  useEffect(() => onSlotChange?.(slot), [slot, onSlotChange]);

  /** Что должно идти прямо сейчас, с учётом пропущенных (битых) роликов. */
  const resolveNow = useCallback(() => {
    const np = nowPlaying(slots, secondsOfDay());
    if (!np) return null;
    let index = np.index;
    let offset = np.offsetSec;
    // Битый ролик или хвост слота — уходим вперёд по сетке.
    while (
      index < slots.length &&
      (skipRef.current.has(slots[index].id) ||
        slots[index].end - slots[index].start - offset < TAIL_SKIP_SEC)
    ) {
      index += 1;
      offset = 0;
    }
    if (index >= slots.length) return null;
    return { slot: slots[index], offset, index };
  }, [slots]);

  /* --- запуск плеера по клику --- */
  useEffect(() => {
    if (!on) return;
    const mount = mountRef.current;
    if (!mount) return;
    let cancelled = false;
    let created: YTPlayer | null = null;

    void (async () => {
      try {
        // Две звуковые дорожки разом — каша: глушим кассетник.
        claimAudio();
        const YT = await loadYouTubeApi();
        if (cancelled) return;

        // Подсовываем API собственный узел: он заменяет его на iframe,
        // а React не должен знать об этой подмене — иначе падёт на размонтировании.
        const host = document.createElement('div');
        mount.appendChild(host);

        const start = resolveNow();
        const player = new YT.Player(host, {
          host: 'https://www.youtube-nocookie.com',
          videoId: start?.slot.id,
          playerVars: {
            autoplay: 1,
            mute: 1, // без этого браузер не даст автозапуск
            playsinline: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            rel: 0,
            modestbranding: 1,
            iv_load_policy: 3,
            cc_load_policy: 0, // субтитры не показывать
            hl: 'ru',
            start: Math.floor(start?.offset ?? 0)
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              playerRef.current = player;
              player.mute();
              killCaptions(player);
              player.playVideo();
              setReady(true);
            },
            onError: () => {
              // Ролик удалили или закрыли встраивание — больше его не ставим.
              const bad = slotKeyRef.current.split('|')[0];
              if (bad) skipRef.current.add(bad);
              slotKeyRef.current = '';
            }
          }
        });
        // Ссылку для уборки берём сразу: до onReady может и не дойти.
        created = player;
        if (cancelled) {
          player.destroy();
          mount.replaceChildren();
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Плеер не запустился');
      }
    })();

    return () => {
      cancelled = true;
      try {
        created?.destroy();
      } catch {
        // плеер уже снесен
      }
      playerRef.current = null;
      slotKeyRef.current = '';
      mount.replaceChildren();
      setReady(false);
    };
  }, [on, channelId, resolveNow]);

  /* --- часы эфира: следим за слотом и рассинхроном --- */
  useEffect(() => {
    const tick = () => {
      // Часы обновляем только по смене минуты, чтобы не перерисовывать каждую секунду.
      const hm = hhmm(secondsOfDay());
      setClock((prev) => (prev === hm ? prev : hm));

      // Полночь: следующие сутки — свой seed, сетка пересчитается.
      const today = localDateISO();
      if (today !== date) {
        setDate(today);
        return;
      }

      const next = resolveNow();
      if (!next) return;
      setSlot((prev) => (prev?.id === next.slot.id && prev.start === next.slot.start ? prev : next.slot));

      const player = playerRef.current;
      if (!player) return;

      const key = `${next.slot.id}|${next.slot.start}`;
      if (key !== slotKeyRef.current) {
        slotKeyRef.current = key;
        player.loadVideoById({ videoId: next.slot.id, startSeconds: next.offset });
        // Новое видео — новый набор дорожек, глушим субтитры заново.
        killCaptions(player);
        return;
      }

      // Вкладка была в фоне, сеть подвисла — возвращаемся на реальное время эфира.
      const actual = player.getCurrentTime();
      if (actual > 0 && Math.abs(actual - next.offset) > DRIFT_TOLERANCE_SEC) {
        player.seekTo(next.offset, true);
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [date, resolveNow]);

  const toggleSound = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (muted) {
      player.unMute();
      player.setVolume(70);
    } else {
      player.mute();
    }
    setMuted((v) => !v);
  }, [muted]);

  if (!channel) return null;

  return (
    <div className="tv">
      <div className="tv__set crt">
        <div className="crt__screen scanlines tv__screen">
          {on ? (
            <div className="tv__mount" ref={mountRef} />
          ) : null}

          {!on ? (
            <button className="tv__power pixel" onClick={() => setOn(true)}>
              <span className="tv__powerDot" aria-hidden="true" />
              Включить телевизор
            </button>
          ) : null}

          {on && !ready && !error ? (
            <div className="tv__overlay pixel">Прогревается кинескоп…</div>
          ) : null}
          {error ? <div className="tv__overlay pixel">{error}</div> : null}

          {/* Стекло поверх картинки — без перехвата кликов (требование YouTube). */}
          <div className="crt__glass" aria-hidden="true" />

          {on && ready ? (
            <div className="tv__osd pixel" aria-live="polite">
              <span className="tv__osdNum">{channel.num}</span>
              <span>{channel.name}</span>
              <span className="tv__osdTime mono">{clock}</span>
            </div>
          ) : null}
        </div>

        {/* Боковая панель советского телевизора: динамик, ручки, шильдик. */}
        <div className="tv__panel" aria-hidden="true">
          <div className="tv__grille" />
          <div className="tv__dials">
            <span className="tv__dial" />
            <span className="tv__dial tv__dial--small" />
          </div>
          <div className="tv__brand pixel">ВИДИК</div>
          <span className={`tv__led${on && ready ? ' is-on' : ''}`} />
        </div>
      </div>

      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn btn--primary" onClick={toggleSound} disabled={!ready}>
          {muted ? 'Включить звук' : 'Звук выкл'}
        </button>
        {on ? (
          <button className="btn" onClick={() => setOn(false)}>
            Выключить
          </button>
        ) : null}
      </div>

      {slot ? (
        <p className="mono" style={{ marginTop: 12, color: 'var(--amber)' }}>
          Сейчас в эфире: {slot.label ?? slotLabel(slot)}
          {slot.kind === 'program' ? '' : ` · ${slot.title}`}
        </p>
      ) : null}
    </div>
  );
}
