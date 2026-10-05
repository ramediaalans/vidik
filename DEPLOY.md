# ВИДИК — текущий деплой и медиахранилище

Основная инфраструктура: **Cloudflare Pages + Cloudflare R2**. Не переносить сайт на GitHub Pages, Vercel или Netlify на основании старых инструкций.

## 1. Сайт: Cloudflare Pages

| Параметр | Текущее назначение |
| --- | --- |
| Публичный сайт | https://art-ai.studio |
| Репозиторий | https://github.com/ramediaalans/vidik |
| Production-ветка | `main` |
| Триггер публикации | push в `origin/main` |
| Приложение | `app/` |
| Сборка приложения | `npm run build` (tsc -b + vite build) |
| Результат | `app/dist/` относительно корня репозитория |

Настройки самого Pages-проекта хранятся в Cloudflare, не в этом Git-репозитории. Если root directory в панели = `app`, output directory там должен быть `dist`; если сборка организована из корня, пути/команду нужно согласовать соответственно. Не менять настройки наугад. Панель Cloudflare в рамках актуализации документации не проверялась.

`.github/workflows/deploy.yml.disabled` — исторический отключённый GitHub Pages workflow. Его не переименовывать в .yml и не запускать параллельно с Pages.

## 2. Переменные сборки

- `VITE_MEDIA_BASE=https://media.art-ai.studio` — для тяжёлого медиа в R2.
- `VITE_BASE` — `/` или отсутствует для текущего корневого домена. Конфиг читает её из `process.env`; при локальном изменении задавать в окружении команды сборки.
- Параметры публикации в Cloudflare должны быть заданы в соответствующем окружении production/preview. Локальный `.env` игнорируется Git и не приезжает автоматически в CI.
- Vite берёт envDir из корня репозитория. Префикс VITE означает публичные значения, не секреты.
- Старые VITE_VIBIX_PUBLISHER_ID / VITE_VIBIX_SDK_SOURCES сейчас не используются клиентом. Для активного ExternalVideoPlayer не нужен publisher id балансера.

Изменение VITE-переменной требует новой сборки. Значение не меняется на уже опубликованном сайте само.

## 3. Роутинг, заголовки и кэш

Приложение использует BrowserRouter: прямые обращения к внутренним URL отдают SPA (`index.html`). Служебные файлы в `app/public` (копируются в сборку):

| Файл | Назначение |
| --- | --- |
| `_redirects` | 301 со старых адресов: `/filmy` → `/videosalon`, `/multfilmy` → `/multklub`, `/disney-klub(/*)` → `/multklub(/:splat)` |
| `_routes.json` | на каких путях запускается функция `functions/_middleware.js` (не на статике) |
| `functions/_middleware.js` | 301 с `www.art-ai.studio` на `https://art-ai.studio` с сохранением пути и параметров; код 404 для неизвестных адресов (в том числе несуществующих карточек `/videosalon/<slug>` и т. п. — см. «Пререндер») |
| `functions/csp-report.js` | приёмник отчётов `Content-Security-Policy-Report-Only` (`report-uri /csp-report`): пишет нарушение в логи функции (Real-time Logs Pages), отвечает 204 |
| `assets/404.html` и такой же `404.html` в `images/`, `fonts/`, `films/`, `video/`, `ui/`, `pc/` (`music/`, `roms/`, `cores/` в Git не входят — они на `media.art-ai.studio`) | ответ 404 (`no-store`) для отсутствующих файлов в папках статики, чтобы не кэшировать SPA под именем файла. Добавляя новую папку статики в `_routes.json` (exclude), положить туда такой же `404.html` |
| `robots.txt`, `sitemap.xml` | правила для роботов и список разделов |

Адрес раздела мультфильмов — **`/multklub`** (название раздела на сайте прежнее). Старый `/disney-klub` оставлен только как 301.

**Правило для sitemap:** при добавлении, удалении или переименовании раздела обновить вместе `app/src/App.tsx` (маршрут), `app/src/seo.tsx` (title/description/canonical раздела), `app/public/sitemap.xml` и при переименовании — `_redirects`. Страницы поиска и 404 помечены `noindex, follow` и в sitemap не входят.

В тексте и метаданных, видимых роботам, не использовать реальные торговые марки и названия правообладателей; продвигать разделы общими запросами («мультфильмы 90-х», «игры 8-бит» и т. п.).

`/pc/` (компьютерный клуб) — статическая страница `app/public/pc/index.html`; Cloudflare отдаёт её как обычный файл, SPA её не перехватывает. Заголовки `/pc/*` — только в корневом `app/public/_headers` (Pages читает один `_headers` в корне сборки; вложенный `pc/_headers` игнорировался и просто скачивался как файл, поэтому удалён). Локально в dev её отдаёт плагин `pcIndex` из `vite.config.ts`.

