/* The scans' look in either theme, shared by the pages that draw the
   MNI152 template in four views (the 3D Region Atlas, the Network Atlas and
   the Hallucinations study).

   Dark, the viewports are the page's own black, #111111, the paper the app
   and every page stand on (v12.1, at the owner's word; a scan's pure black
   until then), so a scan sits in the page rather than in a well of its own:
   the template is zero outside the brain and its scale is clear there, so
   the ground shows through. Light, they are white and the crosshair is ink, and on white
   nothing in the slices is black: the template is zero outside the brain,
   so in the light theme its scale is clear at zero, letting the white
   through, and above zero it reads like a stained section rather than a
   scan, fluid white, grey matter the darkest grey, white matter pale. Each
   step is a place in the plain scale's window (0 its bottom, 1 its top) and
   a lightness; the clear end is white too, so the brain's edge fades into
   the page instead of drawing a dark rim. The 3D render keeps the plain
   scale, which already draws the brain alone.

     MN_LOOK.colours()      → {back, cross, clear} for a new viewer
     MN_LOOK.paint(views)   views: [{nv, slice}], the template first in each
     MN_LOOK.follow(fn)     fn runs whenever the theme switches
     MN_LOOK.labelTable(n, names) → {R, G, B, A, I, labels}, every entry
                            clear, for a page to paint and hand the viewer
*/
window.MN_LOOK = (function(){

function colours(){
  var dark = document.documentElement.getAttribute("data-theme") === "dark";
  return dark ? {back: [0.067, 0.067, 0.067, 1], cross: [1, 1, 1, 1], clear: false}
              : {back: [1, 1, 1, 1], cross: [0.067, 0.067, 0.067, 1], clear: true};
}

var LIGHT_STEPS = [[-0.05, 1], [0.30, 0.45], [0.50, 0.40], [0.70, 0.55], [0.90, 0.80], [1, 0.86]];
function lightScale(w){
  var I = [0, 1], L = [255, 255], A = [0, 255];
  LIGHT_STEPS.forEach(function(s){
    var i = Math.round(255 * (w.min + s[0] * (w.max - w.min)) / w.max);
    if (i > I[I.length - 1] && i <= 255){ I.push(i); L.push(Math.round(255 * s[1])); A.push(255); }
  });
  if (I[I.length - 1] < 255){ I.push(255); L.push(L[L.length - 1]); A.push(255); }
  return {R: L, G: L.slice(), B: L.slice(), A: A, I: I};
}

function paint(views){
  var c = colours();
  views.forEach(function(v){
    var nv = v.nv;
    if (!nv) return;
    nv.opts.backColor = c.back;
    nv.opts.crosshairColor = c.cross;
    var vol = nv.volumes && nv.volumes[0];
    nv.opts.isAlphaClipDark = c.clear && v.slice;
    if (v.slice && vol){
      if (!vol.vnWindow) vol.vnWindow = {min: vol.cal_min, max: vol.cal_max};
      var w = vol.vnWindow;
      if (c.clear && w.max > 0){
        nv.addColormap("vn-gray-light", lightScale(w));
        vol.colormap = "vn-gray-light"; vol.cal_min = 0; vol.cal_max = w.max;
      } else {
        vol.colormap = "gray"; vol.cal_min = w.min; vol.cal_max = w.max;
      }
      try{ nv.updateGLVolume(); }catch(e){}
    }
    try{ nv.drawScene(); }catch(e){}
  });
}

/* The parcels' colour table is padded to a power of two. The viewer looks
   each label's colour up in a filtered texture as wide as the table and
   makes the faintest trace of opacity whole; at a width like the atlas's
   117 a label's lookup could catch a trace of the entry above it, and the
   label just below a painted one was drawn solid in its own clear colour,
   black (the right insula, under the left anterior cingulate). At a power
   of two every lookup lands exactly on its own entry. */
function labelTable(n, names){
  var w = 1;
  while (w < n) w *= 2;
  var t = {R: [], G: [], B: [], A: [], I: [], labels: []};
  for (var i = 0; i < w; i++){
    t.R.push(0); t.G.push(0); t.B.push(0); t.A.push(0); t.I.push(i);
    t.labels.push(names && names[i] != null ? names[i] : "");
  }
  return t;
}

/* a press on the theme switch reaches the scans at once */
function follow(fn){
  new MutationObserver(fn).observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
}

return { colours: colours, paint: paint, follow: follow, labelTable: labelTable };
})();
