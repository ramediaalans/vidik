import { useCallback, useEffect, useRef, useState } from 'react';
import { Nostalgist } from 'nostalgist';
import { asset } from '../media/asset';
import { getRefreshRate, installFramePacer } from '../media/framePacer';
import { claimAudio } from '../media/playerContext';
import { getSave, putSave } from '../media/saves';
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

const PAD: Array<{ button: string; label: string; area: string }> = [
  { button: 'up', label: '↑', area: 'up' },
  { button: 'left', label: '←', area: 'left' },
  { button: 'right', label: '→', area: 'right' },
  { button: 'down', label: '↓', area: 'down' },
  { button: 'b', label: 'B', area: 'b' },
  { button: 'a', label: 'A', area: 'a' },
  { button: 'select', label: 'SEL', area: 'sel' },
  { button: 'start', label: 'START', area: 'start' }
];

export function Emulator({ rom }: { rom: Rom }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const emuRef = useRef<Nostalgist | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [note, setNote] = useState('Вставляем картридж…');
  const [hasSave, setHasSave] = useState(false);
  const [fx, setFx] = useState(false);
  const [displayHz, setDisplayHz] = useState(0);
  const targetFps = CORE_FPS[rom.core] ?? 60;

  useEffect(() => {
    let cancelled = false;
    let detachPacer = () => {};

    async function boot() {
      try {
        // Две звуковые дорожки разом — это каша, поэтому кассетник ставим на паузу.
        claimAudio();
        const response = await fetch(asset(rom.file));
        if (!response.ok) throw new Error(`Картридж не найден (${response.status})`);
        const fileContent = await response.blob();
        if (cancelled) return;

        setNote('Греется приставка…');

        // Меряем монитор до запуска ядра: главный цикл эмулятора надо ограничить
        // с самого первого кадра, иначе на 240 Гц игра стартует вчетверо быстрее.
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
          element: canvasRef.current ?? undefined,
          // Размером кадрового буфера управляет сам RetroArch по CSS-размеру канваса.
          // Если вмешаться и фиксировать буфер, в полноэкранном режиме GL-viewport
          // расходится с буфером и картинка уезжает в угол.
          size: 'auto',
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
        setStatus('running');
        setNote('Поехали.');
        setHasSave(Boolean(await getSave(rom.id)));
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
      setStatus('paused');
    } else if (status === 'paused') {
      emu.resume();
      setStatus('running');
    }
  }, [status]);

  const save = useCallback(async () => {
    const emu = emuRef.current;
    if (!emu) return;
    const { state } = await emu.saveState();
    await putSave(rom.id, state);
    setHasSave(true);
    setNote('Сохранили. Можно идти ужинать.');
  }, [rom.id]);

  const load = useCallback(async () => {
    const emu = emuRef.current;
    if (!emu) return;
    const state = await getSave(rom.id);
    if (!state) return;
    await emu.loadState(state);
    setNote('Загрузили сохранёнку.');
  }, [rom.id]);

  const restart = useCallback(() => {
    emuRef.current?.restart();
    setStatus('running');
    setNote('С начала.');
  }, []);

  const fullscreen = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void frame.requestFullscreen?.();
  }, []);

  // При входе и выходе из фуллскрина CSS-размер экрана меняется мгновенно,
  // а RetroArch сам об этом не узнаёт — кадр остаётся старого размера и висит
  // кусочком в углу. Следим за контейнером и сами пересчитываем буфер.
  useEffect(() => {
    if (status !== 'running' && status !== 'paused') return;
    const screen = screenRef.current;
    if (!screen) return;

    let timer = 0;

    const apply = () => {
      const emu = emuRef.current;
      const canvas = canvasRef.current;
      if (!emu || !canvas) return;
      const rect = screen.getBoundingClientRect();
      if (rect.width < 32 || rect.height < 32) return;
      // Буфер обязан совпадать с CSS-размером канваса. RetroArch берёт размер
      // GL-viewport из CSS (emscripten_get_element_css_size), а рисует в буфер по
      // атрибутам width/height. Любое расхождение — и картинка съезжает: раньше
      // здесь была планка 1440×1080, и на большом мониторе в полном экране
      // изображение уезжало вниз и обрезалось.
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      // Сравниваем с реальным состоянием канваса, а не с прошлым расчётом:
      // emscripten иногда сам меняет буфер, и мы должны это починить.
      if (canvas.width === width && canvas.height === height) return;
      try {
        emu.resize({ width, height });
      } catch {
        // ядро ещё не готово — пересчитаем на следующем событии
      }
    };

    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(apply, 120);
    };

    const observer = new ResizeObserver(schedule);
    observer.observe(screen);
    document.addEventListener('fullscreenchange', schedule);
    // Окно могли перетащить на другой экран с другим разрешением или DPI.
    window.addEventListener('resize', schedule);
    const guard = window.setInterval(apply, 1000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(guard);
      observer.disconnect();
      document.removeEventListener('fullscreenchange', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [status]);

  const hold = (button: string, down: boolean) => {
    const emu = emuRef.current;
    if (!emu) return;
    if (down) emu.pressDown({ button });
    else emu.pressUp({ button });
  };

  return (
    <div className="emu">
      <div className="emu__frame crt" ref={frameRef}>
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

      <div className="emu__pad" aria-hidden="true">
        {PAD.map((key) => (
          <button
            key={key.button}
            className={`emu__padBtn emu__padBtn--${key.area}`}
            onPointerDown={(e) => {
              e.preventDefault();
              hold(key.button, true);
            }}
            onPointerUp={() => hold(key.button, false)}
            onPointerLeave={() => hold(key.button, false)}
            onContextMenu={(e) => e.preventDefault()}
            tabIndex={-1}
          >
            {key.label}
          </button>
        ))}
      </div>

      <div className="row" style={{ marginTop: 20 }}>
        <button className="btn btn--primary" onClick={toggle} disabled={status === 'loading' || status === 'error'}>
          {status === 'paused' ? 'Продолжить' : 'Пауза'}
        </button>
        <button className="btn" onClick={() => void save()} disabled={status === 'loading' || status === 'error'}>
          Сохранить
        </button>
        <button className="btn" onClick={() => void load()} disabled={!hasSave}>
          Загрузить
        </button>
        <button className="btn" onClick={restart} disabled={status === 'loading' || status === 'error'}>
          Сброс
        </button>
        <button className="btn" data-qa="fullscreen" onClick={fullscreen} disabled={status === 'error'}>
          На весь экран
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
        <p className="mono" style={{ marginTop: 12, color: 'var(--amber)' }}>
          {note}
          {displayHz > targetFps * 1.05
            ? ` · Экран ${Math.round(displayHz)} Гц — держим ${Math.round(targetFps)} кадров в секунду.`
            : ''}
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
    </div>
  );
}
