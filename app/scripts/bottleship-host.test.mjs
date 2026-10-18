import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../public/',import.meta.url));
const source=fs.readFileSync(path.join(root,'pc/bottleship/club-host.js'),'utf8');
function fixture(rpc,game='age-of-empires-full'){
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',hidden:false,style:{},handlers:{},addEventListener(t,f){this.handlers[t]=f},setAttribute(){}});return nodes.get(id)};
 class Worker{constructor(url,options){this.url=String(url);this.options=options;this.listeners={}}addEventListener(t,f){this.listeners[t]=f}emit(data){return this.listeners.message({data})}}
 const timers=new Map();let timerId=0;
 let quits=0;const c={window:null,parent:null,document:{getElementById:get,querySelector:()=>({focus(){}}),body:{classList:{add(){}}}},location:{search:'?game='+game},URLSearchParams,SharedArrayBuffer:undefined,crossOriginIsolated:false,Worker,addEventListener(){},pcGameQuit(){quits++},__BS__:rpc?{harness:{rpc}}:undefined,setInterval(fn){timers.set(++timerId,fn);return timerId},clearInterval(id){timers.delete(id)},console};c.window=c;c.parent=c;
 vm.runInNewContext(source,c);const worker=new c.Worker('/assets/emulator.worker-BloCnTYL.js');return {c,get,worker,quits:()=>quits,probe:async()=>{for(const fn of [...timers.values()])await fn()},timerCount:()=>timers.size};
}
test('frozen dependency closure remains byte-identical to the accepted release',()=>{
 const identity=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8'));
 assert.equal(identity.runtimeRelease,'rtcw-full-ru-20261016');assert.equal(identity.files.length,15);
 for(const f of identity.files){const b=fs.readFileSync(path.join(root,f.path));assert.equal(b.length,f.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256,f.path)}
});
test('only selected full games are in BottleShip catalog; no expansion or save migration',()=>{
 const list=JSON.parse(fs.readFileSync(path.join(root,'games-catalog.json'),'utf8'));assert.deepEqual(list.map(g=>g.id),['age-of-empires-full','heroes3-full','max-payne-full','max-payne2-full','generals-full','renegade-full','starcraft-full-ru','stronghold-full-ru','rtcw-full-ru','nfsu-full']);assert.equal(list[0].id,'age-of-empires-full');assert.equal(list[0].preload,true);assert.ok(list[0].wgbUrl.startsWith('https://media.art-ai.studio/pc/releases/age-of-empires-full-v1/'));
 const id=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8')).games['age-of-empires-full'];assert.equal(id.manifest.gameId,'app:age-of-empires');assert.equal(id.manifest.entrypoint,'rom/EMPIRES.EXE');assert.equal(id.savesIncluded,false);
});
test('isolation is scoped to the PC section and frozen workers, never the main site',()=>{
 const h=fs.readFileSync(path.join(root,'_headers'),'utf8');const blocks=h.split(/\n(?=\/)/);
 const pc=blocks.find(b=>b.startsWith('/pc/*\n'));assert.ok(pc.includes('Cross-Origin-Embedder-Policy: require-corp'));assert.ok(pc.includes('Cross-Origin-Opener-Policy: same-origin'));
 assert.ok(!blocks.find(b=>b.startsWith('/pc/bottleship/*')),'no duplicate COEP matches');
 for(const b of blocks)if(b.includes('Cross-Origin-Embedder-Policy:'))assert.ok(!b.startsWith('/*\n'));
});
test('missing isolation shows a useful error instead of silently booting',()=>{
 const f=fixture();assert.equal(f.c.pcBottleHost.phase,'error');assert.match(f.get('bs-error').textContent,/изоляцию/);assert.equal(f.get('bs-retry').hidden,false);
});
test('worker first present clears loader and normal exit returns to desktop',()=>{
 const f=fixture();f.worker.emit({type:'first_present'});assert.equal(f.c.pcBottleHost.firstPresent,true);assert.equal(f.get('bs-overlay').hidden,true);f.worker.emit({type:'process_exit',exitCode:0,crashed:false});assert.equal(f.quits(),1);
});
test('worker crash stays visible as an error and never pretends to be clean exit',()=>{
 const f=fixture();f.worker.emit({type:'process_exit',exitCode:5,crashed:true});assert.equal(f.quits(),0);assert.equal(f.get('bs-overlay').hidden,false);assert.equal(f.c.pcBottleHost.phase,'error');
});

test('all engines use the same desktop document and canonical close handler',()=>{
 assert.equal(fs.readFileSync(path.join(root,'pc/bottleship/club.html'),'utf8'),fs.readFileSync(path.join(root,'pc/index.html'),'utf8'));
 const games=JSON.parse(fs.readFileSync(path.join(root,'pc/games.json'),'utf8'));
 assert.equal(games.length,18);assert.deepEqual(games.filter(g=>g.isolated).map(g=>g.id),['age-of-empires-full','heroes3-full','max-payne-full','max-payne2-full','generals-full','renegade-full','starcraft-full-ru','stronghold-full-ru','rtcw-full-ru','nfsu-full']);
 const g=games.find(g=>g.id==='age-of-empires-full');assert.equal(g.page,'bottleship/index.html?game=age-of-empires-full');
 const desk=fs.readFileSync(path.join(root,'pc/desk/desk.js'),'utf8');
 assert.ok(desk.includes("window.pcClubRoute.destination(g)"));
 assert.ok(desk.includes("window.pcClubRoute.clearLaunch()"));
});

test('Cloudflare extensionless URL is recognized without a redirect loop',()=>{
 const route=/^\/pc\/bottleship\/club(?:\.html)?\/?$/;
 for(const u of ['/pc/bottleship/club','/pc/bottleship/club.html','/pc/bottleship/club/'])assert.ok(route.test(u));
 assert.ok(!route.test('/pc/'));
 const routing=fs.readFileSync(path.join(root,'pc/desk/route.js'),'utf8');assert.ok(routing.includes("window.crossOriginIsolated === true"));
});

