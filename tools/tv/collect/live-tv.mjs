// Проверка боевого эфира: /televizor, все три канала, скриншоты и media-запросы.
import { launch, sleep } from '../cdp.mjs';

const { cdp, chrome } = await launch({ port: 9381, width: 1280, height: 900 });
await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
let media = [];
const MEDIA = /\.m3u8|\.mpd|\.mp4|\.ts(\?|$)|\/hls|segment|videoplayback|\/stream/i;
cdp.on(async (m) => {
  if (m.method === 'Target.attachedToTarget') {
    await cdp.send('Network.enable', {}, m.params.sessionId).catch(() => {});
  }
  if (m.method === 'Network.requestWillBeSent' && MEDIA.test(m.params.request.url)) media.push(m.params.request.url);
});

await cdp.send('Page.navigate', { url: 'https://art-ai.studio/televizor' });
await sleep(6000);
const rows = await cdp.ev(`document.querySelectorAll('.tv__layout table tr, .guide tr, .guide__row').length`);
const head = await cdp.ev(`document.body.innerText.replace(/\\s+/g,' ').slice(0,600)`);
console.log('rows=', rows);
console.log('text=', head);

await cdp.ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Включить телевизор/i.test(x.textContent));if(b)b.click();return !!b})()`);
for (let ch = 0; ch < 3; ch += 1) {
  media = [];
  await sleep(12000);
  const onAir = await cdp.ev(`(document.querySelector('.tv__onAir')||{}).innerText||''`);
  const frames = await cdp.ev(`[...document.querySelectorAll('.tv__screen iframe')].map(f=>f.src).join(' ; ')`);
  console.log(`\nканал ${ch + 1}: media=${media.length}`);
  console.log('  onAir:', String(onAir).replace(/\s+/g, ' ').slice(0, 200));
  console.log('  iframe:', String(frames).slice(0, 220));
  await cdp.shot(`tools/tv/collect/live-ch${ch + 1}.png`);
  if (ch < 2)
    await cdp.ev(`(()=>{const b=[...document.querySelectorAll('.tv__remoteButton')].find(x=>/CH\\+/.test(x.textContent));if(b)b.click();return !!b})()`);
}
chrome.kill();
process.exit(0);