`app/public/_headers` копируется в сборку и задаёт заголовки Cloudflare Pages: CSP, политики браузера, HSTS и кэш. CSP должен разрешать используемые внешние iframe/API и WASM; при проблемах проверять Network/Console, не отключать защиту без задачи. Шрифты локальные, внешних шрифтовых сервисов (Google Fonts) в CSP нет и добавлять не нужно.

**HSTS:** `Strict-Transport-Security: max-age=31536000` (1 год) только для основного домена, **без `includeSubDomains` и без `preload`** — поддомены (`mcp`, `media`, почтовые) им не затрагиваются. Отмена HSTS не мгновенная: браузеры, уже получившие заголовок, требуют https до года. Перед любым переносом основного домена туда, где может не быть https, сначала заранее сократить `max-age`.

Настройки зоны Cloudflare (не в репозитории): SSL — Full (strict), Always Use HTTPS — вкл., минимальная версия TLS — 1.2 (с 2026-10-03). Адреса Pages (`art-ai.studio`, `www`) и так принимают только TLS 1.2+.

После изменения `_headers` старые заголовки могут оставаться в кэше Cloudflare у уже закэшированных файлов (robots.txt, картинки). Проверять заголовки реальным запросом; при необходимости сбрасывать кэш только хоста `art-ai.studio`, не всей зоны.

В `_headers` годовой `immutable`-кэш только у файлов с хешем в имени: `/assets/*`, `/fonts/*`, `/pc/engines/*`. У `/images/*`, `/films/*`, `/video/*` имена постоянные, поэтому там `max-age` 7 дней + `stale-while-revalidate` 30 дней. **Перезапись изображения под старым именем дойдёт до пользователей не сразу (до недели и дольше в фоне).** Если замена нужна немедленно — новое имя файла и обновлённые ссылки.

Open Graph уже настроен в `app/index.html`: абсолютные `og:url` и `og:image` указывают на art-ai.studio. Старое указание «добавить абсолютные OG-ссылки» выполнено.

Кэш остальных статических файлов в `_headers`: `/fonts/*` — год `immutable` (имена шрифтов с хешем), `favicon.svg` и `icons.svg` — 1 день + `stale-while-revalidate`.

**Пререндер разделов** (`app/scripts/prerender.mjs`, запускается в `npm run build`): для каждого индексируемого раздела из `src/seoSections.ts` пишет `dist/<раздел>.html` со своим title/description/og, canonical (кроме главной: `index.html` — ещё и запасная страница для 404), JSON-LD и `<noscript>` с заголовком, описанием и ссылками на разделы. Кроме того, закрытые страницы: `dist/poisk.html` и карточки `dist/videosalon/<slug>.html`, `dist/multklub/<slug>.html` (каждый фильм под обоими адресами — `FilmPage` ищет по всему списку), `dist/igry/<id>.html` — общий заголовок без названий, `robots: noindex, follow`, свой `og:url`. Слаги читаются регулярками из `src/data/films.ts`, `roms.ts`, `roms-more.ts`. Есть файл — карточка существует (200); нет файла — Pages отдаёт запасной `index.html`, и `_middleware.js` меняет код на 404. Туда же добавляется `<link rel="preload" as="image">` главной картинки первого экрана раздела (карта `HERO` в скрипте): на экранах ≤760px — `*.m.webp`, шире — полная. **При смене картинки в `PageHero` раздела поправить `HERO`**, иначе браузер скачает лишний файл. В `app/index.html` предзагружаются 3 шрифта первого экрана (Onest кириллица/латиница, Fira Sans Extra Condensed 900 кириллица); при перегенерации `fonts.css` с новыми хешами — обновить эти ссылки. В `fonts.css` везде `font-display: swap`.

**Мобильные копии картинок:** `node scripts/mobile-images.mjs` (из `app/`) делает для картинок шире 1100px и тяжелее 60 КБ копию `name.m.webp` шириной 1000px и пишет список в `app/src/media/mobileImages.ts`. `asset()` на экранах ≤760px подставляет копию; фоновые картинки в CSS (текстура VHS, магнитофон) переключаются медиазапросом `(max-width: 760px)`. После добавления/замены большой картинки скрипт нужно запустить и закоммитить результат (сборка его не запускает).

**IndexNow:** ключ `app/public/005ac82484595202b05717eafc4e3610.txt` (должен отдаваться на сайте с кодом 200). Отправка адресов из sitemap в Яндекс и indexnow.org — `node _backups\indexnow_submit.mjs [пути]` (скрипт лежит вне репозитория, в `E:\AI-workspace\sandbox\_backups`).

