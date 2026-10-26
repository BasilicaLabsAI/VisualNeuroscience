/* The views' bar, for the pages whose four views sit in a .views-wrap
   (the 3D Region Atlas, the Network Atlas and the Hallucinations study),
   and since v12.34 the Brodmann Area Atlas's brain, whose box holds the bar
   and the four views alike.

   Since v12.33, at the owner's word, the views carry no bars of their own,
   no names, expand buttons or borders: one bar at the top of the stage, an
   island like the bar along the foot, picks what the stage shows on every
   screen, All (the four two by two) or one view alone. Slice stands at its
   far left, the slice tool's switch, greyed while a flat view is shown
   alone, since the cuts are the 3D view's, and Regions beside it, which
   takes the cuts through the highlighted regions too: always on show
   since v12.37, at the owner's word, greyed while Slice is off or a flat
   view is shown (until then it stood only while slicing). The bar is as
   wide as its buttons and centred, as the header's island is, and slides
   sideways where they are wider than the screen (v12.37). On a phone the
   bar stands just under the line that says where the atlas is best
   experienced. The styles are in atlas-views.css and bar.css.

     var bar = MN_VIEWBAR.attach({ main: <main.screen>, key: "vn-atlas-view" })
       main holds the bar and the views and takes .all (bar names the bar
       itself where a page stands it elsewhere, the Brodmann page's in the
       bar along the foot on an iPad or a computer since v12.37); start, the view
       shown until the person picks one, is all unless given; key, where
       the pick is kept on the device, may be left out for a page that keeps
       it its own way, told of each pick through onPick(view) (the study,
       which keeps its views for the launch alone since v12.35)
       bar.show(key, keep)   all, render, axial, coronal or sagittal; keep
                             makes it the person's pick and remembers it
       bar.picked()          the person's pick, kept for a larger screen
     MN_VIEWBAR.slice(tool)  the slice tool, once the 3D view has it
     MN_VIEWBAR.paint()      after the tool's state changes

   The bar's foot, measured from the stage's top, is written onto the main
   as --vbar, so the sheets rising from the foot stop short of it; a bar
   with no .stage around it (the Brodmann page's) writes none. */
window.MN_VIEWBAR = (function(){

var page = null, tool = null;

function attach(o){
  var main = o.main, bar = o.bar || (main ? main.querySelector(".viewbar") : null);
  if (!bar) return null;
  var stage = bar.closest(".stage");
  var views = main.querySelectorAll(".views .view[data-box]");
  var viewBtns = bar.querySelectorAll("[data-view]");
  var sliceBtn = bar.querySelector(".vb-slice"), regionsBtn = bar.querySelector(".vb-regions");
  var now = o.start || "all", picked = now;
  if (o.key){
    try{
      var k = localStorage.getItem(o.key);
      if (k && (k === "all" || main.querySelector('.views .view[data-box="' + k + '"]'))) picked = k;
    }catch(e){}
  }

  function paint(){
    var st = tool ? tool.state() : null, on = !!(st && st.on);
    var flat = now !== "all" && now !== "render";
    if (sliceBtn){
      sliceBtn.disabled = !tool || flat;
      sliceBtn.classList.toggle("active", on && !flat);
      sliceBtn.setAttribute("aria-pressed", String(on && !flat));
    }
    if (regionsBtn){
      /* a tool with no regions to cut (none yet) takes the button away; otherwise it
         stands, usable while a cut can take the regions, lit while it does */
      var can = !!(st && typeof st.regions === "boolean"), usable = can && on && !flat, cut = usable && st.regions;
      regionsBtn.hidden = !!(st && !can);
      regionsBtn.disabled = !usable;
      regionsBtn.classList.toggle("active", cut);
      regionsBtn.setAttribute("aria-pressed", String(cut));
    }
  }
  function show(key, keep){
    if (keep) picked = key;
    now = key;
    main.classList.toggle("all", key === "all");
    views.forEach(function(v){ v.classList.toggle("shown", key === "all" || v.getAttribute("data-box") === key); });
    viewBtns.forEach(function(b){
      var lit = b.getAttribute("data-view") === key;
      b.classList.toggle("active", lit);
      b.setAttribute("aria-pressed", String(lit));
    });
    if (keep && o.key){ try{ localStorage.setItem(o.key, key); }catch(e){} }
    if (keep && o.onPick) o.onPick(key);
    paint();
    if (window.MN_LIFE) MN_LIFE.remeasure();
  }
  viewBtns.forEach(function(b){
    b.addEventListener("click", function(){ show(b.getAttribute("data-view"), true); });
  });
  if (sliceBtn) sliceBtn.addEventListener("click", function(){
    if (!tool) return;
    if (tool.state().on) tool.close(); else tool.open();
    paint();
  });
  if (regionsBtn) regionsBtn.addEventListener("click", function(){
    if (!tool) return;
    tool.setRegions(!tool.state().regions);
    paint();
  });

  /* the bar's foot from the stage's top, for the sheets; measured once
     layout has settled, never inside an observer's own turn */
  var queued = 0;
  function measure(){
    queued = 0;
    if (!stage) return;
    var foot = bar.offsetParent ? bar.getBoundingClientRect().bottom - stage.getBoundingClientRect().top : 0;
    main.style.setProperty("--vbar", Math.max(0, Math.round(foot)) + "px");
  }
  function soon(){ if (!queued) queued = requestAnimationFrame(measure); }
  measure();
  if (window.ResizeObserver){
    var ro = new ResizeObserver(soon);
    ro.observe(bar);
    if (stage) ro.observe(stage);
  }
  window.addEventListener("resize", soon);

  page = { show: show, picked: function(){ return picked; }, paint: paint };
  paint();
  return page;
}

return {
  attach: attach,
  slice: function(t){ tool = t; if (page) page.paint(); },
  paint: function(){ if (page) page.paint(); }
};
})();
