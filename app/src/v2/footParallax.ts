// Параллакс внутри букв «ВИДИК» в подвале: плакат едет по вертикали при прокрутке
// и слегка смещается за мышкой. Работает только пока надпись видна на экране.
import { useEffect, useRef } from 'react';

export function useFootParallax<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Плакат грузим только когда подвал близко, а не при открытии страницы.
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('is-near');
          near.disconnect();
        }
      },
      { rootMargin: '800px 0px' }
    );
    near.observe(el);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => near.disconnect();

    let visible = false;
    let raf = 0;
    let mx = 0; // -1..1 по горизонтали за мышкой

    const paint = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
      el.style.setProperty('--py', `${(10 + p * 80).toFixed(2)}%`);
      el.style.setProperty('--px', `${(50 + mx * 6).toFixed(2)}%`);
    };
    const queue = () => {
      if (visible && !raf) raf = requestAnimationFrame(paint);
    };
    const onMove = (e: PointerEvent) => {
      mx = (e.clientX / window.innerWidth) * 2 - 1;
      queue();
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      queue();
    });
    io.observe(el);
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    window.addEventListener('pointermove', onMove, { passive: true });
    paint();

    return () => {
      io.disconnect();
      near.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return ref;
}
