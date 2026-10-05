// После vite build: отдельный HTML на каждый индексируемый раздел (dist/<раздел>.html).
// Поисковик сразу видит свой title, description, og-теги, canonical и JSON-LD, ещё до запуска JS.
// Дальше приложение монтируется как обычно и само обновляет теги при переходах (src/seo.tsx).
// Файлы именно <раздел>.html, а не <раздел>/index.html: так Cloudflare Pages отдаёт /videosalon без редиректа на слеш.
//
// Плюс закрытые от индексации страницы (поиск и карточки фильмов/мультфильмов/игр):
// dist/poisk.html, dist/videosalon/<slug>.html, dist/multklub/<slug>.html, dist/igry/<id>.html.
// У них общий заголовок без названий (правило из src/seo.tsx), robots noindex и свой og:url.
// Существующий файл = существующая карточка: functions/_middleware.js отдаёт 404 на любой адрес,
// для которого Pages вернул запасной index.html (например, /videosalon/opechatka).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGIN, SECTIONS } from '../src/seoSections.ts';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const base = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const SITE = 'ВИДИК';

const src = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src');

const esc = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ldScript = (p, data) => `<script type="application/ld+json" id="ld-page" data-path="${p}">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

function swap(html, re, value, label) {
  if (!re.test(html)) throw new Error(`prerender: не найден ${label}`);
  return html.replace(re, value);
}

// Главная картинка первого экрана раздела — грузим сразу из HTML, не дожидаясь JS (LCP).
// Пути уже после V3_MAP из src/media/asset.ts; на телефоне — *.m.webp, если есть (то же условие 760px).
// Если поменялась картинка в PageHero раздела — поправить и тут (иначе картинка скачается зря).
const HERO = {
  '/videosalon': 'images/v3/ch-salon.webp',
  '/multklub': 'images/v3/ch-disney.webp',
  '/igry': 'images/v3/ch-games.webp',
  '/muzyka': 'images/v3/section-music.webp',
  '/televizor': 'images/v3/ch-tv.webp',
  '/istorii': 'images/v3/section-stories.webp',
  '/nostalgiya': 'images/v3/yard-golden.webp',
  '/po-godam': 'images/v3/yard-golden.webp',
  '/retrointernet': 'images/games/game-5.webp',
};

function heroPreload(p) {
  const img = HERO[p];
  if (!img) return '';
  if (!fs.existsSync(path.join(dist, img))) throw new Error(`prerender: нет картинки ${img}`);
  const small = img.replace(/\.(webp|jpe?g|png)$/i, '.m.webp');
  const tag = (href, media) => `<link rel="preload" as="image" href="/${href}" fetchpriority="high"${media ? ` media="${media}"` : ''} />\n    `;
  return fs.existsSync(path.join(dist, small))
    ? tag(small, '(max-width: 760px)') + tag(img, '(min-width: 761px)')
    : tag(img);
}

// Короткое имя раздела для навигации в <noscript>: «Видеосалон: кино…» -> «Видеосалон».
const shortName = (title) => title.split(/[:—]/)[0].trim();

// Без JS (и для простых краулеров) страница не пустая: заголовок, описание и ссылки на разделы.
function noscript(meta, heading) {
  const links = SECTIONS.filter(([, m]) => m.index)
    .map(([p, m]) => `<a href="${p}">${esc(p === '/' ? SITE : shortName(m.title))}</a>`)
    .join(' · ');
  return `<noscript><div style="max-width:720px;margin:40px auto;padding:0 20px;font-family:sans-serif;color:#eee">`
    + `<h1>${esc(heading)}</h1><p>${esc(meta.description)}</p><nav>${links}</nav>`
    + `<p>Для просмотра кассет, игр и телевизора включите JavaScript.</p></div></noscript>`;
}

function withBody(html, meta, heading) {
  return swap(html, /<div id="root"><\/div>/, `${noscript(meta, heading)}\n    <div id="root"></div>`, '#root');
}

function page(p, meta) {
  const url = p === '/' ? ORIGIN + '/' : ORIGIN + p;
  let html = base;
  html = swap(html, /<title>[^<]*<\/title>/, `<title>${esc(meta.title)}</title>`, 'title');
  html = swap(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(meta.description)}" />`, 'description');
  html = swap(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(meta.title)}" />`, 'og:title');
  html = swap(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(meta.description)}" />`, 'og:description');
  html = swap(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`, 'og:url');
  const ld = p === '/'
    ? { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE, url: ORIGIN + '/', inLanguage: 'ru', description: meta.description }
    : {
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebPage', name: meta.title, url, inLanguage: 'ru', description: meta.description, isPartOf: { '@type': 'WebSite', name: SITE, url: ORIGIN + '/' } },
          { '@type': 'BreadcrumbList', itemListElement: [
            { '@type': 'ListItem', position: 1, name: SITE, item: ORIGIN + '/' },
            { '@type': 'ListItem', position: 2, name: meta.title.split(/[:—]/)[0].trim(), item: url },
          ] },
        ],
      };
  // canonical только у разделов: index.html заодно отдаётся как запасная страница для карточек и 404.
  const extra = (p === '/' ? '' : `<link rel="canonical" href="${url}" />\n    `) + heroPreload(p) + ldScript(p, ld);
  html = swap(html, /<\/head>/, `  ${extra}\n  </head>`, '</head>');
  return withBody(html, meta, p === '/' ? SITE : shortName(meta.title));
}

// Закрытая страница: общий заголовок, noindex, без canonical и без JSON-LD.
function hiddenPage(p, title) {
  const home = SECTIONS[0][1];
  const meta = { title, description: home.description };
  let html = base;
  html = swap(html, /<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`, 'title');
  html = swap(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(title)}" />`, 'og:title');
  html = swap(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${ORIGIN + p}" />`, 'og:url');
  html = swap(html, /<\/head>/, `  <meta name="robots" content="noindex, follow" />\n  </head>`, '</head>');
  return withBody(html, meta, shortName(title));
}

