// node tools/tv/collect/grep-vibix.mjs serial "геракл" [год]
import fs from 'node:fs';
const [type, needle, year] = process.argv.slice(2);
const arr = JSON.parse(fs.readFileSync(`tools/tv/collect/vibix-${type}.json`, 'utf8'));
const re = new RegExp(needle, 'i');
const hits = arr.filter((v) => re.test(v.n ?? '') || re.test(v.ne ?? ''))
  .filter((v) => !year || String(v.y) === year)
  .slice(0, 25);
for (const v of hits) console.log(`id=${v.id} kp=${v.kp} ${v.y} | ${v.n} | ${v.ne ?? ''}`);
console.log(`всего: ${hits.length}`);
