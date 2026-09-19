/* The Receptors and channels section of the Microanatomy page.

   Fetches assets/rx/receptors.json, built by scripts/receptors/build.py,
   and lays it out: first the kinds of machine, each with its schematic and
   what the kind means; then the receptors, channels and transporters
   grouped by transmitter, each tile carrying its kind's schematic with the
   text slots filled in for that molecule, what binds it and how tightly,
   the drugs that act there, what it does, and a disclosure with the kind's
   meaning. Above the list sit two ways of narrowing it: a row of
   transmitters to isolate, and a search box. They work together — a search
   looks only inside whichever transmitter is picked.

   The drawings, the words behind them and the popup are assets/rxfig.js,
   shared with the Region Atlas; no colours live here or in the JSON. */
(function(){
  "use strict";
  var kindsHost = document.getElementById("rxKinds");
  var host = document.getElementById("rxGroups");
  var FIG = window.VN_RXFIG;
  if (!host || !kindsHost || !FIG) return;
  var el = FIG.el;

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
      card.appendChild(FIG.diagram(k, { ligand: "transmitter", ion: "ions", g: "Gα", effect: "effector", co: "Na⁺" }));
      var cap = el("div", "rx-cap");
      cap.appendChild(FIG.kicker(k));
      cap.appendChild(el("p", "rx-means", k.means));
      card.appendChild(cap);
      kindsHost.appendChild(card);
    });
    doc.groups.forEach(function(g){
      var sec = el("section", "nt-group");
      sec.id = "rx-" + g.id;
      sec.setAttribute("data-group", g.id);
      sec.appendChild(el("h3", "nt-gh", g.name));
      sec.appendChild(el("p", "nt-note", g.note));
      var grid = el("ul", "rx-grid");
      g.items.forEach(function(it){
        var k = K[it.kind];
        var li = el("li", "rx");
        li.id = "rx-" + it.id;
        li.appendChild(FIG.diagram(k, FIG.fillFor(it)));
        var cap = el("div", "rx-cap");
        cap.appendChild(FIG.kicker(k));
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
    FIG.popups(doc.glossary, doc.steps);
    narrow(doc);
  }

  /* ── narrowing the list: a transmitter, and words ─────────────────────
     A tile shows when it is in the transmitter picked and every word typed
     appears somewhere in it. Groups left with nothing go too, the kinds
     strip stands down while either is in use, and the count says what is
     showing out of what the transmitter allows. */
  function narrow(doc){
    var input = document.getElementById("rxSearch"),
        count = document.getElementById("rxCount"),
        chips = document.getElementById("rxFilter");
    var hay = [];
    doc.groups.forEach(function(g){
      g.items.forEach(function(it){
        var k = doc.kinds[it.kind];
        var text = [it.name, it.plain, g.name, k.label, it.lig, it.ion, it.g, it.eff, it.binds, it.drugs, it.effect, it.note].join(" ").toLowerCase();
        hay.push({ el: document.getElementById("rx-" + it.id), group: g.id, text: text.replace(/[‐-―]/g, "-") });
      });
    });
    var filters = doc.filters || [], picked = "all", timer = null;
    var byId = {}; filters.forEach(function(f){ byId[f.id] = f; });

    if (chips && filters.length){
      var seen = {};
      filters.forEach(function(f){
        if (f.kind !== "all" && !seen[f.kind]){
          seen[f.kind] = true;
          chips.appendChild(el("span", "rx-chip-label", f.kind === "mono" ? "Monoamines" : "Everything else"));
        }
        var n = f.groups.length ? hay.filter(function(h){ return f.groups.indexOf(h.group) !== -1; }).length : hay.length;
        var b = el("button", "rx-chip" + (f.kind === "mono" ? " mono" : "") + (f.id === "all" ? " on" : ""));
        b.type = "button"; b.setAttribute("data-filter", f.id);
        b.setAttribute("aria-pressed", f.id === "all" ? "true" : "false");
        b.appendChild(document.createTextNode(f.label));
        b.appendChild(el("small", null, String(n)));
        chips.appendChild(b);
      });
      chips.addEventListener("click", function(e){
        var b = e.target.closest && e.target.closest(".rx-chip");
        if (!b) return;
        picked = b.getAttribute("data-filter");
        chips.querySelectorAll(".rx-chip").forEach(function(o){
          var on = o === b;
          o.classList.toggle("on", on);
          o.setAttribute("aria-pressed", on ? "true" : "false");
        });
        apply();
      });
    }

    function apply(){
      var f = byId[picked] || byId.all || { groups: [] };
      var inFilter = function(h){ return !f.groups.length || f.groups.indexOf(h.group) !== -1; };
      var words = input ? input.value.toLowerCase().replace(/[‐-―]/g, "-").split(/\s+/).filter(Boolean) : [];
      var shown = 0, within = 0;
      hay.forEach(function(h){
        var ok = inFilter(h);
        if (ok) within++;
        if (ok) ok = words.every(function(w){ return h.text.indexOf(w) !== -1; });
        h.el.hidden = !ok; if (ok) shown++;
      });
      host.querySelectorAll(".nt-group").forEach(function(sec){
        sec.hidden = !sec.querySelector(".rx:not([hidden])");
      });
      var narrowed = words.length > 0 || picked !== "all";
      kindsHost.classList.toggle("searching", narrowed);
      if (count) count.textContent = narrowed ? shown + " of " + (words.length ? within : hay.length) : "";
    }
    if (input){
      input.addEventListener("input", function(){ clearTimeout(timer); timer = setTimeout(apply, 80); });
      input.addEventListener("search", apply);
    }
    if (input && input.value) apply();
  }

  fetch("assets/rx/receptors.json").then(function(r){
    if (!r.ok) throw new Error("receptors.json " + r.status);
    return r.json();
  }).then(render).catch(function(err){
    host.appendChild(el("p", "nt-note", "The receptor list could not be loaded. " + (navigator.onLine ? "" : "You seem to be offline.")));
    if (window.console) console.warn(err);
  });
})();
