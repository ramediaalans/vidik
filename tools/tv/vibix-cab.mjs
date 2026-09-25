// Шаг 2: вход в ЛК Vibix и разведка главной. Только чтение.
import { launch, sleep, env, click, type } from './cdp.mjs';

const e = env();
const { cdp, chrome } = await launch({ port: 9352, width: 1600, height: 1100 });

await cdp.send('Page.navigate', { url: 'https://vibix.org/#login/' });
await sleep(8000);

await type(cdp, 'input[name=email]', e.VIBIX_EMAIL);
await type(cdp, 'input[name=password]', e.VIBIX_PASSWORD);
await sleep(300);
await click(cdp, '.login_submit');
await sleep(12000);

console.log('url  :', await cdp.ev('location.href'));
const txt = String(await cdp.ev('document.body.innerText')).replace(/\n{2,}/g, '\n');
console.log('вошли :', /Выйти|Статистика|Финансы/.test(txt) ? 'ДА' : 'НЕТ');
console.log('\n--- текст (начало) ---\n' + txt.slice(0, 700));

// Структура таблицы: заголовки и первая строка со всеми кнопками.
console.log('\n--- заголовки таблицы ---');
console.log(await cdp.ev(`JSON.stringify([...document.querySelectorAll('table th')].map(t=>t.innerText.trim().slice(0,20)))`));

console.log('\n--- первая строка: ячейки и кнопки ---');
console.log(await cdp.ev(`(() => {
  const tr = document.querySelector('table tbody tr');
  if (!tr) return 'строк нет';
  return JSON.stringify({
    cells: [...tr.children].map(td => td.innerText.trim().slice(0,30)),
    clickable: [...tr.querySelectorAll('button,a,svg,[onclick],[data-id],[class*=code],[class*=play]')]
      .map(x => ({ tag:x.tagName, cls:String(x.className.baseVal ?? x.className).slice(0,50), title:x.getAttribute('title')||'', dataId:x.getAttribute('data-id')||'' }))
  }, null, 1);
})()`));

await cdp.shot('tools/tv/vibix-cab.png');
console.log('\nскрин: tools/tv/vibix-cab.png');
chrome.kill();
process.exit(0);
