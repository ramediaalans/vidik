// Главная проверка: действительно ли кандидат играет во встроенном плеере с боевого домена.
// Многие копии фильмов на Rutube запрещены к встраиванию — API об этом молчит.
import fs from 'node:fs';
import { launch, sleep } from '../cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const rows = JSON.parse(fs.readFileSync(args.in ?? 'tools/tv/collect/alt-found.json', 'utf8'));
const perItem = Number(args.n ?? 2);

const { cdp, chrome } = await launch({ port: Number(args.port ?? 9393), width: 1000, height: 640 });
await cdp.send('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
const sessions = new Set();
let media = [];
const MEDIA = /\.m3u8|\.mpd|\.ts(\?|$)|\/hls\/|segment|videoplayback|\/stream/i;
cdp.on(async (m) => {
  if (m.method === 'Target.attachedToTarget') {
    sessions.add(m.params.sessionId);
    await cdp.send('Network.enable', {}, m.params.sessionId).catch(() => {});
    await cdp.send('Runtime.enable', {}, m.params.sessionId).catch(() => {});
  }
  if (m.method === 'Network.requestWillBeSent' && MEDIA.test(m.params.request.url)) media.push(m.params.request.url);
});

await cdp.send('Page.navigate', { url: 'https://art-ai.studio/televizor' });
await sleep(6000);
await cdp.ev(
  `(()=>{const b=[...document.querySelectorAll('button')].find(x=>/Включить телевизор/i.test(x.textContent));if(b)b.click();return !!b})()`,
);
await sleep(4000);

const BLOCK = /только на RUTUBE|недоступно|удалено|ограничен|заблокирован|Video unavailable|не добавлен|возраст/i;

async function probe(p, id, off) {
  const url =
    p === 'rutube'
      ? `https://rutube.ru/play/embed/${id}/?t=${off}&autoStart=true`
      : `https://www.youtube-nocookie.com/embed/${id}?start=${off}&autoplay=1&mute=1`;
  media = [];
  await cdp.ev(
    `(()=>{let f=document.querySelector('.tv__screen iframe');if(!f){f=document.createElement('iframe');f.style.cssText='position:fixed;left:0;top:0;width:900px;height:520px;z-index:99999';document.body.append(f)}f.src='about:blank';f.src=${JSON.stringify(url)};f.scrollIntoView({block:'center'});return f.src})()`,
  );
  await sleep(6500);
  const box = await cdp.ev(
    `(()=>{const f=document.querySelector('iframe');const r=f.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2})})()`,
  );
  const { x, y } = JSON.parse(box);
  for (const type of ['mousePressed', 'mouseReleased'])
    await cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  await sleep(4500);
  let text = '';
  for (const sid of [...sessions]) {
    const t = await cdp.evIn(sid, 'document.body ? document.body.innerText.slice(0,160) : ""').catch(() => '');
    if (typeof t === 'string' && t.trim()) text += ' | ' + t.replace(/\s+/g, ' ');
  }
  return { ok: media.length > 2 && !BLOCK.test(text), media: media.length, text: text.slice(0, 150) };
}

// Дополнительный отсев: год в заголовке должен совпадать (ловим ремейки 20xx).
const yearOk = (title, year) => {
  const ys = [...title.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((m) => +m[1]).filter((y) => y !== 1080 && y !== 2160);
  return !ys.length || !year || ys.some((y) => Math.abs(y - +year) <= 1);
};

const out = [];
for (const r of rows) {
  const cands = [...r.rutube.slice(0, perItem + 2), ...r.youtube.slice(0, perItem + 2)]
    .filter((c) => yearOk(c.t, r.year))
    .slice(0, perItem * 2);
  const tried = [];
  let best = null;
  for (const c of cands) {
    const off = r.type === 'movie' ? 1800 : 300;
    const res = await probe(c.p, c.id, off);
    tried.push({ p: c.p, id: c.id, t: c.t, dur: c.dur, up: c.up, ...res });
    console.log(
      `  ${res.ok ? 'PLAY' : 'no  '} ${c.p}:${c.id} media=${res.media} «${c.t.slice(0, 40)}»${res.ok ? '' : ' :: ' + res.text.slice(0, 60)}`,
    );
    if (res.ok) {
      best = tried[tried.length - 1];
      break;
    }
  }
  out.push({ key: r.key, name: r.name, year: r.year, type: r.type, vibixDur: r.vibixDur, tried, best });
  console.log(`${best ? 'OK  ' : 'НЕТ '} ${r.key} — ${r.name}`);
  fs.writeFileSync('tools/tv/collect/alt-embed-batch.json', JSON.stringify(out, null, 1), 'utf8');
}
console.log(`\nитог: замена реально играет для ${out.filter((o) => o.best).length}/${out.length}`);
chrome.kill();
process.exit(0);
