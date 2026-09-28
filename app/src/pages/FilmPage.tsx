// Карточка фильма или мультсериала с плеером.
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { asset } from '../media/asset';
import { claimAudio } from '../media/playerContext';
import { clearMark, formatMark, getMark, watchKey } from '../media/watchProgress';
import { ExternalVideoPlayer } from '../components/ExternalVideoPlayer';
import { TvSet } from '../components/TvSet';
import { findFilm, salon, disney } from '../data/films';

export function FilmPage({ group }: { group: 'salon' | 'disney' }) {
  const { slug } = useParams();
  const film = findFilm(slug);
  const [on, setOn] = useState(false);
  const [episode, setEpisode] = useState(0);
  // Секунда, с которой запускаем плеер.
  const [resumeAt, setResumeAt] = useState(0);

  // Закладка «докуда досмотрели» своя для каждой серии; читаем её прямо при отрисовке —
  // это дешёвое чтение localStorage и никакого лишнего состояния.
  const hasPlaylist = (film?.episodes?.length ?? 0) > 0;
  const progressKey = film ? watchKey(film.slug, hasPlaylist ? episode : 0) : '';
  const mark = progressKey ? getMark(progressKey) : null;

  const base = group === 'salon' ? '/videosalon' : '/disney-klub';
  const backLabel = group === 'salon' ? 'Назад на полку' : 'Назад в Клуб';

  if (!film) {
    return (
      <section className="section container">
        <div className="mono">Кассеты нет</div>
        <h1 className="display display--l" style={{ margin: '12px 0' }}>Такой записи нет</h1>
        <p className="lead">Может, её забрали соседи и не вернули.</p>
        <div className="row" style={{ marginTop: 24 }}>
          <Link className="btn btn--primary" to={base}>{backLabel}</Link>
        </div>
      </section>
    );
  }

  const neighbours = (group === 'salon' ? salon : disney).filter((f) => f.slug !== film.slug).slice(0, 6);
  const seasons = film.seasons ?? [];
  const totalEpisodes = seasons.reduce((n, s) => n + s.episodes, 0);

  // Если сериал разрезан на отдельные ролики — крутим выбранную серию.
  const playlist = film.episodes ?? [];
  const source = playlist[episode] ?? film.source;

  const start = (from: number) => {
    claimAudio();
    setResumeAt(from);
    setOn(true);
  };

  // «С начала» — закладку стираем сразу, чтобы она не вернула на старое место.
  const startOver = () => {
    if (progressKey) clearMark(progressKey);
    start(0);
  };

  const pickEpisode = (index: number) => {
    setEpisode(index);
    start(getMark(watchKey(film.slug, index))?.t ?? 0);
  };

  return (
    <>
      <section className="film-hero">
        {film.backdrop ? (
          <div className="film-hero__bg" aria-hidden="true">
            <img src={asset(film.backdrop)} alt="" />
          </div>
        ) : null}
        <div className="container film-hero__inner">
          <Link className="btn btn--sm" to={base} style={{ alignSelf: 'flex-start' }}>
            ← {backLabel}
          </Link>

          <div className="film-hero__grid">
            {film.poster ? (
              <img className="film-poster" src={asset(film.poster)} alt={`Постер: ${film.title}`} />
            ) : null}

            <div>
              <div className="mono">
                {group === 'salon' ? 'Видеосалон' : 'Дисней-клуб'} · {film.year}
              </div>
              <h1 className="display display--l" style={{ margin: '10px 0' }}>
                {film.title}
              </h1>
              {film.titleOrig ? <div className="muted" style={{ marginBottom: 14 }}>{film.titleOrig}</div> : null}

              <div className="row film-meta">
                {film.rating ? <span className="chip chip--active">★ {film.rating}</span> : null}
                {film.genres.map((g) => (
                  <span className="chip" key={g}>{g}</span>
                ))}
                {film.duration ? <span className="chip">{film.duration} мин</span> : null}
                {totalEpisodes ? <span className="chip">{seasons.length} сезона · {totalEpisodes} серий</span> : null}
                {film.countries.length ? <span className="chip">{film.countries.join(', ')}</span> : null}
              </div>

              {film.short ? <p className="lead" style={{ marginTop: 18 }}>{film.short}</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <TvSet title={film.title} year={film.year}>
          {on ? (
            <ExternalVideoPlayer
              key={`${source.provider}-${source.id}`}
              source={source}
              label={`Плеер: ${film.title}`}
              poster={film.backdrop ?? film.poster}
              progressKey={progressKey}
              resumeAt={resumeAt}
            />
          ) : (
            <div className="vplayer vplayer--off">
              {film.backdrop ? <img src={asset(film.backdrop)} alt="" aria-hidden="true" /> : null}
              <div className="vplayer__start">
                {mark ? <span className="vplayer__osdNote">Продолжим с {formatMark(mark.t)}</span> : null}
                <button className="vplayer__osd" onClick={() => start(mark?.t ?? 0)}>
                  <span className="vplayer__osdGlyph" aria-hidden="true">▶</span> PLAY
                </button>
                {mark ? (
                  <button className="vplayer__osdSub" onClick={startOver}>◀◀ с начала</button>
                ) : null}
              </div>
            </div>
          )}
        </TvSet>

        {playlist.length > 1 ? (
          <div style={{ marginTop: 14 }}>
            <div className="mono" style={{ marginBottom: 8 }}>Серии</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {playlist.map((e, i) => (
                <button
                  key={e.id}
                  type="button"
                  className={`chip${i === episode ? ' chip--active' : ''}`}
                  onClick={() => pickEpisode(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {on ? (
          <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>
            Управление: ←/→ — перемотка на 10 секунд · пробел — пауза · M — звук · F — полный экран.
          </p>
        ) : null}

        {film.description ? (
          <div className="film-text">
            <div className="mono" style={{ marginBottom: 8 }}>О чём это</div>
            <p>{film.description}</p>
          </div>
        ) : null}

      </section>

      {neighbours.length ? (
        <section className="section container section--tight">
          <div className="mono" style={{ marginBottom: 12 }}>Рядом на полке</div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {neighbours.map((f) => (
              <Link key={f.slug} className="chip" to={`${base}/${f.slug}`}>
                {f.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
