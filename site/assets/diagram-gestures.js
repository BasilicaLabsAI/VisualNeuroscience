/* One gesture vocabulary for every flat diagram: pinch to zoom, two fingers
   to pan, and where a diagram turns, one finger keeps turning it.

   The same fingers must mean the same thing on every drawing on the site —
   the Brodmann cartoons, the border graph, the network ring, the circuit
   diagrams, the study figures — and on every platform the site ships to:
   iPad, iPhone, Mac, Android, and the plain web. So this speaks all three
   input dialects at once:

     touch      — two fingers pinch and pan in a single gesture (the point
                  gripped between the fingers stays gripped); one finger is
                  left alone, so the page still scrolls and taps still pick.
     trackpad   — a pinch arrives as ctrl+wheel in Chromium and Firefox and
                  as Safari's gesturechange (which is what the Mac app's
                  WKWebView speaks), both handled, both zooming about the
                  pointer.
     mouse      — ctrl+wheel zooms about the pointer; once zoomed, dragging
                  pans. On a diagram whose drag already turns it, panning
                  asks for shift so the two do not fight.

   Double-tap or double-click puts the diagram back the way it was.

   An <svg> is zoomed by writing its viewBox — real magnification, so the
   lines stay lines at any depth. An <img> is zoomed with a CSS transform
   inside its own box with the overflow clipped. Both are pure view changes:
   nothing in the diagram's own state is touched, so its clicks, selections
   and animations carry on underneath.

     MN_DIAG.attach({ svg: <svg> })            — a drawing with a viewBox
     MN_DIAG.attach({ img: <img> })            — a raster figure
     MN_DIAG.attach({ svg: ..., rotates: true }) — drag already turns it

   Returns { setBase(x,y,w,h), reset() }. setBase is for a diagram that
   recomputes its own viewBox on resize: hand the new box here instead of
   writing the attribute, and the current zoom is carried across. */
