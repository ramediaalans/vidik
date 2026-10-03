// Дисней-клуб: воскресный блок мультсериалов — постеры и переход к плееру.
import { Link } from 'react-router-dom';
import { asset } from '../media/asset';
import { SectionHeader } from '../components/core';
import { PageHero } from '../v2/PageHero';
import { disney } from '../data/films';

export function DisneyPage() {
  const episodes = disney.reduce(
    (n, f) => n + (f.seasons ?? []).reduce((m, s) => m + s.episodes, 0),
    0
  );

  return (
    <>
      <PageHero
        index="08:30"
        time="08:30"
        kicker="Воскресенье, утро · Дисней-клуб"
        title={<>Воскресенье, <em>половина девятого</em></>}
        lead="Тот самый блок, ради которого вставали раньше, чем в школу. Выбирай мультсериал и включай подборку серий."
        image="/images/v2/ch-disney.webp"
        alt="Воскресное утро: солнце сквозь тюль, телевизор с мультфильмом, тарелка каши на ковре"
        facts={[
          { v: disney.length, l: 'мультсериалов' },
          { v: episodes, l: 'серий' }
        ]}
      />

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
    </>
  );
}
