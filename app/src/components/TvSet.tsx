// Телевизор с видеомагнитофоном: плеер светится сквозь прозрачный кинескоп,
// а на кассете сверху — рукописная наклейка с названием того, что смотрим.
// Геометрия экрана и наклейки — в процентах от картинки (см. styles.css).
import type { ReactNode } from 'react';
import { asset } from '../media/asset';

export function TvSet({ title, year, children }: { title: string; year?: number; children: ReactNode }) {
  return (
    <div className="tvset">
      <div className="tvset__screen">{children}</div>
      <img
        className="tvset__frame"
        src={asset('/images/tv/tv-vcr-frame.webp')}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
      <div className="tvset__label" aria-hidden="true">
        <span className="tvset__labelTitle">{title}</span>
        {year ? <span className="tvset__labelYear">{year}</span> : null}
      </div>
    </div>
  );
}
