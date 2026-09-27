// Вырезает чистый access_token из того, что попало в .env, проверяет и починит строку.
import fs from 'node:fs';
const path = '.env';
const env = fs.readFileSync(path, 'utf8');
const rawLine = (env.match(/^VK_TOKEN\s*=\s*(.*)$/m) || [])[1] ?? '';
console.log('сырая строка: длина=' + rawLine.length + ', служебные:', (rawLine.match(/[&#?=]/g) || []).join(' '));

const m = rawLine.match(/access_token=([\w.-]+)/) || rawLine.match(/(vk1\.a\.[\w-]+)/);
const clean = (m ? m[1] : rawLine).trim();
console.log(`чистый токен: длина=${clean.length}, начало=${clean.slice(0, 9)}..., хвост=...${clean.slice(-4)}`);

async function call(method, params) {
  const r = await fetch(`https://api.vk.com/method/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: clean, v: '5.199' }),
  });
  return r.json();
}

const who = await call('users.get', {});
if (who.error) {
  console.log(`users.get → ERR ${who.error.error_code}: ${who.error.error_msg}`);
  process.exit(1);
}
console.log('users.get → OK, user_id =', who.response?.[0]?.id);

const s = await call('video.search', { q: 'Терминатор 1984', count: 10, hd: 1 });
if (s.error) {
  console.log(`video.search → ERR ${s.error.error_code}: ${s.error.error_msg}`);
} else {
  console.log(`video.search → OK, всего ${s.response.count}, получено ${s.response.items.length}`);
  for (const v of s.response.items.slice(0, 8))
    console.log(
      `  ${String(Math.round((v.duration ?? 0) / 60)).padStart(4)}м ${new Date((v.date ?? 0) * 1000).toISOString().slice(0, 10)} «${(v.title ?? '').slice(0, 50)}» ${v.owner_id}_${v.id}`,
    );
  console.log('  поля объекта:', Object.keys(s.response.items[0] ?? {}).join(','));
}

if (clean !== rawLine.trim() && !who.error) {
  fs.writeFileSync(path, env.replace(/^VK_TOKEN\s*=.*$/m, `VK_TOKEN=${clean}`), 'utf8');
  console.log('\n.env починен: в VK_TOKEN теперь только сам токен');
}
