// Что реально отдаёт embed-ручка плеера при разных формах адреса.
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
const PUB = '679202313';
const CDN = 'https://river-3-329.kinescopecdn.net';
const nc = Math.floor(Date.now() / 1000);

const MARKERS = [
  ['не добавлен', /ещё? не добавлен/i],
  ['Извините', /Извините/i],
  ['другой плеер', /другой плеер/i],
  ['m3u8', /m3u8/i],
  ['hls', /hls/i],
  ['тег video', /<video/i],
  ['playerConfig', /player[_-]?config|window\.__/i]
];

async function look(label, url, headers = {}) {
  try {
    const r = await fetch(url, { headers, redirect: 'follow' });
    const t = await r.text();
    const hits = MARKERS.filter(([, re]) => re.test(t)).map(([n]) => n);
    const title = /<title[^>]*>([^<]*)<\/title>/i.exec(t)?.[1] ?? '';
    console.log(
      `\n${label}\n   ${url}\n   http=${r.status} len=${t.length} title="${title.trim().slice(0, 60)}"\n   маркеры: ${hits.join(', ') || '—'}`
    );
    return t;
  } catch (e) {
    console.log(`\n${label}\n   ${url}\n   ОШИБКА ${e.message}`);
    return '';
  }
}

const REF = { Referer: 'http://localhost:5173/', Origin: 'http://localhost:5173' };

console.log('=== 1. разные формы embed ===');
await look('kp-id, как строит SDK', `${CDN}/${PUB}/embed-kp/444?nopreload=true&lang=ru&nc=${nc}`);
await look('kp-id без nc', `${CDN}/${PUB}/embed-kp/444?lang=ru`);
await look('kp-id + Referer', `${CDN}/${PUB}/embed-kp/444?lang=ru&nc=${nc}`, REF);
await look('внутренний id через /embed/', `${CDN}/${PUB}/embed/928220?autoplay=true&lang=ru`);
await look('внутренний id через /embed/ + nc', `${CDN}/${PUB}/embed/928220?lang=ru&nc=${nc}`);
await look('imdb', `${CDN}/${PUB}/embed-imdb/tt0103064?lang=ru&nc=${nc}`);

console.log('\n\n=== 2. что говорит API про залитые файлы ===');
for (const q of [
  ['всего записей', '/api/v1/publisher/videos/links?limit=1'],
  ['is_uploaded=1', '/api/v1/publisher/videos/links?limit=1&is_uploaded=1'],
  ['is_uploaded=0', '/api/v1/publisher/videos/links?limit=1&is_uploaded=0'],
  ['no_ads=1', '/api/v1/publisher/videos/links?limit=1&no_ads=1']
]) {
  try {
    const r = await fetch(`${V}${q[1]}`, { headers: H });
    const j = await r.json();
    console.log(`   ${q[0].padEnd(16)} http=${r.status} total=${j?.meta?.total ?? '—'}`);
  } catch (e) {
    console.log(`   ${q[0].padEnd(16)} ОШИБКА ${e.message}`);
  }
}

console.log('\n=== 3. поля карточки, которые говорят о файле ===');
const card = await (await fetch(`${V}/api/v1/publisher/videos/kp/444`, { headers: H })).json();
const c = card?.data ?? card;
for (const k of ['id', 'iframe_url', 'is_uploaded', 'uploaded_at', 'quality', 'duration', 'translations', 'voiceovers']) {
  const v = c?.[k];
  console.log(`   ${k.padEnd(14)} = ${Array.isArray(v) ? `[${v.length}]` : JSON.stringify(v)?.slice(0, 90)}`);
}
console.log('   все ключи:', Object.keys(c ?? {}).join(', '));

console.log('\n=== 4. статистика публикатора ===');
try {
  const r = await fetch(`${V}/api/v1/publisher/statistics`, { headers: H });
  console.log('  ', r.status, (await r.text()).slice(0, 400));
} catch (e) {
  console.log('   ОШИБКА', e.message);
}
