// Стенд: проверяем, играет ли плеер Kodik и что шлёт через postMessage.
import http from 'node:http';
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const TOKEN = env.BALANCER1_TOKEN;
const BASE = env.BALANCER1_BASE.replace(/\/$/, '');

const titles = ['Один дома', 'Аладдин', 'Черный плащ'];
const items = [];
for (const t of titles) {
  const r = await fetch(`${BASE}/search?token=${TOKEN}&title=${encodeURIComponent(t)}&limit=3`);
  const j = await r.json();
  const first = (j.results ?? [])[0];
  if (first) items.push({ q: t, title: first.title, year: first.year, type: first.type, link: first.link });
}
console.log(items.map((i) => `${i.q} -> ${i.title} (${i.year}) ${i.type}\n     ${i.link}`).join('\n'));

const blocks = items.map((i, n) => `
<div><h2>#${n} ${i.title} (${i.year})</h2>
<iframe id="k${n}" src="https:${i.link}?start_from=120" width="440" height="250" frameborder="0" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe></div>`).join('');

const html = `<!doctype html><meta charset="utf-8"><title>kodik</title>
<style>body{background:#111;color:#eee;font:12px monospace;margin:10px}h2{font-size:12px}#log{white-space:pre-wrap;font-size:11px}</style>
<div style="display:flex;gap:10px;flex-wrap:wrap">${blocks}</div><div id="log"></div>
<script>
window.__report = { messages: [], done: false };
const log = document.getElementById('log');
addEventListener('message', (e) => {
  const d = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
  window.__report.messages.push({ origin: e.origin, data: String(d).slice(0, 300) });
});
setTimeout(() => {
  for (let n = 0; n < ${items.length}; n += 1) {
    const w = document.getElementById('k' + n)?.contentWindow;
    w?.postMessage({ key: 'kodik_player_api', value: { method: 'seek', seconds: 300 } }, '*');
    w?.postMessage({ key: 'kodik_player_api', value: { method: 'play' } }, '*');
    w?.postMessage({ key: 'kodik_player_api', value: { method: 'get_current_time' } }, '*');
  }
  log.textContent += 'команды отправлены\\n';
}, 9000);
setTimeout(() => { window.__report.done = true; log.textContent += '--- готово ---'; }, 20000);
<\/script>`;

http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(4182);
console.log('\nстенд: http://localhost:4182/');
