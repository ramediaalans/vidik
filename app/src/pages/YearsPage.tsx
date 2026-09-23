import { useState } from 'react';
import { asset } from '../media/asset';
import { SectionHeader } from '../components/core';
import { YearSelector } from '../components/interactive';
import { MediaCard } from '../components/MediaCard';
import { MediaViewer } from '../components/MediaViewer';
import { catalog } from '../data/catalog';
import type { CatalogItem } from '../media/types';

export function YearsPage() {
  const [active, setActive] = useState<CatalogItem | null>(null);
  const byDecade = [
    { label: '1985–1994', items: catalog.filter((i) => i.year <= 1994) },
    { label: '1995–1999', items: catalog.filter((i) => i.year >= 1995 && i.year <= 1999) },
    { label: '2000–2005', items: catalog.filter((i) => i.year >= 2000) }
  ];

  return (
    <>
      <section className="hero vignette" style={{ minHeight: 'min(48vh, 420px)' }}>
        <div className="hero__media">
          <img src={asset('/images/hero/yard-golden.webp')} alt="Двор спального района на закате" />
        </div>
        <div className="hero__inner container" style={{ paddingBottom: 44 }}>
          <div className="hero__kicker pixel">09 · По годам</div>
          <h1 className="display display--l" style={{ margin: '12px 0' }}>
            Лента времени
          </h1>
          <p className="lead">От первого видеосалона до первого домашнего интернета.</p>
        </div>
      </section>

      <section className="section container">
        <SectionHeader
          index="По годам"
          title="Выбери год"
          note="Карточка года: что смотрели, во что играли, что слушали и какая была техника."
        />
        <YearSelector />
      </section>

      {byDecade.map((d) => (
        <section className="section container" key={d.label}>
          <SectionHeader index={d.label} title={`Архив ${d.label}`} />
          <div className="grid grid--4">
            {d.items.map((item) => (
              <MediaCard key={item.id} item={item} onOpen={setActive} />
            ))}
          </div>
        </section>
      ))}

      {active ? <MediaViewer item={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}
