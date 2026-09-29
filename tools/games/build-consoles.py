"""
Слои телевизора и приставок для страницы игры.

  * телевизор (без приставки, экран прозрачный) -> images/tv/tv-plain.webp;
  * три приставки, обрезанные по контуру -> images/tv/console-{nes,md,snes}.webp;
  * app/src/data/consoles.ts — положение слота картриджа каждой приставки и размеры окна экрана.

Запуск: python tools/games/build-consoles.py [папка_с_картинками]  (по умолчанию ~/Downloads)
Положение слотов (SLOT) задано в пикселях исходников 1536x1024.
"""
import json
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), 'Downloads')
OUT = os.path.join(ROOT, 'app', 'public', 'images', 'tv')
os.makedirs(OUT, exist_ok=True)

FILES = {
    'tv': 'ChatGPT Image 25 сент. 2026 г., 14_17_10.png',
    'nes': 'ChatGPT Image 29 сент. 2026 г., 23_58_58.png',
    'md': 'ChatGPT Image 30 сент. 2026 г., 00_00_48.png',
    'snes': 'ChatGPT Image 30 сент. 2026 г., 00_04_31.png',
}

# cx — центр слота по X, yb — линия, где картридж «входит» в приставку (нижний край видимой части),
# w — ширина картриджа, lip — толщина передней кромки слота (рисуется поверх картриджа).
SLOT = {
    'nes': dict(cx=930, yb=372, w=720, hide=0.40, lip=(-8, 22), width=0.60),
    'md': dict(cx=779, yb=214, w=540, hide=0.30, lip=(-6, 20), width=0.56),
    'snes': dict(cx=790, yb=236, w=600, hide=0.30, lip=(-6, 16), width=0.46),
}

OUT_W = 1000
TV_BOX_H = 1560  # высота общей коробки в единицах ширины 1536


def hole_bbox(img):
    a = np.asarray(img.split()[3])
    h, w = a.shape
    seen = np.zeros((h, w), bool)
    q = deque([(h // 2, w // 2)])
    seen[h // 2, w // 2] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and a[ny, nx] < 40:
                seen[ny, nx] = True
                q.append((ny, nx))
    ys, xs = np.where(seen)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def main():
    spec = {}
    tv = Image.open(os.path.join(SRC, FILES['tv'])).convert('RGBA')
    x0, y0, x1, y1 = hole_bbox(tv)
    print('tv hole', x0, y0, x1, y1, tv.size)
    tv.save(os.path.join(OUT, 'tv-plain.webp'), 'WEBP', quality=90, method=6)
    m = 6  # окно чуть шире выреза, чтобы игра подходила под рамку без щелей
    W = tv.width
    hole = dict(left=(x0 - m) / W, top=(y0 - m) / TV_BOX_H, width=(x1 - x0 + 2 * m) / W,
                height=(y1 - y0 + 2 * m) / TV_BOX_H)
    cx_screen = (x0 + x1) / 2 / W
    for k in ('nes', 'md', 'snes'):
        im = Image.open(os.path.join(SRC, FILES[k])).convert('RGBA')
        box = im.split()[3].point(lambda v: 255 if v > 12 else 0).getbbox()
        bx0, by0, bx1, by1 = box
        tw, th = bx1 - bx0, by1 - by0
        crop = im.crop(box)
        crop = crop.resize((OUT_W, round(th * OUT_W / tw)), Image.LANCZOS)
        crop.save(os.path.join(OUT, f'console-{k}.webp'), 'WEBP', quality=90, method=6)
        s = SLOT[k]
        cart_left = (s['cx'] - s['w'] / 2 - bx0) / tw
        lip_top = (s['yb'] + s['lip'][0] - by0) / th
        lip_bottom = (th - (s['yb'] + s['lip'][1] - by0)) / th
        spec[k] = dict(
            src=f'images/tv/console-{k}.webp',
            width=s['width'],
            ratio=[tw, th],
            cart=dict(left=round(cart_left * 100, 2), width=round(s['w'] / tw * 100, 2),
                      bottom=round((th - (s['yb'] - by0)) / th * 100, 2), hide=s['hide']),
            lip=dict(top=round(lip_top * 100, 2), bottom=round(lip_bottom * 100, 2)),
        )
        print(k, (tw, th), spec[k])
    ts = ['// Генерируется tools/games/build-consoles.py. Руками не править.',
          'export const TV_BOX_RATIO = ' + f'{W} / {TV_BOX_H};',
          f'export const TV_SCREEN_CENTER_X = {round(cx_screen * 100, 2)};',
          'export const tvHole = ' + json.dumps({k: round(v * 100, 2) for k, v in hole.items()}) + ';',
          'export type ConsoleKind = "nes" | "md" | "snes";',
          'export const consoles: Record<ConsoleKind, {',
          '  src: string; width: number; ratio: [number, number];',
          '  cart: { left: number; width: number; bottom: number; hide: number };',
          '  lip: { top: number; bottom: number };',
          '}> = ' + json.dumps(spec, indent=2) + ';', '']
    with open(os.path.join(ROOT, 'app', 'src', 'data', 'consoles.ts'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(ts))


if __name__ == '__main__':
    main()