test('desktop script URL is versioned to bypass the previous four-hour cache',()=>{
 const html=fs.readFileSync(path.join(root,'pc/index.html'),'utf8');assert.ok(html.includes('/pc/desk/desk.js?v=club-unified-v4'));
});

function teardownReport() {
 return {crash:null,faults:[{eip:'0x0',faultAddr:'0xffffffe8',gameEsp:'0xffffffe8',lastThunk:'user32:DefWindowProcA',recentCalls:[
  '  [45] user32:PostQuitMessage(arg0=0x0) esp=0x4107450 ret=0x41abec -> 0x0',
  '  [46] user32:DefWindowProcA(arg0=0x10001) esp=0x410745c ret=0x419bd2 -> 0x0'
 ]}]};
}
function arm(f, gameId='app:age-of-empires') {f.worker.emit({type:'bundle_meta',gameId});f.worker.emit({type:'first_present'});}
test('AoE native PostQuit teardown flushes files before returning exactly once',async()=>{
 let release;const flushed=new Promise(r=>release=r),calls=[];
 const f=fixture(async(cmd)=>{calls.push(cmd);if(cmd==='state')return {windows:[]};if(cmd==='report')return teardownReport();if(cmd==='fsFlush')return flushed;throw Error(cmd)});
 arm(f);const work=f.probe();await new Promise(r=>setImmediate(r));
 assert.equal(f.c.pcBottleHost.phase,'closing');assert.equal(f.quits(),0);assert.equal(f.timerCount(),0);
 release({flushed:true});await work;
 assert.deepEqual(calls,['state','report','fsFlush']);assert.equal(f.quits(),1);assert.equal(f.c.pcBottleHost.phase,'exited');
 assert.equal(f.c.pcBottleHost.exit.filesFlushed,true);assert.equal(f.c.pcBottleHost.exit.recoveredTeardown,true);
 f.worker.emit({type:'process_exit',exitCode:0});assert.equal(f.quits(),1);
});
test('a live game window never triggers teardown or full diagnostic queries',async()=>{
 const calls=[];const f=fixture(async(cmd)=>{calls.push(cmd);return {windows:[{hwnd:1}]}});arm(f);await f.probe();
 assert.deepEqual(calls,['state']);assert.equal(f.quits(),0);assert.equal(f.c.pcBottleHost.phase,'running');
});
test('a windowless or black transition without native quit is not an exit',async()=>{
 const f=fixture(async(cmd)=>cmd==='state'?{windows:[]}:{crash:null,faults:[]});arm(f);await f.probe();
 assert.equal(f.quits(),0);assert.equal(f.c.pcBottleHost.phase,'running');
});
test('nonzero quit, unrelated faults and explicit crashes are never treated as clean exit',async()=>{
 for(const mode of ['nonzero','unrelated','crash','missing-quit']){
  const report=teardownReport();if(mode==='nonzero')report.faults[0].recentCalls[0]=report.faults[0].recentCalls[0].replace('arg0=0x0','arg0=0x1');
  if(mode==='unrelated')report.faults[0].lastThunk='kernel32:ReadFile';
  if(mode==='crash')report.crash={reason:'fatal'};
  if(mode==='missing-quit')report.faults[0].recentCalls=[];
  const calls=[];const f=fixture(async(cmd)=>{calls.push(cmd);return cmd==='state'?{windows:[]}:report});arm(f);await f.probe();
  assert.equal(f.quits(),0,mode);assert.ok(!calls.includes('fsFlush'),mode);
 }
});
test('recovery is scoped to the exact AoE gameId',async()=>{
 let calls=0;const f=fixture(async()=>{calls++;return {windows:[]}});arm(f,'app:another-game');await f.probe();assert.equal(calls,0);assert.equal(f.quits(),0);
});
test('failed or unconfirmed save flush keeps an actionable error instead of dropping data',async()=>{
 for(const reject of [true,false]){
  const f=fixture(async(cmd)=>{if(cmd==='state')return {windows:[]};if(cmd==='report')return teardownReport();if(reject)throw Error('disk full');return {flushed:false}});
  arm(f);await f.probe();assert.equal(f.quits(),0);assert.equal(f.c.pcBottleHost.phase,'error');assert.equal(f.get('bs-overlay').hidden,false);
  assert.match(f.get('bs-error').textContent,/сохранить данные/);assert.equal(f.timerCount(),0);
 }
});
test('overlapping probes are serialized and ordinary RPC failures do not close the game',async()=>{
 let release,calls=0;const wait=new Promise(r=>release=r);const f=fixture(async()=>{calls++;return wait});arm(f);
 const first=f.probe();await f.probe();assert.equal(calls,1);release({windows:[{hwnd:1}]});await first;assert.equal(f.quits(),0);
 const g=fixture(async()=>{throw Error('RPC timeout')});arm(g);await g.probe();assert.equal(g.quits(),0);assert.equal(g.c.pcBottleHost.phase,'running');
});
test('normal process_exit during flush cannot cause a duplicate quit',async()=>{
 let release;const flushed=new Promise(r=>release=r);
 const f=fixture(async(cmd)=>cmd==='state'?{windows:[]}:cmd==='report'?teardownReport():flushed);arm(f);
 const work=f.probe();await new Promise(r=>setImmediate(r));f.worker.emit({type:'process_exit',exitCode:0});release({flushed:true});await work;assert.equal(f.quits(),1);
});
test('host fix is versioned independently of immutable runtime assets',()=>{
 const html=fs.readFileSync(path.join(root,'pc/bottleship/index.html'),'utf8');assert.ok(html.includes('club-host.js?v=17'));
});

