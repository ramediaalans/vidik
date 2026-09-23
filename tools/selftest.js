// Injected into dist/index.html for one QA run. Not part of the app.
(function () {
  const log = [];
  const ok = (n, c) => log.push((c ? 'PASS  ' : 'FAIL  ') + n);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (s) => document.querySelector(s);
  const qa = (s) => Array.from(document.querySelectorAll(s));
  const byText = (sel, t) => qa(sel).find((e) => (e.textContent || '').trim().toLowerCase().includes(t.toLowerCase()));

  async function run() {
    await sleep(2500);

    // boot screen must disappear
    const boot = q('.boot');
    if (boot) {
      const skip = q('.boot__skip') || byText('.boot button', 'пропус');
      if (skip) skip.click();
      await sleep(600);
    }
    ok('boot screen closed', !q('.boot'));

    // RetroTV channel switching
    const nowName = () => (q('.channel.is-active .channel__name') || {}).textContent || '';
    const before = nowName();
    const next = byText('button', 'канал →') || byText('button', 'канал');
    if (next) next.click();
    await sleep(500);
    ok('tv channel switches (' + before + ' -> ' + nowName() + ')', !!next && nowName() !== before);

    // open card modal
    const card = q('.card__mediaBtn') || q('.card button') || q('.card');
    if (card) card.click();
    await sleep(600);
    const modalOpen = !!q('.modal');
    ok('card opens modal', modalOpen);
    ok('modal has dialog role', !!q('.modal [role="dialog"]'));
    ok('body scroll locked', document.body.style.overflow === 'hidden');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(500);
    ok('escape closes modal', !q('.modal'));

    // konami
    const code = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    code.forEach((k) => window.dispatchEvent(new KeyboardEvent('keydown', { key: k })));
    await sleep(400);
    ok('konami easter egg', !!byText('div', '+30 жизней'));

    // marquee + grain present
    ok('marquee rendered', qa('.marquee, .ticker').length > 0);
    ok('grain overlay rendered', !!q('.grain'));

    // images loaded
    const imgs = qa('img');
    const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0);
    ok('images loaded (' + imgs.length + ' total, ' + broken.length + ' broken)', broken.length === 0);

    // alt texts
    const noAlt = imgs.filter((i) => !i.getAttribute('alt'));
    ok('all images have alt (' + noAlt.length + ' missing)', noAlt.length === 0);

    // headings order
    ok('single h1 on page', qa('h1').length === 1);

    const box = document.createElement('div');
    box.style.cssText = 'position:fixed;z-index:99999;left:0;top:0;width:100%;background:#fff;color:#000;font:12px monospace;padding:8px;white-space:pre-wrap';
    box.textContent = log.join('\n');
    document.body.appendChild(box);
  }

  run();
})();
