return await (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(2500);
  const cards = [...document.querySelectorAll('.toon')];
  return {
    карточек: cards.length,
    безПостера: cards.filter((c) => {
      const img = c.querySelector('img');
      return !img || !img.complete || img.naturalWidth === 0;
    }).length,
    первая: cards[0]
      ? {
          текст: cards[0].querySelector('.toon__title')?.textContent,
          подпись: cards[0].querySelector('.toon__sub')?.textContent,
          ссылка: cards[0].getAttribute('href')
        }
      : null,
    горизонтальныйСкролл: document.documentElement.scrollWidth > window.innerWidth + 1
  };
})();
