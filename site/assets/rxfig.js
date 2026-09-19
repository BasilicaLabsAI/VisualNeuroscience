/* The receptor schematics, shared between the pages that draw them.

   scripts/receptors/build.py emits one drawing per kind of machine, with
   text slots a page fills in for the molecule it is showing and hover
   targets that tell the step each part plays. This holds the three things
   more than one page needs: the drawing with its slots filled, the kind's
   label as a row of words that open their meaning, and the one popup that
   serves both. Microanatomy's assets/rx.js builds its catalogue on top of
   these; the Region Atlas uses figure() to put the transmitter and its
   receptor under the density chart.

   Nothing here paints: assets/rxfig.css supplies every colour, so the
   drawings follow the page's theme. */
(function(){
  "use strict";

  function el(tag, cls, text){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* ── the drawing, its slots filled for one molecule ──────────────────
     An empty slot is removed rather than left as a stray label. */
  function diagram(kind, fill){
    var box = el("div", "rx-draw");
    box.setAttribute("data-arch", kind.arch);
    ["ligand", "ion", "g", "effect"].forEach(function(k){ box.setAttribute("data-" + k, fill[k] || ""); });
    box.innerHTML = kind.svg;
    var slots = box.querySelectorAll("[data-slot]");
    for (var i = 0; i < slots.length; i++){
      var s = slots[i], v = fill[s.getAttribute("data-slot")];
      if (v) s.textContent = v; else s.parentNode.removeChild(s);
    }
    return box;
  }
  /* what a tile passes to diagram(): its own transmitter, ion and G protein */
  function fillFor(item){
    return { ligand: item.lig, ion: item.ion, g: item.g, effect: item.eff, co: item.kind === "transporter" ? "Na⁺" : "" };
  }
  /* the kind's label as one button per word, each opening its meaning */
  function kicker(kind){
    var ck = el("span", "ck");
    kind.parts.forEach(function(part, i){
      if (i) ck.appendChild(document.createTextNode(" · "));
      var b = el("button", "rx-term");
      /* the brand face has no superscript digits, so Ca²⁺ is set as real superscripts */
      b.innerHTML = part.replace(/</g, "&lt;").replace(/²/g, "<sup>2</sup>").replace(/⁺/g, "<sup>+</sup>");
      b.type = "button"; b.setAttribute("data-term", part); b.setAttribute("aria-haspopup", "dialog");
      ck.appendChild(b);
    });
    return ck;
  }

  /* ── the popup ───────────────────────────────────────────────────────
     One for the page, whatever draws the parts. On a mouse it opens on
     hover and focus and closes when the pointer leaves; on a touch screen
     a tap opens it and a tap elsewhere, or Escape, closes it. */
  var attached = false;
  function stepFor(part, STEPS){
    var draw = part.closest(".rx-draw");
    var arch = draw && draw.getAttribute("data-arch");
    var st = STEPS[arch] && STEPS[arch][part.getAttribute("data-hot")];
    if (!st) return null;
    var fill = { lig: draw.getAttribute("data-ligand") || "the transmitter", ion: draw.getAttribute("data-ion") || "ions",
                 g: draw.getAttribute("data-g") || "Gα", eff: draw.getAttribute("data-effect") || "the effector" };
    var sub = function(s){ return s.replace(/\{(\w+)\}/g, function(_, k){ return fill[k] || ""; }); };
    var lines = (st.variants && st.variants[fill.eff]) || st.lines;
    return { title: (st.n ? "Step " + st.n + " · " : "") + sub(st.title), lines: lines.map(sub) };
  }
  function popups(G, STEPS){
    if (attached) return;
    attached = true;
    var pop = el("div", "rx-pop");
    pop.setAttribute("role", "dialog"); pop.hidden = true;
    var head = el("b"), body = el("ul");
    pop.appendChild(head); pop.appendChild(body);
    document.body.appendChild(pop);
    var current = null, pinned = false;
    function show(btn){
      var what;
      if (btn.classList.contains("rxd-hot")) what = stepFor(btn, STEPS);
      else { var term = btn.getAttribute("data-term"); if (G[term]) what = { title: term, lines: G[term] }; }
      if (!what) return;
      head.textContent = what.title; body.textContent = "";
      what.lines.forEach(function(line){ body.appendChild(el("li", null, line)); });
      pop.hidden = false; current = btn;
      /* a step's popup sits under the whole drawing, never over the part
         beside the one hovered; a word's popup sits under the word */
      var anchor = btn.classList.contains("rxd-hot") ? btn.closest(".rx-draw") : btn;
      var r = anchor.getBoundingClientRect(), w = Math.min(360, window.innerWidth - 24);
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
    var SEL = ".rx-term, .rxd-hot";
    document.addEventListener("click", function(e){
      var b = e.target.closest && e.target.closest(SEL);
      if (b){
        e.preventDefault();
        if (current === b && pinned){ hide(); return; }
        show(b); pinned = true; return;
      }
      if (!pop.contains(e.target)) hide();
    });
    if (window.matchMedia("(hover: hover)").matches){
      document.addEventListener("mouseover", function(e){
        var b = e.target.closest && e.target.closest(SEL);
        if (b && !pinned) show(b);
      });
      document.addEventListener("mouseout", function(e){
        var b = e.target.closest && e.target.closest(SEL);
        if (b && !pinned) hide();
      });
    }
    document.addEventListener("focusin", function(e){
      var b = e.target.closest && e.target.closest(SEL);
      if (b) show(b); else if (!pop.contains(e.target)) hide();
    });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape") hide();
      if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("rxd-hot")){ e.preventDefault(); show(e.target); pinned = true; }
    });
    window.addEventListener("scroll", function(){ if (current && !pinned) hide(); }, { passive: true });
  }

  /* ── the data ────────────────────────────────────────────────────────
     Both files, fetched once however many times a page asks. */
  var pending = null;
  function load(){
    if (!pending){
      pending = Promise.all([
        fetch("assets/rx/receptors.json").then(function(r){ if (!r.ok) throw new Error("receptors.json " + r.status); return r.json(); }),
        fetch("assets/nt/molecules.json").then(function(r){ return r.ok ? r.json() : null; }).catch(function(){ return null; })
      ]).then(function(got){
        var rx = got[0], nt = got[1];
        var byId = {}, groupOf = {};
        rx.groups.forEach(function(g){ g.items.forEach(function(it){ byId[it.id] = it; groupOf[it.id] = g; }); });
        var mols = {};
        if (nt) nt.groups.forEach(function(g){ g.items.forEach(function(m){ mols[m.id] = m; }); });
        return { rx: rx, kinds: rx.kinds, byId: byId, groupOf: groupOf, molecules: mols };
      });
    }
    return pending;
  }

  /* The Region Atlas names its receptors from its own catalogue, which
     grew from the PET and autoradiography sources rather than from this
     list; these are the few whose names differ, and the class-level
     entries, which borrow the drawing of their commonest member. */
  var ALIAS = {
    GABAA_BZ: "GABAA", ALPHA1: "ALPHA1A", ALPHA2: "ALPHA2A", "5HT2": "5HT2A",
    SST1: "SSTR1", SST2: "SSTR2", SST3: "SSTR3", SST4: "SSTR4"
  };
  /* which molecule stands for a family of receptors */
  var MOLECULE = {
    Glutamate: "glutamate", GABA: "gaba", Dopamine: "dopamine", Serotonin: "serotonin",
    Acetylcholine: "acetylcholine", Noradrenaline: "noradrenaline", Histamine: "histamine",
    Opioid: "enkephalin", Cannabinoid: "2ag"
  };
  function entryFor(data, id){
    return data.byId[id] || data.byId[ALIAS[id] || ""] || null;
  }

  /* ── the panel: the transmitter, then the receptor it lands on ─────── */
  function figure(host, opts){
    host.textContent = "";
    if (!opts || !opts.id) return Promise.resolve(false);
    return load().then(function(data){
      if (host.getAttribute("data-for") !== String(opts.id)) return false;   /* a later pick won the race */
      var it = entryFor(data, opts.id);
      var mol = data.molecules[MOLECULE[opts.family] || ""];
      if (!it && !mol){
        host.appendChild(el("p", "rxfig-none", "No drawing of " + (opts.name || "this receptor") + " yet."));
        return false;
      }
      if (mol){
        var f1 = el("figure");
        var box = el("div", "rx-draw");
        box.innerHTML = mol.svg;
        f1.appendChild(box);
        var c1 = el("figcaption");
        c1.appendChild(el("span", "ck", "What binds it"));
        c1.appendChild(el("span", "cn", mol.name));
        c1.appendChild(el("span", "cs", mol.role));
        f1.appendChild(c1);
        host.appendChild(f1);
      }
      if (it){
        var k = data.kinds[it.kind];
        var f2 = el("figure");
        f2.appendChild(diagram(k, fillFor(it)));
        var c2 = el("figcaption");
        c2.appendChild(kicker(k));
        c2.appendChild(el("span", "cn", it.name));
        if (it.plain) c2.appendChild(el("span", "cs", it.plain));
        c2.appendChild(el("p", "rxfig-does", it.effect));
        var a = el("a", "rxfig-more", "The whole entry →");
        a.href = "microanatomy.html#rx-" + it.id;
        c2.appendChild(a);
        f2.appendChild(c2);
        host.appendChild(f2);
        popups(data.rx.glossary, data.rx.steps);
      }
      return true;
    }).catch(function(err){
      if (window.console) console.warn(err);
      return false;
    });
  }

  window.VN_RXFIG = { load: load, diagram: diagram, fillFor: fillFor, kicker: kicker, popups: popups, figure: figure, el: el };
})();
