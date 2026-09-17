/* The cell plate: one drawing of a brain cell, with its structures
   clickable, an index beside it, a test-yourself mode, and zoom and pan.

   A cell is two files in assets/cells/: the drawing itself, an SVG whose
   click targets carry data-part and whose recolourable pieces carry
   data-vis, and a JSON file naming each structure with its accent colour,
   where its label sits and what it does. Both are generated from code by
   scripts/cells/, so the drawing and the words stay in step. This file
   fetches the pair the page asks for and puts the drawing into the empty
   <svg> the page holds ready, then wires everything to it.

   More than one cell can be drawn the same way, so the tiles above the
   plate switch between them: each carries data-cell, the drawing it names
   is fetched, and the plate takes the frame that cell was drawn in rather
   than one shape for all. A switch leaves the page where it is and puts
   the cell in the address, so a particular cell can be linked to.

   The page supplies the rest of the DOM by id: plate, scroller, tip, side,
   detail, index, allon, explore, quiz, and the quiz controls. */
(function(){
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var svg = document.getElementById("plate"), scroller = document.getElementById("scroller");
  var tip = document.getElementById("tip");
  var side = document.getElementById("side"), detail = document.getElementById("detail"), index = document.getElementById("index");
  if (!svg || !scroller) return;
  var cell = svg.getAttribute("data-cell") || "multipolar-neuron";
  var plateName = document.getElementById("plateName");
  var plateNote = document.getElementById("plateNote");
  var defaultNote = plateNote ? plateNote.innerHTML : "";
  var tiles = Array.prototype.slice.call(document.querySelectorAll(".cellt[data-cell]"));
  var coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse) document.querySelectorAll(".verb").forEach(function(v){ v.textContent = "Tap"; });

  var PARTS = [], byId = {}, callout = null, centre = [600, 390], box = [1200, 780];
  var mode = "explore", sel = null, hov = null;

  function vis(id){ return svg.querySelectorAll('[data-vis="' + id + '"]'); }
  function flag(id, cls, on){ if (id) vis(id).forEach(function(e){ e.classList.toggle(cls, on); }); }
  function partOf(t){ var e = t && t.closest ? t.closest("[data-part]") : null; return e ? e.getAttribute("data-part") : null; }
  function el(name, attrs){ var e = document.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }

  /* ---------- selection, callout, side panel */
  function select(id, opts){
    opts = opts || {};
    if (sel) flag(sel, "on", false);
    sel = id || null;
    if (sel) flag(sel, "on", true);
    drawCallout(sel ? byId[sel] : null);
    if (mode === "explore"){ renderDetail(); markIndex(); }
    if (sel && opts.bringIntoView) bringIntoView(byId[sel]);
  }

  function drawCallout(p){
    if (!callout) return;
    callout.textContent = "";
    if (!p) return;
    var k = box[0] / Math.max(svg.getBoundingClientRect().width, 1);    /* drawing units per screen pixel */
    var fs = Math.min(30, Math.max(6, 14.5 * k));
    var ax = p.anchor[0], ay = p.anchor[1], lx = p.label[0], ly = p.label[1];
    var t = el("text", { x: lx, y: ly, "text-anchor": "middle", "dominant-baseline": "central", "class": "mn-lab-t", "font-size": fs.toFixed(1) });
    t.textContent = p.name;
    callout.appendChild(t);
    var bb = t.getBBox(), px = fs * 0.62, py = fs * 0.36;
    var bw = bb.width + 2 * px, bh = bb.height + 2 * py;
    var bx = Math.min(Math.max(lx - bw / 2, 6), box[0] - 6 - bw), by = Math.min(Math.max(ly - bh / 2, 6), box[1] - 6 - bh);
    t.setAttribute("x", (bx + bw / 2).toFixed(1)); t.setAttribute("y", (by + bh / 2).toFixed(1));
    var nx = Math.max(bx, Math.min(ax, bx + bw)), ny = Math.max(by, Math.min(ay, by + bh));
    var line = { x1: ax, y1: ay, x2: nx.toFixed(1), y2: ny.toFixed(1) };
    var halo = el("line", line); halo.setAttribute("class", "mn-lab-h");
    var lead = el("line", line); lead.setAttribute("class", "mn-lab-l");
    var rect = el("rect", { x: bx.toFixed(1), y: by.toFixed(1), width: bw.toFixed(1), height: bh.toFixed(1), "class": "mn-lab-r" });
    var dot = el("circle", { cx: ax, cy: ay, r: Math.min(6, Math.max(1.6, 3.1 * k)).toFixed(1), "class": "mn-lab-d" });
    callout.insertBefore(rect, t); callout.insertBefore(lead, rect); callout.insertBefore(halo, lead); callout.appendChild(dot);
  }

  function renderDetail(){
    detail.textContent = "";
    if (!sel){
      var h = document.createElement("h2"); h.textContent = "Pick a structure";
      var p0 = document.createElement("p"); p0.className = "hint";
      p0.textContent = (coarse ? "Tap" : "Click") + " a part of the cell, or choose from the list below. " + spelled(PARTS.length) + " are labelled.";
      detail.appendChild(h); detail.appendChild(p0); detail.style.removeProperty("--acc");
      return;
    }
    var p = byId[sel];
    detail.style.setProperty("--acc", p.acc);
    var bar = document.createElement("span"); bar.className = "bar";
    var h2 = document.createElement("h2"); h2.textContent = p.name;
    var d = document.createElement("p"); d.textContent = p.desc;
    detail.appendChild(bar); detail.appendChild(h2); detail.appendChild(d);
    if (p.aka){ var a = document.createElement("p"); a.className = "aka"; a.textContent = "Also called " + p.aka + "."; detail.appendChild(a); }
  }
  function spelled(n){
    var w = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty"];
    return w[n] || String(n);
  }

  function buildIndex(){
    index.textContent = "";
    PARTS.forEach(function(p){
      var li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.setAttribute("data-id", p.id); b.style.setProperty("--acc", p.acc);
      var sw = document.createElement("span"); sw.className = "sw";
      var nm = document.createElement("span"); nm.textContent = p.short || p.name;
      b.appendChild(sw); b.appendChild(nm); li.appendChild(b); index.appendChild(li);
      b.addEventListener("click", function(){ select(sel === p.id ? null : p.id, { bringIntoView: true }); });
      b.addEventListener("pointerenter", function(){ setHover(p.id, true); });
      b.addEventListener("pointerleave", function(){ setHover(null, true); });
      b.addEventListener("focus", function(){ setHover(p.id, true); });
      b.addEventListener("blur", function(){ setHover(null, true); });
    });
  }
  function markIndex(){
    index.querySelectorAll("button").forEach(function(b){
      var on = b.getAttribute("data-id") === sel;
      if (on) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current");
    });
  }

  /* ---------- hover + tooltip */
  function setHover(id, fromList){
    if (hov === id) return;
    if (hov) flag(hov, "hov", false);
    hov = id;
    if (hov) flag(hov, "hov", true);
    index.querySelectorAll("button").forEach(function(b){ b.classList.toggle("hov", !fromList && b.getAttribute("data-id") === hov); });
    if (!hov || fromList || mode !== "explore") tip.hidden = true;
  }
  svg.addEventListener("pointermove", function(e){
    if (e.pointerType === "touch") return;
    var id = partOf(e.target);
    setHover(id, false);
    if (id && mode === "explore" && !dragging){
      var r = svg.closest(".plate").getBoundingClientRect();
      tip.textContent = byId[id].name; tip.hidden = false;
      tip.style.left = (e.clientX - r.left) + "px"; tip.style.top = (e.clientY - r.top) + "px";
    } else tip.hidden = true;
  });
  svg.addEventListener("pointerleave", function(){ setHover(null, false); tip.hidden = true; });

  /* ---------- clicks + keyboard on the plate */
  function act(id){
    if (mode === "quiz"){ if (id) answer(id); return; }
    select(id && id !== sel ? id : null);
  }
  svg.addEventListener("click", function(e){ if (moved){ moved = false; return; } act(partOf(e.target)); });
  svg.addEventListener("keydown", function(e){
    if (e.key !== "Enter" && e.key !== " ") return;
    var id = partOf(e.target); if (!id) return;
    e.preventDefault(); act(id);
  });
  svg.addEventListener("focusin", function(e){ setHover(partOf(e.target), false); });
  svg.addEventListener("focusout", function(){ setHover(null, false); });
  function setPlateTabbing(on){
    svg.querySelectorAll("[data-part]").forEach(function(e){
      if (on){ e.setAttribute("tabindex", "0"); e.setAttribute("role", "button"); e.setAttribute("aria-label", "Unlabelled structure"); }
      else { e.removeAttribute("tabindex"); e.removeAttribute("role"); e.removeAttribute("aria-label"); }
    });
  }

  /* ---------- zoom + pan */
  var ZOOMS = [1, 1.6, 2.4, 3.4], zi = 0, dragging = false, moved = false, start = null;
  var zin = document.getElementById("zin"), zout = document.getElementById("zout");
  function setZoom(i, cx, cy){
    i = Math.max(0, Math.min(ZOOMS.length - 1, i));
    var r = scroller.getBoundingClientRect(), old = ZOOMS[zi], z = ZOOMS[i];
    if (cx == null){ cx = r.width / 2; cy = r.height / 2; }
    var fx = (scroller.scrollLeft + cx) / (r.width * old), sw = svg.getBoundingClientRect();
    var fy = (scroller.scrollTop + cy) / Math.max(sw.height, 1);
    zi = i; scroller.style.setProperty("--z", z); scroller.classList.toggle("zoomed", z > 1 || scroller.scrollWidth > scroller.clientWidth + 2 || svg.getBoundingClientRect().height > r.height + 2);
    var nh = svg.getBoundingClientRect().height;
    scroller.scrollLeft = fx * r.width * z - cx; scroller.scrollTop = fy * nh - cy;
    zout.disabled = zi === 0; zin.disabled = zi === ZOOMS.length - 1;
    if (sel) drawCallout(byId[sel]);
  }
  function centreOn(x, y){
    var w = svg.getBoundingClientRect(), r = scroller.getBoundingClientRect();
    scroller.scrollLeft = x / box[0] * w.width - r.width / 2; scroller.scrollTop = y / box[1] * w.height - r.height / 2;
  }
  function bringIntoView(p){
    if (!scroller.classList.contains("zoomed")) return;
    var w = svg.getBoundingClientRect(), r = scroller.getBoundingClientRect();
    var px = p.anchor[0] / box[0] * w.width - scroller.scrollLeft, py = p.anchor[1] / box[1] * w.height - scroller.scrollTop;
    if (px < 40 || py < 40 || px > r.width - 40 || py > r.height - 40) centreOn((p.anchor[0] + p.label[0]) / 2, (p.anchor[1] + p.label[1]) / 2);
  }
  zin.addEventListener("click", function(){ setZoom(zi + 1); });
  zout.addEventListener("click", function(){ setZoom(zi - 1); });
  scroller.addEventListener("pointerdown", function(e){
    if (e.pointerType !== "mouse" || e.button !== 0 || !scroller.classList.contains("zoomed")) return;
    start = { x: e.clientX, y: e.clientY, l: scroller.scrollLeft, t: scroller.scrollTop }; moved = false;
  });
  window.addEventListener("pointermove", function(e){
    if (!start) return;
    var dx = e.clientX - start.x, dy = e.clientY - start.y;
    if (!dragging && Math.abs(dx) + Math.abs(dy) > 5){ dragging = true; moved = true; scroller.classList.add("drag"); tip.hidden = true; }
    if (dragging){ scroller.scrollLeft = start.l - dx; scroller.scrollTop = start.t - dy; }
  });
  window.addEventListener("pointerup", function(){ start = null; if (dragging){ dragging = false; scroller.classList.remove("drag"); } });
  var rz; window.addEventListener("resize", function(){ clearTimeout(rz); rz = setTimeout(function(){ if (sel) drawCallout(byId[sel]); }, 120); });

  /* ---------- colour everything */
  var allon = document.getElementById("allon");
  allon.addEventListener("change", function(){ svg.classList.toggle("all-on", allon.checked); side.classList.toggle("all", allon.checked); });

  /* ---------- test mode */
  var q = null;
  var qcount = document.getElementById("qcount"), qname = document.getElementById("qname"), qfind = document.getElementById("qfind"), qfb = document.getElementById("qfb");
  var qnext = document.getElementById("qnext"), qreveal = document.getElementById("qreveal"), qagain = document.getElementById("qagain"), qticks = document.getElementById("qticks");
  function shuffle(a){ for (var i = a.length - 1; i > 0; i--){ var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function startQuiz(){
    q = { order: shuffle(PARTS.map(function(p){ return p.id; })), i: 0, tries: 0, first: 0, open: true };
    qticks.textContent = "";
    qticks.style.setProperty("--n", q.order.length);
    q.order.forEach(function(id){ var t = document.createElement("i"); t.style.setProperty("--acc", byId[id].acc); qticks.appendChild(t); });
    qagain.hidden = true; ask();
  }
  function ask(){
    select(null);
    q.tries = 0; q.open = true;
    var p = byId[q.order[q.i]];
    qcount.textContent = (q.i + 1) + " of " + q.order.length;
    qfind.textContent = "Find"; qname.textContent = p.find;
    qfb.textContent = (coarse ? "Tap" : "Click") + " it on the drawing."; qnext.hidden = true; qreveal.hidden = false;
    Array.prototype.forEach.call(qticks.children, function(t, k){ t.classList.toggle("now", k === q.i); });
  }
  function settle(found){
    var id = q.order[q.i], p = byId[id];
    q.open = false; select(id); bringIntoView(p);
    var clean = found && q.tries === 0; if (clean) q.first++;
    qticks.children[q.i].classList.add(clean ? "hit" : "miss");
    qfb.textContent = (found ? (clean ? "Yes, first try. " : "Yes. ") : "Here it is. ") + p.desc;
    qreveal.hidden = true; qnext.hidden = false;
    qnext.textContent = q.i === q.order.length - 1 ? "See your score" : "Next structure";
    qnext.focus({ preventScroll: true });
  }
  function answer(id){
    if (!q || !q.open) return;
    if (id === q.order[q.i]){ settle(true); return; }
    q.tries++;
    flag(id, "no", true); setTimeout(function(){ flag(id, "no", false); }, 520);
    qfb.textContent = (byId[id].that || "That’s " + byId[id].find) + ". Try again.";
    qfb.classList.remove("shake"); void qfb.offsetWidth; qfb.classList.add("shake");
  }
  qreveal.addEventListener("click", function(){ if (q && q.open){ q.tries++; settle(false); } });
  qnext.addEventListener("click", function(){
    if (q.i < q.order.length - 1){ q.i++; ask(); return; }
    select(null);
    Array.prototype.forEach.call(qticks.children, function(t){ t.classList.remove("now"); });
    qcount.textContent = "Finished"; qfind.textContent = "You found"; qname.textContent = q.first + " of " + q.order.length + " on the first try";
    qfb.textContent = q.first === q.order.length ? "A clean sweep." : "The paler marks below are the ones that took more than one go.";
    qnext.hidden = true; qreveal.hidden = true; qagain.hidden = false; qagain.focus({ preventScroll: true });
  });
  qagain.addEventListener("click", startQuiz);

  function setMode(m){
    mode = m;
    document.querySelectorAll(".modes button").forEach(function(b){ b.setAttribute("aria-pressed", String(b.getAttribute("data-mode") === m)); });
    document.getElementById("explore").hidden = m !== "explore";
    document.getElementById("quiz").hidden = m !== "quiz";
    tip.hidden = true; setHover(null, false);
    if (m === "quiz"){ allon.checked = false; svg.classList.remove("all-on"); side.classList.remove("all"); setPlateTabbing(true); startQuiz(); }
    else { q = null; setPlateTabbing(false); select(null); }
  }
  document.querySelectorAll(".modes button").forEach(function(b){ b.addEventListener("click", function(){ setMode(b.getAttribute("data-mode")); }); });

  /* ---------- loading a cell ----------
     Everything the last cell left behind is put back first, because the
     plate is reused rather than rebuilt: nothing selected, explore mode,
     no colour-everything, and the zoom back at its rest. */
  function fail(){
    detail.textContent = "";
    var h = document.createElement("h2"); h.textContent = "The drawing did not load";
    var p = document.createElement("p"); p.className = "hint"; p.textContent = "Check the connection and reload the page.";
    detail.appendChild(h); detail.appendChild(p);
  }
  function markTiles(){
    tiles.forEach(function(b){
      var on = b.getAttribute("data-cell") === cell;
      if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
      b.disabled = false;
    });
  }
  function load(name, fromTile){
    cell = name;
    sel = null; hov = null; q = null;
    callout = null; PARTS = []; byId = {};
    svg.classList.remove("ready", "all-on");
    side.classList.remove("all");
    if (allon) allon.checked = false;
    tip.hidden = true;
    if (mode !== "explore") setMode("explore");
    svg.setAttribute("data-cell", name);
    markTiles();
    return Promise.all([
      fetch("assets/cells/" + name + ".svg").then(function(r){ if (!r.ok) throw new Error(r.status); return r.text(); }),
      fetch("assets/cells/" + name + ".json").then(function(r){ if (!r.ok) throw new Error(r.status); return r.json(); })
    ]).then(function(got){
      if (cell !== name) return;                       /* a later switch won the race */
      var doc = new DOMParser().parseFromString(got[0], "image/svg+xml");
      var root = doc.documentElement;
      if (!root || root.nodeName !== "svg") throw new Error("not an svg");
      svg.textContent = "";
      Array.prototype.slice.call(root.childNodes).forEach(function(n){ svg.appendChild(document.importNode(n, true)); });
      if (root.getAttribute("aria-label")) svg.setAttribute("aria-label", root.getAttribute("aria-label"));
      /* the plate takes the frame the cell was drawn in, so a tall cell is
         not squeezed into a wide box */
      box = got[1].box || [1200, 780];
      svg.setAttribute("viewBox", "0 0 " + box[0] + " " + box[1]);
      scroller.style.setProperty("--ar", box[0] + "/" + box[1]);
      callout = svg.querySelector("#mn-callout");
      PARTS = got[1].parts || []; byId = {}; PARTS.forEach(function(p){ byId[p.id] = p; });
      centre = got[1].centre || [box[0] / 2, box[1] / 2];
      if (got[1].name && plateName) plateName.textContent = got[1].name;
      /* a cell may say what its own drawing does and does not promise; the
         caption written into the page is the fallback */
      if (plateNote){
        if (got[1].note){
          plateNote.textContent = got[1].note + " ";
          var verb = document.createElement("span"); verb.className = "verb";
          verb.textContent = coarse ? "Tap" : "Click";
          plateNote.appendChild(verb);
          plateNote.appendChild(document.createTextNode(" any part of the drawing to find out what it is."));
        } else plateNote.innerHTML = defaultNote;
      }
      svg.classList.add("ready");
      buildIndex(); renderDetail();
      zi = 0; scroller.scrollLeft = 0; scroller.scrollTop = 0;
      if (window.matchMedia("(max-width: 40rem)").matches){ setZoom(2); centreOn(centre[0], centre[1]); }
      else setZoom(0);
      if (fromTile){
        try { history.replaceState(history.state, "", "#cell=" + name); } catch (e){}
        var t = tiles.filter(function(b){ return b.getAttribute("data-cell") === name; })[0];
        if (t) t.focus({ preventScroll: true });
      }
    }).catch(function(err){ if (window.console) console.warn("cell plate:", err); fail(); });
  }
  tiles.forEach(function(b){
    b.addEventListener("click", function(){
      var want = b.getAttribute("data-cell");
      if (want && want !== cell) load(want, true);
    });
  });

  /* a cell named in the address opens on that cell */
  var asked = (location.hash.match(/^#cell=([\w-]+)$/) || [])[1];
  if (asked && tiles.some(function(b){ return b.getAttribute("data-cell") === asked; })) cell = asked;
  load(cell, false);
})();
