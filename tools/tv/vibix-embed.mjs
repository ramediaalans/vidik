// Стенд: берём реальные записи из /links и встраиваем их прямым iframe (без SDK).
import http from 'node:http';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const TOKEN = env.BALANCER2_TOKEN;
const BASE = env.BALANCER2_BASE.replace(/\/$/, '');

const res = await fetch(`${BASE}/api/v1/publisher/videos/links?type=movie&limit=20&page=1`, {
  headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' }
});
const json = await res.json();
const arr = [json.data, json.items, json.results, json.data?.data, json].find(Array.isArray);
if (!arr) { console.log(JSON.stringify(json).slice(0, 800)); process.exit(1); }
const rows = arr.slice(0, 4);
const items = rows.map((r) => {
  const m = String(r.embed_code ?? '').match(/data-publisher-id="(\d+)"[^>]*data-type="([a-z]+)"[^>]*data-id="(\d+)"/);
  return {
    title: r.title ?? r.name ?? '?',
    year: r.year,
    dur: r.duration,
    pub: m?.[1], type: m?.[2], id: m?.[3],
    kp: r.kp_id
  };
}).filter((i) => i.id);
console.log(items.map((i) => `${i.id} ${i.type} ${i.dur}\u043c — ${i.title} (${i.year}) kp=${i.kp}`).join('\n'));

const blocks = items.map((i, n) => `
<div><h2>#${n} id=${i.id} ${i.type} — ${i.title}</h2>
<iframe id="v${n}" src="https://river-3-329.kinescopecdn.net/${i.pub}/embed/${i.id}?autoplay=true&lang=ru" width="440" height="250" frameborder="0" allow="autoplay; fullscreen; encrypted-media" referrerpolicy="origin"></iframe></div>`).join('');

const html = `<!doctype html><meta charset="utf-8"><title>vibix embed</title>
<style>body{background:#111;color:#eee;font:13px monospace;margin:12px}iframe{background:#000}h2{font-size:12px}#log{white-space:pre-wrap;font-size:11px}</style>
<div style="display:flex;gap:10px;flex-wrap:wrap">${blocks}</div>
<div id="log"></div>
<script>
window.__report = { messages: [], done: false };
const log = document.getElementById('log');
const say = (s) => { log.textContent += s + '\\n'; };
addEventListener('message', (e) => {
  const d = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
  window.__report.messages.push({ origin: e.origin, data: String(d).slice(0, 300) });
});
setTimeout(() => {
  for (let n = 0; n < ${items.length}; n += 1) {
    const f = document.getElementById('v' + n);
    f?.contentWindow?.postMessage({ type: 'playerCommand', command: 'seek', value: 120, timestamp: Date.now() }, '*');
    f?.contentWindow?.postMessage({ type: 'playerCommand', command: 'getState', timestamp: Date.now() }, '*');
  }
  say('команды отправлены');
}, 9000);
setTimeout(() => { window.__report.done = true; say('--- готово ---'); }, 20000);
<\/script>`;

http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(4181);
console.log('\nстенд: http://localhost:4181/');
