// Сопоставление списка нужных тайтлов с каталогом Vibix.
import fs from 'node:fs';

const movies = JSON.parse(fs.readFileSync('tools/tv/collect/vibix-movie.json', 'utf8'));
const serials = JSON.parse(fs.readFileSync('tools/tv/collect/vibix-serial.json', 'utf8'));
const want = JSON.parse(fs.readFileSync('tools/tv/collect/want-vibix.json', 'utf8'));

const norm = (s) => (s ?? '').toLowerCase().replace(/[ё]/g, 'е').replace(/[^a-zа-я0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const prep = (arr) => arr.map((v) => ({ ...v, k: norm(v.n), ke: norm(v.ne) }));
const M = prep(movies);
const S = prep(serials);

function find(pool, title, year, alt) {
  const t = norm(title);
  const a = alt ? norm(alt) : null;
  const hits = pool.filter((v) => v.k === t || (a && (v.k === a || v.ke === a)) || v.ke === t);
  const near = hits.length ? hits : pool.filter((v) => v.k.includes(t) || t.includes(v.k) || (a && v.ke && (v.ke.includes(a) || a.includes(v.ke))));
  return near
    .map((v) => ({ v, d: year && v.y ? Math.abs(v.y - year) : 99 }))
    .sort((x, y) => x.d - y.d)
    .slice(0, 3)
    .map(({ v, d }) => ({ id: v.id, kp: v.kp, name: v.n, eng: v.ne, year: v.y, q: v.q, up: (v.u ?? '').slice(0, 10), dy: d }));
}

const lines = [];
const out = [];
for (const w of want) {
  const pool = w.type === 'serial' ? S : M;
  const res = find(pool, w.t, w.y, w.alt);
  out.push({ ...w, res });
  lines.push(`\n### ${w.key} «${w.t}» ${w.y ?? ''} [${w.type}]`);
  if (!res.length) lines.push('  !!! НЕ НАЙДЕНО');
  for (const r of res) lines.push(`  id=${r.id} kp=${r.kp} ${r.year} ${r.q} | ${r.name} | ${r.eng ?? ''}`);
}
fs.writeFileSync('tools/tv/collect/vibix-matched.json', JSON.stringify(out, null, 1), 'utf8');
fs.writeFileSync('tools/tv/collect/vibix-matched.txt', lines.join('\n'), 'utf8');
console.log(`не найдено: ${out.filter((o) => !o.res.length).map((o) => o.t).join(' | ') || 'нет'}`);
