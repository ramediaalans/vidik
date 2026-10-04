// Архив каталога Vibix: карточки, сезоны сериалов, постеры.
// Пишет в archive/vibix/ (в git не попадает). Можно перезапускать — скачанное пропускается.
// Запуск из корня проекта: node tools/vibix-archive/archive.mjs [cards|serials|posters|index|all]
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const OUT = resolve(ROOT, 'archive/vibix');
const RAW = resolve(OUT, 'raw');
const SER = resolve(OUT, 'serials');
const POS = resolve(OUT, 'posters');
for (const d of [OUT, RAW, SER, POS]) mkdirSync(d, { recursive: true });

const env = {};
for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = /^\s*(?:export\s+)?([A-Za-z0-9_.-]+)\s*=\s*(.*)$/.exec(line);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const BASE = env.BALANCER2_BASE.replace(/\/+$/, '');
const HEAD = { Authorization: `Bearer ${env.BALANCER2_TOKEN}`, Accept: 'application/json' };
const FIELDS = 'id,name,name_rus,name_eng,name_original,type,year,kp_id,imdb_id,kp_rating,imdb_rating,voiceovers,tags,poster_url,backdrop_url,quality,duration,genre,country,description,description_short,updated_at,uploaded_at';

const LOG = resolve(OUT, 'log.txt');
const log = (s) => { const l = `[${new Date().toISOString()}] ${s}`; console.log(l); appendFileSync(LOG, l + '\n'); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pad = (n) => String(n).padStart(4, '0');

async function api(path) {
  for (let a = 0; a < 6; a++) {
    try {
      const r = await fetch(BASE + path, { headers: HEAD });
      if (r.ok) return await r.json();
      if (r.status === 404) return null;
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * (a + 1)); continue; }
      throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
    } catch (e) {
      if (a === 5) throw e;
      await sleep(2000 * (a + 1));
    }
  }
  return null;
}

async function pool(items, n, fn) {
  let i = 0, done = 0;
  const total = items.length;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) {
      const it = items[i++];
      try { await fn(it); } catch (e) { log(`  ! ${e.message}`); }
      if (++done % 500 === 0) log(`  ${done}/${total}`);
    }
  }));
}

async function cards() {
  for (const type of ['movie', 'serial']) {
    const dir = resolve(RAW, type);
    mkdirSync(dir, { recursive: true });
    const first = await api(`/api/v1/publisher/videos/links?type=${type}&page=1&limit=100&fields=${FIELDS}`);
    const last = first.meta.last_page;
    log(`cards ${type}: total=${first.meta.total} pages=${last}`);
    writeFileSync(resolve(dir, `page-${pad(1)}.json`), JSON.stringify(first.data));
    for (let p = 2; p <= last; p++) {
      const f = resolve(dir, `page-${pad(p)}.json`);
      if (existsSync(f)) continue;
      const d = await api(`/api/v1/publisher/videos/links?type=${type}&page=${p}&limit=100&fields=${FIELDS}`);
      writeFileSync(f, JSON.stringify(d?.data ?? []));
      if (p % 25 === 0) log(`  ${type} page ${p}/${last}`);
    }
  }
  index();
}

function loadCards() {
  const byId = new Map();
  for (const type of ['movie', 'serial']) {
    const dir = resolve(RAW, type);
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).sort()) for (const c of JSON.parse(readFileSync(resolve(dir, f), 'utf8'))) byId.set(c.id, c);
  }
  return [...byId.values()];
}

function index() {
  const all = loadCards();
  for (const c of all) {
    if (c.type === 'serial' && c.kp_id) {
      const f = resolve(SER, `${c.kp_id}.json`);
      if (existsSync(f)) c.seasons = JSON.parse(readFileSync(f, 'utf8'))?.seasons ?? null;
    }
    const p = resolve(POS, `${c.kp_id || 'v' + c.id}.webp`);
    c.poster_local = existsSync(p) ? `posters/${c.kp_id || 'v' + c.id}.webp` : null;
  }
  writeFileSync(resolve(OUT, 'cards.json'), JSON.stringify(all));
  const kp = {};
  for (const c of all) if (c.kp_id) kp[c.kp_id] = c.id;
  writeFileSync(resolve(OUT, 'index-kp.json'), JSON.stringify(kp));
  writeFileSync(resolve(OUT, 'meta.json'), JSON.stringify({
    source: 'vibix.org publisher API', savedAt: new Date().toISOString(),
    cards: all.length, movies: all.filter((c) => c.type === 'movie').length,
    serials: all.filter((c) => c.type === 'serial').length,
    withSeasons: all.filter((c) => c.seasons).length,
    withPoster: all.filter((c) => c.poster_local).length,
  }, null, 2));
  log(`index: ${all.length} cards -> cards.json`);
}

async function serials() {
  const todo = loadCards().filter((c) => c.type === 'serial' && c.kp_id && !existsSync(resolve(SER, `${c.kp_id}.json`)));
  log(`serials: ${todo.length} to fetch`);
  await pool(todo, 4, async (c) => {
    const d = await api(`/api/v1/serials/kp/${c.kp_id}`);
    writeFileSync(resolve(SER, `${c.kp_id}.json`), JSON.stringify(d));
  });
  index();
}

async function posters() {
  const require = createRequire(resolve(ROOT, 'app/package.json'));
  const sharp = require('sharp');
  const todo = loadCards().filter((c) => c.poster_url && !existsSync(resolve(POS, `${c.kp_id || 'v' + c.id}.webp`)));
  log(`posters: ${todo.length} to fetch`);
  let fail = 0;
  await pool(todo, 8, async (c) => {
    let url = c.poster_url.replace('image.tmdb.org/t/p/original/', 'image.tmdb.org/t/p/w780/');
    for (let a = 0; a < 3; a++) {
      try {
        const r = await fetch(url);
        if (r.status === 404) break;
        if (!r.ok) throw new Error(String(r.status));
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length < 1500) throw new Error('empty');
        await sharp(buf).resize({ width: 600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(resolve(POS, `${c.kp_id || 'v' + c.id}.webp`));
        return;
      } catch { await sleep(800 * (a + 1)); }
    }
    fail++;
    appendFileSync(resolve(OUT, 'posters-failed.txt'), `${c.kp_id}\t${c.id}\t${c.poster_url}\n`);
  });
  log(`posters: failed ${fail}`);
  index();
}

const cmd = process.argv[2] ?? 'all';
log(`=== start ${cmd} ===`);
if (cmd === 'cards' || cmd === 'all') await cards();
if (cmd === 'serials' || cmd === 'all') await serials();
if (cmd === 'posters' || cmd === 'all') await posters();
if (cmd === 'index') index();
log(`=== done ${cmd} ===`);
