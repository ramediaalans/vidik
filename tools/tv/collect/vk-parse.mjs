// Парсер скачанной страницы поиска VK Видео
import fs from 'node:fs';
const h = fs.readFileSync(process.argv[2] ?? 'tools/tv/collect/_vk.html', 'utf8');
console.log('len', h.length);
const ids = [...new Set([...h.matchAll(/video(-?\d+_\d+)/g)].map((m) => m[1]))];
console.log('video ids:', ids.length, ids.slice(0, 12).join(' '));
const titles = [...new Set([...h.matchAll(/"title":"([^"]{5,90})"/g)].map((m) => m[1]))];
console.log('titles:', titles.length);
console.log(titles.slice(0, 12).join('\n  '));
console.log('---login wall:', /Войти|Авториз|login/i.test(h));
console.log('---duration fields:', (h.match(/"duration":\d+/g) ?? []).slice(0, 10).join(' '));
