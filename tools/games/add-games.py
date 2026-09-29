# -*- coding: utf-8 -*-
"""
Добавляет игры из ROMs\\1 (Gen + NES): распаковывает 7z, кладёт ром в app/public/roms/<id>.<ext>
и генерирует app/src/data/roms-more.ts по списку из new-games.py.

Запуск:  python tools/games/add-games.py [папка_с_ромами]
Зависимость: pip install py7zr
"""
import importlib.util
import io
import json
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.abspath(
    os.path.join(ROOT, '..', 'site_millenials_2_temp', 'ROMs', '1'))
DST = os.path.join(ROOT, 'app', 'public', 'roms')
os.makedirs(DST, exist_ok=True)

spec = importlib.util.spec_from_file_location('new_games', os.path.join(HERE, 'new-games.py'))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
GAMES = mod.GAMES

FOLDER = {'G': 'Gen', 'N': 'NES'}
CORE = {'G': 'genesis_plus_gx', 'N': 'fceumm'}
PLAT = {'G': 'MD', 'N': 'NES'}
ROM_EXT = ('.gen', '.md', '.bin', '.smd', '.nes')


def find_source(plat, prefix):
    folder = os.path.join(SRC, FOLDER[plat])
    hits = [f for f in os.listdir(folder) if f.startswith(prefix)]
    if len(hits) != 1:
        raise RuntimeError(f'{prefix!r}: найдено {len(hits)}: {hits}')
    return os.path.join(folder, hits[0])


def read_rom(path):
    """Возвращает (байты, расширение) — из 7z достаёт самый большой ром."""
    if path.lower().endswith('.7z'):
        import py7zr
        import tempfile
        best = None
        with tempfile.TemporaryDirectory() as tmp:
            with py7zr.SevenZipFile(path) as z:
                z.extractall(tmp)
            for base, _dirs, files in os.walk(tmp):
                for name in files:
                    ext = os.path.splitext(name)[1].lower()
                    if ext in ROM_EXT:
                        with open(os.path.join(base, name), 'rb') as fh:
                            buf = fh.read()
                        if best is None or len(buf) > len(best[0]):
                            best = (buf, ext)
        if best is None:
            raise RuntimeError('в архиве нет рома: ' + path)
        return best
    with open(path, 'rb') as f:
        return f.read(), os.path.splitext(path)[1].lower()


def normalize(buf, ext, plat):
    if plat == 'G':
        if ext == '.smd' or (len(buf) % 0x4000 == 0x200 and buf[0x200 + 0x100:0x200 + 0x104] != b'SEGA'):
            raise RuntimeError('формат SMD — нужна деинтерливация')
        if len(buf) % 0x4000 == 0x200:  # заголовок 512 байт
            buf = buf[0x200:]
        return buf, '.gen'
    if buf[:4] != b'NES\x1a':
        raise RuntimeError('нет заголовка iNES')
    return buf, '.nes'


def ts_str(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def main():
    out = [
        '// Генерируется tools/games/add-games.py по tools/games/new-games.py. Руками не править.',
        "import type { Rom } from './roms';",
        '',
        "const NES = 'Dendy / NES';",
        "const MD = 'Sega Mega Drive';",
        '',
        'export const romsMore: Rom[] = [',
    ]
    problems = []
    total = 0
    for gid, plat, prefix, title, nick, year, genre, players, memory in GAMES:
        try:
            src = find_source(plat, prefix)
            buf, ext = read_rom(src)
            buf, ext = normalize(buf, ext, plat)
        except Exception as exc:  # noqa: BLE001
            problems.append((gid, str(exc)))
            continue
        name = gid + ext
        with open(os.path.join(DST, name), 'wb') as f:
            f.write(buf)
        total += len(buf)
        out.append('  {')
        out.append(f'    id: {ts_str(gid)},')
        out.append(f"    file: 'roms/{name}',")
        out.append(f"    core: '{CORE[plat]}',")
        out.append(f'    title: {ts_str(title)},')
        out.append(f'    nick: {ts_str(nick)},')
        out.append(f'    year: {year},')
        out.append(f'    platform: {PLAT[plat]},')
        out.append(f'    genre: {ts_str(genre)},')
        out.append(f'    players: {players},')
        out.append(f'    memory: {ts_str(memory)}')
        out.append('  },')
        print('ok', gid, len(buf) // 1024, 'KB')
    if out[-1] == '  },':
        out[-1] = '  }'
    out.append('];')
    with open(os.path.join(ROOT, 'app', 'src', 'data', 'roms-more.ts'), 'w', encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(out) + '\n')
    print('ИТОГО', total // 1024 // 1024, 'MB;', len(GAMES) - len(problems), 'игр')
    for p in problems:
        print('ПРОБЛЕМА', p)


if __name__ == '__main__':
    main()
