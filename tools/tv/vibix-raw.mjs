import { readFileSync } from 'node:fs';
const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const h = { Authorization: `Bearer ${env.BALANCER2_TOKEN}`, Accept: 'application/json' };
const b = env.BALANCER2_BASE.replace(/\/$/, '');

const r = await fetch(`${b}/api/v1/publisher/videos/kp/8124`, { headers: h });
console.log('kp/8124 RAW:', (await r.text()).slice(0, 800));

for (const lim of [20, 50, 100]) {
  const q = `/api/v1/publisher/videos/links?limit=${lim}&page=1`;
  const rr = await fetch(b + q, { headers: h });
  const tt = await rr.text();
  console.log(`\n${q} -> ${rr.status}`);
  console.log('  ' + tt.replace(/\s+/g, ' ').slice(0, 400));
}
