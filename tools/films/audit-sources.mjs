// Аудит каталога: что реально лежит за каждым источником.
// Сверяет заявленный фильм с заголовком и длительностью ролика у хостера.
// Запуск: node tools/films/audit-sources.mjs [--slug matrica-1999]
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36';

const only = (() => {
  const i = process.argv.indexOf('--slug');
  return i > 0 ? process.argv[i + 1] : null;
})();

// films.ts — сгенерированный файл: внутри один большой JSON-массив.
const src = readFileSync(resolve(ROOT, 'app/src/data/films.ts'), 'utf8');
const arr = (name) => {
  const from = src.indexOf('= [', src.indexOf(`export const ${name}`)) + 2;
  const to = src.indexOf('\n];', from);
  return JSON.parse(src.slice(from, to + 2));
};
const films = [...arr('salon'), ...arr('disney')];

async function vkInfo(id) {
  const [oid, vid] = id.split('_');
  const r = await fetch(`https://vk.com/video_ext.php?oid=${oid}&id=${vid}&hd=2`, { headers: { 'user-agent': UA } });
  const html = new TextDecoder('windows-1251').decode(Buffer.from(await r.arrayBuffer()));
  // На странице JSON зашит с экранированными кавычками; сначала распутываем.
  // Ключ "title" встречается и у дорожек субтитров (Ru AUTO, ru_auto.vtt) — их выкидываем.
  const un = html.replace(/\\"/g, '"').replace(/\\\//g, '/');
  const titles = [...un.matchAll(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g)]
    .map((m) => m[1])
    .filter((t) => t && !/auto/i.test(t) && !/\.vtt$/i.test(t));
  const dm = /"duration"\s*:\s*(\d+)/.exec(un);
  return { title: titles[0] ?? null, duration: dm ? Number(dm[1]) : null };
}

async function rutubeInfo(id) {
  const r = await fetch(`https://rutube.ru/api/video/${id}/`, { headers: { 'user-agent': UA } });
  if (!r.ok) return { title: null, duration: null };
  const j = await r.json();
  return { title: j.title ?? null, duration: j.duration ?? null };
}

const rows = [];
for (const film of films) {
  if (only && film.slug !== only) continue;
  const source = film.source;
  if (!source) continue;
  let live = { title: null, duration: null };
  try {
    live = source.provider === 'vk' ? await vkInfo(source.id) : source.provider === 'rutube' ? await rutubeInfo(source.id) : live;
  } catch (e) {
    live = { title: `ошибка: ${e.message}`, duration: null };
  }

  // Сериалы — склейки серий, их длительность с каталожной не сравнивается.
  const isMovie = film.kind === 'movie';
  const expected = film.duration ? film.duration * 60 : null;
  // endTrim — сколько секунд отрезано с конца ролика.
  const total = live.duration ?? source.duration;
  const usable = total ? total - (source.start ?? 0) - (source.endTrim ?? 0) : null;
  const drift = isMovie && expected && usable ? Math.round(((usable - expected) / expected) * 100) : null;

  rows.push({
    slug: film.slug,
    вКаталоге: `${film.title} (${film.year}) — ${film.duration} мин`,
    провайдер: source.provider,
    id: source.id,
    заголовокУИсточника: live.title,
    секУИсточника: live.duration,
    секВКаталоге: source.duration,
    отклонениеПроц: drift
  });
  process.stdout.write('.');
}
process.stdout.write('\n');

// Сериалы и склейки с таймкодами сравнивать по длительности бессмысленно:
// смотрим только на рассынчрон с числом в каталоге и на исчезнувшие ролики.
const suspicious = rows.filter(
  (r) =>
    r.заголовокУИсточника === null ||
    (r.отклонениеПроц !== null && Math.abs(r.отклонениеПроц) > 8) ||
    (r.секУИсточника && r.секВКаталоге && Math.abs(r.секУИсточника - r.секВКаталоге) > 60)
);

writeFileSync(resolve(HERE, 'audit-sources.json'), JSON.stringify({ всего: rows.length, подозрительные: suspicious, все: rows }, null, 2), 'utf8');
console.log(`всего: ${rows.length}, подозрительных: ${suspicious.length}`);
for (const r of suspicious) {
  console.log(`${r.slug}\n  каталог: ${r.вКаталоге}\n  источник: ${r.провайдер} ${r.id} «${r.заголовокУИсточника}» ${r.секУИсточника} с, отклонение ${r.отклонениеПроц}%`);
}
