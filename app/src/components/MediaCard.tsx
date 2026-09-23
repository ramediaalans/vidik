import type { CatalogItem } from '../media/types';
import { asset } from '../media/asset';
import { actionLabel } from '../media/resolver';

export function MediaCard({
  item,
  onOpen,
  tag
}: {
  item: CatalogItem;
  onOpen: (item: CatalogItem) => void;
  tag?: string;
}) {
  const subtitle =
    item.kind === 'music'
      ? `${item.artist} · ${item.genre}`
      : item.kind === 'game'
        ? `${item.platform} · ${item.genre}`
        : item.genre;

  return (
    <article className="card">
      <button
        type="button"
        className="card__mediaBtn"
        onClick={() => onOpen(item)}
        aria-label={`${actionLabel(item.kind)}: ${item.title}`}
      >
        <span className="card__media">
          <span className="card__year pixel">{item.year}</span>
          {tag ? <span className="card__tag">{tag}</span> : null}
          <img src={asset(item.image)} alt={item.imageAlt} loading="lazy" decoding="async" />
        </span>
      </button>
      <div className="card__body">
        <h3 className="card__title">{item.title}</h3>
        <div className="card__sub">{subtitle}</div>
        <p className="card__desc">{item.description}</p>
        <div className="card__foot">
          <span className="mono">{item.tags[0]}</span>
          <button className="btn btn--sm btn--primary" onClick={() => onOpen(item)}>
            {actionLabel(item.kind)}
          </button>
        </div>
      </div>
    </article>
  );
}
