import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
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
import { TouchPad } from './TouchPad';
import { hotkeyChar, isTypingTarget } from '../media/hotkeys';
import { romCart } from '../data/rom-carts';
import { consoles, tvHole, TV_BOX_RATIO, TV_SCREEN_CENTER_X, type ConsoleKind } from '../data/consoles';
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

// Подписи клавиш — по надписям на реальных пультах. У Mega Drive в ядре Genesis Plus GX кнопки
// лежат на RetroPad так: A=Y, B=B, C=A, X=L, Y=X, Z=R, Mode=Select.
type KeyRow = [string, string];

function keyTable(core: RomCore, player: 1 | 2): KeyRow[] {
  const p1 = player === 1;
  const move: KeyRow = [p1 ? '← ↑ → ↓' : 'W A S D', 'Движение'];
  const start: KeyRow = [p1 ? 'Enter' : 'O', 'Start'];
  if (core === 'fceumm') {
    return [
      move,
      [p1 ? 'Z' : 'T', 'B'],
      [p1 ? 'X' : 'Y', 'A'],
      start,
      [p1 ? 'Правый Shift' : 'P', 'Select']
    ];
  }
  if (core === 'genesis_plus_gx') {
    return p1
      ? [
          move,
          ['C', 'A'],
          ['Z', 'B'],
          ['X', 'C'],
          ['Q', 'X'],
          ['V', 'Y'],
          ['E', 'Z'],
          start,
          ['Правый Shift', 'Mode']
        ]
      : [move, ['G', 'A'], ['T', 'B'], ['Y', 'C'], ['H', 'Y'], start, ['P', 'Mode']];
  }
  return [
    move,
    [p1 ? 'Z' : 'T', 'B'],
    [p1 ? 'X' : 'Y', 'A'],
    [p1 ? 'C' : 'G', 'Y'],
    [p1 ? 'V' : 'H', 'X'],
    ...(p1 ? ([['Q / E', 'L / R']] as KeyRow[]) : []),
    start,
    [p1 ? 'Правый Shift' : 'P', 'Select']
  ];
}

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
  // не W: она занята «вверх» второго игрока
  input_player1_r: 'e',
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
  input_player2_select: 'p',

  // у RetroArch F — свой полный экран; мы перехватываем F / «А» сами
  input_toggle_fullscreen: 'nul'
};

