import { SectionHeader } from '../components/core';
import { PageHero } from '../v2/PageHero';
import { WallCalendar } from '../v2/WallCalendar';

export function YearsPage() {
  return (
    <>
      <PageHero
        compact
        index="09"
        kicker="По годам"
        title="Календарь на стене"
        lead="Отрывной, как на кухне у бабушки. Только листок здесь — целый год: что брали в прокате, что вставляли в приставку и что играло в магнитофоне."
        image="/images/hero/yard-golden.webp"
        alt="Двор спального района на закате"
      />

      <section className="section container">
        <SectionHeader
          index="1984 — 2005"
          title="Оторви листок"
          note="На листке — только то, что лежит у нас в коллекции за этот год. Всё кликается: кассеты открываются, картриджи запускаются, песни играют."
        />
        <WallCalendar />
      </section>
    </>
  );
}
