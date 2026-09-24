export type RomCore = 'fceumm' | 'genesis_plus_gx' | 'snes9x';

export type Rom = {
  id: string;
  file: string;
  core: RomCore;
  title: string;
  nick: string;
  year: number;
  platform: string;
  genre: string;
  players: 1 | 2;
  memory: string;
};

const NES = 'Dendy / NES';
const MD = 'Sega Mega Drive';
const SNES = 'Super Nintendo';

export const roms: Rom[] = [
  {
    id: 'contra',
    file: 'roms/contra.nes',
    core: 'fceumm',
    title: 'Contra',
    nick: 'Контра',
    year: 1988,
    platform: NES,
    genre: 'Стрелялка',
    players: 2,
    memory: 'Вверх, вверх, вниз, вниз… дальше все знают.'
  },
  {
    id: 'contra-force',
    file: 'roms/contra-force.nes',
    core: 'fceumm',
    title: 'Contra Force',
    nick: 'Контра 3',
    year: 1992,
    platform: NES,
    genre: 'Стрелялка',
    players: 2,
    memory: 'Та самая «третья Контра», которая на самом деле не Контра.'
  },
  {
    id: 'chip-n-dale',
    file: 'roms/chip-n-dale-rescue-rangers.nes',
    core: 'fceumm',
    title: "Chip 'n Dale Rescue Rangers",
    nick: 'Чип и Дейл',
    year: 1990,
    platform: NES,
    genre: 'Платформер',
    players: 2,
    memory: 'Брат кидался ящиком именно в тот момент, когда я прыгал.'
  },
  {
    id: 'chip-n-dale-2',
    file: 'roms/chip-n-dale-rescue-rangers-2.nes',
    core: 'fceumm',
    title: "Chip 'n Dale Rescue Rangers 2",
    nick: 'Чип и Дейл 2',
    year: 1993,
    platform: NES,
    genre: 'Платформер',
    players: 2,
    memory: 'Вторая часть была редкостью — её привозили «из города».'
  },
  {
    id: 'mortal-kombat-3',
    file: 'roms/mortal-kombat-3.gen',
    core: 'genesis_plus_gx',
    title: 'Mortal Kombat 3',
    nick: 'Мортал 3',
    year: 1995,
    platform: MD,
    genre: 'Файтинг',
    players: 2,
    memory: 'Список приёмов переписывали в тетрадь на последней странице.'
  },
  {
    id: 'mortal-kombat-2',
    file: 'roms/mortal-kombat-ii.gen',
    core: 'genesis_plus_gx',
    title: 'Mortal Kombat II',
    nick: 'Мортал 2',
    year: 1994,
    platform: MD,
    genre: 'Файтинг',
    players: 2,
    memory: 'Главный спор двора: кто знает больше комбинаций.'
  },
  {
    id: 'aladdin',
    file: 'roms/disney-s-aladdin.gen',
    core: 'genesis_plus_gx',
    title: 'Aladdin',
    nick: 'Алладин',
    year: 1993,
    platform: MD,
    genre: 'Платформер',
    players: 1,
    memory: 'Яблоки кончались ровно перед боссом.'
  },
  {
    id: 'lion-king',
    file: 'roms/lion-king-the.gen',
    core: 'genesis_plus_gx',
    title: 'The Lion King',
    nick: 'Король Лев',
    year: 1994,
    platform: MD,
    genre: 'Платформер',
    players: 1,
    memory: 'Второй уровень с обезьянами не прошёл никто. Никто.'
  },
  {
    id: 'comix-zone',
    file: 'roms/comix-zone.gen',
    core: 'genesis_plus_gx',
    title: 'Comix Zone',
    nick: 'Комикс',
    year: 1995,
    platform: MD,
    genre: 'Бит-эм-ап',
    players: 1,
    memory: 'Единственная игра, где герой рвал страницы комикса руками.'
  },
  {
    id: 'earthworm-jim',
    file: 'roms/earthworm-jim.gen',
    core: 'genesis_plus_gx',
    title: 'Earthworm Jim',
    nick: 'Червяк Джим',
    year: 1994,
    platform: MD,
    genre: 'Платформер',
    players: 1,
    memory: 'Червяк в скафандре казался самым смешным героем на свете.'
  },
  {
    id: 'earthworm-jim-2',
    file: 'roms/earthworm-jim-2.gen',
    core: 'genesis_plus_gx',
    title: 'Earthworm Jim 2',
    nick: 'Червяк Джим 2',
    year: 1995,
    platform: MD,
    genre: 'Платформер',
    players: 1,
    memory: 'Уровень с подушками и кричащими щенками снился потом неделю.'
  },
  {
    id: 'battletoads-md',
    file: 'roms/battletoads.gen',
    core: 'genesis_plus_gx',
    title: 'Battletoads',
    nick: 'Жабы',
    year: 1993,
    platform: MD,
    genre: 'Бит-эм-ап',
    players: 2,
    memory: 'Уровень на байках — официальный конец детской дружбы.'
  },
  {
    id: 'battletoads-dd-md',
    file: 'roms/battletoads-and-double-dragon.gen',
    core: 'genesis_plus_gx',
    title: 'Battletoads & Double Dragon',
    nick: 'Жабы с драконами',
    year: 1993,
    platform: MD,
    genre: 'Бит-эм-ап',
    players: 2,
    memory: 'Жабы и братья Ли в одной игре — это был кроссовер мечты.'
  },
  {
    id: 'battletoads-dd-snes',
    file: 'roms/battletoads-double-dragon-the-ultimate-team.smc',
    core: 'snes9x',
    title: 'Battletoads & Double Dragon',
    nick: 'Жабы на «Супере»',
    year: 1993,
    platform: SNES,
    genre: 'Бит-эм-ап',
    players: 2,
    memory: 'На «Супер Нинтендо» картинка была заметно чище — и это обсуждали.'
  },
  {
    id: 'battlemaniacs',
    file: 'roms/battletoads-in-battlemaniacs.smc',
    core: 'snes9x',
    title: 'Battletoads in Battlemaniacs',
    nick: 'Жабы 2',
    year: 1994,
    platform: SNES,
    genre: 'Бит-эм-ап',
    players: 2,
    memory: 'Сложность, из-за которой геймпад летел в диван.'
  },
  {
    id: 'contra-hard-corps',
    file: 'roms/contra-hard-corps.gen',
    core: 'genesis_plus_gx',
    title: 'Contra: Hard Corps',
    nick: 'Контра на Сеге',
    year: 1994,
    platform: MD,
    genre: 'Стрелялка',
    players: 2,
    memory: 'Одно попадание — и ты снова на старте. Честно и беспощадно.'
  },
  {
    id: 'tmnt-hyperstone',
    file: 'roms/teenage-mutant-ninja-turtles-the-hyperstone-heist.gen',
    core: 'genesis_plus_gx',
    title: 'TMNT: The Hyperstone Heist',
    nick: 'Черепашки',
    year: 1992,
    platform: MD,
    genre: 'Бит-эм-ап',
    players: 2,
    memory: 'За Донателло всегда занимали очередь заранее.'
  },
  {
    id: 'tmnt-tournament',
    file: 'roms/teenage-mutant-hero-turtles-tournament-fighters.gen',
    core: 'genesis_plus_gx',
    title: 'TMNT: Tournament Fighters',
    nick: 'Черепашки-файтинг',
    year: 1993,
    platform: MD,
    genre: 'Файтинг',
    players: 2,
    memory: 'Мортал для тех, кому не разрешали Мортал.'
  },
  {
    id: 'dune',
    file: 'roms/dune-the-battle-for-arrakis.gen',
    core: 'genesis_plus_gx',
    title: 'Dune: The Battle for Arrakis',
    nick: 'Дюна',
    year: 1993,
    platform: MD,
    genre: 'Стратегия',
    players: 1,
    memory: 'Первая стратегия в жизни — и первый выученный английский: harvester.'
  },
  {
    id: 'prince-of-persia',
    file: 'roms/prince-of-persia.gen',
    core: 'genesis_plus_gx',
    title: 'Prince of Persia',
    nick: 'Принц Персии',
    year: 1993,
    platform: MD,
    genre: 'Платформер',
    players: 1,
    memory: 'Шипы, зеркало и час на уровень, который проходится за минуту.'
  },
  {
    id: 'jurassic-park',
    file: 'roms/jurassic-park.gen',
    core: 'genesis_plus_gx',
    title: 'Jurassic Park',
    nick: 'Парк Юрского периода',
    year: 1993,
    platform: MD,
    genre: 'Экшен',
    players: 1,
    memory: 'После фильма в видеосалоне сразу шли играть за раптора.'
  },
  {
    id: 'robocop-terminator',
    file: 'roms/robocop-versus-the-terminator.gen',
    core: 'genesis_plus_gx',
    title: 'RoboCop versus The Terminator',
    nick: 'Робокоп против Терминатора',
    year: 1993,
    platform: MD,
    genre: 'Экшен',
    players: 1,
    memory: 'Спор «кто сильнее» решался именно здесь.'
  },
  {
    id: 'robocop-3',
    file: 'roms/robocop-3.gen',
    core: 'genesis_plus_gx',
    title: 'RoboCop 3',
    nick: 'Робокоп 3',
    year: 1992,
    platform: MD,
    genre: 'Экшен',
    players: 1,
    memory: 'Ходил медленно, стрелял медленно, но был железным.'
  },
  {
    id: 'batman',
    file: 'roms/batman.gen',
    core: 'genesis_plus_gx',
    title: 'Batman',
    nick: 'Бэтмен',
    year: 1991,
    platform: MD,
    genre: 'Платформер',
    players: 1,
    memory: 'Тёмный город и музыка, от которой становилось не по себе.'
  },
  {
    id: 'batman-forever',
    file: 'roms/batman-forever.gen',
    core: 'genesis_plus_gx',
    title: 'Batman Forever',
    nick: 'Бэтмен навсегда',
    year: 1996,
    platform: MD,
    genre: 'Драка',
    players: 2,
    memory: 'Цифровые актёры вместо спрайтов — тогда это выглядело дорого.'
  },
  {
    id: 'doom-troopers',
    file: 'roms/doom-troopers-the-mutant-chronicles.gen',
    core: 'genesis_plus_gx',
    title: 'Doom Troopers',
    nick: 'Дум Труперс',
    year: 1995,
    platform: MD,
    genre: 'Стрелялка',
    players: 2,
    memory: 'Кровь, мутанты и ощущение, что играешь во «взрослое».'
  },
  {
    id: 'flintstones',
    file: 'roms/flintstones-the.gen',
    core: 'genesis_plus_gx',
    title: 'The Flintstones',
    nick: 'Флинстоуны',
    year: 1993,
    platform: MD,
    genre: 'Платформер',
    players: 1,
    memory: 'Мультик показывали днём, а вечером его же проходили.'
  },
  {
    id: 'tiny-toon',
    file: 'roms/tiny-toon-adventures.gen',
    core: 'genesis_plus_gx',
    title: 'Tiny Toon Adventures',
    nick: 'Тайни Тун',
    year: 1993,
    platform: MD,
    genre: 'Платформер',
    players: 1,
    memory: 'Русская версия с переводом от «Шедевра» — отдельный вид роскоши.'
  },
  {
    id: 'tom-and-jerry',
    file: 'roms/tom-and-jerry-frantic-antics.gen',
    core: 'genesis_plus_gx',
    title: 'Tom and Jerry: Frantic Antics',
    nick: 'Том и Джерри',
    year: 1994,
    platform: MD,
    genre: 'Платформер',
    players: 1,
    memory: 'Играли за мышь, потому что за кота было нечестно.'
  },
  {
    id: 'wwf-wrestlemania',
    file: 'roms/wwf-wrestlemania-arcade.gen',
    core: 'genesis_plus_gx',
    title: 'WWF WrestleMania: The Arcade Game',
    nick: 'Рестлинг',
    year: 1995,
    platform: MD,
    genre: 'Файтинг',
    players: 2,
    memory: 'Рестлинг по РТР в субботу — и сразу за геймпад.'
  }
];

export const romPlatforms = ['Все', NES, MD, SNES];
