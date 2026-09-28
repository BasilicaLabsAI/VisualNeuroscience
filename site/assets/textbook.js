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

/* The central dogma figure. A note, or a part of the drawing, lights its
   step while the pointer is on it; a tap holds it and a second tap lets
   go. And everything drawn carries a name and a line on what it is, shown
   in a label that follows the pointer, or sits where a finger tapped.
   Without this the figure is simply a drawing with four notes. */
(function(){
  "use strict";
  var box = document.querySelector(".tb-dogma");
  if (!box) return;
  var svg = box.querySelector(".tb-dogma-svg");
  var tip = box.querySelector(".tb-dogma-tip");
  var held = "";
  function lit(v){
    box.setAttribute("data-lit", v);
    box.querySelectorAll(".tb-dogma-note").forEach(function(n){
      n.classList.toggle("lit", v !== "" && n.getAttribute("data-step") === v);
    });
  }
  function wire(el){
    var s = el.getAttribute("data-step");
    el.addEventListener("mouseenter", function(){ if (!held) lit(s); });
    el.addEventListener("mouseleave", function(){ if (!held) lit(""); });
    el.addEventListener("click", function(){ held = held === s ? "" : s; lit(held); });
  }
  box.querySelectorAll(".tb-dogma-note, .tb-dogma-svg [data-step]").forEach(wire);

  /* the bases are told apart by their class, everything else by its own attributes */
  var BASES = {
    A: ["Adenine (A)", "A purine base. In DNA it pairs with thymine; in RNA, with uracil."],
    T: ["Thymine (T)", "A pyrimidine base found in DNA and not in RNA. It pairs with adenine."],
    G: ["Guanine (G)", "A purine base. It pairs with cytosine, held by three hydrogen bonds, the strongest pair."],
    C: ["Cytosine (C)", "A pyrimidine base. It pairs with guanine in DNA and RNA alike."],
    U: ["Uracil (U)", "The base RNA uses in place of thymine. It pairs with adenine when the mRNA is read."]
  };
  var hot = null;
  function infoFor(el){
    while (el && el !== svg){
      var cls = el.getAttribute && el.getAttribute("class") || "";
      var m = /\bb-([ATGCU])\b/.exec(cls);
      if (m) return { el: el, name: BASES[m[1]][0], sub: BASES[m[1]][1] };
      if (el.getAttribute && el.getAttribute("data-name")) return { el: el, name: el.getAttribute("data-name"), sub: el.getAttribute("data-sub") || "" };
      el = el.parentNode;
    }
    return null;
  }
  function show(info, x, y){
    if (hot && hot !== info.el) hot.classList.remove("dg-hot");
    hot = info.el; hot.classList.add("dg-hot");
    tip.querySelector("b").innerHTML = info.name;
    tip.querySelector("span").innerHTML = info.sub;
    tip.hidden = false;
    var r = box.getBoundingClientRect();
    var left = x - r.left + 14, top = y - r.top + 14;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    if (left + w > r.width - 8) left = Math.max(8, x - r.left - w - 14);
    if (top + h > r.height - 8) top = Math.max(8, y - r.top - h - 14);
    tip.style.left = left + "px"; tip.style.top = top + "px";
  }
  function hide(){
    tip.hidden = true;
    if (hot){ hot.classList.remove("dg-hot"); hot = null; }
  }
  svg.addEventListener("pointermove", function(e){
    if (e.pointerType === "touch") return;
    var info = infoFor(e.target);
    if (info) show(info, e.clientX, e.clientY); else hide();
  });
  svg.addEventListener("pointerleave", hide);
  /* a finger has no hover: a tap shows the label where it landed, a tap on nothing clears it */
  svg.addEventListener("click", function(e){
    var info = infoFor(e.target);
    if (!info || (hot === info.el && !tip.hidden && e.pointerType === "touch")){ hide(); return; }
    show(info, e.clientX, e.clientY);
  });
})();

/* The cell figure. Every organelle is a part; hovering one names it in a
   label, a click or a tap, or a name in the list, puts its subtitle and
   description in the panel and lights every copy of it. */
(function(){
  "use strict";
  var box = document.querySelector(".tb-cell");
  if (!box) return;
  var svg = box.querySelector(".tb-cell-svg");
  var tip = box.querySelector(".tb-cell-tip");
  var data;
  try { data = JSON.parse(box.querySelector(".tb-cell-data").textContent); } catch (e) { return; }
  var side = { kicker: box.querySelector("#tb-cell-kicker"), name: box.querySelector("#tb-cell-name"),
               sub: box.querySelector("#tb-cell-sub"), desc: box.querySelector("#tb-cell-desc") };
  var rest = { kicker: side.kicker.innerHTML, name: side.name.innerHTML, sub: side.sub.innerHTML, desc: side.desc.innerHTML };
  var current = "";
  function partOf(el){
    while (el && el !== svg){
      if (el.getAttribute && el.getAttribute("data-part")) return el.getAttribute("data-part");
      el = el.parentNode;
    }
    return "";
  }
  function select(key){
    current = key === current ? "" : key;
    box.classList.toggle("has-sel", current !== "");
    box.querySelectorAll("[data-part]").forEach(function(el){
      el.classList.toggle("sel", current !== "" && el.getAttribute("data-part") === current);
    });
    var d = current ? data[current] : null;
    side.kicker.innerHTML = d ? "In the cell" : rest.kicker;
    side.name.innerHTML = d ? d.name : rest.name;
    side.sub.innerHTML = d ? d.sub : rest.sub;
    side.desc.innerHTML = d ? d.desc : rest.desc;
  }
  var hot = null;
  function hover(key, x, y){
    if (hot && hot !== key){ box.querySelectorAll(".tb-cell-svg .hot").forEach(function(el){ el.classList.remove("hot"); }); }
    hot = key;
    if (!key){ tip.hidden = true; return; }
    svg.querySelectorAll('[data-part="' + key + '"]').forEach(function(el){ el.classList.add("hot"); });
    tip.innerHTML = data[key] ? data[key].name : key;
    tip.hidden = false;
    var r = box.getBoundingClientRect();
    var left = x - r.left + 14, top = y - r.top + 14;
    if (left + tip.offsetWidth > r.width - 8) left = Math.max(8, x - r.left - tip.offsetWidth - 14);
    if (top + tip.offsetHeight > r.height - 8) top = Math.max(8, y - r.top - tip.offsetHeight - 14);
    tip.style.left = left + "px"; tip.style.top = top + "px";
  }
  svg.addEventListener("pointermove", function(e){
    if (e.pointerType === "touch") return;
    hover(partOf(e.target), e.clientX, e.clientY);
  });
  svg.addEventListener("pointerleave", function(){ hover("", 0, 0); });
  svg.addEventListener("click", function(e){
    var key = partOf(e.target);
    if (!key) return;
    select(key);
    tip.hidden = true;
  });
  box.querySelectorAll(".tb-cell-parts button").forEach(function(b){
    b.addEventListener("click", function(){ select(b.getAttribute("data-part")); });
  });
})();
