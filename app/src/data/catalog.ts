import type { CatalogItem } from '../media/types';

const wiki = (slug: string) => `https://ru.wikipedia.org/wiki/${slug}`;
const archive = (q: string) => `https://archive.org/search?query=${encodeURIComponent(q)}`;

const ref = (id: string, slug: string, q: string) => [
  {
    id: `${id}-wiki`,
    provider: 'Википедия',
    type: 'document' as const,
    url: wiki(slug),
    official: true,
    license: 'CC BY-SA',
    lastChecked: '2026-09-23'
  },
  {
    id: `${id}-ia`,
    provider: 'Интернет-архив',
    type: 'document' as const,
    url: archive(q),
    official: false,
    lastChecked: '2026-09-23'
  }
];

export const movies: CatalogItem[] = [
  {
    id: 'm-t2',
    kind: 'movie',
    title: 'Терминатор 2: Судный день',
    original: 'Terminator 2: Judgment Day',
    year: 1991,
    genre: 'Фантастика',
    image: '/images/movies/movie-1.webp',
    imageAlt: 'Видеокассета на ковре рядом с пультом',
    description: 'Жидкий металл, мотоцикл и фраза, которую во дворе знали все.',
    memory: 'Смотрели в одноголосом переводе, где голос был важнее звука.',
    tags: ['VHS', 'боевик', 'видеосалон'],
    sources: ref('m-t2', 'Терминатор_2:_Судный_день', 'Terminator 2 1991')
  },
  {
    id: 'm-home',
    kind: 'movie',
    title: 'Один дома',
    original: 'Home Alone',
    year: 1990,
    genre: 'Комедия',
    image: '/images/movies/movie-2.webp',
    imageAlt: 'Стопка видеокассет на кухонном столе',
    description: 'Главный новогодний фильм поколения — и до сих пор работает.',
    memory: '31 декабря, салат ещё режут, а ты уже у телевизора.',
    tags: ['Новый год', 'семейное', 'VHS'],
    sources: ref('m-home', 'Один_дома_(фильм)', 'Home Alone 1990')
  },
  {
    id: 'm-5th',
    kind: 'movie',
    title: 'Пятый элемент',
    original: 'The Fifth Element',
    year: 1997,
    genre: 'Фантастика',
    image: '/images/movies/movie-3.webp',
    imageAlt: 'Экран старого телевизора с помехами плёнки',
    description: 'Космос, оранжевые волосы и самый яркий будущее, которое мы видели.',
    memory: 'После него хотелось, чтобы 2263 год наступил побыстрее.',
    tags: ['фантастика', 'культовое'],
    sources: ref('m-5th', 'Пятый_элемент', 'Fifth Element 1997')
  },
  {
    id: 'm-titanic',
    kind: 'movie',
    title: 'Титаник',
    original: 'Titanic',
    year: 1997,
    genre: 'Драма',
    image: '/images/movies/movie-4.webp',
    imageAlt: 'Видеомагнитофон с кассетой',
    description: 'Две кассеты, три часа и одна песня, которая играла везде.',
    memory: 'Кассету №2 обычно забывали перемотать.',
    tags: ['драма', 'две кассеты'],
    sources: ref('m-titanic', 'Титаник_(фильм,_1997)', 'Titanic 1997 film')
  },
  {
    id: 'm-matrix',
    kind: 'movie',
    title: 'Матрица',
    original: 'The Matrix',
    year: 1999,
    genre: 'Фантастика',
    image: '/images/movies/movie-5.webp',
    imageAlt: 'Полка видеопроката с кассетами',
    description: 'Зелёный код, чёрные плащи и вопрос, какую таблетку выбрать.',
    memory: 'В компьютерном клубе после неё все ставили зелёный скринсейвер.',
    tags: ['киберпанк', '1999'],
    sources: ref('m-matrix', 'Матрица_(фильм)', 'The Matrix 1999')
  },
  {
    id: 'm-brat',
    kind: 'movie',
    title: 'Брат',
    year: 1997,
    genre: 'Драма',
    image: '/images/movies/movie-6.webp',
    imageAlt: 'Видеосалон с полками кассет',
    description: 'Город, свитер и плеер — кино, которое сняли про нашу улицу.',
    memory: 'Саундтрек переписывали на кассету с телевизора.',
    tags: ['российское кино', '90-е'],
    sources: ref('m-brat', 'Брат_(фильм)', 'Брат 1997')
  }
];

