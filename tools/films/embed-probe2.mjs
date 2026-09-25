import { readFileSync, writeFileSync } from 'node:fs';
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

console.log('=== 1. embed_code из карточки ===');
const card = await (await fetch(`${V}/api/v1/publisher/videos/kp/444`, { headers: H })).json();
const c = card?.data ?? card;
console.log('embed_code:', JSON.stringify(c?.embed_code));

console.log('\n=== 2. текст заглушки ===');
const stub = await (
  await fetch('https://river-3-329.kinescopecdn.net/679202313/embed-kp/444?lang=ru')
).text();
writeFileSync(resolve(HERE, 'stub.html'), stub);
const text = stub
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();
console.log(text.slice(0, 700));
console.log('\n-- все url внутри заглушки --');
console.log([...new Set(stub.match(/https?:\/\/[^"'\s<>)]+/g) ?? [])].join('\n'));

console.log('\n=== 3. что внутри SDK ===');
const sdk = await (await fetch('https://graphicslab.io/sdk/v2/rendex-sdk.min.js')).text();
writeFileSync(resolve(HERE, 'sdk.js'), sdk);
console.log('размер SDK:', sdk.length);
console.log('домены и ручки:');
console.log([...new Set(sdk.match(/https?:\/\/[^"'`\s<>)]+/g) ?? [])].join('\n'));
console.log('\nпути embed*:', [...new Set(sdk.match(/embed[a-z-]*/gi) ?? [])].join(', '));
console.log('упоминания publisher:', [...new Set(sdk.match(/publisher[_-]?id|publisherId/gi) ?? [])].join(', '));

console.log('\n=== 4. поиск ручки со своим publisher-id ===');
for (const p of [
  '/api/v1/publisher/get_id',
  '/api/v1/publisher/info',
  '/api/v1/publisher/me',
  '/api/v1/publisher/profile',
  '/api/v1/publisher/account',
  '/api/v1/publisher/domains',
  '/api/v1/publisher/settings',
  '/api/v1/publisher/videos/get_kpids?limit=10'
]) {
  try {
    const r = await fetch(`${V}${p}`, { headers: H });
    const t = await r.text();
    console.log(`   ${p.padEnd(42)} http=${r.status}  ${t.slice(0, 120).replace(/\s+/g, ' ')}`);
  } catch (e) {
    console.log(`   ${p.padEnd(42)} ОШИБКА ${e.message}`);
  }
}

console.log('\n=== 5. почему /links отдал 422 ===');
for (const p of [
  '/api/v1/publisher/videos/links',
  '/api/v1/publisher/videos/links?page=1',
  '/api/v1/publisher/videos/links?page=1&limit=2',
  '/api/v1/publisher/videos/links?page=1&limit=2&type=movie'
]) {
  const r = await fetch(`${V}${p}`, { headers: H });
  const t = await r.text();
  let total = '—';
  try {
    total = JSON.parse(t)?.meta?.total ?? '—';
  } catch {
    /* */
  }
  console.log(`   ${p.replace('/api/v1/publisher/videos', '').padEnd(40)} http=${r.status} total=${total} ${r.status !== 200 ? t.slice(0, 160) : ''}`);
}
