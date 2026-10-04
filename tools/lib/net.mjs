// Сетевые запросы для скриптов в обход DNS провайдера.
// Провайдер подменяет адреса некоторых сайтов (например, api.themoviedb.org → ::1),
// поэтому имена резолвим через публичные DNS (1.1.1.1, 8.8.8.8), а при сбое — через системный.
import https from 'node:https';
import http from 'node:http';
import dns from 'node:dns';

const resolver = new dns.promises.Resolver({ timeout: 4000, tries: 2 });
resolver.setServers(['1.1.1.1', '8.8.8.8']);
const cache = new Map();

function lookup(host, opts, cb) {
  if (typeof opts === 'function') { cb = opts; opts = {}; }
  const done = (addrs) => (opts?.all ? cb(null, addrs.map((address) => ({ address, family: 4 }))) : cb(null, addrs[0], 4));
  if (cache.has(host)) return done(cache.get(host));
  resolver.resolve4(host).then(
    (addrs) => { if (!addrs.length) throw new Error('no A'); cache.set(host, addrs); done(addrs); },
    () => dns.lookup(host, opts, cb)
  );
}

const agents = {
  'https:': new https.Agent({ keepAlive: true, maxSockets: 16, lookup }),
  'http:': new http.Agent({ keepAlive: true, maxSockets: 16, lookup })
};

/** Минимальная замена fetch: { ok, status, headers, buffer(), text(), json() }. */
export function netFetch(url, { headers = {}, method = 'GET', timeout = 30000, redirects = 5 } = {}) {
  return new Promise((resolvePromise, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.request(u, { method, headers: { 'User-Agent': 'Mozilla/5.0', ...headers }, agent: agents[u.protocol], timeout }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        return resolvePromise(netFetch(new URL(res.headers.location, u).href, { headers, method, timeout, redirects: redirects - 1 }));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        resolvePromise({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: res.headers,
          buffer: async () => buf,
          arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length),
          text: async () => buf.toString('utf8'),
          json: async () => JSON.parse(buf.toString('utf8'))
        });
      });
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end();
  });
}
