"""
Собирает картинки картриджей для полки «Игры» и рамку телевизора для эмулятора.

  * картридж — заготовка от пользователя (жёлтый для Dendy/NES, чёрный для Mega Drive);
  * наклейка — настоящий скан этикетки из базы LaunchBox (images.launchbox-app.com);
  * фактура пластика с заготовки переносится на наклейку;
  * результат — webp с альфа-каналом.

Запуск:  python tools/games/build-carts.py [папка_с_заготовками]
По умолчанию заготовки берутся из %USERPROFILE%\\Downloads (или из CART_SRC).
Сканы кэшируются в tools/games/.cache/.
"""
import hashlib
import json
import os
import sys
import urllib.request

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = (sys.argv[1] if len(sys.argv) > 1 else os.environ.get('CART_SRC')
       or os.path.join(os.path.expanduser('~'), 'Downloads'))
CACHE = os.path.join(HERE, '.cache')
OUT = os.path.join(ROOT, 'app', 'public', 'images', 'games', 'carts')
os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.join(ROOT, 'app', 'public', 'images', 'tv'), exist_ok=True)

# panel — углублённое окно под наклейку (пиксели исходника 1536x1024).
BASES = {
    'nes': {'file': 'Желтый картридж NES.png', 'panel': (200, 222, 1340, 742), 'fill': 0.94},
    'md': {'file': 'Черный картридж GEN.png', 'panel': (238, 160, 1298, 798), 'fill': 0.96},
    'snes': {'file': 'Картридж Супер Ниндендо_2.png', 'panel': (168, 140, 1368, 494), 'fill': 0.95},
}

# Рамка этикетки в скане LaunchBox (сканы Mega Drive — один шаблон 800x518).
MD_CROP = (115, 0, 690, 462)

LABELS = {
    'contra-hard-corps': ('md', 'b604a74e-1906-4422-9e44-58669aad9143.png'),
    'mortal-kombat-3': ('md', '645d55b3-e145-4270-b5fa-79828aae56a4.png'),
    'mortal-kombat-2': ('md', 'e499d6bb-f57f-47ae-9a4f-b6e17c473edd.png'),
    'aladdin': ('md', '9e420d4b-cff0-416d-b928-90146a30659a.png'),
    'lion-king': ('md', '2b6984e8-6385-49bd-b2ba-f776151a3031.png'),
    'comix-zone': ('md', 'c0fb275c-6a97-438f-b2a6-08699fec27dd.png'),
    'earthworm-jim': ('md', 'a30307db-2409-48e3-a348-7bdbdc27b040.png'),
    'earthworm-jim-2': ('md', 'd621cae4-5689-4774-a5a7-a2604720f813.png'),
    'battletoads-md': ('md', '3c3e884c-3be7-48ef-acac-b79dded6e584.png'),
    'battletoads-dd-md': ('md', '4f0d60c1-8ac3-484e-88f5-f92a4fbca136.png'),
    'tmnt-hyperstone': ('md', 'd6938f29-ec3a-4f03-8c41-2d16a07d98f1.png'),
    'tmnt-tournament': ('md', 'd46b5c30-9560-4dea-a4cb-1f3b1f1bc03a.png'),
    'dune': ('md', '7402ec49-df67-4e0b-8256-0f87451b1788.png'),
    'prince-of-persia': ('md', 'b64a5001-7fb0-4679-9a8a-28ad7bf4a67b.png'),
    'jurassic-park': ('md', '0cb29d61-62ff-4839-894a-138726a6e537.png'),
    'robocop-terminator': ('md', '852ddf18-c7f8-4cc5-8155-742e0a0127f0.png'),
    'robocop-3': ('md', '42cdaa1b-e66b-4a60-a2c1-60b70e2cfbb8.png'),
    'batman': ('md', '7ee64e90-ef92-4a04-8140-6b585a48d736.png'),
    'batman-forever': ('md', '0e323590-2d47-4743-ad49-3296b116ecb6.png'),
    'doom-troopers': ('md', '0bb069ee-44b0-4e86-a4fa-402a190ad8bc.png'),
    'flintstones': ('md', '3b8af132-d608-4925-9a70-2a1d3eca3d46.png'),
    'tiny-toon': ('md', 'f17f9d4e-3b2d-4481-add7-43dd9cae81df.png'),
    'tom-and-jerry': ('md', 'edbf1613-e287-4c0f-93b9-6b00531fa72b.png'),
    'wwf-wrestlemania': ('md', '41c32de1-08dd-461b-97b3-4ff955ca0d9d.png'),
    # Famicom-картриджи: широкая этикетка, как у «денди»-картриджей.
    'contra': ('nes', '40f8e8d3-4eda-4a25-a991-71722a47bb81.png', (62, 8, 735, 385)),
    # свои наклейки (присланы заказчиком) — tools/games/labels/
    'chip-n-dale': ('nes', 'chip-n-dale.jpg', (0, 0, 1400, 644)),
    'chip-n-dale-2': ('nes', 'chip-n-dale-2.jpg', (0, 0, 1400, 787)),
    # у Contra Force только американская NES-этикетка — вертикальная
    # у Contra Force нет японского издания, а американская этикетка вертикальная. Берём горизонтальную
    # этикетку реального «денди»-картриджа из музея nostalgeek.ru (фото картриджа 1994 года).
    'contra-force': ('nes', 'https://nostalgeek.ru/images/cartridges/003/381/img-0797.jpg', (117, 225, 681, 491)),
    # Super Nintendo: европейские этикетки (все горизонтальные).
    'battletoads-dd-snes': ('snes', 'e0e2648a-e06b-40d2-9a60-3a7ef1ba7200.png', (90, 44, 946, 342)),
    'battlemaniacs': ('snes', 'ea135599-1ae5-4344-b33a-1e0e5d972529.jpg', (80, 36, 714, 248)),
}

