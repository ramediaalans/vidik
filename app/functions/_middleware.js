// Cloudflare Pages Function. Срабатывает только для адресов страниц: статика исключена в public/_routes.json.
// 1) www.art-ai.studio -> art-ai.studio, постоянное перенаправление 301 с сохранением пути и параметров.
// 2) Настоящий 404 для несуществующих адресов. Pages на любой неизвестный путь отдаёт index.html с кодом 200,
//    из-за этого поисковики видят «мягкие 404». Тело ответа не меняется: приложение само показывает страницу «не найдено».
//    Карточки (/videosalon/<slug>, /multklub/<slug>, /igry/<id>) и /poisk — отдельные файлы из scripts/prerender.mjs:
//    есть файл — 200, нет файла (Pages вернул запасной index.html) — 404.
// Список разделов должен совпадать с маршрутами в src/App.tsx.
const WWW = 'www.art-ai.studio';
const APEX = 'art-ai.studio';

const SECTIONS = 'videosalon|multklub|igry|muzyka|televizor|istorii|nostalgiya|retrointernet|po-godam|poisk';
const KNOWN = [
  /^\/$/,
  new RegExp(`^/(?:${SECTIONS})/?$`),
];

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === WWW) {
    url.hostname = APEX;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }

  const res = await context.next();
  if (res.status !== 200) return res; // редиректы из _redirects, 304 и прочее не трогаем
  if (!(res.headers.get('content-type') || '').includes('text/html')) return res;
  if (KNOWN.some((re) => re.test(url.pathname))) return res;

  // Остальное может быть настоящим файлом: пререндеренная карточка, подтверждение для поисковиков.
  // Отдаём 404, только если вместо файла пришла запасная страница приложения (тот же index.html).
  try {
    const fallback = await context.env.ASSETS.fetch(new URL('/', url));
    const [a, b] = await Promise.all([res.clone().text(), fallback.text()]);
    if (a !== b) return res;
  } catch {
    return res;
  }

  return new Response(res.body, { status: 404, statusText: 'Not Found', headers: res.headers });
}
