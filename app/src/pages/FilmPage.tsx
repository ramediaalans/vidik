// Карточка фильма или мультсериала с плеером.
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { asset } from '../media/asset';
import { claimAudio } from '../media/playerContext';
import { VibixPlayer } from '../components/VibixPlayer';
import { findFilm, salon, disney } from '../data/films';

export function FilmPage({ group }: { group: 'salon' | 'disney' }) {
  const { slug } = useParams();
  const film = findFilm(slug);
  const [on, setOn] = useState(false);
  const [season, setSeason] = useState(1);

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

  const start = () => {
    claimAudio();
    setOn(true);
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
        {seasons.length > 1 ? (
          <div className="row" style={{ marginBottom: 16 }}>
            <span className="mono">Сезон:</span>
            {seasons.map((s) => (
              <button
                key={s.season}
                className={`chip${season === s.season ? ' chip--active' : ''}`}
                onClick={() => setSeason(s.season)}
              >
                {s.season}
              </button>
            ))}
          </div>
        ) : null}

        {on ? (
          <VibixPlayer
            key={`${film.kpId}-${season}`}
            kpId={film.kpId}
            season={seasons.length ? season : undefined}
            label={`Плеер: ${film.title}`}
          />
        ) : (
          <div className="vplayer vplayer--off">
            {film.backdrop ? <img src={asset(film.backdrop)} alt="" aria-hidden="true" /> : null}
            <button className="btn btn--primary vplayer__start" onClick={start}>
              {group === 'salon' ? 'Вставить кассету ▶' : 'Включить мультик ▶'}
            </button>
          </div>
        )}

        {film.description ? (
          <div className="film-text">
            <div className="mono" style={{ marginBottom: 8 }}>О чём это</div>
            <p>{film.description}</p>
          </div>
        ) : null}

        <p className="muted" style={{ fontSize: 13, marginTop: 24 }}>
          Видео идёт с стороннего плеера-балансера. Файлы не хранятся на наших серверах.
        </p>
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
