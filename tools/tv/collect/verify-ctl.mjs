// Проверка Vibix под боевым доменом art-ai.studio с заходом внутрь iframe плеера.
import fs from 'node:fs';
import { launch, sleep, env } from '../cdp.mjs';

const E = env();
const PUB = E.VITE_VIBIX_PUBLISHER_ID;
const items = JSON.parse(fs.readFileSync('tools/tv/collect/vibix-resolved-ctl.json', 'utf8'));
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const only = args.only ? args.only.split(',') : null;
const list = only ? items.filter((i) => only.includes(i.key)) : items;
const outFile = args.out ?? 'tools/tv/collect/verify-vibix.json';
const STAND = 'https://art-ai.studio/__vibix-test';

const { cdp, chrome } = await launch({ port: Number(args.port ?? 9371), width: 1000, height: 640 });
await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });

let current = '';
await cdp.send('Fetch.enable', { patterns: [{ urlPattern: `${STAND}*`, requestStage: 'Request' }] });

const sessions = new Set();
let media = [];
const MEDIA = /\.m3u8|\.mpd|\.mp4|\.ts(\?|$)|\/hls|segment|videoplayback|\/stream/i;

cdp.on(async (m) => {
  if (m.method === 'Fetch.requestPaused') {
    await cdp.send('Fetch.fulfillRequest', {
      requestId: m.params.requestId,
      responseCode: 200,
      responseHeaders: [{ name: 'content-type', value: 'text/html; charset=utf-8' }],
      body: Buffer.from(current, 'utf8').toString('base64')
    }, m.sessionId).catch(() => {});
  }
  if (m.method === 'Target.attachedToTarget') {
    const sid = m.params.sessionId;
    sessions.add(sid);
    await cdp.send('Network.enable', {}, sid).catch(() => {});
    await cdp.send('Runtime.enable', {}, sid).catch(() => {});
    await cdp.send('Page.enable', {}, sid).catch(() => {});
  }
  if (m.method === 'Network.requestWillBeSent' && MEDIA.test(m.params.request.url)) media.push(m.params.request.url);
});

const results = [];
for (const it of list) {
  const serial = it.dataType === 'serial';
  const src = `https://river-3-329.kinescopecdn.net/${PUB}/${serial ? 'embed-serials' : 'embed'}/${it.playerId}?lang=ru&autoplay=true${serial ? '&season=1&episode=1' : ''}&nc=${Date.now()}`;
  current = `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#000">
<iframe id="f" src="${src}" width="1000" height="560" frameborder="0" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe></body></html>`;
  media = [];
  await cdp.send('Page.navigate', { url: `${STAND}?${it.playerId}` });
  await sleep(5000);
  // клики внутри iframe через координаты верхнего окна
  for (const [x, y] of [[500, 290], [500, 290]]) {
    for (const type of ['mousePressed', 'mouseReleased']) {
      await cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
    await sleep(4000);
  }
  await sleep(4000);
  let text = '';
  for (const sid of sessions) {
    const t = await cdp.evIn(sid, 'document.body ? document.body.innerText.slice(0,300) : ""').catch(() => '');
    if (typeof t === 'string' && t && !/^\s*$/.test(t)) text += ' | ' + t.replace(/\s+/g, ' ');
  }
  const stub = /ещё не добавлен|еще не добавлен|Включите другой плеер/i.test(text);
  const ok = media.length > 0 && !stub;
  results.push({ key: it.key, playerId: it.playerId, type: serial ? 'series' : 'movie', name: it.name, year: it.year, dur: it.dur, ok, stub, media: media.length, sample: media[0]?.slice(0, 110) ?? null, text: text.slice(0, 160) });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${it.key} id=${it.playerId} media=${media.length}${stub ? ' STUB' : ''}`);
  if (!ok && args.shots) await cdp.shot(`tools/tv/collect/fail-${it.key}.png`);
}

fs.writeFileSync(outFile, JSON.stringify(results, null, 1), 'utf8');
console.log(`\nитог: ${results.filter((r) => r.ok).length}/${results.length}`);
chrome.kill();
process.exit(0);
