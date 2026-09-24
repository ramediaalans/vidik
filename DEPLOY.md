# ВИДИК — публикация

Сайт — статика (Vite SPA). Сборка лежит в `app/dist`, готовый архив — `site_dist.zip` (~7 МБ,
без тяжёлых папок `music/`, `roms/`, `cores/` — см. «Вес сборки» ниже).

## Сборка

```powershell
cd app
npm ci
npm run build      # tsc + vite build -> dist
npm run preview    # локальная проверка на http://localhost:4173
```

## Важное для любого хостинга

Роутинг клиентский, поэтому нужен SPA-fallback: любой путь отдаёт `index.html`.

| Площадка | Что уже готово |
|---|---|
| Vercel | `app/vercel.json` — rewrites + кэш на `/images` и `/assets` |
| Netlify | `app/public/_redirects` → попадает в `dist/_redirects` |
| GitHub Pages | `dist/404.html` — копия `index.html` |

## Варианты публикации

**Netlify Drop (без CLI и без аккаунта на старте)**
Открыть <https://app.netlify.com/drop> и перетащить папку `app/dist`.

**Vercel CLI**

```powershell
npm i -g vercel
vercel login          # подтверждение в браузере или по почте
cd app
vercel --prod
```

**GitHub Pages**
Залить содержимое `app/dist` в ветку `gh-pages`. Если сайт будет не в корне домена, добавить в `vite.config.ts` поле `base: '/имя-репозитория/'` и пересобрать.

## Вес сборки: музыка и картриджи

Сам сайт — около 5,5 МБ. Но `app/public/music/`, `app/public/roms/` и `app/public/cores/`
Vite копирует в `dist` целиком: только музыка — это ~700 МБ (181 трек, 128 kbps).
В гит эти папки не коммитятся и в `site_dist.zip` не попадают.

Варианты:

1. **Cloudflare Pages** — лимиты: 25 МБ на файл и 20 000 файлов на деплой.
   Мы в лимиты укладываемся (максимальный файл ~7 МБ), но каждый деплой заливает ~0,7 ГБ.
2. **Вынести медиа на отдельный хост** (Internet Archive / сторонний CDN) и подменить базовый URL
   в `app/src/media/asset.ts`. Тогда деплоится только лёгкая статика.

Быстрая проверка перед деплоем:

```powershell
Get-ChildItem app\dist -Recurse -File |
  Measure-Object -Property Length -Sum -Maximum
```

## После публикации

В `app/index.html` у `og:image` указан относительный путь `/og-cover.jpg`. Для корректных превью в соцсетях заменить его на абсолютный URL боевого домена и добавить `<meta property="og:url">`.
