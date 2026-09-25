// Разведка источников: Vibix (правильные пути), Rutube, VK Video.
//   node tools/tv/probe-sources.mjs
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const short = (s, n = 300) => String(s).replace(/\s+/g, ' ').slice(0, n);

/* ---------- Vibix ---------- */
async function vibix() {
  const base = env.BALANCER2_BASE.replace(/\/$/, '');
  const headers = { Authorization: `Bearer ${env.BALANCER2_TOKEN}`, Accept: 'application/json' };
  console.log('\n=== VIBIX ===');

  const get = async (p) => {
    const r = await fetch(base + p, { headers });
    const t = await r.text();
    let j = null;
    try {
      j = JSON.parse(t);
    } catch {
      /* не JSON */
    }
    return { status: r.status, j, t };
  };

  const cats = await get('/api/v1/publisher/videos/categories');
  console.log(`categories: ${cats.status}`);
  if (cats.j?.data) console.log('  ' + cats.j.data.map((c) => `${c.id}:${c.name}`).join(', '));
  else console.log('  ' + short(cats.t));

  // Сколько всего и есть ли старое кино — главный вопрос для нас.
  for (const q of [
    '/api/v1/publisher/videos/links?type=movie&limit=1',
    '/api/v1/publisher/videos/links?type=movie&year[]=1994&limit=3',
    '/api/v1/publisher/videos/links?type=serial&year[]=1993&limit=3'
  ]) {
    const r = await get(q);
    console.log(`\n${q} -> ${r.status}`);
    if (r.j?.meta) console.log(`  всего: ${r.j.meta.total}`);
    for (const v of r.j?.data ?? []) {
      console.log(
        `  • ${v.year} ${v.name} | ${v.quality} | ${v.duration ?? '?'} мин | kp=${v.kp_id}\n    ${v.iframe_url}`
      );
    }
    if (!r.j) console.log('  ' + short(r.t));
  }

  // Точечный поиск по Кинопоиск ID: 8124 = Гостья из будущего, 454 = Терминатор 2
  for (const kp of [8124, 454, 8228]) {
    const r = await get(`/api/v1/publisher/videos/kp/${kp}`);
    const d = r.j?.data ?? r.j;
    console.log(
      `\nkp/${kp} -> ${r.status} ${d?.name ? `${d.name} (${d.year}) ${d.duration ?? '?'}мин ${d.type}` : short(r.t, 120)}`
    );
    if (d?.iframe_url) console.log(`    ${d.iframe_url}`);
  }
}

/* ---------- Rutube ---------- */
async function rutube() {
  console.log('\n=== RUTUBE ===');
  for (const q of ['Звёздный час Супонев', 'Утиные истории 1991', 'реклама 90-х']) {
    try {
      const r = await fetch(
        `https://rutube.ru/api/search/video/?query=${encodeURIComponent(q)}&limit=5`,
        { headers: { Accept: 'application/json' } }
      );
      const j = await r.json();
      console.log(`\n«${q}» -> ${r.status}, найдено ${j.results_count ?? '?'}`);
      for (const v of (j.results ?? []).slice(0, 3)) {
        console.log(
          `  • ${Math.round((v.duration ?? 0) / 60)}м ${v.author?.name ?? '?'}: ${short(v.title, 60)}`
        );
        console.log(`    embed: https://rutube.ru/play/embed/${v.id}/`);
      }
    } catch (e) {
      console.log(`«${q}» ОШИБКА: ${e.message}`);
    }
  }
}

/* ---------- Можно ли встраивать: смотрим заголовки ---------- */
async function frames() {
  console.log('\n=== ЗАГОЛОВКИ ВСТРАИВАНИЯ ===');
  const urls = [
    'https://rutube.ru/play/embed/10a3e0d5e7e1f1a1b1c1d1e1f1a1b1c1/',
    'https://vk.com/video_ext.php?oid=-22822305&id=456239018&hd=2'
  ];
  for (const u of urls) {
    try {
      const r = await fetch(u, { redirect: 'manual' });
      console.log(`\n${u.slice(0, 60)}… -> ${r.status}`);
      for (const h of ['x-frame-options', 'content-security-policy', 'location']) {
        const v = r.headers.get(h);
        if (v) console.log(`  ${h}: ${short(v, 160)}`);
      }
    } catch (e) {
      console.log(`${u.slice(0, 50)} ОШИБКА: ${e.message}`);
    }
  }
}

await vibix();
await rutube();
await frames();