test('save-flush retry keeps the same worker and never reloads uncommitted data',async()=>{
 let flushes=0;const f=fixture(async(cmd)=>{if(cmd==='state')return {windows:[]};if(cmd==='report')return teardownReport();if(++flushes===1)throw Error('temporary flush error');return {flushed:true}});
 arm(f);await f.probe();assert.equal(f.c.pcBottleHost.phase,'error');assert.equal(f.quits(),0);assert.equal(f.get('bs-cancel').disabled,false);
 await f.get('bs-retry').handlers.click();assert.equal(flushes,2);assert.equal(f.quits(),1);assert.equal(f.c.pcBottleHost.exit.filesFlushed,true);
});

test('reported ACCESS_VIOLATION during the proved native teardown also returns to desktop',async()=>{
 const report=teardownReport();report.crash={...report.faults[0],eip:0,faultAddr:0xffffffe8,gameEsp:0xffffffe8};
 const calls=[];const f=fixture(async(cmd)=>{calls.push(cmd);return cmd==='state'?{windows:[]}:cmd==='report'?report:{flushed:true}});
 arm(f);await f.worker.emit({type:'process_exit',exitCode:3221225477,crashed:true,fault:report.crash});
 assert.equal(f.quits(),1);assert.equal(f.c.pcBottleHost.exit.filesFlushed,true);assert.equal(f.c.pcBottleHost.exit.nativeExitCode,3221225477);
 assert.deepEqual(calls,['state','report','fsFlush']);
});
test('ACCESS_VIOLATION without matching teardown or with a live game window stays an error',async()=>{
 for(const mode of ['live','noquit','otherfault','missing']){
  const report=teardownReport();report.crash={...report.faults[0],eip:0,faultAddr:0xffffffe8,gameEsp:0xffffffe8};
  if(mode==='noquit')report.faults[0].recentCalls=[];
  if(mode==='otherfault')report.crash.lastThunk='kernel32:ReadFile';
  const fault=mode==='missing'?undefined:report.crash;
  const f=fixture(async(cmd)=>cmd==='state'?{windows:mode==='live'?[{hwnd:1}]:[]}:cmd==='report'?(mode==='missing'?{crash:null,faults:[]}:report):{flushed:true});
  arm(f);await f.worker.emit({type:'process_exit',exitCode:3221225477,crashed:true,fault});
  assert.equal(f.quits(),0,mode);assert.equal(f.c.pcBottleHost.phase,'error',mode);
 }
});

test('enriched fatal handler report must retain the latest exact guest quit fault',async()=>{
 const report=teardownReport();report.crash={eip:34376,faultAddr:0xffffffe8,gameEsp:0xffffffe8,lastThunk:'user32:DefWindowProcA',faults:report.faults};
 const f=fixture(async(cmd)=>cmd==='state'?{windows:[]}:cmd==='report'?report:{flushed:true});arm(f);
 await f.worker.emit({type:'process_exit',exitCode:3221225477,crashed:true,fault:report.crash});assert.equal(f.quits(),1);
 const bad=teardownReport();bad.crash={...report.crash,faults:[...bad.faults,{eip:'0x123',lastThunk:'kernel32:ReadFile'}]};
 const g=fixture(async(cmd)=>cmd==='state'?{windows:[]}:cmd==='report'?bad:{flushed:true});arm(g);
 await g.worker.emit({type:'process_exit',exitCode:3221225477,crashed:true,fault:bad.crash});assert.equal(g.quits(),0);
});

