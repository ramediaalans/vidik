import poolJson from './pool.json';
import type { TvData } from './schedule';

const legacy = poolJson as unknown as TvData;

export const tvData: TvData = {
  ...legacy,
  channels: {
    pervaya: { num: '01', name: 'Первая кнопка', note: 'Семейный федеральный эфир' },
    shestaya: { num: '02', name: 'Шестая кнопка', note: 'Молодёжный канал девяностых' },
    kabelny: { num: '03', name: 'Кабельный канал', note: 'Линейный видеосалон' }
  }
};

export const tvChannels = Object.entries(tvData.channels).map(([id, cfg]) => ({ id, ...cfg }));
