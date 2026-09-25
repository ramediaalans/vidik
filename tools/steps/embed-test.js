// Ждём, пока стенд отработает, и забираем отчёт.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 60; i += 1) {
  if (window.__report?.done) break;
  await sleep(1000);
}
const r = window.__report ?? { messages: [], sent: [] };
// Сжимаем: уникальные типы сообщений по каждому плееру + последние с временем.
const by = {};
for (const m of r.messages) {
  const b = (by[m.src] ??= { origin: m.origin, count: 0, kinds: {}, withTime: [] });
  b.count++;
  const kind = (m.data.match(/"(?:type|event|method|command)"\s*:\s*"([^"]+)"/) ?? [])[1] ?? m.data.slice(0, 40);
  b.kinds[kind] = (b.kinds[kind] || 0) + 1;
  if (/time|currentTime|duration/i.test(m.data) && b.withTime.length < 4) b.withTime.push(m.data.slice(0, 160));
}
return {
  done: Boolean(r.done),
  totalMessages: r.messages.length,
  sent: r.sent.length,
  players: by,
  frames: Array.from(document.querySelectorAll('iframe')).map((f) => ({
    id: f.id,
    w: Math.round(f.getBoundingClientRect().width),
    loaded: Boolean(f.contentWindow)
  }))
};
