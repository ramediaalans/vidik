// Отчёт по собранному контенту: docs/tv-content-final.md
import fs from 'node:fs';

const pool = JSON.parse(fs.readFileSync('app/src/tv/airtime.json', 'utf8'));
const vibix = JSON.parse(fs.readFileSync('tools/tv/collect/vibix-resolved.json', 'utf8'));
const vibOk = new Set(
  JSON.parse(fs.readFileSync('tools/tv/collect/verify-vibix.json', 'utf8'))
    .filter((r) => r.ok)
    .map((r) => String(r.playerId)),
);
const webOk = new Set(
  JSON.parse(fs.readFileSync('tools/tv/collect/verify-web.json', 'utf8'))
    .filter((r) => r.ok)
    .map((r) => r.id),
);
const kpById = new Map(vibix.map((v) => [String(v.playerId), v.kp]));

const mmss = (s) => (s ? `${Math.floor(s / 60)} мин` : '—');
function link(a) {
  if (a.provider === 'youtube') return `https://youtu.be/${a.id}`;
  if (a.provider === 'rutube') return `https://rutube.ru/video/${a.id}/`;
  if (a.provider === 'vibix') {
    const kp = a.kp ?? kpById.get(String(a.id));
    return kp ? `https://www.kinopoisk.ru/film/${kp}/` : '—';
  }
  return '—';
}
const mark = (a) =>
  a.provider === 'generated' ? '—' : (a.provider === 'vibix' ? vibOk.has(String(a.id)) : webOk.has(a.id)) ? '✔' : '?';

const L = [];
L.push('# Сетка вещания «ВИДИК» — итоговый контент\n');
L.push(
  `Параметры: часовой пояс ${pool.meta.timezone}, старт ротации ${pool.meta.rotationEpoch} (день A). Собрано ${pool.meta.generated}.`,
);
L.push('\nИсточники: **Vibix** (фильмы и сериалы), **Rutube**, **YouTube**. ✔ — ссылка проверена автотестом (жива, встраивается, не 18+).\n');

for (const [cid, ch] of Object.entries(pool.channels)) {
  L.push(`\n## ${ch.title} (\`${cid}\`)\n`);
  for (const day of ['A', 'B', 'C']) {
    L.push(`\n### День ${day}\n`);
    L.push('| Время | Блок | Контент | Источник | Длит. | Залито | ✔ | Ссылка |');
    L.push('|---|---|---|---|---|---|---|---|');
    const blocks = [...ch[day]].sort((a, b) => a.at.localeCompare(b.at));
    for (const b of blocks) {
      b.assets.forEach((a, i) => {
        L.push(
          `| ${i === 0 ? b.at : ''} | ${i === 0 ? b.label : ''} | ${a.title.replace(/\|/g, '/')} | ${a.provider} | ${mmss(a.dur)} | ${a.up ?? '—'} | ${mark(a)} | ${link(a)} |`,
        );
      });
    }
  }
}

L.push('\n## Межпрограммные вставки\n');
for (const [g, arr] of Object.entries(pool.interstitials)) {
  L.push(`\n### ${g}\n`);
  L.push('| Контент | Источник | Длит. | Залито | ✔ | Ссылка |');
  L.push('|---|---|---|---|---|---|');
  for (const a of arr)
    L.push(`| ${a.title.replace(/\|/g, '/')} | ${a.provider} | ${mmss(a.dur)} | ${a.up ?? '—'} | ${mark(a)} | ${link(a)} |`);
}

fs.writeFileSync('docs/tv-content-final.md', L.join('\n') + '\n', 'utf8');
console.log('docs/tv-content-final.md', L.length, 'строк');
