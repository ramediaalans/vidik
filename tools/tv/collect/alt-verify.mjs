// Проверка найденных альтернатив: живы ли и встраиваются ли.
import fs from 'node:fs';

const rows = JSON.parse(fs.readFileSync('tools/tv/collect/alt-found.json', 'utf8'));
const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const KEY = process.env.YT_API_KEY || (env.match(/YT_API_KEY\s*=\s*(\S+)/) || [])[1] || '';

const out = [];
for (const r of rows) {
  const cand = [...r.rutube.slice(0, 2), ...r.youtube.slice(0, 2)];
  const checked = [];
  for (const c of cand) {
    if (c.p === 'rutube') {
      const res = await fetch(`https://rutube.ru/api/video/${c.id}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      }).catch(() => null);
      if (!res || !res.ok) {
        checked.push({ ...c, ok: false, note: 'http ' + (res?.status ?? 'err') });
        continue;
      }
      const j = await res.json();
      const ok = j.is_embeddable !== false && !j.is_adult && !j.is_hidden && !j.is_deleted;
      checked.push({
        ...c,
        ok,
        apiTitle: j.title,
        apiDur: j.duration,
        note: ok ? '' : `emb=${j.is_embeddable} adult=${j.is_adult} hidden=${j.is_hidden}`,
      });
    } else {
      const d = await (
        await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=status,contentDetails,snippet&id=${c.id}&key=${KEY}`,
        )
      ).json();
      const it = d.items?.[0];
      const ok =
        !!it && it.status.embeddable && it.contentDetails.contentRating?.ytRating !== 'ytAgeRestricted';
      checked.push({ ...c, ok, apiTitle: it?.snippet.title, note: ok ? '' : 'emb/rating/удалено' });
    }
  }
  const best = checked.find((c) => c.ok) ?? null;
  out.push({ ...r, checked, best });
  console.log(
    `${best ? 'OK  ' : 'НЕТ '} ${r.key} — ${r.name}` +
      (best ? ` → ${best.p}:${best.id} ${Math.round(best.dur / 60)}м «${(best.apiTitle ?? best.t).slice(0, 45)}»` : ''),
  );
}
fs.writeFileSync('tools/tv/collect/alt-verified.json', JSON.stringify(out, null, 1), 'utf8');
console.log(`\nзамена есть: ${out.filter((o) => o.best).length}/${out.length}`);
