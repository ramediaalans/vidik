// Проверка точной A/B/C-сетки: node tools/tv/test-schedule.mjs
import { readFileSync } from 'node:fs';
import { DAY_SEC, ROTATION_EPOCH, broadcastDateISO, broadcastSecondsOfDay, buildDay, dayNumber, hhmmToSec, nowPlaying, rotationForDate } from '../../app/src/tv/schedule.ts';

const legacy = JSON.parse(readFileSync(new URL('../../app/src/tv/pool.json', import.meta.url), 'utf8'));
const data = { ...legacy, channels: { pervaya: {}, shestaya: {}, kabelny: {} } };
let failed = 0;
const ok = (condition, message) => { console.log(`${condition ? '  ok  ' : ' FAIL '} ${message}`); if (!condition) failed++; };
const channels = Object.keys(data.channels);
const dates = ['2026-01-01', '2026-01-02', '2026-01-03'];

console.log('\n== цикл A/B/C ==');
ok(rotationForDate(ROTATION_EPOCH) === 'A', 'эпоха начинается с A');
ok(dates.map(rotationForDate).join('') === 'ABC', 'три последовательных дня: A → B → C');
ok(rotationForDate('2026-01-04') === 'A', 'четвёртый день снова A');
ok(dayNumber('1970-01-02') === 1, 'номер дня от эпохи корректен');
for (const channel of channels) {
  const a1 = JSON.stringify(buildDay(data, channel, '2026-01-01'));
  const a2 = JSON.stringify(buildDay(data, channel, '2026-01-04'));
  const b = JSON.stringify(buildDay(data, channel, '2026-01-02'));
  ok(a1.replaceAll('2026-01-01', '') === a2.replaceAll('2026-01-04', ''), `${channel}: день A повторяется байт-в-байт`);
  ok(a1 !== b, `${channel}: A и B различаются`);
}

console.log('\n== целостность и метаданные ==');
for (const date of dates) for (const channel of channels) {
  const slots = buildDay(data, channel, date);
  const holes = slots.filter((slot, i) => i && slot.start !== slots[i - 1].end).length;
  const invalid = slots.filter((slot) => slot.end <= slot.start || !slot.title || !slot.provider || !slot.mediaId || !slot.publicRef || !slot.mediaType).length;
  ok(slots[0]?.start === 0 && slots.at(-1)?.end === DAY_SEC && holes === 0 && invalid === 0,
    `${date} ${channel}: ${slots.length} слотов, 24 часа, дыр ${holes}, ошибок ${invalid}`);
  let misses = 0;
  for (let sec = 0; sec < DAY_SEC; sec += 30) if (!nowPlaying(slots, sec)) misses++;
  ok(misses === 0, `${date} ${channel}: nowPlaying покрывает все 2880 контрольных точек`);
}

console.log('\n== жёсткие якоря ==');
const anchors = {
  pervaya: ['03:00', '06:00', '08:00', '11:00', '14:00', '17:00', '20:45', '21:00', '22:00'],
  shestaya: ['03:00', '06:00', '09:00', '13:00', '16:00', '18:00', '21:00'],
  kabelny: ['03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00']
};
for (const channel of channels) {
  const starts = new Set(buildDay(data, channel, dates[0]).map((slot) => slot.start));
  for (const time of anchors[channel]) ok(starts.has(hhmmToSec(time)), `${channel}: якорь ${time} точный`);
}

console.log('\n== ротация аниме Kodik ==');
const anime = dates.map((date) => buildDay(data, 'shestaya', date).find((slot) => slot.start === hhmmToSec('16:00')));
ok(anime.every((slot) => slot?.provider === 'kodik' && slot.mediaType === 'episode'), 'A/B/C: аниме-блок использует Kodik и конкретный эпизод');
ok(new Set(anime.map((slot) => slot?.mediaId)).size === 3, 'A/B/C: три разных аниме-источника');
ok(anime.every((slot) => slot?.season === 1 && slot.episode === 1 && slot.publicRef.startsWith('https://')), 'Kodik: сезон, серия и публичная embed-ссылка заполнены');

console.log('\n== UTC+3 ==');
const nearMidnight = new Date('2026-01-01T21:30:15.000Z');
ok(broadcastDateISO(nearMidnight) === '2026-01-02', 'дата переключается в 00:00 UTC+3');
ok(broadcastSecondsOfDay(nearMidnight) === 30 * 60 + 15, 'время считается в UTC+3, не в зоне браузера');

console.log(failed ? `\nПРОВАЛЕНО: ${failed}` : '\nвсе проверки пройдены');
process.exit(failed ? 1 : 0);
