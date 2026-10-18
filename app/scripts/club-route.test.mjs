import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../public/pc/',import.meta.url);
const source=fs.readFileSync(new URL('desk/route.js',root),'utf8');
const games=JSON.parse(fs.readFileSync(new URL('games.json',root),'utf8'));
function fixture(url,isolated){
 const location=new URL(url),navigations=[],replacements=[];
 location.replace=url=>navigations.push(url);
 const history={state:{keep:true},replaceState(state,title,url){replacements.push(url);location.href=new URL(url,location).href;this.state=state}};
 const c={window:null,location,history,crossOriginIsolated:isolated,URL,URLSearchParams};c.window=c;vm.runInNewContext(source,c);return {c,route:c.pcClubRoute,location,navigations,replacements};
}
test('isolated /pc/ opens directly without a preparatory document navigation',()=>{
 const f=fixture('https://pc-test.art-ai.studio/pc/',true);
 assert.equal(f.navigations.length,0);assert.equal(f.route.redirecting,false);assert.equal(f.location.href,'https://pc-test.art-ai.studio/pc/');
 const html=fs.readFileSync(new URL('index.html',root),'utf8');assert.ok(html.indexOf('desk/route.js?v=unified-v2')<html.indexOf('/pc/desk/desk.css'));assert.ok(html.includes('desk/desk.js?v=club-unified-v4'));
});
test('old unisolated cached documents recover once for any game before interaction',()=>{
 for(const game of games){const f=fixture('https://pc-test.art-ai.studio/pc/?game='+game.id,false);assert.deepEqual(f.navigations,['/pc/bottleship/club?game='+game.id]);assert.equal(f.route.redirecting,true);assert.equal(f.replacements.length,0)}
});
test('both old aliases and direct links preserve one autolaunch while canonicalizing',()=>{
 for(const game of games)for(const base of ['/pc/','/pc/bottleship/club']){
  const f=fixture('https://pc-test.art-ai.studio'+base+'?game='+game.id+'&qaMute=1',true);
  assert.equal(f.location.href,'https://pc-test.art-ai.studio/pc/');assert.equal(f.route.initialGame,game.id);assert.equal(f.route.qaMute,true);assert.equal(f.route.redirecting,false);assert.equal(f.navigations.length,0);assert.deepEqual(f.c.history.state,{keep:true});
 }
});
test('every engine pair stays in the same isolated desktop document',()=>{
 const f=fixture('https://pc-test.art-ai.studio/pc/',true);
 for(const before of games)for(const after of games){f.route.initialGame=before.id;f.route.clearLaunch();assert.equal(f.route.destination(after),null,before.id+' -> '+after.id)}
 assert.equal(f.navigations.length,0);assert.equal(f.location.href,'https://pc-test.art-ai.studio/pc/');
});
test('close clears launch state without reload and QA remains out of the address',()=>{
 const f=fixture('https://pc-test.art-ai.studio/pc/?game=heroes3-full&qaMute=1&media=r2#desk',true);
 f.route.clearLaunch();assert.equal(f.route.initialGame,null);assert.equal(f.route.qaMute,true);assert.equal(f.location.href,'https://pc-test.art-ai.studio/pc/?media=r2#desk');assert.equal(f.navigations.length,0);
 const desk=fs.readFileSync(new URL('desk/desk.js',root),'utf8');assert.ok(desk.includes('window.pcClubRoute.clearLaunch()'));assert.ok(desk.includes('var q = window.pcClubRoute.initialGame;'));assert.ok(desk.includes("if (window.pcClubRoute.qaMute) p +="));assert.ok(!desk.includes('var isolatedDesk ='));
});
test('unified isolation retains original same-origin frames, URLs and persistence namespaces',()=>{
 const desk=fs.readFileSync(new URL('desk/desk.js',root),'utf8');assert.ok(desk.includes("return '/pc/' + p"));assert.ok(!/credentialless|setAttribute\(['"]sandbox|indexedDB\.deleteDatabase|caches\.delete/.test(desk));
 for(const game of games){assert.ok(!/^https?:/.test(game.page));assert.ok(fs.existsSync(new URL(game.page.split('?')[0],root)))}
 const f=fixture('https://pc-test.art-ai.studio/pc/?qaMute=1',false);assert.equal(f.route.destination({id:'doom',isolated:false}),'/pc/bottleship/club?game=doom&qaMute=1');
});
test('one PC-only COEP rule covers all legacy pages and worker scripts without duplicate policies',()=>{
 const h=fs.readFileSync(new URL('../_headers',root),'utf8');const blocks=h.split(/\n(?=\/)/);const pc=blocks.find(b=>b.startsWith('/pc/*\n'));
 assert.match(pc,/Cross-Origin-Opener-Policy: same-origin/);assert.match(pc,/Cross-Origin-Embedder-Policy: require-corp/);
 assert.ok(!blocks.find(b=>b.startsWith('/pc/bottleship/*')));
 for(const block of blocks.filter(b=>b.includes('Cross-Origin-Embedder-Policy:')))assert.ok(block.startsWith('/pc/*\n')||block.startsWith('/assets/'));
 const global=blocks.find(b=>b.startsWith('/*\n'));assert.ok(!global.includes('Cross-Origin-Embedder-Policy:'));assert.ok(!global.includes('Cross-Origin-Opener-Policy:'));
});
