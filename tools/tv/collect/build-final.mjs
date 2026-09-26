// Сборка итогового пула контента под сетку 3 каналов × 3 дня.
import fs from 'node:fs';

const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const picked = read('tools/tv/collect/picked.json');
const picked2 = read('tools/tv/collect/picked2.json');
const extra = read('tools/tv/collect/extra.json');
const vib = read('tools/tv/collect/vibix-resolved.json');

const byKey = new Map();
for (const r of picked) byKey.set(r.key, r.take);
for (const r of picked2) if (r.take.length) byKey.set(r.key, r.take);
const vibByKey = new Map(vib.map((v) => [v.key, v]));

// Ручные переопределения — автоподбор взял не то (ремейки, не та передача, 18+)
const MANUAL = {
  'c1.mult.nupogodi': [
    { p: 'youtube', id: 'e7AhYRhfhzw', dur: 540, t: 'Ну, погоди! — 1 выпуск (1969)', up: '2018-01-08' },
    { p: 'rutube', id: '8d6531c3f50272910be2709877cb5a7e', dur: 600, t: 'Ну, погоди! — выпуск №3', up: '2024-11-06' },
    { p: 'rutube', id: '87cc20f4a2b82dbdc90717bea68d4690', dur: 600, t: 'Ну, погоди! — 14 выпуск', up: '2025-02-07' },
    { p: 'youtube', id: 'PAe-51_72AQ', dur: 540, t: 'Ну, погоди! — 8 выпуск', up: '2016-11-29' },
  ],
  'c1.utro.zvezda': [
    { p: 'rutube', id: '9c9e41ce65a91e9c0ff236fa53183a5d', dur: 2760, t: '«Утренняя звезда — 95» (1995)', up: '2023-12-24' },
    { p: 'youtube', id: 'PF5m0U16bBM', dur: 2520, t: 'Утренняя звезда (ОРТ, 1995)', up: '2019-03-22' },
    { p: 'rutube', id: '4c9082ae83b586d0cd37f5a10fdf52bc', dur: 420, t: '«Утренняя звезда», 1994', up: '2023-12-11' },
  ],
  'c1.prime.ugadaymelodiyu': [
    { p: 'youtube', id: 'A7psDJ3h4Sk', dur: 1380, t: 'Угадай мелодию (30.01.1996)', up: '2017-09-19' },
    { p: 'youtube', id: 'EgsGfsWgiQ8', dur: 2340, t: 'Угадай мелодию (01.01.1996)', up: '2017-10-26' },
    { p: 'youtube', id: 'BqWeejxeyTo', dur: 1380, t: 'Угадай мелодию (26.02.1996)', up: '2017-09-26' },
  ],
  'c2.rock.nonstop': [
    { p: 'rutube', id: 'cf7481fc2feddd74c3db9d7d04a10d82', dur: 10980, t: 'КЛИПЫ 90-х — сборник видеоклипов', up: '2022-04-10' },
    { p: 'rutube', id: '1c4b1243e6582d034cf9df8f64af8ba0', dur: 9420, t: 'Супер-дискотека 90-х — лучшие хиты', up: '2023-08-02' },
    { p: 'rutube', id: 'c365bb93dd5577cd05a0e41ef85abf96', dur: 8220, t: 'Топ русских хитов 90-х', up: '2023-03-02' },
  ],
};
for (const [key, arr] of Object.entries(MANUAL)) byKey.set(key, arr);

// ссылка на найденный ролик: k('c1.mult.nupogodi', 0)
function k(key, idx = 0) {
  const arr = byKey.get(key);
  if (!arr || !arr[idx]) throw new Error(`нет ${key}[${idx}]`);
  const r = arr[idx];
  return { provider: r.p, id: r.id, dur: r.dur, title: r.t, up: r.up, src: key };
}
function x(group, idx = 0) {
  const r = extra[group]?.[idx];
  if (!r) throw new Error(`нет extra ${group}[${idx}]`);
  return { provider: r.p, id: r.id, dur: r.dur, title: r.t, up: r.up, src: `extra.${group}` };
}
// Vibix: v('c3.big.matrica') или v('c1.disney.utinye', 1, 2) — сезон/серия
function v(key, season, episode) {
  const r = vibByKey.get(key);
  if (!r) throw new Error(`нет vibix ${key}`);
  const o = { provider: 'vibix', id: r.playerId, kp: r.kp, dur: r.dur ? r.dur * 60 : null, title: `${r.name} (${r.year})`, up: r.up, src: key, mediaType: r.dataType === 'serial' ? 'episode' : 'movie' };
  if (season) { o.season = season; o.episode = episode; o.title += ` — ${season}×${String(episode).padStart(2, '0')}`; }
  return o;
}
const TC = { provider: 'generated', id: 'testcard', dur: 10800, title: 'Настроечная таблица УЭИТ + 1000 Гц', src: 'generated' };

