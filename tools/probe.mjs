// Interactive QA probe: drives headless Chrome over CDP, runs a step script
// inside the page, then saves a screenshot. Needed for states that only exist
// after a click (emulator, modals, players).
//
// node tools/probe.mjs --url http://localhost:4173/igry --out E:/AI-workspace/media/qa.png \
//   --steps tools/steps/emu.js --w 1440 --h 1200 --wait 15000
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .join(' ')
    .split('--')
    .filter(Boolean)
    .map((pair) => {
      const [key, ...rest] = pair.trim().split(' ');
      return [key, rest.join(' ').trim()];
    })
);

const url = args.url ?? 'http://localhost:4173/';
const out = args.out ?? 'E:/AI-workspace/media/qa_probe.png';
const width = Number(args.w ?? 1440);
const height = Number(args.h ?? 1200);
const waitMs = Number(args.wait ?? 20000);
const stepsFile = args.steps;

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
].find((p) => fs.existsSync(p));
if (!CHROME) throw new Error('Chrome not found');

const port = 9333;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vidik-probe-'));

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--mute-audio',
    '--autoplay-policy=no-user-gesture-required',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    'about:blank'
  ],
  { stdio: 'ignore' }
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function endpoint(pathname, method = 'GET') {
  const res = await fetch(`http://127.0.0.1:${port}${pathname}`, { method });
  if (!res.ok) throw new Error(`${pathname}: HTTP ${res.status}`);
  return res.json();
}

async function waitForChrome() {
  for (let i = 0; i < 60; i += 1) {
    try {
      await endpoint('/json/version');
      return;
    } catch {
      await sleep(250);
    }
  }
  throw new Error('Chrome did not start');
}

class Cdp {
  constructor(wsUrl) {
    this.id = 0;
    this.pending = new Map();
    this.ws = new WebSocket(wsUrl);
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => resolve());
      this.ws.addEventListener('error', (e) => reject(e));
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      const waiter = this.pending.get(msg.id);
      if (!waiter) return;
      this.pending.delete(msg.id);
      if (msg.error) waiter.reject(new Error(JSON.stringify(msg.error)));
      else waiter.resolve(msg.result);
    });
  }

  send(method, params = {}) {
    const id = (this.id += 1);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

const logs = [];

try {
  await waitForChrome();
  const target = await endpoint(`/json/new?${encodeURIComponent(url)}`, 'PUT');
  const cdp = new Cdp(target.webSocketDebuggerUrl);
  await cdp.ready;

  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  // headless Chrome reports the page as unfocused, which makes some apps ignore keys
  await cdp.send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
  await cdp.send('Page.bringToFront').catch(() => {});
  await cdp.send('Log.enable');
  cdp.ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args ?? []).map((a) => a.value ?? a.description ?? '').join(' ');
      logs.push(`[${msg.params.type}] ${text}`);
    }
    if (msg.method === 'Log.entryAdded') {
      logs.push(`[${msg.params.entry.level}] ${msg.params.entry.text}`);
    }
  });

  await sleep(2500);

  if (stepsFile) {
    const source = fs.readFileSync(stepsFile, 'utf8');
    const result = await cdp.send('Runtime.evaluate', {
      expression: `(async () => { ${source} })()`,
      awaitPromise: true,
      userGesture: true,
      returnByValue: true,
      timeout: waitMs
    });
    if (result.exceptionDetails) {
      console.log('STEPS ERROR:', JSON.stringify(result.exceptionDetails.exception?.description ?? result.exceptionDetails));
    } else if (result.result?.value !== undefined) {
      console.log('STEPS:', JSON.stringify(result.result.value, null, 2));
    }
  }

  // --click <селектор>[,<селектор>...]: настоящий клик мышью. Нужен для вещей
  // вроде requestFullscreen, которые требуют жеста пользователя.
  if (args.click) {
    for (const selector of args.click.split('|')) {
      const box = await cdp.send('Runtime.evaluate', {
        expression: `(() => { const el = document.querySelector(${JSON.stringify(selector.trim())});
          if (!el) return null; const r = el.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`,
        returnByValue: true
      });
      const point = box.result?.value;
      if (!point) {
        console.log(`CLICK: не нашёл ${selector}`);
        continue;
      }
      for (const type of ['mousePressed', 'mouseReleased']) {
        await cdp.send('Input.dispatchMouseEvent', {
          type,
          x: point.x,
          y: point.y,
          button: 'left',
          clickCount: 1
        });
      }
      console.log(`CLICK: ${selector}`);
      await sleep(Number(args.afterClick ?? 3000));
    }
  }

  if (args.postSteps) {
    const source = fs.readFileSync(args.postSteps, 'utf8');
    const result = await cdp.send('Runtime.evaluate', {
      expression: `(async () => { ${source} })()`,
      awaitPromise: true,
      returnByValue: true,
      timeout: waitMs
    });
    if (result.exceptionDetails) {
      console.log('POST ERROR:', JSON.stringify(result.exceptionDetails.exception?.description ?? result.exceptionDetails));
    } else if (result.result?.value !== undefined) {
      console.log('POST:', JSON.stringify(result.result.value, null, 2));
    }
  }

  if (args.press) {
    const VK = {
      Enter: 13,
      Shift: 16,
      ArrowLeft: 37,
      ArrowUp: 38,
      ArrowRight: 39,
      ArrowDown: 40,
      z: 90,
      x: 88,
      a: 65,
      s: 83
    };
    for (const token of args.press.split(',')) {
      const [name, holdRaw] = token.split(':');
      const key = name.trim();
      const hold = Number(holdRaw ?? 120);
      const code = VK[key] ?? 0;
      const base = {
        key,
        code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
        windowsVirtualKeyCode: code,
        nativeVirtualKeyCode: code
      };
      await cdp.send('Input.dispatchKeyEvent', {
        type: key.length === 1 ? 'keyDown' : 'rawKeyDown',
        text: key.length === 1 ? key : undefined,
        ...base
      });
      await sleep(hold);
      await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
      await sleep(600);
    }
    await sleep(2500);
  }

  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log(`ok ${out}`);
} finally {
  if (logs.length) console.log('--- page log ---\n' + logs.slice(0, 40).join('\n'));
  chrome.kill();
  await sleep(400);
  try {
    fs.rmSync(profile, { recursive: true, force: true });
  } catch {
    // profile dir stays behind on Windows sometimes
  }
}
