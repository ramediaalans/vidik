# Архив каталога Vibix

Ключ Vibix действует до декабря 2026, потом API отключат. Этот скрипт заранее сохраняет каталог,
чтобы карточки и постеры новых фильмов можно было брать из своей базы.

```bash
node tools/vibix-archive/archive.mjs all      # карточки, затем сезоны сериалов, затем постеры
node tools/vibix-archive/archive.mjs cards    # только карточки
node tools/vibix-archive/archive.mjs serials  # только сезоны и серии
node tools/vibix-archive/archive.mjs posters  # только постеры
node tools/vibix-archive/archive.mjs index    # пересобрать cards.json из уже скачанного
```

Скрипт можно перезапускать: уже скачанное пропускается. Нужен `.env` с `BALANCER2_BASE` и `BALANCER2_TOKEN`.

## Что получается в `archive/vibix/` (в git не попадает)

| Файл | Содержимое |
| --- | --- |
| `cards.json` | все карточки: названия, год, kp_id, imdb_id, рейтинги, жанры, страны, описания, озвучки, качество, ссылки на постер и фон, `seasons` для сериалов, `poster_local` |
| `index-kp.json` | Кинопоиск ID → id карточки Vibix |
| `meta.json` | дата выгрузки и счётчики |
| `posters/<kp_id>.webp` | постеры шириной до 600 px (без kp_id — `v<id>.webp`) |
| `serials/<kp_id>.json` | сезоны и серии |
| `raw/` | исходные страницы ответа API |
| `posters-failed.txt` | постеры, которые не скачались |
| `log.txt` | журнал запусков |

Архив весит несколько гигабайт. Храните резервную копию вне этого диска (R2, облако).
Видео в архив не входит: это только метаданные и картинки.