// Списки карточек читаем из исходников регулярками: data/*.ts импортируют друг друга
// без расширений, и напрямую в Node их не запустить.
function listIds(file, re) {
  const text = fs.readFileSync(path.join(src, file), 'utf8');
  const ids = [...text.matchAll(re)].map((m) => m[1]);
  for (const id of ids) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`prerender: странный адрес карточки ${id} в ${file}`);
  }
  return [...new Set(ids)];
}

const written = [];
for (const [p, meta] of SECTIONS) {
  if (!meta.index) continue;
  const file = p === '/' ? 'index.html' : p.slice(1) + '.html';
  if (file.includes('/')) throw new Error(`prerender: вложенный адрес ${p} не поддерживается`);
  fs.writeFileSync(path.join(dist, file), page(p, meta));
  written.push(file);
}
console.log(`prerender: ${written.length} страниц (${written.join(', ')})`);

const films = listIds('data/films.ts', /"slug":\s*"([^"]+)"/g);
const games = [
  ...listIds('data/roms.ts', /^\s+id: '([^']+)'/gm),
  ...listIds('data/roms-more.ts', /^\s+id: '([^']+)'/gm),
];
if (films.length < 10 || games.length < 10) throw new Error(`prerender: подозрительно мало карточек (${films.length} фильмов, ${games.length} игр)`);

const hidden = [['/poisk', 'Поиск по архиву — ВИДИК']];
// Фильм открывается и из видеосалона, и из мультклуба (FilmPage ищет по всем), поэтому оба адреса.
for (const slug of films) {
  hidden.push([`/videosalon/${slug}`, 'Видеосалон — ВИДИК'], [`/multklub/${slug}`, 'Мультклуб — ВИДИК']);
}
for (const id of games) hidden.push([`/igry/${id}`, 'Приставка — ВИДИК']);

for (const [p, title] of hidden) {
  const file = path.join(dist, p.slice(1) + '.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, hiddenPage(p, title));
}
console.log(`prerender: закрытых страниц ${hidden.length} (поиск, ${films.length} фильмов ×2, ${games.length} игр)`);
