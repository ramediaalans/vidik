import { SectionHeader } from '../components/core';
import { PageHero } from '../v2/PageHero';
import { EveningBuilder } from '../v2/EveningBuilder';
import { MixTape } from '../v2/MixTape';

export function NostalgiaPage() {
  return (
    <>
      <PageHero
        index="07"
        kicker="Ностальгия"
        title={<>Собери <em>свой вечер</em></>}
        lead="Уроки потом. Сначала решим, что сегодня: приставка, мультики, кассета из проката или магнитофон на подоконнике."
        image="/images/hero/yard-golden.webp"
        alt="Двор панельных домов на закате"
        compact
      />

      <section className="section container">
        <SectionHeader
          index="Вечер"
          title="Расписание на сегодня"
          note="Три вопроса — и вечер расписан. Фильм, мультик и игра открываются сразу, песня включается в кассетнике."
        />
        <EveningBuilder />
      </section>

      <section className="section container">
        <SectionHeader
          index="Кассета"
          title="Сборник для себя"
          note="Двенадцать песен на девяностоминутку, по одной от каждого исполнителя. Нажми на строчку — заиграет."
        />
        <MixTape />
      </section>
    </>
  );
}
