// Выгрузка каталога Vibix в локальный файл для поиска по названию.
import fs from 'node:fs';
import { env } from '../cdp.mjs';

const E = env();
const TOKEN = E.BALANCER2_TOKEN;
const BASE = 'https://vibix.org/api/v1/publisher/videos/links';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const type = args.type ?? 'movie';
const out = args.out ?? `tools/tv/collect/vibix-${type}.json`;
const maxPages = Number(args.pages ?? 500);

async function page(p) {
  const url = `${BASE}?type=${type}&page=${p}&limit=100`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' } });
    if (r.ok) return r.json();
    if (r.status === 429) { await new Promise((s) => setTimeout(s, 2500)); continue; }
    throw new Error(`${r.status} ${await r.text()}`);
  }
  throw new Error('retries exhausted');
}

const first = await page(1);
const total = first.meta?.total ?? 0;
const last = Math.min(first.meta?.last_page ?? 1, maxPages);
console.log(`type=${type} total=${total} pages=${first.meta?.last_page} -> тянем ${last}`);

const rows = [];
const push = (d) => { for (const v of d) rows.push({ id: v.id, n: v.name_rus || v.name, ne: v.name_eng, y: v.year, kp: v.kp_id, imdb: v.imdb_id, q: v.quality, u: v.uploaded_at, ifr: v.iframe_url }); };
push(first.data);

for (let p = 2; p <= last; p += 1) {
  const d = await page(p);
  push(d.data);
  if (p % 25 === 0) console.log(`  page ${p}/${last} rows=${rows.length}`);
}

fs.writeFileSync(out, JSON.stringify(rows), 'utf8');
console.log(`готово: ${rows.length} записей -> ${out}`);
