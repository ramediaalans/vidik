// Сгенерировано tools/import-music.mjs — ручные правки затрёт следующий запуск.
// Сами файлы лежат в app/public/music/ и в гит не коммитятся.

export type Track = {
  id: string;
  file: string;
  artist: string;
  title: string;
  album?: string;
  year?: number;
  /** длительность в секундах */
  duration: number;
};

export const tracks: Track[] = [
  {
    id: "agata-kristi-kover-vertolet",
    file: "music/agata-kristi-kover-vertolet.mp3",
    artist: "Агата Кристи",
    title: "Ковер-вертолет",
    duration: 197
  },
  {
    id: "agata-kristi-na-tebe-kak-na-voyne",
    file: "music/agata-kristi-na-tebe-kak-na-voyne.mp3",
    artist: "Агата Кристи",
    title: "На тебе как на войне",
    duration: 242
  },
  {
    id: "andrey-gubin-malchik-brodyaga",
    file: "music/andrey-gubin-malchik-brodyaga.mp3",
    artist: "Андрей Губин",
    title: "Мальчик бродяга",
    duration: 189
  },
  {
    id: "gorodskaya-toska-pokazhi-fuck",
    file: "music/gorodskaya-toska-pokazhi-fuck.mp3",
    artist: "Городская тоска",
    title: "Покажи Fuck",
    duration: 200
  },
  {
    id: "gorodskaya-toska-feat-52-alyans-gloomyheadz-vybiraesh-ty",
    file: "music/gorodskaya-toska-feat-52-alyans-gloomyheadz-vybiraesh-ty.mp3",
    artist: "Городская тоска feat. 52 Альянс & Gloomyheadz",
    title: "Выбираешь ты?",
    album: "RAP территория",
    year: 2003,
    duration: 274
  },
  {
    id: "danko-moskovskaya-noch",
    file: "music/danko-moskovskaya-noch.mp3",
    artist: "Данко",
    title: "Московская ночь",
    duration: 258
  },
  {
    id: "demo-solnyshko",
    file: "music/demo-solnyshko.mp3",
    artist: "Демо",
    title: "Солнышко",
    duration: 260
  },
  {
    id: "diskoteka-avariya-i-d-malikov-zakolebal-ty",
    file: "music/diskoteka-avariya-i-d-malikov-zakolebal-ty.mp3",
    artist: "Дискотека авария и Д.Маликов",
    title: "Заколебал ты",
    duration: 275
  },
  {
    id: "diskoteka-avariya-i-i-kupala-kostroma",
    file: "music/diskoteka-avariya-i-i-kupala-kostroma.mp3",
    artist: "Дискотека Авария и И.Купала",
    title: "Кострома",
    duration: 183
  },
  {
    id: "ivanushki-int-begi",
    file: "music/ivanushki-int-begi.mp3",
    artist: "Иванушки Int",
    title: "Беги",
    duration: 253
  },
  {
    id: "ivanushki-int-kukla",
    file: "music/ivanushki-int-kukla.mp3",
    artist: "Иванушки Int",
    title: "Кукла",
    duration: 313
  },
  {
    id: "ivanushki-int-tuchi",
    file: "music/ivanushki-int-tuchi.mp3",
    artist: "Иванушки Int",
    title: "Тучи",
    duration: 249
  },
  {
    id: "kasta-goryachee-vremya",
    file: "music/kasta-goryachee-vremya.mp3",
    artist: "Каста",
    title: "Горячее время",
    album: "Что нам делать в Греции?",
    duration: 215
  },
  {
    id: "kasta-my-berem-eto-na-ulicah",
    file: "music/kasta-my-berem-eto-na-ulicah.mp3",
    artist: "Каста",
    title: "Мы берем это на улицах",
    album: "Громче воды,выше травы",
    duration: 209
  },
  {
    id: "kasta-radost-bitvy",
    file: "music/kasta-radost-bitvy.mp3",
    artist: "КАСТА",
    title: "Радость битвы",
    album: "ФЕНИКС",
    year: 2005,
    duration: 307
  },
  {
    id: "licey-osen",
    file: "music/licey-osen.mp3",
    artist: "Лицей",
    title: "Осень",
    duration: 267
  },
  {
    id: "lyapis-trubeckoy-golubi",
    file: "music/lyapis-trubeckoy-golubi.mp3",
    artist: "Ляпис Трубецкой",
    title: "Голуби",
    duration: 208
  },
  {
    id: "lyapis-trubeckoy-ty-kinula",
    file: "music/lyapis-trubeckoy-ty-kinula.mp3",
    artist: "Ляпис Трубецкой",
    title: "Ты кинула",
    duration: 234
  },
  {
    id: "marshal-otpuskayu",
    file: "music/marshal-otpuskayu.mp3",
    artist: "Маршал",
    title: "Отпускаю",
    duration: 226
  },
  {
    id: "mnogotochie-v-zhizni-tak-byvaet",
    file: "music/mnogotochie-v-zhizni-tak-byvaet.mp3",
    artist: "Многоточие",
    title: "В жизни так бывает",
    duration: 267
  },
  {
    id: "mnogotochie-po-radio-skazali",
    file: "music/mnogotochie-po-radio-skazali.mp3",
    artist: "Многоточие",
    title: "По радио сказали",
    duration: 243
  },
  {
    id: "mnogotochie-schemit-v-dushe-toska",
    file: "music/mnogotochie-schemit-v-dushe-toska.mp3",
    artist: "Многоточие",
    title: "Щемит в душе тоска",
    album: "Атомы сознания",
    year: 2002,
    duration: 229
  },
  {
    id: "natali-veter-s-morya",
    file: "music/natali-veter-s-morya.mp3",
    artist: "Натали",
    title: "Ветер с моря",
    duration: 222
  },
  {
    id: "neizvestnyy-ispolnitel-vse-normalno-pacany",
    file: "music/neizvestnyy-ispolnitel-vse-normalno-pacany.mp3",
    artist: "Неизвестный исполнитель",
    title: "Все нормально пацаны",
    duration: 369
  },
  {
    id: "neizvestnyy-ispolnitel-kto-stoit-za-etim-russian-version",
    file: "music/neizvestnyy-ispolnitel-kto-stoit-za-etim-russian-version.mp3",
    artist: "Неизвестный исполнитель",
    title: "Кто стоит за этим (russian version)",
    duration: 234
  },
  {
    id: "neizvestnyy-ispolnitel-nashi-lyudi",
    file: "music/neizvestnyy-ispolnitel-nashi-lyudi.mp3",
    artist: "Неизвестный исполнитель",
    title: "nashi lyudi",
    duration: 226
  },
  {
    id: "nensi-dym-sigaret-s-mentolom",
    file: "music/nensi-dym-sigaret-s-mentolom.mp3",
    artist: "Нэнси",
    title: "Дым сигарет с ментолом",
    duration: 371
  },
  {
    id: "ruki-vverh-aleshka",
    file: "music/ruki-vverh-aleshka.mp3",
    artist: "Руки вверх !",
    title: "Алешка",
    duration: 198
  },
  {
    id: "russkiy-razmer-lyubov",
    file: "music/russkiy-razmer-lyubov.mp3",
    artist: "Русский размер",
    title: "Любовь",
    duration: 267
  },
  {
    id: "strelki-vesna",
    file: "music/strelki-vesna.mp3",
    artist: "Стрелки",
    title: "Весна !",
    duration: 245
  },
  {
    id: "tanya-bulanova-ne-plach",
    file: "music/tanya-bulanova-ne-plach.mp3",
    artist: "Таня Буланова",
    title: "Не плачь",
    duration: 298
  },
  {
    id: "tehnologiya-nazhmi-na-knopku",
    file: "music/tehnologiya-nazhmi-na-knopku.mp3",
    artist: "Технология",
    title: "Нажми на кнопку",
    duration: 269
  },
  {
    id: "chizh-mitki-na-pole-tanki-grohotali",
    file: "music/chizh-mitki-na-pole-tanki-grohotali.mp3",
    artist: "Чиж & Митьки",
    title: "На поле танки грохотали",
    duration: 198
  },
  {
    id: "a-ha-take-on-me",
    file: "music/a-ha-take-on-me.mp3",
    artist: "A-Ha",
    title: "Take On Me",
    duration: 219
  },
  {
    id: "ace-of-base-lucky-love",
    file: "music/ace-of-base-lucky-love.mp3",
    artist: "Ace of base",
    title: "Lucky love",
    duration: 175
  },
  {
    id: "ace-of-base-the-sign",
    file: "music/ace-of-base-the-sign.mp3",
    artist: "Ace of base",
    title: "The sign",
    duration: 192
  },
  {
    id: "ace-of-base-wheel-of-fortune",
    file: "music/ace-of-base-wheel-of-fortune.mp3",
    artist: "Ace of base",
    title: "Wheel of fortune",
    duration: 205
  },
  {
    id: "ace-of-base-all-that-she-wants",
    file: "music/ace-of-base-all-that-she-wants.mp3",
    artist: "Ace Of Base",
    title: "All That She Wants",
    duration: 216
  },
  {
    id: "ace-of-base-happy-nation",
    file: "music/ace-of-base-happy-nation.mp3",
    artist: "Ace Of Base",
    title: "Happy Nation",
    album: "The Best Hits Of 90’s",
    duration: 246
  },
  {
    id: "alphavile-big-in-japan",
    file: "music/alphavile-big-in-japan.mp3",
    artist: "Alphavile",
    title: "Big in Japan",
    duration: 230
  },
  {
    id: "aqua-barbie-girl",
    file: "music/aqua-barbie-girl.mp3",
    artist: "AQUA",
    title: "Barbie Girl",
    duration: 195
  },
  {
    id: "baby-s-gans-challenger",
    file: "music/baby-s-gans-challenger.mp3",
    artist: "Baby's gans",
    title: "Challenger",
    duration: 318
  },
  {
    id: "baccara-yes-sir",
    file: "music/baccara-yes-sir.mp3",
    artist: "Baccara",
    title: "Yes Sir",
    duration: 193
  },
  {
    id: "bad-boys-blue-i-remember-mary",
    file: "music/bad-boys-blue-i-remember-mary.mp3",
    artist: "Bad Boys Blue",
    title: "I Remember Mary",
    duration: 454
  },
  {
    id: "bad-boys-blue-kiss-you-all-over",
    file: "music/bad-boys-blue-kiss-you-all-over.mp3",
    artist: "Bad Boys Blue",
    title: "Kiss You All Over..",
    duration: 353
  },
  {
    id: "bad-boys-blue-kisses-tears",
    file: "music/bad-boys-blue-kisses-tears.mp3",
    artist: "Bad Boys Blue",
    title: "Kisses&Tears",
    duration: 234
  },
  {
    id: "bad-boys-blue-you-re-a-woman",
    file: "music/bad-boys-blue-you-re-a-woman.mp3",
    artist: "Bad Boys Blue",
    title: "You're A Woman",
    duration: 322
  },
  {
    id: "bam-bee-bam-bam-bam",
    file: "music/bam-bee-bam-bam-bam.mp3",
    artist: "Bam Bee",
    title: "Bam bam bam",
    duration: 271
  },
  {
    id: "blue-system-i-m-the-pilot-of-your-love",
    file: "music/blue-system-i-m-the-pilot-of-your-love.mp3",
    artist: "Blue System",
    title: "I'm The Pilot Of Your Love",
    duration: 199
  },
  {
    id: "blue-system-love-me-on-the-rocks",
    file: "music/blue-system-love-me-on-the-rocks.mp3",
    artist: "Blue System",
    title: "Love Me On The Rocks",
    duration: 208
  },
  {
    id: "blue-system-nobody-makes-me-crazy",
    file: "music/blue-system-nobody-makes-me-crazy.mp3",
    artist: "Blue System",
    title: "Nobody Makes Me Crazy",
    duration: 207
  },
  {
    id: "blue-system-romeo-juliett",
    file: "music/blue-system-romeo-juliett.mp3",
    artist: "Blue System",
    title: "Romeo & Juliett",
    duration: 302
  },
  {
    id: "blue-system-sorry-little-sarah",
    file: "music/blue-system-sorry-little-sarah.mp3",
    artist: "Blue System",
    title: "Sorry Little Sarah",
    duration: 310
  },
  {
    id: "blue-systrem-she-s-a-lady",
    file: "music/blue-systrem-she-s-a-lady.mp3",
    artist: "Blue Systrem",
    title: "She's a lady",
    duration: 298
  },
  {
    id: "bokser-feat-yana-sedaya-bokser-feat-yana-sedaya-slepoy-muzyk",
    file: "music/bokser-feat-yana-sedaya-bokser-feat-yana-sedaya-slepoy-muzyk.mp3",
    artist: "Bokser Feat Yana Sedaya",
    title: "Боксёр Feat Яна Седая - Слепой Музыкант",
    year: 2004,
    duration: 308
  },
  {
    id: "boney-m-daddy-cool",
    file: "music/boney-m-daddy-cool.mp3",
    artist: "Boney M",
    title: "Daddy cool",
    duration: 231
  },
  {
    id: "boney-m-gotta-go-home",
    file: "music/boney-m-gotta-go-home.mp3",
    artist: "Boney M.",
    title: "Gotta Go Home",
    duration: 227
  },
  {
    id: "boney-m-ma-baker",
    file: "music/boney-m-ma-baker.mp3",
    artist: "Boney M.",
    title: "Ma Baker",
    duration: 277
  },
  {
    id: "boney-m-rasputin",
    file: "music/boney-m-rasputin.mp3",
    artist: "Boney M.",
    title: "Rasputin",
    duration: 352
  },
  {
    id: "boney-m-sunny",
    file: "music/boney-m-sunny.mp3",
    artist: "Boney M.",
    title: "Sunny",
    duration: 244
  },
  {
    id: "c-c-catch-i-van-lose-my-heart-tonight",
    file: "music/c-c-catch-i-van-lose-my-heart-tonight.mp3",
    artist: "C. C. Catch",
    title: "I van lose my heart tonight",
    duration: 209
  },
  {
    id: "c-c-catch-one-night-enough-ext-vrs",
    file: "music/c-c-catch-one-night-enough-ext-vrs.mp3",
    artist: "C. C. Catch",
    title: "One Night Enough (Ext vrs)",
    duration: 313
  },
  {
    id: "c-c-catch-you-can-t-run-away-from-it-2",
    file: "music/c-c-catch-you-can-t-run-away-from-it-2.mp3",
    artist: "C. C. Catch",
    title: "You Can't Run Away From It",
    duration: 193
  },
  {
    id: "c-c-catch-i-can-lose-my-heart-tonight",
    file: "music/c-c-catch-i-can-lose-my-heart-tonight.mp3",
    artist: "C.C. Catch",
    title: "I Can Lose My Heart Tonight",
    album: "Super Disco Hits",
    duration: 354
  },
  {
    id: "c-c-catch-good-guys-only-win-in-movies",
    file: "music/c-c-catch-good-guys-only-win-in-movies.mp3",
    artist: "C.C.Catch",
    title: "Good Guys Only Win In Movies",
    duration: 342
  },
  {
    id: "c-c-catch-heaven-and-hell",
    file: "music/c-c-catch-heaven-and-hell.mp3",
    artist: "C.C.Catch",
    title: "Heaven And Hell",
    duration: 222
  },
  {
    id: "c-c-catch-like-a-hurricane",
    file: "music/c-c-catch-like-a-hurricane.mp3",
    artist: "C.C.Catch",
    title: "Like A Hurricane",
    duration: 194
  },
  {
    id: "c-c-catch-midnight-gambler",
    file: "music/c-c-catch-midnight-gambler.mp3",
    artist: "C.C.Catch",
    title: "Midnight Gambler",
    duration: 261
  },
  {
    id: "c-c-catch-strangers-by-night",
    file: "music/c-c-catch-strangers-by-night.mp3",
    artist: "C.C.Catch",
    title: "Strangers By Night",
    duration: 342
  },
  {
    id: "c-c-catch-tears-won-t-wash-away",
    file: "music/c-c-catch-tears-won-t-wash-away.mp3",
    artist: "C.C.Catch",
    title: "Tears Won't Wash Away",
    duration: 260
  },
  {
    id: "c-c-catch-you-can-t-run-away-from-it",
    file: "music/c-c-catch-you-can-t-run-away-from-it.mp3",
    artist: "C.C.Catch",
    title: "You Can't Run Away From It",
    duration: 193
  },
  {
    id: "c-c-catch-cause-you-are-young",
    file: "music/c-c-catch-cause-you-are-young.mp3",
    artist: "C.C.CATCH",
    title: "Cause you are young",
    duration: 282
  },
  {
    id: "captain-hollywood-more-mo",
    file: "music/captain-hollywood-more-mo.mp3",
    artist: "Captain Hollywood",
    title: "More & mo",
    duration: 251
  },
  {
    id: "captain-jack-dream-a-dream",
    file: "music/captain-jack-dream-a-dream.mp3",
    artist: "Captain Jack",
    title: "Dream a dream",
    duration: 216
  },
  {
    id: "car-man-proschay-london",
    file: "music/car-man-proschay-london.mp3",
    artist: "Car Man",
    title: "Прощай, Лондон",
    album: "Вокруг света",
    year: 1991,
    duration: 331
  },
  {
    id: "car-man-parizh",
    file: "music/car-man-parizh.mp3",
    artist: "Car-Man",
    title: "Париж",
    album: "Вокруг Света",
    year: 1991,
    duration: 292
  },
  {
    id: "ce-mc-it-s-a-rainy-day",
    file: "music/ce-mc-it-s-a-rainy-day.mp3",
    artist: "Ce MC",
    title: "It's a rainy day",
    duration: 250
  },
  {
    id: "culture-beat-crying-in-the",
    file: "music/culture-beat-crying-in-the.mp3",
    artist: "Culture beat",
    title: "Crying in the",
    duration: 336
  },
  {
    id: "culture-beat-mr-vain",
    file: "music/culture-beat-mr-vain.mp3",
    artist: "Culture beat",
    title: "Mr.Vain",
    duration: 255
  },
  {
    id: "desireless-voyage",
    file: "music/desireless-voyage.mp3",
    artist: "Dеsireless",
    title: "Voyage",
    duration: 362
  },
  {
    id: "dj-bobo-love-is-all-around",
    file: "music/dj-bobo-love-is-all-around.mp3",
    artist: "Dj Bobo",
    title: "Love is all around",
    duration: 329
  },
  {
    id: "dr-alban-it-s-my-life",
    file: "music/dr-alban-it-s-my-life.mp3",
    artist: "Dr.Alban",
    title: "It's my life",
    duration: 274
  },
  {
    id: "dr-alban-reggae-gone-ragga",
    file: "music/dr-alban-reggae-gone-ragga.mp3",
    artist: "Dr.Alban",
    title: "Reggae Gone Ragga",
    album: "The Best Hits Of 90’s",
    duration: 242
  },
  {
    id: "dschinghis-khan-dschinghis-khan",
    file: "music/dschinghis-khan-dschinghis-khan.mp3",
    artist: "Dschinghis Khan",
    title: "Dschinghis Khan",
    duration: 182
  },
  {
    id: "dschinghis-khan-moskau",
    file: "music/dschinghis-khan-moskau.mp3",
    artist: "Dschinghis Khan",
    title: "Moskau",
    duration: 274
  },
  {
    id: "e-type-set-the-world-on-fire",
    file: "music/e-type-set-the-world-on-fire.mp3",
    artist: "E-type",
    title: "Set the world on fire",
    duration: 224
  },
  {
    id: "e-type-russian-lullaby",
    file: "music/e-type-russian-lullaby.mp3",
    artist: "E-Type",
    title: "Russian lullaby",
    duration: 191
  },
  {
    id: "eddy-huntington-physical-attraction",
    file: "music/eddy-huntington-physical-attraction.mp3",
    artist: "Eddy Huntington",
    title: "Physical attraction",
    duration: 255
  },
  {
    id: "eddy-huntington-u-s-s-r",
    file: "music/eddy-huntington-u-s-s-r.mp3",
    artist: "Eddy Huntington",
    title: "U.S.S.R.",
    duration: 351
  },
  {
    id: "erotic-max-don-t-have-sex-white-your",
    file: "music/erotic-max-don-t-have-sex-white-your.mp3",
    artist: "Erotic",
    title: "Max don't have sex white your",
    duration: 210
  },
  {
    id: "eurythmics-sweet-dreams",
    file: "music/eurythmics-sweet-dreams.mp3",
    artist: "Eurythmics",
    title: "Sweet Dreams",
    album: "Romantic Dreams",
    duration: 292
  },
  {
    id: "face2face-koshka",
    file: "music/face2face-koshka.mp3",
    artist: "Face2Face",
    title: "Кошка",
    duration: 159
  },
  {
    id: "fancy-flames-of-love-2",
    file: "music/fancy-flames-of-love-2.mp3",
    artist: "Fancy",
    title: "Flames of love",
    duration: 232
  },
  {
    id: "fancy-flames-of-love",
    file: "music/fancy-flames-of-love.mp3",
    artist: "Fancy",
    title: "Flames Of Love",
    duration: 200
  },
  {
    id: "fun-factory-close-to-you",
    file: "music/fun-factory-close-to-you.mp3",
    artist: "Fun Factory",
    title: "Close to you",
    duration: 276
  },
  {
    id: "fun-factory-sha-la-la-la",
    file: "music/fun-factory-sha-la-la-la.mp3",
    artist: "Fun Factory",
    title: "Sha la la la",
    duration: 211
  },
  {
    id: "fun-fun-happy-station",
    file: "music/fun-fun-happy-station.mp3",
    artist: "Fun Fun",
    title: "Happy station",
    duration: 353
  },
  {
    id: "gazevo-lunatic",
    file: "music/gazevo-lunatic.mp3",
    artist: "Gazevo",
    title: "Lunatic",
    duration: 236
  },
  {
    id: "gina-t-fantasy-boy",
    file: "music/gina-t-fantasy-boy.mp3",
    artist: "Gina T",
    title: "Fantasy boy",
    duration: 417
  },
  {
    id: "gina-t-tokyo-by-nighty",
    file: "music/gina-t-tokyo-by-nighty.mp3",
    artist: "Gina T",
    title: "Tokyo by nighty",
    duration: 221
  },
  {
    id: "haddaway-life",
    file: "music/haddaway-life.mp3",
    artist: "Haddaway",
    title: "Life",
    duration: 256
  },
  {
    id: "haddaway-what-is-love",
    file: "music/haddaway-what-is-love.mp3",
    artist: "Haddaway",
    title: "What is love",
    duration: 247
  },
  {
    id: "heath-hunter-walking-on-clouds",
    file: "music/heath-hunter-walking-on-clouds.mp3",
    artist: "Heath Hunter",
    title: "Walking on clouds",
    duration: 326
  },
  {
    id: "hi-fi-ne-dano",
    file: "music/hi-fi-ne-dano.mp3",
    artist: "Hi-Fi",
    title: "Не дано",
    duration: 214
  },
  {
    id: "jam-7-spoon-right-in-the-night",
    file: "music/jam-7-spoon-right-in-the-night.mp3",
    artist: "Jam 7 Spoon",
    title: "Right in the night",
    duration: 227
  },
  {
    id: "jason-donovan-sealed-with-a-kiss",
    file: "music/jason-donovan-sealed-with-a-kiss.mp3",
    artist: "Jason Donovan",
    title: "Sealed With A Kiss",
    duration: 147
  },
  {
    id: "joy-touch-by-touch-2",
    file: "music/joy-touch-by-touch-2.mp3",
    artist: "Joy",
    title: "Touch by touch",
    duration: 222
  },
  {
    id: "joy-touch-by-touch",
    file: "music/joy-touch-by-touch.mp3",
    artist: "Joy",
    title: "Touch By Touch",
    duration: 220
  },
  {
    id: "joy-valerie",
    file: "music/joy-valerie.mp3",
    artist: "Joy",
    title: "Valerie",
    duration: 247
  },
  {
    id: "joy-valery",
    file: "music/joy-valery.mp3",
    artist: "Joy",
    title: "Valery",
    duration: 248
  },
  {
    id: "kaoma-lambada",
    file: "music/kaoma-lambada.mp3",
    artist: "Kaoma",
    title: "Lambada",
    duration: 207
  },
  {
    id: "kb-caps-catch-me-now-in-falling",
    file: "music/kb-caps-catch-me-now-in-falling.mp3",
    artist: "KB Caps",
    title: "Catch Me Now In Falling",
    duration: 388
  },
  {
    id: "ken-lazio-glasse-man",
    file: "music/ken-lazio-glasse-man.mp3",
    artist: "Ken Lazio",
    title: "Glasse man",
    duration: 254
  },
  {
    id: "key-west-sorry-sorry-sorry",
    file: "music/key-west-sorry-sorry-sorry.mp3",
    artist: "Key West",
    title: "Sorry sorry sorry",
    duration: 208
  },
  {
    id: "krec-pod-stuk-koles-ft-sad-nevskiy-bit",
    file: "music/krec-pod-stuk-koles-ft-sad-nevskiy-bit.mp3",
    artist: "Krec",
    title: "Под Стук Колес Ft Sad (Невский Бит)",
    year: 2004,
    duration: 275
  },
  {
    id: "la-bouche-be-my-love",
    file: "music/la-bouche-be-my-love.mp3",
    artist: "La bouche",
    title: "Be my love",
    duration: 241
  },
  {
    id: "la-bouche-sweet-dreams",
    file: "music/la-bouche-sweet-dreams.mp3",
    artist: "La bouche",
    title: "Sweet dreams",
    duration: 222
  },
  {
    id: "laid-back-sunshine-reggae",
    file: "music/laid-back-sunshine-reggae.mp3",
    artist: "Laid Back",
    title: "Sunshine Reggae",
    duration: 246
  },
  {
    id: "laura-branigan-self-control",
    file: "music/laura-branigan-self-control.mp3",
    artist: "Laura Branigan",
    title: "Self control",
    duration: 245
  },
  {
    id: "lian-ross-say-you-ll-never",
    file: "music/lian-ross-say-you-ll-never.mp3",
    artist: "Lian Ross",
    title: "Say You'll Never",
    duration: 379
  },
  {
    id: "linda-jo-rizzo-heartflash",
    file: "music/linda-jo-rizzo-heartflash.mp3",
    artist: "Linda jo Rizzo",
    title: "Heartflash",
    duration: 359
  },
  {
    id: "lion-ross-say-you-ll-never-disco-mix",
    file: "music/lion-ross-say-you-ll-never-disco-mix.mp3",
    artist: "Lion Ross",
    title: "Say You'll Never (Disco mix)",
    duration: 394
  },
  {
    id: "london-beat-i-ve-been",
    file: "music/london-beat-i-ve-been.mp3",
    artist: "London Beat",
    title: "I've Been..",
    duration: 220
  },
  {
    id: "masterboy-feel-of-the-night",
    file: "music/masterboy-feel-of-the-night.mp3",
    artist: "Masterboy",
    title: "Feel of the night",
    duration: 198
  },
  {
    id: "masterboy-generation-of-love",
    file: "music/masterboy-generation-of-love.mp3",
    artist: "Masterboy",
    title: "Generation of love",
    duration: 220
  },
  {
    id: "mauro-buona-sera-ciao",
    file: "music/mauro-buona-sera-ciao.mp3",
    artist: "Mauro",
    title: "Buona sera ciao",
    duration: 230
  },
  {
    id: "maxx-get-a-way",
    file: "music/maxx-get-a-way.mp3",
    artist: "Maxx",
    title: "Get a way",
    duration: 225
  },
  {
    id: "me-my-dub-i-dub",
    file: "music/me-my-dub-i-dub.mp3",
    artist: "Me & my",
    title: "Dub i dub",
    duration: 201
  },
  {
    id: "mike-mareen-agent-of-libert",
    file: "music/mike-mareen-agent-of-libert.mp3",
    artist: "Mike Mareen",
    title: "Agent of libert",
    duration: 263
  },
  {
    id: "mike-mareen-let-s-start-now",
    file: "music/mike-mareen-let-s-start-now.mp3",
    artist: "Mike Mareen",
    title: "Let's start now",
    duration: 445
  },
  {
    id: "modern-talking-brother-lovie",
    file: "music/modern-talking-brother-lovie.mp3",
    artist: "Modern talking",
    title: "Brother lovie",
    duration: 215
  },
  {
    id: "modern-talking-brother-louie",
    file: "music/modern-talking-brother-louie.mp3",
    artist: "Modern Talking",
    title: "Brother Louie",
    duration: 218
  },
  {
    id: "modern-talking-chery-chery-lady",
    file: "music/modern-talking-chery-chery-lady.mp3",
    artist: "Modern Talking",
    title: "Chery Chery Lady",
    duration: 224
  },
  {
    id: "modern-talking-in-100-years",
    file: "music/modern-talking-in-100-years.mp3",
    artist: "Modern Talking",
    title: "In 100 Years",
    duration: 235
  },
  {
    id: "modern-talking-lady-lai",
    file: "music/modern-talking-lady-lai.mp3",
    artist: "Modern Talking",
    title: "Lady Lai",
    duration: 295
  },
  {
    id: "modern-talking-mona-lisa",
    file: "music/modern-talking-mona-lisa.mp3",
    artist: "Modern Talking",
    title: "Mona Lisa",
    duration: 234
  },
  {
    id: "modern-talking-sweet-little-sheila",
    file: "music/modern-talking-sweet-little-sheila.mp3",
    artist: "Modern Talking",
    title: "Sweet Little Sheila",
    duration: 185
  },
  {
    id: "modern-talking-you-re-my-heart-you-re-my-sou",
    file: "music/modern-talking-you-re-my-heart-you-re-my-sou.mp3",
    artist: "Modern Talking",
    title: "You're My Heart,You're My Sou",
    duration: 331
  },
  {
    id: "modo-1-2-polizey",
    file: "music/modo-1-2-polizey.mp3",
    artist: "Modo",
    title: "1,2 polizey",
    duration: 217
  },
  {
    id: "monte-kristo-lady-valentine",
    file: "music/monte-kristo-lady-valentine.mp3",
    artist: "Monte Kristo",
    title: "Lady Valentine",
    duration: 312
  },
  {
    id: "mr-maloy-budu-pogibat-1992",
    file: "music/mr-maloy-budu-pogibat-1992.mp3",
    artist: "Mr Maloy",
    title: "Budu Pogibat 1992",
    album: "Maloy-Best",
    duration: 134
  },
  {
    id: "mr-maloy-pifpaf-1994",
    file: "music/mr-maloy-pifpaf-1994.mp3",
    artist: "Mr Maloy",
    title: "Pifpaf 1994",
    album: "Maloy-Best",
    duration: 192
  },
  {
    id: "mr-president-coco-jambo",
    file: "music/mr-president-coco-jambo.mp3",
    artist: "Mr.President",
    title: "Coco jambo",
    duration: 219
  },
  {
    id: "mr-zivago-little-russian",
    file: "music/mr-zivago-little-russian.mp3",
    artist: "Mr.Zivago",
    title: "Little russian",
    duration: 280
  },
  {
    id: "no-mercy-plase-don-t-go",
    file: "music/no-mercy-plase-don-t-go.mp3",
    artist: "No mercy",
    title: "Plase don't go",
    duration: 242
  },
  {
    id: "o-k-o-k",
    file: "music/o-k-o-k.mp3",
    artist: "O'K",
    title: "O'k",
    duration: 219
  },
  {
    id: "opus-life-is-life",
    file: "music/opus-life-is-life.mp3",
    artist: "Opus",
    title: "Life Is Life",
    duration: 246
  },
  {
    id: "ottawan-d-i-s-c-o",
    file: "music/ottawan-d-i-s-c-o.mp3",
    artist: "Ottawan",
    title: "D.I.S.C.O.",
    duration: 293
  },
  {
    id: "ottawan-hands-up",
    file: "music/ottawan-hands-up.mp3",
    artist: "Ottawan",
    title: "Hands Up",
    duration: 280
  },
  {
    id: "pam-n-pat-to-be-superman",
    file: "music/pam-n-pat-to-be-superman.mp3",
    artist: "Pam'n'Pat",
    title: "To be superman",
    duration: 263
  },
  {
    id: "pandera-summer-feeling",
    file: "music/pandera-summer-feeling.mp3",
    artist: "Pandera",
    title: "Summer feeling",
    duration: 239
  },
  {
    id: "patty-ryan-you-re-my-love",
    file: "music/patty-ryan-you-re-my-love.mp3",
    artist: "Patty Ryan",
    title: "You're my love",
    duration: 243
  },
  {
    id: "pet-shop-boys-it-s-a-sin",
    file: "music/pet-shop-boys-it-s-a-sin.mp3",
    artist: "Pet Shop Boys",
    title: "It's A Sin",
    duration: 249
  },
  {
    id: "radiorama-yeti",
    file: "music/radiorama-yeti.mp3",
    artist: "Radiorama",
    title: "Yeti",
    duration: 214
  },
  {
    id: "radiorama-yeti-2",
    file: "music/radiorama-yeti-2.mp3",
    artist: "Radiorama",
    title: "Yeti",
    duration: 346
  },
  {
    id: "rednex-cotton-eye-joe",
    file: "music/rednex-cotton-eye-joe.mp3",
    artist: "Rednex",
    title: "Cotton-Eye-Joe",
    duration: 190
  },
  {
    id: "roger-meno-what-my-heart-wanna-say",
    file: "music/roger-meno-what-my-heart-wanna-say.mp3",
    artist: "Roger Meno",
    title: "What my heart wanna say",
    duration: 227
  },
  {
    id: "rose-magic-carlion",
    file: "music/rose-magic-carlion.mp3",
    artist: "Rose",
    title: "Magic carlion",
    duration: 335
  },
  {
    id: "sabrina-boys",
    file: "music/sabrina-boys.mp3",
    artist: "Sabrina",
    title: "Boys",
    duration: 186
  },
  {
    id: "sabrina-boys-2",
    file: "music/sabrina-boys-2.mp3",
    artist: "Sabrina",
    title: "Boys",
    duration: 231
  },
  {
    id: "samanta-fox-touch-me",
    file: "music/samanta-fox-touch-me.mp3",
    artist: "Samanta Fox",
    title: "Touch Me",
    duration: 220
  },
  {
    id: "samira-it-was-him",
    file: "music/samira-it-was-him.mp3",
    artist: "Samira",
    title: "It Was Him",
    duration: 223
  },
  {
    id: "sandra-around-my-heart-2",
    file: "music/sandra-around-my-heart-2.mp3",
    artist: "Sandra",
    title: "Around my heart",
    duration: 223
  },
  {
    id: "sandra-around-my-heart",
    file: "music/sandra-around-my-heart.mp3",
    artist: "Sandra",
    title: "Around My Heart",
    duration: 225
  },
  {
    id: "saphir-shot-in-the-night",
    file: "music/saphir-shot-in-the-night.mp3",
    artist: "Saphir",
    title: "Shot in the night",
    duration: 263
  },
  {
    id: "savage-goodbye",
    file: "music/savage-goodbye.mp3",
    artist: "Savage",
    title: "Goodbye",
    duration: 279
  },
  {
    id: "savage-only-you",
    file: "music/savage-only-you.mp3",
    artist: "Savage",
    title: "Only you",
    duration: 220
  },
  {
    id: "secret-service-ten-o-clock-postman",
    file: "music/secret-service-ten-o-clock-postman.mp3",
    artist: "Secret Service",
    title: "Ten O'Clock Postman",
    duration: 217
  },
  {
    id: "shocking-blue-venus",
    file: "music/shocking-blue-venus.mp3",
    artist: "Shocking Blue",
    title: "Venus",
    duration: 182
  },
  {
    id: "silent-circle-touch-in-the-night",
    file: "music/silent-circle-touch-in-the-night.mp3",
    artist: "Silent Circle",
    title: "Touch In The Night",
    duration: 369
  },
  {
    id: "silent-circle-touch-in-the-night-2",
    file: "music/silent-circle-touch-in-the-night-2.mp3",
    artist: "Silent CIrcle",
    title: "Touch in the night",
    duration: 318
  },
  {
    id: "sin-with-sebastian-shut-up",
    file: "music/sin-with-sebastian-shut-up.mp3",
    artist: "Sin With Sebastian",
    title: "Shut Up",
    duration: 220
  },
  {
    id: "snap-the-power",
    file: "music/snap-the-power.mp3",
    artist: "Snap",
    title: "The power",
    duration: 228
  },
  {
    id: "snap-the-power-2",
    file: "music/snap-the-power-2.mp3",
    artist: "Snap!",
    title: "The Power",
    album: "The Best Hits Of 90’s",
    duration: 220
  },
  {
    id: "solid-base-this-is-how-we-do-it",
    file: "music/solid-base-this-is-how-we-do-it.mp3",
    artist: "Solid Base",
    title: "This is how we do it",
    duration: 264
  },
  {
    id: "tiggy-abracadabra",
    file: "music/tiggy-abracadabra.mp3",
    artist: "Tiggy",
    title: "Abracadabra",
    duration: 239
  },
  {
    id: "tony-esposito-kalimba-de-luna",
    file: "music/tony-esposito-kalimba-de-luna.mp3",
    artist: "Tony Esposito",
    title: "Kalimba De Luna",
    duration: 224
  },
  {
    id: "u96-heaven",
    file: "music/u96-heaven.mp3",
    artist: "U96",
    title: "Heaven",
    duration: 219
  },
  {
    id: "unlimeted-no-limits",
    file: "music/unlimeted-no-limits.mp3",
    artist: "unlimeted",
    title: "No limits",
    duration: 211
  },
  {
    id: "vengaboys-kiss",
    file: "music/vengaboys-kiss.mp3",
    artist: "Vengaboys",
    title: "Kiss",
    duration: 213
  },
  {
    id: "yaki-da-i-saw-you-dancing",
    file: "music/yaki-da-i-saw-you-dancing.mp3",
    artist: "Yaki-da",
    title: "I saw you dancing",
    duration: 165
  }
];
