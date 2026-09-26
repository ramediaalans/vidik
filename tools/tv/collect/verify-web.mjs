// Проверка живости Rutube/YouTube ассетов из pool-flat.json
import fs from 'node:fs';

const flat = JSON.parse(fs.readFileSync('tools/tv/collect/pool-flat.json', 'utf8'));
const env = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
const KEY = process.env.YT_API_KEY || (env.match(/YT_API_KEY\s*=\s*(\S+)/) || [])[1] || '';

const out = [];

// ---- Rutube ----
const rt = flat.filter((a) => a.provider === 'rutube');
for (const a of rt) {
  let r = { ...a, ok: false, note: '' };
  try {
    const res = await fetch(`https://rutube.ru/api/video/${a.id}/`, {
      headers: { 'user-agent': 'Mozilla/5.0' },
    });
    if (!res.ok) {
      r.note = 'http ' + res.status;
    } else {
      const j = await res.json();
      r.apiTitle = j.title;
      r.apiDur = j.duration;
      r.created = (j.created_ts || '').slice(0, 10);
      r.embeddable = j.is_embeddable !== false;
      r.adult = !!j.is_adult;
      r.hidden = !!j.is_hidden;
      r.ok = !r.adult && !r.hidden && r.embeddable;
      if (!r.ok) r.note = `adult=${r.adult} hidden=${r.hidden} emb=${r.embeddable}`;
      if (a.dur && j.duration && Math.abs(j.duration - a.dur) > 30)
        r.note += ` dur ${a.dur}->${j.duration}`;
    }
  } catch (e) {
    r.note = 'err ' + e.message;
  }
  out.push(r);
  console.log((r.ok ? 'OK  ' : 'FAIL') + ` rt ${a.id} ${r.apiTitle || a.title} ${r.note}`);
}

// ---- YouTube ----
const yt = flat.filter((a) => a.provider === 'youtube');
for (let i = 0; i < yt.length; i += 50) {
  const chunk = yt.slice(i, i + 50);
  const url =
    `https://www.googleapis.com/youtube/v3/videos?part=status,contentDetails,snippet,statistics` +
    `&id=${chunk.map((c) => c.id).join(',')}&key=${KEY}`;
  const res = await fetch(url);
  const j = await res.json();
  if (j.error) {
    console.log('YT ERROR', JSON.stringify(j.error).slice(0, 300));
    break;
  }
  const map = new Map(j.items.map((it) => [it.id, it]));
  for (const c of chunk) {
    const it = map.get(c.id);
    const r = { ...c, ok: false, note: '' };
    if (!it) {
      r.note = 'удалено/приватно';
    } else {
      r.apiTitle = it.snippet.title;
      r.created = it.snippet.publishedAt.slice(0, 10);
      r.embeddable = it.status.embeddable;
      r.rating = it.contentDetails.contentRating?.ytRating || '';
      r.region = it.contentDetails.regionRestriction || null;
      r.ok = r.embeddable && r.rating !== 'ytAgeRestricted';
      if (!r.ok) r.note = `emb=${r.embeddable} rating=${r.rating}`;
      if (r.region) r.note += ' region!';
    }
    out.push(r);
    console.log((r.ok ? 'OK  ' : 'FAIL') + ` yt ${c.id} ${r.apiTitle || c.title} ${r.note}`);
  }
}

fs.writeFileSync('tools/tv/collect/verify-web.json', JSON.stringify(out, null, 1));
const bad = out.filter((r) => !r.ok);
console.log(`\nИТОГО ${out.length}, проблемных ${bad.length}`);
for (const b of bad) console.log(' -', b.provider, b.id, b.src, b.title, '|', b.note);
