import { useState } from 'react';
import { asset } from '../media/asset';
import { Modal, SectionHeader } from '../components/core';
import { stories, type Story } from '../data/extra';

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
            Коротко о быте
          </h1>
          <p className="lead">Тексты на три минуты о том, как выглядел обычный день.</p>
        </div>
      </section>

      <section className="section container">
        <SectionHeader index="Архив" title="Выбери историю" />
        <div className="grid grid--3">
          {stories.map((s) => (
            <button className="card" key={s.id} onClick={() => setActive(s)}>
              <div className="card__media">
                <img src={asset(s.image)} alt={s.alt} loading="lazy" />
              </div>
              <div className="card__body">
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
          <img
            src={asset(active.image)}
            alt={active.alt}
            style={{ borderRadius: 16, border: '1px solid var(--line)' }}
          />
          <div className="stack">
            <h3 className="display display--m">{active.title}</h3>
            {active.body.map((p) => (
              <p className="lead" key={p}>
                {p}
              </p>
            ))}
          </div>
        </Modal>
      ) : null}
    </>
  );
}
