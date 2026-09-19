/* The Neurotransmitters section of the Microanatomy page.

   Fetches assets/nt/molecules.json, drawn by scripts/neurotransmitters/
   build.py, and lays it out: one heading and note per group, then a tile
   per molecule holding its skeletal formula (inline SVG, so it takes the
   page's colours), its name, what it is for, and a disclosure with a few
   lines on what it does. No colours live here or in the JSON: the SVG
   paths refer to --ink and --el-* and the stylesheet supplies them. */
(function(){
  "use strict";
  var host = document.getElementById("ntGroups");
  if (!host) return;

  function el(tag, cls, text){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  /* C10H16N5O13P3 → C₁₀H₁₆N₅O₁₃P₃, with the charge kept as a superscript */
  function formula(f){
    var s = el("span", "nt-f");
    var m = f.match(/^([A-Za-z0-9]+)([+-]\d*)?$/);
    var body = m ? m[1] : f, charge = m && m[2] ? m[2] : "";
    body.split(/(\d+)/).forEach(function(part){
      if (!part) return;
      if (/^\d+$/.test(part)){ var sub = el("sub", null, part); s.appendChild(sub); }
      else s.appendChild(document.createTextNode(part));
    });
    if (charge){ var sup = el("sup", null, charge); s.appendChild(sup); }
    return s;
  }

  function render(doc){
    doc.groups.forEach(function(g){
      var sec = el("section", "nt-group");
      sec.id = "nt-" + g.id;
      var h = el("h3", "nt-gh", g.name);
      sec.appendChild(h);
      sec.appendChild(el("p", "nt-note", g.note));
      var grid = el("ul", "nt-grid");
      g.items.forEach(function(it){
        var li = el("li", "nt");
        li.id = "nt-" + it.id;
        var draw = el("div", "nt-draw");
        draw.innerHTML = it.svg;
        li.appendChild(draw);
        var cap = el("div", "nt-cap");
        var ck = el("span", "ck");
        ck.appendChild(document.createTextNode(g.kind + " · "));
        ck.appendChild(formula(it.formula));
        cap.appendChild(ck);
        cap.appendChild(el("span", "cn", it.name));
        cap.appendChild(el("span", "cs", it.role));
        li.appendChild(cap);
        var more = el("details", "nt-more");
        more.appendChild(el("summary", null, "What it does"));
        more.appendChild(el("p", null, it.desc));
        li.appendChild(more);
        grid.appendChild(li);
      });
      sec.appendChild(grid);
      host.appendChild(sec);
    });
    host.classList.add("ready");
  }

  fetch("assets/nt/molecules.json").then(function(r){
    if (!r.ok) throw new Error("molecules.json " + r.status);
    return r.json();
  }).then(render).catch(function(err){
    var p = el("p", "nt-note", "The drawings could not be loaded. " + (navigator.onLine ? "" : "You seem to be offline."));
    host.appendChild(p);
    if (window.console) console.warn(err);
  });
})();
