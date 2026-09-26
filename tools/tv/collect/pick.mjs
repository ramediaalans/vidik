// Отбор кандидатов по длительности, дате заливки и совпадению названия.
import fs from 'node:fs';

const cand = JSON.parse(fs.readFileSync('tools/tv/collect/cand.json', 'utf8'));

const RANGE = [
  ['c1.mult.', 240, 1600], ['c1.utro.', 900, 5700], ['c1.kino.', 2400, 5700],
  ['c1.nov.', 1100, 3200], ['c1.igra.', 1300, 3900], ['c1.fam.', 1000, 3200],
  ['c1.sup.', 900, 2400], ['c1.disney.', 1000, 1600], ['c1.teen.', 900, 3900],
  ['c1.show.', 1400, 3400], ['c1.prime.', 1600, 5000], ['c1.anchor.spokoynoy', 240, 1200],
  ['c1.anchor.vremya', 600, 2800], ['c1.humor.', 900, 3900], ['c1.night.klipy', 1500, 14400],
  ['c1.night.', 1200, 4500],
  ['c2.anime.', 900, 1700], ['c2.cart.', 900, 1700], ['c2.nick.', 600, 1700],
  ['c2.ser.elen', 1100, 1900], ['c2.ser.', 2000, 3400], ['c2.game.', 700, 2600],
  ['c2.adv.', 2200, 3100], ['c2.myst.', 1000, 1800], ['c2.sketch.', 900, 3200],
  ['c2.eve.', 2200, 3100], ['c2.sf.', 2200, 4200], ['c2.mtv.bivis', 200, 1900],
  ['c2.mtv.', 1200, 3200], ['c2.rock.', 1500, 14400],
  ['x.ad.', 40, 2600], ['x.id.trailer', 40, 1900], ['x.id.', 4, 700]
];
const range = (k) => (RANGE.find(([p]) => k.startsWith(p)) ?? [null, 60, 7200]).slice(1);

const BAD = /реакция|обзор|разбор|shorts|как сейчас|что стало|судьба|интервью|биограф|нейросет|караоке|фанатск|почему|топ-?\d|вспоминаем|ведущая|ведущий спустя/i;
const norm = (s) => (s ?? '').toLowerCase().replace(/[«»"'.,:;!?()\[\]\/|–—-]/g, ' ').replace(/\s+/g, ' ').trim();
const STOP = new Set(['выпуск', 'серия', 'сезон', 'мультсериал', 'мультфильм', 'сериал', 'фильм', 'архив', 'сборник', 'передача', 'заставка', 'реклама']);

const rows = [];
for (const [key, v] of Object.entries(cand)) {
  const [lo, hi] = range(key);
  const qt = norm(v.q).split(' ').filter((w) => w.length > 2 && !STOP.has(w));
  const scored = v.res.filter((r) => !r.error && r.dur >= lo && r.dur <= hi && !BAD.test(r.t ?? ''))
    .filter((r) => r.p !== 'youtube' || (r.emb && !r.restricted))
    .map((r) => {
      const t = norm(r.t);
      const hit = qt.filter((w) => t.includes(w.slice(0, Math.max(4, w.length - 2)))).length;
      const ageYears = r.up ? (Date.now() - Date.parse(r.up)) / 31536000000 : 0;
      const score = hit * 10 + Math.min(ageYears, 6) * 2 + (r.off ? 3 : 0) + Math.log10((r.hits ?? 10) + 10);
      return { ...r, hit, hitOf: qt.length, age: +ageYears.toFixed(1), score: +score.toFixed(1) };
    })
    .sort((a, b) => b.score - a.score);
  const seen = new Set();
  const take = [];
  for (const r of scored) {
    const sig = norm(r.t).slice(0, 45);
    if (seen.has(sig)) continue;
    seen.add(sig);
    take.push(r);
    if (take.length >= (v.need ?? 3)) break;
  }
  rows.push({ key, q: v.q, need: v.need, lo, hi, total: v.res.length, take });
}

fs.writeFileSync('tools/tv/collect/picked.json', JSON.stringify(rows, null, 1), 'utf8');
const lines = [];
for (const r of rows) {
  lines.push(`\n### ${r.key} [${r.need}/${r.take.length}]`);
  if (!r.take.length) lines.push('  !!! НИЧЕГО НЕ ПОДОШЛО');
  for (const t of r.take) {
    lines.push(`  ${t.p[0]} ${String(Math.round(t.dur / 60)).padStart(3)}m ${t.up} ${t.hit}/${t.hitOf} | ${t.t.slice(0, 62)} | ${t.id}`);
  }
}
fs.writeFileSync('tools/tv/collect/picked.txt', lines.join('\n'), 'utf8');
console.log(`готово. пустых: ${rows.filter((r) => !r.take.length).map((r) => r.key).join(', ') || 'нет'}`);
