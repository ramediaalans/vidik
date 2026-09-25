// Разбираемся, что именно SDK Vibix подставил вместо <ins>.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(15000);
const out = { frames: [], insHtml: '', msgs: [] };
for (const f of document.querySelectorAll('iframe')) {
  const r = f.getBoundingClientRect();
  out.frames.push({ id: f.id, w: Math.round(r.width), h: Math.round(r.height), src: (f.src || '').slice(0, 300) });
}
const ins = document.querySelector('ins') || document.getElementById('vibix-ins');
out.insHtml = ins ? ins.outerHTML.slice(0, 600) : 'ins не найден';
const all = (window.__report?.messages ?? []).filter((m) => /kinescope|rendex|graphicslab/.test(m.origin || ''));
out.msgs = all.slice(0, 10).map((m) => (m.origin + ' :: ' + m.data).slice(0, 200));
return out;