const AUTOSAVE_EVERY_MS = 30_000;
// Ядра без батарейки иногда так и не отвечают на saveSRAM — не ждём их дольше этого.
const SRAM_TIMEOUT_MS = 1_500;
// Финальное автосохранение при уходе со страницы: сколько ждём перед выключением ядра.
const FINAL_SAVE_TIMEOUT_MS = 4_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => resolve(undefined), ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

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
  const finalSaveRef = useRef<((emu: Nostalgist, romId: string) => Promise<void>) | null>(null);
  const playedRef = useRef(0);
  const sessionStartRef = useRef(0);
  // До нажатия PLAY эмулятор не грузим: как в видеосалоне, телевизор сначала выключен.
  const [started, setStarted] = useState(false);
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
    if (!started) return;
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
      const emu = emuRef.current;
      emuRef.current = null;
      detachPacer();
      if (!emu) return;
      const shutdown = () => {
        try {
          emu.exit();
        } catch {
          // emulator already gone
        }
      };
      // Уход со страницы (или смена игры) — сначала автослот, потом выключаем ядро.
      // emuRef уже обнулён, поэтому сохраняем через захваченный экземпляр.
      void withTimeout(finalSaveRef.current?.(emu, rom.id) ?? Promise.resolve(), FINAL_SAVE_TIMEOUT_MS)
        .catch(() => undefined)
        .finally(shutdown);
    };
  }, [rom, started]);

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
  const saveSnapshot = useCallback(
    async (emu: Nostalgist, romId: string, slot: SaveSlot) => {
      const { state, thumbnail } = await emu.saveState();
      let sram: Blob | undefined;
      try {
        const battery = await withTimeout(emu.saveSRAM(), SRAM_TIMEOUT_MS);
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
        key: slotKey(romId, slot),
        romId,
        slot,
        state,
        sram,
        thumb,
        savedAt: Date.now(),
        playedMs: playedMs()
      });
    },
    [playedMs]
  );

  // Для финального сохранения из cleanup эффекта запуска: там нужна свежая версия.
  useEffect(() => {
    finalSaveRef.current = (emu, romId) => saveSnapshot(emu, romId, 'auto');
  }, [saveSnapshot]);

  const writeSlot = useCallback(
    async (slot: SaveSlot, quiet = false) => {
      const emu = emuRef.current;
      if (!emu) return;
      try {
        await saveSnapshot(emu, rom.id, slot);
        await refreshSlots();
        if (!quiet) setNote('Сохранили. Можно идти ужинать.');
      } catch {
        if (!quiet) setNote('Не получилось сохранить — попробуй ещё раз.');
      }
    },
    [refreshSlots, rom.id, saveSnapshot]
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

  // F или «А» (та же клавиша в русской раскладке) — полный экран.
  // Ловим на фазе перехвата, чтобы эмулятор эту клавишу вообще не увидел.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (hotkeyChar(event) !== 'f' || isTypingTarget(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.type === 'keydown' && !event.repeat && status !== 'error') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
    };
  }, [status, toggleFullscreen]);

  const hold = useCallback((button: PadButton, down: boolean) => {
    const emu = emuRef.current;
    if (!emu) return;
    if (down) void emu.pressDown({ button });
    else void emu.pressUp({ button });
  }, []);

  const consoleKind: ConsoleKind = rom.platform.includes('NES')
    ? 'nes'
    : rom.platform.includes('Sega')
      ? 'md'
      : 'snes';
  const consoleSpec = consoles[consoleKind];
  const tvVars = {
    '--tv-ratio': TV_BOX_RATIO,
    '--hole-l': `${tvHole.left}%`,
    '--hole-t': `${tvHole.top}%`,
    '--hole-w': `${tvHole.width}%`,
    '--hole-h': `${tvHole.height}%`,
  } as CSSProperties;

  return (
    <div className={`emu${fullscreen ? ' emu--fs' : ''}`} ref={rootRef}>
      <div className="emu__stage">
      {/* Телевизор с приставкой: картинка с прозрачным экраном лежит ПОВЕРХ игры.
          В полном экране рамка прячется — остаётся одна игра. */}
      <div className="emu__tv" style={tvVars}>
        <div className="emu__tvHole">
          <div className="emu__frame">
            <div
              ref={screenRef}
              className={`crt__screen scanlines emu__screen${fx ? ' emu__screen--fx' : ''}`}
            >
              <canvas ref={canvasRef} className="emu__canvas" />
              {!started ? (
                <div className="emu__overlay emu__overlay--start">
                  <button className="vplayer__osd" onClick={() => setStarted(true)}>
                    <span className="vplayer__osdGlyph" aria-hidden="true">▶</span> PLAY
                  </button>
                </div>
              ) : status === 'loading' || status === 'error' ? (
                <div className="emu__overlay pixel">{note}</div>
              ) : null}
              {status === 'paused' ? <div className="emu__overlay pixel">Пауза</div> : null}
              <div className="crt__glass" aria-hidden="true" />
            </div>
          </div>
        </div>
        <img
          className="emu__tvImg"
          src={asset('/images/tv/tv-plain.webp')}
          alt=""
          draggable={false}
        />
        {/* Приставка нужного типа с вставленным картриджем — отдельный слой под экраном. */}
        <div
          className="emu__console"
          style={{
            width: `${consoleSpec.width * 100}%`,
            left: `${TV_SCREEN_CENTER_X - (consoleSpec.width * 100) / 2}%`,
            aspectRatio: `${consoleSpec.ratio[0]} / ${consoleSpec.ratio[1]}`,
          }}
        >
          <img className="emu__consoleImg" src={asset(consoleSpec.src)} alt="" draggable={false} />
          {romCart[rom.id] ? (
            <span
              className="emu__cart"
              style={{
                left: `${consoleSpec.cart.left}%`,
                width: `${consoleSpec.cart.width}%`,
                bottom: `${consoleSpec.cart.bottom}%`,
                clipPath: `inset(0 0 ${consoleSpec.cart.hide * 100}% 0)`,
                transform: `translateY(${consoleSpec.cart.hide * 100}%)`,
              }}
            >
              <img src={asset(romCart[rom.id])} alt="" draggable={false} />
            </span>
          ) : null}
          <img
            className="emu__consoleImg emu__consoleLip"
            src={asset(consoleSpec.src)}
            alt=""
            draggable={false}
            style={{ clipPath: `inset(${consoleSpec.lip.top}% 0 ${consoleSpec.lip.bottom}% 0)` }}
          />
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

      {/* Экранный пульт — только на сенсорных устройствах (скрыт CSS-ом при pointer: fine). */}
      <TouchPad core={rom.core} onPress={hold} />

      {fullscreen ? (
        <button className="emu__fsExit pixel" onClick={toggleFullscreen}>
          ✕ Выйти
        </button>
      ) : null}
      </div>

      <div className="emu__side">
      <div className="row emu__controls">
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
          {fullscreen ? 'Свернуть' : 'На весь экран'}<span className="emu__hk"> · F</span>
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
            {keyTable(rom.core, 1).map(([key, action]) => (
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
              {keyTable(rom.core, 2).map(([key, action]) => (
                <div className="emu__key" key={key}>
                  <span className="pixel">{key}</span>
                  <span className="mono">{action}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
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
