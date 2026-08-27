/* Keeping the viewports alive through rotation, Split View and sleep.

   Rotation and Split View resize the webview while the page keeps running;
   NiiVue sizes its canvas when told, so every instance registered here is
   re-measured shortly after the geometry settles. And iPadOS takes WebGL
   contexts away from backgrounded apps — the canvas comes back black with
   no error — so each canvas gets a contextlost handler that owns up and
   offers the one repair that reliably works, a reload.

     MN_LIFE.register(nv)   after attachToCanvas
     MN_LIFE.remeasure()    on demand, idempotent */
window.MN_LIFE = (function(){

var all = [];
var timer = null;

function remeasure(){
  all.forEach(function(nv){
    try{ nv.resizeListener(); nv.drawScene(); }catch(e){}
  });
}
function settle(delay){
  clearTimeout(timer);
  timer = setTimeout(remeasure, delay);
}
window.addEventListener("resize", function(){ settle(150); });
window.addEventListener("orientationchange", function(){ settle(260); });

function register(nv){
  if (!nv || all.indexOf(nv) !== -1) return;
  all.push(nv);
  var c = nv.canvas;
  if (!c || !c.addEventListener) return;
  c.addEventListener("webglcontextlost", function(ev){
    ev.preventDefault();
    var stage = c.closest ? c.closest(".mri-stage") : null;
    if (!stage || stage.querySelector(".ctx-lost")) return;
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ctx-lost";
    b.textContent = "Graphics context lost — tap to reload";
    b.addEventListener("click", function(){ location.reload(); });
    stage.appendChild(b);
  });
}

return { register: register, remeasure: remeasure };
})();
