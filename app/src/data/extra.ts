export type Channel = {
  num: string;
  name: string;
  now: string;
  next: string;
  image: string;
  alt: string;
  caption: string;
};

export const channels: Channel[] = [
  {
    num: '01',
    name: 'Мультфильмы',
    now: 'Утренний блок · 7:30',
    next: 'Дальше: повтор вчерашней серии',
    image: '/images/cartoons/cartoon-1.webp',
    alt: 'Яркий мультипликационный кадр на экране телевизора',
    caption: 'Смотреть надо было быстро: потом уроки.'
  },
  {
    num: '02',
    name: 'Кино',
    now: 'Вечерний сеанс · 21:00',
    next: 'Дальше: фильм с одноголосым переводом',
    image: '/images/movies/movie-3.webp',
    alt: 'Экран телевизора с помехами плёнки',
    caption: 'Звук потише, чтобы родители не услышали.'
  },
  {
    num: '03',
    name: 'Музыка',
    now: 'Чарт недели · 18:00',
    next: 'Дальше: клип, который ты ждал',
    image: '/images/music/music-1.webp',
    alt: 'Прозрачная аудиокассета на столе',
    caption: 'Палец на «REC», чтобы успеть записать.'
  },
  {
    num: '04',
    name: 'Передачи',
    now: 'Семейная викторина · 19:45',
    next: 'Дальше: новости и погода',
    image: '/images/tv/section-tv.webp',
    alt: 'Небольшой телевизор на кухонном столе',
    caption: 'Пятница, вечер, все на кухне.'
  },
  {
    num: '05',
    name: 'Реклама',
    now: 'Блок · каждые 15 минут',
    next: 'Дальше: снова тот же ролик',
    image: '/images/cartoons/cartoon-6.webp',
    alt: 'Яркие наклейки и вкладыши',
    caption: 'Ролики знали наизусть раньше стихов.'
  },
  {
    num: '06',
    name: 'Игры',
    now: 'Приставка подключена · канал 3',
    next: 'Дальше: «ещё одна жизнь и всё»',
    image: '/images/games/game-2.webp',
    alt: 'Пиксельный игровой кадр на экране',
    caption: 'Чтобы поиграть, сначала надо было найти третий канал.'
  }
];

export type Track = {
  id: string;
  title: string;
  artist: string;
  year: number;
  side: 'А' | 'Б';
  duration: string;
  note: string;
};

export const mixtape: Track[] = [
  { id: 't1', title: 'Smells Like Teen Spirit', artist: 'Nirvana', year: 1991, side: 'А', duration: '5:01', note: 'Записано с радио, первые две секунды срезаны' },
  { id: 't2', title: 'Breathe', artist: 'The Prodigy', year: 1996, side: 'А', duration: '5:35', note: 'Громкость вывернута на максимум' },
  { id: 't3', title: 'All That She Wants', artist: 'Ace of Base', year: 1992, side: 'А', duration: '3:30', note: 'Для школьной дискотеки' },
  { id: 't4', title: 'Владимирский централ', artist: 'Михаил Круг', year: 1998, side: 'Б', duration: '4:12', note: 'Кассета из бардачка машины' },
  { id: 't5', title: 'Раммштайн на перемене', artist: 'Школьный плеер', year: 1999, side: 'Б', duration: '3:58', note: 'Один наушник тебе, второй другу' },
  { id: 't6', title: 'Радиоэфир после полуночи', artist: 'ФМ-волна', year: 2001, side: 'Б', duration: '6:20', note: 'Шум и голос ведущего' }
];

export type Story = {
  id: string;
  title: string;
  excerpt: string;
  body: string[];
  image: string;
  alt: string;
  readTime: string;
};

