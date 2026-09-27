// Настройка геймпада. Браузер не показывает странице геймпад, пока на нём
// не нажмут кнопку — это защита от отслеживания, и обойти её невозможно.
// Поэтому главное здесь — внятная подсказка, а не сама таблица кнопок.
import { useEffect, useRef, useState } from 'react';
import { Modal } from './core';
import {
  DEFAULT_MAP,
  captureButton,
  loadMap,
  resetMap,
  saveMap,
  type PadButton
} from '../media/gamepad';

const ROWS: Array<{ button: PadButton; title: string }> = [
  { button: 'up', title: 'Вверх' },
  { button: 'down', title: 'Вниз' },
  { button: 'left', title: 'Влево' },
  { button: 'right', title: 'Вправо' },
  { button: 'b', title: 'B · прыжок' },
  { button: 'a', title: 'A · огонь' },
  { button: 'y', title: 'C / Y · третья' },
  { button: 'x', title: 'X · четвёртая' },
  { button: 'l', title: 'Курок L' },
  { button: 'r', title: 'Курок R' },
  { button: 'start', title: 'Start' },
  { button: 'select', title: 'Select' }
];

export function GamepadSetup({ pads, onClose }: { pads: string[]; onClose: () => void }) {
  const [map, setMap] = useState(() => loadMap());
  const [waiting, setWaiting] = useState<PadButton | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const indexOf = (button: PadButton) => {
    const hit = Object.entries(map).find(([, value]) => value === button);
    return hit ? Number(hit[0]) : null;
  };

  const bind = (button: PadButton) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setWaiting(button);
    captureButton(controller.signal)
      .then((index) => {
        setMap((prev) => {
          const next: Record<number, PadButton> = {};
          // Один индекс — одно действие, иначе одной кнопкой будет два события.
          for (const [key, value] of Object.entries(prev)) {
            if (Number(key) !== index && value !== button) next[Number(key)] = value;
          }
          next[index] = button;
          saveMap(next);
          return next;
        });
        setWaiting(null);
      })
      .catch(() => setWaiting(null));
  };

  return (
    <Modal title="Геймпад" onClose={onClose}>
      {pads.length ? (
        <ul className="padList mono">
          {pads.map((name, index) => (
            <li key={name}>
              Игрок {index + 1}: {name}
            </li>
          ))}
        </ul>
      ) : (
        <p className="lead">
          Геймпад пока не виден. Подключи его проводом или по Bluetooth и нажми любую
          кнопку на нём — браузер показывает геймпад только после первого нажатия.
        </p>
      )}

      <p className="mono" style={{ marginTop: 16 }}>
        Два геймпада работают сразу: первый подключённый — игрок 1, второй — игрок 2.
        Левый стик дублирует крестовину.
      </p>

      <div className="padGrid" style={{ marginTop: 20 }}>
        {ROWS.map((row) => {
          const index = indexOf(row.button);
          return (
            <div className="padGrid__row" key={row.button}>
              <span className="mono">{row.title}</span>
              <button
                className={`btn btn--sm${waiting === row.button ? ' btn--primary' : ''}`}
                onClick={() => bind(row.button)}
              >
                {waiting === row.button
                  ? 'жми кнопку…'
                  : index === null
                    ? 'не назначена'
                    : `кнопка ${index}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="row" style={{ marginTop: 20 }}>
        <button
          className="btn btn--sm"
          onClick={() => {
            resetMap();
            setMap({ ...DEFAULT_MAP });
          }}
        >
          Сбросить на стандартную
        </button>
      </div>
    </Modal>
  );
}
