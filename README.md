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

- `/videosalon` — 33 фильма эпохи. Карточки нарисованы как VHS-кассеты, название на наклейке пишется от руки (Caveat).
- `/disney-klub` — 18 мультсериалов и сборников воскресного блока, карточки с постерами и выбором сезона.

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
node tools/films/apply-overrides.mjs  # проверенные источники и оффсеты → source-overrides.json
node tools/films/resolve.mjs          # сверяет списки с базой → tools/films/selection.json
node tools/films/vk-poster.mjs        # кадры-обложки для того, чего нет в базе
node tools/films/build-catalog.mjs    # качает постеры в webp → app/src/data/films.ts
node tools/films/audit-sources.mjs    # сверка с реальными заголовками и длительностью роликов
```

Ручные карточки (того, чего база не знает) лежат в `tools/films/manual-selection.json`;
`resolve.mjs` добавляет их в `selection.json` как есть. `"poster": "vk://frame"` означает, что
картинка берётся кадром из VK-ролика через `vk-poster.mjs` (список `JOBS` внутри).

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

### Корпус телевизора

Плеер стоит внутри фотографии телевизора с видеомагнитофоном: `TvSet` кладёт его
в прозрачное окно кинескопа, а на лежащей сверху кассете от руки (Caveat) подписано
название того, что смотрим.

| Файл | Роль |
|---|---|
| `app/public/images/tv/tv-vcr-frame.webp` | картинка 1400×673 с прозрачным фоном и дырой на месте экрана |
| `app/src/components/TvSet.tsx` | обёртка: окно, рамка сверху, наклейка |
| `.tvset*` в `app/src/styles.css` | геометрия в процентах от картинки |

Окно кинескопа — `left 5.378% / top 10.824% / width 41.194% / height 62.239%`, наклейка —
`left 57.4% / top 58.2% / width 18.6% / height 12.3%` с поворотом на −2.4°. Размер шрифта
наклейки считается в `cqw` от ширины телевизора, а не окна. На ширине до 860 px
мебель прячется и плеер занимает всю ширину в 16/9.

```powershell
node tools/probe.mjs --url http://localhost:4173/videosalon/terminator-2-sudnyy-den-1991 --steps tools/steps/tv-frame.js --out qa/tv-frame.png
node tools/probe.mjs --url http://localhost:4173/videosalon/terminator-2-sudnyy-den-1991 --steps tools/steps/tv-frame-on.js --out qa/tv-frame-on.png
```

### Закладка «докуда досмотрели»

Видеосалон и Дисней-клуб запоминают место остановки в `localStorage`
(`vidik:watch:v1`, модуль `app/src/media/watchProgress.ts`) — никаких аккаунтов и серверов.

- ключ — slug кассеты, для плейлистов `slug#номерСерии`;
- пишется не чаще раза в 5 секунд просмотра, на паузе, при сворачивании вкладки и при уходе со страницы;
- первая минута не считается, а ближе чем за 90 секунд до финала закладка стирается: досмотрели;
- на выключенном телевизоре видно «Продолжим с 20:34» и вторая кнопка «◀◀ с начала»;
- секунда уезжает в сам адрес embed (`t=` у VK и Rutube, `start=` у YouTube), так что кассета сразу стартует с нужного места.

```powershell
node tools/probe.mjs --url http://localhost:4173/disney-klub/chudesa-na-virazhah-1990 --steps tools/steps/watch-resume.js --out qa/watch-resume.png
node tools/probe.mjs --url http://localhost:4173/videosalon/kikbokser-1989 --steps tools/steps/watch-save.js --wait 120000 --out qa/watch-save.png
```

### Заглушки плеера

Когда картинки нет — загрузка, пауза, конец просмотра, ошибка или рекламная
вставка — экран закрыт своим слоем `.vplayer__privacy--{состояние}`. Вместо
статичной плашки там играет короткий немой луп аналоговых помех плюс
бегунок кадровой и мерцание надписи на CSS.

На рекламе шум плотный (opacity .92) — чужой ролик должен быть не виден.
На остальных состояниях — полупрозрачный (.34, `mix-blend-mode: screen`), чтобы
кадр фильма просвечивал.

| Файл | Роль |
|---|---|
| `app/public/video/vhs-noise.mp4` | луп помех, 480×270, 4 с, без звука (~145 КБ) |
| `app/public/video/vhs-noise-poster.webp` | первый кадр: виден до загрузки и при `prefers-reduced-motion` |
| `ScreenNoise` в `app/src/components/ExternalVideoPlayer.tsx` | сам элемент `<video>` |

Кнопки на заглушке оформлены как экранное меню видеомагнитофона (`.vplayer__osd`):
крупный моноширинный `▶ PLAY` / `◀◀ REW` без плашки, с подсветкой и мигающим
треугольником режима.

Проверка в браузере (все четыре состояния собираются вручную):

```powershell
node tools/probe.mjs --url http://localhost:4173/videosalon --steps tools/steps/ad-noise.js --out qa/ad-noise.png
```

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
