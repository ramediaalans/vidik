// Одна команда: отдаёт ли балансер реальное видео или всё ещё заглушку.
// Запускать после каждой правки в личном кабинете:
//   node tools/films/check-player.mjs
//   node tools/films/check-player.mjs --ref https://ваш-домен.ru/
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const env = {};
for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = /^\s*(?:export\s+)?([A-Za-z0-9_.-]+)\s*=\s*(.*)$/.exec(line);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}
const V = env.BALANCER2_BASE.replace(/\/+$/, '');
const H = { Authorization: `Bearer ${env.BALANCER2_TOKEN}`, Accept: 'application/json' };
const CDN = 'https://river-3-329.kinescopecdn.net';

const refArg = process.argv.indexOf('--ref');
const REF = refArg > -1 ? process.argv[refArg + 1] : null;
const headers = REF ? { Referer: REF, Origin: new URL(REF).origin } : {};

const STUB = /ещё? не добавлен/i;

const PROBES = [
  [444, 'Терминатор 2'],
  [301, 'Матрица'],
  [8124, 'Один дома'],
  [81426, 'Утиные истории']
];

console.log(REF ? `проверка с Referer: ${REF}\n` : 'проверка без Referer\n');

let good = 0;
for (const [kp, name] of PROBES) {
  const j = await (await fetch(`${V}/api/v1/publisher/videos/kp/${kp}`, { headers: H })).json();
  const c = j?.data ?? j;
  const code = c?.embed_code ?? '';
  const pub = /data-publisher-id="([^"]+)"/.exec(code)?.[1];
  const type = /data-type="([^"]+)"/.exec(code)?.[1];
  const id = /data-id="([^"]+)"/.exec(code)?.[1];

  if (!id) {
    console.log(`  ?  ${name.padEnd(18)} в карточке нет embed_code`);
    continue;
  }

  const path = type === 'serial' ? 'embed-serials' : 'embed';
  const url = `${CDN}/${pub}/${path}/${id}?lang=ru&nc=${Math.floor(Date.now() / 1000)}`;
  const r = await fetch(url, { headers });
  const t = await r.text();
  const stub = STUB.test(t);
  if (!stub) good += 1;
  console.log(
    `  ${stub ? '✗ заглушка' : '✓ ЕСТЬ ВИДЕО'}  ${name.padEnd(18)} type=${String(type).padEnd(7)} id=${String(id).padEnd(8)} http=${r.status} len=${t.length}`
  );
  if (!stub) console.log(`      ${url}`);
}

console.log(
  good === 0
    ? '\nИТОГ: контента нет ни по одной записи — аккаунт всё ещё не отдаёт поток.'
    : `\nИТОГ: заработало у ${good} из ${PROBES.length}. Можно подключать сайт.`
);
