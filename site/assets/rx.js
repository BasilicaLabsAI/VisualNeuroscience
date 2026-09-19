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
      cap.appendChild(el("span", "cn", k.label));
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
        cap.appendChild(el("span", "ck", k.label));
        cap.appendChild(el("span", "cn", it.name));
        li.appendChild(cap);
        var rows = el("div", "rx-rows");
        rows.appendChild(row("Binds", it.binds));
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
  }

  fetch("assets/rx/receptors.json").then(function(r){
    if (!r.ok) throw new Error("receptors.json " + r.status);
    return r.json();
  }).then(render).catch(function(err){
    host.appendChild(el("p", "nt-note", "The receptor list could not be loaded. " + (navigator.onLine ? "" : "You seem to be offline.")));
    if (window.console) console.warn(err);
  });
})();
