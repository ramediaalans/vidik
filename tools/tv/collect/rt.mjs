// Быстрый точечный поиск по Rutube: node tools/tv/collect/rt.mjs "запрос 1" "запрос 2"
for (const q of process.argv.slice(2)) {
  const r = await fetch(`https://rutube.ru/api/search/video/?query=${encodeURIComponent(q)}&limit=10`, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } });
  const j = await r.json();
  console.log(`\n=== ${q} (${j.results?.length ?? 0}) ===`);
  for (const v of j.results ?? []) {
    console.log(`${String(Math.round(v.duration / 60)).padStart(3)}m ${(v.created_ts ?? '').slice(0, 10)} | ${v.title.slice(0, 70)} | ${v.id}`);
  }
}
