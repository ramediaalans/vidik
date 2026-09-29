import { useEffect, useRef } from 'react';
import type { RomCore } from '../data/roms';
import type { PadButton } from '../media/gamepad';

// Сенсорный пульт. Показывается только на телефонах и планшетах (CSS: pointer: coarse).
//
// Почему раньше кнопки «тормозили»:
//  * каждая кнопка ловила pointerleave и отпускала нажатие — палец чуть дрогнул, и кнопка
//    отпущена, а новая не нажата;
//  * эмулятор опрашивает ввод раз в кадр, и слишком короткий тап (меньше кадра) просто
//    пропадал;
//  * подсветка шла через :active с задержкой, а не в момент касания.
// Здесь одно общее касание на весь пульт: палец можно вести по кнопкам, крестовина —
// одна поверхность с восемью направлениями, подсветка ставится напрямую в DOM.

type Logical = PadButton | 'turboB' | 'turboA';

const MIN_HOLD_MS = 45; // короткий тап должен пережить хотя бы кадр-другой эмулятора
const TURBO_HALF_MS = 33; // ~15 нажатий в секунду
const DIRS: PadButton[] = ['up', 'down', 'left', 'right'];

interface Props {
  core: RomCore;
  onPress: (button: PadButton, down: boolean) => void;
}

function Btn({ id, label, sub, className = '' }: { id: Logical; label: string; sub?: string; className?: string }) {
  return (
    <span className={`tpad__btn tpad__btn--${id} ${className}`} data-btn={id} role="button" aria-label={label}>
      <b>{label}</b>
      {sub ? <small>{sub}</small> : null}
    </span>
  );
}

