import { useCallback, useEffect, useRef, useState } from 'react';
import { Nostalgist } from 'nostalgist';
import { asset } from '../media/asset';
import { getRefreshRate, installFramePacer } from '../media/framePacer';
import { claimAudio } from '../media/playerContext';
import {
  MANUAL_SLOTS,
  getSlot,
  listSlots,
  migrateLegacy,
  putSlot,
  slotKey,
  type SaveRecord,
  type SaveSlot
} from '../media/saves';
import { startGamepadLoop, type PadButton } from '../media/gamepad';
import { SaveShelf } from './SaveShelf';
import { GamepadSetup } from './GamepadSetup';
import type { Rom, RomCore } from '../data/roms';

type Status = 'loading' | 'running' | 'paused' | 'error';

// Родная частота кадров приставки. RetroArch в браузере считает кадры по
// requestAnimationFrame, поэтому на мониторе быстрее 60 Гц игру надо притормаживать
// вручную — см. media/framePacer.ts.
const CORE_FPS: Record<RomCore, number> = {
  fceumm: 60.0988, // NES / Dendy, NTSC
  genesis_plus_gx: 59.9227, // Mega Drive, NTSC
  snes9x: 60.0988 // Super Nintendo, NTSC
};

// Сколько кнопок рисовать на сенсорном пульте. У Dendy их две, у Mega Drive три,
// у SNES четыре плюс курки. Лишние кнопки на телефоне только мешают.
const CORE_ACTIONS: Record<RomCore, PadButton[]> = {
  fceumm: ['b', 'a'],
  genesis_plus_gx: ['b', 'a', 'y'],
  snes9x: ['b', 'a', 'y', 'x', 'l', 'r']
};

const ACTION_LABEL: Record<PadButton, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  a: 'A',
  b: 'B',
  x: 'X',
  y: 'C',
  l: 'L',
  r: 'R',
  start: 'START',
  select: 'SEL'
};

// RetroArch в браузере считает свой GL-viewport ровно один раз — на старте ядра —
// и при смене размера канваса его НЕ пересчитывает (проверено: буфер 1200x900,
// viewport остаётся 784x600 и через 4 секунды). Именно поэтому при входе в полный
// экран картинка уезжала в угол: мы увеличивали буфер, а ядро продолжало рисовать
// в старый прямоугольник в левом нижнем углу (начало координат GL — снизу слева).
// Решение: буфер задаём один раз при запуске и больше не трогаем, а под любой экран
// его растягивает CSS (.emu__canvas — всегда 100% коробки 4:3).
function bufferSize() {
  const tall = Math.max(window.screen?.height ?? 0, window.innerHeight || 0, 720);
  // Ниже 720p картинка мылится на большом экране, выше 1440p — зря греем видеокарту:
  // исходник всё равно 320x224.
  const height = Math.min(1440, Math.round(tall));
  return { width: Math.round((height * 4) / 3), height };
}

const KEYS_P1: Array<[string, string]> = [
  ['← ↑ → ↓', 'Движение'],
  ['Z', 'Удар / прыжок (B)'],
  ['X', 'Огонь / действие (A)'],
  ['C', 'Третья кнопка (C / Y)'],
  ['V', 'Четвёртая (X)'],
  ['Q / W', 'Курки L / R'],
  ['Enter', 'Start'],
  ['Правый Shift', 'Select']
];

const KEYS_P2: Array<[string, string]> = [
  ['W A S D', 'Движение'],
  ['T', 'Удар / прыжок (B)'],
  ['Y', 'Огонь / действие (A)'],
  ['G', 'Третья кнопка (C / Y)'],
  ['H', 'Четвёртая (X)'],
  ['O', 'Start'],
  ['P', 'Select']
];

