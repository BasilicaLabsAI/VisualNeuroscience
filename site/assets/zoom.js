/* One gesture vocabulary for every scan view: pinch to zoom, two fingers
   to pan, one finger doing what the view has always done — turning the 3D
   model, or moving the crosshair on a slice.

   The viewer's own touch handling reads a pinch as a coarse stepped zoom
   and has no two-finger pan at all, and its wheel moves the 2D pan zoom,
   which a box showing nothing but a render has no use for. So whenever two
   fingers are down the gesture is taken over here — pointer events carry
   the geometry, and a capture-phase touch listener swallows the touch
   events so the viewer's own pinch cannot fight this one. One finger is
   never touched, which leaves drag-to-turn and drag-the-crosshair as they
   were.

     MN_ZOOM.attach({ stage, nv, onZoom })                — a 3D render
     MN_ZOOM.attach({ stage, nv, mode: "slice" })         — a 2D slice

   A render zooms by the scene's volume scale and pans by the viewer's
   model offset, which slides the model across the screen whatever way it
   is turned. A slice zooms and pans through pan2Dxyzmm, whose convention
   is screen ∝ pan + zoom·mm — keeping a gripped point under the fingers is
   then one linear correction through canvasPos2frac.

   Desktop speaks the same language: the wheel zooms a render (as it always
   has here), ctrl+wheel zooms a slice about the pointer (a trackpad pinch
   arrives exactly so; Safari's arrives as gesturechange, also handled),
   and shift+drag pans either. Double-tap or double-click puts a view back.

   Both listeners sit on the capture phase: the viewer stops these events
   propagating from its own canvas, so a listener waiting for the bubble
   would never hear them. MN_WHEEL is the name this went by when it only
   handled the wheel, kept so the pages calling it need not all change. */
