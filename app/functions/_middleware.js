// Cloudflare Pages Function. Срабатывает только для адресов страниц: статика исключена в public/_routes.json.
// Задача одна: www.art-ai.studio -> art-ai.studio, постоянное перенаправление 301 с сохранением пути и параметров.
// Остальные запросы проходят дальше без изменений (статика, _redirects, _headers, приложение).
const WWW = 'www.art-ai.studio';
const APEX = 'art-ai.studio';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === WWW) {
    url.hostname = APEX;
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