window.MN_DIAG = (function(){

var MAXZ = 8;

function attach(o){
  var el = o.svg || o.img;
  if (!el) return null;
  var isImg = String(el.tagName).toLowerCase() !== "svg";
  var stage = o.stage || (isImg ? el.parentElement : el);
  var rotates = !!o.rotates;
  if (isImg) stage.style.overflow = "hidden";

  /* the base box: for an svg its viewBox, for an image its own layout box
     (read lazily — a lazy-loaded figure has no size yet at attach time) */
  var bx = 0, by = 0, bw = 0, bh = 0;
  if (!isImg){
    var vb = (el.getAttribute("viewBox") || "0 0 100 100").trim().split(/[\s,]+/).map(Number);
    bx = vb[0]; by = vb[1]; bw = vb[2]; bh = vb[3];
  }

  /* the view: a zoom factor and a centre, in base units */
  var z = 1, cx = 0, cy = 0;

  function baseReady(){
    if (isImg){
      /* the base box is the container's layout box, which a transform on
         the image does not disturb; on resize the view centre rides along */
      var w = stage.clientWidth, h = stage.clientHeight;
      if (w && h && (w !== bw || h !== bh)){
        cx = bw ? (cx - bx)/bw * w : w/2;
        cy = bh ? (cy - by)/bh * h : h/2;
        bx = 0; by = 0; bw = w; bh = h;
      }
    }
    return bw > 0 && bh > 0;
  }
  if (!isImg){ cx = bx + bw/2; cy = by + bh/2; }

  function clampView(){
    z = Math.max(1, Math.min(MAXZ, z));
    var w = bw/z, h = bh/z;
    cx = Math.max(bx + w/2, Math.min(bx + bw - w/2, cx));
    cy = Math.max(by + h/2, Math.min(by + bh - h/2, cy));
  }

  function apply(){
    clampView();
    var w = bw/z, h = bh/z;
    if (isImg){
      /* translate then scale, both about the top-left corner */
      el.style.transformOrigin = "0 0";
      el.style.transform = z === 1 ? "" :
        "translate(" + (-(cx - w/2 - bx) * z) + "px," + (-(cy - h/2 - by) * z) + "px) scale(" + z + ")";
    } else {
      el.setAttribute("viewBox", (cx - w/2) + " " + (cy - h/2) + " " + w + " " + h);
    }
    stage.classList.toggle("diag-zoomed", z > 1.001);
  }

  /* screen px → base units. With preserveAspectRatio at its default the
     letterbox offsets do not move as the zoom changes (the box shrinks by
     exactly the factor the scale grows), so one rect read per event is
     enough and the mapping is linear: screenX = OX + (u - viewX)·k1·z. */
  function mapping(){
    /* the image's own rect moves with its transform, so its untransformed
       container does the measuring; an svg's rect is its layout box */
    var r = (isImg ? stage : el).getBoundingClientRect();
    var k1 = isImg ? 1 : Math.min(r.width/bw, r.height/bh);
    var ox = isImg ? r.left : r.left + (r.width  - bw*k1)/2;
    var oy = isImg ? r.top  : r.top  + (r.height - bh*k1)/2;
    return { k1: k1, ox: ox, oy: oy };
  }
  function toUnit(m, sx, sy){
    var w = bw/z, h = bh/z;
    return [ (cx - w/2) + (sx - m.ox)/(m.k1*z),
             (cy - h/2) + (sy - m.oy)/(m.k1*z) ];
  }
  /* set zoom and keep base point a under screen point (sx, sy) */
  function zoomKeeping(m, a, sx, sy, znew){
    z = Math.max(1, Math.min(MAXZ, znew));
    var w = bw/z, h = bh/z;
    cx = a[0] - (sx - m.ox)/(m.k1*z) + w/2;
    cy = a[1] - (sy - m.oy)/(m.k1*z) + h/2;
    apply();
  }

  function reset(){ z = 1; cx = bx + bw/2; cy = by + bh/2; apply(); }

  /* ── touch: two fingers, one combined pinch-and-pan ──────────────────── */
  var tZ = 1, tA = null, tGap = 0, touching = false;

  function mid(t){ return [(t[0].clientX + t[1].clientX)/2, (t[0].clientY + t[1].clientY)/2]; }
  function gap(t){ return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }

  stage.addEventListener("touchstart", function(e){
    if (e.touches.length < 2 || !baseReady()) return;
    e.preventDefault();
    if (rotates) e.stopPropagation();
    touching = true;
    tZ = z; tGap = gap(e.touches);
    var p = mid(e.touches);
    tA = toUnit(mapping(), p[0], p[1]);
  }, {passive: false});

  stage.addEventListener("touchmove", function(e){
    if (!touching || e.touches.length < 2) return;
    e.preventDefault();
    if (rotates) e.stopPropagation();
    var p = mid(e.touches), g = gap(e.touches);
    if (tGap > 0 && g > 0) zoomKeeping(mapping(), tA, p[0], p[1], tZ * g / tGap);
  }, {passive: false});

  function touchEnd(e){
    if (e.touches.length < 2){
      touching = false;
      if (z < 1.06 && z !== 1) reset();   /* near enough flat: snap home */
    }
  }
  stage.addEventListener("touchend", touchEnd);
  stage.addEventListener("touchcancel", touchEnd);

  /* ── Safari's trackpad pinch (gesture events; no touches involved) ───── */
  var gZ = 1;
  stage.addEventListener("gesturestart", function(e){
    e.preventDefault();
    if (!touching) gZ = z;
  });
  stage.addEventListener("gesturechange", function(e){
    e.preventDefault();
    if (touching || !baseReady()) return;
    var m = mapping();
    var a = toUnit(m, e.clientX, e.clientY);
    zoomKeeping(m, a, e.clientX, e.clientY, gZ * e.scale);
  });
  stage.addEventListener("gestureend", function(e){
    e.preventDefault();
    if (z < 1.06 && z !== 1) reset();
  });

  /* ── ctrl+wheel: a Chromium/Firefox trackpad pinch, or a deliberate
        mouse zoom. A plain wheel is left to the page, which owns it. ───── */
  stage.addEventListener("wheel", function(e){
    if (!e.ctrlKey && !e.metaKey) return;
    if (!baseReady()) return;
    e.preventDefault();
    var m = mapping();
    var a = toUnit(m, e.clientX, e.clientY);
    zoomKeeping(m, a, e.clientX, e.clientY, z * Math.exp(-e.deltaY * 0.003));
    if (z < 1.02 && z !== 1) reset();
  }, {passive: false});

  /* ── mouse: drag to pan once zoomed (shift+drag where drag rotates) ──── */
  var mDown = false, mMoved = false, mx = 0, my = 0;
  stage.addEventListener("pointerdown", function(e){
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (z <= 1.001) return;
    if (rotates && !e.shiftKey) return;
    mDown = true; mMoved = false; mx = e.clientX; my = e.clientY;
    if (rotates) e.stopPropagation();
  }, rotates ? {capture: true} : undefined);
  stage.addEventListener("pointermove", function(e){
    if (!mDown) return;
    var dx = e.clientX - mx, dy = e.clientY - my;
    if (!mMoved && Math.hypot(dx, dy) < 4) return;
    if (!mMoved){ mMoved = true; try{ stage.setPointerCapture(e.pointerId); }catch(_){} }
    var m = mapping();
    cx -= dx/(m.k1*z); cy -= dy/(m.k1*z);
    mx = e.clientX; my = e.clientY;
    apply();
    if (rotates) e.stopPropagation();
  }, rotates ? {capture: true} : undefined);
  function mUp(e){
    if (e.pointerType !== "mouse") return;
    mDown = false;
  }
  stage.addEventListener("pointerup", mUp);
  stage.addEventListener("pointercancel", mUp);
  /* a drag must not fall through as a click and pick something */
  stage.addEventListener("click", function(e){
    if (mMoved){ mMoved = false; e.preventDefault(); e.stopPropagation(); }
  }, {capture: true});

  /* ── double-tap or double-click puts it back ─────────────────────────── */
  var lastTap = 0;
  stage.addEventListener("pointerup", function(e){
    if (e.pointerType === "mouse") return;
    if (touching) { lastTap = 0; return; }
    var now = Date.now();
    if (now - lastTap < 400){ reset(); lastTap = 0; }
    else lastTap = now;
  });
  stage.addEventListener("dblclick", function(e){
    if (z > 1.001){ e.preventDefault(); reset(); }
  });

  return {
    setBase: function(x, y, w, h){
      var rx = bw ? (cx - bx)/bw : 0.5, ry = bh ? (cy - by)/bh : 0.5;
      bx = x; by = y; bw = w; bh = h;
      cx = bx + rx*bw; cy = by + ry*bh;
      apply();
    },
    reset: reset
  };
}

return { attach: attach };
})();
