/* The Digital Textbook's folding: every chapter on the contents page and
   every section on a chapter page is a <details>, so the pages work with
   no script at all. This adds the two conveniences: a link into a folded
   section opens it (and its parent) so the target is on screen, and the
   Expand all / Collapse all buttons. */
(function(){
  "use strict";
  function openTarget(){
    var id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var d = el.closest ? el.closest("details") : null;
    while (d){ d.open = true; d = d.parentElement && d.parentElement.closest ? d.parentElement.closest("details") : null; }
    if (el.tagName === "DETAILS") el.open = true;
    /* the browser scrolled before the fold opened; scroll again now it has */
    setTimeout(function(){ el.scrollIntoView({ block: "start" }); }, 0);
  }
  window.addEventListener("hashchange", openTarget);
  openTarget();
  /* a video's player is only created when its fold is opened, so a page of
     a hundred sections does not load forty players on arrival */
  document.addEventListener("toggle", function(e){
    var d = e.target;
    if (!d.classList || !d.classList.contains("tb-video") || !d.open) return;
    var f = d.querySelector("iframe[data-src]");
    if (f){ f.src = f.getAttribute("data-src"); f.removeAttribute("data-src"); }
  }, true);
  /* a citation in the text opens the entry it cites right there, under the
     line, and closes on a second click or the cross */
  document.addEventListener("click", function(e){
    var c = e.target.closest && e.target.closest(".tb-cite");
    if (!c) return;
    var open = c.getAttribute("aria-expanded") === "true";
    var next = c.nextElementSibling;
    if (next && next.classList.contains("tb-cite-pop")) next.parentNode.removeChild(next);
    c.setAttribute("aria-expanded", open ? "false" : "true");
    if (open) return;
    var ref = document.getElementById(c.getAttribute("data-ref"));
    if (!ref) return;
    var pop = document.createElement("span");
    pop.className = "tb-cite-pop";
    pop.innerHTML = ref.innerHTML;
    var x = document.createElement("button");
    x.type = "button"; x.className = "tb-cite-x"; x.setAttribute("aria-label", "Close"); x.textContent = "×";
    x.addEventListener("click", function(){ pop.parentNode.removeChild(pop); c.setAttribute("aria-expanded", "false"); });
    pop.appendChild(x);
    c.parentNode.insertBefore(pop, c.nextSibling);
  });
  document.addEventListener("click", function(e){
    var b = e.target.closest && e.target.closest("[data-expand]");
    if (!b) return;
    var open = b.getAttribute("data-expand") === "all";
    document.querySelectorAll("details.tb-sec, details.tb-ch").forEach(function(d){ d.open = open; });
  });
})();