test('Heroes III preserves the full accepted bundle manifest and separate identity',()=>{
 const id=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8')).games['heroes3-full'];
 assert.equal(id.bytes,1166223179);assert.equal(id.sha256,'8ef4817665052606dd5820de101b14184f5ea5889f2c288a7d29a59ebea801bb');
 assert.equal(id.manifest.gameId,'app:heroes-iii-complete');assert.equal(id.manifest.entrypoint,'rom/Heroes3.exe');
 assert.equal(id.manifest.emulator.memory.ram,67108864);assert.ok(id.manifest.emulator.createDirs.includes('Games'));assert.equal(id.savesIncluded,false);
 const list=JSON.parse(fs.readFileSync(path.join(root,'games-catalog.json'),'utf8'));const g=list.find(g=>g.id==='heroes3-full');assert.equal(g.wgbUrl,id.url);assert.equal(g.preload,true);assert.match(id.url,/^https:\/\/media\.art-ai\.studio\/pc\/releases\/heroes3-complete-full-v1\//);
});
test('loading dialog and icon use the selected full game instead of AoE labels',()=>{
 const f=fixture(undefined,'heroes3-full');assert.equal(f.c.document.title,'Heroes III Complete — Компьютерный клуб');
 const html=fs.readFileSync(path.join(root,'pc/bottleship/index.html'),'utf8');assert.ok(html.includes('id="bs-dialog"'));assert.ok(html.includes('club-host.js?v=17'));assert.ok(html.includes('club-host.css?v=2'));
 const css=fs.readFileSync(path.join(root,'pc/bottleship/club-host.css'),'utf8');assert.ok(css.includes('content:attr(data-game-title)'));assert.ok(!css.includes('content:"Age of Empires"'));
});
test('AoE teardown recovery cannot normalize a Heroes III crash',async()=>{
 const f=fixture(async()=>{throw Error('Heroes must not use AoE recovery')},'heroes3-full');
 f.worker.emit({type:'bundle_meta',gameId:'app:heroes-iii-complete'});f.worker.emit({type:'first_present'});assert.equal(f.timerCount(),0);
 await f.worker.emit({type:'process_exit',exitCode:3221225477,crashed:true,fault:teardownReport().faults[0]});
 assert.equal(f.quits(),0);assert.equal(f.c.pcBottleHost.phase,'error');
});
test('Heroes III normal process exit uses the existing desktop return',()=>{
 const f=fixture(undefined,'heroes3-full');f.worker.emit({type:'bundle_meta',gameId:'app:heroes-iii-complete'});f.worker.emit({type:'first_present'});f.worker.emit({type:'process_exit',exitCode:0,crashed:false});assert.equal(f.quits(),1);
});

test('Max Payne uses the byte-identical accepted full bundle and original launch profile',()=>{
 const id=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8')).games['max-payne-full'];
 assert.equal(id.bytes,838583625);assert.equal(id.sha256,'e6e3cc952b1289af5df459d2c5e63398ab4bcb953ec2228253168b7429d42004');
 assert.equal(id.manifest.gameId,'app:max-payne');assert.equal(id.manifest.entrypoint,'rom/MaxPayne_Cracked.exe');assert.equal(id.manifest.args,'-skipstartup');assert.equal(id.manifest.emulator.memory.ram,134217728);assert.equal(id.manifest.emulator.codepage,1251);assert.equal(id.savesIncluded,false);
 const list=JSON.parse(fs.readFileSync(path.join(root,'games-catalog.json'),'utf8'));assert.equal(list.find(g=>g.id==='max-payne-full').wgbUrl,id.url);assert.ok(id.url.startsWith('https://media.art-ai.studio/pc/releases/max-payne-full-v1/'));
 const g=JSON.parse(fs.readFileSync(path.join(root,'pc/games.json'),'utf8')).find(g=>g.id==='max-payne-full');assert.equal(g.page,'bottleship/index.html?game=max-payne-full');assert.ok(g.isolated);
});
test('Max Payne dialog is selected and clean native exit returns to desktop',()=>{
 const f=fixture(undefined,'max-payne-full');assert.equal(f.c.document.title,'Max Payne — Компьютерный клуб');arm(f,'app:max-payne');assert.equal(f.timerCount(),0);f.worker.emit({type:'process_exit',exitCode:0,crashed:false});assert.equal(f.quits(),1);
});
test('Max Payne crash is never hidden by AoE-only teardown recovery',async()=>{
 const f=fixture(async()=>{throw Error('Max Payne must not use AoE recovery')},'max-payne-full');arm(f,'app:max-payne');await f.worker.emit({type:'process_exit',exitCode:3221225477,crashed:true,fault:teardownReport().faults[0]});assert.equal(f.quits(),0);assert.equal(f.c.pcBottleHost.phase,'error');
});

test('Max Payne 2 preserves accepted full bundle, XP profile and original startup arguments',()=>{
 const id=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8')).games['max-payne2-full'];
 assert.equal(id.bytes,1733122679);assert.equal(id.sha256,'0860eafac56750be235c504157387501d2848c1fd5e84e51de1e17e5157db9b2');assert.equal(id.manifest.gameId,'app:max-payne-2');assert.equal(id.manifest.entrypoint,'rom/MP2.exe');assert.equal(id.manifest.args,'-skipstartup');assert.equal(id.manifest.emulator.memory.ram,67108864);assert.deepEqual(id.manifest.emulator.osVersion,{major:5,minor:1,build:2600,platformId:2});assert.equal(id.manifest.emulator.codepage,1251);assert.equal(id.savesIncluded,false);
 const list=JSON.parse(fs.readFileSync(path.join(root,'games-catalog.json'),'utf8'));assert.equal(list.find(g=>g.id==='max-payne2-full').wgbUrl,id.url);assert.ok(id.url.startsWith('https://media.art-ai.studio/pc/releases/max-payne2-full-v1/'));
 const g=JSON.parse(fs.readFileSync(path.join(root,'pc/games.json'),'utf8')).find(g=>g.id==='max-payne2-full');assert.equal(g.page,'bottleship/index.html?game=max-payne2-full');assert.ok(g.isolated);assert.equal(g.icon,'icons/max-payne2.ico');
});
test('Max Payne 2 title and native clean exit use the existing shared host',()=>{
 const f=fixture(undefined,'max-payne2-full');assert.equal(f.c.document.title,'Max Payne 2 — Компьютерный клуб');arm(f,'app:max-payne-2');assert.equal(f.timerCount(),0);f.worker.emit({type:'process_exit',exitCode:0,crashed:false});assert.equal(f.quits(),1);
});
test('Max Payne 2 crash is not normalized as AoE teardown',async()=>{
 const f=fixture(async()=>{throw Error('MP2 must not use AoE recovery')},'max-payne2-full');arm(f,'app:max-payne-2');await f.worker.emit({type:'process_exit',exitCode:3221225477,crashed:true,fault:teardownReport().faults[0]});assert.equal(f.quits(),0);assert.equal(f.c.pcBottleHost.phase,'error');
});

test('Max Payne 2 uses the graphics candidate without changing accepted UI or shared runtime',()=>{
 const identity=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8'));
 const runtime=identity.games['max-payne2-full'].runtime;
 assert.equal(identity.worker,'emulator.worker-BloCnTYL.js');
 assert.equal(runtime.worker,'emulator.worker-mp2-gfx-f8790126-v1.js');assert.equal(runtime.main,identity.main);assert.equal(runtime.settingsForced,false);
 assert.ok(source.includes("await import('/assets/index-jyZ66EUc.js')"));
 assert.ok(!source.includes('index-Ck6x04ma.js'));assert.ok(!source.includes('emulator.worker-MMIPTFnr.js'));
 assert.ok(source.includes("version: 'club-bottleship-v17'"));
 for(const f of runtime.files){const b=fs.readFileSync(path.join(root,f.path));assert.equal(b.length,f.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256,f.path)}
});
test('worker routing is MP2-only and preserves constructor options and lifecycle observation',()=>{
 const selected=fixture(undefined,'max-payne2-full');assert.equal(selected.worker.url,'/assets/emulator.worker-mp2-gfx-f8790126-v1.js');
 assert.equal(selected.c.pcBottleHost.runtimeWorker,selected.worker.url);
 for(const game of ['age-of-empires-full','heroes3-full','max-payne-full']){
  const f=fixture(undefined,game);assert.equal(f.worker.url,'/assets/emulator.worker-BloCnTYL.js',game);
 }
 const options={type:'module',name:'render'};const nested=new selected.c.Worker('/assets/io-worker-CUKAQV7c.js',options);
 assert.equal(nested.url,'/assets/io-worker-CUKAQV7c.js');assert.equal(nested.options,options);
 selected.worker.emit({type:'ready'});assert.equal(selected.c.pcBottleHost.ready,true);
});

test('Generals retains FULL package and final local launch profile without rejected overrides',()=>{
 const all=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8'));const id=all.games['generals-full'];
 assert.equal(id.bytes,1387216575);assert.equal(id.sha256,'5ab7b576c9a9445c816900e6b846cb85f5aa7906ce58fd0a2742704e6959c1d8');assert.equal(id.manifest.gameId,'app:c-c-generals');assert.equal(id.manifest.entrypoint,'rom/game.dat');assert.equal(id.manifest.args,'');assert.equal(id.manifest.emulator.memory.ram,268435456);assert.deepEqual(id.manifest.emulator.screenResolution,{width:800,height:600,bpp:32});assert.equal(id.manifest.emulator.codepage,1251);assert.equal(id.savesIncluded,false);assert.equal(id.runtime.worker,all.worker);assert.equal(id.runtime.settingsForced,false);assert.equal(id.runtime.exactGen36Binaries,false);
 const list=JSON.parse(fs.readFileSync(path.join(root,'games-catalog.json'),'utf8'));assert.equal(list.find(g=>g.id==='generals-full').wgbUrl,id.url);assert.ok(!list.some(g=>/underground/i.test(g.id)),'NFSU is planned, not silently integrated');
});
test('Generals uses shared worker, selected title and normal exit, never AoE crash recovery',async()=>{
 const f=fixture(async()=>{throw Error('Generals must not use AoE recovery')},'generals-full');assert.equal(f.c.document.title,'C&C Generals — Компьютерный клуб');assert.equal(f.worker.url,'/assets/emulator.worker-BloCnTYL.js');arm(f,'app:c-c-generals');assert.equal(f.timerCount(),0);await f.worker.emit({type:'process_exit',exitCode:3221225477,crashed:true,fault:teardownReport().faults[0]});assert.equal(f.quits(),0);assert.equal(f.c.pcBottleHost.phase,'error');
 const g=fixture(undefined,'generals-full');arm(g,'app:c-c-generals');g.worker.emit({type:'process_exit',exitCode:0,crashed:false});assert.equal(g.quits(),1);
});
test('MP2 user-accepted graphics release remains pinned while adding Generals',()=>{
 const r=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8')).games['max-payne2-full'].runtime;assert.equal(r.status,'user-accepted');assert.equal(r.acceptance.commit,'08ecf30177cd2f45db4441cde1512ca0fca4c71c');assert.equal(r.settingsForced,false);assert.equal(r.worker,'emulator.worker-mp2-gfx-f8790126-v1.js');
});

test('Renegade retains the full package, registry identity and original launch profile',()=>{
 const all=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8'));const id=all.games['renegade-full'];
 assert.equal(id.bytes,1089244664);assert.equal(id.sha256,'2838d378ad1b385240e88bafec4a3c4f18349e9e5a5b60e4afedb1cf8c64d2dd');assert.equal(id.registrySha256,'a524a01a140d1bc640c1a3ae84e626b51f7a609d1dee3b8fc1620666014f2640');assert.equal(id.manifest.gameId,'app:c-c-renegade');assert.equal(id.manifest.entrypoint,'rom/game.exe');assert.equal(id.manifest.args,undefined);assert.equal(id.manifest.emulator.memory.ram,67108864);assert.deepEqual(id.manifest.emulator.screenResolution,{width:640,height:480,bpp:16});assert.deepEqual(id.manifest.emulator.osVersion,{major:4,minor:10,build:2222,platformId:1});assert.equal(id.savesIncluded,false);assert.equal(id.runtime.worker,all.worker);assert.equal(id.runtime.settingsForced,false);
 const list=JSON.parse(fs.readFileSync(path.join(root,'games-catalog.json'),'utf8'));assert.equal(list.find(g=>g.id==='renegade-full').wgbUrl,id.url);assert.ok(id.url.startsWith('https://media.art-ai.studio/pc/releases/renegade-full-v1/'));
 const g=JSON.parse(fs.readFileSync(path.join(root,'pc/games.json'),'utf8')).find(g=>g.id==='renegade-full');assert.ok(g.isolated);assert.equal(g.icon,'icons/renegade.ico');assert.equal(g.page,'bottleship/index.html?game=renegade-full');
});
test('Renegade uses shared worker and normal desktop exit, never AoE crash recovery',async()=>{
 const f=fixture(async()=>{throw Error('Renegade must not use AoE recovery')},'renegade-full');assert.equal(f.c.document.title,'C&C Renegade — Компьютерный клуб');assert.equal(f.worker.url,'/assets/emulator.worker-BloCnTYL.js');arm(f,'app:c-c-renegade');assert.equal(f.timerCount(),0);await f.worker.emit({type:'process_exit',exitCode:3221225477,crashed:true,fault:teardownReport().faults[0]});assert.equal(f.quits(),0);assert.equal(f.c.pcBottleHost.phase,'error');
 const g=fixture(undefined,'renegade-full');arm(g,'app:c-c-renegade');g.worker.emit({type:'process_exit',exitCode:0,crashed:false});assert.equal(g.quits(),1);
});
test('Generals acceptance is pinned to the tested deployment without runtime changes',()=>{
 const all=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8'));const r=all.games['generals-full'].runtime;assert.equal(r.status,'user-accepted');assert.equal(r.acceptance.commit,'54cbbda969c4341f555cab31ffef0dc6cc17e3ba');assert.equal(r.acceptance.hostVersion,9);assert.equal(r.settingsForced,false);assert.equal(r.worker,all.worker);
});

test('StarCraft FULL RU preserves accepted package and 640x480x8 guest, not Brood War',()=>{
 const all=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8'));const id=all.games['starcraft-full-ru'];
 assert.equal(id.bytes,869208370);assert.equal(id.sha256,'a7f5ca5e5b996216ec63db9d247077f63473925fb5f9a1b1aa2479674843346b');assert.equal(id.registrySha256,'d59a8051446d131bc99a68beab78ea4f384399c870c59a505590f15c1ddcc2df');assert.equal(id.manifest.gameId,'app:starcraft-full-ru-v1');assert.equal(id.manifest.entrypoint,'rom/StarCraft.exe');assert.equal(id.manifest.args,undefined);assert.equal(id.manifest.emulator.memory.ram,268435456);assert.deepEqual(id.manifest.emulator.screenResolution,{width:640,height:480,bpp:8});assert.equal(id.manifest.emulator.codepage,1251);assert.equal(id.manifest.emulator.cdPath,'C:\\');assert.equal(id.savesIncluded,false);assert.equal(id.expansionIncluded,false);assert.equal(id.presentation.width,1024);assert.equal(id.presentation.height,768);assert.equal(id.presentation.kind,'presentation-only');assert.equal(id.runtime.worker,all.worker);assert.equal(id.runtime.settingsForced,false);assert.equal(id.runtime.exactLocalAcceptedWorker,false);
 const list=JSON.parse(fs.readFileSync(path.join(root,'games-catalog.json'),'utf8'));assert.equal(list.find(g=>g.id==='starcraft-full-ru').wgbUrl,id.url);assert.match(list.find(g=>g.id==='starcraft-full-ru').description,/без Brood War/);
 const html=fs.readFileSync(path.join(root,'pc/bottleship/index.html'),'utf8');assert.equal((html.match(/starcraft-display.js\?v=1/g)||[]).length,1);
});
test('StarCraft uses shared worker and clean desktop exit, never AoE crash recovery',async()=>{
 const f=fixture(async()=>{throw Error('StarCraft must not use AoE recovery')},'starcraft-full-ru');assert.equal(f.c.document.title,'StarCraft FULL RU 1.16.1 — Компьютерный клуб');assert.equal(f.worker.url,'/assets/emulator.worker-BloCnTYL.js');arm(f,'app:starcraft-full-ru-v1');assert.equal(f.timerCount(),0);await f.worker.emit({type:'process_exit',exitCode:3221225477,crashed:true,fault:teardownReport().faults[0]});assert.equal(f.quits(),0);assert.equal(f.c.pcBottleHost.phase,'error');
 const g=fixture(undefined,'starcraft-full-ru');arm(g,'app:starcraft-full-ru-v1');g.worker.emit({type:'process_exit',exitCode:0,crashed:false});assert.equal(g.quits(),1);
});
test('Renegade acceptance is pinned to the user-tested deployment without runtime edits',()=>{
 const all=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8'));const r=all.games['renegade-full'].runtime;assert.equal(r.status,'user-accepted');assert.equal(r.acceptance.commit,'c7053e126ebb665859c666499dec48ac7de21ca3');assert.equal(r.acceptance.hostVersion,10);assert.equal(r.settingsForced,false);assert.equal(r.worker,all.worker);
});

test('Stronghold FULL RU keeps the accepted full archive, registry and original profile',()=>{
 const all=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8'));const id=all.games['stronghold-full-ru'];
 assert.equal(id.bytes,787580569);assert.equal(id.sha256,'574a4b5de41ecd498bbe12fc42da992ef6c62e2ac22babe01513d963aceaa477');assert.equal(id.registrySha256,'ffb641fff3f09eea3a9637160ac31f8d3d26bd2d1fed701007ca56b6d3c1759f');assert.equal(id.manifest.gameId,'app:stronghold-full-ru-v1');assert.equal(id.manifest.entrypoint,'rom/Stronghold.exe');assert.equal(id.manifest.args,undefined);assert.equal(id.manifest.emulator.memory.ram,268435456);assert.deepEqual(id.manifest.emulator.screenResolution,{width:1024,height:768,bpp:16});assert.equal(id.manifest.emulator.codepage,1251);assert.deepEqual(id.manifest.emulator.createDirs,['Saves']);assert.equal(id.savesIncluded,false);assert.equal(id.runtime.worker,'emulator.worker-stronghold-exit-6c542f4c73cb-v1.js');assert.equal(id.runtime.settingsForced,false);assert.equal(id.runtime.exactLocalAcceptedWorker,false);assert.equal(id.runtime.acceptedSourceMatches.length,5);assert.ok(id.runtime.acceptedSourceMatches.every(x=>x.matchesAcceptedSnapshot));
 const list=JSON.parse(fs.readFileSync(path.join(root,'games-catalog.json'),'utf8'));assert.equal(list.find(g=>g.id==='stronghold-full-ru').wgbUrl,id.url);assert.ok(id.url.startsWith('https://media.art-ai.studio/pc/releases/stronghold-full-ru-v1/'));
 const g=JSON.parse(fs.readFileSync(path.join(root,'pc/games.json'),'utf8')).find(g=>g.id==='stronghold-full-ru');assert.ok(g.isolated);assert.equal(g.icon,'icons/stronghold.ico');
});
test('Stronghold uses shared worker and normal exit, never AoE crash recovery',async()=>{
 const f=fixture(async()=>{throw Error('Stronghold must not use AoE recovery')},'stronghold-full-ru');assert.equal(f.c.document.title,'Stronghold FULL RU — Компьютерный клуб');assert.equal(f.worker.url,'/assets/emulator.worker-stronghold-exit-6c542f4c73cb-v1.js');arm(f,'app:stronghold-full-ru-v1');assert.equal(f.timerCount(),0);await f.worker.emit({type:'process_exit',exitCode:3221225477,crashed:true,fault:teardownReport().faults[0]});assert.equal(f.quits(),0);assert.equal(f.c.pcBottleHost.phase,'error');
 const g=fixture(undefined,'stronghold-full-ru');arm(g,'app:stronghold-full-ru-v1');g.worker.emit({type:'process_exit',exitCode:0,crashed:false});assert.equal(g.quits(),1);
});
test('StarCraft acceptance is pinned without modifying its display or guest profile',()=>{
 const all=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8'));const id=all.games['starcraft-full-ru'];const r=id.runtime;assert.equal(r.status,'user-accepted');assert.equal(r.acceptance.commit,'7e142b6154839d2c85db8b841fdf2ce60c9f07f0');assert.equal(r.acceptance.hostVersion,11);assert.equal(id.presentation.width,1024);assert.equal(id.presentation.height,768);assert.equal(id.manifest.emulator.screenResolution.width,640);assert.equal(id.expansionIncluded,false);assert.equal(r.worker,all.worker);
});


test('Stronghold fatal exit captures bounded technical fault without normalizing code or reading files',async()=>{
 const calls=[];const f=fixture(async(cmd)=>{calls.push(cmd);assert.equal(cmd,'report');return {faults:[{eip:12,lastThunk:'kernel32:TerminateProcess',recentCalls:['ExitProcess'],stackDump:['PRIVATE'],files:['PRIVATE']}],crash:{eip:14}}},'stronghold-full-ru');
 arm(f,'app:stronghold-full-ru-v1');
 f.worker.emit({type:'process_exit',exitCode:3221226505,crashed:true,fault:{reason:'ExitProcess',eip:9,lastThunk:'kernel32:TerminateProcess',recentCalls:Array(120).fill('x'.repeat(1500)),stackDump:['PRIVATE'],memory:'PRIVATE',files:['PRIVATE'],regs:{esp:30,private:'PRIVATE'}},flushError:'flush failed'});
 await new Promise(r=>setImmediate(r));
 const d=f.c.pcBottleHost.exitDiagnostic;assert.equal(d.exitCode,3221226505);assert.equal(d.crashed,true);assert.equal(d.fault.eip,9);assert.equal(d.fault.recentCalls.length,80);assert.equal(d.fault.recentCalls[0].length,1200);assert.equal(d.flushError,'flush failed');assert.equal(d.reportStatus,'captured');assert.equal(d.report.faults[0].eip,12);assert.equal(d.crash.eip,14);assert.ok(!JSON.stringify(d).includes('PRIVATE'));assert.deepEqual(calls,['report']);assert.equal(f.get('bs-diagnostic').hidden,false);assert.equal(f.quits(),0);assert.equal(f.c.pcBottleHost.phase,'error');
});
test('Stronghold diagnostics survive a missing or failed harness',async()=>{
 for(const rpc of [undefined,async()=>{throw Error('worker stopped')}]){
  const f=fixture(rpc,'stronghold-full-ru');arm(f,'app:stronghold-full-ru-v1');f.worker.emit({type:'process_exit',exitCode:3221226505});await new Promise(r=>setImmediate(r));assert.equal(f.c.pcBottleHost.exitDiagnostic.reportStatus,'unavailable');assert.equal(f.quits(),0);assert.equal(f.c.pcBottleHost.phase,'error');
 }
});
test('exit diagnostics are not collected for clean Stronghold exit or other games',async()=>{
 for(const game of ['max-payne2-full','generals-full','starcraft-full-ru','renegade-full']){
  const f=fixture(async()=>{throw Error('must not query')},game);arm(f,'app:stronghold-full-ru-v1');f.worker.emit({type:'process_exit',exitCode:3221226505});assert.equal(f.c.pcBottleHost.exitDiagnostic,undefined);
 }
 const f=fixture(undefined,'stronghold-full-ru');arm(f,'app:stronghold-full-ru-v1');f.worker.emit({type:'process_exit',exitCode:0});assert.equal(f.c.pcBottleHost.exitDiagnostic,undefined);assert.equal(f.quits(),1);
 const g=fixture(undefined,'stronghold-full-ru');arm(g,'app:other');g.worker.emit({type:'process_exit',exitCode:3221226505});assert.equal(g.c.pcBottleHost.exitDiagnostic,undefined);
});
test('diagnostic download is explicit and no automatic reporting endpoint is installed',()=>{
 const html=fs.readFileSync(path.join(root,'pc/bottleship/index.html'),'utf8');assert.match(html,/<button id="bs-diagnostic" hidden/);assert.ok(html.includes('club-host.js?v=17'));assert.ok(source.includes("anchor.download = 'stronghold-exit-report.json'"));const diagnostic=source.slice(source.indexOf('function exitFaultSummary'),source.indexOf('function receive'));assert.ok(!/fetch\(|sendBeacon|localStorage|indexedDB|fsRead|fsList/.test(diagnostic));
});

test('Stronghold callback fix is an isolated immutable worker and never a fatal-code filter',()=>{
 const all=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8'));const r=all.games['stronghold-full-ru'].runtime;
 assert.equal(r.exitFix.normalizesFatalExitCode,false);assert.equal(r.exitFix.fullGameReproduction,false);assert.equal(r.exitFix.defWindowProcCleanupBytes,16);assert.equal(r.exitFix.directDestroyWindowCleanupBytes,4);assert.equal(r.settingsForced,false);
 for(const f of r.files){const b=fs.readFileSync(path.join(root,f.path));assert.equal(b.length,f.bytes);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),f.sha256)}
 for(const game of ['age-of-empires-full','heroes3-full','max-payne-full','generals-full','renegade-full','starcraft-full-ru'])assert.equal(fixture(undefined,game).worker.url,'/assets/'+all.worker);
 assert.equal(fixture(undefined,'max-payne2-full').worker.url,'/assets/emulator.worker-mp2-gfx-f8790126-v1.js');
});

