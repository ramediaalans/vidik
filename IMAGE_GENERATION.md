# ВИДИК — генерация изображений

Документ описывает фирменные атмосферные иллюстрации, а не происхождение всех картинок сайта. Реальные постеры/кадры и игровые наклейки имеют отдельные конвейеры и могут содержать названия/персонажей. Для картриджей см. IMAGE_PROMPTS_GAMES.md и docs/project-guide.md; учитывать права на чужие материалы.

---

## 1. Мастер-арт-дирекшн

Одна вселенная: постсоветская квартира и двор 1990–2005. Каждый кадр — как стоп-кадр домашнего кино.

**Обязательные признаки стиля**

- Фотореализм, 35-мм плёнка, зерно Kodak Gold / Fuji, лёгкий halation.
- Два источника света: тёплая пыльная лампа (2700K) и холодное свечение экрана (6500K).
- Пыль в воздухе, видимые лучи света, мягкая виньетка.
- Малая глубина резкости, объектив 35 или 50 мм, съёмка с уровня глаз сидящего человека.
- Палитра: сажа `#0B0B0C`, тёплая пыль `#C9A227`, бежевый `#EDE6D6`, холодный CRT-циан `#7FE3E0`, приглушённый бордовый и хаки.
- Фактуры эпохи: ковёр на стене, кружевная салфетка, обои в мелкий цветок, лакированная стенка, линолеум.

**Запрещено для нейтральных фоновых сцен (не для всех игровых наклеек)**

- Любые узнаваемые постеры, обложки, логотипы, бренды, кадры из фильмов и игр.
- Читаемый текст в кадре (названия рисует интерфейс сайта).
- Лица крупным планом и узнаваемые люди.
- Современные предметы: смартфоны, плоские экраны, LED-свет, ноутбуки.
- Пластиковый 3D-рендер, HDR-глянец, неоново-вапорвейв-клише, розово-фиолетовый Майами.
- Водяные знаки, рамки, коллажи.

**Хвост негативного промта (добавлять ко всем генерациям)**

```
no text, no letters, no logos, no watermarks, no brand names, no movie posters,
no recognizable characters, no modern devices, no flat screens, no smartphones,
not 3d render, not cgi, no glossy hdr, no vaporwave neon cliche
```

---

## 2. Технические правила

| Параметр | Значение |
|---|---|
| Модель по умолчанию | `gpt-image-2` (Genspark) |
| Резерв | `flux-2-max`, `seedream-5-pro`, `krea-2-turbo` |
| Размер | `2k` |
| Соотношение | герои `16:9`, карточки `4:3`, вертикальные блоки `3:4` |
| Исходники | `assets_raw/<имя>.png` |
| Оптимизация | `node tools/optimize.mjs` → `app/public/images/<раздел>/<имя>.webp` |

Оптимизатор читает только файлы непосредственно в assets_raw, использует PLAN/defaultsFor и не обходит вложенные папки. Для корпусов/картриджей есть отдельные генераторы. Команда сборки приложения выполняется из app.

Имена существующих файлов связывают ресурс с кодом. Но `/images/*` кэшируется как immutable на год: замена под тем же именем не гарантирует новую версию у посетителя. Для изменённого ресурса использовать согласованное версионирование пути/имени и обновлять ссылки либо проверенный способ инвалидировать кэш. Подробнее — DEPLOY.md.

---

## 3. Инвентарь ассетов

| Файл | Где используется | Статус |
|---|---|---|
| `hero/hero-room.webp` | главная, герой | готов |
| `hero/yard-golden.webp` | «По годам», герой | готов |
| `hero/club-night.webp` | «Игры», герой | готов |
| `ui/hero-night.webp` | ночные блоки | готов |
| `v3/hero-night.webp`, `v3/yard-golden.webp` | новые фоны героев (через `V3_MAP` в asset.ts) | используется |
| `v3/ch-{tv,salon,disney,games,pc}.webp` | плитки разделов на главной | используется |
| `v3/section-{music,nostalgia,retronet,search,stories}.webp`, `v3/vhs-eject.webp` | герои разделов v2 | используется |
| `ui/cassette.webp` (в `public/ui/`) | кассета в MixTape / кассетнике | используется |
| `tv/tv-knob.webp` | ручка переключения каналов | используется |
| `movies/*`, `cartoons/*` | остались от удалённых /filmy и /multfilmy; часть ещё может использоваться в карточках — перед удалением проверить ссылки | наследие |
| `games/section-games.webp` + `game-1…6` | «Игры», «Ретроинтернет» | готов |
| `music/section-music.webp` + `music-1…6` | «Музыка», кассета | готов |
| `tv/section-tv.webp` | «Телевизор» | готов |
| `tv/tv-frame.webp` | «Телевизор», активный корпус живого эфира | используется |
| `tv/tv-vcr-frame.webp` | TvSet: видеосалон / Дисней-клуб | используется |
| `tv/tv-plain.webp` + `console-{nes,md,snes}.webp` | игровая страница, отдельные слои | используется |
| `games/carts/*.webp` | полка и вставленный картридж | сборка build-carts.py |
| `stories/section-stories.webp` | «Истории», герой | готов |
| `textures/texture-paper.webp`, `texture-carpet.webp` | фоны, шум | готов |
| `stories/story-1…6.webp` | карточки и чтение историй | готов |
| `ui/og-cover.webp` + `public/og-cover.jpg` | Open Graph 1200×630 | готов |
| `textures/texture-vhs.webp` | слой помех на boot-экране и CRT | готов |

