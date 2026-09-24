// Downloads the libretro cores used by the games section into app/public/cores.
// Cores are GPL builds from arianrhodsandlot/retroarch-emscripten-build.
import fs from 'node:fs';
import path from 'node:path';

const VERSION = 'v1.19.1';
const BASE = `https://cdn.jsdelivr.net/gh/arianrhodsandlot/retroarch-emscripten-build@${VERSION}/retroarch/`;
const DST = 'E:/AI-workspace/sandbox/site_millenials_2/app/public/cores';

const cores = ['fceumm_libretro', 'genesis_plus_gx_libretro', 'snes9x_libretro'];

fs.mkdirSync(DST, { recursive: true });

for (const core of cores) {
  for (const ext of ['js', 'wasm']) {
    const name = `${core}.${ext}`;
    const target = path.join(DST, name);
    if (fs.existsSync(target) && fs.statSync(target).size > 1024) {
      console.log(`skip  ${name}`);
      continue;
    }
    const res = await fetch(BASE + name);
    if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(target, buf);
    console.log(`saved ${name} ${Math.round(buf.length / 1024)}kb`);
  }
}

console.log('cores ready');
