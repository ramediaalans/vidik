import fs from 'node:fs';
import path from 'node:path';

const SRC = 'E:/AI-workspace/sandbox/site_millenials_2_temp/ROMs';
const DST = 'E:/AI-workspace/sandbox/site_millenials_2/app/public/roms';
const INDEX = 'E:/AI-workspace/sandbox/site_millenials_2/tools/roms.index.json';

const coreByExt = {
  '.nes': 'nes',
  '.gen': 'segaMD',
  '.md': 'segaMD',
  '.bin': 'segaMD',
  '.smc': 'snes',
  '.sfc': 'snes'
};

fs.mkdirSync(DST, { recursive: true });

const out = [];
for (const f of fs.readdirSync(SRC)) {
  const ext = path.extname(f).toLowerCase();
  const core = coreByExt[ext];
  if (!core) continue;
  const slug = path
    .basename(f, path.extname(f))
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const name = `${slug}${ext}`;
  const target = path.join(DST, name);
  fs.copyFileSync(path.join(SRC, f), target);
  out.push({
    slug,
    file: `roms/${name}`,
    core,
    kb: Math.round(fs.statSync(target).size / 1024),
    source: f
  });
}

out.sort((a, b) => a.slug.localeCompare(b.slug));
fs.writeFileSync(INDEX, JSON.stringify(out, null, 2), 'utf8');

console.log(`imported ${out.length} roms`);
for (const r of out) console.log(`${r.core}\t${r.kb}kb\t${r.slug}`);
