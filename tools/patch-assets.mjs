// Одноразовый патч: оборачивает пути к картинкам в asset() ради поддержки base.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('app/src');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (/\.tsx$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = await walk(ROOT);
let touched = 0;

for (const file of files) {
  const src = await readFile(file, 'utf8');
  let out = src;

  // src="/images/..." -> src={asset('/images/...')}
  out = out.replace(/src="(\/images\/[^"]+)"/g, (_m, p1) => `src={asset('${p1}')}`);
  // src={item.image} -> src={asset(item.image)}
  out = out.replace(/src=\{((?:item|s|c|t|channel|active)\.image)\}/g, (_m, p1) => `src={asset(${p1})}`);

  if (out !== src) {
    if (!/from '.*media\/asset'/.test(out)) {
      const rel = path.relative(path.dirname(file), path.join(ROOT, 'media/asset')).replace(/\\/g, '/');
      const importPath = rel.startsWith('.') ? rel : `./${rel}`;
      out = out.replace(/^(import [^\n]+\n)/, `$1import { asset } from '${importPath}';\n`);
    }
    await writeFile(file, out, 'utf8');
    touched++;
    console.log('patched', path.relative(ROOT, file));
  }
}

console.log(`\nfiles changed: ${touched}`);
