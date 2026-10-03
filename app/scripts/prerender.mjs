// После vite build: отдельный HTML на каждый индексируемый раздел (dist/<раздел>.html).
// Поисковик сразу видит свой title, description, og-теги, canonical и JSON-LD, ещё до запуска JS.
// Дальше приложение монтируется как обычно и само обновляет теги при переходах (src/seo.tsx).
// Файлы именно <раздел>.html, а не <раздел>/index.html: так Cloudflare Pages отдаёт /videosalon без редиректа на слеш.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGIN, SECTIONS } from '../src/seoSections.ts';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const base = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const SITE = 'ВИДИК';

const esc = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ldScript = (p, data) => `<script type="application/ld+json" id="ld-page" data-path="${p}">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

function swap(html, re, value, label) {
  if (!re.test(html)) throw new Error(`prerender: не найден ${label}`);
  return html.replace(re, value);
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
  const extra = (p === '/' ? '' : `<link rel="canonical" href="${url}" />\n    `) + ldScript(p, ld);
  html = swap(html, /<\/head>/, `  ${extra}\n  </head>`, '</head>');
  return html;
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
