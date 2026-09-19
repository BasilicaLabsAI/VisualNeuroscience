/* The Receptors and channels section of the Microanatomy page.

   Fetches assets/rx/receptors.json, built by scripts/receptors/build.py,
   and lays it out: first the kinds of machine, each with its schematic
   and what the kind means; then the receptors, channels and transporters
   grouped by transmitter, each tile carrying its kind's schematic with
   the text slots filled in for that molecule (what binds it, which ion,
   which G protein, what the effector is), then what binds it and how
   tightly, what it does, and a disclosure with the kind's meaning and a
   line of context. No colours live here or in the JSON: the schematics
   refer to the page's custom properties. */
(function(){
  "use strict";
  var kindsHost = document.getElementById("rxKinds");
  var host = document.getElementById("rxGroups");
  if (!host || !kindsHost) return;

  function el(tag, cls, text){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  /* the kind's schematic, its slots filled for one molecule; an empty
     slot is removed rather than left as a stray label */
  function diagram(kind, fill){
    var box = el("div", "rx-draw");
    box.innerHTML = kind.svg;
    var slots = box.querySelectorAll("[data-slot]");
    for (var i = 0; i < slots.length; i++){
      var s = slots[i], v = fill[s.getAttribute("data-slot")];
      if (v) s.textContent = v; else s.parentNode.removeChild(s);
    }
    return box;
  }
  /* the kind's label as one button per part, each opening its popup */
  function kicker(k){
    var ck = el("span", "ck");
    k.parts.forEach(function(part, i){
      if (i) ck.appendChild(document.createTextNode(" · "));
      var b = el("button", "rx-term");
      /* the brand face has no superscript digits, so Ca²⁺ is set as real superscripts */
      b.innerHTML = part.replace(/</g, "&lt;").replace(/²/g, "<sup>2</sup>").replace(/⁺/g, "<sup>+</sup>");
      b.type = "button"; b.setAttribute("data-term", part); b.setAttribute("aria-haspopup", "dialog");
      ck.appendChild(b);
    });
    return ck;
  }
  function row(k, v){
    var r = el("div", "rx-row");
    r.appendChild(el("span", "rx-k", k));
    r.appendChild(el("span", "rx-v", v));
    return r;
  }

  function render(doc){
    var K = doc.kinds;
    Object.keys(K).forEach(function(id){
      var k = K[id];
      var card = el("div", "rx-kind");
      card.appendChild(diagram(k, { ligand: "transmitter", ion: "ions", g: "Gα", effect: "effector", co: "Na⁺" }));
      var cap = el("div", "rx-cap");
      cap.appendChild(kicker(k));
      cap.appendChild(el("p", "rx-means", k.means));
      card.appendChild(cap);
      kindsHost.appendChild(card);
    });
    doc.groups.forEach(function(g){
      var sec = el("section", "nt-group");
      sec.id = "rx-" + g.id;
      sec.appendChild(el("h3", "nt-gh", g.name));
      sec.appendChild(el("p", "nt-note", g.note));
      var grid = el("ul", "rx-grid");
      g.items.forEach(function(it){
        var k = K[it.kind];
        var li = el("li", "rx");
        li.id = "rx-" + it.id;
        li.appendChild(diagram(k, { ligand: it.lig, ion: it.ion, g: it.g, effect: it.eff, co: it.kind === "transporter" ? "Na⁺" : "" }));
        var cap = el("div", "rx-cap");
        cap.appendChild(kicker(k));
        cap.appendChild(el("span", "cn", it.name));
        if (it.plain) cap.appendChild(el("span", "cs", it.plain));
        li.appendChild(cap);
        var rows = el("div", "rx-rows");
        rows.appendChild(row("Binds", it.binds));
        if (it.drugs) rows.appendChild(row("Drugs", it.drugs));
        rows.appendChild(row("Does", it.effect));
        li.appendChild(rows);
        var more = el("details", "nt-more");
        more.appendChild(el("summary", null, "What the kind means"));
        more.appendChild(el("p", null, k.means));
        more.appendChild(el("p", "rx-note", it.note));
        li.appendChild(more);
        grid.appendChild(li);
      });
      sec.appendChild(grid);
      host.appendChild(sec);
    });
    host.classList.add("ready");
    popups(doc.glossary);
  }

  /* One popup for the whole page. On a mouse it opens on hover and focus
     and closes when the pointer leaves; on a touch screen a tap opens it
     and a tap anywhere else, or Escape, closes it. */
  function popups(G){
    var pop = el("div", "rx-pop");
    pop.setAttribute("role", "dialog"); pop.hidden = true;
    var head = el("b"), body = el("p");
    pop.appendChild(head); pop.appendChild(body);
    document.body.appendChild(pop);
    var current = null, pinned = false;
    function show(btn){
      var term = btn.getAttribute("data-term");
      if (!G[term]) return;
      head.textContent = term; body.textContent = G[term];
      pop.hidden = false; current = btn;
      var r = btn.getBoundingClientRect(), w = Math.min(360, window.innerWidth - 24);
      pop.style.width = w + "px";
      var x = Math.max(12, Math.min(r.left, window.innerWidth - w - 12));
      var below = r.bottom + 8 + pop.offsetHeight < window.innerHeight || r.top < pop.offsetHeight + 16;
      pop.style.left = (x + window.scrollX) + "px";
      pop.style.top = (below ? r.bottom + 8 : r.top - pop.offsetHeight - 8) + window.scrollY + "px";
      btn.setAttribute("aria-expanded", "true");
    }
    function hide(){
      if (current) current.removeAttribute("aria-expanded");
      pop.hidden = true; current = null; pinned = false;
    }
    var hover = window.matchMedia("(hover: hover)").matches;
    document.addEventListener("click", function(e){
      var b = e.target.closest && e.target.closest(".rx-term");
      if (b){
        e.preventDefault();
        if (current === b && pinned){ hide(); return; }
        show(b); pinned = true; return;
      }
      if (!pop.contains(e.target)) hide();
    });
    if (hover){
      document.addEventListener("mouseover", function(e){
        var b = e.target.closest && e.target.closest(".rx-term");
        if (b && !pinned) show(b);
      });
      document.addEventListener("mouseout", function(e){
        var b = e.target.closest && e.target.closest(".rx-term");
        if (b && !pinned && !(e.relatedTarget && pop.contains(e.relatedTarget))) hide();
      });
      pop.addEventListener("mouseleave", function(){ if (!pinned) hide(); });
    }
    document.addEventListener("focusin", function(e){
      var b = e.target.closest && e.target.closest(".rx-term");
      if (b) show(b); else if (!pop.contains(e.target)) hide();
    });
    document.addEventListener("keydown", function(e){ if (e.key === "Escape") hide(); });
    window.addEventListener("scroll", function(){ if (current && !pinned) hide(); }, { passive: true });
  }

  fetch("assets/rx/receptors.json").then(function(r){
    if (!r.ok) throw new Error("receptors.json " + r.status);
    return r.json();
  }).then(render).catch(function(err){
    host.appendChild(el("p", "nt-note", "The receptor list could not be loaded. " + (navigator.onLine ? "" : "You seem to be offline.")));
    if (window.console) console.warn(err);
  });
})();
