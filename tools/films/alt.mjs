// Разведка альтернативных названий в базе Vibix.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const env = {};
for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = /^\s*(?:export\s+)?([A-Za-z0-9_.-]+)\s*=\s*(.*)$/.exec(line);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const V = env.BALANCER2_BASE.replace(/\/+$/, '');
const H = { Authorization: `Bearer ${env.BALANCER2_TOKEN}`, Accept: 'application/json' };

const QUERIES = [
  'Майор Пэйн',
  'Major Payne',
  'Пэйн',
  'Чудеса на виражах',
  'TaleSpin',
  'Мишки Гамми',
  'Приключения мишек Гамми',
  'Gummi Bears',
  'Винни Пух',
  'Winnie the Pooh',
  'Тарзан',
  'Чокнутый',
  'Бонкерс',
  'Базз Лайтер',
  'Геркулес',
  'Лило и Стич',
  'Мышиный дом',
  'Утиные истории',
  'Все псы попадают в рай',
  'Приключения Флика'
];

const byKp = async (kp) => {
  const r = await fetch(`${V}/api/v1/publisher/videos/kp/${kp}`, { headers: H });
  return { status: r.status, body: await r.text() };
};

for (const q of QUERIES) {
  const r = await fetch(`${V}/api/v1/publisher/videos/search?name=${encodeURIComponent(q)}`, {
    method: 'POST',
    headers: H
  });
  let list = [];
  try {
    list = (await r.json())?.data ?? [];
  } catch {
    list = [];
  }
  console.log(`\n### ${q}  [http ${r.status}, найдено ${list.length}]`);
  for (const it of list.slice(0, 8)) {
    console.log(
      `   ${String(it.year).padEnd(6)} ${String(it.type).padEnd(7)} kp=${String(it.kp_id).padEnd(8)} ${it.name_rus || it.name} | ${it.name_eng || it.name_original || ''}`
    );
  }
}

// точечно по kp_id: Чудеса на виражах=94679, Мишки Гамми=252017, Винни Пух(сериал)=250034,
// Легенда о Тарзане=252748, Чокнутый=94676, Геркулес(сериал)=254031, Базз Лайтер=95233
console.log('\n\n=== точечно по kp_id ===');
for (const [kp, label] of [
  [94679, 'Чудеса на виражах'],
  [252017, 'Мишки Гамми'],
  [250034, 'Новые приключения Винни Пуха'],
  [252748, 'Легенда о Тарзане'],
  [94676, 'Чокнутый'],
  [254031, 'Геркулес (сериал)'],
  [95233, 'Базз Лайтер'],
  [8301, 'Майор Пэйн']
]) {
  const { status, body } = await byKp(kp);
  let d = null;
  try {
    d = JSON.parse(body);
  } catch {
    /* */
  }
  const v = d?.data ?? d;
  console.log(
    `kp=${String(kp).padEnd(8)} http=${status}  ${label}  ->  ${v?.name_rus || v?.name || '—'} (${v?.year ?? '—'}, ${v?.type ?? '—'})`
  );
}