export const cartoons: CatalogItem[] = [
  {
    id: 'c-ducktales',
    kind: 'cartoon',
    title: 'Утиные истории',
    original: 'DuckTales',
    year: 1987,
    genre: 'Приключения',
    image: '/images/cartoons/cartoon-1.webp',
    imageAlt: 'Экран телевизора с яркой мультипликационной заставкой',
    description: 'Заставка, которую до сих пор можно спеть с любой секунды.',
    memory: 'Воскресенье, утро, ковёр, ближе чем на метр к экрану.',
    tags: ['Disney', 'утро', 'заставка'],
    sources: ref('c-ducktales', 'Утиные_истории', 'DuckTales 1987')
  },
  {
    id: 'c-rescue',
    kind: 'cartoon',
    title: 'Чип и Дейл спешат на помощь',
    original: 'Chip ’n Dale: Rescue Rangers',
    year: 1989,
    genre: 'Приключения',
    image: '/images/cartoons/cartoon-2.webp',
    imageAlt: 'Рука с пультом перед светящимся телевизором',
    description: 'Команда, которая научила нас работать в команде.',
    memory: 'За стикер с Гайкой отдавали три вкладыша.',
    tags: ['Disney', 'вкладыши'],
    sources: ref('c-rescue', 'Чип_и_Дейл_спешат_на_помощь', 'Rescue Rangers 1989')
  },
  {
    id: 'c-tom',
    kind: 'cartoon',
    title: 'Том и Джерри',
    original: 'Tom and Jerry',
    year: 1940,
    genre: 'Комедия',
    image: '/images/cartoons/cartoon-3.webp',
    imageAlt: 'Наклейки и вкладыши на школьной парте',
    description: 'Мультфильм без слов, понятный в любой стране.',
    memory: 'Его ставили, когда в гостях были дети разного возраста.',
    tags: ['классика', 'без слов'],
    sources: ref('c-tom', 'Том_и_Джерри', 'Tom and Jerry cartoons')
  },
  {
    id: 'c-simpsons',
    kind: 'cartoon',
    title: 'Симпсоны',
    original: 'The Simpsons',
    year: 1989,
    genre: 'Ситком',
    image: '/images/cartoons/cartoon-4.webp',
    imageAlt: 'Яркий кадр на экране телевизора',
    description: 'Жёлтая семья, которая показывала «заграницу» изнутри.',
    memory: 'Первый мультфильм, который смотрели взрослые вместе с детьми.',
    tags: ['сериал', 'вечер'],
    sources: ref('c-simpsons', 'Симпсоны', 'The Simpsons 1989')
  },
  {
    id: 'c-nupogodi',
    kind: 'cartoon',
    title: 'Ну, погоди!',
    year: 1969,
    genre: 'Комедия',
    image: '/images/cartoons/cartoon-5.webp',
    imageAlt: 'Телевизор в комнате с ковром',
    description: 'Наш ответ погоне без слов — и своя гордость.',
    memory: 'Шло по праздникам и всегда в нужный момент.',
    tags: ['Союзмультфильм', 'классика'],
    sources: ref('c-nupogodi', 'Ну,_погоди!', 'Ну погоди мультфильм')
  },
  {
    id: 'c-pokemon',
    kind: 'cartoon',
    title: 'Покемон',
    original: 'Pokémon',
    year: 1997,
    genre: 'Аниме',
    image: '/images/cartoons/cartoon-6.webp',
    imageAlt: 'Яркие наклейки на столе',
    description: 'С него началась эпоха коллекционирования всего подряд.',
    memory: 'Карточки меняли на перемене, как валюту.',
    tags: ['аниме', '2000-е', 'карточки'],
    sources: ref('c-pokemon', 'Покемон_(аниме)', 'Pokemon anime 1997')
  }
];

