import type { CatalogItem, MediaSource, ResolveResult } from './types';

/**
 * MediaResolver — выбирает способ показа контента.
 * Приоритет: официальный разрешённый embed → внешний официальный источник → любой источник → недоступно.
 * Мы никогда не обходим ограничения провайдера и не подменяем его плеер.
 */
export function resolveMedia(item: CatalogItem): ResolveResult {
  const embeddable = item.sources.find((s) => s.embedAllowed && s.embedUrl);
  if (embeddable) return { state: 'embed', source: embeddable };

  const official = item.sources.find((s) => s.official);
  if (official) return { state: 'external', source: official };

  const any = item.sources[0];
  if (any) return { state: 'external', source: any };

  return { state: 'unavailable' };
}

export function actionLabel(kind: CatalogItem['kind']): string {
  switch (kind) {
    case 'movie':
    case 'cartoon':
    case 'tv':
      return 'Смотреть';
    case 'music':
      return 'Слушать';
    case 'game':
      return 'Играть';
    case 'site':
      return 'Открыть';
    default:
      return 'Читать';
  }
}

export function sourceNote(source: MediaSource): string {
  return source.official ? `Источник: ${source.provider} · официальный` : `Источник: ${source.provider}`;
}
