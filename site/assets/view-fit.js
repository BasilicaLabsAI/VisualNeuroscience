/* The four views fitted to the screen, for the pages whose views sit two
   to a row in a .views-wrap (the 3D Region Atlas, the Network Atlas and
   the Hallucinations study).

   assets/atlas-views.css gives each stage the height that lets both rows
   fit under whatever is above the grid. That room is not a fixed number:
   the website's header is taller at some widths than others and absent in
   the app, the title strip steps aside on an iPad, and the Hallucinations
   study has its source above its views. So it is measured here, the top of
   the page down to the grid, together with the height of the bar over each
   view, and written onto the wrap as --views-room and --view-bar for the
   stylesheet to use. The room is taken with the page at rest: the header
   draws in once the page scrolls, and a measure taken then would size the
   stages for a header that is back to full when the page returns to the
   top. It is taken again whenever the header, the title strip or the grid
   changes size, when the header lets go, and when the window resizes.

     MN_FIT.attach(<.views-wrap>)   → { fit }
*/
window.MN_FIT = (function(){

function attach(wrap){
  if (!wrap) return null;
  var head = document.querySelector(".masthead");
  var strip = document.querySelector(".title-strip");
  var queued = 0;

  function fit(){
    queued = 0;
    if (head && head.classList.contains("stuck")) return;
    var top = wrap.getBoundingClientRect().top + (window.pageYOffset || document.documentElement.scrollTop || 0);
    var cap = wrap.querySelector(".views .view .view-cap");
    wrap.style.setProperty("--views-room", Math.max(0, Math.round(top)) + "px");
    if (cap) wrap.style.setProperty("--view-bar", Math.round(cap.getBoundingClientRect().height) + "px");
  }
  /* measured once layout has settled, never inside an observer's own turn */
  function soon(){
    if (queued) return;
    queued = requestAnimationFrame(fit);
  }

  fit();
  if (window.ResizeObserver){
    var ro = new ResizeObserver(soon);
    ro.observe(wrap);
    if (head) ro.observe(head);
    if (strip) ro.observe(strip);
    ro.observe(document.body);
  }
  if (head && window.MutationObserver){
    new MutationObserver(soon).observe(head, {attributes: true, attributeFilter: ["class"]});
  }
  window.addEventListener("resize", soon);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(soon);
  return { fit: fit };
}

return { attach: attach };
})();
