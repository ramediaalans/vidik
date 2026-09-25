// Шаг 1: разведка формы входа vibix.org.
import { launch, sleep } from './cdp.mjs';

const { cdp, chrome } = await launch({ port: 9351 });
await cdp.send('Page.navigate', { url: 'https://vibix.org/' });
await sleep(9000);

console.log('url  :', await cdp.ev('location.href'));
console.log('title:', await cdp.ev('document.title'));
console.log('\n--- поля ввода ---');
console.log(await cdp.ev(`JSON.stringify([...document.querySelectorAll('input,textarea')].map(e=>({
  tag:e.tagName, type:e.type, name:e.name, id:e.id, ph:e.placeholder,
  cls:String(e.className).slice(0,60), vis:e.offsetParent!==null })),null,1)`));
console.log('\n--- кнопки и ссылки ---');
console.log(await cdp.ev(`JSON.stringify([...document.querySelectorAll('button,a[href],[role=button]')]
  .filter(e=>e.offsetParent!==null)
  .map(e=>({t:(e.innerText||'').trim().slice(0,40), href:(e.getAttribute('href')||'').slice(0,60), id:e.id, cls:String(e.className).slice(0,50)}))
  .filter(e=>e.t).slice(0,30),null,1)`));
console.log('\n--- текст страницы ---');
console.log(String(await cdp.ev('document.body.innerText')).replace(/\n{2,}/g, '\n').slice(0, 900));

await cdp.shot('tools/tv/vibix-login.png');
chrome.kill();
process.exit(0);