export const stories: Story[] = [
  {
    id: 's-after-school',
    title: 'Что мы смотрели после школы',
    excerpt: 'Расписание дня строилось вокруг двух мультфильмов и одной передачи.',
    body: [
      'Портфель летел в угол ещё в прихожей. Важно было одно: успеть к заставке.',
      'Телевизор прогревался секунды три, и эти три секунды тянулись дольше последнего урока.',
      'Потом кто-то из взрослых говорил: «Сначала уроки». И мы торговались за одну серию.'
    ],
    image: '/images/stories/story-1.webp',
    alt: 'Ребёнок с пультом перед телевизором',
    readTime: '3 мин'
  },
  {
    id: 's-club',
    title: 'Час в компьютерном клубе',
    excerpt: 'Подвал, двенадцать мониторов и админ, который решал всё.',
    body: [
      'Деньги собирали вскладчину. Час стоил как две булочки, ночь — дешевле.',
      'Запах нагретой электроники и гудение кулеров были частью игры.',
      'Админ мог продлить сеанс на десять минут — это считалось большой удачей.'
    ],
    image: '/images/stories/story-2.webp',
    alt: 'Компьютерный клуб ночью',
    readTime: '4 мин'
  },
  {
    id: 's-dialup',
    title: 'Когда интернет пищал',
    excerpt: 'Соединение занимало телефон, и это была семейная драма.',
    body: [
      'Модем пел свою песню, и по её звуку можно было понять, будет ли сегодня интернет.',
      'Картинки грузились сверху вниз, и это был самый честный прогресс-бар в истории.',
      'Потом мама брала трубку — и всё заканчивалось.'
    ],
    image: '/images/stories/story-3.webp',
    alt: 'Старый компьютер в комнате',
    readTime: '3 мин'
  },
  {
    id: 's-tape',
    title: 'Кассета, которую зажевал магнитофон',
    excerpt: 'Карандаш был инструментом первой помощи.',
    body: [
      'Плёнка вытягивалась с характерным хрустом, и все в комнате замирали.',
      'Спасать надо было осторожно: слишком сильно потянешь — и любимая песня станет «плавающей».',
      'Зато потом её узнавали именно по этому дефекту.'
    ],
    image: '/images/stories/story-4.webp',
    alt: 'Коробка с аудиокассетами',
    readTime: '2 мин'
  },
  {
    id: 's-yard',
    title: 'Двор до темноты',
    excerpt: 'Главный социальный сервис до появления интернета.',
    body: [
      'Созвониться было негде: выходишь во двор — и там уже все.',
      'Игры придумывались из того, что лежало рядом: мел, палка, ковровыбивалка.',
      'Домой звали с балкона — и это слышал весь дом.'
    ],
    image: '/images/stories/story-5.webp',
    alt: 'Двор панельных домов на закате',
    readTime: '3 мин'
  },
  {
    id: 's-stickers',
    title: 'Экономика вкладышей',
    excerpt: 'Курс валют определялся на перемене.',
    body: [
      'Блестящие стоили дороже. Повторы шли по два за один.',
      'Коллекцию хранили в тетради между страницами, чтобы не мялись.',
      'Проиграть стопку в «переворот» было катастрофой дня.'
    ],
    image: '/images/stories/story-6.webp',
    alt: 'Наклейки и вкладыши на столе',
    readTime: '2 мин'
  }
];

export type YearCard = {
  year: number;
  watched: string;
  played: string;
  listened: string;
  tech: string;
  mood: string;
};

export const yearCards: YearCard[] = [
  { year: 1991, watched: '«Терминатор 2» на кассете с перезаписи', played: 'Dendy у соседа', listened: 'Nirvana — Nevermind', tech: 'Кассетный магнитофон', mood: 'Всё новое приходит сразу и много' },
  { year: 1994, watched: 'Видеосалон на углу', played: 'Картридж «9999 в 1»', listened: 'Записи с радио', tech: 'Первый пульт без провода', mood: 'Двор важнее школы' },
  { year: 1997, watched: '«Пятый элемент», «Брат»', played: 'Sega Mega Drive', listened: 'Мумий Тролль — Морская', tech: 'Плеер с автореверсом', mood: 'Музыка становится личной' },
  { year: 1999, watched: '«Матрица»', played: 'Heroes III до утра', listened: 'Земфира', tech: 'Первый домашний ПК', mood: 'Будущее выглядит зелёным' },
  { year: 2001, watched: 'Клипы на музыкальном канале', played: 'Counter-Strike в клубе', listened: 'MP3-диск на 200 песен', tech: 'Первый мобильный', mood: 'Интернет становится привычкой' },
  { year: 2004, watched: 'Сериалы по вечерам', played: 'Пиратские сборники на CD', listened: 'Рингтоны и MP3', tech: 'CD-болванки и болванкорез', mood: 'Детство заканчивается, архив остаётся' }
];

export type RetroSite = {
  id: string;
  title: string;
  note: string;
  year: string;
  embedUrl: string;
  url: string;
};

export const retroSites: RetroSite[] = [
  {
    id: 'r-yandex',
    title: 'Яндекс',
    note: 'Поиск, который помещался в один экран.',
    year: '1998',
    embedUrl: 'https://web.archive.org/web/1998/http://www.yandex.ru/',
    url: 'https://web.archive.org/web/1998/http://www.yandex.ru/'
  },
  {
    id: 'r-rambler',
    title: 'Rambler',
    note: 'Топ-100 и счётчики посещений.',
    year: '1999',
    embedUrl: 'https://web.archive.org/web/1999/http://www.rambler.ru/',
    url: 'https://web.archive.org/web/1999/http://www.rambler.ru/'
  },
  {
    id: 'r-lenta',
    title: 'Lenta.ru',
    note: 'Новости в эпоху dial-up.',
    year: '2000',
    embedUrl: 'https://web.archive.org/web/2000/http://www.lenta.ru/',
    url: 'https://web.archive.org/web/2000/http://www.lenta.ru/'
  },
  {
    id: 'r-mail',
    title: 'Mail.ru',
    note: 'Первая почта с адресом, который стыдно назвать сейчас.',
    year: '1999',
    embedUrl: 'https://web.archive.org/web/1999/http://www.mail.ru/',
    url: 'https://web.archive.org/web/1999/http://www.mail.ru/'
  }
];

export const marqueeLines = [
  'перемотай кассету',
  'канал 3 — приставка',
  'не занимай телефон',
  'сначала уроки',
  'выключи свет в коридоре',
  'ещё одна жизнь и всё'
];
