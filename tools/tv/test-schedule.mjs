// Прогон сетки вещания без браузера: node tools/tv/test-schedule.mjs
// Node 24 импортирует .ts напрямую (type stripping).
import { readFileSync } from 'node:fs';
import {
  DAY_SEC,
  buildDay,
  nowPlaying,
  guide,
  hhmm,
  dayNumber,
} from '../../app/src/tv/schedule.ts';

const data = JSON.parse(readFileSync(new URL('./pool.json', import.meta.url), 'utf8'));

let failed = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '  ok  ' : ' FAIL '} ${msg}`);
  if (!cond) failed++;
};

const DATES = ['2025-01-01', '2025-06-14', '2026-02-28'];
const CHANNELS = Object.keys(data.channels);

/* ---------- 1. детерминизм ---------- */
console.log('\n== детерминизм ==');
for (const ch of CHANNELS) {
  const a = JSON.stringify(buildDay(data, ch, DATES[0]));
  const b = JSON.stringify(buildDay(data, ch, DATES[0]));
  ok(a === b, `${ch}: два вызова с одним seed'ом совпали байт-в-байт (${a.length} симв.)`);
  const c = JSON.stringify(buildDay(data, ch, DATES[1]));
  ok(a !== c, `${ch}: другая дата — другая сетка`);
}
ok(
  JSON.stringify(buildDay(data, CHANNELS[0], DATES[0])) !==
    JSON.stringify(buildDay(data, CHANNELS[1], DATES[0])),
  'разные каналы в один день дают разные сетки'
);
ok(dayNumber('1970-01-02') === 1, 'dayNumber: эпоха считается верно');

/* ---------- 2. целостность суток ---------- */
console.log('\n== целостность суток ==');
for (const date of DATES) {
  for (const ch of CHANNELS) {
    const slots = buildDay(data, ch, date);
    const holes = slots.filter((s, i) => i > 0 && s.start !== slots[i - 1].end).length;
    const zero = slots.filter((s) => s.end <= s.start).length;
    const covered = slots.length ? slots[slots.length - 1].end : 0;
    const bad = slots.filter((s) => !s.id || !s.title).length;
    ok(
      holes === 0 && zero === 0 && covered >= DAY_SEC && bad === 0 && slots[0]?.start === 0,
      `${date} ${ch}: ${slots.length} слотов, покрытие ${(covered / 3600).toFixed(2)} ч, дыр ${holes}, пустых ${zero}, без id/title ${bad}`
    );
  }
}

/* ---------- 3. nowPlaying по всем суткам ---------- */
console.log('\n== nowPlaying ==');
for (const ch of CHANNELS) {
  const slots = buildDay(data, ch, DATES[0]);
  let misses = 0;
  let badOffset = 0;
  for (let s = 0; s < DAY_SEC; s += 30) {
    const np = nowPlaying(slots, s);
    if (!np) misses++;
    else if (np.offsetSec < 0 || np.offsetSec >= np.slot.end - np.slot.start) badOffset++;
  }
  ok(misses === 0 && badOffset === 0, `${ch}: 2880 проб, промахов ${misses}, кривых offset ${badOffset}`);
}

/* ---------- 4. якоря ---------- */
console.log('\n== якоря ==');
for (const ch of CHANNELS) {
  const cfg = data.channels[ch];
  if (!cfg.anchors?.length) continue;
  for (const date of DATES) {
    const slots = buildDay(data, ch, date);
    for (const a of cfg.anchors) {
      const [h, m] = a.at.split(':').map(Number);
      const want = h * 3600 + m * 60;
      const hit = slots.find((s) => s.kind === 'replay' && s.label === a.label);
      const drift = hit ? Math.abs(hit.start - want) : Infinity;
      ok(
        drift <= 900,
        `${date} ${ch}: «${a.label}» в ${hit ? hhmm(hit.start) : '—'} (цель ${a.at}, сдвиг ${Math.round(drift / 60)} мин)`
      );
    }
  }
}

/* ---------- 5. повторы и баланс ---------- */
console.log('\n== повторы и баланс ==');
for (const ch of CHANNELS) {
  const days = DATES.map((d) => buildDay(data, ch, d));
  const slots = days.flat();
  const progs = slots.filter((s) => s.kind === 'program');
  const uniq = new Set(progs.map((s) => s.id)).size;
  // Дубли считаем внутри суток: стык дней режется полночью и у каждого дня свой seed.
  const adjacent = days
    .map((d) => d.filter((s) => s.kind === 'program'))
    .reduce((n, p) => n + p.filter((s, i) => i > 0 && s.id === p[i - 1].id).length, 0);
  const interSec = slots
    .filter((s) => s.kind === 'interstitial')
    .reduce((n, s) => n + s.end - s.start, 0);
  ok(
    adjacent === 0,
    `${ch} (3 дня): передач ${progs.length}, уникальных ${uniq}, подряд-дублей ${adjacent}, перебивок ${(interSec / 3600 / 3).toFixed(1)} ч/сут (${Math.round((interSec / DAY_SEC / 3) * 100)}%)`
  );
}

/* ---------- 5б. длина рекламных пауз ---------- */
console.log('\n== рекламные паузы ==');
const BREAK_LIMIT_SEC = 8 * 60;
for (const ch of CHANNELS) {
  let worst = 0;
  let worstAt = 0;
  const runs = [];
  for (const date of DATES) {
    let run = 0;
    let runStart = 0;
    for (const s of buildDay(data, ch, date)) {
      if (s.kind === 'interstitial') {
        if (run === 0) runStart = s.start;
        run += s.end - s.start;
      } else if (run) {
        runs.push(run);
        if (run > worst) {
          worst = run;
          worstAt = runStart;
        }
        run = 0;
      }
    }
    if (run) runs.push(run);
  }
  const avg = runs.reduce((a, b) => a + b, 0) / (runs.length || 1);
  ok(
    worst <= BREAK_LIMIT_SEC,
    `${ch}: пауз ${runs.length}, средняя ${Math.round(avg / 60)} мин, самая длинная ${Math.round(worst / 60)} мин в ${hhmm(worstAt)} (предел ${BREAK_LIMIT_SEC / 60})`
  );
}

/* ---------- 6. образец программы ---------- */
console.log('\n== программа на ' + DATES[0] + ' ==');
for (const ch of CHANNELS) {
  const cfg = data.channels[ch];
  console.log(`\n${cfg.num} ${cfg.name}`);
  for (const s of guide(buildDay(data, ch, DATES[0])).slice(0, 8)) {
    const tag = s.kind === 'replay' ? `[${s.label}] ` : '';
    console.log(`  ${hhmm(s.start)}  ${tag}${s.title.slice(0, 66)}`);
  }
}

console.log(failed ? `\nПРОВАЛЕНО проверок: ${failed}` : '\nвсе проверки пройдены');
process.exit(failed ? 1 : 0);
