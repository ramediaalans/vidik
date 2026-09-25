// Ключевой тест: тот же стенд, но браузер считает, что страница на art-ai.studio.
// Системный hosts не трогаем — используем --host-resolver-rules.
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DOMAIN = process.argv[2] ?? 'art-ai.studio';
const PORT = 4184;
const PUB = '679202313';

const cases = [['kp', '444', 'Терминатор'], ['movie', '22293', 'playerID из embed_code'], ['kp', '326', 'Шоушенк']];
const blocks = cases.map(([t, id, n], i) => `<div><h2>#${i} ${t}/${id} ${n}</h2>
<ins data-publisher-id="${PUB}" data-type="${t}" data-id="${id}"></ins></div>`).join('');

const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>t</title>
<script src="https://graphicslab.io/sdk/v2/rendex-sdk.min.js" async><\/script>
<script src="https://alt.graphicslab.io/sdk/v2/rendex-sdk.min.js" async><\/script>
<style>body{background:#111;color:#eee;font:11px monospace;margin:8px}
div{display:inline-block;margin:4px}ins{display:block;width:420px;height:230px;background:#000}</style>
</head><body>${blocks}
<script>window.__msgs=[];addEventListener('message',e=>{const d=typeof e.data==='string'?e.data:JSON.stringify(e.data);window.__msgs.push(e.origin+' :: '+String(d).slice(0,160));});<\/script>
</body></html>`;

const server = http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); });
await new Promise((res) => server.listen(PORT, '127.0.0.1', res));

const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find((p) => fs.existsSync(p));
const port = 9342;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vibix-dom-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  `--host-resolver-rules=MAP ${DOMAIN} 127.0.0.1`,
  '--window-size=1340,340', '--no-first-run', '--no-default-browser-check',
  '--mute-audio', '--autoplay-policy=no-user-gesture-required', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ep = async (p, m = 'GET') => (await fetch(`http://127.0.0.1:${port}${p}`, { method: m })).json();
for (let i = 0; i < 60; i += 1) { try { await ep('/json/version'); break; } catch { await sleep(250); } }

class Cdp {
  constructor(ws) {
    this.id = 0; this.pending = new Map(); this.ws = new WebSocket(ws);
    this.ready = new Promise((res, rej) => { this.ws.addEventListener('open', () => res()); this.ws.addEventListener('error', rej); });
    this.ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); const w = this.pending.get(m.id); if (w) { this.pending.delete(m.id); m.error ? w.reject(new Error(JSON.stringify(m.error))) : w.resolve(m.result); } });
  }
  send(method, params = {}) { const id = (this.id += 1); return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })); }); }
}

const target = await ep(`/json/new?${encodeURIComponent('about:blank')}`, 'PUT');
const cdp = new Cdp(target.webSocketDebuggerUrl);
await cdp.ready;
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Page.navigate', { url: `http://${DOMAIN}:${PORT}/` });
await sleep(20000);

const ev = async (expr) => (await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
console.log('домен страницы :', await ev('location.origin'));
console.log('iframe        :', await ev('JSON.stringify([...document.querySelectorAll("iframe")].map(f=>f.src.slice(0,110)))'));
console.log('тегов video   :', await ev('document.querySelectorAll("video").length'));
console.log('сообщения    :', await ev('JSON.stringify((window.__msgs||[]).slice(0,8))'));

const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync('tools/tv/vibix-domain.png', Buffer.from(shot.data, 'base64'));
console.log('скриншот: tools/tv/vibix-domain.png');

chrome.kill();
server.close();
process.exit(0);
