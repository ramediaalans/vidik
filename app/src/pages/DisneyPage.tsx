// Дисней-клуб: воскресный блок мультсериалов — постеры и переход к плееру.
import { Link } from 'react-router-dom';
import { asset } from '../media/asset';
import { SectionHeader } from '../components/core';
import { disney } from '../data/films';

export function DisneyPage() {
  const episodes = disney.reduce(
    (n, f) => n + (f.seasons ?? []).reduce((m, s) => m + s.episodes, 0),
    0
  );

  return (
    <>
      <section className="hero vignette" style={{ minHeight: 'min(56vh, 520px)' }}>
        <div className="hero__media">
          <img src={asset('/images/cartoons/section-cartoons.webp')} alt="Телевизор с мультфильмом утром" />
        </div>
        <div className="hero__inner container" style={{ paddingBottom: 48 }}>
          <div className="hero__kicker pixel">02 · Дисней-клуб</div>
          <h1 className="display display--l" style={{ margin: '12px 0' }}>
            Воскресенье, половина девятого
          </h1>
          <p className="lead">
            {disney.length} мультсериалов и {episodes} серий — тот самый блок, ради которого вставали
            раньше, чем в школу. Выбирай и смотри любую серию.
          </p>
        </div>
      </section>

      <section className="section container">
        <SectionHeader index="Программа" title="Включай любой" />
        <div className="toon-grid">
          {disney.map((f) => {
            const eps = (f.seasons ?? []).reduce((m, s) => m + s.episodes, 0);
            return (
              <Link key={f.slug} className="toon" to={`/disney-klub/${f.slug}`}>
                <span className="toon__art">
                  {f.poster ? (
                    <img src={asset(f.poster)} alt={`Постер: ${f.title}`} loading="lazy" decoding="async" />
                  ) : null}
                  <span className="toon__year pixel">{f.year}</span>
                </span>
                <span className="toon__body">
                  <span className="toon__title">{f.title}</span>
                  <span className="toon__sub mono">
                    {eps ? `${eps} серий` : 'сериал'}
                    {f.rating ? ` · ★ ${f.rating}` : ''}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="section container section--tight">
        <div className="source">
          <span>Отечественная мультипликация и заметки об утреннем блоке — в архиве.</span>
          <Link className="btn btn--sm" to="/multfilmy">Архив мультфильмов</Link>
        </div>
      </section>
    </>
  );
}
