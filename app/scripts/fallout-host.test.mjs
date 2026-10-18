import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../public/pc/fallout-ce-ru/club-bridge.js',import.meta.url),'utf8');
function fixture({stage='ready',qa=false}={}){
 const nodes=new Map();const classes=()=>({add(){},remove(){}});
 function get(id){if(!nodes.has(id))nodes.set(id,{textContent:'',style:{},value:0,hidden:true,classList:classes(),handlers:{},addEventListener(k,f){this.handlers[k]=f},dispatchEvent(e){this.handlers[e.type]?.({target:this})},click(){this.handlers.click?.()},setAttribute(){}});return nodes.get(id)}
 const order=[];let tick,complete;const diag={stage,loadGame(){order.push('load');diag.stage='loading'},syncSaves:async()=>{order.push('sync')},saveMount:'/persist-fallout-ce-ru-v1'};
 const asyncify={currData:123,whenDone(){return new Promise(resolve=>{complete=resolve})}};
 const runtime={callMain(){order.push('main');return 0}};
 get('mute').addEventListener('change',e=>diag.muted=e.target.checked);
 get('start').addEventListener('click',()=>{diag.stage='running';runtime.callMain()});
 const context={window:null,location:{search:qa?'?qaMute=1':'',origin:'https://test',reload(){}},document:{hidden:false,getElementById:get,querySelector:()=>get('meter'),documentElement:{classList:classes()},body:{classList:classes()},addEventListener(){}},URLSearchParams,Event,setInterval:f=>{tick=f},console};
 Object.assign(context,{__FCE__:diag,Module:runtime,Asyncify:asyncify,PC_EMBED:true,pcGameQuit(){order.push('quit')},addEventListener(){}});context.window=context;context.parent=context;
 vm.runInNewContext(source,context);
 return {diag,runtime,asyncify,get,order,tick:()=>tick(),complete:c=>complete(c)};
}
test('club automatically loads once and starts once; no diagnostic sound default',()=>{
 const f=fixture();f.tick();assert.deepEqual(f.order,['load']);assert.equal(f.diag.muted,false);
 f.diag.stage='loaded';f.tick();f.tick();assert.deepEqual(f.order,['load','main']);assert.equal(f.diag.host.mainPending,true);assert.ok(!f.order.includes('quit'));
});
test('native Asyncify main completion flushes saves before returning to desktop',async()=>{
 const f=fixture({stage:'loaded'});assert.deepEqual(f.order,['main']);f.complete(0);await new Promise(r=>setImmediate(r));assert.deepEqual(f.order,['main','sync','quit']);assert.equal(f.diag.host.finished,true);
});
test('nonzero exit shows error instead of silently closing the game',async()=>{
 const f=fixture({stage:'loaded'});f.complete(2);await new Promise(r=>setImmediate(r));assert.equal(f.diag.stage,'error');assert.ok(!f.order.includes('quit'));assert.equal(f.get('retry').hidden,false);
});
test('cancel syncs saves and agent QA remains muted',async()=>{
 const f=fixture({qa:true});assert.equal(f.diag.muted,true);f.get('cancel').click();await new Promise(r=>setImmediate(r));assert.deepEqual(f.order,['load','sync','quit']);
});
test('shell loads shared fullscreen handler first and removes diagnostic chrome',()=>{
 const html=fs.readFileSync(new URL('../public/pc/fallout-ce-ru/index.html',import.meta.url),'utf8');
 assert.ok(html.indexOf('/pc/embed.js')<html.indexOf('launcher.js'));
 assert.ok(!/<header|<footer|Без звука|CE\/WASM/.test(html));
 assert.ok(html.includes('canvas-fit'));assert.ok(html.includes('role="progressbar"'));
 for(const id of ['load','start','progress','status','mute','sync','fullscreen','save-state','error','overlay','canvas'])assert.ok(html.includes('id="'+id+'"'));
});
