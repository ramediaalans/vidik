export type MediaKind = 'movie' | 'cartoon' | 'game' | 'music' | 'tv' | 'story' | 'site';

export type MediaSource = {
  id: string;
  provider: string;
  type: 'video' | 'audio' | 'game' | 'document' | 'web';
  url: string;
  embedUrl?: string;
  embedAllowed?: boolean;
  official?: boolean;
  license?: string;
  lastChecked?: string;
};

export type CatalogItem = {
  id: string;
  kind: MediaKind;
  title: string;
  original?: string;
  year: number;
  genre: string;
  platform?: string;
  artist?: string;
  image: string;
  imageAlt: string;
  description: string;
  memory: string;
  tags: string[];
  sources: MediaSource[];
};

export type ResolveResult =
  | { state: 'embed'; source: MediaSource }
  | { state: 'external'; source: MediaSource }
  | { state: 'unavailable' };
