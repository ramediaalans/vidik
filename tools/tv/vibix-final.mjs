// Разводим две гипотезы: дело в cookie сессии или в домене родителя.
// Всё в ОДНОМ залогиненном браузере.
import { launch, sleep, env, click, type } from './cdp.mjs';
import http from 'node:http';

const EMBED = 'https://river-3-329.kinescopecdn.net/679202313/embed/350628'
  + '?design=1&color1=%2356ceaa&color2=%23ffffff&color3=%23aec7bc&color4=%2342bd88&color5=%23000000&lang=ru';

const page = (title) => `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;background:#111"><iframe src="${EMBED}&nc=${Date.now()}" width="820" height="460"
 frameborder="0" allow="autoplay; fullscreen; encrypted-media" referrerpolicy="origin"></iframe></body></html>`;

const server = http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(page('t')); });
await new Promise((res) => server.listen(4186, '127.0.0.1', res));

const e = env();
const { cdp, chrome } = await launch({
  port: 9371, width: 1000, height: 600,
  extra: ['--host-resolver-rules=MAP art-ai.studio 127.0.0.1']
});

// Входим в ЛК — появляются cookie сессии.
await cdp.send('Page.navigate', { url: 'https://vibix.org/#login/' });
await sleep(8000);
await type(cdp, 'input[name=email]', e.VIBIX_EMAIL);
await type(cdp, 'input[name=password]', e.VIBIX_PASSWORD);
await click(cdp, '.login_submit');
await sleep(12000);
console.log('вошли в ЛК:', /vibix\.org\/#\/$/.test(String(await cdp.ev('location.href'))) ? 'ДА' : await cdp.ev('location.href'));

const cookies = await cdp.send('Network.getAllCookies');
console.log('cookie доменов:', [...new Set(cookies.cookies.map((c) => c.domain))].join(', '));

async function probe(label, url) {
  await cdp.send('Page.navigate', { url });
  await sleep(16000);
  const v = await cdp.ev('document.querySelectorAll("video").length');
  const t = String(await cdp.ev('document.body ? document.body.innerText.slice(0,100) : ""')).replace(/\s+/g, ' ');
  console.log(`${label.padEnd(34)} video=${v}  "${t}"`);
  await cdp.shot(`tools/tv/final-${label.replace(/\W+/g, '_')}.png`);
}

// А: есть cookie сессии, нет родителя vibix.org
await probe('A-напрямую-с-cookie', `${EMBED}&nc=${Date.now()}`);
// B: есть cookie, родитель — наш домен
await probe('B-наш-домен-с-cookie', 'http://art-ai.studio:4186/');
// C: контроль — снова ЛК, должно играть
await cdp.send('Page.navigate', { url: 'https://vibix.org/#/' });
await sleep(10000);
await cdp.ev(`(() => { const tr = document.querySelector('table tbody tr');
  const a = tr && (tr.querySelector('a.danger') || [...tr.querySelectorAll('a')].find(x => x.querySelector('.icon-preview')));
  if (a) a.click(); })()`);
await sleep(14000);
const frames = await cdp.ev('JSON.stringify([...document.querySelectorAll("iframe")].map(f=>f.src.slice(0,120)))');
console.log('C-контроль-в-ЛК           iframe=' + frames);
await cdp.shot('tools/tv/final-C.png');

chrome.kill();
server.close();
process.exit(0);
