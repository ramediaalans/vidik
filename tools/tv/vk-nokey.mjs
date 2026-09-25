// Проверяем, можно ли искать видео ВК без токена.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
const q = 'Старые песни о главном';

async function probe(name, url, opts = {}) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru,en;q=0.8', ...(opts.headers ?? {}) }, redirect: 'follow' });
    const t = await r.text();
    const ids = [...new Set((t.match(/video-?\d+_\d+/g) ?? []))].slice(0, 6);
    console.log(`${name}: ${r.status} len=${t.length} ids=${ids.length ? ids.join(', ') : '—'}`);
    if (!ids.length) console.log('   ', t.replace(/\s+/g, ' ').slice(0, 200));
  } catch (e) {
    console.log(`${name}: ОШИБКА ${e.message}`);
  }
}

await probe('vk поиск html', `https://vk.com/search/video?c[section]=video&c[q]=${encodeURIComponent(q)}`);
await probe('vk video страница', `https://vk.com/video?q=${encodeURIComponent(q)}`);
await probe('vk m.', `https://m.vk.com/search?section=video&q=${encodeURIComponent(q)}`);
await probe('yandex site:vk', `https://html.duckduckgo.com/html/?q=${encodeURIComponent('site:vk.com/video ' + q)}`);
