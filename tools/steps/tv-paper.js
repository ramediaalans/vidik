// Прокручивает к газетной программе и проверяет выравнивание столбцов.
await document.fonts.ready;
const paper = document.querySelector('.paper');
if (!paper) return 'no .paper';
window.scrollTo(0, paper.getBoundingClientRect().top + window.scrollY - 10);
await new Promise((r) => setTimeout(r, 600));
const cols = [...paper.querySelectorAll('.paper__col')].map((col) => {
  const t = new Set(), n = new Set(), tr = new Set();
  col.querySelectorAll('.paper__row').forEach((row) => {
    const tb = row.querySelector('.paper__time').getBoundingClientRect();
    const nb = row.querySelector('.paper__name').getBoundingClientRect();
    tr.add(Math.round(tb.right)); n.add(Math.round(nb.left));
  });
  return { name: col.querySelector('.paper__channel').textContent, rows: col.querySelectorAll('.paper__row').length, timeRight: [...tr], nameLeft: [...n] };
});
return { font: getComputedStyle(paper.querySelector('.paper__name')).fontFamily, ptSerif: document.fonts.check('16px "PT Serif"'), overflowX: document.documentElement.scrollWidth > innerWidth, cols };
