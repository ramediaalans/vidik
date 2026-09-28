// Ревизия источников по ручной проверке (27.09.2026): без рекламы и чужих логотипов.
// Запуск: node tools/films/apply-overrides.mjs  (идемпотентно)
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = resolve(HERE, 'source-overrides.json');
const d = JSON.parse(readFileSync(FILE, 'utf8'));

const drop = ['stiratel-1996', 'cherepashki-nindzya-1990', 'dzhumandzhi-1995', 'mayor-peyn-1995', 'zhmurki-2005', 'bumer-2003', '101-dalmatinec-1997', 'lilo-i-stich-2003'];
for (const k of drop) delete d[k];

const rt = (id, title, duration) => ({ provider: 'rutube', id, title, duration });
const vk = (id, title, duration) => ({ provider: 'vk', id, title, duration });
const yt = (id, title, duration) => ({ provider: 'youtube', id, title, duration });

Object.assign(d, {
  'terminator-1984': rt('bb88fa5b0d8092225806499b93e416cb', 'Терминатор | The Terminator (1984)', 6423),
  'krepkiy-oreshek-1988': rt('30a9f9acbeff558b6b588e5ed5562f80', 'Крепкий орешек | Die Hard (1988)', 7930),
  'hischnik-1987': rt('09235c15043b98a9aba04a05fe2b6f63', 'Хищник | Predator (1987)', 6396),
  'kommandos-1985': rt('a78342b803b06d7fb118391134110913', 'Коммандос | Commando (1985)', 5510),
  'robokop-1987': rt('d1336998c1a08275c3402fd29fe1b807', 'Робокоп | RoboCop (1987)', 6195),
  'krovavyy-sport-1988': rt('3f1f1752178aeb67d361fb9024b3cde2', 'Кровавый спорт | Bloodsport (1988)', 5540),
  'smertelnaya-bitva-1995': rt('621ecff29382bda60875a23a0405d772', 'Смертельная битва | Mortal Kombat (1995)', 6115),
  'nazad-v-buduschee-1985': rt('1652cd924476f590ce6872387a23d868', 'Назад в будущее | Back to the Future (1985)', 6964),
  'chuzhie-1986': rt('b32ac5665032284813a9ca96f88c9d5c', 'Чужие | Aliens (1986)', 9297),
  'mumiya-1999': rt('5e8c591ff4ab91cafa306ca69ada442a', 'Мумия (1999)', 7495),
  'odin-doma-1990': rt('b590e1fc4daf9f25f44f7752d9c60295', 'Один дома | Home Alone (1990)', 6173),
  'maska-1994': rt('a6a589fc6b97ec1fc7c7460e0c77b699', 'Маска | The Mask (1994)', 6103),
  'pobeg-iz-shoushenka-1994': rt('1a13ed24b9f105b43c8b9d19f1b6846a', 'Побег из Шоушенка (1994)', 8486),
  'forrest-gamp-1994': rt('57fbde6070148b48688ac620ec9475d5', 'Форрест Гамп (1994)', 8529),
  'matrica-1999': vk('-227267093_456240097', 'Матрица (1999)', 7552),
  'den-nezavisimosti-1996': vk('-168223031_456239243', 'День независимости (1996)', 9023),
  'kriminalnoe-chtivo-1994': vk('-229835954_456239025', 'Криминальное чтиво (1994)', 9270),
  'leon-1994': vk('-45623687_456240433', 'Леон (1994)', 7965),
  'titanik-1997': vk('-218463181_456239225', 'Титаник (1997)', 11693),
  'osobennosti-nacionalnoy-ohoty-1995': yt('oWK9K_RtRCM', 'Особенности национальной охоты (1995)', 5511),
  // сборники с таймкодами: режем нужный фильм
  'kikbokser-1989': { ...vk('-230103894_456239384', 'Кикбоксер (1989)', 80894), start: 5533, endTrim: 69501 },
  'park-yurskogo-perioda-1993': { ...vk('-230103894_456239286', 'Парк Юрского периода (1993)', 44844), endTrim: 37257 },
  'park-yurskogo-perioda-2-zateryannyy-mir-1997': { ...vk('-230103894_456239286', 'Парк Юрского периода 2: Затерянный мир (1997)', 44844), start: 7600, endTrim: 29524 },
  // Дисней-клуб: новые позиции
  'pogonschiki-dinozavrov-1988': vk('-229097667_456242074', 'Погонщики динозавров. Все серии', 15680),
  'drakulito-vampirenysh-1991': vk('-58264493_456240974', 'Дракулито-вампирёныш (1991)', 33310),
  'nastoyaschie-ohotniki-za-privideniyami-1986': vk('-182437809_456244273', 'Настоящие охотники за привидениями. 1 сезон', 17174),
  'voyna-gobotov-1984': vk('-58264493_456241230', 'Война гоботов (1984)', 76861)
});

// Стартовые оффсеты: пропускаем заставки заливающих.
for (const [slug, start] of [['terminator-2-sudnyy-den-1991', 22], ['razrushitel-1993', 20], ['skorost-1994', 56], ['pyatyy-element-1997', 8], ['tupoy-i-esche-tupee-1994', 20], ['brat-1997', 16]]) {
  if (d[slug]) d[slug] = { ...d[slug], start };
}

// Космические спасатели: плейлист из 13 серий первого сезона.
const exo = ['456239109', '456239692', '456239699', '456239442', '456239488', '456239269', '456239497', '456239445', '456239190', '456239244', '456239161', '456239202', '456239236'];
d['kosmicheskie-spasateli-leytenanta-marsha-1993'] = {
  ...vk(`-238771813_${exo[0]}`, 'Космические спасатели лейтенанта Марша. Серия 1', 1320),
  episodes: exo.map((id, i) => vk(`-238771813_${id}`, `Серия ${i + 1}`, 1320))
};

writeFileSync(FILE, `${JSON.stringify(d, null, 2)}\n`, 'utf8');
console.log(`source-overrides.json: ${Object.keys(d).length} записей`);
