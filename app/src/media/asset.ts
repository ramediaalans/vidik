// Собирает путь к файлу из public с учётом base сборки.
// В корне домена base = '/', на GitHub Pages = '/имя-репозитория/'.
//
// Тяжёлые папки (музыка, картриджи, ядра эмулятора) можно увести на отдельный
// хост через VITE_MEDIA_BASE (например, https://media.домен/ на Cloudflare R2).
// Если переменная не задана — всё берётся из public, как раньше.
const MEDIA_BASE = (import.meta.env.VITE_MEDIA_BASE ?? '').trim().replace(/\/$/, '');

// Только эти префиксы уезжают на внешний хост. Картинки и постеры лёгкие
// и остаются рядом с сайтом, чтобы не плодить лишние сетевые хопы.
const REMOTE_PREFIXES = ['music/', 'roms/', 'cores/'];

export function asset(path: string): string {
  const clean = path.replace(/^\//, '');

  if (MEDIA_BASE && REMOTE_PREFIXES.some((prefix) => clean.startsWith(prefix))) {
    return `${MEDIA_BASE}/${clean}`;
  }

  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${clean}`;
}
