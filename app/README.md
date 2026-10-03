# ВИДИК — приложение

Это рабочее приложение проекта, не стартовый шаблон Vite.

Общие правила и структура — [корневой README](../README.md). Публикация — [DEPLOY.md](../DEPLOY.md). Конвейеры контента и плееры — [docs/project-guide.md](../docs/project-guide.md). Дизайн — [DESIGN.md](../DESIGN.md).

## Команды из этой папки

```powershell
npm ci
npm run dev
npm run lint
npm run build
npm run preview -- --port 4173 --host
```

Сборка: TypeScript + Vite → `dist/`. Preview использует уже собранный dist; после правок нужна пересборка. Версии зависимостей — `package.json` и `package-lock.json`. Не обновлять их без задачи.

`vite.config.ts` использует корневой envDir. Для production медиа идут через `VITE_MEDIA_BASE=https://media.art-ai.studio`; локальные music/roms/cores исключены из Git. Секреты нельзя хранить в переменных VITE.

Хостинг — Cloudflare Pages, push в main запускает деплой. Не коммитить/пушить/публиковать без явного разрешения пользователя.
