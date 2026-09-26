// Проверка Vibix на боевом сайте: открываем реальную страницу фильма и подменяем src у iframe.
import fs from 'node:fs';
import { launch, sleep, env } from '../cdp.mjs';

const E = env();
const PUB = E.VITE_VIBIX_PUBLISHER_ID;
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const items = JSON.parse(fs.readFileSync(args.list ?? 'tools/tv/collect/vibix-resolved.json', 'utf8'));
const only = args.only ? args.only.split(',') : null;
const list = only ? items.filter((i) => only.includes(i.key)) : items;
const outFile = args.out ?? 'tools/tv/collect/verify-vibix.json';
const SHARD = 'https://river-3-329.kinescopecdn.net';

const { cdp, chrome } = await launch({ port: Number(args.port ?? 9371), width: 1100, height: 800 });
await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });

const sessions = new Set();
let media = [];
const MEDIA = /\.m3u8|\.mpd|\.mp4|\.ts(\?|$)|\/hls|segment|videoplayback|\/stream/i;
cdp.on(async (m) => {
  if (m.method === 'Target.attachedToTarget') {
    const sid = m.params.sessionId;
    sessions.add(sid);
    await cdp.send('Network.enable', {}, sid).catch(() => {});
    await cdp.send('Runtime.enable', {}, sid).catch(() => {});
  }
  if (m.method === 'Network.requestWillBeSent' && MEDIA.test(m.params.request.url)) media.push(m.params.request.url);
});

// Базовая страница боевого сайта, где уже есть плеер.
await cdp.send('Page.navigate', { url: 'https://art-ai.studio/videosalon/terminator-1984' });
await sleep(5000);
await cdp.ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Вставить кассету/i.test(x.textContent));if(b)b.click();return !!b})()`);
await sleep(4000);
const hasFrame = await cdp.ev(`!!document.querySelector('iframe')`);
if (!hasFrame) { console.log('нет iframe на базовой странице'); chrome.kill(); process.exit(1); }

const results = [];
for (const it of list) {
  const serial = it.dataType === 'serial';
  const url = `${SHARD}/${PUB}/${serial ? 'embed-serials' : 'embed'}/${it.playerId}?lang=ru&nc=${Date.now()}`;
  media = [];
  await cdp.ev(`(()=>{const f=document.querySelector('iframe');f.src=${JSON.stringify(url)};f.scrollIntoView({block:'center'});return f.src})()`);
  await sleep(5000);
  for (let i = 0; i < 2; i += 1) {
    const box = await cdp.ev(`(()=>{const r=document.querySelector('iframe').getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`);
    const { x, y } = JSON.parse(box);
    for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    await sleep(4000);
  }
  let text = '';
  for (const sid of [...sessions]) {
    const t = await cdp.evIn(sid, 'document.body ? document.body.innerText.slice(0,200) : ""').catch(() => '');
    if (typeof t === 'string' && t.trim()) text += ' | ' + t.replace(/\s+/g, ' ');
  }
  const stub = /не добавлен|Включите другой плеер/i.test(text);
  const ok = media.length > 0 && !stub;
  results.push({ key: it.key, playerId: it.playerId, type: serial ? 'series' : 'movie', name: it.name, year: it.year, dur: it.dur, ok, stub, media: media.length, sample: media[0]?.slice(0, 110) ?? null });
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${it.key} id=${it.playerId} media=${media.length}${stub ? ' STUB' : ''}`);
  if (!ok && args.shots) await cdp.shot(`tools/tv/collect/fail-${it.key}.png`);
}

fs.writeFileSync(outFile, JSON.stringify(results, null, 1), 'utf8');
console.log(`\nитог: ${results.filter((r) => r.ok).length}/${results.length}`);
chrome.kill();
process.exit(0);
