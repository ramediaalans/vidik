// Сбор сериальных выпусков с Rutube с пагинацией.
// node tools/tv/collect/rt-series.mjs "запрос" "фильтр-regex" [страниц]
const [q, filter, pagesArg] = process.argv.slice(2);
const re = new RegExp(filter ?? '.', 'i');
const pages = Number(pagesArg ?? 3);
const seen = new Map();
for (let p = 1; p <= pages; p += 1) {
  const r = await fetch(`https://rutube.ru/api/search/video/?query=${encodeURIComponent(q)}&limit=20&page=${p}`, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } });
  const j = await r.json();
  for (const v of j.results ?? []) if (re.test(v.title)) seen.set(v.id, v);
  if (!j.results?.length) break;
}
const rows = [...seen.values()].sort((a, b) => a.title.localeCompare(b.title, 'ru', { numeric: true }));
for (const v of rows) console.log(`${String(v.duration).padStart(5)}s ${(v.created_ts ?? '').slice(0, 10)} | ${v.title.slice(0, 90)} | ${v.id}`);
console.log(`всего: ${rows.length}`);
