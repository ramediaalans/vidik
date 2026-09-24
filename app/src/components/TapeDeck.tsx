// Полка с кассетами для раздела «Музыка»: жмёшь трек — он играет в глобальном Webamp.
import { useMemo, useState } from 'react';
import { SectionHeader } from './core';
import { usePlayer } from '../media/playerContext';
import { tracks } from '../data/tracks';

function time(seconds: number): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function TapeDeck() {
  const { play, current, playing, status } = usePlayer();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks
      .map((track, index) => ({ track, index }))
      .filter(
        ({ track }) =>
          q === '' ||
          track.artist.toLowerCase().includes(q) ||
          track.title.toLowerCase().includes(q) ||
          (track.album ?? '').toLowerCase().includes(q)
      );
  }, [query]);

  if (tracks.length === 0) return null;

  const total = tracks.reduce((sum, t) => sum + t.duration, 0);
  const hours = Math.round(total / 360) / 10;

  return (
    <section className="section container">
      <SectionHeader index="Кассетник" title="Вставь кассету" />
      <p className="lead" style={{ marginBottom: 20 }}>
        {tracks.length} треков, {hours} часа звука. Плеер не выключается при переходе в другие разделы —
        сворачивай его в панель внизу и ходи по сайту под музыку.
      </p>

      <div className="row" style={{ marginBottom: 20 }}>
        <button className="btn btn--primary" onClick={() => play(0)}>
          {status === 'loading' ? 'Заряжаем…' : 'Включить всё подряд'}
        </button>
        <label className="mono" htmlFor="deck-q">
          Поиск
        </label>
        <input
          id="deck-q"
          className="btn"
          style={{ minWidth: 240, textTransform: 'none' }}
          placeholder="Исполнитель, песня или альбом"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <div className="source">
          <span>Такой песни на кассете нет. Попробуй короче запрос.</span>
        </div>
      ) : (
        <ol className="deck">
          {visible.map(({ track, index }) => {
            const isCurrent =
              current !== null && current.artist === track.artist && current.title === track.title;
            return (
              <li key={track.id} className={`deck__row${isCurrent ? ' deck__row--on' : ''}`}>
                <button className="deck__play" onClick={() => play(index)} aria-label={`Играть: ${track.artist} — ${track.title}`}>
                  {isCurrent && playing ? '‖' : '▶'}
                </button>
                <span className="deck__num mono">{String(index + 1).padStart(3, '0')}</span>
                <span className="deck__artist">{track.artist}</span>
                <span className="deck__title">{track.title}</span>
                <span className="deck__time mono">{time(track.duration)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
