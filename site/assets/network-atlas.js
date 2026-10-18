/* The Network Atlas: the chord ring of brain states, and its regions on
   the scan.

   Picking a state lays every mapped region's ring colour on the scan; the
   picked region comes forward, the ones it couples to in the state hold at
   half strength, the rest fall back. The ring is read the other way too:
   with nothing pinned, the crosshair over a lit region reads it back on
   the ring.

   The page's scans open their door through MN_SCAN (network-atlas.html):
   a colour layer for the atlas's parcels, a repaint, the planes' centring,
   the crosshair's moves and the first viewer, for the 3D export. The page
   opens on the first state; #state=<id> opens it on that one, and the
   address follows the state picked. */
window.MN_NETWORK = (function(){
"use strict";

function $(id){ return document.getElementById(id); }
var svg = $("ring");
if (!svg || !window.MN_NET || !window.MN_RING || !window.MN_SCAN || !window.MN_ATLAS) return null;
var DATA = window.MN_NET;

/* Where each region lands on the atlas. The ring is drawn from the
   functional literature; AAL-116 is drawn from anatomy, and the two carve
   the brain up differently. Three kinds of entry, and the page shows which
   is which: exact (the parcel is the region), approx (the parcel contains
   the region but is larger, or the boundary the region needs is one AAL
   does not draw) and none (no parcel exists at all: nothing is painted,
   and the crosshair is parked at the published coordinate instead). */
var MAP = {
  mPFC: {fit:"approx", bases:["Frontal_Sup_Medial","Frontal_Med_Orb"],
         where:"Medial superior frontal gyrus and medial orbitofrontal cortex — the medial wall the mPFC occupies, drawn wider than the functional region."},
  PCC:  {fit:"approx", bases:["Cingulum_Post","Precuneus"],
         where:"Posterior cingulate and precuneus, taken together as the default-mode core."},
  dlPFC:{fit:"approx", bases:["Frontal_Mid"],
         where:"Middle frontal gyrus. The dorsolateral surface is most of it, but the parcel runs further forward and down than the functional region."},
  AI:   {fit:"approx", bases:["Insula"],
         where:"The whole insula. AAL-116 draws no anterior/posterior boundary, so the posterior insula is lit along with it."},
  dACC: {fit:"approx", bases:["Cingulum_Ant","Cingulum_Mid"],
         where:"Anterior and middle cingulate. The dorsal band the literature means straddles the boundary between the two parcels."},
  FEF:  {fit:"approx", bases:["Precentral"],
         where:"Precentral gyrus. The frontal eye fields sit at its junction with the middle frontal gyrus, and AAL draws no line there — this is the nearest whole parcel, and a much larger one."},
  IPS:  {fit:"approx", bases:["Parietal_Sup","Parietal_Inf"],
         where:"Superior and inferior parietal lobules. The sulcus itself is the border between them, so both are lit."},
  VStr: {fit:"none", mni:[9, 9, -8],
         where:"No parcel. The ventral striatum is not split out of AAL-116 — the caudate and putamen parcels run straight through it. The crosshair is at MNI (9, 9, −8), a coordinate commonly reported for the accumbens."},
  Put:  {fit:"exact", bases:["Putamen"], where:"Putamen."},
  VTA:  {fit:"none", mni:[0, -16, -13],
         where:"No parcel. AAL-116 stops above the midbrain and does not parcellate it. The crosshair is at MNI (0, −16, −13), in the tegmentum."},
  LC:   {fit:"none", mni:[5, -37, -22],
         where:"No parcel. The pons is outside AAL-116 altogether. The crosshair is at MNI (5, −37, −22), after the locus coeruleus coordinates of Keren et al. (2009)."},
  Amy:  {fit:"exact", bases:["Amygdala"], where:"Amygdala."},
  SMA:  {fit:"exact", bases:["Supp_Motor_Area"], where:"Supplementary motor area."},
  Cb:   {fit:"exact", bases:["Cerebelum_"], prefix:true,
         where:"All nine cerebellar lobules, left and right."}
};
DATA.NODES.forEach(function(n){ var m = MAP[n.id]; if (m) for (var k in m) n[k] = m[k]; });

/* How present a region is on the scan: the colour says which region, how
   far the colour is carried says how much it matters to what is showing.
   The label colormap's alpha is all or nothing, so the grades come from
   mixing each colour down towards the black behind the scan. */
var EMPH = { full: 1, mid: 0.52, faint: 0.2 };
var NONE = { id: "none", label: "None", title: "", anno: "", blurb: "", source: "", links: [], down: [], notes: {} };
var FIT_LABEL = { exact: "Measured parcel", approx: "Approximate", none: "Not in the atlas" };
var selected = null, selectedGroup = null, groupTouches = [];
function pinned(){ return selected || selectedGroup; }

function hexToRgb(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
function shade(h, k){ return hexToRgb(h).map(function(v){ return Math.round(v*k); }); }

/* which atlas parcels a region owns */
function parcelsOf(n){
  if (!n.bases) return [];
  var out = [];
  MN_ATLAS.REGIONS.forEach(function(r){
    var hit = n.prefix
      ? n.bases.some(function(b){ return r.base.indexOf(b) === 0; })
      : n.bases.indexOf(r.base) >= 0;
    if (!hit) return;
    if (r.L != null) out.push(r.L, r.R);
    if (r.S != null) out.push(r.S);
  });
  return out;
}
var parcelToNode = {};
DATA.NODES.forEach(function(n){ parcelsOf(n).forEach(function(idx){ parcelToNode[idx] = n.id; }); });

/* ── the ring ──────────────────────────────────────────────────────────── */
var ring = MN_RING.create({
  svg: svg, data: DATA,
  dashed: function(n){ return n.fit === "none"; },
  onHover: function(n){ if (!pinned()) read(n); },
  onLeave: function(){ if (!pinned()) unread(); },
  onSelect: function(n){ if (selected === n.id) deselect(); else select(n); },
  onGroupHover: function(g){ if (!pinned()) readGroup(g); },
  onGroupLeave: function(){ if (!pinned()) unread(); },
  onGroupSelect: function(g){ if (selectedGroup === g.id) deselect(); else selectGroup(g); },
  onBackground: function(){ if (pinned()) deselect(); }
});
if (window.MN_DIAG) MN_DIAG.attach({ svg: svg });

function stateNow(){ return ring.state || NONE; }
function active(){ return stateNow().id !== "none"; }

/* every mapped region is drawn in its ring colour; emphasis is what
   changes: the picked region comes forward, the ones it couples to in the
   state hold at half strength, the rest fall back */
function emphasisFor(n){
  if (selectedGroup){
    if (n.group === selectedGroup) return EMPH.full;
    return groupTouches.indexOf(n.id) >= 0 ? EMPH.mid : EMPH.faint;
  }
  if (!selected){
    var down = stateNow().down || [];
    return down.indexOf(n.id) >= 0 ? EMPH.mid : EMPH.full;
  }
  if (n.id === selected) return EMPH.full;
  return ring.isLinked(selected, n.id) ? EMPH.mid : EMPH.faint;
}
MN_SCAN.setLayer(function(){
  if (!active()) return null;
  var out = {};
  DATA.NODES.forEach(function(n){
    if (!n.bases) return;
    var rgb = shade(n.color, emphasisFor(n));
    parcelsOf(n).forEach(function(idx){ out[idx] = rgb; });
  });
  return out;
});
function repaint(){ MN_SCAN.repaint(); }

/* ── the reading ───────────────────────────────────────────────────────── */
function setWhere(text, badge, exact){
  var box = $("netWhereText");
  box.innerHTML = "";
  box.appendChild(document.createTextNode(text));
  var b = document.createElement("span");
  b.className = "fit" + (exact ? " exact" : "");
  b.textContent = badge;
  box.appendChild(b);
  $("netWhere").hidden = false;
}
function read(n){
  ring.focus(n.id);
  var st = stateNow(), down = (st.down || []).indexOf(n.id) >= 0;
  var g = DATA.GROUPS.filter(function(x){ return x.id === n.group; })[0];
  $("netKicker").textContent = (g ? g.label : n.group) + (down ? " · quiets here" : "");
  $("netName").textContent = n.full;
  $("netNote").textContent = (st.notes && st.notes[n.id]) || n.role;
  setWhere(n.where, FIT_LABEL[n.fit], n.fit === "exact");
}
function readGroup(g){
  groupTouches = ring.focusGroup(g.id);
  var members = ring.membersOf(g.id);
  var outside = groupTouches.filter(function(id){ return ring.byId[id] && ring.byId[id].group !== g.id; });
  var down = stateNow().down || [];
  var quiet = members.filter(function(n){ return down.indexOf(n.id) >= 0; });
  $("netKicker").textContent = "Network" + (quiet.length === members.length && members.length ? " · quiets here" : "");
  $("netName").textContent = g.label;
  $("netNote").textContent = g.role + " Here: " +
    members.map(function(n){ return n.id; }).join(", ") +
    (outside.length ? ", coupled to " + outside.join(", ") + "." : ", coupled to nothing in this state.") +
    (quiet.length && quiet.length < members.length
      ? " " + quiet.map(function(n){ return n.id; }).join(" and ") + " power down." : "");
  var drawn = members.filter(function(n){ return n.bases; }), missing = members.filter(function(n){ return !n.bases; });
  setWhere((drawn.length ? drawn.map(function(n){ return n.full; }).join("; ") + "." : "None of this network has a parcel on the atlas.") +
           (missing.length ? " Not on the atlas: " + missing.map(function(n){ return n.id; }).join(", ") + "." : ""),
           drawn.length + " of " + members.length + " drawn", false);
}
function unread(){
  ring.clear();
  $("netKicker").textContent = "The ring";
  $("netName").textContent = "Explore the ring";
  $("netNote").textContent = "Click a region — coloured threads strengthen, grey dashed threads fall quiet, and hollow markers power down.";
  $("netWhere").hidden = true;
}
/* picking a region or a network drives the scan as well as the ring */
function select(n){
  selected = n.id; selectedGroup = null; groupTouches = [];
  read(n); repaint();
  if (n.mni) MN_SCAN.centreMm(n.mni);
  else if (n.bases) MN_SCAN.centre(parcelsOf(n));
}
function selectGroup(g){
  selected = null; selectedGroup = g.id;
  readGroup(g); repaint();
  var parcels = [];
  ring.membersOf(g.id).forEach(function(n){ parcels.push.apply(parcels, parcelsOf(n)); });
  if (parcels.length) MN_SCAN.centre(parcels);
}
function deselect(){
  selected = null; selectedGroup = null; groupTouches = [];
  unread(); repaint();
}

/* …and the ring follows the crosshair back, while nothing is pinned */
var lastParcel = -1;
MN_SCAN.onLocation(function(d){
  if (!active() || pinned()) return;
  var parcel = -1;
  try{
    var vals = d && d.values;
    if (vals && vals.length > 1 && vals[1]) parcel = Math.round(vals[1].value || 0);
  }catch(e){ return; }
  if (parcel === lastParcel) return;
  lastParcel = parcel;
  var id = parcelToNode[parcel];
  if (id) read(ring.byId[id]); else unread();
});

/* ── the state ─────────────────────────────────────────────────────────── */
var sel = $("netState");
DATA.STATES.forEach(function(s){
  var o = document.createElement("option");
  o.value = s.id; o.textContent = s.label;
  sel.appendChild(o);
});
function stateById(id){
  for (var i = 0; i < DATA.STATES.length; i++) if (DATA.STATES[i].id === id) return DATA.STATES[i];
  return null;
}
var statOut = $("statState");
function showState(id){
  var st = stateById(id) || DATA.STATES[0];
  selected = null; selectedGroup = null; groupTouches = [];
  ring.setState(st);
  sel.value = st.id;
  $("netBlurb").textContent = st.blurb;
  if (statOut) statOut.textContent = st.label;
  var src = $("netSource");
  src.textContent = st.source || "";
  src.hidden = !st.source;
  unread(); repaint();
}
/* the address names the state, so a link opens the page on it */
function markAddress(id){
  try{ history.replaceState(history.state, "", location.pathname + location.search + "#state=" + id); }catch(e){}
}
sel.addEventListener("change", function(){ showState(sel.value); markAddress(sel.value); });

/* letting go of the pick: the whole state on the scan again */
var clearBtn = $("netClear");
if (clearBtn) clearBtn.addEventListener("click", function(){ if (pinned()) deselect(); });

var wt = $("netWt");
ring.setWeight(+wt.value);
wt.addEventListener("input", function(){ ring.setWeight(+wt.value); });

/* ── the state as a 3D model ───────────────────────────────────────────
   Each region with a parcel as its surface in its ring colour, carried as
   far as its emphasis on the scan; the three without one as a sphere at
   their published coordinate; the couplings as tubes between them; the
   brain around them. */
if (window.MN_EXPORT3D && $("export3d")){
  var x3d = MN_EXPORT3D.attach({
    host: $("export3d"),
    note: false,
    basename: function(){ return "network-" + stateNow().id; },
    options: [
      { id: "links", label: "The couplings in this state", checked: true },
      { id: "shell", label: "The brain surface", checked: true }
    ],
    build: function(ctx){
      return MN_EXPORT3D.volumes(MN_SCAN.instance(), MN_ATLAS.ATLAS_URL, MN_ATLAS.TPL_URL).then(function(v){
        var atlas = v[0], tpl = v[1], parts = [], centre = {}, st = stateNow();
        DATA.NODES.forEach(function(n){
          var rgb = MN_EXPORT3D.hexColour(n.color), em = emphasisFor(n);
          var alpha = em >= EMPH.full ? 1 : em >= EMPH.mid ? 0.7 : 0.4;
          var ps = parcelsOf(n);
          if (ps.length){
            parts.push(MN_EXPORT3D.labelSurface(atlas, ps, { name: n.full, colour: rgb, alpha: alpha }));
            centre[n.id] = MN_EXPORT3D.labelCentroid(atlas, ps);
          } else if (n.mni){
            parts.push(MN_EXPORT3D.sphere(n.mni, 5, { name: n.full, colour: rgb, alpha: alpha }));
            centre[n.id] = n.mni;
          }
        });
        if (ctx.options.links && st.links){
          var live = [], quiet = [];
          st.links.forEach(function(l){
            var a = centre[l.s], b = centre[l.t];
            if (!a || !b) return;
            (l.quiet ? quiet : live).push(MN_EXPORT3D.tube(a, b, 0.8 + 2.2 * l.w, { colour: [1, 1, 1] }));
          });
          if (live.length) parts.push(MN_EXPORT3D.merge(live, { name: "Couplings that strengthen", colour: [0.95, 0.93, 0.9] }));
          if (quiet.length) parts.push(MN_EXPORT3D.merge(quiet, { name: "Couplings that fall quiet", colour: [0.5, 0.5, 0.5], alpha: 0.5 }));
        }
        if (ctx.options.shell) parts.push(MN_EXPORT3D.brainSurface(tpl, { alpha: 0.2 }));
        return { name: "VisualNeuroscience network " + st.label, parts: parts };
      });
    }
  });
  /* the PNG of the four views goes under the 3D model's button, as on the
     Region Atlas */
  var shotRow = $("shotRow");
  if (x3d && x3d.button && x3d.button.parentNode && shotRow)
    x3d.button.parentNode.insertAdjacentElement("afterend", shotRow);
}

/* #state=<id> opens on that state (and #network=<id>, the Region Atlas's
   old link, on the way through); otherwise the first */
var m = location.hash.match(/^#(?:state|network)=([\w-]+)$/);
showState(m && stateById(m[1]) ? m[1] : DATA.STATES[0].id);

return { showState: showState, state: function(){ return stateNow().id; } };
})();
