import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

// Заголовок, описание, canonical и robots для каждого адреса.
// Правило: без реальных названий фильмов, игр и торговых марок. Только общие слова про 90-е.
// Карточки фильмов, мультфильмов и игр, поиск и 404 закрыты от индексации (noindex).
// Список индексируемых адресов должен совпадать с public/sitemap.xml.

import { ORIGIN, SECTIONS, type Meta } from './seoSections';

// Страницы, которые не должны попадать в поиск. Заголовки общие, без названий.
const HIDDEN: Array<[string, string]> = [
  ['/videosalon/:slug', 'Видеосалон — ВИДИК'],
  ['/multklub/:slug', 'Мультклуб — ВИДИК'],
  ['/igry/:id', 'Приставка — ВИДИК'],
  ['/poisk', 'Поиск по архиву — ВИДИК'],
];

const HOME = SECTIONS[0][1];
const NOT_FOUND: Meta = { title: 'Страница не найдена — ВИДИК', description: HOME.description, index: false };
// Старые адреса: на них только перенаправление, метаданные не нужны.
const LEGACY = ['/filmy', '/multfilmy', '/disney-klub', '/disney-klub/:slug'];

export function metaFor(pathname: string): Meta | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (LEGACY.some((p) => matchPath(p, path))) return null;
  const section = SECTIONS.find(([p]) => matchPath(p, path));
  if (section) return section[1];
  const hidden = HIDDEN.find(([p]) => matchPath(p, path));
  if (hidden) return { title: hidden[1], description: HOME.description, index: false };
  return NOT_FOUND;
}

function setMetaTag(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (content === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setCanonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (href === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.rel = 'canonical';
    document.head.appendChild(el);
  }
  el.href = href;
}

export function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const meta = metaFor(pathname);
    if (!meta) return;
    const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
    document.title = meta.title;
    setMetaTag('name', 'description', meta.description);
    setMetaTag('property', 'og:title', meta.title);
    setMetaTag('property', 'og:description', meta.description);
    setMetaTag('property', 'og:url', ORIGIN + path);
    setMetaTag('name', 'robots', meta.index ? null : 'noindex, follow');
    setCanonical(meta.index ? ORIGIN + path : null);
    const ld = document.getElementById('ld-page');
    if (ld && ld.dataset.path !== path) ld.remove();
  }, [pathname]);
  return null;
}