const S = (at, label, assets, kind = 'program') => ({ at, label, kind, assets });

const pool = {
  meta: {
    generated: new Date().toISOString().slice(0, 10),
    timezone: 'UTC+3',
    rotationEpoch: '2026-01-01',
    note: 'Каркас часов статичен, меняется только наполнение. Внутри блока ассеты крутятся по кругу до следующего блока.'
  },
  interstitials: {
    ads: [k('x.ad.sbornik', 0), k('x.ad.sbornik', 2), k('x.ad.invite', 0), k('x.ad.invite', 1), k('x.ad.mmm', 0), k('x.ad.mmm', 1), k('x.ad.mmm', 2), k('x.ad.imperial', 0), k('x.ad.imperial', 1), k('x.ad.imperial', 2)],
    idents: [k('x.id.ort', 0), k('x.id.ort', 1), k('x.id.rtr', 0), k('x.id.rtr', 1), k('x.id.vid', 0), k('x.id.vid', 1), k('x.id.tv6', 0), k('x.id.tv6', 1)],
    vhs: [k('x.id.trailer', 0), k('x.id.trailer', 2), k('x.id.videosalon', 0), k('x.id.do16', 0)]
  },
  channels: {
    pervaya: {
      title: 'Первая кнопка',
      A: [
        S('06:00', 'Утренние мультфильмы', [k('c1.mult.nupogodi', 0), k('c1.mult.nupogodi', 1), k('c1.mult.nupogodi', 2), k('c1.mult.nupogodi', 3)]),
        S('07:00', 'Утренний канал: «Утренняя звезда»', [x('utro95', 0), k('c1.utro.pochta', 0)]),
        S('08:30', 'Утреннее кино: «Гостья из будущего»', [v('c1.kino.gostya', 1, 1), v('c1.kino.gostya', 1, 2)]),
        S('10:00', 'Теленовелла: «Санта-Барбара»', [k('c1.nov.santabarbara', 0), k('c1.nov.santabarbara', 1), k('c1.nov.santabarbara', 2)]),
        S('12:00', 'Телеигра: «Своя игра»', [k('c1.igra.svoyaigra', 0)]),
        S('13:00', '«Сам себе режиссёр»', [k('c1.fam.samsebe', 0)]),
        S('14:00', 'Час Супонева: «Зов джунглей»', [k('c1.sup.zovdzhungley', 0), k('c1.sup.zovdzhungley', 1)]),
        S('15:00', '«Звёздный час»', [k('c1.sup.zvezdnychas', 0)]),
        S('16:00', 'Disney Club: «Утиные истории»', [v('c1.disney.utinye', 1, 1), v('c1.disney.utinye', 1, 2), v('c1.disney.utinye', 1, 3)]),
        S('17:30', '«До 16 и старше»', [k('c1.teen.do16', 0)]),
        S('18:30', '«Любовь с первого взгляда»', [k('c1.show.lyubov', 0), k('c1.show.lyubov', 1)]),
        S('19:30', 'Капитал-шоу «Поле чудес»', [k('c1.prime.polechudes', 0)]),
        S('20:45', '«Спокойной ночи, малыши!»', [k('c1.anchor.spokoynoy', 0)], 'interstitial'),
        S('21:00', 'Программа «Время»', [k('c1.anchor.vremya', 1)]),
        S('21:35', 'Большое вечернее кино', [v('c1.eve.odin-doma2')]),
        S('23:30', '«Городок»', [k('c1.humor.gorodok', 0), k('c1.humor.gorodok', 1)]),
        S('00:30', '«МузОБОЗ» и клипы 90-х', [k('c1.night.muzoboz', 0), k('c1.night.klipy', 0)]),
        S('03:00', 'Техническая пауза', [TC], 'technical')
      ],
      B: [
        S('06:00', 'Утренние мультфильмы', [k('c1.mult.winni', 0), k('c1.mult.winni', 2), k('c1.mult.winni', 1), k('c1.mult.bremen', 1)]),
        S('07:00', 'Утренний канал', [k('c1.utro.zvezda', 1), k('c1.utro.pochta', 1)]),
        S('08:30', 'Утреннее кино: «Приключения Электроника»', [v('c1.kino.elektronik', 1, 1), v('c1.kino.elektronik', 1, 2)]),
        S('10:00', 'Теленовелла: «Богатые тоже плачут»', [k('c1.nov.bogatye', 3), k('c1.nov.bogatye', 0), k('c1.nov.bogatye', 1)]),
        S('12:00', '«Что? Где? Когда?»', [k('c1.igra.chgk', 0)]),
        S('13:00', '«Устами младенца»', [k('c1.fam.ustami', 1)]),
        S('14:00', 'Час Супонева: «Зов джунглей»', [k('c1.sup.zovdzhungley', 2), k('c1.sup.zovdzhungley', 3)]),
        S('15:00', '«Звёздный час»', [k('c1.sup.zvezdnychas', 1)]),
        S('16:00', 'Disney Club: «Чип и Дейл»', [v('c1.disney.chipdale', 1, 1), v('c1.disney.chipdale', 1, 2), v('c1.disney.chipdale', 1, 3)]),
        S('17:30', '«Там-Там новости»', [x('tamtam', 0), k('c1.teen.do16', 1)]),
        S('18:30', '«Любовь с первого взгляда»', [k('c1.show.lyubov', 2), k('c1.show.lyubov', 3)]),
        S('19:30', '«Угадай мелодию»', [k('c1.prime.ugadaymelodiyu', 0)]),
        S('20:45', '«Спокойной ночи, малыши!»', [k('c1.anchor.spokoynoy', 2)], 'interstitial'),
        S('21:00', 'Программа «Время»', [k('c1.anchor.vremya', 2)]),
        S('21:35', 'Большое вечернее кино', [v('c1.eve.maska')]),
        S('23:30', '«Маски-шоу»', [k('c1.humor.maskishow', 0), k('c1.humor.maskishow', 1), k('c1.humor.maskishow', 2)]),
        S('00:30', '«МузОБОЗ» и клипы 90-х', [k('c1.night.muzoboz', 2), k('c1.night.klipy', 1)]),
        S('03:00', 'Техническая пауза', [TC], 'technical')
      ],
      C: [
        S('06:00', 'Утренние мультфильмы', [k('c1.mult.leopold', 0), k('c1.mult.leopold', 1), k('c1.mult.leopold', 2), k('c1.mult.leopold', 3)]),
        S('07:00', 'Утренний канал: «Утренняя почта»', [k('c1.utro.pochta', 0), k('c1.utro.zvezda', 2)]),
        S('08:30', 'Утреннее кино: «Петров и Васечкин»', [k('c1.kino.petrov', 0), k('c1.kino.petrov', 1)]),
        S('10:00', 'Теленовелла: «Дикая Роза»', [v('c1.nov.dikayaroza', 1, 1), v('c1.nov.dikayaroza', 1, 2), v('c1.nov.dikayaroza', 1, 3), v('c1.nov.dikayaroza', 1, 4)]),
        S('12:00', '«Брэйн ринг»', [x('brainring', 0)]),
        S('13:00', '«Пока все дома»', [k('c1.fam.pokavse', 1), k('c1.fam.pokavse', 2)]),
        S('14:00', 'Час Супонева: «Царь горы»', [k('c1.sup.tsargory', 0), k('c1.sup.tsargory', 1)]),
        S('15:00', '«Звёздный час»', [k('c1.sup.zvezdnychas', 2)]),
        S('16:00', 'Disney Club: «Чёрный Плащ»', [v('c1.disney.chernyplashch', 1, 1), v('c1.disney.chernyplashch', 1, 2), v('c1.disney.chernyplashch', 1, 3)]),
        S('17:30', '«До 16 и старше»', [k('c1.teen.do16', 2)]),
        S('18:30', '«Любовь с первого взгляда»', [k('c1.show.lyubov', 1), k('c1.show.lyubov', 3)]),
        S('19:30', '«Счастливый случай»', [x('schastlivyy', 0)]),
        S('20:45', '«Спокойной ночи, малыши!»', [k('c1.anchor.spokoynoy', 3)], 'interstitial'),
        S('21:00', 'Программа «Время»', [k('c1.anchor.vremya', 3)]),
        S('21:35', 'Большое вечернее кино', [v('c1.eve.bethoven'), k('c1.mult.bremen', 0)]),
        S('23:30', '«Джентльмен-шоу»', [k('c1.humor.dzhentlmen', 0), k('c1.humor.dzhentlmen', 2)]),
        S('00:30', '«Акулы пера» и клипы 90-х', [k('c1.night.akulypera', 0), k('c1.night.akulypera', 1), k('c1.night.klipy', 2)]),
        S('03:00', 'Техническая пауза', [TC], 'technical')
      ]
    },
    shestaya: {
      title: 'Шестая кнопка',
      A: [
        S('06:00', 'Аниме: «Сейлор Мун»', [v('c2.anime.sailormoon', 1, 1), v('c2.anime.sailormoon', 1, 2), v('c2.anime.sailormoon', 1, 3)]),
        S('07:30', '«Человек-паук» (1994)', [v('c2.cart.spiderman', 1, 1), v('c2.cart.spiderman', 1, 2), v('c2.cart.spiderman', 1, 3), v('c2.cart.spiderman', 1, 4)]),
        S('09:00', '«Элен и ребята»', [x('elen', 0), x('elen', 1), x('elen', 2), x('elen', 3)]),
        S('11:00', '«Беверли-Хиллз, 90210»', [v('c2.ser.beverly', 1, 1), v('c2.ser.beverly', 1, 2)]),
        S('13:00', '«От винта!»', [k('c2.game.otvinta', 0), k('c2.game.otvinta', 1)]),
        S('14:00', 'Никелодеон: «Эй, Арнольд!»', [k('c2.nick.arnold', 0), k('c2.nick.arnold', 1), k('c2.nick.arnold', 2), k('c2.nick.arnold', 3)]),
        S('15:30', '«Удивительные странствия Геракла»', [x('gerakl', 0), x('gerakl', 1)]),
        S('17:00', '«Боишься ли ты темноты?»', [k('c2.myst.temnota', 0), k('c2.myst.temnota', 1), k('c2.myst.temnota', 2)]),
        S('18:30', '«Каламбур»', [k('c2.sketch.kalambur', 0), k('c2.sketch.kalambur', 1), k('c2.sketch.kalambur', 2)]),
        S('19:30', '«Секретные материалы»', [v('c2.eve.xfiles', 1, 1), v('c2.eve.xfiles', 1, 2)]),
        S('21:30', '«Твин Пикс»', [v('c2.sf.twinpeaks', 1, 1), v('c2.sf.twinpeaks', 1, 2)]),
        S('23:30', 'Ночной MTV: «Бивис и Баттхед»', [v('c2.mtv.bivis', 1, 1), v('c2.mtv.bivis', 1, 2), k('c2.mtv.12zritelei', 1)]),
        S('01:30', 'Рок нон-стоп 90-х', [k('c2.rock.nonstop', 0)]),
        S('03:00', 'Техническая пауза', [TC], 'technical')
      ],
      B: [
        S('06:00', 'Аниме: «Сейлор Мун»', [v('c2.anime.sailormoon', 1, 4), v('c2.anime.sailormoon', 1, 5), v('c2.anime.sailormoon', 1, 6)]),
        S('07:30', '«Люди Икс» (1992)', [k('c2.cart.xmen', 0), k('c2.cart.xmen', 1), k('c2.cart.xmen', 2), k('c2.cart.xmen', 3)]),
        S('09:00', '«Элен и ребята»', [x('elen', 4), x('elen', 5), x('elen', 6), x('elen', 7)]),
        S('11:00', '«Дикий ангел»', [v('c2.ser.dikiyangel', 1, 1), v('c2.ser.dikiyangel', 1, 2)]),
        S('13:00', '«Денди — Новая реальность»', [k('c2.game.dendy', 1), k('c2.game.dendy', 2)]),
        S('14:00', 'Никелодеон: «Ох уж эти детки»', [v('c2.nick.rugrats', 1, 1), v('c2.nick.rugrats', 1, 2), v('c2.nick.rugrats', 1, 3), v('c2.nick.rugrats', 1, 4)]),
        S('15:30', '«Зена — королева воинов»', [x('zena', 0), x('zena', 1)]),
        S('17:00', '«Мурашки»', [k('c2.myst.murashki', 0), k('c2.myst.murashki', 1), k('c2.myst.murashki', 2)]),
        S('18:30', '«Осторожно, модерн!»', [k('c2.sketch.modern', 0), k('c2.sketch.modern', 1), k('c2.sketch.modern', 2)]),
        S('19:30', '«Секретные материалы»', [v('c2.eve.xfiles', 1, 3), v('c2.eve.xfiles', 1, 4)]),
        S('21:30', '«Вавилон 5»', [v('c2.sf.babylon5', 1, 1), v('c2.sf.babylon5', 1, 2)]),
        S('23:30', 'Ночной MTV: «Бивис и Баттхед»', [v('c2.mtv.bivis', 1, 3), v('c2.mtv.bivis', 1, 4), k('c2.mtv.12zritelei', 0)]),
        S('01:30', 'Рок нон-стоп 90-х', [k('c2.rock.nonstop', 1)]),
        S('03:00', 'Техническая пауза', [TC], 'technical')
      ],
      C: [
        S('06:00', '«Трансформеры: Битвы зверей»', [k('c2.anime.transformers', 0), k('c2.anime.transformers', 2), k('c2.anime.transformers', 1)]),
        S('07:30', '«Черепашки-ниндзя» (1987)', [v('c2.cart.tmnt', 1, 1), v('c2.cart.tmnt', 1, 2), v('c2.cart.tmnt', 1, 3), v('c2.cart.tmnt', 1, 4)]),
        S('09:00', '«Элен и ребята»', [x('elen', 8), x('elen', 9), x('elen', 10), x('elen', 11)]),
        S('11:00', '«Беверли-Хиллз, 90210»', [v('c2.ser.beverly', 1, 3), v('c2.ser.beverly', 1, 4)]),
        S('13:00', '«От винта!»', [k('c2.game.otvinta', 2), k('c2.game.otvinta', 0)]),
        S('14:00', 'Никелодеон: «ААА!!! Настоящие монстры»', [x('monsters', 0), x('monsters', 1), x('monsters', 2), x('monsters', 3)]),
        S('15:30', '«Удивительные странствия Геракла»', [x('gerakl', 2), x('gerakl', 3)]),
        S('17:00', '«Боишься ли ты темноты?»', [k('c2.myst.temnota', 3), k('c2.myst.temnota', 4), k('c2.myst.temnota', 5)]),
        S('18:30', '«ОСП-студия»', [k('c2.sketch.osp', 0), k('c2.sketch.osp', 1)]),
        S('19:30', '«Секретные материалы»', [v('c2.eve.xfiles', 1, 5), v('c2.eve.xfiles', 1, 6)]),
        S('21:30', '«Квантовый скачок»', [v('c2.sf.quantum', 1, 1), v('c2.sf.quantum', 1, 2)]),
        S('23:30', 'Ночной MTV: «Бивис и Баттхед»', [v('c2.mtv.bivis', 1, 5), v('c2.mtv.bivis', 1, 6), k('c2.mtv.12zritelei', 1)]),
        S('01:30', 'Рок нон-стоп 90-х', [k('c2.rock.nonstop', 2)]),
        S('03:00', 'Техническая пауза', [TC], 'technical')
      ]
    },
    kabelny: {
      title: 'Кабельный видеосалон',
      A: [
        S('06:00', 'Марафон Disney', [v('c3.disney.korol-lev'), v('c3.disney.aladdin')]),
        S('10:00', 'Французская комедия', [v('c3.com.zhandarm'), v('c3.com.razinya')]),
        S('13:00', 'Эпоха боевых искусств', [v('c3.ma.dospehi-boga'), v('c3.ma.pyanyy-master')]),
        S('16:00', 'Фантастический боевик', [v('c3.sf.hishchnik')]),
        S('18:30', 'Главный блокбастер дня', [v('c3.big.terminator2')]),
        S('21:00', 'Культовый триллер', [v('c3.thr.leon')]),
        S('23:15', 'VHS-хоррор', [v('c3.hor.koshmar')]),
        S('01:00', 'Категория «B»', [v('c3.b.universalnyy-soldat')]),
        S('03:00', 'Техническая пауза', [TC], 'technical')
      ],
      B: [
        S('06:00', 'Марафон Disney', [v('c3.disney.rusalochka'), v('c3.disney.krasavica')]),
        S('10:00', 'Французская комедия', [v('c3.com.igrushka'), v('c3.com.nevezuchie')]),
        S('13:00', 'Эпоха боевых искусств', [v('c3.ma.krovavyy-sport'), v('c3.ma.kikbokser')]),
        S('16:00', 'Фантастический боевик', [v('c3.sf.vspomnit-vse')]),
        S('18:30', 'Главный блокбастер дня', [v('c3.big.matrica')]),
        S('21:00', 'Культовый триллер', [v('c3.thr.skorost')]),
        S('23:00', 'VHS-хоррор', [v('c3.hor.detskie-igry')]),
        S('01:00', 'Категория «B»', [v('c3.b.kiborg')]),
        S('03:00', 'Техническая пауза', [TC], 'technical')
      ],
      C: [
        S('06:00', 'Марафон Disney', [v('c3.disney.kniga-dzhungley'), v('c3.disney.pokahontas')]),
        S('10:00', 'Итальянская комедия', [v('c3.com.ukroshchenie'), v('c3.com.blef')]),
        S('13:00', 'Эпоха боевых искусств', [v('c3.ma.vyhod-drakona'), v('c3.ma.policeyskaya-istoriya')]),
        S('16:00', 'Фантастический боевик', [v('c3.sf.robokop')]),
        S('18:30', 'Главный блокбастер дня', [v('c3.big.pyatyy-element')]),
        S('21:00', 'Культовый триллер', [v('c3.thr.molchanie-yagnyat')]),
        S('23:00', 'VHS-хоррор: «Байки из склепа»', [v('c3.hor.bayki-iz-sklepa', 1, 1), v('c3.hor.bayki-iz-sklepa', 1, 2), v('c3.hor.bayki-iz-sklepa', 1, 3)]),
        S('01:00', 'Категория «B»', [v('c3.b.bezumnyy-maks-2')]),
        S('03:00', 'Техническая пауза', [TC], 'technical')
      ]
    }
  }
};

fs.writeFileSync('tools/tv/collect/pool-final.json', JSON.stringify(pool, null, 1), 'utf8');

// плоский список для проверки
const flat = new Map();
for (const [ch, data] of Object.entries(pool.channels)) {
  for (const rot of ['A', 'B', 'C']) {
    for (const slot of data[rot]) {
      for (const a of slot.assets) {
        const id = `${a.provider}:${a.id}${a.season ? `:s${a.season}e${a.episode}` : ''}`;
        if (!flat.has(id)) flat.set(id, { ...a, uses: [] });
        flat.get(id).uses.push(`${ch}/${rot} ${slot.at}`);
      }
    }
  }
}
for (const grp of Object.values(pool.interstitials)) {
  for (const a of grp) {
    const id = `${a.provider}:${a.id}`;
    if (!flat.has(id)) flat.set(id, { ...a, uses: ['interstitial'] });
  }
}
fs.writeFileSync('tools/tv/collect/pool-flat.json', JSON.stringify([...flat.values()], null, 1), 'utf8');

const byProv = {};
for (const a of flat.values()) byProv[a.provider] = (byProv[a.provider] ?? 0) + 1;
console.log('уникальных ассетов:', flat.size, JSON.stringify(byProv));
