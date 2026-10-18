/* A view opened over the grid, for the atlases whose four views sit in a
   .views-wrap (the Region Atlas and the Network Atlas).

   Each view's bar ends in a button that lays that view over the whole grid,
   the same viewer at the size of all four, and puts it back. It grows out of
   its own box and returns into it (a placeholder keeps its cell, so the
   other three stay where they are); with reduced motion it simply appears
   and goes. Escape closes it too. The styles are in atlas-views.css.

     MN_EXPAND.attach(<.views-wrap>)
*/
window.MN_EXPAND = (function(){

function attach(wrap){
  if (!wrap) return null;
  var ICON_OPEN = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M9.5 2.5h4v4M13.5 2.5 9 7M6.5 13.5h-4v-4M2.5 13.5 7 9"/></svg>';
  var ICON_SHUT = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M13.5 6.5h-4v-4M9.5 6.5 14 2M2.5 9.5h4v4M6.5 9.5 2 14"/></svg>';
  var still = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var open = null, hold = null;

  function remeasure(){ if (window.MN_LIFE) MN_LIFE.remeasure(); }
  function nameOf(view){
    var b = view.querySelector(".view-cap b");
    return b ? b.textContent.trim() : "this";
  }
  function dress(btn, view, isOpen){
    btn.innerHTML = isOpen ? ICON_SHUT : ICON_OPEN;
    btn.setAttribute("aria-expanded", String(isOpen));
    btn.setAttribute("aria-label", (isOpen ? "Close the expanded " : "Expand the ") + nameOf(view) + " view");
    btn.title = isOpen ? "Back to the four views" : "Expand over the four views";
  }
  /* from one box to another: the view is laid out where it ends up and
     drawn as though it were still where it began, then let go */
  function glide(view, from, done){
    var to = view.getBoundingClientRect();
    if ((still && still.matches) || !view.animate || !to.width || !to.height){ done(); return; }
    var a = view.animate([
      { transformOrigin: "0 0", transform: "translate(" + (from.left - to.left) + "px," + (from.top - to.top) + "px) scale(" + (from.width / to.width) + "," + (from.height / to.height) + ")" },
      { transformOrigin: "0 0", transform: "none" }
    ], { duration: 320, easing: "cubic-bezier(.32,.72,0,1)" });
    a.onfinish = a.oncancel = done;
  }
  function expand(view, btn){
    var from = view.getBoundingClientRect();
    hold = document.createElement("div");
    hold.className = "view view-hold";
    hold.setAttribute("aria-hidden", "true");
    hold.style.order = getComputedStyle(view).order;
    hold.style.height = from.height + "px";
    view.parentNode.insertBefore(hold, view);
    open = view;
    wrap.classList.add("has-open");
    view.classList.add("open");
    dress(btn, view, true);
    remeasure();
    glide(view, from, remeasure);
  }
  function collapse(){
    var view = open;
    if (!view) return;
    var btn = view.querySelector(".view-expand");
    var from = view.getBoundingClientRect();
    open = null;
    view.classList.remove("open");
    view.classList.add("closing");
    wrap.classList.remove("has-open");
    if (hold){ hold.remove(); hold = null; }
    if (btn) dress(btn, view, false);
    remeasure();
    glide(view, from, function(){ view.classList.remove("closing"); remeasure(); });
  }

  wrap.querySelectorAll(".views .view").forEach(function(view){
    var cap = view.querySelector(".view-cap");
    if (!cap) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "view-expand";
    dress(btn, view, false);
    btn.addEventListener("click", function(){
      if (open === view) collapse();
      else if (!open) expand(view, btn);
    });
    (cap.querySelector(".view-end") || cap).appendChild(btn);
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape" && open && !e.defaultPrevented) collapse();
  });
  return { close: collapse };
}

return { attach: attach };
})();
