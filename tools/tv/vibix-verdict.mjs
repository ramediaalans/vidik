// Решающий тест: тот же embed-URL, что работает в ЛК, но в трёх разных контекстах.
import { launch, sleep } from './cdp.mjs';
import http from 'node:http';

const EMBED = 'https://river-3-329.kinescopecdn.net/679202313/embed/350628'
  + '?design=1&color1=%2356ceaa&color2=%23ffffff&color3=%23aec7bc&color4=%2342bd88&color5=%23000000&lang=ru';

const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>t</title></head><body style="margin:0;background:#111">
<iframe id="f" src="${EMBED}&nc=${Date.now()}" width="800" height="450" frameborder="0" allow="autoplay; fullscreen; encrypted-media" referrerpolicy="origin"></iframe>
</body></html>`;

const server = http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); });
await new Promise((res) => server.listen(4185, '127.0.0.1', res));

async function check(label, url, extra = []) {
  const { cdp, chrome } = await launch({ port: 9360 + Math.floor(Math.random() * 20), width: 900, height: 520, extra });
  await cdp.send('Page.navigate', { url });
  await sleep(16000);
  // Смотрим внутрь: теги video есть только в документе плеера, поэтому берём все фреймы.
  const targets = await (await fetch(`http://127.0.0.1:${cdp.ws.url.match(/:(\d+)\//)?.[1] ?? 0}/json`)).json().catch(() => []);
  const own = await cdp.ev('document.querySelectorAll("video").length');
  const txt = String(await cdp.ev('document.body ? document.body.innerText.slice(0,120) : ""')).replace(/\s+/g, ' ');
  console.log(`${label.padEnd(26)} video=${own} текст="${txt}"`);
  await cdp.shot(`tools/tv/verdict-${label.replace(/\W+/g, '_')}.png`);
  chrome.kill();
  await sleep(1500);
}

await check('1-напрямую', `${EMBED}&nc=${Date.now()}`);
await check('2-в-iframe-localhost', 'http://localhost:4185/');
await check('3-в-iframe-домен', 'http://art-ai.studio:4185/', ['--host-resolver-rules=MAP art-ai.studio 127.0.0.1']);

server.close();
process.exit(0);
