// Маленький общий хелпер для работы с headless Chrome по CDP.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function env() {
  const raw = fs.readFileSync(new URL('../../.env', import.meta.url), 'utf8');
  return Object.fromEntries(
    raw.split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
  );
}

class Cdp {
  constructor(ws) {
    this.id = 0; this.pending = new Map(); this.handlers = [];
    this.ws = new WebSocket(ws);
    this.ready = new Promise((res, rej) => { this.ws.addEventListener('open', () => res()); this.ws.addEventListener('error', rej); });
    this.ws.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      if (m.id !== undefined) {
        const w = this.pending.get(m.id);
        if (w) { this.pending.delete(m.id); m.error ? w.reject(new Error(JSON.stringify(m.error))) : w.resolve(m.result); }
      } else {
        for (const h of this.handlers) h(m);
      }
    });
  }
  on(fn) { this.handlers.push(fn); }
  send(method, params = {}) {
    const id = (this.id += 1);
    return new Promise((res, rej) => { this.pending.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
  async ev(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { __error: r.exceptionDetails.text ?? String(r.exceptionDetails.exception?.description) };
    return r.result.value;
  }
  async shot(file) {
    const s = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(file, Buffer.from(s.data, 'base64'));
    return file;
  }
}

export async function launch({ port = 9350, width = 1440, height = 1000, extra = [] } = {}) {
  const CHROME = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ].find((p) => fs.existsSync(p));
  if (!CHROME) throw new Error('Chrome not found');
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vibix-cdp-'));
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`, '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--use-gl=angle', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', ...extra, 'about:blank'
  ], { stdio: 'ignore' });

  const ep = async (p, m = 'GET') => (await fetch(`http://127.0.0.1:${port}${p}`, { method: m })).json();
  for (let i = 0; i < 80; i += 1) { try { await ep('/json/version'); break; } catch { await sleep(250); } }
  const target = await ep(`/json/new?${encodeURIComponent('about:blank')}`, 'PUT');
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Network.enable');
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  return { cdp, chrome, ep };
}

// Настоящий клик мышью по центру элемента.
export async function click(cdp, selector) {
  const box = await cdp.ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)});
    if (!e) return null; const r = e.getBoundingClientRect();
    return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()`);
  if (!box) return false;
  const { x, y } = JSON.parse(box);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  }
  return true;
}

// Ввод текста через реальные события, чтобы React увидел изменение.
export async function type(cdp, selector, text) {
  if (!(await click(cdp, selector))) return false;
  await cdp.ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); e.focus(); e.value = ''; })()`);
  for (const ch of text) {
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp' });
  }
  return true;
}
