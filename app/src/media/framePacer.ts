// RetroArch в сборке под Emscripten гонит эмуляцию по requestAnimationFrame:
// ровно один кадр приставки на каждый кадр браузера
// (gfx_ctx_emscripten_swap_interval -> emscripten_set_main_loop_timing(EM_TIMING_RAF, 1)).
// На мониторе 60 Гц это то, что нужно. На 120 / 144 / 240 Гц игра идёт
// в 2-4 раза быстрее: звук, музыка и геймплей уезжают вместе с кадрами.
//
// Здесь мы притормаживаем только колбэк главного цикла эмулятора
// (emscripten называет его Browser_mainLoop_runner) до частоты приставки.
// Вся остальная анимация страницы продолжает идти на полной частоте монитора.

const EMSCRIPTEN_RUNNER = 'Browser_mainLoop_runner';

let cachedRefreshRate = 0;

/** Частота обновления экрана в Гц, измеренная по интервалам requestAnimationFrame. */
export async function getRefreshRate(samples = 20): Promise<number> {
  if (cachedRefreshRate) return cachedRefreshRate;

  const deltas = await new Promise<number[]>((resolve) => {
    const out: number[] = [];
    let prev = 0;
    const tick = (time: number) => {
      if (prev) out.push(time - prev);
      prev = time;
      if (out.length < samples) window.requestAnimationFrame(tick);
      else resolve(out);
    };
    window.requestAnimationFrame(tick);
  });

  // Берём нижний квартиль, а не медиану: во время загрузки страницы часть кадров
  // теряется, и по среднему быстрый монитор легко выглядит как 60 Гц.
  const clean = deltas.filter((d) => d > 0.5 && d < 100).sort((a, b) => a - b);
  const quick = clean.length ? clean[Math.floor(clean.length * 0.25)] : 1000 / 60;
  cachedRefreshRate = Math.min(500, Math.max(30, 1000 / quick));
  return cachedRefreshRate;
}

/**
 * Ограничивает главный цикл эмулятора частотой targetFps.
 * Возвращает функцию снятия патча.
 */
export function installFramePacer(targetFps: number, refreshRate: number): () => void {
  const period = 1000 / targetFps;
  // Допуск — половина кадра монитора: без него на 144 Гц (не кратно 60)
  // мы бы выбрасывали лишние кадры и получали рывки. На 60 Гц допуск равен
  // половине кадра, так что ограничитель не срабатывает и ничего не ломает.
  const tolerance = Math.min(period / 2, Math.max(1000 / refreshRate / 2, 1));
  const original = window.requestAnimationFrame.bind(window);
  let due = 0;

  const patched = (callback: FrameRequestCallback): number => {
    if (callback.name !== EMSCRIPTEN_RUNNER) return original(callback);

    const gate = (time: number) => {
      if (!due) due = time;
      if (time < due - tolerance) {
        // рано: пропускаем кадр монитора, но держим цепочку живой —
        // сам emscripten перезапишется только после вызова колбэка
        original(gate);
        return;
      }
      due += period;
      // после провала (свернули вкладку, тяжёлый кадр) не догоняем ускорением
      if (due < time - period) due = time + period;
      callback(time);
    };

    return original(gate);
  };

  window.requestAnimationFrame = patched;

  return () => {
    if (window.requestAnimationFrame === patched) window.requestAnimationFrame = original;
  };
}
