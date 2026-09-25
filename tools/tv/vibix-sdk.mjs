// Стенд строго по официальной инструкции Vibix: оба скрипта в <head>, теги <ins> в <body>.
// Плюс отвечаем на rendex_request_domain всеми правдоподобными формами ответа.
import http from 'node:http';

const PUB = '679202313';
// Ровно те примеры, что в их же инструкции.
const cases = [
  ['movie', '1', 'из инструкции: movie/1'],
  ['movie', '187471', 'из инструкции: movie/187471'],
  ['series', '12345', 'из инструкции: series/12345'],
  ['kp', '326', 'из инструкции: kp/326 (Побег из Шоушенка)'],
  ['kp', '444', 'Терминатор по kp'],
  ['imdb', 'tt0111161', 'из инструкции: imdb']
];

const blocks = cases.map(([t, id, note], n) => `
<div class="c"><h2>#${n} ${t}/${id} — ${note}</h2>
<ins class="p" data-slot="${n}" data-publisher-id="${PUB}" data-type="${t}" data-id="${id}"></ins></div>`).join('');

const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>vibix sdk</title>
<script src="https://graphicslab.io/sdk/v2/rendex-sdk.min.js" async><\/script>
<script src="https://alt.graphicslab.io/sdk/v2/rendex-sdk.min.js" async><\/script>
<style>body{background:#111;color:#eee;font:12px monospace;margin:10px}
.wrap{display:flex;gap:10px;flex-wrap:wrap}.c{width:440px}h2{font-size:11px;margin:4px 0}
ins{display:block;width:440px;height:230px;background:#000}#log{white-space:pre-wrap;font-size:10px;margin-top:8px}</style>
</head><body>
<div class="wrap">${blocks}</div>
<div id="log"></div>
<script>
window.__report = { messages: [], answered: 0, done: false };
const log = document.getElementById('log');
const say = (s) => { log.textContent += s + '\\n'; };

addEventListener('message', (e) => {
  const raw = typeof e.data === 'string' ? e.data : JSON.stringify(e.data);
  window.__report.messages.push({ origin: e.origin, data: String(raw).slice(0, 250) });
  // Отвечаем на запрос домена всеми правдоподобными формами.
  if (/rendex_request_domain/.test(raw)) {
    const d = 'art-ai.studio';
    const src = e.source;
    const variants = [
      { type: 'rendex_domain', domain: d, timestamp: Date.now() },
      { type: 'rendex_response_domain', domain: d, timestamp: Date.now() },
      { type: 'rendex_domain', value: d, timestamp: Date.now() },
      { type: 'rendex_request_domain', domain: d, timestamp: Date.now() },
      { type: 'domain', domain: d }
    ];
    for (const v of variants) { try { src.postMessage(v, '*'); } catch (_) {} }
    window.__report.answered += 1;
    say('ответили на rendex_request_domain (' + window.__report.answered + ')');
  }
});

setTimeout(() => {
  const frames = Array.from(document.querySelectorAll('iframe'));
  window.__report.frames = frames.map((f) => ({ src: (f.src || '').slice(0, 160), w: Math.round(f.getBoundingClientRect().width) }));
  window.__report.done = true;
  say('--- готово, iframe: ' + frames.length + ' ---');
}, 22000);
<\/script></body></html>`;

http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); }).listen(4183);
console.log('stand: http://localhost:4183/');