export const games: CatalogItem[] = [
  {
    id: 'g-contra',
    kind: 'game',
    title: 'Contra',
    year: 1988,
    genre: 'Стрелялка',
    platform: 'Dendy / NES',
    image: '/images/games/game-1.webp',
    imageAlt: 'Картридж на ковре',
    description: 'Двое на диване, тридцать жизней и один код.',
    memory: 'Вверх, вверх, вниз, вниз… дальше все знают.',
    tags: ['Dendy', 'кооп', 'хардкор'],
    sources: ref('g-contra', 'Contra_(игра)', 'Contra NES 1988')
  },
  {
    id: 'g-mario',
    kind: 'game',
    title: 'Super Mario Bros.',
    year: 1985,
    genre: 'Платформер',
    platform: 'Dendy / NES',
    image: '/images/games/game-2.webp',
    imageAlt: 'Пиксельный кадр на экране телевизора',
    description: 'Игра, которая была на каждом картридже «9999 в 1».',
    memory: 'Первый уровень мы проходили с закрытыми глазами.',
    tags: ['Dendy', 'классика'],
    sources: ref('g-mario', 'Super_Mario_Bros.', 'Super Mario Bros 1985')
  },
  {
    id: 'g-sonic',
    kind: 'game',
    title: 'Sonic the Hedgehog',
    year: 1991,
    genre: 'Платформер',
    platform: 'Sega Mega Drive',
    image: '/images/games/game-3.webp',
    imageAlt: 'Два геймпада на ковре',
    description: 'Скорость, кольца и синий цвет как стиль жизни.',
    memory: 'Аренда Sega на выходные стоила отдельных переговоров с родителями.',
    tags: ['Sega', '16 бит'],
    sources: ref('g-sonic', 'Sonic_the_Hedgehog_(игра,_1991)', 'Sonic the Hedgehog 1991')
  },
  {
    id: 'g-mk3',
    kind: 'game',
    title: 'Mortal Kombat 3',
    year: 1995,
    genre: 'Файтинг',
    platform: 'Sega Mega Drive',
    image: '/images/games/game-4.webp',
    imageAlt: 'Картриджи и приставка',
    description: 'Главный спор двора: кто знает больше комбинаций.',
    memory: 'Список приёмов переписывали в тетрадь на последней странице.',
    tags: ['Sega', 'файтинг', 'двор'],
    sources: ref('g-mk3', 'Mortal_Kombat_3', 'Mortal Kombat 3 1995')
  },
  {
    id: 'g-homm3',
    kind: 'game',
    title: 'Heroes of Might and Magic III',
    year: 1999,
    genre: 'Стратегия',
    platform: 'PC',
    image: '/images/games/game-5.webp',
    imageAlt: 'Старый компьютерный монитор',
    description: '«Ещё один ход» — и уже четыре утра.',
    memory: 'Горячий стул и гудящий системник в соседней комнате.',
    tags: ['PC', 'пошаговые', '1999'],
    sources: ref('g-homm3', 'Heroes_of_Might_and_Magic_III', 'Heroes of Might and Magic III')
  },
  {
    id: 'g-cs',
    kind: 'game',
    title: 'Counter-Strike 1.6',
    year: 2000,
    genre: 'Шутер',
    platform: 'Компьютерный клуб',
    image: '/images/games/game-6.webp',
    imageAlt: 'Компьютерный клуб ночью',
    description: 'de_dust2, десять человек в подвале и один админ.',
    memory: 'Час стоил как две булочки, ночь — дешевле.',
    tags: ['клуб', 'мультиплеер', '2000-е'],
    sources: ref('g-cs', 'Counter-Strike', 'Counter-Strike 1.6')
  }
];

