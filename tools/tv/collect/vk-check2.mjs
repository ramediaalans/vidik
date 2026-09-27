// Диагностика токена VK: два способа передачи (параметр и Bearer) и три метода.
import fs from 'node:fs';
const env = fs.readFileSync('.env', 'utf8');
const TOKEN = (env.match(/VK_TOKEN\s*=\s*(\S+)/) || [])[1] || '';
console.log(`токен: длина=${TOKEN.length}, начало=${TOKEN.slice(0, 8)}..., хвост=...${TOKEN.slice(-4)}`);
if (/[&#?=]/.test(TOKEN)) console.log('!! в токене есть служебные символы — скорее всего скопирован лишний текст');

async function call(method, params, mode) {
  const p = { ...params, v: '5.199' };
  if (mode === 'param') p.access_token = TOKEN;
  const r = await fetch(`https://api.vk.com/method/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(mode === 'bearer' ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
    body: new URLSearchParams(p),
  });
  const j = await r.json();
  return j.error ? `ERR ${j.error.error_code}: ${j.error.error_msg}` : 'OK ' + JSON.stringify(j.response).slice(0, 120);
}

for (const mode of ['param', 'bearer']) {
  console.log(`\n=== способ: ${mode}`);
  console.log('  users.get       ', await call('users.get', {}, mode));
  console.log('  video.search    ', await call('video.search', { q: 'Терминатор 1984', count: 5 }, mode));
  console.log('  video.get       ', await call('video.get', { owner_id: '-22822305', count: 3 }, mode));
}
