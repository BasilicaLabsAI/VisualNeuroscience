/* The scan machinery behind the vision windows: NiiVue instances built to
   one recipe, the shared selection colormap, the shared crosshair, and the
   plane-with-two-sliders block the 2D windows are made of.

   Every window calls into this; the bus (vision-bus.js) is the only thing
   that carries state between windows. Within a window the instances are
   kept in step directly. The crosshair travels as fractional coordinates,
   which is what NiiVue's crosshairPos already is, so nothing is converted
   anywhere. */
window.VS = (function(){

  var A = window.MN_ATLAS;
  var N = A.RAW_LABELS.length;
  var PALETTE = ["#915AD8","#D85AC9","#FE4B83","#FF7847","#E6C14C",
                 "#AFF05B","#52F667","#4AE8B7","#4FBEE3","#5575DD"];
  var byBase = {};
  A.REGIONS.forEach(function(r){ byBase[r.base] = r; });

  function hexToRgb(h){
    return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  }

  /* label colormap: transparent everywhere, colour where selected —
     exactly the Region Atlas page's recipe */
  function cmapFor(sels){
    var R = new Array(N).fill(0), G = new Array(N).fill(0),
        B = new Array(N).fill(0), Aa = new Array(N).fill(0), I = [];
    for (var i = 0; i < N; i++) I.push(i);
    (sels || []).forEach(function(s){
      var r = byBase[s.base];
      if (!r) return;
      var rgb = hexToRgb(s.color);
      [r.L, r.R].forEach(function(idx){
        R[idx] = rgb[0]; G[idx] = rgb[1]; B[idx] = rgb[2]; Aa[idx] = 255;
      });
    });
    return {R:R, G:G, B:B, A:Aa, I:I, labels: A.RAW_LABELS};
  }

  var instances = [];
  var applying = false;

  function applySel(sels){
    var cm = cmapFor(sels);
    instances.forEach(function(nv){
      try{
        if (nv.volumes && nv.volumes.length > 1){
          nv.volumes[1].setColormapLabel(cm);
          nv.updateGLVolume();
        }
      }catch(e){}
    });
  }

  function applyPos(p, skipNv){
    applying = true;
    instances.forEach(function(nv){
      if (nv === skipNv) return;
      try{ nv.scene.crosshairPos = p.slice(); nv.drawScene(); }catch(e){}
    });
    applying = false;
  }

  async function makeView(canvas, type, opts){
    opts = opts || {};
    var nv = new niivue.Niivue({
      backColor: [0, 0, 0, 1],
      crosshairColor: [0.96, 0.95, 0.93, 0.85],
      show3Dcrosshair: false,
      trustCalMinMax: true
    });
    await nv.attachToCanvas(canvas);
    await nv.loadVolumes([
      {url: A.TPL_URL,   name: "mni152.nii.gz", colormap: "gray", opacity: 1},
      {url: A.ATLAS_URL, name: "aal.nii.gz", opacity: 0.9}
    ]);
    nv.setSliceType(niivue.SLICE_TYPE[type.toUpperCase()]);
    if (window.MN_LIFE) MN_LIFE.register(nv);
    instances.push(nv);
    /* the atlas ships with a rainbow of its own; from the first frame it
       must show only what is selected — nothing, until the bus says so */
    try{
      nv.volumes[1].setColormapLabel(cmapFor(VB.state().sel || []));
      nv.updateGLVolume();
    }catch(e){}
    nv.onLocationChange = function(){
      if (applying) return;
      var p = nv.scene.crosshairPos.slice();
      applyPos(p, nv);
      if (opts.onPos) opts.onPos(p);
      VB.send("pos", [p[0], p[1], p[2]]);
    };
    return nv;
  }

  /* which crosshair component each slider of a view moves:
     h is the slider under the view, v the one at its right side */
  var AXES = {
    axial:    { h: 0, v: 1 },   /* left–right, then front–back  */
    coronal:  { h: 0, v: 2 },   /* left–right, then up–down     */
    sagittal: { h: 1, v: 2 }    /* front–back, then up–down     */
  };
  var CAPTION = { axial: "Axial · transverse", coronal: "Coronal · frontal",
                  sagittal: "Sagittal · median" };

  /* one plane: viewport, up/down slider on the right, left/right under */
  function buildPlane(host, key){
    var ax = AXES[key];
    host.classList.add("vplane");
    host.innerHTML =
      '<div class="vstage"><span class="vcap">' + CAPTION[key] + '</span>' +
      '<canvas></canvas><div class="vstatus">Loading the scan…</div></div>' +
      '<div class="vslider-wrap"><input class="vs vslider" type="range" min="0" max="1000" value="500" aria-label="' + key + ' up and down"></div>' +
      '<input class="vs hslider" type="range" min="0" max="1000" value="500" aria-label="' + key + ' left and right">';
    var canvas = host.querySelector("canvas");
    var status = host.querySelector(".vstatus");
    var vs = host.querySelector(".vslider");
    var hs = host.querySelector(".hslider");
    var stage = host.querySelector(".vstage");

    /* the rotated slider's length is its width, and its width must be the
       stage's height — CSS alone cannot say that, so it is measured */
    function sizeVS(){
      var h = stage.clientHeight;
      if (h > 40) vs.style.width = (h - 8) + "px";
    }
    sizeVS();
    window.addEventListener("resize", sizeVS);

    function syncSliders(p){
      hs.value = Math.round(p[ax.h] * 1000);
      vs.value = Math.round(p[ax.v] * 1000);
    }

    var ready = makeView(canvas, key, { onPos: syncSliders }).then(function(nv){
      status.classList.add("hidden");
      var st = VB.state();
      if (st.pos) { nv.scene.crosshairPos = st.pos.slice(); nv.drawScene(); }
      syncSliders(nv.scene.crosshairPos);
      if (window.MN_ZOOM) MN_ZOOM.attach({ stage: host.querySelector(".vstage"), nv: nv, mode: "slice" });

      function fromSlider(which, value){
        var p = nv.scene.crosshairPos.slice();
        p[which] = value / 1000;
        applyPos(p, null);
        VB.send("pos", [p[0], p[1], p[2]]);
      }
      hs.addEventListener("input", function(){ fromSlider(ax.h, +hs.value); });
      vs.addEventListener("input", function(){ fromSlider(ax.v, +vs.value); });
      VB.on("pos", function(p){ syncSliders(p); });
      return nv;
    }, function(err){
      status.textContent = "The scan could not load: " + (err && err.message || err);
      throw err;
    });
    return ready;
  }

  /* every window keeps itself in step with the bus */
  VB.on("pos", function(p){ applyPos(p, null); });
  VB.on("sel", function(sels){ applySel(sels); });

  function boot(nvReady){
    Promise.resolve(nvReady).then(function(){
      var st = VB.state();
      if (st.sel && st.sel.length) applySel(st.sel);
    });
  }

  return { makeView: makeView, buildPlane: buildPlane, applySel: applySel,
           applyPos: applyPos, boot: boot, PALETTE: PALETTE };
})();
