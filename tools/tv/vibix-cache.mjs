// Проверяем гипотезу кэша и разные шарды.
const PUB = '679202313';
const paths = [`/${PUB}/embed-kp/444`, `/${PUB}/embed/22293`];
const shards = ['river-3-329', 'river-1-329', 'river-2-329', 'river-3-330', 'river-4-329'];

async function hit(host, p, extra = '', headers = {}) {
  const u = `https://${host}.kinescopecdn.net${p}?lang=ru${extra}`;
  try {
    const r = await fetch(u, { headers, cache: 'no-store' });
    const t = await r.text();
    const stub = /не добавлен|error-overlay/.test(t);
    return `${r.status} len=${t.length} cache=${r.headers.get('x-cache-status')} etag=${(r.headers.get('etag') ?? '').slice(0, 12)} ${stub ? 'шелл' : 'ДРУГОЕ'}`;
  } catch (e) { return 'ОШИБКА ' + e.message; }
}

console.log('--- обход кэша ---');
for (const p of paths) {
  console.log(p);
  console.log('  обычно     :', await hit('river-3-329', p));
  console.log('  ?rnd       :', await hit('river-3-329', p, '&rnd=' + Math.random()));
  console.log('  no-cache hd:', await hit('river-3-329', p, '', { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }));
}

console.log('\n--- другие шарды ---');
for (const s of shards) console.log(s.padEnd(12), await hit(s, paths[0]));
