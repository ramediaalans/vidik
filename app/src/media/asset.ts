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

// Новые фоны (public/images/v3) — основной вариант. Старые пути из кода
// подменяются на v3 здесь, чтобы не трогать каждую страницу.
const V3_MAP: Record<string, string> = {
  'images/v2/ch-disney.webp': 'images/v3/ch-disney.webp',
  'images/v2/ch-games.webp': 'images/v3/ch-games.webp',
  'images/v2/ch-pc.webp': 'images/v3/ch-pc.webp',
  'images/v2/ch-tv.webp': 'images/v3/ch-tv.webp',
  'images/v2/ch-salon.webp': 'images/v3/ch-salon.webp',
  'images/v2/hero-night.webp': 'images/v3/hero-night.webp',
  'images/v2/vhs-eject.webp': 'images/v3/vhs-eject.webp',
  'images/music/section-music.webp': 'images/v3/section-music.webp',
  'images/stories/section-stories.webp': 'images/v3/section-stories.webp',
  'images/ui/hero-night.webp': 'images/v3/section-nostalgia.webp',
  'images/games/section-games.webp': 'images/v3/section-retronet.webp',
  'images/hero/yard-golden.webp': 'images/v3/yard-golden.webp',
  'images/hero/hero-room.webp': 'images/v3/section-search.webp',
};

export function asset(path: string): string {
  let clean = path.replace(/^\//, '');

  if (V3_MAP[clean]) clean = V3_MAP[clean];

  if (MEDIA_BASE && REMOTE_PREFIXES.some((prefix) => clean.startsWith(prefix))) {
    return `${MEDIA_BASE}/${clean}`;
  }

  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${clean}`;
}
