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
  document.addEventListener("click", function(e){
    var b = e.target.closest && e.target.closest("[data-expand]");
    if (!b) return;
    var open = b.getAttribute("data-expand") === "all";
    document.querySelectorAll("details.tb-sec, details.tb-ch").forEach(function(d){ d.open = open; });
  });
})();