export const music: CatalogItem[] = [
  {
    id: 'a-nevermind',
    kind: 'music',
    title: 'Nevermind',
    artist: 'Nirvana',
    year: 1991,
    genre: 'Гранж',
    image: '/images/music/music-1.webp',
    imageAlt: 'Кассета на столе',
    description: 'Гитары, которые закончили одну эпоху и начали другую.',
    memory: 'Переписывали с чужой кассеты, теряя верхние частоты.',
    tags: ['рок', '90-е'],
    sources: ref('a-nevermind', 'Nevermind', 'Nirvana Nevermind 1991')
  },
  {
    id: 'a-fatofland',
    kind: 'music',
    title: 'The Fat of the Land',
    artist: 'The Prodigy',
    year: 1997,
    genre: 'Электроника',
    image: '/images/music/music-2.webp',
    imageAlt: 'Магнитофон и кассеты',
    description: 'Звук, под который стало модно бриться налысо.',
    memory: 'Играло из каждой второй машины во дворе.',
    tags: ['танцпол', 'импорт'],
    sources: ref('a-fatofland', 'The_Fat_of_the_Land', 'Prodigy Fat of the Land')
  },
  {
    id: 'a-thesign',
    kind: 'music',
    title: 'The Sign',
    artist: 'Ace of Base',
    year: 1993,
    genre: 'Поп',
    image: '/images/music/music-3.webp',
    imageAlt: 'Прозрачная кассета',
    description: 'Поп-формула, которая звучала на любой дискотеке.',
    memory: 'Записывали с радио, стараясь обрезать голос ведущего.',
    tags: ['поп', 'радио'],
    sources: ref('a-thesign', 'The_Sign_(альбом)', 'Ace of Base The Sign')
  },
  {
    id: 'a-rukivverh',
    kind: 'music',
    title: 'Дышу тобой',
    artist: 'Руки Вверх!',
    year: 1998,
    genre: 'Поп',
    image: '/images/music/music-4.webp',
    imageAlt: 'Кассеты стопкой',
    description: 'Саундтрек школьных дискотек и первых плееров.',
    memory: 'Кассета жила ровно до момента, пока её не зажевал магнитофон.',
    tags: ['дискотека', 'школа'],
    sources: ref('a-rukivverh', 'Руки_Вверх!', 'Руки Вверх 1998')
  },
  {
    id: 'a-zemfira',
    kind: 'music',
    title: 'Земфира',
    artist: 'Земфира',
    year: 1999,
    genre: 'Рок',
    image: '/images/music/music-5.webp',
    imageAlt: 'Плеер и наушники',
    description: 'Дебют, который сразу разобрали на цитаты.',
    memory: 'Слова выписывали в анкету и на обложку тетради.',
    tags: ['русский рок', '1999'],
    sources: ref('a-zemfira', 'Земфира_(альбом)', 'Земфира 1999 альбом')
  },
  {
    id: 'a-morskaya',
    kind: 'music',
    title: 'Морская',
    artist: 'Мумий Тролль',
    year: 1997,
    genre: 'Альтернатива',
    image: '/images/music/music-6.webp',
    imageAlt: 'Кассета и карандаш',
    description: 'Звук, который сделал русскую альтернативу модной.',
    memory: 'Кассету перематывали карандашом, чтобы сэкономить батарейки.',
    tags: ['альтернатива', 'плеер'],
    sources: ref('a-morskaya', 'Морская_(альбом)', 'Мумий Тролль Морская')
  }
];

export const catalog: CatalogItem[] = [...movies, ...cartoons, ...games, ...music];

export const catalogById = (id: string) => catalog.find((item) => item.id === id);
