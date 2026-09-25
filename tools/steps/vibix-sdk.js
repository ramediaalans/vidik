const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 40; i += 1) { if (window.__report?.done) break; await sleep(1000); }
const r = window.__report ?? {};
const kinds = {};
for (const m of r.messages ?? []) {
  const k = (m.data.match(/"(?:type|event)"\s*:\s*"([^"]+)"/) ?? [])[1] ?? m.data.slice(0, 30);
  kinds[k] = (kinds[k] || 0) + 1;
}
return {
  done: Boolean(r.done),
  answered: r.answered ?? 0,
  totalMessages: (r.messages ?? []).length,
  kinds,
  frames: r.frames ?? [],
  videoTags: document.querySelectorAll('video').length
};
