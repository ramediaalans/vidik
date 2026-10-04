// Сетевые запросы для скриптов в обход DNS провайдера.
// Провайдер подменяет адреса некоторых сайтов (например, api.themoviedb.org → ::1),
// поэтому имена резолвим через публичные DNS (1.1.1.1, 8.8.8.8), а при сбое — через системный.
import https from 'node:https';
import http from 'node:http';
import dns from 'node:dns';

const resolver = new dns.promises.Resolver({ timeout: 3000, tries: 2 });
resolver.setServers(['1.1.1.1', '8.8.8.8']);
const cache = new Map(); // host -> Promise<string[]>
const isStub = (a) => /^(127\.|0\.0\.0\.0$|::1$|::$)/.test(a);

// DNS-over-HTTPS по IP-адресу: работает, даже если обычный DNS перехвачен
function doh(host) {
  return new Promise((ok, fail) => {
    const req = https.get(
      `https://1.1.1.1/dns-query?name=${encodeURIComponent(host)}&type=A`,
      { headers: { Accept: 'application/dns-json' }, timeout: 5000 },
      (res) => {
        let t = '';
        res.on('data', (c) => (t += c));
        res.on('end', () => {
          try {
            const a = (JSON.parse(t).Answer ?? []).filter((x) => x.type === 1).map((x) => x.data);
            a.length ? ok(a) : fail(new Error('DoH: no A'));
          } catch (e) { fail(e); }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('DoH timeout')));
    req.on('error', fail);
  });
}

async function resolveHost(host) {
  for (let i = 0; i < 2; i++) {
    try {
      const a = await resolver.resolve4(host);
      if (a.length && !a.some(isStub)) return a;
    } catch {}
  }
  try { return await doh(host); } catch {}
  const sys = await dns.promises.lookup(host, { all: true, family: 4 });
  const a = sys.map((x) => x.address).filter((x) => !isStub(x));
  if (!a.length) throw new Error(`DNS: не удалось получить настоящий адрес ${host}`);
  return a;
}

function lookup(host, opts, cb) {
  if (typeof opts === 'function') { cb = opts; opts = {}; }
  if (!cache.has(host)) cache.set(host, resolveHost(host).catch((e) => { cache.delete(host); throw e; }));
  cache.get(host).then(
    (addrs) => (opts?.all ? cb(null, addrs.map((address) => ({ address, family: 4 }))) : cb(null, addrs[0], 4)),
    (e) => cb(e)
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
