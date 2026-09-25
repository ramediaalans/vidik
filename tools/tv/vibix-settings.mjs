// Read-only snapshot of public account state. Never prints credentials or tokens.
import { launch, sleep, env, click, type } from './cdp.mjs';

const e = env();
const { cdp, chrome } = await launch({ port: 9382, width: 1300, height: 900 });
await cdp.send('Page.navigate', { url: 'https://vibix.org/#login/' });
await sleep(7000);
await type(cdp, 'input[name=email]', e.VIBIX_EMAIL);
await type(cdp, 'input[name=password]', e.VIBIX_PASSWORD);
await click(cdp, '.login_submit');
await sleep(10000);
await cdp.send('Page.navigate', { url: 'https://vibix.org/#settings/' });
await sleep(8000);

const result = await cdp.ev(`(() => {
  const text = (document.body?.innerText || '').split('\\n').map(x => x.trim()).filter(Boolean);
  const relevant = text.filter(x => /сайт|домен|site|domain|пробн|trial/i.test(x)).slice(0, 30);
  const fields = [...document.querySelectorAll('input,textarea,select')]
    .filter(x => /сайт|домен|site|domain/i.test([x.name, x.id, x.placeholder, x.className].join(' ')))
    .map(x => ({ name: x.name || x.id || x.placeholder || 'field', value: x.value }));
  const supportLinks = [...document.querySelectorAll('a')]
    .filter(x => /поддерж|support/i.test(x.innerText || x.textContent || ''))
    .map(x => ({ text: (x.innerText || x.textContent || '').trim(), href: x.href }));
  return JSON.stringify({ url: location.href, relevant, fields, supportLinks });
})()`);
console.log(result);
chrome.kill();
process.exit(0);