Старые фоны (`hero/*`, `ui/hero-night.webp`, `stories/section-stories.webp` и др.) лежат на месте, но на сайте подменяются новыми из `v3/` через `V3_MAP`. Новый ассет класть с новым именем и добавлять в V3_MAP: `/images/*` кэшируется как immutable.

---

## 4. Промты использованных кадров (для регенерации)

Ко всем добавлять негативный хвост из раздела 1. Формат `4:3`, размер `2k`, кроме отмеченных.

### story-1 — вечер после школы
```
Photorealistic 35mm film still, 1990s post-Soviet living room at dusk: a child's
backpack dropped on a patterned carpet, a plate with bread on a low table, big CRT
television glowing cold blue in the corner, warm table lamp, dust in the air,
lace curtain, shallow depth of field, Kodak Gold grain, teal and amber palette, no people
```

### story-2 — компьютерный клуб
```
Photorealistic 35mm film still, late 1990s basement computer club: a row of bulky
beige CRT monitors on plywood desks, tangled cables, cheap office chairs, single
fluorescent tube overhead, cold monitor glow against warm dusty darkness, cigarette
haze, cinematic wide shot, film grain, no people
```

### story-3 — дозвон в интернет
```
Photorealistic 35mm film still, 1999 home corner: a beige desktop computer and an
external dial-up modem with small green LEDs, a corded landline phone next to it,
notebook with handwritten notes, night window, warm desk lamp and cold monitor light,
macro details of dust, film grain, no readable text
```

### story-4 — кассета и карандаш
```
Photorealistic macro 35mm film still: hands-free close-up of an audio cassette lying
on a wooden table next to a pencil, spilled magnetic tape, a boombox slightly out of
focus behind, warm kitchen lamp light, cold window light from the left, heavy dust,
shallow depth of field, film grain, no text on labels
```

### story-5 — двор до темноты
```
Photorealistic 35mm film still, golden hour in a Soviet-era apartment block yard:
rusty swings, sand box, concrete panel houses in the background, long shadows,
warm dusty light, slight lens flare, muted colours, cinematic wide shot, no people
```

### story-6 — вкладыши и фантики
```
Photorealistic top-down macro still: a child's collection of colourful glossy
inserts and wrappers spread on a carpet, blurred abstract patterns only, warm lamp
light, dust, 35mm film grain, no readable text, no logos, no characters
```

### texture-vhs — помехи (формат 16:9)
```
Abstract photographic texture: close-up of a CRT television showing analog VHS
interference, horizontal tracking noise bands, chromatic aberration, scanlines,
cold cyan and warm amber shift, heavy film grain, dark, no text, no objects
```

### og-cover — обложка для соцсетей (формат 16:9, затем кроп 1200×630)
```
Photorealistic 35mm film still, hero shot: a wood-veneer wall unit with a CRT
television showing blue static, a VCR with glowing green clock, stacks of unlabelled
videocassettes, lace doily, carpet on the wall, warm lamp and cold screen glow, dust
beams, cinematic centered composition with empty space on the left for a title,
Kodak Gold grain
```

---

### tv-set — исторический промт корпуса телевизора (формат 4:3)

Название tv-set в этом промте — старое рабочее имя, не текущий путь ресурса. Живой эфир использует tv-frame.webp. Не генерировать tv-set.webp как «недостающую» картинку на основании этого раздела.

Особый кадр: в его экран сайт вставляет настоящее видео, поэтому требования жёстче обычных:

- телевизор строго анфас, без перспективных искажений, по центру кадра;
- экран — ровный чёрный прямоугольник без бликов, отражений и картинки (его закроет плеер);
- вокруг телевизора — ровный тёмный фон без интерьера, чтобы корпус можно было вырезать;
- никаких надписей на корпусе: шильдик «ВИДИК» рисует интерфейс.

```
Photorealistic 35mm film still of a 1980s Soviet wood-veneer CRT television set,
strictly frontal orthographic view, perfectly centered, screen bezel parallel to
frame edges, empty matte black screen with no image and no reflections, chunky
brown plastic and wood veneer body, vertical speaker grille and two round tuning
knobs on the right side panel, small red indicator lamp, worn plastic, dust,
warm 2700K lamp light from the left, plain dark neutral background, studio product
shot, Kodak Gold grain, soft vignette
```

Историческая цепочка tv-set.png / measure-set.mjs не является актуальной автоматической процедурой замены tv-frame.webp. При замене сверить входы скрипта и геометрию `.tv__screenFrame` / `.tv__screen` / `.tv__cabinet` в styles.css.

Игровые слои собираются `python tools/games/build-consoles.py "<папка исходников>"` → tv-plain.webp, console-*.webp и consoles.ts. Картриджи — build-carts.py и rom-carts.ts. TvSet для фильмов использует отдельную tv-vcr-frame.webp. У всех рамок сохранять прозрачность экрана и проверять совмещение с видео; не менять другие разделы без задачи.

---

## 5. Регенерация: правила приёмки

Кадр принимается, если выполнены все пункты:

1. Есть оба источника света — тёплый и холодный.
2. Нет читаемого текста, логотипов и узнаваемых постеров.
3. Палитра совпадает с соседними кадрами раздела (проверять рядом, а не по одному).
4. Композиция оставляет тёмную нижнюю треть — туда ложится подпись карточки.
5. Кадр не дублирует сюжет уже принятого изображения в том же разделе.

При замене обычной сцены: подготовить исходник в assets_raw → из корня `node tools/optimize.mjs` → из app `npm run lint` и `npm run build` → свежий preview и визуальная проверка раздела на desktop/mobile. Учитывать версионирование ресурса и кэш. Скриншоты/черновики хранить в qa, не коммитить. Для рамок/наклеек применять специализированный конвейер, а не общий оптимизатор вслепую.
