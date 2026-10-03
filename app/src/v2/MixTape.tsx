// «Сборник для себя»: вкладыш кассеты из настоящих треков кассетника.
// Клик по строке включает этот трек в общем плеере.
import { useMemo, useState } from 'react';
import { usePlayer } from '../media/playerContext';
import { ERAS, realTracks, rnd, trackEra } from './EveningBuilder';
import type { Era } from './EveningBuilder';

const SIDE = 6;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export type MixTrack = (typeof realTracks)[number];

export type MixState = {
  era: Era;
  setEra: (e: Era) => void;
  seed: number;
  setSeed: (fn: (s: number) => number) => void;
  mix: MixTrack[];
};

/** Состояние сборника вынесено, чтобы магнитофон и вкладыш играли один и тот же список. */
export function useMix(): MixState {
  const [era, setEra] = useState<Era>('mid');
  const [seed, setSeed] = useState(1);

  const mix = useMemo(() => {
    const pool = realTracks.filter((t) => trackEra(t) === era);
    const used = new Set<string>();
    const out: typeof pool = [];
    // Не больше одной песни одного исполнителя: так и собирали — «по хиту с каждого».
    const sorted = [...pool].sort((a, b) => rnd(seed, a.index) - rnd(seed, b.index));
    for (const t of sorted) {
      const who = t.artist.toLowerCase().replace(/[^a-zа-я]/g, '').slice(0, 8);
      if (used.has(who)) continue;
      used.add(who);
      out.push(t);
      if (out.length === SIDE * 2) break;
    }
    return out;
  }, [era, seed]);

  return { era, setEra, seed, setSeed, mix };
}

export function MixTape({ state }: { state?: MixState }) {
  const own = useMix();
  const { era, setEra, setSeed, mix } = state ?? own;
  const { play, current, playing } = usePlayer();

  const total = mix.reduce((s, t) => s + (t.duration || 0), 0);
  const sides = [mix.slice(0, SIDE), mix.slice(SIDE)];
  const isOn = (t: MixTrack) => playing && current?.title === t.title && current?.artist === t.artist;

  return (
    <div className="mix">
      <div className="mix__head">
        <div className="eve__q" role="radiogroup" aria-label="Какие годы">
          {ERAS.map((e) => (
            <button key={e.id} role="radio" aria-checked={era === e.id} className={`chip${era === e.id ? ' chip--active' : ''}`} onClick={() => setEra(e.id)}>
              {e.label}
            </button>
          ))}
        </div>
        <button className="btn mix__again" onClick={() => setSeed((s) => s + 1)}>
          Переписать заново
        </button>
      </div>

      <div className="mix__card">
        <div className="mix__label">
          <span className="mix__hand">Для себя · {ERAS.find((e) => e.id === era)!.label}</span>
          <span className="mono">C-90 · {fmt(total)}</span>
        </div>
        <div className="mix__sides">
          {sides.map((side, s) => (
            <ol key={s} className="mix__side">
              <li className="mix__sidename mono">Сторона {s === 0 ? 'А' : 'Б'}</li>
              {side.map((t, i) => (
                <li key={t.id}>
                  <button className={`mix__row${isOn(t) ? ' is-on' : ''}`} onClick={() => play(t.index)}>
                    <span className="mix__n mono">{String(i + 1).padStart(2, '0')}</span>
                    <span className="mix__hand">
                      {t.artist} — {t.title}
                    </span>
                    <span className="mix__dur mono">{isOn(t) ? '▶' : fmt(t.duration || 0)}</span>
                  </button>
                </li>
              ))}
            </ol>
          ))}
        </div>
      </div>
    </div>
  );
}