# Игры, добавленные из папки ROMs\1: tools/games/new-labels.json
#   id -> [база, файл скана | 'text:Название', [x0, y0, x1, y1], режим]
#   режим: fit — этикетка как есть; pad — вертикальную этикетку кладём на размытый фон,
#   чтобы она встала на горизонтальный картридж; text — нет скана, рисуем этикетку с названием.
NEW_LABELS = {}
_nl = os.path.join(HERE, 'new-labels.json')
if os.path.exists(_nl):
    with open(_nl, encoding='utf-8') as _f:
        NEW_LABELS = json.load(_f)

OUT_WIDTH = 640


def fetch(name):
    local = os.path.join(HERE, 'labels', name)  # свои наклейки лежат в tools/games/labels/
    if os.path.exists(local):
        return Image.open(local).convert('RGBA')
    url = name if name.startswith('http') else 'https://images.launchbox-app.com/' + name
    path = os.path.join(CACHE, name.replace('https://', '').replace('/', '_'))
    if not os.path.exists(path) or os.path.getsize(path) < 2000:
        req = urllib.request.Request(url,
                                     headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=60) as r, open(path, 'wb') as f:
            f.write(r.read())
    return Image.open(path).convert('RGBA')


def pad_label(label, ratio):
    """Вертикальная этикетка -> горизонтальная: по бокам размытое продолжение картинки."""
    lab = label.convert('RGB')
    h = lab.height
    w = int(round(h * ratio))
    if lab.width >= w:
        return lab
    bg = lab.resize((w, int(lab.height * w / lab.width)), Image.LANCZOS)
    top = (bg.height - h) // 2
    bg = bg.crop((0, top, w, top + h)).filter(ImageFilter.GaussianBlur(h * 0.05))
    bg = Image.eval(bg, lambda v: int(v * 0.55))
    bg.paste(lab, ((w - lab.width) // 2, 0))
    return bg


def text_label(title, ratio, kind):
    """Этикетка без скана: градиент и название крупным шрифтом."""
    from PIL import ImageFont
    hue = int(hashlib.md5(title.encode()).hexdigest()[:4], 16) % 360
    h = 600
    w = int(h * ratio)
    import colorsys
    c1 = tuple(int(255 * v) for v in colorsys.hsv_to_rgb(hue / 360, 0.75, 0.85))
    c2 = tuple(int(255 * v) for v in colorsys.hsv_to_rgb(((hue + 40) % 360) / 360, 0.85, 0.35))
    grad = np.zeros((h, w, 3), dtype=np.float32)
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    for i in range(3):
        grad[:, :, i] = c1[i] * (1 - t) + c2[i] * t
    img = Image.fromarray(grad.astype(np.uint8), 'RGB')
    d = ImageDraw.Draw(img)
    font_path = None
    for cand in (r'C:\Windows\Fonts\impact.ttf', r'C:\Windows\Fonts\arialbd.ttf'):
        if os.path.exists(cand):
            font_path = cand
            break
    words = title.upper().split()
    size = int(h * 0.2)
    while size > 20:
        font = ImageFont.truetype(font_path, size) if font_path else ImageFont.load_default()
        lines, cur = [], ''
        for wd in words:
            trial = (cur + ' ' + wd).strip()
            if d.textlength(trial, font=font) <= w * 0.86:
                cur = trial
            else:
                lines.append(cur)
                cur = wd
        lines.append(cur)
        if len(lines) * size * 1.1 <= h * 0.72 and all(d.textlength(x, font=font) <= w * 0.9 for x in lines):
            break
        size -= 4
    y = (h - len(lines) * size * 1.1) / 2
    for line in lines:
        tw = d.textlength(line, font=font)
        d.text(((w - tw) / 2, y), line, font=font, fill=(255, 245, 210), stroke_width=max(2, size // 14), stroke_fill=(20, 10, 10))
        y += size * 1.1
    d.rectangle((0, 0, w - 1, h - 1), outline=(255, 255, 255), width=6)
    return img


def rounded_mask(size, radius, scale=4):
    w, h = size
    big = Image.new('L', (w * scale, h * scale), 0)
    ImageDraw.Draw(big).rounded_rectangle((0, 0, w * scale - 1, h * scale - 1), radius * scale, fill=255)
    return big.resize((w, h), Image.LANCZOS)


def compose(base_img, base, label):
    px0, py0, px1, py1 = base['panel']
    pw, ph = px1 - px0, py1 - py0
    lw, lh = label.size
    ratio = lw / lh
    th = ph * base['fill']
    stretch = min(1.15, max(1.0, (pw * base['fill']) / (th * ratio)))
    tw = th * ratio * stretch
    if tw > pw * base['fill']:
        tw = pw * base['fill']
        th = tw / (ratio * stretch)
    tw, th = int(round(tw)), int(round(th))
    lab = label.convert('RGB').resize((tw, th), Image.LANCZOS)
    x = px0 + (pw - tw) // 2
    y = py0 + (ph - th) // 2

    base_rgb = np.asarray(base_img.convert('RGB'), dtype=np.float32)
    low = np.asarray(base_img.convert('RGB').filter(ImageFilter.GaussianBlur(9)), dtype=np.float32)
    detail = (base_rgb - low).mean(axis=2, keepdims=True)
    region = detail[y:y + th, x:x + tw]
    lab_arr = np.asarray(lab, dtype=np.float32)
    lum = lab_arr.mean(axis=2, keepdims=True) / 255.0
    lab_arr = np.clip(lab_arr + region * (1.6 - 0.9 * lum), 0, 255)
    lab = Image.fromarray(lab_arr.astype(np.uint8), 'RGB')

    radius = max(6, int(min(tw, th) * 0.02))
    mask = rounded_mask((tw, th), radius)

    out = base_img.copy()
    shadow = Image.new('L', base_img.size, 0)
    shadow.paste(mask.point(lambda v: int(v * 0.55)), (x, y + 3))
    shadow = shadow.filter(ImageFilter.GaussianBlur(4))
    dark = Image.new('RGBA', base_img.size, (0, 0, 0, 255))
    dark.putalpha(ImageChops.multiply(shadow, base_img.split()[3]))
    out = Image.alpha_composite(out, dark)
    stick = lab.convert('RGBA')
    stick.putalpha(mask)
    layer = Image.new('RGBA', base_img.size, (0, 0, 0, 0))
    layer.paste(stick, (x, y))
    out = Image.alpha_composite(out, layer)
    edge = ImageChops.subtract(mask, mask.filter(ImageFilter.MinFilter(3)))
    rim = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
    rim.putalpha(edge.point(lambda v: int(v * 0.5)))
    layer = Image.new('RGBA', base_img.size, (0, 0, 0, 0))
    layer.paste(rim, (x, y))
    return Image.alpha_composite(out, layer)


def trim(img):
    alpha = img.split()[3].point(lambda v: 255 if v > 12 else 0)
    box = alpha.getbbox()
    return img.crop(box) if box else img


def main():
    bases = {}
    for key, cfg in BASES.items():
        path = os.path.join(SRC, cfg['file'])
        if not os.path.exists(path):
            sys.exit(f'Нет заготовки: {path}')
        bases[key] = Image.open(path).convert('RGBA')

    ts = ["// Генерируется tools/games/build-carts.py. Руками не править.",
          "// Картридж-заготовка + настоящая наклейка (скан этикетки из LaunchBox).",
          "export const romCart: Record<string, string> = {"]
    jobs = [(rid, spec, 'pad' if rid == 'chip-n-dale-2' else 'fit') for rid, spec in LABELS.items()]
    only = {x for x in os.environ.get('ONLY', '').split(',') if x}  # ONLY=id1,id2 — пересобрать только их
    jobs += [(rid, (s[0], s[1], tuple(s[2])), s[3]) for rid, s in NEW_LABELS.items()]
    for rom_id, spec, mode in jobs:
        if only and rom_id not in only:
            if os.path.exists(os.path.join(OUT, rom_id + '.webp')):
                ts.append(f"  '{rom_id}': 'images/games/carts/{rom_id}.webp',")
            continue
        kind, name = spec[0], spec[1]
        crop = spec[2] if len(spec) > 2 else MD_CROP
        px0, py0, px1, py1 = BASES[kind]['panel']
        ratio = (px1 - px0) / (py1 - py0)
        try:
            if mode == 'text':
                label = text_label(name[5:], ratio, kind)
            else:
                label = fetch(name).crop(crop)
                if mode == 'pad' or (label.width / label.height) < 1.25 and kind == 'nes':
                    label = pad_label(label, ratio)
        except Exception as exc:  # noqa: BLE001
            print('  ! нет наклейки', rom_id, exc)
            continue
        img = trim(compose(bases[kind], BASES[kind], label))
        h = round(img.height * OUT_WIDTH / img.width)
        img = img.resize((OUT_WIDTH, h), Image.LANCZOS)
        img.save(os.path.join(OUT, rom_id + '.webp'), 'WEBP', quality=88, method=6)
        ts.append(f"  '{rom_id}': 'images/games/carts/{rom_id}.webp',")
        print('ok', rom_id, img.size)
    ts.append('};')
    with open(os.path.join(ROOT, 'app', 'src', 'data', 'rom-carts.ts'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(ts) + '\n')

    # Телевизор с приставкой: обрезаем пустые поля слева и справа.
    tv_src = os.environ.get('TV_SRC')
    if tv_src is None:
        cands = sorted(f for f in os.listdir(SRC) if f.startswith('ChatGPT Image 29 сент. 2026 г., 19_19_44'))
        tv_src = os.path.join(SRC, cands[0]) if cands else None
    if tv_src and os.path.exists(tv_src):
        tv = Image.open(tv_src).convert('RGBA').crop((150, 0, 1386, 1024))
        tv.save(os.path.join(ROOT, 'app', 'public', 'images', 'tv', 'game-tv.webp'), 'WEBP', quality=90, method=6)
        print('ok tv', tv.size)
    else:
        print('  ! нет картинки телевизора (TV_SRC)')


if __name__ == '__main__':
    main()