// Явная раскладка: без неё RetroArch берёт свои дефолты, и клавиши приходится угадывать.
const INPUT_CONFIG = {
  input_player1_up: 'up',
  input_player1_down: 'down',
  input_player1_left: 'left',
  input_player1_right: 'right',
  input_player1_b: 'z',
  input_player1_a: 'x',
  input_player1_y: 'c',
  input_player1_x: 'v',
  input_player1_l: 'q',
  input_player1_r: 'w',
  input_player1_start: 'enter',
  input_player1_select: 'rshift',

  input_player2_up: 'w',
  input_player2_down: 's',
  input_player2_left: 'a',
  input_player2_right: 'd',
  input_player2_b: 't',
  input_player2_a: 'y',
  input_player2_y: 'g',
  input_player2_x: 'h',
  input_player2_start: 'o',
  input_player2_select: 'p'
};

const AUTOSAVE_EVERY_MS = 30_000;

// Миниатюра для ячейки памяти. Скриншот ядра — это PNG во всю высоту буфера
// (до половины мегабайта), а в списке он виден карточкой 160 пикселей шириной.
async function makeThumb(source: Blob): Promise<Blob | undefined> {
  try {
    const bitmap = await createImageBitmap(source);
    const width = 192;
    const height = Math.max(1, Math.round((bitmap.height / bitmap.width) * width));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return await new Promise<Blob | undefined>((resolve) => {
      canvas.toBlob((blob) => resolve(blob ?? undefined), 'image/webp', 0.7);
    });
  } catch {
    return undefined;
  }
}

