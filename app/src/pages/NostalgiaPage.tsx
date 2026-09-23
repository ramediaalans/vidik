import { useState } from 'react';
import { asset } from '../media/asset';
import { SectionHeader } from '../components/core';
import { CassettePlayer, NostalgiaGenerator, RetroComputer } from '../components/interactive';
import { MediaViewer } from '../components/MediaViewer';
import type { CatalogItem } from '../media/types';

export function NostalgiaPage() {
  const [active, setActive] = useState<CatalogItem | null>(null);

  return (
    <>
      <section className="hero vignette" style={{ minHeight: 'min(52vh, 460px)' }}>
        <div className="hero__media">
          <img src={asset('/images/hero/yard-golden.webp')} alt="Двор панельных домов на закате" />
        </div>
        <div className="hero__inner container" style={{ paddingBottom: 48 }}>
          <div className="hero__kicker pixel">07 · Ностальгия</div>
          <h1 className="display display--l" style={{ margin: '12px 0' }}>
            Собери свой вечер
          </h1>
          <p className="lead">
            Выбери годы и место — мы соберём подборку из фильма, игры и музыки. Потом поставь кассету.
          </p>
        </div>
      </section>

      <section className="section container">
        <SectionHeader index="Генератор" title="Твой вечер" />
        <NostalgiaGenerator onOpen={setActive} />
      </section>

      <section className="section container">
        <SectionHeader index="Кассета" title="Сборник на 90 минут" />
        <CassettePlayer />
      </section>

      <section className="section container">
        <SectionHeader index="Компьютер" title="Рабочий стол 98-го" />
        <RetroComputer />
      </section>

      {active ? <MediaViewer item={active} onClose={() => setActive(null)} /> : null}
    </>
  );
}
