"""Пересборка app/src/tv/grid.json из мастер-таблицы (лист «ТВ»).

  python tools/tv/xlsx_to_grid.py путь/к/vidik-content-audit.xlsx app/src/tv/grid.json

Стартовая точка в исходнике (from) берётся из «Замечаний»: «воспроизводить A–B»,
иначе первый диапазон «H:MM:SS–H:MM:SS». Нужен openpyxl.
"""
import json, re, sys
import openpyxl

R = r'(\d+:\d\d:\d\d)\s*[–-]\s*(\d+:\d\d:\d\d)'
CHANNELS = {'Первая': 'pervaya', 'Шестая': 'shestaya', 'Кабельный': 'kabelny'}


def sec(t):
    p = [int(x) for x in t.split(':')] + [0, 0]
    return p[0] * 3600 + p[1] * 60 + p[2]


def media_id(provider, url):
    if provider == 'youtube':
        return re.search(r'(?:v=|youtu\.be/|embed/)([\w-]{11})', url).group(1)
    if provider == 'rutube':
        return re.search(r'rutube\.ru/(?:video|play/embed)/([0-9a-f]{32})', url).group(1)
    if provider == 'vk':
        return re.search(r'video(-?\d+_\d+)', url).group(1)
    return 'testcard'


def main(src, dst):
    rows = list(openpyxl.load_workbook(src, read_only=True)['ТВ'].iter_rows(values_only=True))[1:]
    media, mi, blocks, bi = [], {}, [], {}
    days = {}
    for ch, day, tm, block, typ, title, prov, _dur, url, _st, rem, *_ in rows:
        cid = next(v for k, v in CHANNELS.items() if k in ch)
        start = sec(tm.split('–')[0])
        rem = rem or ''
        m = re.search(r'воспроизводить\s*' + R, rem) or re.search(R, rem)
        frm = sec(m.group(1)) if m else 0
        kind = 't' if prov == 'generated' else ('p' if typ == 'Передача' else 'i')
        key = (prov, media_id(prov, url or ''), title)
        if key not in mi:
            mi[key] = len(media)
            media.append(list(key))
        if block not in bi:
            bi[block] = len(blocks)
            blocks.append(block)
        days.setdefault(day, {}).setdefault(cid, []).append([start, kind, mi[key], frm, bi[block]])
    for chans in days.values():
        for slots in chans.values():
            slots.sort()
    out = {'v': 1, 'source': 'vidik-content-audit.xlsx, лист «ТВ»', 'media': media, 'blocks': blocks,
           'days': {d: days[d] for d in sorted(days)}}
    with open(dst, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f'{dst}: {sum(len(s) for c in days.values() for s in c.values())} слотов, {len(media)} роликов')


if __name__ == '__main__':
    main(*sys.argv[1:3])
