// Стенд для проверки чужих плееров: встраиваются ли, стартуют ли с середины,
// говорят ли по postMessage и нет ли преролла.
//   node tools/tv/embed-test.mjs        — поднимает сервер на http://localhost:4180/
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const SEEK_TO = 300; // на какую секунду просим встать

/* ---------- собираем адреса ---------- */

async function vibixFrame() {
  const r = await fetch(`${env.BALANCER2_BASE.replace(/\/$/, '')}/api/v1/publisher/videos/kp/8124`, {
    headers: { Authorization: `Bearer ${env.BALANCER2_TOKEN}`, Accept: 'application/json' }
  });
  const j = await r.json();
  const d = j.data ?? j;
  // iframe_url пустой: Vibix встраивается через свой SDK и тег <ins>.
  return {
    embed: d.embed_code,
    note: `${d.name} (${d.year}), ${d.duration ?? '?'} мин`
  };
}

async function rutubeFrame() {
  const r = await fetch(
    'https://rutube.ru/api/search/video/?query=' + encodeURIComponent('Утиные истории 1 сезон 1 серия')
  );
  const j = await r.json();
  const v = (j.results ?? []).find((x) => x.duration > 600) ?? j.results?.[0];
  return {
    url: `https://rutube.ru/play/embed/${v.id}/?t=${SEEK_TO}&autoStart=true&mute=1`,
    note: `${v.title} (${Math.round(v.duration / 60)} мин)`
  };
}

const vibix = await vibixFrame();
const rutube = await rutubeFrame();
// У VK поиск без токена недоступен — берём заведомо публичную запись из официальной группы.
const vk = {
  url: `https://vk.com/video_ext.php?oid=-22822305&id=456239018&hd=2&js_api=1&t=${SEEK_TO}&autoplay=1`,
  note: 'произвольная публичная запись'
};

console.log('vibix :', vibix.note, '\n        ', vibix.embed);
console.log('rutube:', rutube.note, '\n        ', rutube.url);
console.log('vk    :', vk.note);

/* ---------- страница ---------- */

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><title>стенд плееров</title>
<script src="https://alt.graphicslab.io/sdk/v2/rendex-sdk.min.js" async></script>
<style>body{background:#111;color:#ddd;font:13px monospace;margin:0;padding:10px}
iframe{width:440px;height:250px;border:1px solid #444;background:#000}
.row{display:flex;gap:10px;flex-wrap:wrap}h2{font-size:13px;margin:6px 0}</style>
</head><body>
<div class="row">
  <div><h2>vibix — ${vibix.note}</h2>
    <ins id="vibix-ins" ${vibix.embed} data-autoplay="true" data-hideplaylist="true" data-norewind="true" data-width="440px" data-height="250px"></ins>
  </div>
  <div><h2>rutube — ${rutube.note}</h2><iframe id="rutube" src="${rutube.url}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>
  <div><h2>vk</h2><iframe id="vk" src="${vk.url}" allow="autoplay; fullscreen" allowfullscreen></iframe></div>
</div>
<pre id="log"></pre>
<script>
const SEEK_TO = ${SEEK_TO};
const report = { messages: [], sent: [], frames: {} };
window.__report = report;
const logEl = document.getElementById('log');
const say = (s) => { logEl.textContent += s + '\\n'; };

// SDK сам создаёт iframe на месте <ins>, поэтому ищем его динамически.
const vibixFrame = () => document.querySelector('#vibix-ins iframe, iframe[src*="vibix"], iframe[src*="videoframe"], iframe[src*="rendex"]');
const who = (source) => {
  for (const id of ['rutube','vk']) {
    const f = document.getElementById(id);
    if (f && f.contentWindow === source) return id;
  }
  const vf = vibixFrame();
  if (vf && vf.contentWindow === source) return 'vibix';
  return 'unknown';
};

// Ловим всё, что плееры говорят о себе.
window.addEventListener('message', (e) => {
  let d = e.data;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch {} }
  const src = who(e.source);
  const rec = { src, origin: e.origin, data: typeof d === 'object' ? JSON.stringify(d).slice(0,200) : String(d).slice(0,200) };
  report.messages.push(rec);
  if (report.messages.length < 60) say(src + ' <- ' + rec.data.slice(0,120));
});

const post = (id, payload) => {
  const f = id === 'vibix' ? vibixFrame() : document.getElementById(id);
  if (!f) { report.sent.push({ id, payload: 'ФРЕЙМ НЕ НАЙДЕН' }); return; }
  f.contentWindow.postMessage(payload, '*');
  report.sent.push({ id, payload: typeof payload === 'string' ? payload : JSON.stringify(payload) });
};

// Через 8 секунд — пробуем команды каждого диалекта.
setTimeout(() => {
  say('--- отправляем команды ---');
  post('vibix', { type: 'playerCommand', command: 'play', timestamp: Date.now() });
  post('vibix', { type: 'playerCommand', command: 'seek', value: SEEK_TO, timestamp: Date.now() });
  post('vibix', { type: 'playerCommand', command: 'getState', timestamp: Date.now() });
  post('rutube', JSON.stringify({ type: 'player:play', data: {} }));
  post('rutube', JSON.stringify({ type: 'player:setCurrentTime', data: { time: SEEK_TO } }));
  post('rutube', JSON.stringify({ type: 'player:getCurrentTime', data: {} }));
  post('vk', { method: 'play', value: '' });
  post('vk', { method: 'seek', value: SEEK_TO });
  post('vk', { method: 'getCurrentTime', value: '' });
}, 8000);

setTimeout(() => {
  const vf = vibixFrame();
  report.frames.vibix = vf ? vf.src.slice(0, 120) : 'не создан';
  report.done = true;
  say('--- готово --- vibix iframe: ' + report.frames.vibix);
}, 22000);
<\/script>
</body></html>`;

createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}).listen(4180, () => console.log('\nстенд: http://localhost:4180/'));
