import { SectionHeader } from '../components/core';
import { asset } from '../media/asset';
import { RetroTV } from '../components/interactive';
import { channels } from '../data/extra';

export function TVPage() {
  return (
    <>
      <section className="hero vignette" style={{ minHeight: 'min(52vh, 460px)' }}>
        <div className="hero__media">
          <img src={asset('/images/tv/section-tv.webp')} alt="Небольшой телевизор на кухне" />
        </div>
        <div className="hero__inner container" style={{ paddingBottom: 48 }}>
          <div className="hero__kicker pixel">03 · Телевизор</div>
          <h1 className="display display--l" style={{ margin: '12px 0' }}>
            Сегодня в 19:30
          </h1>
          <p className="lead">
            Программа передач, которую читали в газете и обводили ручкой. Теперь её можно переключать.
          </p>
        </div>
      </section>

      <section className="section container">
        <SectionHeader index="Эфир" title="Шесть каналов" note="Переключай кнопками или выбирай из списка." />
        <RetroTV />
      </section>

      <section className="section container">
        <SectionHeader index="Расписание" title="Что идёт весь вечер" />
        <div className="grid grid--3">
          {channels.map((c) => (
            <article className="card" key={c.num}>
              <div className="card__media">
                <span className="card__year pixel">{c.num}</span>
                <img src={asset(c.image)} alt={c.alt} loading="lazy" />
              </div>
              <div className="card__body">
                <h3 className="card__title">{c.name}</h3>
                <div className="card__sub">{c.now}</div>
                <p className="card__desc">{c.caption}</p>
                <div className="card__foot">
                  <span className="mono">{c.next}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
