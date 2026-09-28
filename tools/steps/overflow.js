// Ищем горизонтальное переполнение и виновников.
return await (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(1200);
  const doc = document.documentElement;
  const limit = doc.clientWidth;
  const guilty = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right > limit + 1) {
      guilty.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 60),
        right: Math.round(r.right),
        width: Math.round(r.width)
      });
    }
  }
  guilty.sort((a, b) => b.right - a.right);
  return {
    clientWidth: limit,
    scrollWidth: doc.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    count: guilty.length,
    worst: guilty.slice(0, 12)
  };
})();
