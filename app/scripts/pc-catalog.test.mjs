import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../public/pc/',import.meta.url));
const games=JSON.parse(fs.readFileSync(path.join(root,'games.json'),'utf8'));
const removed=['doom-freedoom1','doom-freedoom2','doom2','plutonia','tnt'];
test('removed titles stay outside the catalog; original seven engines remain',()=>{
 assert.equal(new Set(games.map(g=>g.id)).size,games.length);
 for(const id of removed) assert.ok(!games.some(g=>g.id===id));
 for(const id of ['doom','wolf3d','half-life','cs16','duke3d','quake3','diablo']) assert.ok(games.some(g=>g.id===id));
 for(const g of games) { assert.ok(fs.existsSync(path.join(root,g.page.split('?')[0])),g.page); assert.ok(fs.existsSync(path.join(root,g.icon)),g.icon); }
 assert.equal(games.find(g=>g.id==='doom').core,'prboom');
});
test('Fallout uses CE f40-final, not the old WGB engine',()=>{
 const g=games.find(g=>g.id==='fallout');assert.equal(g.page,'fallout-ce-ru/index.html');
 const dir=path.join(root,'fallout-ce-ru');
 const wasm=fs.readFileSync(path.join(dir,'fallout-ce.wasm'));
 assert.equal(crypto.createHash('sha256').update(wasm).digest('hex'),'0375d0f2c281dd91bc7e7a74535dc88a2006d013c27db398ce5838eaa67d54e0');
 const launcher=fs.readFileSync(path.join(dir,'launcher.js'));
 assert.equal(crypto.createHash('sha256').update(launcher).digest('hex'),'6308f7cf0f6b20397089806d409f0940aa613b51dbc869c6ca81ef3a8ff5f8f7');
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');assert.ok(!html.includes('engine=bottleship'));assert.ok(html.includes('/pc/embed.js'));
});
test('Fallout manifest stays immutable and isolated from production media',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'fallout-ce-ru/assets-manifest.json'),'utf8'));
 assert.equal(m.files.length,22);assert.equal(m.totalBytes,717229201);
 assert.equal(m.files.reduce((n,f)=>n+f.bytes,0),m.totalBytes);
 for(const f of m.files) {
  const url=new URL(f.url);assert.equal(url.origin,'https://media.art-ai.studio');
  assert.ok(url.pathname.startsWith('/pc/releases/fallout-ce-f40-final/assets/'));
  assert.ok(!f.path.includes('..')&&!f.path.startsWith('/'));assert.match(f.sha256,/^[a-f0-9]{64}$/);assert.ok(!/savegame/i.test(f.path));
 }
});
