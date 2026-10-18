const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'../public');
const source=fs.readFileSync(path.join(root,'pc/fullscreen-keys.js'),'utf8');
function fixture({desktop=false,state,allow=()=>true}={}) {
 const listeners={},c={window:null,addEventListener(type,fn){(listeners[type]||=[]).push(fn)}};c.window=c;
 vm.runInNewContext(source,c);let toggles=0;
 const shared=c.pcFullscreenKeys.install({toggle(){toggles++},state,allowF:desktop?allow:undefined});
 return {shared,toggles:()=>toggles,send(type,props={}){let e={code:'KeyF',key:'f',isTrusted:true,altKey:false,ctrlKey:false,metaKey:false,shiftKey:false,repeat:false,preventDefault(){this.prevented=true},stopImmediatePropagation(){this.stopped=true},...props};for(const fn of listeners[type]||[])fn(e);return e}};
}
const enter={code:'Enter',key:'Enter',altKey:true};
test('F and Russian А reach the guest on all keyboard phases',()=>{
 const f=fixture();for(const key of ['f','F','а','А'])for(const type of ['keydown','keypress','keyup']){const e=f.send(type,{key});assert.ok(!e.stopped);assert.ok(!e.prevented)}assert.equal(f.toggles(),0);
});
test('Alt+Enter toggles once per press and again to leave fullscreen',()=>{
 const f=fixture();assert.ok(f.send('keydown',enter).stopped);assert.ok(f.send('keypress',enter).stopped);assert.ok(f.send('keydown',{...enter,repeat:true}).stopped);assert.equal(f.toggles(),1);assert.ok(f.send('keyup',enter).stopped);f.send('keydown',enter);f.send('keyup',enter);assert.equal(f.toggles(),2);
});
test('release Alt before Enter never leaks Enter keyup or repeat into the guest',()=>{
 const f=fixture();f.send('keydown',enter);f.send('keyup',{code:'AltLeft',key:'Alt'});assert.ok(f.send('keydown',{code:'Enter',key:'Enter',repeat:true}).stopped);assert.ok(f.send('keyup',{code:'Enter',key:'Enter'}).stopped);assert.ok(!f.send('keydown',{code:'Enter',key:'Enter'}).stopped);
});
test('ordinary Enter, Escape, modified Enter and synthetic gamepad keys are not fullscreen hotkeys',()=>{
 const f=fixture();for(const props of [{code:'Enter',key:'Enter'},{code:'Escape',key:'Escape'},{...enter,ctrlKey:true},{...enter,shiftKey:true},{...enter,metaKey:true},{...enter,isTrusted:false}])assert.ok(!f.send('keydown',props).stopped);assert.equal(f.toggles(),0);
});
test('Numpad Enter is supported and a lost keyup cannot eat the next plain Enter',()=>{
 const f=fixture();f.send('keydown',{...enter,code:'NumpadEnter'});assert.equal(f.toggles(),1);assert.ok(!f.send('keydown',{code:'Enter',key:'Enter'}).stopped);assert.ok(!f.send('keyup',{code:'Enter',key:'Enter'}).stopped);
});
test('desktop F remains enabled only when no game is visible',()=>{
 let visible=false;const f=fixture({desktop:true,allow:()=>!visible});assert.ok(f.send('keydown').stopped);assert.ok(f.send('keyup').stopped);assert.equal(f.toggles(),1);visible=true;for(const type of ['keydown','keypress','keyup'])assert.ok(!f.send(type).stopped);assert.equal(f.toggles(),1);assert.ok(f.send('keydown',enter).stopped);assert.equal(f.toggles(),2);
});
test('shared latch handles fullscreen-induced focus transfer between parent and iframe',()=>{
 const parent=fixture(),child=fixture({state:parent.shared});parent.send('keydown',enter);assert.ok(child.send('keyup',{code:'Enter',key:'Enter'}).stopped);assert.equal(parent.shared.enter,false);assert.equal(parent.toggles(),1);assert.equal(child.toggles(),0);
});
test('pagehide clears the shared held-key state',()=>{const f=fixture();f.send('keydown',enter);f.send('pagehide');assert.equal(f.shared.enter,false)});
test('every game shell loads versioned key boundary before embed and engine code',()=>{
 const games=JSON.parse(fs.readFileSync(path.join(root,'pc/games.json')));let pages=new Set(games.map(g=>g.page.split('?')[0]));for(const page of pages){let p=path.join(root,'pc',page);let html=fs.readFileSync(p,'utf8');assert.ok(html.includes('/pc/embed.js?v=fullscreen-v2'),page);assert.ok(html.indexOf('/pc/fullscreen-keys.js?v=1')<html.indexOf('/pc/embed.js?v=fullscreen-v2'),page)}
});
test('BottleShip and Fallout delegate to common keyboard boundary without their old F handlers',()=>{
 for(const rel of ['pc/bottleship/club-host.js','pc/fallout-ce-ru/club-bridge.js']){let s=fs.readFileSync(path.join(root,rel),'utf8');assert.ok(!s.includes("event.code === 'KeyF'"),rel)}
 const embed=fs.readFileSync(path.join(root,'pc/embed.js'),'utf8');assert.ok(embed.indexOf('window.pcFullscreenKeys.install(')<embed.indexOf("if (!q.has('embed')) return"));assert.ok(!embed.includes('function isF('));
});
test('desktop aliases share cache-busted hints and accessible fullscreen controls',()=>{
 const a=fs.readFileSync(path.join(root,'pc/index.html'),'utf8'),b=fs.readFileSync(path.join(root,'pc/bottleship/club.html'),'utf8');assert.equal(a,b);assert.ok(a.includes('desk.js?v=club-unified-v4'));assert.ok(a.includes('Alt+Enter'));assert.ok(a.includes('title="Полный экран (Alt+Enter)"'));assert.ok(a.includes('data-act="fs"'));assert.ok(a.includes('F</b> (<b>А</b>) — полный экран на рабочем столе'));
});
