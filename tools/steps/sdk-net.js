return await (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  await sleep(6000);
  const res = performance
    .getEntriesByType('resource')
    .map((e) => e.name)
    .filter((n) => !/fonts\.|vite|@react|\.css$/.test(n));
  return {
    запросы: res,
    iframes: [...document.querySelectorAll('iframe')].map((f) => f.src),
    глобалы: Object.keys(window).filter((k) => /rendex|vibix/i.test(k)),
    конфиг: (() => {
      try {
        const s = window.RendexSDK;
        if (!s) return null;
        return {
          тип: typeof s,
          ключи: Object.keys(s).slice(0, 25),
          json: JSON.stringify(s).slice(0, 500)
        };
      } catch (e) {
        return 'ошибка ' + e.message;
      }
    })()
  };
})();
