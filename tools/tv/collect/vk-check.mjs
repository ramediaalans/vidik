// Проверка токена VK: работает ли video.search. Токен в вывод не попадает.
import fs from 'node:fs';

const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const TOKEN = (env.match(/VK_TOKEN\s*=\s*(\S+)/) || [])[1] || '';
if (!TOKEN) {
  console.log('VK_TOKEN в .env не найден');
  process.exit(1);
}
console.log(`токен найден: тип=${TOKEN.startsWith('vk1.a.') ? 'user (vk1.a.)' : 'service/иной'}, длина=${TOKEN.length}`);

async function call(method, params) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN, v: '5.199' });
  const r = await fetch(`https://api.vk.com/method/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return r.json();
}

const probes = [
  ['video.search', { q: 'Терминатор 1984', count: 10, adult: 1, hd: 1 }],
  ['video.search', { q: 'Утиные истории 1 серия', count: 10 }],
];

for (const [method, params] of probes) {
  const j = await call(method, params);
  if (j.error) {
    console.log(`\n${method} «${params.q}» → ОШИБКА ${j.error.error_code}: ${j.error.error_msg}`);
    continue;
  }
  const r = j.response;
  console.log(`\n${method} «${params.q}» → OK, всего ${r.count}, получено ${r.items.length}`);
  for (const v of r.items.slice(0, 8))
    console.log(
      `  ${String(Math.round((v.duration ?? 0) / 60)).padStart(4)}м ${new Date((v.date ?? 0) * 1000).toISOString().slice(0, 10)} emb=${v.can_attach_link ?? '?'} «${(v.title ?? '').slice(0, 52)}» ${v.owner_id}_${v.id}`,
    );
  const keys = r.items[0] ? Object.keys(r.items[0]).join(',') : '';
  console.log('  поля:', keys.slice(0, 300));
}
