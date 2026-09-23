// Собирает путь к файлу из public с учётом base сборки.
// В корне домена base = '/', на GitHub Pages = '/имя-репозитория/'.
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
