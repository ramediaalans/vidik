# ВИДИК — твоё детство на перемотке

Интерактивный архив постсоветского детства 1990–2005: телевизор с каналами, кассетник, каталоги фильмов, мультфильмов, игр и музыки, истории и архив старых сайтов.

## Стек

Vite + React 19 + TypeScript + React Router. Без UI-библиотек: собственная дизайн-система в `app/src/styles.css`.

## Запуск

```bash
cd app
npm ci
npm run dev        # http://localhost:5173
npm run build      # сборка в app/dist
npm run preview    # просмотр сборки
npm run lint
```

## Структура

| Путь | Что внутри |
|---|---|
| `app/` | приложение (исходники, публичные файлы, конфиги) |
| `app/public/images/` | оптимизированные WebP по разделам |
| `tools/` | скрипты: оптимизация картинок, скриншоты, самотест |
| `DESIGN.md` | дизайн-система: палитра, типографика, компоненты |
| `IMAGE_GENERATION.md` | арт-дирекшн и промты всех изображений |
| `DEPLOY.md` | публикация |

Исходные PNG генерации (`assets_raw/`) в репозиторий не попадают — в сборке участвуют только WebP из `app/public/images/`.

## Кассетник (музыка)

На сайте живёт Webamp — веб-порт Winamp 2. Он рисуется в `#webamp` вне дерева React,
поэтому музыка не обрывается при переходе между разделами. Свёрнутый плеер остаётся
в панели задач слева внизу. При запуске эмулятора музыка сама встаёт на паузу
(событие `vidik:audio-claim`).

| Файл | Роль |
|---|---|
| `app/src/media/player.tsx` | `PlayerProvider`, ленивая загрузка Webamp, панель задач |
| `app/src/media/playerContext.ts` | контекст, `usePlayer()`, `claimAudio()` |
| `app/src/components/TapeDeck.tsx` | список треков с поиском в разделе `/muzyka` |
| `app/src/data/tracks.ts` | сгенерированный плейлист (править вручную не надо) |

Сами MP3 лежат в `app/public/music/` и в гит не коммитятся. Импорт из локальной папки:

```powershell
node tools/import-music.mjs --src "D:\Музыка" --bitrate 128k
```

Скрипт читает ID3 (в том числе windows-1251), пережимает через ffmpeg, считает длительность
и перезаписывает `tracks.ts`. Нужны `ffmpeg` и `ffprobe` в PATH.

Проверка плеера в браузере:

```powershell
node tools/probe.mjs --url http://localhost:4173/muzyka --steps tools/steps/music.js --out qa/music.png
```

## Видеосалон и Дисней-клуб

Два раздела с полными фильмами и мультсериалами:

- `/videosalon` — 38 фильмов эпохи. Карточки нарисованы как VHS-кассеты, название на наклейке пишется от руки (Caveat).
- `/disney-klub` — 11 мультсериалов воскресного блока, карточки с постерами и выбором сезона.

Старые разделы `/filmy` и `/multfilmy` остались как архив заметок и кадров — ссылки на них есть в подвале.

| Файл | Роль |
|---|---|
| `app/src/pages/SalonPage.tsx` | полка кассет с фильтрами |
| `app/src/pages/DisneyPage.tsx` | сетка постеров |
| `app/src/pages/FilmPage.tsx` | карточка + плеер (общая для обоих разделов) |
| `app/src/components/VhsTape.tsx` | кассета (чистый CSS, без картинок) |
| `app/src/components/VibixPlayer.tsx` | подключение плеера-балансера |
| `app/src/data/films.ts` | сгенерированный каталог (руками не править) |

### Конвейер каталога

Всё собирается на этапе разработки, в браузер не уезжает ни один токен:

```powershell
node tools/films/resolve.mjs        # сверяет списки с базой → tools/films/selection.json
node tools/films/build-catalog.mjs  # качает постеры в webp → app/src/data/films.ts
```

Списки фильмов и мультсериалов заданы вверху `resolve.mjs`. Ключи балансера лежат в `.env`
(`BALANCER2_BASE`, `BALANCER2_TOKEN`), файл в `.gitignore`.

### Настройки плеера

Один `.env` в корне репозитория обслуживает и скрипты `tools/`, и сборку сайта
(`envDir` в `app/vite.config.ts`). Шаблон — `.env.example`.

| Переменная | Зачем |
|---|---|
| `VITE_VIBIX_PUBLISHER_ID` | id паблишера для `<ins data-publisher-id>` |
| `VITE_VIBIX_SDK_SOURCES` | адреса SDK через запятую; пусто — берутся значения по умолчанию |

В клиентский код Vite отдаёт только переменные с префиксом `VITE_`, остальное (токены,
пароли) остаётся только на этапе разработки. `VITE_VIBIX_PUBLISHER_ID` всё равно виден
в бандле — это не секрет, а настройка: его можно менять без правки кода и держать
разным для дева и боевого домена. Для GitHub Pages обе переменные задаются в
«Settings → Secrets and variables → Actions → Variables»; без них плеер покажет сообщение
«Плеер не настроен» вместо пустого блока.

### Сам плеер

SDK балансера сам находит тег `<ins data-type="kp" data-id="{kinopoisk_id}">` и меняет его на iframe —
в том числе у тегов, вставленных после загрузки страницы, так что SPA-навигация ему не мешает.
Внутренние id балансера не нужны — хватает kinopoisk_id. Плеер монтируется только по кнопке,
и этот же клик гасит кассетник через `claimAudio()`.

Проверка в браузере:

```powershell
node tools/probe.mjs --url http://localhost:5173/videosalon --steps tools/steps/salon.js --out qa/salon.png
node tools/probe.mjs --url http://localhost:5173/videosalon/terminator-2-sudnyy-den-1991 --steps tools/steps/film-page.js --out qa/film.png
```

## Контент и права

Оформление сайта (фоны, иллюстрации разделов, графика кассет и картриджей) создано для этого проекта.

Чужой материал тоже есть, и он не хранится у нас:

- фильмы и мультсериалы идут через сторонний плеер-балансер в iframe;
- постеры и описания взяты из его же API и лежат в `app/public/films/`;
- телеэфир собран из публичных роликов YouTube и играется его штатным плеером;
- старые сайты открываются через Internet Archive, справки ведут на Википедию.

Музыка и образы игр (`app/public/music/`, `roms/`, `cores/`) в репозиторий не коммитятся и для
публичной публикации не предназначены.