test('RTCW uses the full release archive, native SP DLL route and exact accepted runtime',()=>{
 const all=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8'));const id=all.games['rtcw-full-ru'];
 assert.equal(id.bytes,738754436);assert.equal(id.sha256,'6237bced34004af9027424ca12172d8e933c7e1574600bee807a66fd948f7ec6');assert.equal(id.manifest.gameId,'app:rtcw-sp-full-ru-v1');assert.equal(id.manifest.entrypoint,'rom/WolfSP.exe');assert.equal(id.manifest.args,undefined);assert.equal(id.manifest.emulator.memory.ram,536870912);assert.deepEqual(id.manifest.emulator.screenResolution,{width:1024,height:768,bpp:32});assert.equal(id.manifest.emulator.codepage,1251);assert.deepEqual(id.manifest.emulator.createDirs,['Main\\save']);assert.equal(id.savesIncluded,false);assert.equal(id.runtime.worker,all.worker);assert.equal(id.runtime.main,all.main);assert.equal(id.runtime.exactLocalAcceptedWorker,true);assert.equal(id.runtime.settingsForced,false);assert.deepEqual(id.runtime.packagedAutoexec,{devdll:1,r_glIgnoreWicked3D:1,logfile:2});
 const list=JSON.parse(fs.readFileSync(path.join(root,'games-catalog.json'),'utf8'));const g=list.find(g=>g.id==='rtcw-full-ru');assert.equal(g.wgbUrl,id.url);assert.equal(g.preload,true);assert.ok(id.url.includes('/rtcw-full-ru-v1/RTCW-RU-FULL-release-20261016.wgb'));assert.equal(list.find(g=>g.id==='nfsu-full').enabled,true);
});
test('RTCW retains shared worker and standard clean exit, with no Stronghold or AoE workaround',async()=>{
 const f=fixture(async()=>{throw Error('RTCW must not use other game recovery')},'rtcw-full-ru');assert.equal(f.c.document.title,'Return to Castle Wolfenstein FULL RU — Компьютерный клуб');assert.equal(f.worker.url,'/assets/emulator.worker-BloCnTYL.js');arm(f,'app:rtcw-sp-full-ru-v1');assert.equal(f.timerCount(),0);await f.worker.emit({type:'process_exit',exitCode:3221226505,crashed:false});assert.equal(f.quits(),0);assert.equal(f.c.pcBottleHost.phase,'error');assert.equal(f.c.pcBottleHost.exitDiagnostic,undefined);
 const g=fixture(undefined,'rtcw-full-ru');arm(g,'app:rtcw-sp-full-ru-v1');g.worker.emit({type:'process_exit',exitCode:0,crashed:false});assert.equal(g.quits(),1);
});
test('Stronghold user acceptance pins the corrected worker and successful desktop exit',()=>{
 const r=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8')).games['stronghold-full-ru'].runtime;assert.equal(r.status,'user-accepted');assert.equal(r.acceptance.commit,'5c218222d2baf6137a970464236007e62de1a4fa');assert.equal(r.acceptance.hostVersion,14);assert.equal(r.worker,'emulator.worker-stronghold-exit-6c542f4c73cb-v1.js');assert.equal(r.settingsForced,false);assert.equal(r.exitFix.normalizesFatalExitCode,false);
});

