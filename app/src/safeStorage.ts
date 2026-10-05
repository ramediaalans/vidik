// sessionStorage может быть недоступен (приватный режим Safari, запрет cookies,
// встроенные браузеры) — тогда любое обращение бросает исключение. Обёртки
// молча деградируют до «значения нет», чтобы сайт не падал на белый экран.
export function sessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function sessionSet(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* хранилище недоступно — просто не запоминаем */
  }
}

const RELOAD_KEY = 'vidik-chunk-reload';

// После деплоя старые чанки (assets/*-hash.js) исчезают, и открытая вкладка
// не может догрузить ленивую страницу. Один раз перезагружаем страницу, чтобы
// подтянуть свежий index.html; повторно в течение минуты не пытаемся — иначе цикл.
export function reloadOnceForNewBuild(): boolean {
  const last = Number(sessionGet(RELOAD_KEY) || 0);
  if (Date.now() - last < 60_000) return false;
  sessionSet(RELOAD_KEY, String(Date.now()));
  window.location.reload();
  return true;
}

export function isChunkLoadError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /dynamically imported module|Importing a module script failed|error loading dynamically|ChunkLoadError|Unable to preload CSS|Loading chunk/i.test(text);
}
