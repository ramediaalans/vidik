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
const CDN = 'https://river-3-329.kinescopecdn.net';
const PUB = '679202313';

const bad = (t) => /ещё? не добавлен/i.test(t);

async function probe(label, url) {
  const r = await fetch(url);
  const t = await r.text();
  const verdict = bad(t) ? 'ЗАГЛУШКА' : '✓ ЕСТЬ КОНТЕНТ';
  console.log(`   ${verdict.padEnd(14)} http=${r.status} len=${String(t.length).padEnd(7)} ${label}`);
  if (!bad(t)) {
    const urls = [...new Set(t.match(/https?:\/\/[^"'\s<>)]+/g) ?? [])].slice(0, 6);
    console.log('        внутри:', urls.join(' | ').slice(0, 300));
  }
  return !bad(t);
}

// берём embed_code у нескольких записей и пробуем его id
const SAMPLES = [
  [444, 'Терминатор 2'],
  [8124, 'Один дома'],
  [301, 'Матрица'],
  [81426, 'Утиные истории (сериал)']
];

for (const [kp, name] of SAMPLES) {
  const j = await (await fetch(`${V}/api/v1/publisher/videos/kp/${kp}`, { headers: H })).json();
  const c = j?.data ?? j;
  const code = c?.embed_code ?? '';
  const type = /data-type="([^"]+)"/.exec(code)?.[1];
  const id = /data-id="([^"]+)"/.exec(code)?.[1];
  console.log(`\n### ${name}  kp=${kp}  каталожный id=${c?.id}  embed: type=${type} id=${id}`);
  await probe(`embed/${id}`, `${CDN}/${PUB}/embed/${id}?lang=ru`);
  await probe(`embed-${type}/${id}`, `${CDN}/${PUB}/embed-${type}/${id}?lang=ru`);
  await probe(`embed-kp/${kp} (как делали раньше)`, `${CDN}/${PUB}/embed-kp/${kp}?lang=ru`);
  await probe(`embed/${c?.id} (каталожный id)`, `${CDN}/${PUB}/embed/${c?.id}?lang=ru`);
}

console.log('\n\n=== есть ли embed_code в списке /links ===');
const list = await (await fetch(`${V}/api/v1/publisher/videos/links?page=1`, { headers: H })).json();
const first = list?.data?.[0];
console.log('ключи записи списка:', Object.keys(first ?? {}).join(', '));
console.log('пример:', JSON.stringify(first)?.slice(0, 400));
