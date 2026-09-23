# ВИДИК — генерация изображений

Документ описывает, как делаются все картинки проекта, чтобы новые кадры не выбивались из общего ряда.

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

**Запрещено (негативные ограничения)**

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

Имена файлов фиксированы: замена картинки = перезапись файла с тем же именем + повторный `optimize.mjs` + `npm run build`. Пути в коде менять не нужно.

---

## 3. Инвентарь ассетов

| Файл | Где используется | Статус |
|---|---|---|
| `hero/hero-room.webp` | главная, герой | готов |
| `hero/yard-golden.webp` | «По годам», герой | готов |
| `hero/club-night.webp` | «Игры», герой | готов |
| `ui/hero-night.webp` | ночные блоки | готов |
| `movies/section-movies.webp` + `movie-1…6` | «Фильмы», каталог | готов |
| `cartoons/section-cartoons.webp` + `cartoon-1…6` | «Мультфильмы» | готов |
| `games/section-games.webp` + `game-1…6` | «Игры», «Ретроинтернет» | готов |
| `music/section-music.webp` + `music-1…6` | «Музыка», кассета | готов |
| `tv/section-tv.webp` | «Телевизор» | готов |
| `stories/section-stories.webp` | «Истории», герой | готов |
| `textures/texture-paper.webp`, `texture-carpet.webp` | фоны, шум | готов |
| `stories/story-1…6.webp` | карточки и чтение историй | готов |
| `ui/og-cover.webp` + `public/og-cover.jpg` | Open Graph 1200×630 | готов |
| `textures/texture-vhs.webp` | слой помех на boot-экране и CRT | готов |

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

## 5. Регенерация: правила приёмки

Кадр принимается, если выполнены все пункты:

1. Есть оба источника света — тёплый и холодный.
2. Нет читаемого текста, логотипов и узнаваемых постеров.
3. Палитра совпадает с соседними кадрами раздела (проверять рядом, а не по одному).
4. Композиция оставляет тёмную нижнюю треть — туда ложится подпись карточки.
5. Кадр не дублирует сюжет уже принятого изображения в том же разделе.

При замене: положить PNG в `assets_raw/` под нужным именем → `node tools/optimize.mjs` → `npm run build` → скриншот `tools/shot.ps1` и визуальная проверка раздела целиком.
