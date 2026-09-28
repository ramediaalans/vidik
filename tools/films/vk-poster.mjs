// Кадры из VK-роликов для того, чего нет в каталоге постеров.
// Запуск: node tools/films/vk-poster.mjs  (идемпотентно, готовые файлы не трогает)
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const OUT = resolve(ROOT, 'app/public/films/disney');
mkdirSync(OUT, { recursive: true });

const FFMPEG = ['C:/ffmpeg/bin/ffmpeg.exe', 'ffmpeg'].find((p) => {
  try { execFileSync(p, ['-version'], { stdio: 'ignore' }); return true; } catch { return false; }
});
if (!FFMPEG) throw new Error('ffmpeg не найден');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36';

// slug → [vk id, секунда кадра, что делаем]
const JOBS = [
  ['drakulito-vampirenysh-1991', '-58264493_456240974', 420, ['poster', 'bg']],
  ['kosmicheskie-spasateli-leytenanta-marsha-1993', '-238771813_456239109', 300, ['bg']],
  ['pogonschiki-dinozavrov-1988', '-229097667_456242074', 300, ['bg']],
  ['nastoyaschie-ohotniki-za-privideniyami-1986', '-182437809_456244273', 300, ['bg']],
  ['voyna-gobotov-1984', '-58264493_456241230', 300, ['bg']],
  // база каталога этих двух не знает вовсе — берём и обложку, и фон кадрами
  // постер есть в базе, а фона нет — добираем кадром
  ['tom-i-dzherri-1940', '-194007084_456241090', 150, ['bg']]
];

async function mp4Url(id) {
  const [oid, vid] = id.split('_');
  const r = await fetch(`https://vk.com/video_ext.php?oid=${oid}&id=${vid}&hd=2`, { headers: { 'user-agent': UA } });
  const html = new TextDecoder('windows-1251').decode(Buffer.from(await r.arrayBuffer()));
  for (const key of ['mp4_720', 'mp4_480', 'mp4_360', 'mp4_240', 'mp4_144']) {
    const m = new RegExp(`"${key}"\\s*:\\s*"(https:[^"]+)"`).exec(html);
    if (m) return m[1].replace(/\\\//g, '/');
  }
  return null;
}

function grab(url, at, file, width) {
  const out = resolve(OUT, file);
  if (existsSync(out) && statSync(out).size > 1500) {
    console.log(`  = уже есть ${file}`);
    return true;
  }
  try {
    execFileSync(FFMPEG, [
      '-y', '-loglevel', 'error',
      '-user_agent', UA,
      '-ss', String(at), '-i', url,
      '-frames:v', '1',
      '-vf', `scale='min(${width},iw)':-2:flags=lanczos`,
      '-quality', '80', out
    ], { stdio: 'ignore' });
    console.log(`  + ${file}`);
    return true;
  } catch {
    console.log(`  ⚠ не вышло ${file}`);
    return false;
  }
}

for (const [slug, id, at, kinds] of JOBS) {
  console.log(slug);
  const need = kinds.filter((k) => {
    const f = resolve(OUT, k === 'bg' ? `${slug}-bg.webp` : `${slug}.webp`);
    return !(existsSync(f) && statSync(f).size > 1500);
  });
  if (!need.length) { console.log('  = всё на месте'); continue; }
  const url = await mp4Url(id);
  if (!url) { console.log('  ⚠ нет прямого mp4'); continue; }
  if (need.includes('poster')) grab(url, at, `${slug}.webp`, 400);
  if (need.includes('bg')) grab(url, at + 60, `${slug}-bg.webp`, 1100);
}
