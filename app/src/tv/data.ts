// Пулы и каналы готовит tools/tv/build-pool.mjs — руками pool.json не править.
import poolJson from './pool.json';
import type { TvData } from './schedule';

export const tvData = poolJson as unknown as TvData;

export const tvChannels = Object.entries(tvData.channels).map(([id, cfg]) => ({ id, ...cfg }));
