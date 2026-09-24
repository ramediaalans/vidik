// Импорт коллекции MP3 в сайт: читает ID3-теги, пережимает файлы в 128 kbps
// и собирает app/src/data/tracks.ts.
//
//   node tools/import-music.mjs [--src "E:/..."] [--bitrate 128k] [--limit 0] [--force]
//
// Исходники не трогаем. app/public/music/ в .gitignore — в репозиторий треки не попадают.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const token = process.argv[i];
  if (!token.startsWith('--')) continue;
  const key = token.slice(2);
  const next = process.argv[i + 1];
  if (!next || next.startsWith('--')) args.set(key, 'true');
  else {
    args.set(key, next);
    i += 1;
  }
}

const SRC = args.get('src') ?? 'E:/AI-workspace/sandbox/site_millenials_2_temp/Musik';
const ROOT = 'E:/AI-workspace/sandbox/site_millenials_2';
const DST = path.join(ROOT, 'app/public/music');
const DATA = path.join(ROOT, 'app/src/data/tracks.ts');
const BITRATE = args.get('bitrate') ?? '128k';
const LIMIT = Number(args.get('limit') ?? 0);
const FORCE = args.has('force');

const FFMPEG = ['C:/ffmpeg/bin/ffmpeg.exe', 'ffmpeg'].find(
  (p) => p === 'ffmpeg' || fs.existsSync(p)
);
const FFPROBE = FFMPEG === 'ffmpeg' ? 'ffprobe' : path.join(path.dirname(FFMPEG), 'ffprobe.exe');

const cp1251 = new TextDecoder('windows-1251');
const utf16 = new TextDecoder('utf-16');
const utf16be = new TextDecoder('utf-16be');
const utf8 = new TextDecoder('utf-8');

function decodeText(encoding, bytes) {
  const raw =
    encoding === 1 ? utf16.decode(bytes) : encoding === 2 ? utf16be.decode(bytes) : encoding === 3 ? utf8.decode(bytes) : cp1251.decode(bytes);
  return raw.replace(/\u0000+$/g, '').trim();
}

/** Теги ID3v2.2/2.3/2.4 — в русских рипах 90-х текст обычно в windows-1251. */
function readId3v2(buf) {
  if (buf.subarray(0, 3).toString('latin1') !== 'ID3') return null;
  const major = buf[3];
  const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
  const idLength = major === 2 ? 3 : 4;
  const headerLength = major === 2 ? 6 : 10;
  const out = {};
  let pos = 10;
  const end = Math.min(10 + size, buf.length);

  while (pos + headerLength <= end) {
    const id = buf.subarray(pos, pos + idLength).toString('latin1');
    if (!/^[A-Z0-9]+$/.test(id)) break;
    let frameSize;
    if (major === 2) frameSize = (buf[pos + 3] << 16) | (buf[pos + 4] << 8) | buf[pos + 5];
    else if (major === 4)
      frameSize =
        ((buf[pos + 4] & 0x7f) << 21) | ((buf[pos + 5] & 0x7f) << 14) | ((buf[pos + 6] & 0x7f) << 7) | (buf[pos + 7] & 0x7f);
    else frameSize = buf.readUInt32BE(pos + 4);
    const start = pos + headerLength;
    if (frameSize <= 0 || start + frameSize > end) break;
    if (id.startsWith('T')) {
      const body = buf.subarray(start, start + frameSize);
      out[id] = decodeText(body[0], body.subarray(1));
    }
    pos = start + frameSize;
  }

  return {
    title: out.TIT2 ?? out.TT2,
    artist: out.TPE1 ?? out.TP1,
    album: out.TALB ?? out.TAL,
    year: out.TYER ?? out.TDRC ?? out.TYE
  };
}

function readId3v1(buf) {
  const tail = buf.subarray(buf.length - 128);
  if (tail.subarray(0, 3).toString('latin1') !== 'TAG') return null;
  const field = (from, to) => cp1251.decode(tail.subarray(from, to)).replace(/\u0000.*$/s, '').trim();
  return { title: field(3, 33), artist: field(33, 63), album: field(63, 93), year: field(93, 97) };
}

