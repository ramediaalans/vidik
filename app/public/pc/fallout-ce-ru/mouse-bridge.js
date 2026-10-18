'use strict';
function getMouseBounds() {
    return {width: Module._fallout_get_mouse_bounds_width?.() || 640,
            height: Module._fallout_get_mouse_bounds_height?.() || 480};
}
function getAbsoluteMousePosition(canvas, clientX, clientY) {
    const r = canvas.getBoundingClientRect(), b = getMouseBounds();
    return {x: Math.max(0, Math.min(b.width - 1, Math.round((clientX-r.left)*b.width/Math.max(1,r.width)))),
            y: Math.max(0, Math.min(b.height - 1, Math.round((clientY-r.top)*b.height/Math.max(1,r.height))))};
}
function installWebMouseBridge(canvas) {
    if (canvas.__falloutMouseBridge) return;
    canvas.__falloutMouseBridge = true;
    canvas.tabIndex = 0;
    // Absolute input: no pointer lock, and exactly one owner of game coordinates.
    canvas.requestPointerLock = function() {};
    const held = new Set();
    let activePointer = null, last = {x:0,y:0};
    const stats = {moves:0,downs:0,ups:0,releases:0,last:null};
    if (window.__FCE__) window.__FCE__.mouse = stats;
    function position(e) {
        last = getAbsoluteMousePosition(canvas,e.clientX,e.clientY);
        Module._fallout_push_mouse_move(last.x,last.y);
        stats.last = last;
        return last;
    }
    function consume(e) {e.preventDefault();e.stopImmediatePropagation();}
    function releaseAll() {
        for (const b of held) Module._fallout_push_mouse_button(last.x,last.y,b,0);
        held.clear();activePointer=null;stats.releases++;
    }
    window.addEventListener('pointerdown',e=>{
        if(e.target!==canvas || (e.button!==0 && e.button!==2))return;
        consume(e);canvas.focus({preventScroll:true});position(e);
        held.add(e.button);activePointer=e.pointerId;
        try{canvas.setPointerCapture(e.pointerId)}catch{}
        Module._fallout_push_mouse_button(last.x,last.y,e.button,1);stats.downs++;
    },{capture:true,passive:false});
    window.addEventListener('pointermove',e=>{
        if(e.target!==canvas && e.pointerId!==activePointer)return;
        consume(e);position(e);stats.moves++;
    },{capture:true,passive:false});
    window.addEventListener('pointerup',e=>{
        if(!held.has(e.button))return;
        consume(e);position(e);
        Module._fallout_push_mouse_button(last.x,last.y,e.button,0);held.delete(e.button);stats.ups++;
        if(!held.size){activePointer=null;try{canvas.releasePointerCapture(e.pointerId)}catch{}}
    },{capture:true,passive:false});
    window.addEventListener('pointercancel',e=>{if(e.pointerId===activePointer)releaseAll()},{capture:true});
    canvas.addEventListener('lostpointercapture',()=>{if(held.size)releaseAll()});
    window.addEventListener('blur',releaseAll);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll()});
    // Suppress compatibility mouse events only on the game canvas, not toolbar controls.
    for(const type of ['mousedown','mouseup','mousemove','contextmenu','dblclick'])
        window.addEventListener(type,e=>{if(e.target===canvas)consume(e)},{capture:true,passive:false});
    stats.sample=()=>({target:stats.last,native:{x:Module._fallout_get_native_mouse_x?.(),y:Module._fallout_get_native_mouse_y?.()},queue:Module._fallout_get_mouse_queue_depth?.(),held:[...held],cursor:getComputedStyle(canvas).cursor});
}
