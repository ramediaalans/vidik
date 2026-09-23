import { Modal } from './core';
import { asset } from '../media/asset';
import type { CatalogItem } from '../media/types';
import { resolveMedia, actionLabel, sourceNote } from '../media/resolver';

export function MediaViewer({ item, onClose }: { item: CatalogItem; onClose: () => void }) {
  const result = resolveMedia(item);

  return (
    <Modal title={`${item.title} · ${item.year}`} onClose={onClose}>
      <div className="crt">
        <div className="crt__screen scanlines">
          {result.state === 'embed' ? (
            <iframe
              className="embed"
              src={result.source.embedUrl}
              title={item.title}
              loading="lazy"
              allowFullScreen
              style={{ height: '100%' }}
            />
          ) : (
            <img src={asset(item.image)} alt={item.imageAlt} />
          )}
          <div className="crt__glass" aria-hidden="true" />
        </div>
      </div>

      <div className="stack">
        <h3 className="display display--m">{item.title}</h3>
        {item.original ? <div className="mono">{item.original}</div> : null}
        <p className="lead">{item.description}</p>
        <p className="lead" style={{ color: 'var(--amber)' }}>«{item.memory}»</p>
        <div className="row">
          {item.tags.map((t) => (
            <span className="chip" key={t}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {result.state === 'unavailable' ? (
        <div className="source">
          <span>Пока нет разрешённого источника. Мы не храним контент у себя.</span>
        </div>
      ) : (
        <div className="stack">
          <div className="source">
            <span>{sourceNote(result.source)}</span>
            <a
              className="btn btn--sm"
              href={result.source.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              {result.state === 'embed' ? 'Открыть у провайдера' : `${actionLabel(item.kind)} у провайдера`}
            </a>
          </div>
          {item.sources.length > 1 ? (
            <div className="row">
              <span className="mono">Где ещё искать:</span>
              {item.sources.slice(1).map((s) => (
                <a
                  key={s.id}
                  className="chip"
                  href={s.url}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {s.provider}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
