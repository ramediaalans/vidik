// По kp_id достаём playerId (data-id из embed_code), длительность и сезоны.
import fs from 'node:fs';
import { env } from '../cdp.mjs';

const E = env();
const H = { Authorization: `Bearer ${E.BALANCER2_TOKEN}`, Accept: 'application/json' };
const list = JSON.parse(fs.readFileSync('tools/tv/collect/vibix-need.json', 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const out = [];
for (const it of list) {
  const r = await fetch(`https://vibix.org/api/v1/publisher/videos/kp/${it.kp}`, { headers: H });
  if (!r.ok) { out.push({ ...it, error: r.status }); console.log(`${it.key}: HTTP ${r.status}`); await sleep(120); continue; }
  const j0 = await r.json();
  const d = j0.data ?? j0 ?? {};
  const pid = /data-id="(\d+)"/.exec(d.embed_code ?? '')?.[1] ?? null;
  const type = /data-type="(\w+)"/.exec(d.embed_code ?? '')?.[1] ?? d.type;
  let seasons = null;
  if (d.type === 'serial') {
    const s = await fetch(`https://vibix.org/api/v1/serials/kp/${it.kp}`, { headers: H });
    if (s.ok) {
      const sj = await s.json();
      const sd = sj.data ?? sj ?? {};
      seasons = (sd.seasons ?? []).map((x) => ({ s: x.season ?? x.number ?? x.id, eps: (x.episodes ?? []).length || x.episodes_count || null }));
    }
    await sleep(120);
  }
  out.push({ ...it, playerId: pid, dataType: type, name: d.name_rus ?? d.name, year: d.year, dur: d.duration, q: d.quality, up: (d.uploaded_at ?? '').slice(0, 10), voices: (d.voiceovers ?? []).length, seasons });
  console.log(`${it.key}: id=${pid} type=${type} «${d.name_rus ?? d.name}» ${d.year} ${d.duration ?? '?'}мин ${seasons ? 's' + seasons.length : ''}`);
  await sleep(120);
}
fs.writeFileSync('tools/tv/collect/vibix-resolved.json', JSON.stringify(out, null, 1), 'utf8');
console.log(`\nготово: ${out.length}, без playerId: ${out.filter((o) => !o.playerId).map((o) => o.key).join(', ') || 'нет'}`);
