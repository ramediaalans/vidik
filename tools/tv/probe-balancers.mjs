// Разведка по балансерам: что отдают API и как выглядит ссылка на плеер.
// Токены не печатаем.  node tools/tv/probe-balancers.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const TITLES = ['Аладдин', 'Утиные истории', 'Сейлор Мун', 'Терминатор 2', 'Гостья из будущего'];
const out = { kodik: {}, vibix: {} };

const show = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));

/* ---------- Kodik ---------- */
async function kodik() {
  const base = env.BALANCER1_BASE.replace(/\/$/, '');
  const token = env.BALANCER1_TOKEN;
  console.log(`\n=== kodik (${base}) ===`);
  for (const title of TITLES) {
    const url = `${base}/search?token=${token}&title=${encodeURIComponent(title)}&limit=5&with_material_data=true`;
    try {
      const r = await fetch(url);
      const text = await r.text();
      if (!r.ok) {
        console.log(`  ${title}: HTTP ${r.status} ${text.slice(0, 120)}`);
        continue;
      }
      const j = JSON.parse(text);
      const items = j.results ?? [];
      console.log(`  ${title}: total=${j.total ?? '?'} показано ${items.length}`);
      for (const it of items.slice(0, 3)) {
        console.log(
          `    • ${it.type} · ${it.year} · ${it.title} · перевод: ${it.translation?.title ?? '—'} · ${it.quality ?? ''}`
        );
        console.log(`      link: ${it.link}`);
      }
      if (!out.kodik.sample && items[0]) out.kodik.sample = show(items[0], Object.keys(items[0]));
    } catch (e) {
      console.log(`  ${title}: ОШИБКА ${e.message}`);
    }
  }
}

/* ---------- Vibix ---------- */
async function vibix() {
  const base = env.BALANCER2_BASE.replace(/\/$/, '');
  const token = env.BALANCER2_TOKEN;
  console.log(`\n=== vibix (${base}) ===`);
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/json' };
  // Пути у балансеров разные — пробуем несколько типовых.
  const paths = [
    '/api/v1/publisher/videos?search=Аладдин',
    '/api/v1/videos?search=Аладдин',
    '/api/v1/search?query=Аладдин',
    '/api/v1/content/search?query=Аладдин',
    '/api/v1/publisher/videos'
  ];
  for (const p of paths) {
    try {
      const r = await fetch(base + p, { headers });
      const text = await r.text();
      const short = text.slice(0, 260).replace(/\s+/g, ' ');
      console.log(`  ${r.status} ${p}`);
      console.log(`      ${short}`);
      if (r.ok && !out.vibix.path) {
        out.vibix.path = p;
        try {
          out.vibix.sample = JSON.parse(text);
        } catch {
          out.vibix.sample = text.slice(0, 2000);
        }
      }
    } catch (e) {
      console.log(`  ОШИБКА ${p}: ${e.message}`);
    }
  }
}

await kodik();
await vibix();
writeFileSync(new URL('./balancer-probe.json', import.meta.url), JSON.stringify(out, null, 2), 'utf8');
console.log('\nсохранено: tools/tv/balancer-probe.json');
