// Шаг 3: открываем превью плеера в ЛК и снимаем всё: iframe, сеть, код вставки.
import { launch, sleep, env, click, type } from './cdp.mjs';
import fs from 'node:fs';

const e = env();
const { cdp, chrome } = await launch({ port: 9353, width: 1600, height: 1100 });

const reqs = new Map();
cdp.on((m) => {
  if (m.method === 'Network.requestWillBeSent') reqs.set(m.params.requestId, { url: m.params.request.url, method: m.params.request.method, body: m.params.request.postData });
  if (m.method === 'Network.responseReceived') { const r = reqs.get(m.params.requestId); if (r) { r.status = m.params.response.status; r.mime = m.params.response.mimeType; } }
});

await cdp.send('Page.navigate', { url: 'https://vibix.org/#login/' });
await sleep(8000);
await type(cdp, 'input[name=email]', e.VIBIX_EMAIL);
await type(cdp, 'input[name=password]', e.VIBIX_PASSWORD);
await click(cdp, '.login_submit');
await sleep(12000);
console.log('вошли:', await cdp.ev('location.href'));

// Сырая разметка ячеек с превью и кодом — оттуда видны атрибуты.
console.log('\n--- ячейки превью/код первой строки ---');
console.log(await cdp.ev(`(() => { const tr = document.querySelector('table tbody tr');
  const a = [...tr.querySelectorAll('a')].map(x => x.outerHTML.slice(0, 300));
  return a.join('\\n\\n'); })()`));

// Очистим журнал и жмём превью.
reqs.clear();
const ok = await cdp.ev(`(() => { const tr = document.querySelector('table tbody tr');
  const a = tr.querySelector('a.danger') || [...tr.querySelectorAll('a')].find(x => x.querySelector('.icon-preview'));
  if (!a) return 'no'; a.click(); return 'clicked ' + (a.getAttribute('data-id')||''); })()`);
console.log('\nклик по превью:', ok);
await sleep(18000);

console.log('\n--- iframe на странице ---');
console.log(await cdp.ev(`JSON.stringify([...document.querySelectorAll('iframe')].map(f=>f.src),null,1)`));
console.log('тегов video в главном документе:', await cdp.ev('document.querySelectorAll("video").length'));
console.log('\n--- текст модалки ---');
console.log(String(await cdp.ev(`(()=>{const m=document.querySelector('.modal,.popup,[class*=modal],[class*=popup]');return m?m.innerText.slice(0,800):'модалка не найдена';})()`)).replace(/\n{2,}/g, '\n'));

const skip = /googletagmanager|mc\.yandex|google-analytics|doubleclick|\.(png|jpg|jpeg|svg|woff2?|ico|css)(\?|$)/i;
console.log('\n--- запросы после клика ---');
for (const r of reqs.values()) {
  if (skip.test(r.url)) continue;
  console.log(`${r.status ?? '---'} ${r.method} ${r.url.slice(0, 160)}`);
  if (r.body) console.log('    body:', String(r.body).slice(0, 200));
}

await cdp.shot('tools/tv/vibix-preview.png');
fs.writeFileSync('tools/tv/vibix-preview.urls.txt', [...reqs.values()].map((r) => `${r.status} ${r.url}`).join('\n'));
console.log('\nскрин: tools/tv/vibix-preview.png');
chrome.kill();
process.exit(0);