export function TouchPad({ core, onPress }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const count = new Map<Logical, number>();
    const downAt = new Map<Logical, number>();
    const releaseTimer = new Map<Logical, number>();
    const turbo = new Map<Logical, number>();
    // что держит каждый палец
    const fingers = new Map<number, { dpad: boolean; held: Set<Logical> }>();

    const light = (id: string, on: boolean) => {
      root.querySelectorAll(`[data-btn="${id}"], [data-arrow="${id}"]`).forEach((el) => el.classList.toggle('is-on', on));
    };

    const fire = (button: PadButton, down: boolean) => onPress(button, down);

    const turboTarget = (id: Logical): PadButton | null =>
      id === 'turboB' ? 'b' : id === 'turboA' ? 'a' : null;

    const startTurbo = (id: Logical, real: PadButton) => {
      let on = true;
      fire(real, true);
      turbo.set(
        id,
        window.setInterval(() => {
          on = !on;
          fire(real, on);
        }, TURBO_HALF_MS)
      );
    };

    const stopTurbo = (id: Logical, real: PadButton) => {
      const timer = turbo.get(id);
      if (timer !== undefined) window.clearInterval(timer);
      turbo.delete(id);
      fire(real, false);
    };

    const down = (id: Logical) => {
      const n = (count.get(id) ?? 0) + 1;
      count.set(id, n);
      if (n > 1) return;
      light(id, true);
      const pending = releaseTimer.get(id);
      if (pending !== undefined) {
        // кнопка ещё не была отпущена эмулятору — просто продолжаем держать
        window.clearTimeout(pending);
        releaseTimer.delete(id);
        return;
      }
      downAt.set(id, performance.now());
      const real = turboTarget(id);
      if (real) startTurbo(id, real);
      else fire(id as PadButton, true);
    };

    const up = (id: Logical) => {
      const n = (count.get(id) ?? 0) - 1;
      if (n > 0) {
        count.set(id, n);
        return;
      }
      count.set(id, 0);
      light(id, false);
      const real = turboTarget(id);
      if (real) {
        stopTurbo(id, real);
        return;
      }
      const wait = Math.max(0, MIN_HOLD_MS - (performance.now() - (downAt.get(id) ?? 0)));
      if (wait === 0) {
        fire(id as PadButton, false);
      } else {
        releaseTimer.set(
          id,
          window.setTimeout(() => {
            releaseTimer.delete(id);
            if ((count.get(id) ?? 0) === 0) fire(id as PadButton, false);
          }, wait)
        );
      }
    };

    const setHeld = (finger: { held: Set<Logical> }, next: Set<Logical>) => {
      for (const id of finger.held) if (!next.has(id)) up(id);
      for (const id of next) if (!finger.held.has(id)) down(id);
      finger.held = next;
    };

    const dirsAt = (x: number, y: number): Set<Logical> => {
      const pad = root.querySelector<HTMLElement>('[data-dpad]');
      const next = new Set<Logical>();
      if (!pad) return next;
      const r = pad.getBoundingClientRect();
      const nx = (x - (r.left + r.width / 2)) / (r.width / 2);
      const ny = (y - (r.top + r.height / 2)) / (r.height / 2);
      const dead = 0.2;
      if (Math.hypot(nx, ny) < dead) return next;
      // 8 направлений: диагональ, если вторая ось не меньше ~40% первой
      const ax = Math.abs(nx);
      const ay = Math.abs(ny);
      if (ax > ay * 0.42) next.add(nx < 0 ? 'left' : 'right');
      if (ay > ax * 0.42) next.add(ny < 0 ? 'up' : 'down');
      return next;
    };

    const arrowsLight = (next: Set<Logical>) => {
      for (const d of DIRS) root.querySelectorAll(`[data-arrow="${d}"]`).forEach((el) => el.classList.toggle('is-on', next.has(d)));
    };

    const buttonAt = (x: number, y: number): Logical | null => {
      const el = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-btn]');
      return el && root.contains(el) ? (el.dataset.btn as Logical) : null;
    };

    const onDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-btn], [data-dpad]');
      if (!target) return;
      e.preventDefault();
      try {
        root.setPointerCapture(e.pointerId);
      } catch {
        // капчур не обязателен
      }
      const finger = { dpad: target.hasAttribute('data-dpad'), held: new Set<Logical>() };
      fingers.set(e.pointerId, finger);
      if (finger.dpad) {
        const next = dirsAt(e.clientX, e.clientY);
        arrowsLight(next);
        setHeld(finger, next);
      } else {
        setHeld(finger, new Set([target.dataset.btn as Logical]));
      }
    };

    const onMove = (e: PointerEvent) => {
      const finger = fingers.get(e.pointerId);
      if (!finger) return;
      if (finger.dpad) {
        const next = dirsAt(e.clientX, e.clientY);
        arrowsLight(next);
        setHeld(finger, next);
      } else {
        const id = buttonAt(e.clientX, e.clientY);
        setHeld(finger, id ? new Set([id]) : new Set());
      }
    };

    const onEnd = (e: PointerEvent) => {
      const finger = fingers.get(e.pointerId);
      if (!finger) return;
      fingers.delete(e.pointerId);
      if (finger.dpad) arrowsLight(new Set());
      setHeld(finger, new Set());
    };

    const noMenu = (e: Event) => e.preventDefault();

    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onEnd);
    root.addEventListener('pointercancel', onEnd);
    root.addEventListener('lostpointercapture', onEnd);
    root.addEventListener('contextmenu', noMenu);

    return () => {
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onEnd);
      root.removeEventListener('pointercancel', onEnd);
      root.removeEventListener('lostpointercapture', onEnd);
      root.removeEventListener('contextmenu', noMenu);
      for (const timer of turbo.values()) window.clearInterval(timer);
      for (const timer of releaseTimer.values()) window.clearTimeout(timer);
      // ничего не оставляем зажатым
      for (const id of count.keys()) {
        const real = turboTarget(id);
        fire(real ?? (id as PadButton), false);
      }
    };
  }, [onPress]);

  const middle =
    core === 'genesis_plus_gx' ? (
      <>
        <Btn id="select" label="MODE" className="tpad__btn--pill" />
        <Btn id="start" label="START" className="tpad__btn--pill" />
      </>
    ) : (
      <>
        <Btn id="select" label="SELECT" className="tpad__btn--pill" />
        <Btn id="start" label="START" className="tpad__btn--pill" />
      </>
    );

  return (
    <div className={`tpad tpad--${core}`} ref={rootRef} aria-label="Экранный пульт">
      {core === 'snes9x' ? (
        <div className="tpad__shoulders">
          <Btn id="l" label="L" className="tpad__btn--pill" />
          <Btn id="r" label="R" className="tpad__btn--pill" />
        </div>
      ) : null}

      <div className="tpad__side tpad__side--left">
        <div className="tpad__dpad" data-dpad>
          <span className="tpad__cross" />
          <span className="tpad__arrow tpad__arrow--up" data-arrow="up" />
          <span className="tpad__arrow tpad__arrow--down" data-arrow="down" />
          <span className="tpad__arrow tpad__arrow--left" data-arrow="left" />
          <span className="tpad__arrow tpad__arrow--right" data-arrow="right" />
        </div>
      </div>

      <div className="tpad__mid">{middle}</div>

      <div className="tpad__side tpad__side--right">
        {core === 'fceumm' ? (
          // Как на пульте «Денди»: сверху турбо, снизу обычные B и A
          <div className="tpad__actions tpad__actions--nes">
            <Btn id="turboB" label="B" sub="турбо" className="tpad__btn--turbo" />
            <Btn id="turboA" label="A" sub="турбо" className="tpad__btn--turbo" />
            <Btn id="b" label="B" />
            <Btn id="a" label="A" />
          </div>
        ) : core === 'genesis_plus_gx' ? (
          // Шестикнопочный джойстик Mega Drive: сверху X Y Z, снизу A B C.
          // В ядре Genesis Plus GX они лежат на RetroPad так: A=Y, B=B, C=A, X=L, Y=X, Z=R.
          <div className="tpad__actions tpad__actions--md">
            <Btn id="l" label="X" className="tpad__btn--small" />
            <Btn id="x" label="Y" className="tpad__btn--small" />
            <Btn id="r" label="Z" className="tpad__btn--small" />
            <Btn id="y" label="A" />
            <Btn id="b" label="B" />
            <Btn id="a" label="C" />
          </div>
        ) : (
          <div className="tpad__actions tpad__actions--snes">
            <Btn id="x" label="X" />
            <Btn id="y" label="Y" />
            <Btn id="a" label="A" />
            <Btn id="b" label="B" />
          </div>
        )}
      </div>
    </div>
  );
}
