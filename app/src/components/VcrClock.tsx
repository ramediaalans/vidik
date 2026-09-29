// Семисегментный дисплей видеомагнитофона: ЧЧ:ММ просмотра. Рисуем SVG-сегментами,
// поверх «запечённого» в картинку 12:00; цвет и наклон — как на фото деки.
import { useEffect, useState } from 'react';
import { useVcrMinutes, vcrIsLive } from '../media/vcrClock';

//        a
//      f   b
//        g
//      e   c
//        d
const SEGMENTS: Record<string, string> = {
  '0': 'abcdef', '1': 'bc', '2': 'abdeg', '3': 'abcdg', '4': 'bcfg',
  '5': 'acdfg', '6': 'acdefg', '7': 'abc', '8': 'abcdefg', '9': 'abcdfg'
};
const LINES: Record<string, [number, number, number, number]> = {
  a: [1.6, 1.1, 9.4, 1.1],
  b: [9.9, 1.8, 9.9, 9.6],
  c: [9.9, 11.4, 9.9, 19.2],
  d: [1.6, 19.9, 9.4, 19.9],
  e: [1.1, 11.4, 1.1, 19.2],
  f: [1.1, 1.8, 1.1, 9.6],
  g: [1.6, 10.5, 9.4, 10.5]
};

function Digit({ ch, x }: { ch: string; x: number }) {
  const on = SEGMENTS[ch] ?? '';
  return (
    <g transform={`translate(${x} 4)`}>
      {on.split('').map((s) => {
        const [x1, y1, x2, y2] = LINES[s];
        return <line key={s} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </g>
  );
}

export function VcrClock() {
  const minutes = useVcrMinutes();
  // Двоеточие мигает раз в секунду, пока кассета крутится.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);
  const colonOn = minutes === null || !vcrIsLive() || tick % 2 === 0;

  const total = minutes === null ? 12 * 60 : minutes;
  const hh = String(Math.floor(total / 60) % 100).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  const text = hh + mm;

  return (
    <div className="vcrclock" role="img" aria-label={`Счётчик: ${hh}:${mm}`}>
      <svg viewBox="0 0 68 30" preserveAspectRatio="none" aria-hidden="true">
        <g className="vcrclock__seg" transform="translate(2.5 0) skewX(-9)">
          <Digit ch={text[0]} x={5.6} />
          <Digit ch={text[1]} x={18.6} />
          <Digit ch={text[2]} x={37} />
          <Digit ch={text[3]} x={50} />
          {colonOn ? (
            <>
              <circle className="vcrclock__dot" cx={33.3} cy={11} r={1.15} />
              <circle className="vcrclock__dot" cx={33.3} cy={18.8} r={1.15} />
            </>
          ) : null}
        </g>
      </svg>
    </div>
  );
}