export function Emulator({ rom }: { rom: Rom }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const emuRef = useRef<Nostalgist | null>(null);
  const playedRef = useRef(0);
  const sessionStartRef = useRef(0);
  const [status, setStatus] = useState<Status>('loading');
  const [note, setNote] = useState('Вставляем картридж…');
  const [fx, setFx] = useState(false);
  const [displayHz, setDisplayHz] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [softFs, setSoftFs] = useState(false);
  const [slots, setSlots] = useState<SaveRecord[]>([]);
  const [resumeOffer, setResumeOffer] = useState<SaveRecord | null>(null);
  const [pads, setPads] = useState<string[]>([]);
  const [showPads, setShowPads] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const targetFps = CORE_FPS[rom.core] ?? 60;

  const refreshSlots = useCallback(async () => {
    setSlots(await listSlots(rom.id));
  }, [rom.id]);

  useEffect(() => {
    let cancelled = false;
    let detachPacer = () => {};

    async function boot() {
      try {
        // Две звуковые дорожки разом — это каша, поэтому кассетник ставим на паузу.
        claimAudio();
        await migrateLegacy();
        const response = await fetch(asset(rom.file));
        if (!response.ok) throw new Error(`Картридж не найден (${response.status})`);
        const fileContent = await response.blob();
        if (cancelled) return;

        setNote('Греется приставка…');

        // Родная «батарейка» картриджа: кормим её ядру ещё на старте, чтобы внутригровые
        // сохранения работали так, как задумывали авторы игры.
        const battery = await getSlot(rom.id, 'auto');
        const fps = CORE_FPS[rom.core] ?? 60;
        const refreshRate = await getRefreshRate();
        if (cancelled) return;
        // Герцовка может смениться прямо во время игры (окно перетащили на телевизор),
        // поэтому пейсер сам сообщает текущую частоту, а мы показываем её в статусе.
        detachPacer = installFramePacer(fps, refreshRate, (hz) => {
          if (cancelled) return;
          setDisplayHz((prev) => (Math.abs(prev - hz) > 2 ? hz : prev));
        });
        const nostalgist = await Nostalgist.launch({
          core: rom.core,
          rom: { fileName: rom.file.split('/').pop() ?? 'game.bin', fileContent },
          ...(battery?.sram ? { sram: battery.sram } : {}),
          element: canvasRef.current ?? undefined,
          // Фиксированный буфер 4:3 на всю сессию — см. bufferSize().
          size: bufferSize(),
          respondToGlobalEvents: true,
          retroarchConfig: {
            // без этого игра встаёт на паузу, как только фокус уходит с канваса
            pause_nonactive: false,
            savestate_auto_load: false,
            savestate_auto_save: false,
            video_smooth: false,
            // Видео и звук в браузере идут от requestAnimationFrame.
            // Подгонка звука под видео на не-60Гц экранах даёт треск — отключаем
            // и берём запас по буферу.
            audio_sync: false,
            audio_latency: 128,
            audio_rate_control: true,
            audio_rate_control_delta: 0.005,
            // vsync оставляем: он привязывает цикл к requestAnimationFrame.
            // Без него RetroArch уходит в EM_TIMING_SETIMMEDIATE и крутит игру
            // на максимальной скорости процессора.
            video_vsync: true,
            video_swap_interval: 1,
            video_refresh_rate: fps,
            video_frame_delay: 0,
            video_max_swapchain_images: 2,
            video_threaded: false,
            fastforward_ratio: 1,
            ...INPUT_CONFIG
          } as never,
          resolveCoreJs: (core) => asset(`cores/${core}_libretro.js`),
          resolveCoreWasm: (core) => asset(`cores/${core}_libretro.wasm`)
        });

        if (cancelled) {
          nostalgist.exit();
          return;
        }
        emuRef.current = nostalgist;
        const canvas = nostalgist.getCanvas();
        canvas.tabIndex = 0;
        canvas.focus();
        // хук для визуального QA (tools/probe.mjs)
        (window as unknown as { __vidikEmu?: Nostalgist }).__vidikEmu = nostalgist;
        sessionStartRef.current = Date.now();
        setStatus('running');
        setNote('Поехали.');

        const saved = await listSlots(rom.id);
        if (cancelled) return;
        setSlots(saved);
        // Самое свежее состояние предлагаем одной кнопкой, чтобы человек не искал ячейку.
        const freshest = saved.slice().sort((a, b) => b.savedAt - a.savedAt)[0];
        if (freshest) setResumeOffer(freshest);
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setNote(error instanceof Error ? error.message : 'Не удалось запустить игру');
      }
    }

    void boot();

    return () => {
      cancelled = true;
      try {
        emuRef.current?.exit();
      } catch {
        // emulator already gone
      }
      emuRef.current = null;
      detachPacer();
    };
  }, [rom]);

  // Пока эмулятор открыт — выключаем тяжёлую косметику сайта (см. styles.css).
  useEffect(() => {
    document.body.classList.add('emu-active');
    return () => document.body.classList.remove('emu-active');
  }, []);

  const toggle = useCallback(() => {
    const emu = emuRef.current;
    if (!emu) return;
    if (status === 'running') {
      emu.pause();
      playedRef.current += Date.now() - sessionStartRef.current;
      setStatus('paused');
    } else if (status === 'paused') {
      emu.resume();
      sessionStartRef.current = Date.now();
      setStatus('running');
    }
  }, [status]);

  const playedMs = useCallback(() => {
    const running = status === 'running' && sessionStartRef.current
      ? Date.now() - sessionStartRef.current
      : 0;
    return playedRef.current + running;
  }, [status]);

  // Собираем сразу всё: состояние, батарейку и картинку экрана.
  const writeSlot = useCallback(
    async (slot: SaveSlot, quiet = false) => {
      const emu = emuRef.current;
      if (!emu) return;
      try {
        const { state, thumbnail } = await emu.saveState();
        let sram: Blob | undefined;
        try {
          const battery = await emu.saveSRAM();
          if (battery && battery.size > 0) sram = battery;
        } catch {
          // ядро без батарейки — нормально
        }
        let thumb = thumbnail ? await makeThumb(thumbnail) : undefined;
        if (!thumb) {
          try {
            const shot = await emu.screenshot();
            thumb = shot ? await makeThumb(shot) : undefined;
          } catch {
            // скриншот не обязателен
          }
        }
        await putSlot({
          key: slotKey(rom.id, slot),
          romId: rom.id,
          slot,
          state,
          sram,
          thumb,
          savedAt: Date.now(),
          playedMs: playedMs()
        });
        await refreshSlots();
        if (!quiet) setNote('Сохранили. Можно идти ужинать.');
      } catch {
        if (!quiet) setNote('Не получилось сохранить — попробуй ещё раз.');
      }
    },
    [playedMs, refreshSlots, rom.id]
  );

  const readSlot = useCallback(
    async (slot: SaveSlot) => {
      const emu = emuRef.current;
      if (!emu) return;
      const record = await getSlot(rom.id, slot);
      if (!record) return;
      await emu.loadState(record.state);
      playedRef.current = record.playedMs;
      sessionStartRef.current = Date.now();
      setResumeOffer(null);
      setNote('Загрузили сохранёнку.');
    },
    [rom.id]
  );

  // Автосохранение: раз в полминуты и обязательно когда страницу сворачивают
  // или закрывают: именно там теряется прогресс чаще всего.
  useEffect(() => {
    if (status !== 'running') return;
    const timer = window.setInterval(() => void writeSlot('auto', true), AUTOSAVE_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === 'hidden') void writeSlot('auto', true);
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onHide);
      void writeSlot('auto', true);
    };
  }, [status, writeSlot]);

  // Геймпады. Браузер показывает их только после первого нажатия кнопки —
  // поэтому цикл живёт всю сессию и сам замечает подключение.
  useEffect(() => {
    if (status !== 'running' && status !== 'paused') return;
    return startGamepadLoop({
      onDown: (button, player) => emuRef.current?.pressDown({ button, player }),
      onUp: (button, player) => emuRef.current?.pressUp({ button, player }),
      onPadsChange: setPads
    });
  }, [status]);

  const restart = useCallback(() => {
    emuRef.current?.restart();
    playedRef.current = 0;
    sessionStartRef.current = Date.now();
    setResumeOffer(null);
    setStatus('running');
    setNote('С начала.');
  }, []);

  // Полный экран запрашиваем на внешней коробке, а не на рамке с картинкой:
  // иначе сенсорный пульт остаётся снаружи полноэкранного элемента и физически
  // не может быть показан — именно из-за этого на телефоне кнопки пропадали.
  const toggleFullscreen = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (softFs) {
      setSoftFs(false);
      setFullscreen(false);
      return;
    }
    // iOS Safari не умеет полный экран для обычных блоков: там растягиваемся
    // своими стилями (.emu--fs) — иначе кнопка просто ничего не делает.
    const request = root.requestFullscreen?.();
    if (!request) {
      setSoftFs(true);
      setFullscreen(true);
      return;
    }
    request.catch(() => {
      setSoftFs(true);
      setFullscreen(true);
    });
    void request.then(() => {
      // На телефоне играть удобно только боком. Android умеет зафиксировать
      // ориентацию в полном экране, iOS просто проигнорирует — ошибку глотаем.
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (value: string) => Promise<void>;
      };
      orientation?.lock?.('landscape').catch(() => {});
    });
  }, [softFs]);

  useEffect(() => {
    const onChange = () => {
      const native = Boolean(document.fullscreenElement);
      if (native) setSoftFs(false);
      setFullscreen(native || (!native && softFs));
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [softFs]);

  // В своём «полном экране» Escape браузер не обрабатывает сам.
  useEffect(() => {
    if (!softFs) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSoftFs(false);
      setFullscreen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [softFs]);

  // Геометрия канваса целиком на CSS. Две вещи, за которыми всё же надо следить:
  // 1) emscripten прописывает канвасу inline-размеры и леттербокс-паддинги,
  //    иногда с !important — это сильнее наших стилей, снимаем;
  // 2) при входе в полный экран RetroArch сам переделывает буфер под размер экрана
  //    и сам же добавляет чёрные поля до 4:3 внутри него. Значит, коробка на странице
  //    должна повторять стороны буфера, а не держать 4:3, иначе на широком
  //    телевизоре картинка сплющивается и съезжает.
  useEffect(() => {
    if (status !== 'running' && status !== 'paused') return;
    const screenBox = screenRef.current;
    const canvas = canvasRef.current;
    if (!screenBox || !canvas) return;

    /** Реальный GL-viewport ядра — только для диагностики. */
    const viewportOf = (el: HTMLCanvasElement): [number, number] | null => {
      const gl = (el.getContext('webgl2') ?? el.getContext('webgl')) as
        | WebGLRenderingContext
        | null;
      if (!gl) return null;
      const vp = gl.getParameter(gl.VIEWPORT) as Int32Array | null;
      if (!vp || vp[2] < 16 || vp[3] < 16) return null;
      return [vp[2], vp[3]];
    };

    const INLINE_JUNK = [
      'width',
      'height',
      'padding',
      'padding-left',
      'padding-right',
      'padding-top',
      'padding-bottom',
      'margin-left',
      'margin-top'
    ];

    const stripInline = () => {
      for (const prop of INLINE_JUNK) {
        if (canvas.style.getPropertyValue(prop)) canvas.style.removeProperty(prop);
      }
    };

    // Стороны коробки = стороны кадрового буфера: тогда пиксель буфера всегда
    // квадратный и ничего не может съехать — чем бы этот буфер ни стал.
    const syncAspect = () => {
      if (!canvas.width || !canvas.height) return;
      const ar = (canvas.width / canvas.height).toFixed(4);
      if (screenBox.style.getPropertyValue('--emu-ar') !== ar) {
        screenBox.style.setProperty('--emu-ar', ar);
      }
    };

    const sync = () => {
      stripInline();
      syncAspect();
    };

    sync();
    // И inline-стили, и размер буфера меняются атрибутами — ловим их оба.
    const observer = new MutationObserver(sync);
    observer.observe(canvas, {
      attributes: true,
      attributeFilter: ['style', 'width', 'height']
    });
    // На выходе из полного экрана RetroArch тоже пересчитывает буфер — но не сразу.
    const onFullscreen = () => {
      sync();
      window.setTimeout(sync, 400);
    };
    document.addEventListener('fullscreenchange', onFullscreen);

    // Ручка для диагностики из консоли браузера.
    (window as unknown as { __vidikEmuInfo?: () => unknown }).__vidikEmuInfo = () => {
      const rect = screenBox.getBoundingClientRect();
      return {
        buffer: `${canvas.width}x${canvas.height}`,
        cssBox: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
        viewport: viewportOf(canvas)?.join('x') ?? null,
        inline: canvas.getAttribute('style'),
        dpr: window.devicePixelRatio,
        screen: `${window.screen.width}x${window.screen.height}`,
        fullscreen: document.fullscreenElement?.className ?? null
      };
    };

    return () => {
      observer.disconnect();
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, [status]);

  const hold = (button: PadButton, down: boolean) => {
    const emu = emuRef.current;
    if (!emu) return;
    if (down) emu.pressDown({ button });
    else emu.pressUp({ button });
  };

  const padButton = (button: PadButton, extraClass = '') => (
    <button
      key={button}
      className={`emu__padBtn emu__padBtn--${button}${extraClass ? ` ${extraClass}` : ''}`}
      onPointerDown={(e) => {
        e.preventDefault();
        hold(button, true);
      }}
      onPointerUp={() => hold(button, false)}
      onPointerCancel={() => hold(button, false)}
      onPointerLeave={() => hold(button, false)}
      onContextMenu={(e) => e.preventDefault()}
      tabIndex={-1}
    >
      {ACTION_LABEL[button]}
    </button>
  );

  const actions = CORE_ACTIONS[rom.core] ?? ['b', 'a'];

  return (
    <div className={`emu${fullscreen ? ' emu--fs' : ''}`} ref={rootRef}>
      <div className="emu__frame crt">
        <div
          ref={screenRef}
          className={`crt__screen scanlines emu__screen${fx ? ' emu__screen--fx' : ''}`}
        >
          <canvas ref={canvasRef} className="emu__canvas" />
          {status === 'loading' || status === 'error' ? (
            <div className="emu__overlay pixel">{note}</div>
          ) : null}
          {status === 'paused' ? <div className="emu__overlay pixel">Пауза</div> : null}
          <div className="crt__glass" aria-hidden="true" />
        </div>
      </div>

      {resumeOffer && status === 'running' ? (
        <div className="emu__resume">
          <span className="mono">
            Есть сохранёнка от{' '}
            {new Date(resumeOffer.savedAt).toLocaleString('ru-RU', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
          <button className="btn btn--sm btn--primary" onClick={() => void readSlot(resumeOffer.slot)}>
            Продолжить
          </button>
          <button className="btn btn--sm" onClick={() => setResumeOffer(null)}>
            С начала
          </button>
        </div>
      ) : null}

      {/* Сенсорный пульт. В полном экране раскладывается по краям поверх картинки. */}
      <div className="emu__pad">
        <div className="emu__padSide emu__padSide--left">
          <div className="emu__dpad">
            {padButton('up')}
            {padButton('left')}
            {padButton('right')}
            {padButton('down')}
          </div>
        </div>

        <div className="emu__padSide emu__padSide--center">
          {padButton('select')}
          {padButton('start')}
        </div>

        <div className="emu__padSide emu__padSide--right">
          <div className="emu__actions">{actions.map((button) => padButton(button))}</div>
        </div>
      </div>

      {fullscreen ? (
        <button className="emu__fsExit pixel" onClick={toggleFullscreen}>
          ✕ Выйти
        </button>
      ) : null}

      <div className="row emu__controls" style={{ marginTop: 20 }}>
        <button className="btn btn--primary" onClick={toggle} disabled={status === 'loading' || status === 'error'}>
          {status === 'paused' ? 'Продолжить' : 'Пауза'}
        </button>
        <button className="btn" onClick={() => void writeSlot('s1')} disabled={status === 'loading' || status === 'error'}>
          Быстрое сохранение
        </button>
        <button className="btn" onClick={() => setShowMemory(true)} disabled={status === 'error'}>
          Память{slots.length ? ` · ${slots.length}` : ''}
        </button>
        <button className="btn" onClick={restart} disabled={status === 'loading' || status === 'error'}>
          Сброс
        </button>
        <button className="btn" data-qa="fullscreen" onClick={toggleFullscreen} disabled={status === 'error'}>
          На весь экран
        </button>
        <button className="btn" onClick={() => setShowPads(true)}>
          Геймпад{pads.length ? ` · ${pads.length}` : ': нет'}
        </button>
        <button
          className={`btn${fx ? ' btn--primary' : ''}`}
          onClick={() => setFx((v) => !v)}
          title="Старый кинескоп со строками и бликами. На слабом железе может тормозить."
        >
          {fx ? 'Кинескоп: вкл' : 'Кинескоп: выкл'}
        </button>
      </div>

      {status === 'running' || status === 'paused' ? (
        <p className="mono emu__note" style={{ marginTop: 12, color: 'var(--amber)' }}>
          {note}
          {displayHz > targetFps * 1.05
            ? ` · Экран ${Math.round(displayHz)} Гц — держим ${Math.round(targetFps)} кадров в секунду.`
            : ''}
          {pads.length ? ` · Геймпадов подключено: ${pads.length}` : ''}
        </p>
      ) : null}

      <div className="emu__keysWrap">
        <div>
          <div className="mono emu__keysTitle">Игрок 1</div>
          <div className="emu__keys">
            {KEYS_P1.map(([key, action]) => (
              <div className="emu__key" key={key}>
                <span className="pixel">{key}</span>
                <span className="mono">{action}</span>
              </div>
            ))}
          </div>
        </div>
        {rom.players === 2 ? (
          <div>
            <div className="mono emu__keysTitle">Игрок 2 · на той же клавиатуре</div>
            <div className="emu__keys">
              {KEYS_P2.map(([key, action]) => (
                <div className="emu__key" key={key}>
                  <span className="pixel">{key}</span>
                  <span className="mono">{action}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {showMemory ? (
        <SaveShelf
          rom={rom}
          slots={slots}
          manualSlots={MANUAL_SLOTS}
          onClose={() => setShowMemory(false)}
          onSave={(slot) => void writeSlot(slot)}
          onLoad={(slot) => void readSlot(slot)}
          onChanged={() => void refreshSlots()}
        />
      ) : null}

      {showPads ? <GamepadSetup pads={pads} onClose={() => setShowPads(false)} /> : null}
    </div>
  );
}
