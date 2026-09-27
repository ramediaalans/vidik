// Живая проверка Rutube/YouTube embed с боевого домена: играет ли, с какой секунды, есть ли реклама.
// node tools/tv/collect/alt-embed.mjs rutube:ID:OFFSET yt:ID:OFFSET ...
import { launch, sleep } from '../cdp.mjs';

const specs = process.argv.slice(2);
const { cdp, chrome } = await launch({ port: 9391, width: 1100, height: 760 });
await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
const sessions = new Set();
let media = [];
let ads = [];
const MEDIA = /\.m3u8|\.mpd|\.ts(\?|$)|\/hls|segment|videoplayback|\/stream/i;
const ADS = /doubleclick|googlesyndication|adfox|yandex.*ad|vast|\/ads?\/|adriver|imasdk/i;
cdp.on(async (m) => {
  if (m.method === 'Target.attachedToTarget') {
    sessions.add(m.params.sessionId);
    await cdp.send('Network.enable', {}, m.params.sessionId).catch(() => {});
    await cdp.send('Runtime.enable', {}, m.params.sessionId).catch(() => {});
  }
  if (m.method === 'Network.requestWillBeSent') {
    const u = m.params.request.url;
    if (MEDIA.test(u)) media.push(u);
    if (ADS.test(u)) ads.push(u);
  }
});

await cdp.send('Page.navigate', { url: 'https://art-ai.studio/televizor' });
await sleep(6000);
await cdp.ev(
  `(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Включить телевизор/i.test(x.textContent));if(b)b.click();return !!b})()`,
);
await sleep(5000);

for (const spec of specs) {
  const [p, id, off = '0'] = spec.split(':');
  const url =
    p === 'rutube'
      ? `https://rutube.ru/play/embed/${id}/?t=${off}&autoStart=true`
      : `https://www.youtube-nocookie.com/embed/${id}?start=${off}&autoplay=1&mute=1`;
  media = [];
  ads = [];
  await cdp.ev(
    `(()=>{let f=document.querySelector('.tv__screen iframe');if(!f){f=document.createElement('iframe');f.style.cssText='position:fixed;left:0;top:0;width:900px;height:520px;z-index:99999';document.body.append(f)}f.src=${JSON.stringify(url)};f.scrollIntoView({block:'center'});return f.src})()`,
  );
  await sleep(7000);
  for (let i = 0; i < 2; i += 1) {
    const box = await cdp.ev(
      `(()=>{const f=document.querySelector('iframe');const r=f.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`,
    );
    const { x, y } = JSON.parse(box);
    for (const type of ['mousePressed', 'mouseReleased'])
      await cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    await sleep(5000);
  }
  let text = '';
  for (const sid of [...sessions]) {
    const t = await cdp.evIn(sid, 'document.body ? document.body.innerText.slice(0,180) : ""').catch(() => '');
    if (typeof t === 'string' && t.trim()) text += ' | ' + t.replace(/\s+/g, ' ');
  }
  console.log(
    `${media.length ? 'PLAY' : 'FAIL'} ${spec} media=${media.length} ads=${ads.length}\n   text: ${text.slice(0, 220)}\n   sample: ${media[0]?.slice(0, 120) ?? '-'}`,
  );
  await cdp.shot(`tools/tv/collect/alt-${p}-${id.slice(0, 8)}.png`);
}
chrome.kill();
process.exit(0);
