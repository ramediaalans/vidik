import { useMemo, useState } from 'react';
import { SectionHeader } from '../components/core';
import { PageHero } from '../v2/PageHero';
import { MixTape, useMix } from '../v2/MixTape';
import { Boombox } from '../v2/Boombox';
import { usePlayer } from '../media/playerContext';
import { tracks } from '../data/tracks';

function time(seconds: number): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MusicPage() {
  const { play, current, playing, status } = usePlayer();
  const mixState = useMix();
  const [artist, setArtist] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const artists = useMemo(() => {
    const count = new Map<string, number>();
    for (const t of tracks) count.set(t.artist, (count.get(t.artist) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks
      .map((track, index) => ({ track, index }))
      .filter(
        ({ track }) =>
          (artist === null || track.artist === artist) &&
          (q === '' ||
            track.artist.toLowerCase().includes(q) ||
            track.title.toLowerCase().includes(q) ||
            (track.album ?? '').toLowerCase().includes(q))
      );
  }, [artist, query]);

  const total = tracks.reduce((sum, t) => sum + t.duration, 0);
  const hours = Math.round(total / 360) / 10;
  const shuffle = () => play(Math.floor(Math.random() * tracks.length));

  return (
    <>
      <PageHero
        index="05"
        kicker="Музыка"
        title={<>Плёнка и <em>перезапись</em></>}
        lead="То, что переписывали друг у друга с кассеты на кассету и ловили по радио, держа палец на кнопке «Запись»."
        image="/images/music/section-music.webp"
        alt="Магнитофон и стопка кассет"
        compact
      />

      <section className="section container">
        <SectionHeader
          index="Магнитофон"
          title="Сборник для себя"
          note="Нажми «Сеть» — и кассета пошла. Двенадцать песен на девяностоминутку, по одной от каждого исполнителя."
        />
        <Boombox mix={mixState.mix} />
        <MixTape state={mixState} />
      </section>

      <section className="section container">
        <SectionHeader
          index="Кассетник"
          title="Вся полка"
          note={`${tracks.length} песен, ${hours} часа звука. Музыка не останавливается, когда уходишь в другой раздел.`}
        />

        <div className="row" style={{ marginBottom: 16 }}>
          <button className="btn btn--primary" onClick={() => play(visible[0]?.index ?? 0)}>
            {status === 'loading' ? 'Заряжаем…' : 'Включить с начала'}
          </button>
          <button className="btn" onClick={shuffle}>Наугад</button>
          <label className="mono" htmlFor="music-q">Поиск</label>
          <input
            id="music-q"
            className="btn"
            style={{ minWidth: 240, textTransform: 'none' }}
            placeholder="Исполнитель или песня"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="row" style={{ marginBottom: 28 }}>
          <span className="mono">Исполнители:</span>
          <button className={`chip${artist === null ? ' chip--active' : ''}`} onClick={() => setArtist(null)}>
            Все
          </button>
          {artists.map(([name, n]) => (
            <button
              key={name}
              className={`chip${artist === name ? ' chip--active' : ''}`}
              onClick={() => setArtist(artist === name ? null : name)}
            >
              {name}{n > 1 ? ` · ${n}` : ''}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="source">
            <span>Такой песни на кассете нет. Попробуй короче запрос.</span>
          </div>
        ) : (
          <ol className="deck">
            {visible.map(({ track, index }) => {
              const isCurrent = current !== null && current.artist === track.artist && current.title === track.title;
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
    </>
  );
}
