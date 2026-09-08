/* Cut the volume render open, and look inside.

   A 3D render shows the outside of the head. This puts a cut on each
   anatomical axis, so the voxels inside can be seen where the surface has
   been taken away — the scan itself on the cut face, with whatever the page
   has painted on the atlas cut through in the same stroke.

   Each control sits on the edge it works along: the up–down cut runs down
   one side, the front–back cut down the other, and the left–right cut along
   the bottom. They sit clear of the middle so the brain is never behind a
   slider, and each name reads in the direction its cut travels.

   Every slider starts in the centre, meaning nothing cut. Pushing it one way
   takes the head away from one side, pushing it the other way takes it from
   the other — the distance from centre is how deep the cut goes.

   Shared by every page carrying a volume render, so the tool behaves the
   same wherever it appears. Wire one up with:

     MN_SLICE.attach({ stage: <.mri-stage>, tools: <.view-tools>, nv: <Niivue> });
       → { open, close, reset, state, setState }

   Meshes are not clipped by this — clip planes act on the volume only —
   so a page whose 3D view is a tractogram gets nothing useful from it. */
window.MN_SLICE = (function(){

/* A cut is a plane whose normal comes from an azimuth and elevation. The
   negative half of each slider uses the opposite normal, which is the same
   plane cutting the other way: azimuth turned through 180°, elevation
   negated. */
var AXES = [
  /* flip turns a slider's sense round, so the end you push towards is the
     side that goes: without it the up–down and front–back cuts each took the
     opposite side to the one the thumb was moving to */
  {id:"ax",  label:"Axial",    edge:"left",   hint:"up – down",    flip:true},
  {id:"cor", label:"Coronal",  edge:"right",  hint:"front – back", flip:true},
  {id:"sag", label:"Sagittal", edge:"bottom", hint:"left – right"}
];
/* azimuth, elevation per axis, checked against the plane normals the viewer
   builds: 90 cuts left–right, 0 cuts front–back, elevation 90 cuts up–down */
var NORMAL = {
  sag: [90, 0],
  cor: [0, 0],
  ax:  [0, 90]
};

var STEP = 0.01;

function attach(o){
  var stage = o.stage, tools = o.tools, nv = o.nv;
  if (!stage || !tools || !nv) return null;

  var cuts = {}, on = false;
  AXES.forEach(function(ax){ cuts[ax.id] = 0; });

  /* The viewer paints a translucent sheet over the cut face by default,
     which is the opposite of the point — the cut is there to show the voxels
     underneath it, so the sheet is made fully transparent. */
  try{ nv.setClipPlaneColor([0, 0, 0, 0]); }catch(e){}

  var panel = document.createElement("div");
  panel.className = "slice-panel";

  var rows = {};
  AXES.forEach(function(ax){
    var edge = document.createElement("div");
    edge.className = "slice-edge " + ax.edge;

    var name = document.createElement("span");
    name.className = "ax";
    name.textContent = ax.label;

    var slider = document.createElement("input");
    slider.type = "range";
    slider.min = "-1"; slider.max = "1"; slider.step = String(STEP);
    slider.value = "0";
    slider.className = "slice-range";
    slider.setAttribute("aria-label", ax.label + " cut, " + ax.hint +
                        ". Centre is uncut; either direction cuts from that side.");

    slider.addEventListener("input", function(){
      cuts[ax.id] = Number(slider.value);
      edge.classList.toggle("cutting", Math.abs(cuts[ax.id]) > 0.005);
      apply();
    });
    /* a double-click on one slider returns just that axis */
    slider.addEventListener("dblclick", function(){ resetAxis(ax.id); });

    edge.appendChild(name);
    edge.appendChild(slider);
    panel.appendChild(edge);
    rows[ax.id] = {slider: slider, edge: edge};
  });

  stage.appendChild(panel);

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ts-btn slice-btn";
  btn.textContent = "Slice";
  btn.setAttribute("aria-pressed", "false");

  var resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "ts-btn slice-reset";
  resetBtn.textContent = "Reset cuts";
  resetBtn.hidden = true;

  /* before the Centre planes button, which holds the right-hand end */
  var centre = tools.querySelector(".centre-btn");
  if (centre){ tools.insertBefore(btn, centre); tools.insertBefore(resetBtn, centre); }
  else { tools.appendChild(btn); tools.appendChild(resetBtn); }

  function planes(){
    if (!on) return [];
    var out = [];
    AXES.forEach(function(ax){
      var v = cuts[ax.id] * (ax.flip ? -1 : 1);
      if (Math.abs(v) <= 0.005) return;            /* centred: nothing cut */
      var n = NORMAL[ax.id], azi = n[0], elev = n[1];
      if (v < 0){ azi = (azi + 180) % 360; elev = -elev; }
      /* depth 1 leaves the head whole, -1 takes all of it */
      out.push([1 - 2*Math.abs(v), azi, elev]);
    });
    return out;
  }

  function apply(){
    try{ nv.setClipPlanes(planes()); }
    catch(e){ /* a viewer without multi-plane clipping simply does nothing */ }
  }

  function resetAxis(id){
    cuts[id] = 0;
    rows[id].slider.value = "0";
    rows[id].edge.classList.remove("cutting");
    apply();
  }
  function resetAll(){
    AXES.forEach(function(ax){ resetAxis(ax.id); });
  }

  function setOn(next){
    on = next;
    panel.classList.toggle("on", on);
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", String(on));
    resetBtn.hidden = !on;
    apply();
  }

  btn.addEventListener("click", function(){ setOn(!on); });
  resetBtn.addEventListener("click", resetAll);

  /* the cuts as a plain object, so a saved view can carry them */
  function state(){
    var c = {}; AXES.forEach(function(ax){ c[ax.id] = cuts[ax.id]; });
    return { on: on, cuts: c };
  }
  function setState(st){
    if (!st || typeof st !== "object"){ resetAll(); setOn(false); return; }
    AXES.forEach(function(ax){
      var v = Number(st.cuts && st.cuts[ax.id]) || 0;
      v = Math.max(-1, Math.min(1, v));
      cuts[ax.id] = v;
      rows[ax.id].slider.value = String(v);
      rows[ax.id].edge.classList.toggle("cutting", Math.abs(v) > 0.005);
    });
    setOn(!!st.on);
  }

  return {
    open: function(){ setOn(true); },
    close: function(){ setOn(false); },
    reset: resetAll,
    state: state,
    setState: setState
  };
}

return { attach: attach, AXES: AXES };
})();
