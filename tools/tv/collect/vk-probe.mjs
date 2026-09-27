// Проба: есть ли у VK Видео поиск без токена и отдаётся ли что-то машиночитаемое.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36';
const targets = [
  'https://vkvideo.ru/search?q=%D1%82%D0%B5%D1%80%D0%BC%D0%B8%D0%BD%D0%B0%D1%82%D0%BE%D1%80%201984',
  'https://vk.com/video?q=%D1%82%D0%B5%D1%80%D0%BC%D0%B8%D0%BD%D0%B0%D1%82%D0%BE%D1%80&section=search',
  'https://api.vk.com/method/video.search?q=terminator&v=5.199',
  'https://vkvideo.ru/video-215094074_456243056',
];
for (const url of targets) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'ru' }, redirect: 'follow' });
    const body = await r.text();
    const hasItems = /video-?\d+_\d+/.test(body);
    const login = /Введите логин|Войти|login|authorize|Авториза/i.test(body);
    console.log(
      `${r.status} ${r.url.slice(0, 70)}\n   len=${body.length} video-id=${hasItems} login-wall=${login}\n   ${body.replace(/\s+/g, ' ').slice(0, 160)}`,
    );
    const ids = [...body.matchAll(/video(-?\d+_\d+)/g)].map((m) => m[1]).slice(0, 8);
    if (ids.length) console.log('   ids:', [...new Set(ids)].join(' '));
  } catch (e) {
    console.log('ERR', url.slice(0, 60), e.message);
  }
}
