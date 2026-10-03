// Общий кинематографичный заголовок разделов: полноэкранный кадр, OSD видеомагнитофона,
// время суток раздела, крупная типографика и реальные цифры из каталога.
import type { ReactNode } from 'react';
import { asset } from '../media/asset';
import { camDate } from './fx';

export type HeroFact = { v: ReactNode; l: string };

export function PageHero({
  index,
  time,
  kicker,
  title,
  lead,
  image,
  alt,
  facts,
  children,
  compact
}: {
  index?: string;
  time?: string;
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  image: string;
  alt: string;
  facts?: HeroFact[];
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className={`phero${compact ? ' phero--compact' : ''}`} data-od-id="page-hero">
      <div className="phero__media">
        <img src={asset(image)} alt={alt} fetchPriority="high" decoding="async" />
      </div>
      <div className="phero__shade" aria-hidden="true" />
      {time ? (
        <div className="phero__time" aria-hidden="true">
          {time}
        </div>
      ) : null}
      <div className="osd osd--br" aria-hidden="true">
        <span className="osd__date">{camDate()}</span>
      </div>
      <div className="container phero__inner">
        <div className="phero__kicker">
          {index ? <span className="phero__idx">{index}</span> : null}
          <span>{kicker}</span>
        </div>
        <h1 className="phero__title">{title}</h1>
        {lead ? <p className="phero__lead">{lead}</p> : null}
        {facts?.length ? (
          <dl className="phero__facts">
            {facts.map((f) => (
              <div key={f.l}>
                <dd>{f.v}</dd>
                <dt>{f.l}</dt>
              </div>
            ))}
          </dl>
        ) : null}
        {children}
      </div>
    </section>
  );
}

/** Кнопка с «кнопкой внутри»: стрелка в отдельном круге. */
export function Arrow() {
  return (
    <span className="btn__ico" aria-hidden="true">
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 12 12 4M6 4h6v6" />
      </svg>
    </span>
  );
}
