// Финальный тест белого списка: наша страница, но браузер считает её за vibix.org.
import { launch, sleep } from './cdp.mjs';
import http from 'node:http';

const EMBED = 'https://river-3-329.kinescopecdn.net/679202313/embed/350628'
  + '?design=1&color1=%2356ceaa&color2=%23ffffff&color3=%23aec7bc&color4=%2342bd88&color5=%23000000&lang=ru';

const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>t</title></head>
<body style="margin:0;background:#111"><iframe src="${EMBED}&nc=${Date.now()}" width="820" height="460"
 frameborder="0" allow="autoplay; fullscreen; encrypted-media" referrerpolicy="origin"></iframe></body></html>`;

const server = http.createServer((_q, r) => { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); r.end(html); });
await new Promise((res) => server.listen(4187, '127.0.0.1', res));

// Подменяем только сам vibix.org, домен плеера не трогаем.
const { cdp, chrome } = await launch({
  port: 9381, width: 900, height: 520,
  extra: ['--host-resolver-rules=MAP vibix.org 127.0.0.1']
});

await cdp.send('Page.navigate', { url: 'http://vibix.org:4187/' });
await sleep(17000);
console.log('origin страницы:', await cdp.ev('location.origin'));
console.log('тегов video :', await cdp.ev('document.querySelectorAll("video").length'));
await cdp.shot('tools/tv/whitelist.png');

// Сравнение размера картинки внутри фрейма нам недоступно — смотрим скриншот.
console.log('скрин: tools/tv/whitelist.png');
chrome.kill();
server.close();
process.exit(0);
