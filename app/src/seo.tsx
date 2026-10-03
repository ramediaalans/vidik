import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

// Заголовок, описание, canonical и robots для каждого адреса.
// Правило: без реальных названий фильмов, игр и торговых марок. Только общие слова про 90-е.
// Карточки фильмов, мультфильмов и игр, поиск и 404 закрыты от индексации (noindex).
// Список индексируемых адресов должен совпадать с public/sitemap.xml.

const ORIGIN = 'https://art-ai.studio';

type Meta = { title: string; description: string; index: boolean };

const SECTIONS: Array<[string, Meta]> = [
  ['/', {
    title: 'ВИДИК — кассеты, мультики, приставка и музыка 90-х',
    description: 'Вечер из детства 90-х: кассеты из видеосалона, мультики по выходным, игры на приставке, музыка с магнитофона и телевизор по старой программе.',
    index: true,
  }],
  ['/videosalon', {
    title: 'Видеосалон: кино 80-х и 90-х на кассетах — ВИДИК',
    description: 'Полка с видеокассетами, как в прокате 90-х: боевики, комедии, фантастика и семейное кино, которое смотрели всем двором.',
    index: true,
  }],
  ['/multklub', {
    title: 'Мультклуб: мультфильмы 90-х по выходным — ВИДИК',
    description: 'Мультсериалы и мультфильмы, которые в 90-е показывали по воскресеньям утром. Выбирай серию и включай.',
    index: true,
  }],
  ['/igry', {
    title: 'Приставка: игры на картриджах 90-х — ВИДИК',
    description: 'Игры с картриджей прямо в браузере: платформеры, гонки, драки и всё, во что играли после школы.',
    index: true,
  }],
  ['/muzyka', {
    title: 'Музыка 80-х и 90-х на кассетах — ВИДИК',
    description: 'Магнитофон и полка кассет: поп, евродиско, рок и всё, что переписывали друг у друга в 90-е.',
    index: true,
  }],
  ['/televizor', {
    title: 'Телевизор 90-х: каналы по старой программе — ВИДИК',
    description: 'Телевизор на три кнопки. На каналах идут передачи, мультики и кино по расписанию, как в 90-е.',
    index: true,
  }],
  ['/istorii', {
    title: 'Дневник двора: истории про детство в 90-е — ВИДИК',
    description: 'Ключ на шнурке, карандаш в кассете, третий канал. Короткие истории про детство в 90-е и начале 2000-х.',
    index: true,
  }],
  ['/nostalgiya', {
    title: 'Ностальгия по 90-м — ВИДИК',
    description: 'Детство 90-х и начала 2000-х по мелочам: как проходил день и что было почти у всех.',
    index: true,
  }],
  ['/retrointernet', {
    title: 'Ретроинтернет: интернет, который пищал — ВИДИК',
    description: 'Модем, чаты, первые порталы и сайты конца 90-х. Подключись, как тогда.',
    index: true,
  }],
  ['/po-godam', {
    title: 'По годам: календарь 90-х и 2000-х — ВИДИК',
    description: 'Отрывной календарь: что смотрели, во что играли и что слушали в каждый год.',
    index: true,
  }],
];

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
  }, [pathname]);
  return null;
}
