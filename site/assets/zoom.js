/* Zooming a 3D view, by wheel on a desktop and by pinch on a touch screen.

   The viewer's own wheel handling moves the 2D pan zoom, which a box showing
   nothing but a render has no use for — so over a 3D box the wheel appeared
   to do nothing. This drives the 3D scale directly instead, and cancels the
   page scroll so the two do not fight.

   Pinch is the same idea for the same reason: the viewer reads touches as a
   drag and rotates, so two fingers spun the brain instead of zooming it.
   While two pointers are down the gesture is taken over here and the viewer
   is not told about it, which leaves one-finger drag rotating as before.

   Both listeners sit on the capture phase: the viewer stops these events
   propagating from its own canvas, so a listener waiting for the bubble
   would never hear them.

     MN_ZOOM.attach({ stage: <.mri-stage>, nv: <Niivue>, onZoom: fn });

   onZoom, if given, is handed the new scale — a page carrying its own zoom
   slider can follow along. MN_WHEEL is the name this went by when it only
   handled the wheel, kept so the pages calling it need not all change. */
window.MN_ZOOM = (function(){

var MIN = 0.3, MAX = 4, STEP = 1.12;

function clamp(v){ return Math.max(MIN, Math.min(MAX, Number(v) || 1)); }

function attach(o){
  var stage = o.stage, nv = o.nv;
  if (!stage || !nv) return null;

  function scale(next){
    next = clamp(next);
    if (!nv.scene) return null;
    if (next === Number(nv.scene.volScaleMultiplier)) return next;
    nv.scene.volScaleMultiplier = next;
    nv.drawScene();
    if (o.onZoom) o.onZoom(next);
    return next;
  }

  stage.addEventListener("wheel", function(e){
    e.preventDefault();
    if (!nv.scene) return;
    var now = Number(nv.scene.volScaleMultiplier) || 1;
    scale(e.deltaY > 0 ? now / STEP : now * STEP);
  }, {capture: true, passive: false});

  /* ── pinch ────────────────────────────────────────────────────────────
     Pointer events cover touch and pen alike. Two down means a pinch: the
     scale at the start of the gesture is multiplied by how much the gap
     between the fingers has changed since, so the zoom tracks the fingers
     rather than drifting with each move event. */
  var down = new Map(), startGap = 0, startScale = 1;

  function gap(){
    if (down.size < 2) return 0;
    var p = Array.from(down.values());
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }

  stage.addEventListener("pointerdown", function(e){
    if (e.pointerType === "mouse") return;
    down.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (down.size === 2){
      startGap = gap();
      startScale = Number(nv.scene && nv.scene.volScaleMultiplier) || 1;
      e.preventDefault();
      e.stopPropagation();
    }
  }, {capture: true, passive: false});

  stage.addEventListener("pointermove", function(e){
    if (!down.has(e.pointerId)) return;
    down.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (down.size !== 2 || !startGap) return;
    /* the viewer must not also read this as a drag, or it rotates mid-pinch */
    e.preventDefault();
    e.stopPropagation();
    var now = gap();
    if (now > 0) scale(startScale * (now / startGap));
  }, {capture: true, passive: false});

  function lift(e){
    if (!down.has(e.pointerId)) return;
    down.delete(e.pointerId);
    if (down.size < 2) startGap = 0;
  }
  stage.addEventListener("pointerup", lift, {capture: true});
  stage.addEventListener("pointercancel", lift, {capture: true});

  /* the browser must not claim the gesture for page scroll or page zoom */
  stage.style.touchAction = "none";

  return { set: function(v){ return scale(v); } };
}

return { attach: attach, MIN: MIN, MAX: MAX };
})();

/* the name the pages already call */
window.MN_WHEEL = window.MN_ZOOM;
