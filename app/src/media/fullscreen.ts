import { useCallback, useEffect, useState } from 'react';
import type { RefObject } from 'react';

type Options = {
  /** Автоматически раскрывать на весь экран при повороте телефона в горизонталь. */
  autoLandscape?: boolean;
  /** Автоповорот работает, только когда плеер активен. */
  active?: boolean;
};

/**
 * Полноэкранный режим с подстраховкой: если Fullscreen API недоступен
 * (iOS Safari не даёт requestFullscreen для произвольных элементов), включается
 * CSS-режим «is-pseudoFullscreen» на весь viewport.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>, options: Options = {}) {
  const { autoLandscape = false, active = true } = options;
  const [native, setNative] = useState(false);
  const [pseudo, setPseudo] = useState(false);

  useEffect(() => {
    const onChange = () => setNative(Boolean(document.fullscreenElement) && document.fullscreenElement === ref.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, [ref]);

  const enter = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    if (document.fullscreenEnabled && node.requestFullscreen) {
      node.requestFullscreen().catch(() => setPseudo(true));
      return;
    }
    setPseudo(true);
  }, [ref]);

  const exit = useCallback(() => {
    setPseudo(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => { /* уже вышли */ });
  }, []);

  const isFullscreen = native || pseudo;
  const toggle = useCallback(() => { if (isFullscreen) exit(); else enter(); }, [enter, exit, isFullscreen]);

  // В псевдорежиме блокируем прокрутку страницы и выходим по Escape.
  useEffect(() => {
    if (!pseudo) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setPseudo(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [pseudo]);

  // На телефоне клавиатуры нет: поворот в горизонталь = полный экран.
  useEffect(() => {
    if (!autoLandscape || !active) return;
    if (!window.matchMedia('(pointer: coarse)').matches) return;
    const landscape = window.matchMedia('(orientation: landscape)');
    const apply = (matches: boolean) => {
      if (matches) enter();
      else exit();
    };
    const onChange = (event: MediaQueryListEvent) => apply(event.matches);
    landscape.addEventListener('change', onChange);
    return () => landscape.removeEventListener('change', onChange);
  }, [active, autoLandscape, enter, exit]);

  return { isFullscreen, pseudo, enter, exit, toggle };
}
