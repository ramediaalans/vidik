// Курирование пулов: берёт сырой отчёт check.mjs + правила sources.json
// и собирает чистый tools/tv/pool.json для генератора сетки.
// Сеть не трогает вообще — работает на кэше.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (f) => JSON.parse(readFileSync(resolve(HERE, f), 'utf8'));

const raw = read('pool.raw.json');
const cfg = read('sources.json');

const rawById = new Map(raw.pools.map((p) => [p.id, p]));
const out = {
  generatedAt: new Date().toISOString(),
  pools: {},
  channels: cfg.channels,
  interstitials: cfg.interstitials ?? []
};
const stats = [];

for (const [poolId, rule] of Object.entries(cfg.pools)) {
  if (rule.disabled) {
    stats.push({ poolId, kept: 0, dropped: 0, note: 'disabled' });
    continue;
  }
  const src = rawById.get(poolId);
  if (!src) {
    stats.push({ poolId, kept: 0, dropped: 0, note: 'нет в pool.raw.json' });
    continue;
  }

  const drop = rule.dropTitleMatch ? new RegExp(rule.dropTitleMatch, 'i') : null;
  const keep = rule.keepTitleMatch ? new RegExp(rule.keepTitleMatch, 'i') : null;
  const reasons = {};
  const bump = (r) => (reasons[r] = (reasons[r] || 0) + 1);

  const kept = [];
  const seen = new Set();
  for (const v of src.videos ?? []) {
    if (seen.has(v.videoId)) { bump('дубликат id'); continue; }
    seen.add(v.videoId);
    if (v.dead) { bump('мёртвое'); continue; }
    if (!v.embeddable) { bump('embed запрещён'); continue; }
    if (v.privacy && v.privacy !== 'public') { bump('не public'); continue; }
    if (rule.minSec && v.durationSec < rule.minSec) { bump('короткое'); continue; }
    if (rule.maxSec && v.durationSec > rule.maxSec) { bump('длинное'); continue; }
    if (rule.minYear && v.year !== null && v.year < rule.minYear) { bump('раньше эпохи'); continue; }
    if (rule.minYear && v.year === null) { bump('год неизвестен'); continue; }
    if (drop && drop.test(v.title)) { bump('чужая эпоха по заголовку'); continue; }
    if (keep && !keep.test(v.title)) { bump('не прошёл keep-фильтр'); continue; }

    const split = rule.splitByDuration?.replayMinSec;
    const kind = split && v.durationSec >= split ? 'replay' : rule.kind;

    // Длинные записи могут быть нужны для якоря, но в паузах между передачами им не место.
    if (kind === 'interstitial' && rule.interstitialMaxSec && v.durationSec > rule.interstitialMaxSec) {
      bump('длинная перебивка');
      continue;
    }

    kept.push({
      p: poolId, // откуда ролик — интерфейс по этому подписывает перебивки
      id: v.videoId,
      t: v.title,
      ch: v.channel,
      sec: v.durationSec,
      year: v.year,
      kind,
      geo: v.blocked ? 'blocked' : v.allowed ? 'allowed' : null
    });
  }

  const byKind = {};
  for (const v of kept) byKind[v.kind] = (byKind[v.kind] || 0) + 1;

  const meta = { tier: rule.tier, era: rule.era, name: rule.name, playlist: rule.playlist };

  if (rule.splitByDuration) {
    out.pools[poolId] = { ...meta, items: kept.filter((v) => v.kind !== 'replay') };
    out.pools[`${poolId}-replay`] = {
      ...meta,
      name: `${rule.name} — цельные блоки`,
      items: kept.filter((v) => v.kind === 'replay')
    };
  } else {
    out.pools[poolId] = { ...meta, items: kept };
  }
  stats.push({
    poolId,
    tier: rule.tier,
    kept: kept.length,
    dropped: (src.videos?.length ?? 0) - kept.length,
    hours: Math.round(kept.reduce((a, b) => a + b.sec, 0) / 360) / 10,
    byKind,
    reasons
  });
}

writeFileSync(resolve(HERE, 'pool.json'), JSON.stringify(out, null, 2), 'utf8');
// Копия для приложения — без отступов, чтобы не раздувать бандл.
writeFileSync(resolve(HERE, '../../app/src/tv/pool.json'), JSON.stringify(out), 'utf8');

console.log('пул                tier  осталось  отсеяно  часов   типы');
console.log('-'.repeat(80));
for (const s of stats) {
  console.log(
    s.poolId.padEnd(18) +
      String(s.tier ?? '-').padEnd(6) +
      String(s.kept).padEnd(11) +
      String(s.dropped ?? '-').padEnd(10) +
      String(s.hours ?? '-').padEnd(9) +
      (s.note ?? JSON.stringify(s.byKind ?? {}))
  );
  if (s.reasons && Object.keys(s.reasons).length) {
    console.log('                   причины отсева: ' + JSON.stringify(s.reasons));
  }
}

console.log('-'.repeat(80));
for (const [chId, ch] of Object.entries(cfg.channels)) {
  const main = (ch.pools ?? []).flatMap((p) => out.pools[p]?.items ?? []);
  const anchors = (ch.anchors ?? []).flatMap((a) => out.pools[a.pool]?.items ?? []);
  const inter = (out.interstitials ?? []).flatMap((p) => out.pools[p]?.items ?? []);
  const h = Math.round(main.reduce((a, b) => a + b.sec, 0) / 360) / 10;
  const ih = Math.round(inter.reduce((a, b) => a + b.sec, 0) / 360) / 10;
  console.log(
    `${ch.num} ${ch.name.padEnd(18)} основного: ${String(main.length).padEnd(5)} (${String(h).padEnd(6)}ч)  якорей: ${String(anchors.length).padEnd(4)} перебивок: ${inter.length} (${ih} ч)`
  );
}
console.log('\nготово: tools/tv/pool.json + app/src/tv/pool.json');