/** Чистим технический мусор: номера дорожек, подчёркивания, двойные пробелы. */
function clean(value) {
  if (!value) return '';
  let out = value.replace(/[_]+/g, ' ').replace(/\s*\.mp3$/i, '');
  // В сборниках номера часто идут в два этажа: "#1 18 Наши люди".
  for (let i = 0; i < 2; i += 1) out = out.replace(/^\s*#?\d{1,3}[\s.\-)]+/, '');
  return out.replace(/\s{2,}/g, ' ').trim();
}

function fromFileName(name) {
  const base = clean(name.replace(/\.mp3$/i, ''));
  const parts = base.split(/\s+-\s+|\s+–\s+/);
  if (parts.length >= 2) {
    const artist = clean(parts[0]);
    const title = clean(parts.slice(1).join(' - '));
    if (artist && title) return { artist, title };
  }
  return { artist: '', title: base };
}

const translitMap = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
  і: 'i', ў: 'u', є: 'e', ї: 'i'
};

function slugify(value) {
  return value
    .toLowerCase()
    .split('')
    .map((ch) => translitMap[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function duration(file) {
  try {
    const out = execFileSync(
      FFPROBE,
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file],
      { encoding: 'utf8' }
    );
    return Math.round(Number(out.trim()));
  } catch {
    return 0;
  }
}

fs.mkdirSync(DST, { recursive: true });

const sources = fs
  .readdirSync(SRC)
  .filter((n) => n.toLowerCase().endsWith('.mp3'))
  .sort((a, b) => a.localeCompare(b, 'ru'));

const list = LIMIT > 0 ? sources.slice(0, LIMIT) : sources;
const tracks = [];
const used = new Set();
let converted = 0;
let skipped = 0;

for (const [index, name] of list.entries()) {
  const full = path.join(SRC, name);
  const buf = fs.readFileSync(full);
  const tag = readId3v2(buf) ?? readId3v1(buf) ?? {};
  const guess = fromFileName(name);

  const artist = clean(tag.artist) || guess.artist || 'Неизвестный исполнитель';
  const title = clean(tag.title) || guess.title || name.replace(/\.mp3$/i, '');
  const album = clean(tag.album);
  const year = Number((tag.year ?? '').slice(0, 4)) || 0;

  let id = slugify(`${artist}-${title}`) || `track-${index + 1}`;
  while (used.has(id)) id = `${id}-2`;
  used.add(id);

  const outFile = path.join(DST, `${id}.mp3`);
  if (FORCE || !fs.existsSync(outFile)) {
    execFileSync(
      FFMPEG,
      ['-hide_banner', '-loglevel', 'error', '-y', '-i', full, '-vn', '-map_metadata', '-1',
       '-c:a', 'libmp3lame', '-b:a', BITRATE, '-ar', '44100', '-ac', '2', outFile],
      { stdio: 'inherit' }
    );
    converted += 1;
  } else skipped += 1;

  tracks.push({
    id,
    file: `music/${id}.mp3`,
    artist,
    title,
    album: album || undefined,
    year: year || undefined,
    duration: duration(outFile)
  });

  if ((index + 1) % 20 === 0) console.log(`  ${index + 1}/${list.length}`);
}

tracks.sort((a, b) => a.artist.localeCompare(b.artist, 'ru') || a.title.localeCompare(b.title, 'ru'));

const body = tracks
  .map((t) => {
    const fields = [
      `    id: ${JSON.stringify(t.id)}`,
      `    file: ${JSON.stringify(t.file)}`,
      `    artist: ${JSON.stringify(t.artist)}`,
      `    title: ${JSON.stringify(t.title)}`
    ];
    if (t.album) fields.push(`    album: ${JSON.stringify(t.album)}`);
    if (t.year) fields.push(`    year: ${t.year}`);
    fields.push(`    duration: ${t.duration}`);
    return `  {\n${fields.join(',\n')}\n  }`;
  })
  .join(',\n');

const file = `// Сгенерировано tools/import-music.mjs — ручные правки затрёт следующий запуск.
// Сами файлы лежат в app/public/music/ и в гит не коммитятся.

export type Track = {
  id: string;
  file: string;
  artist: string;
  title: string;
  album?: string;
  year?: number;
  /** длительность в секундах */
  duration: number;
};

export const tracks: Track[] = [
${body}
];
`;

fs.writeFileSync(DATA, file, 'utf8');

const totalMb = tracks.reduce((sum, t) => sum + fs.statSync(path.join(ROOT, 'app/public', t.file)).size, 0) / 1024 / 1024;
console.log(`готово: ${tracks.length} треков (пережато ${converted}, пропущено ${skipped}), ${totalMb.toFixed(1)} МБ`);
