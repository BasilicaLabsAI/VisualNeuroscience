/* The scans' look in either theme, shared by the atlases that draw the
   MNI152 template in four views (the 3D Region Atlas, the Brodmann Area
   Atlas and the Network Atlas).

   Dark, the viewports are pure black, the scan's own background, so the
   two blend. Light, they are white and the crosshair is ink, and on white
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
*/
window.MN_LOOK = (function(){

function colours(){
  var dark = document.documentElement.getAttribute("data-theme") === "dark";
  return dark ? {back: [0, 0, 0, 1], cross: [1, 1, 1, 1], clear: false}
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

/* a press on the theme switch reaches the scans at once */
function follow(fn){
  new MutationObserver(fn).observe(document.documentElement, {attributes: true, attributeFilter: ["data-theme"]});
}

return { colours: colours, paint: paint, follow: follow };
})();
