// Снимаем сетевой трафик плеера Vibix через CDP: куда ходит и что ему отвечают.
// node tools/tv/vibix-net.mjs <url>
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const url = process.argv[2] ?? 'https://river-3-329.kinescopecdn.net/679202313/embed-kp/444?lang=ru';
const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error('Chrome not found');

const port = 9341;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vibix-net-'));
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--window-size=900,500', '--no-first-run', '--no-default-browser-check',
  '--mute-audio', '--autoplay-policy=no-user-gesture-required', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ep = async (p, m = 'GET') => (await fetch(`http://127.0.0.1:${port}${p}`, { method: m })).json();
for (let i = 0; i < 60; i += 1) { try { await ep('/json/version'); break; } catch { await sleep(250); } }

class Cdp {
  constructor(ws) {
    this.id = 0; this.pending = new Map(); this.ws = new WebSocket(ws);
    this.ready = new Promise((res, rej) => { this.ws.addEventListener('open', () => res()); this.ws.addEventListener('error', rej); });
    this.ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      const w = this.pending.get(m.id);
      if (w) { this.pending.delete(m.id); m.error ? w.reject(new Error(JSON.stringify(m.error))) : w.resolve(m.result); }
    });
  }
  send(method, params = {}) {
    const id = (this.id += 1);
    return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
}

const target = await ep(`/json/new?${encodeURIComponent('about:blank')}`, 'PUT');
const cdp = new Cdp(target.webSocketDebuggerUrl);
await cdp.ready;

const reqs = new Map();
const interesting = [];
cdp.ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.method === 'Network.requestWillBeSent') {
    const { requestId, request } = m.params;
    reqs.set(requestId, { url: request.url, method: request.method, body: request.postData });
  }
  if (m.method === 'Network.responseReceived') {
    const r = reqs.get(m.params.requestId);
    if (r) { r.status = m.params.response.status; r.mime = m.params.response.mimeType; }
  }
  if (m.method === 'Network.loadingFinished' || m.method === 'Network.loadingFailed') {
    const r = reqs.get(m.params.requestId);
    if (r) { r.done = true; r.failed = m.params.errorText; r.id = m.params.requestId; }
  }
});

await cdp.send('Network.enable');
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Page.navigate', { url });
await sleep(18000);

const skip = /googletagmanager|mc\.yandex|google-analytics|\.(png|jpg|jpeg|svg|woff2?|ico|css)(\?|$)/i;
const rows = [...reqs.values()].filter((r) => !skip.test(r.url));
console.log(`всего запросов: ${reqs.size}, без шума: ${rows.length}\n`);
for (const r of rows) {
  console.log(`${r.status ?? '---'} ${r.method} ${r.url.slice(0, 150)}${r.failed ? '  !!' + r.failed : ''}`);
  if (r.body) console.log('   body:', String(r.body).slice(0, 200));
}

// Тела ответов у всего, что похоже на API.
console.log('\n--- тела ответов API ---');
for (const [id, r] of reqs) {
  if (!/json/i.test(r.mime ?? '') && !/api|content|get|video|movie|player\?/i.test(r.url)) continue;
  if (/\.js(\?|$)/.test(r.url)) continue;
  try {
    const b = await cdp.send('Network.getResponseBody', { requestId: id });
    console.log(`\n>>> ${r.url.slice(0, 150)}\n${String(b.body).slice(0, 700)}`);
  } catch { /* тело недоступно */ }
}

chrome.kill();
process.exit(0);