window.MN_ZOOM = (function(){

var MIN = 0.3, MAX = 4, STEP = 1.12;      /* 3D volume scale */
var MIN2 = 1, MAX2 = 8;                   /* 2D slice zoom   */

function attach(o){
  var stage = o.stage, nv = o.nv;
  if (!stage || !nv) return null;
  var slice = o.mode === "slice";

  /* ── 3D: scale and screen-aligned pan ─────────────────────────────────── */

  function scale(next){
    next = Math.max(MIN, Math.min(MAX, Number(next) || 1));
    if (!nv.scene) return null;
    if (next === Number(nv.scene.volScaleMultiplier)) return next;
    nv.scene.volScaleMultiplier = next;
    nv.drawScene();
    if (o.onZoom) o.onZoom(next);
    return next;
  }

  /* The render's projection is an orthographic box whose short screen side
     spans 2·(0.8·furthestFromPivot/scale) scene units, and the viewer's
     `position` slides the model in the camera frame — x mirrored by the
     radiological flip, y up where the screen's is down. So many pixels of
     finger travel convert to so many scene units, both axes negated. */
  function pan3d(dx, dy){
    var s = Number(nv.scene && nv.scene.volScaleMultiplier) || 1;
    var e = 0.8 * (nv.furthestFromPivot || nv.furthestVertexFromOrigin || 100) / s;
    var u = 2 * e / Math.min(stage.clientWidth || 1, stage.clientHeight || 1);
    var p = nv.position || [0, 0, 0];
    nv.position = [p[0] - dx * u, p[1] - dy * u, p[2]];
    nv.drawScene();
  }

  /* ── 2D: zoom and pan through pan2Dxyzmm ──────────────────────────────── */

  function pan2(){
    if (!nv.scene.pan2Dxyzmm) nv.scene.pan2Dxyzmm = [0, 0, 0, 1];
    return nv.scene.pan2Dxyzmm;
  }
  function mmAt(cxs, cys){
    var c = nv.canvas;
    if (!c) return null;
    var r = c.getBoundingClientRect();
    var dpr = (nv.uiData && nv.uiData.dpr) || window.devicePixelRatio || 1;
    var f;
    try { f = nv.canvasPos2frac([(cxs - r.left) * dpr, (cys - r.top) * dpr]); }
    catch(_){ return null; }
    if (!f || f[0] < 0) return null;
    var mm = nv.frac2mm(f);
    return [mm[0], mm[1], mm[2]];
  }
  /* Set the slice zoom and land the gripped point back under the fingers.
     The convention is screen ∝ pan + zoom·mm, so with `under` the mm point
     now beneath the fingers (read from the frame on screen, before any
     change) and `a` the mm point gripped at the start of the gesture, the
     pan that puts a under the fingers at the new zoom is one line:
     pan += z_old·under − z_new·a. A plain zoom about a point is the same
     line with under = a, which is exactly the viewer's own crosshair-zoom
     arithmetic. */
  function zoom2To(a, under, znew){
    var p = pan2(), z0 = p[3];
    p[3] = Math.max(MIN2, Math.min(MAX2, znew));
    if (a && under){
      p[0] += z0 * under[0] - p[3] * a[0];
      p[1] += z0 * under[1] - p[3] * a[1];
      p[2] += z0 * under[2] - p[3] * a[2];
    }
    nv.drawScene();
  }
  function settle2(){
    var p = pan2();
    if (Math.abs(p[3] - 1) < 0.08 && (p[3] !== 1 || p[0] || p[1] || p[2])){
      p[0] = 0; p[1] = 0; p[2] = 0; p[3] = 1;
      nv.drawScene();
    }
  }

  function reset(){
    if (slice){
      nv.scene.pan2Dxyzmm = [0, 0, 0, 1];
      nv.drawScene();
    } else {
      nv.position = [0, 0, 0];
      scale(1);
    }
  }

  /* ── wheel ────────────────────────────────────────────────────────────── */

  stage.addEventListener("wheel", function(e){
    if (!nv.scene) return;
    if (slice){
      /* the plain wheel walks through the slices, which the viewer owns;
         ctrl+wheel — a deliberate zoom, or a trackpad pinch — is ours */
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      var a = mmAt(e.clientX, e.clientY);
      zoom2To(a, a, pan2()[3] * Math.exp(-e.deltaY * 0.003));
      settle2();
    } else {
      e.preventDefault();
      var now = Number(nv.scene.volScaleMultiplier) || 1;
      scale(e.deltaY > 0 ? now / STEP : now * STEP);
    }
  }, {capture: true, passive: false});

  /* ── two fingers: pinch and pan in a single gesture ───────────────────── */

  var down = new Map(), startGap = 0, startScale = 1, startZ2 = 1;
  var anchor = null, lastMid = null;

  function pts(){ return Array.from(down.values()); }
  function gap(){
    if (down.size < 2) return 0;
    var p = pts();
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }
  function mid(){
    var p = pts();
    return [(p[0].x + p[1].x)/2, (p[0].y + p[1].y)/2];
  }

  stage.addEventListener("pointerdown", function(e){
    if (e.pointerType === "mouse") return;
    down.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (down.size === 2){
      startGap = gap();
      lastMid = mid();
      if (slice){
        startZ2 = pan2()[3];
        anchor = mmAt(lastMid[0], lastMid[1]);
      } else {
        startScale = Number(nv.scene && nv.scene.volScaleMultiplier) || 1;
      }
      e.preventDefault();
      e.stopPropagation();
    }
  }, {capture: true, passive: false});

  stage.addEventListener("pointermove", function(e){
    if (!down.has(e.pointerId)) return;
    down.set(e.pointerId, {x: e.clientX, y: e.clientY});
    if (down.size !== 2 || !startGap) return;
    /* the viewer must not also read this as a drag, or it turns mid-pinch */
    e.preventDefault();
    e.stopPropagation();
    var g = gap(), m = mid();
    if (g <= 0) return;
    if (slice){
      var under = mmAt(m[0], m[1]);
      zoom2To(anchor, under || anchor, startZ2 * (g / startGap));
    } else {
      scale(startScale * (g / startGap));
      if (lastMid) pan3d(m[0] - lastMid[0], m[1] - lastMid[1]);
    }
    lastMid = m;
  }, {capture: true, passive: false});

  function lift(e){
    if (!down.has(e.pointerId)) return;
    down.delete(e.pointerId);
    if (down.size < 2){
      startGap = 0; anchor = null; lastMid = null;
      if (slice) settle2();
    }
  }
  stage.addEventListener("pointerup", lift, {capture: true});
  stage.addEventListener("pointercancel", lift, {capture: true});
  /* a finger lifted outside the stage must not leave a ghost behind */
  window.addEventListener("pointerup", lift, {capture: true});
  window.addEventListener("pointercancel", lift, {capture: true});

  /* the viewer's own touch handlers would fight the takeover — its pinch
     still steps the zoom underneath this one — so while two fingers are
     down the touch events are swallowed before its canvas can hear them */
  ["touchstart", "touchmove"].forEach(function(t){
    stage.addEventListener(t, function(e){
      if (e.touches.length >= 2){
        e.preventDefault();
        e.stopPropagation();
      }
    }, {capture: true, passive: false});
  });

  /* ── Safari's trackpad pinch (gesture events; no touches involved) ────── */

  var gBase = 1;
  stage.addEventListener("gesturestart", function(e){
    e.preventDefault();
    if (down.size >= 2) return;
    gBase = slice ? pan2()[3] : (Number(nv.scene && nv.scene.volScaleMultiplier) || 1);
  });
  stage.addEventListener("gesturechange", function(e){
    e.preventDefault();
    if (down.size >= 2) return;
    if (slice){
      var a = mmAt(e.clientX, e.clientY);
      zoom2To(a, a, gBase * e.scale);
    } else {
      scale(gBase * e.scale);
    }
  });
  stage.addEventListener("gestureend", function(e){
    e.preventDefault();
    if (slice) settle2();
  });

  /* ── shift+drag pans with a mouse ─────────────────────────────────────── */

  var mDrag = false, mAnchor = null, mx = 0, my = 0;
  stage.addEventListener("pointerdown", function(e){
    if (e.pointerType !== "mouse" || e.button !== 0 || !e.shiftKey) return;
    mDrag = true; mx = e.clientX; my = e.clientY;
    if (slice) mAnchor = mmAt(e.clientX, e.clientY);
    e.preventDefault();
    e.stopPropagation();
  }, {capture: true, passive: false});
  stage.addEventListener("pointermove", function(e){
    if (!mDrag) return;
    e.preventDefault();
    e.stopPropagation();
    if (slice){
      if (mAnchor){
        var p = pan2(), now = mmAt(e.clientX, e.clientY);
        if (now){
          p[0] += p[3] * (now[0] - mAnchor[0]);
          p[1] += p[3] * (now[1] - mAnchor[1]);
          p[2] += p[3] * (now[2] - mAnchor[2]);
          nv.drawScene();
        }
      }
    } else {
      pan3d(e.clientX - mx, e.clientY - my);
    }
    mx = e.clientX; my = e.clientY;
  }, {capture: true, passive: false});
  function mEnd(e){
    if (e.pointerType === "mouse") { mDrag = false; mAnchor = null; }
  }
  stage.addEventListener("pointerup", mEnd, {capture: true});
  stage.addEventListener("pointercancel", mEnd, {capture: true});

  /* ── double-tap or double-click puts the view back ────────────────────── */

  var lastTap = 0, tapStart = null;
  stage.addEventListener("pointerdown", function(e){
    if (e.pointerType === "mouse") return;
    tapStart = down.size <= 1 ? {x: e.clientX, y: e.clientY} : null;
  }, {capture: true});
  stage.addEventListener("pointerup", function(e){
    if (e.pointerType === "mouse" || !tapStart) return;
    if (down.size){ lastTap = 0; return; }
    if (Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) > 8){ lastTap = 0; return; }
    var now = Date.now();
    if (now - lastTap < 400){ reset(); lastTap = 0; }
    else lastTap = now;
  }, {capture: true});
  stage.addEventListener("dblclick", function(e){
    e.preventDefault();
    e.stopPropagation();
    reset();
  }, {capture: true});

  /* the browser must not claim the gesture for page scroll or page zoom */
  stage.style.touchAction = "none";

  return { set: function(v){ return slice ? null : scale(v); }, reset: reset };
}

return { attach: attach, MIN: MIN, MAX: MAX };
})();

/* the name the pages already call */
window.MN_WHEEL = window.MN_ZOOM;
