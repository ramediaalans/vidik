import fs from 'node:fs';
const s = fs.readFileSync(new URL('./vibix-embed.js', import.meta.url), 'utf8');

const urls = [...new Set(s.match(/https?:\/\/[^'"`\s\\)]{4,90}/g) ?? [])];
console.log('--- абсолютные URL ---');
console.log(urls.slice(0, 40).join('\n'));

const paths = [...new Set(s.match(/["'`]\/(?:v\d|api|embed|content|player|movie|serial|video|get)[a-z0-9_/\-]{0,60}["'`]/gi) ?? [])];
console.log('\n--- относительные пути ---');
console.log(paths.slice(0, 40).join('\n'));

console.log('\nXMLHttpRequest =', (s.match(/XMLHttpRequest/g) ?? []).length, ' .open( =', (s.match(/\.open\(/g) ?? []).length);

// Ищем текст заглушки в разных видах.
const needles = ['\u043dе добавлен', 'Извините', 'Хорошего', '\\u0418\\u0437', 'u0438u0437'];
for (const n of needles) console.log('текст', JSON.stringify(n), '=', s.split(n).length - 1);

// Может, строки в escape/base64. Пробуем раскодировать \\xNN и \\uNNNN.
const dec = s.replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
             .replace(/\\x([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
console.log('\nпосле раскодировки: "не добавлен" =', dec.split('не добавлен').length - 1);
const i = dec.indexOf('не добавлен');
if (i > 0) console.log(dec.slice(Math.max(0, i - 700), i + 300));
