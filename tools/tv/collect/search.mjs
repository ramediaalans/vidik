// Поиск контента по запросам в Rutube и YouTube.
// node tools/tv/collect/search.mjs --queries=tools/tv/collect/queries.json --out=tools/tv/collect/cand.json [--only=rutube]
import fs from 'node:fs';
import { env } from '../cdp.mjs';

const E = env();
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const queries = JSON.parse(fs.readFileSync(args.queries, 'utf8'));
const only = args.only ? args.only.split(',') : ['rutube', 'youtube'];
const limit = Number(args.limit ?? 12);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rutube(q) {
  const url = `https://rutube.ru/api/search/video/?query=${encodeURIComponent(q)}&limit=${limit}`;
  const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) return { error: `${r.status}` };
  const j = await r.json();
  return (j.results ?? []).map((v) => ({
    p: 'rutube', id: v.id, t: v.title, dur: v.duration,
    up: (v.created_ts ?? v.publication_ts ?? '').slice(0, 10),
    who: v.author?.name, off: v.author?.is_official ?? v.is_official ?? null,
    adult: v.is_adult ?? null, hits: v.hits ?? null
  }));
}

function iso2sec(s) {
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s ?? '') ?? [];
  return (+(m[1] || 0)) * 86400 + (+(m[2] || 0)) * 3600 + (+(m[3] || 0)) * 60 + (+(m[4] || 0));
}

async function youtube(q) {
  const key = E.YT_API_KEY;
  const s = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${limit}&q=${encodeURIComponent(q)}&key=${key}`);
  if (!s.ok) return { error: `${s.status} ${(await s.text()).slice(0, 120)}` };
  const sj = await s.json();
  const ids = (sj.items ?? []).map((i) => i.id.videoId).filter(Boolean);
  if (!ids.length) return [];
  const d = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${ids.join(',')}&key=${key}`);
  const dj = await d.json();
  return (dj.items ?? []).map((v) => ({
    p: 'youtube', id: v.id, t: v.snippet.title, dur: iso2sec(v.contentDetails.duration),
    up: (v.snippet.publishedAt ?? '').slice(0, 10), who: v.snippet.channelTitle,
    emb: v.status.embeddable, restricted: !!v.contentDetails.contentRating?.ytRating,
    region: v.contentDetails.regionRestriction ?? null
  }));
}

const out = {};
for (const item of queries) {
  const key = item.key;
  out[key] = { q: item.q, need: item.need ?? null, res: [] };
  for (const src of only) {
    if (item.src && !item.src.includes(src)) continue;
    try {
      const res = src === 'rutube' ? await rutube(item.q) : await youtube(item.q);
      if (res.error) out[key].res.push({ p: src, error: res.error });
      else out[key].res.push(...res);
    } catch (e) { out[key].res.push({ p: src, error: String(e).slice(0, 120) }); }
    await sleep(150);
  }
  console.log(`${key}: ${out[key].res.length}`);
}

fs.writeFileSync(args.out, JSON.stringify(out, null, 1), 'utf8');
console.log('-> ' + args.out);
