// Комнаты квартиры в порядке «одного дня»: и меню, и главная, и подвал берут их отсюда.
// Картинки — прямые генерации для редизайна (public/images/v2), см. IMAGE_GENERATION.md.
export type Room = {
  id: string;
  label: string;
  time: string;
  when: string;
  image: string;
  alt: string;
  /** SPA-маршрут. */
  to?: string;
  /** Отдельная статическая страница с полной перезагрузкой (компьютерный клуб). */
  href?: string;
};

export const ROOMS: Room[] = [
  {
    id: 'disney',
    label: 'Дисней-клуб',
    time: '08:30',
    when: 'Воскресенье, утро',
    image: '/images/v2/ch-disney.webp',
    alt: 'Воскресное утро: солнце сквозь тюль, телевизор с мультфильмом, тарелка каши на ковре',
    to: '/multklub'
  },
  {
    id: 'games',
    label: 'Приставка',
    time: '14:10',
    when: 'После школы',
    image: '/images/v2/ch-games.webp',
    alt: 'Восьмибитная приставка, джойстики и картриджи на ковре перед телевизором',
    to: '/igry'
  },
  {
    id: 'pc',
    label: 'Компьютерный клуб',
    time: '17:40',
    when: 'Клуб через дорогу',
    image: '/images/v2/ch-pc.webp',
    alt: 'Уютный компьютерный клуб вечером: ряд бежевых мониторов, настольные лампы, деревянные стены',
    href: '/pc/'
  },
  {
    id: 'tv',
    label: 'Телевизор',
    time: '19:30',
    when: 'Вечерний эфир',
    image: '/images/v2/ch-tv.webp',
    alt: 'Кухня вечером: телевизор с антенной, чайник и хлеб на клеёнке',
    to: '/televizor'
  },
  {
    id: 'salon',
    label: 'Видеосалон',
    time: '22:00',
    when: 'Ночной сеанс',
    image: '/images/v2/ch-salon.webp',
    alt: 'Уютный видеосалон: кресла, телевизор с видеомагнитофоном, полки кассет и тёплая лампа',
    to: '/videosalon'
  }
];

export type MoreLink = { to: string; label: string; note: string; image: string };

export const MORE: MoreLink[] = [
  { to: '/muzyka', label: 'Музыка', note: 'Кассетник, Webamp и сборник с радио', image: '/images/music/section-music.webp' },
  { to: '/istorii', label: 'Истории', note: 'Короткие тексты о быте', image: '/images/stories/section-stories.webp' },
  { to: '/nostalgiya', label: 'Ностальгия', note: 'Собери свой вечер', image: '/images/ui/hero-night.webp' },
  { to: '/retrointernet', label: 'Ретроинтернет', note: 'Модем, чаты и первые сайты', image: '/images/games/section-games.webp' },
  { to: '/po-godam', label: 'По годам', note: 'С 1990 по 2005, год за годом', image: '/images/hero/yard-golden.webp' },
  { to: '/poisk', label: 'Поиск', note: 'Весь архив в одной строке', image: '/images/hero/hero-room.webp' }
];
