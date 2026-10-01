// Выключатель старого service worker DiabloWeb: чистит кэш и снимает себя (файлы игры идут напрямую с сервера)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll({ type: 'window' })) { try { c.navigate(c.url); } catch (err) {} }
})()));
