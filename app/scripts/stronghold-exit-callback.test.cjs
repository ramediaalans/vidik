const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const path=require('path');const root=path.join(__dirname,'../public/assets/');const patch={worker:"emulator.worker-stronghold-exit-6c542f4c73cb-v1.js"};
function fixture(file){
 let source=fs.readFileSync(root+file,'utf8');
 let a=source.indexOf('function xnt('),b=source.indexOf('function Snt(',a),sync=source.slice(a,b);
 a=source.indexOf('e.DestroyWindow=');b=source.indexOf(';let c=e=>',a);let destroy=source.slice(a,b);
 a=source.indexOf('e.DefWindowProcA=(t,n,r)=>');b=source.indexOf(',tz=e.DefWindowProcA',a);let def=source.slice(a,b);
 const windows=new Map([[1,{children:[],wndProc:0x401000,parent:0,visible:true}]]),pending=[],frames=[],delivered=[];
 const manager={saveSuspendedThunkContext(ctx,cleanup,kind){frames.push({ctx,cleanup,kind});return frames.length},invokeCallback(proc,args,_return,done,_async,kind,frameId){pending.push({args,done,frameId});return {callbackId:pending.length}},};
 const c={e:{},B:windows,N:{log(){},warn(){},verbose(){}},M:{USER32:1},c4e(){},Xge(){},Bnt(){},Cnt:2,wnt:130,cV(){return false},c(h){windows.delete(h)},QR:15,$R:20,$:{getInstance:()=>({process:{dispatcher:{callbackManager:manager}},scheduler:{wakeMessageWaiters(){}}})}};
 vm.runInNewContext(sync+';'+destroy+';'+def,c);
 const mem=new Uint8Array(512);new DataView(mem.buffer).setUint32(128,0x12345678,true);const ctx={esp:128};
 return {c,windows,frames,callClose:()=>c.e.DefWindowProcA(ctx,mem,[1,16,0,0]),callDestroy:()=>c.e.DestroyWindow(ctx,mem,[1]),drain(){let value;while(pending.length){let p=pending.shift();delivered.push(p.args[1]);value=p.done()}return {value,delivered}}};
}
let bad=fixture('emulator.worker-BloCnTYL.js');let r=bad.callClose();assert.equal(r,0);assert.equal(bad.frames[0].cleanup,4);console.log('Baseline reproduced: WM_CLOSE discards suspension and saves wrong 4-byte cleanup for a 16-byte thunk');
let good=fixture(patch.worker);r=good.callClose();assert.equal(r.suspendedForCallback,true);assert.equal(r.stackCleanup,16);assert.equal(r.value,0);assert.equal(good.frames[0].cleanup,16);assert.equal(good.frames[0].ctx.returnAddr,0x12345678);let end=good.drain();assert.deepEqual(end.delivered,[2,130]);assert.equal(end.value,0);assert.equal(good.windows.size,0);
let direct=fixture(patch.worker);r=direct.callDestroy();assert.equal(r.suspendedForCallback,true);assert.equal(r.stackCleanup,4);assert.equal(r.value,1);assert.equal(direct.drain().value,1);
let absent=fixture(patch.worker);absent.windows.clear();assert.equal(absent.callClose(),0);assert.equal(absent.callDestroy(),1);
console.log('PASS: WM_CLOSE preserves callback, original return address, 16-byte cleanup, WM_DESTROY→WM_NCDESTROY, LRESULT 0; direct DestroyWindow retains 4-byte cleanup/TRUE');
