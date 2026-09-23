# ВИДИК — публикация

Сайт — статика (Vite SPA). Сборка лежит в `app/dist`, готовый архив — `site_dist.zip` (~5,5 МБ).

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

## После публикации

В `app/index.html` у `og:image` указан относительный путь `/og-cover.jpg`. Для корректных превью в соцсетях заменить его на абсолютный URL боевого домена и добавить `<meta property="og:url">`.
