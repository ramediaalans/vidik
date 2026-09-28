// «Докуда досмотрели» — закладка в кассете. Всё только в localStorage браузера:
// никаких аккаунтов и серверов у проекта нет.
const KEY = 'vidik:watch:v1';
// Больше парысот кассет в истории не нужно — старое вытесняем.
const LIMIT = 200;
// Мелочь не запоминаем: если человек посмотрел меньше минуты, продолжать нечего.
export const MIN_MARK_SECONDS = 60;
// Хвост ролика: если досмотрели до него — закладку снимаем.
export const TAIL_SECONDS = 90;

export interface WatchMark {
  /** секунда в ролике (абсолютная, с учётом source.start) */
  t: number;
  /** когда записали, ms */
  at: number;
}

type Store = Record<string, WatchMark>;

// Ключ закладки: slug кассеты плюс номер серии для плейлистов.
export const watchKey = (slug: string, episode = 0): string => (episode ? `${slug}#${episode}` : slug);

function read(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as Store;
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    const keys = Object.keys(store);
    if (keys.length > LIMIT) {
      const fresh = keys
        .sort((a, b) => (store[b]?.at ?? 0) - (store[a]?.at ?? 0))
        .slice(0, LIMIT);
      const trimmed: Store = {};
      for (const k of fresh) trimmed[k] = store[k];
      store = trimmed;
    }
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* режим инкогнито или переполненное хранилище — живём без закладки */
  }
}

export function getMark(key: string): WatchMark | null {
  const mark = read()[key];
  return mark && typeof mark.t === 'number' && mark.t > 0 ? mark : null;
}

export function saveMark(key: string, t: number): void {
  if (!Number.isFinite(t) || t < MIN_MARK_SECONDS) return;
  const store = read();
  store[key] = { t: Math.floor(t), at: Date.now() };
  write(store);
}

export function clearMark(key: string): void {
  const store = read();
  if (!(key in store)) return;
  delete store[key];
  write(store);
}

// «1:23:45» для надписи на заглушке.
export function formatMark(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
