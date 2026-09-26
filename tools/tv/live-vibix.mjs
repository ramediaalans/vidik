// Проверка Vibix на боевом домене art-ai.studio.
import fs from 'node:fs';
import { launch, sleep, click } from './cdp.mjs';

const BASE = 'https://art-ai.studio';
const out = [];
const log = (...a) => { const s = a.join(' '); out.push(s); console.log(s); };

const { cdp, chrome } = await launch({ port: 9366, width: 1280, height: 900 });
const frames = [];
cdp.on((m) => {
  if (m.method === 'Network.requestWillBeSent') {
    const u = m.params.request.url;
    if (/kinescopecdn|graphicslab|vibix/.test(u)) frames.push(u.slice(0, 160));
  }
});

async function go(url) {
  await cdp.send('Page.navigate', { url });
  await sleep(4000);
}

await go(`${BASE}/videosalon`);
const links = await cdp.ev(`JSON.stringify([...document.querySelectorAll('a[href*="/videosalon/"]')].map(a=>a.getAttribute('href')).slice(0,5))`);
log('links:', links);

const first = JSON.parse(links || '[]')[0];
if (first) {
  await go(`${BASE}${first}`);
  log('title:', await cdp.ev('document.title'));
  // кликаем по всем кнопкам включения плеера
  const btns = await cdp.ev(`JSON.stringify([...document.querySelectorAll('button')].map(b=>b.textContent.trim().slice(0,40)))`);
  log('buttons:', btns);
  await cdp.ev(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Вставить кассету/i.test(x.textContent));if(b){b.setAttribute('data-hit','1');b.click();return 'ok'}return 'no'})()`).then((r)=>log('click:', r));
  await sleep(500);
  await sleep(3000);
  await cdp.ev(`(()=>{const f=document.querySelector('iframe');if(f)f.scrollIntoView({block:'center'});return !!f})()`);
  await sleep(8000);
  await cdp.shot('tools/tv/live-vibix-1.png');
  log('click iframe:', await click(cdp, 'iframe'));
  await sleep(15000);
  await cdp.shot('tools/tv/live-vibix-2.png');
  log('click iframe2:', await click(cdp, 'iframe'));
  await sleep(12000);
  await cdp.shot('tools/tv/live-vibix-3.png');
  log('ins/iframe:', await cdp.ev(`JSON.stringify({ins:[...document.querySelectorAll('ins')].map(i=>i.outerHTML.slice(0,200)),ifr:[...document.querySelectorAll('iframe')].map(f=>f.src.slice(0,200))})`));
  log('text:', String(await cdp.ev('document.body.innerText')).replace(/\s+/g, ' ').slice(0, 600));
}

log('vibix requests:', JSON.stringify([...new Set(frames)], null, 1));
fs.writeFileSync('tools/tv/live-vibix.log', out.join('\n'), 'utf8');
chrome.kill();
process.exit(0);
