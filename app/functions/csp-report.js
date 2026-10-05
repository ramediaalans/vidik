// Приёмник отчётов Content-Security-Policy-Report-Only (см. report-uri в public/_headers).
// Нарушения видны в логах функции Cloudflare Pages (Real-time Logs). Ничего не храним.
const MAX_BYTES = 8 * 1024;

export async function onRequestPost({ request }) {
  try {
    const text = (await request.text()).slice(0, MAX_BYTES);
    const data = JSON.parse(text);
    const report = data['csp-report'] ?? (Array.isArray(data) ? data[0]?.body : data);
    console.log('[csp]', JSON.stringify({
      directive: report?.['violated-directive'] ?? report?.effectiveDirective,
      blocked: report?.['blocked-uri'] ?? report?.blockedURL,
      page: report?.['document-uri'] ?? report?.documentURL,
    }));
  } catch {
    // мусор и пустые тела просто игнорируем
  }
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}

export function onRequest() {
  return new Response(null, { status: 405, headers: { Allow: 'POST' } });
}
