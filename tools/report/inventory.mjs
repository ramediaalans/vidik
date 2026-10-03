// Отчёты по контенту: инвентарь всех видео и полная сетка на три дня (A/B/C).
// Запуск: node tools/report/inventory.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = join(root, 'app', 'src');
const outDir = join(root, 'docs');
mkdirSync(outDir, { recursive: true });

// ---------- films.ts ----------
const filmsTs = readFileSync(join(src, 'data', 'films.ts'), 'utf8');
function jsonArray(name) {
  const marker = `export const ${name}: Film[] = `;
  const from = filmsTs.indexOf(marker);
  if (from < 0) throw new Error(`не найден ${name}`);
  const start = from + marker.length;
  let depth = 0;
  for (let i = start; i < filmsTs.length; i++) {
    const ch = filmsTs[i];
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return JSON.parse(filmsTs.slice(start, i + 1));
    }
  }
  throw new Error(`не закрыт ${name}`);
}
const salon = jsonArray('salon');
const disney = jsonArray('disney');

const link = (provider, id) =>
  provider === 'youtube' ? `https://www.youtube.com/watch?v=${id}`
    : provider === 'rutube' ? `https://rutube.ru/video/${id}/`
      : provider === 'vk' ? `https://vk.com/video${id}`
        : 'local://generated';

const mmss = (sec) => {
  const s = Math.round(sec || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} ч ${String(m).padStart(2, '0')} мин` : `${m} мин`;
};

// ---------- airtime.json ----------
const airtime = JSON.parse(readFileSync(join(src, 'tv', 'airtime.json'), 'utf8'));
const channelsCfg = {
  pervaya: { num: '01', name: 'Первая кнопка' },
  shestaya: { num: '02', name: 'Шестая кнопка' },
  kabelny: { num: '03', name: 'Кабельный канал' }
};
const DAY = 86400;
const hhmmToSec = (v) => { const [h, m] = v.split(':').map(Number); return h * 3600 + m * 60; };
const pad = (n) => String(n).padStart(2, '0');
const hhmm = (sec) => { const s = ((sec % DAY) + DAY) % DAY; return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}`; };

function toAsset(raw, kind) {
  const sec = raw.dur && raw.dur > 0 ? raw.dur : 1800;
  return {
    provider: raw.provider,
    id: raw.id,
    title: raw.title,
    sec,
    publicRef: link(raw.provider, raw.id),
    label: kind === 'interstitial' ? 'Реклама / заставка' : undefined
  };
}
function interstitialFor(channelId, rotation, n) {
  const groups = channelId === 'kabelny' ? ['vhs', 'ads'] : ['ads', 'idents'];
  const group = airtime.interstitials[groups[n % groups.length]] ?? [];
  const salt = { A: 0, B: 5, C: 10 }[rotation];
  return toAsset(group[(n + salt) % Math.max(group.length, 1)], 'interstitial');
}
function blocksFor(channelId, rotation) {
  const raw = [...(airtime.channels[channelId]?.[rotation] ?? [])].sort((a, b) => hhmmToSec(a.at) - hhmmToSec(b.at));
  let counter = 0;
  return raw.map((block, index) => {
    const kind = block.kind ?? 'program';
    const programs = block.assets.map((a) => toAsset(a, kind));
    const assets = kind === 'program'
      ? programs.flatMap((a) => [a, interstitialFor(channelId, rotation, counter++)])
      : programs;
    return { at: index === 0 ? '00:00' : block.at, label: block.label, kind, assets };
  });
}
function buildDay(channelId, rotation) {
  const blocks = blocksFor(channelId, rotation);
  const slots = [];
  for (let b = 0; b < blocks.length; b++) {
    const block = blocks[b];
    let t = hhmmToSec(block.at);
    const end = b + 1 < blocks.length ? hhmmToSec(blocks[b + 1].at) : DAY;
    let i = 0;
    while (t < end && block.assets.length > 0) {
      const asset = block.assets[i % block.assets.length];
      const duration = Math.min(Math.max(1, asset.sec), end - t);
      slots.push({ start: t, end: t + duration, block: block.label, ...asset });
      t += duration;
      i++;
    }
  }
  return slots;
}