test('NFS Underground retains exact full package and unmodified original startup profile',()=>{
 const all=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8')),id=all.games['nfsu-full'];
 assert.equal(id.bytes,1336951849);assert.equal(id.sha256,'dccfd6e526bcb4b1ead98d04b603bf9971b27cb10f39ee6e096b856ed1d0324f');assert.equal(id.manifest.gameId,'app:nfs-underground');assert.equal(id.manifest.entrypoint,'rom/Speed.exe');assert.equal(id.manifest.args,undefined);assert.deepEqual(id.manifest.emulator,{osVersion:{major:5,minor:1,build:2600,platformId:2},screenResolution:{width:640,height:480,bpp:16},memory:{ram:67108864}});assert.equal(id.savesIncluded,false);assert.equal(id.runtime.settingsForced,false);assert.equal(id.runtime.personalSaveMigration,false);assert.equal(id.runtime.worker,all.worker);assert.equal(id.runtime.main,all.main);assert.equal(id.runtime.sourceStandRuntimeMatchesFrozen,true);
 const games=JSON.parse(fs.readFileSync(path.join(root,'games-catalog.json'),'utf8')),g=games.find(g=>g.id==='nfsu-full');assert.equal(g.wgbUrl,id.url);assert.equal(g.preload,true);assert.ok(id.url.includes('/nfsu-full-v1/NFSUnderground.wgb'));
});
test('NFS uses shared worker and clean desktop return, never other-game exit recovery',async()=>{
 const f=fixture(async()=>{throw Error('No cross-game recovery')},'nfsu-full');assert.equal(f.c.document.title,'Need for Speed Underground — Компьютерный клуб');assert.equal(f.worker.url,'/assets/emulator.worker-BloCnTYL.js');arm(f,'app:nfs-underground');assert.equal(f.timerCount(),0);f.worker.emit({type:'process_exit',exitCode:0,crashed:false});assert.equal(f.quits(),1);
 for(const event of [{type:'process_exit',exitCode:3221226505,crashed:false},{type:'process_exit',exitCode:5,crashed:true}]){const g=fixture(undefined,'nfsu-full');arm(g,'app:nfs-underground');g.worker.emit(event);assert.equal(g.quits(),0);assert.equal(g.c.pcBottleHost.phase,'error');assert.equal(g.c.pcBottleHost.exitDiagnostic,undefined)}
});
test('RTCW user acceptance records confirmed F and Alt+Enter without changing its runtime',()=>{
 const all=JSON.parse(fs.readFileSync(path.join(root,'pc/bottleship/release-identity.json'),'utf8')),r=all.games['rtcw-full-ru'].runtime;assert.equal(r.status,'user-accepted');assert.equal(r.acceptance.commit,'dddc83a441df7b02af06b329391ad68e0c99bbf9');assert.equal(r.acceptance.hostVersion,16);assert.equal(r.worker,all.worker);assert.equal(r.settingsForced,false);assert.equal(r.acceptance.gameplayCommit,'be73d9b3c9dd7adff6b26d9c2a0a6340045e9e96');
});
