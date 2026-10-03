import { useState } from 'react';
import { Link } from 'react-router-dom';
import { asset } from '../media/asset';
import { Modal, SectionHeader } from '../components/core';
import { stories, type Story } from '../data/stories';

export function StoriesPage() {
  const [active, setActive] = useState<Story | null>(null);

  return (
    <>
      <section className="hero vignette" style={{ minHeight: 'min(52vh, 460px)' }}>
        <div className="hero__media">
          <img src={asset('/images/stories/section-stories.webp')} alt="Школьная парта с тетрадью и наклейками" />
        </div>
        <div className="hero__inner container" style={{ paddingBottom: 48 }}>
          <div className="hero__kicker pixel">06 · Истории</div>
          <h1 className="display display--l" style={{ margin: '12px 0' }}>
            Дневник двора
          </h1>
          <p className="lead">
            Ключ на шнурке, карандаш в кассете, третий канал. То, что вспоминается без всякой фотографии.
          </p>
        </div>
      </section>

      <section className="section container">
        <SectionHeader index="Тетрадь" title="Открой любую страницу" />
        <div className="grid grid--3">
          {stories.map((s) => (
            <button className="card nb-card" key={s.id} onClick={() => setActive(s)}>
              <div className="card__media">
                <img src={asset(s.image)} alt={s.alt} loading="lazy" />
              </div>
              <div className="card__body">
                <span className="nb-card__when">{s.when}</span>
                <h3 className="card__title">{s.title}</h3>
                <p className="card__desc">{s.excerpt}</p>
                <div className="card__foot">
                  <span className="mono">{s.readTime}</span>
                  <span className="mono">Читать →</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {active ? (
        <Modal title={active.title} onClose={() => setActive(null)}>
          <article className="notebook">
            <div className="notebook__page notebook__page--left">
              <figure className="notebook__photo">
                <img src={asset(active.image)} alt={active.alt} />
              </figure>
              <ul className="notebook__margin" aria-label="Пометки на полях">
                {active.margin.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
            <div className="notebook__page notebook__page--right">
              <div className="notebook__date">{active.when}</div>
              <h3 className="notebook__title">{active.title}</h3>
              {active.body.map((p) => (
                <p className="notebook__text" key={p}>
                  {p}
                </p>
              ))}
              <div className="notebook__links">
                {active.links.map((l) => (
                  <Link key={l.to} className="btn btn--sm" to={l.to} onClick={() => setActive(null)}>
                    {l.label} →
                  </Link>
                ))}
                <button className="btn btn--sm btn--ghost" disabled title="Гостевая книга откроется скоро">
                  Рассказать свою
                </button>
              </div>
            </div>
          </article>
        </Modal>
      ) : null}
    </>
  );
}
