// Поддержка геймпадов через Gamepad API.
//
// RetroArch в браузере сам геймпады не читает, поэтому опрашиваем их сами
// и дёргаем pressDown/pressUp. Беспроводные ничем не отличаются от USB:
// браузер отдаёт и те, и другие одинаково.
//
// Важное ограничение самого API: до первого нажатия кнопки на геймпаде
// браузер его не показывает странице — это защита от отслеживания, обойти нельзя.

export type PadButton =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'a'
  | 'b'
  | 'x'
  | 'y'
  | 'l'
  | 'r'
  | 'start'
  | 'select';

// Стандартная раскладка Gamepad API (индекс кнопки → кнопка приставки).
// На геймпаде Xbox/PlayStation нижняя кнопка (A / крест) — это индекс 0.
// На Dendy и Mega Drive «основной» кнопкой исторически была B (прыжок),
// поэтому нижнюю кнопку вешаем именно на B — так же, как сделано в RetroArch.
export const DEFAULT_MAP: Record<number, PadButton> = {
  0: 'b',
  1: 'a',
  2: 'y',
  3: 'x',
  4: 'l',
  5: 'r',
  8: 'select',
  9: 'start',
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right'
};

const AXIS_DEAD_ZONE = 0.45;
const MAP_STORAGE_KEY = 'vidik-pad-map';

export function loadMap(): Record<number, PadButton> {
  try {
    const raw = localStorage.getItem(MAP_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MAP };
    const parsed = JSON.parse(raw) as Record<string, PadButton>;
    const map: Record<number, PadButton> = {};
    for (const [index, button] of Object.entries(parsed)) map[Number(index)] = button;
    return Object.keys(map).length ? map : { ...DEFAULT_MAP };
  } catch {
    return { ...DEFAULT_MAP };
  }
}

export function saveMap(map: Record<number, PadButton>): void {
  try {
    localStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // приватный режим — живём без запоминания
  }
}

export function resetMap(): void {
  try {
    localStorage.removeItem(MAP_STORAGE_KEY);
  } catch {
    // нет так нет
  }
}

export type PadHandlers = {
  onDown: (button: PadButton, player: number) => void;
  onUp: (button: PadButton, player: number) => void;
  onPadsChange?: (names: string[]) => void;
};

// Один цикл опроса на все геймпады. Первый в списке — игрок 1, второй — игрок 2.
export function startGamepadLoop(handlers: PadHandlers): () => void {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return () => {};

  let frame = 0;
  let map = loadMap();
  // ключ «игрок:кнопка» → нажата ли сейчас
  const pressed = new Map<string, boolean>();
  let knownIds = '';

  const set = (button: PadButton, player: number, down: boolean) => {
    const key = `${player}:${button}`;
    if (pressed.get(key) === down) return;
    pressed.set(key, down);
    if (down) handlers.onDown(button, player);
    else handlers.onUp(button, player);
  };

  const tick = () => {
    const pads = Array.from(navigator.getGamepads?.() ?? []).filter(
      (pad): pad is Gamepad => Boolean(pad)
    );

    const ids = pads.map((pad) => pad.id).join('|');
    if (ids !== knownIds) {
      knownIds = ids;
      handlers.onPadsChange?.(pads.map((pad) => pad.id));
    }

    pads.slice(0, 2).forEach((pad, padIndex) => {
      const player = padIndex + 1;
      const state = new Map<PadButton, boolean>();

      pad.buttons.forEach((button, index) => {
        const target = map[index];
        if (!target) return;
        if (button.pressed || button.value > 0.5) state.set(target, true);
      });

      // Левый стик работает как крестовина: на большинстве современных
      // геймпадов крестовина маленькая и играть ею в Contra неудобно.
      const [axisX = 0, axisY = 0] = pad.axes;
      if (axisX < -AXIS_DEAD_ZONE) state.set('left', true);
      if (axisX > AXIS_DEAD_ZONE) state.set('right', true);
      if (axisY < -AXIS_DEAD_ZONE) state.set('up', true);
      if (axisY > AXIS_DEAD_ZONE) state.set('down', true);

      for (const button of Object.values(map)) set(button, player, state.get(button) === true);
    });

    // Геймпад отключили в момент зажатой кнопки — отпускаем за него,
    // иначе герой будет бежать в стену до конца времён.
    for (let player = pads.length + 1; player <= 2; player += 1) {
      for (const button of Object.values(map)) set(button, player, false);
    }

    frame = requestAnimationFrame(tick);
  };

  const onConnect = () => {
    map = loadMap();
  };
  window.addEventListener('gamepadconnected', onConnect);
  window.addEventListener('gamepaddisconnected', onConnect);
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener('gamepadconnected', onConnect);
    window.removeEventListener('gamepaddisconnected', onConnect);
  };
}

// Ждёт одно нажатие любой кнопки — нужно для переназначения раскладки.
export function captureButton(signal: AbortSignal): Promise<number> {
  return new Promise((resolve, reject) => {
    let frame = 0;
    const baseline = new Map<number, boolean>();
    let primed = false;

    const tick = () => {
      const pad = Array.from(navigator.getGamepads?.() ?? []).find(Boolean);
      if (pad) {
        if (!primed) {
          pad.buttons.forEach((button, index) => baseline.set(index, button.pressed));
          primed = true;
        } else {
          const hit = pad.buttons.findIndex(
            (button, index) => button.pressed && !baseline.get(index)
          );
          if (hit >= 0) {
            cancelAnimationFrame(frame);
            resolve(hit);
            return;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };

    signal.addEventListener('abort', () => {
      cancelAnimationFrame(frame);
      reject(new Error('отмена'));
    });
    frame = requestAnimationFrame(tick);
  });
}