**Настройки зоны Cloudflare вне репозитория (с 4 окт 2026):**
- Cache Rules: `media.art-ai.studio` `/pc/*`, `/cores/*` — кэш на краю 30 дней; `art-ai.studio/pc/engines/*` — по заголовкам. Скрипт `_backups\cf_cache_rules_set.mjs` (откат `--rollback`).
- WAF custom rule: на `art-ai.studio` и `www` запросы `*.php`, `/wp*`, `/.env`, `/.git` → 403. Скрипт `_backups\cf_waf_set.mjs` (откат `--rollback`).
- AI Crawl Control: политика Training = Allow; заблокированы только Bytespider, TikTok Spider, CCBot. Search/Agent — Allow. Bot Preference Sync включён (robots.txt остаётся `Allow: /`). Меняется только в панели (токену прав не хватает).
- Early Hints выключены.
- С 5 окт 2026 (скрипт `_backups\cf_media_rules.mjs` — добавляет правило через POST, остальные не трогает): WAF — блок хотлинка `media.art-ai.studio`, если Referer не пустой и не `https://art-ai.studio/`, `https://www.art-ai.studio/`, `*.vidik.pages.dev`, `localhost`; Cache Rule — `media` `/roms/*`, `/music/*` на краю 30 дней.
- **Внимание:** `cf_waf_set.mjs` и `cf_cache_rules_set.mjs` делают PUT всего набора — сотрут правила выше и правило AI Crawl Control. Новые правила добавлять только по одному (как `cf_media_rules.mjs`) или в панели.
- CORS бакета media пускает только `art-ai.studio`: на превью `*.vidik.pages.dev` игры и музыка не грузятся — это ожидаемо.

## 4. R2: отдельная публикация медиа

| Параметр | Значение |
| --- | --- |
| Bucket | `vidik-media` |
| rclone remote локальной машины | `r2:` |
| Публичный хост | https://media.art-ai.studio |
| Префиксы | `roms/`, `music/`, `cores/` |
| Локальные копии | `app/public/roms/`, `music/`, `cores/` |

Эти папки исключены из Git. `asset()` отправляет на R2 только указанные префиксы. Постеры и оформление остаются на основном сайте. На чистом CI-checkout игнорируемых медиа нет; локально Vite может скопировать их целиком в dist, поэтому размер локальной сборки не обязательно равен CI-сборке.

После разрешения пользователя, из корня проекта:

```powershell
rclone copy app/public/roms r2:vidik-media/roms --ignore-existing --transfers 8
rclone copy app/public/music r2:vidik-media/music --ignore-existing --transfers 8
rclone copy app/public/cores r2:vidik-media/cores --ignore-existing --transfers 8
```

Выполнять только нужную команду, не все три автоматически. `--ignore-existing` добавляет новые объекты, но не обновляет существующие. Замена объекта с тем же именем — отдельная согласованная операция с проверкой кэша. Не использовать sync с удалением, не менять bucket/remote и не выводить ключи доступа.

Требования медиа-хоста:

- CORS для fetch/XHR музыки, ROM и ядер, с боевого и нужного локального origin.
- `.wasm` с Content-Type `application/wasm`.
- Доступность файла по URL без авторизации, если текущий плеер требует публичную загрузку.
- Подходящая политика кэша; версионировать заменяемые ресурсы при необходимости.

R2-upload не обновляет React-каталог, git push не загружает ROM. Для новой игры нужны обе согласованные части: файл в R2 и запись/изображение в приложении.

## 5. Проверка перед разрешённой публикацией

```powershell
# из корня
cd app
npm run lint
npm run build
npm run preview -- --port 4173 --host
```

Проверить затронутые страницы, мобильную версию, прямые URL, старт/остановку плееров, отсутствие ошибок Network/Console. Для новых медиа проверить реальные URL и фактическое воспроизведение: HTTP 200 недостаточно для доказательства совместимости ROM или корректности видео.

Из корня перед коммитом:

```powershell
git status --short
git diff --stat
git diff -- <конкретные-файлы>
git add <только-согласованные-файлы>
git diff --cached
```

После явного разрешения пользователя:

```powershell
git commit -m "<описание изменений>"
git push origin main
```

Не добавлять чужие изменения/секреты/QA/медиа. Сам факт разрешения на редактирование не является разрешением на commit/push/deploy.

## 6. После публикации

1. Проверить успешность production-сборки Cloudflare Pages, если есть доступ; не путать с успешным push.
2. Проверить https://art-ai.studio и затронутые внутренние URL напрямую/после refresh.
3. Убедиться, что новые медиа доступны через media.art-ai.studio и плеер их загружает.
4. При замене картинки проверить кэш и фактически новую версию.
5. Если статус деплоя не проверен, явно сообщить это пользователю.
6. Сбросить кэш хоста: `node _backups\cf_purge_host.mjs`; при новых/изменённых разделах — отправить IndexNow (`node _backups\indexnow_submit.mjs`).

Хеш бандла `assets/index-*.js` на сайте не совпадает с локальной сборкой: Cloudflare собирает с другими env-переменными. Проверять деплой по новым файлам (например, `/images/v3/hero-night.webp` или `/pc/desk/head.js`), а не по сравнению хеша.

Откат: `git revert <коммит>` + push (после разрешения) или Rollback на прошлый деплой в панели Cloudflare Pages.

`site_dist.zip` — локальный артефакт, игнорируется Git; не является источником автоматического продакшен-деплоя. Старые инструкции ручной загрузки на другие платформы не описывают текущий workflow.