// ---------- отчёт 1: инвентарь ----------
const rows = [];
for (const f of salon) rows.push({ block: 'Видеосалон (/videosalon)', title: f.title + (f.year ? ` (${f.year})` : ''), provider: f.source.provider, id: f.source.id, sec: f.source.duration, url: link(f.source.provider, f.source.id), page: `/videosalon/${f.slug}` });
for (const f of disney) rows.push({ block: 'Дисней-клуб (/multklub)', title: f.title + (f.year ? ` (${f.year})` : ''), provider: f.source.provider, id: f.source.id, sec: f.source.duration, url: link(f.source.provider, f.source.id), page: `/multklub/${f.slug}` });

const tvSeen = new Map();
for (const channelId of Object.keys(channelsCfg)) {
  for (const rotation of ['A', 'B', 'C']) {
    for (const block of airtime.channels[channelId]?.[rotation] ?? []) {
      for (const a of block.assets) {
        const key = `${a.provider}:${a.id}`;
        if (!tvSeen.has(key)) tvSeen.set(key, { block: `ТВ · ${channelsCfg[channelId].name}`, title: a.title, provider: a.provider, id: a.id, sec: a.dur ?? 0, url: link(a.provider, a.id), page: '/televizor', days: new Set() });
        tvSeen.get(key).days.add(`${channelsCfg[channelId].num}${rotation}`);
      }
    }
  }
}
for (const [group, list] of Object.entries(airtime.interstitials ?? {})) {
  for (const a of list) {
    const key = `${a.provider}:${a.id}`;
    if (tvSeen.has(key)) continue;
    tvSeen.set(key, { block: `ТВ · межпрограммка (${group})`, title: a.title, provider: a.provider, id: a.id, sec: a.dur ?? 0, url: link(a.provider, a.id), page: '/televizor', days: new Set() });
  }
}
for (const v of tvSeen.values()) rows.push(v);

const byProvider = rows.reduce((acc, r) => { acc[r.provider] = (acc[r.provider] ?? 0) + 1; return acc; }, {});
let md = `# Инвентарь видео в проекте

Сгенерировано \`tools/report/inventory.mjs\` — руками не править.

Всего записей: **${rows.length}** · видеосалон: ${salon.length} · Дисней-клуб: ${disney.length} · ТВ: ${tvSeen.size}.
По источникам: ${Object.entries(byProvider).map(([p, n]) => `${p} — ${n}`).join(' · ')}.

| Блок | Название | Источник | Длительность | Страница сайта | Ссылка на видео |
| --- | --- | --- | --- | --- | --- |
`;
for (const r of rows) {
  md += `| ${r.block} | ${String(r.title).replace(/\|/g, '\\|')} | ${r.provider} | ${mmss(r.sec)} | ${r.page} | ${r.url} |\n`;
}
writeFileSync(join(outDir, 'video-inventory.md'), md, 'utf8');

// ---------- отчёт 2: сетка на 3 дня ----------
let grid = `# Вещательная сетка: три дня (A/B/C), время UTC+3

Сгенерировано \`tools/report/inventory.mjs\` — руками не править.
Шаблон дня определяется от эпохи 2026-01-01 (день A), дальше цикл A → B → C.
`;
for (const [channelId, cfg] of Object.entries(channelsCfg)) {
  grid += `\n## ${cfg.num} · ${cfg.name}\n`;
  for (const rotation of ['A', 'B', 'C']) {
    const slots = buildDay(channelId, rotation);
    const programs = slots.filter((s) => s.label !== 'Реклама / заставка');
    grid += `\n### День ${rotation} — ${programs.length} передач (+${slots.length - programs.length} межпрограммка)\n\n`;
    grid += `| Время | Блок | Что идёт | Источник | Длит. | Ссылка |\n| --- | --- | --- | --- | --- | --- |\n`;
    for (const s of slots) {
      const title = s.label === 'Реклама / заставка' ? `— межпрограммка: ${s.title}` : s.title;
      grid += `| ${hhmm(s.start)}–${hhmm(s.end)} | ${s.block} | ${String(title).replace(/\|/g, '\\|')} | ${s.provider} | ${mmss(s.end - s.start)} | ${s.publicRef} |\n`;
    }
  }
}
writeFileSync(join(outDir, 'tv-grid-3-days.md'), grid, 'utf8');

console.log(`video-inventory.md: ${rows.length} строк`);
for (const [channelId, cfg] of Object.entries(channelsCfg)) {
  const counts = ['A', 'B', 'C'].map((r) => buildDay(channelId, r).length);
  console.log(`${cfg.name}: слотов A/B/C = ${counts.join('/')}`);
}
