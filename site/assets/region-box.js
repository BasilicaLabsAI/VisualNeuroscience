/* The region box as a widget (v12.59, at the owner's word): the 3D Region
   Atlas's region picker and Highlighted list, carried to the Tractography
   page so a person can pick regions there and see the streamlines through
   them. It builds its parts inside the box it is given, keeps the selection
   (each entry a region as the atlas keeps one: a pair, one side or a single
   structure, with its colour from the atlas's palette) and tells the page of
   every change; the page does what the selection means. The picker is the
   atlas's own, line for line where it could be: the list built from
   MN_ATLAS.REGIONS by lobe, a pair or its two sides by the Mirror toggle,
   searched by name, lobe or what a region does (region-notes.js), the arrow
   keys walking it while the focus stays in the field, Enter or a press
   adding the region. Beside it stands a switch the atlas has not, which the
   page reads: All through, Ending in or Connecting (the third since v12.75,
   at the owner's word; until then All through or Connecting, the latter
   meaning through two of them). All three stand greyed while nothing is
   highlighted and Connecting while fewer than two regions are; it turns
   itself to Connecting the moment the list goes from one region to two,
   the person's own choice kept after that and put back as the list falls
   below two; and under the Mirror toggle a second, Highlight the regions,
   off to begin with (v12.60, at the owner's word), which the page reads to
   draw the regions themselves or not. The atlas keeps its own copy of the
   picker; a change to how a region is picked belongs in both.

     MN_REGIONBOX.attach({host, box, onChange, onRead, link, light})  → api
       host      the element the parts are built in (the box's scroller)
       box       the box the picker's panel hangs from
       onChange  (api, reason) after any change: add, remove, clear, set, link, mirror, light
       onRead    (key, entry) when a row's name is pressed
       link      true for the All through / Ending in / Connecting switch
       light     true for the Highlight the regions toggle, off to begin with
     api.entries() keys() get(key) add(key) remove(key) clear() set(keys, {mirror, link, light})
        link() setLink(v) mirror() light() setLight(v) count(text) colourOf(key)
        link() is "all", "ending" or "connecting"
     MN_REGIONBOX.fillNote(headEl, whereEl, bodyEl, entry)   the region's own
        window: What it does, Associated brain disorders, When damaged
     MN_REGIONBOX.PALETTE   the colours, in the order the atlas gives them */
window.MN_REGIONBOX = (function(){
  "use strict";
  var PALETTE = ["#915AD8","#D85AC9","#FE4B83","#FF7847","#E6C14C","#AFF05B","#52F667","#4AE8B7","#4FBEE3","#5575DD"];
  var seq = 0;

  function norm(s){ return String(s).toLowerCase(); }
  function words(s){ return " " + norm(s).replace(/[^a-z0-9À-ɏ]+/g, " ").trim(); }
  /* a match is marked in the name */
  function highlightText(text, terms){
    if (!terms.length) return document.createTextNode(text);
    var frag = document.createDocumentFragment();
    var low = norm(text), i = 0;
    while (i < text.length){
      var best = -1, bestLen = 0;
      terms.forEach(function(term){
        var at = low.indexOf(term, i);
        if (at !== -1 && (best === -1 || at < best)){ best = at; bestLen = term.length; }
      });
      if (best === -1){ frag.appendChild(document.createTextNode(text.slice(i))); break; }
      if (best > i) frag.appendChild(document.createTextNode(text.slice(i, best)));
      var mk = document.createElement("mark");
      mk.textContent = text.slice(best, best + bestLen);
      frag.appendChild(mk);
      i = best + bestLen;
    }
    return frag;
  }
  function el(tag, cls, text){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function tierOf(base){
    var all = window.MN_NOTES, note = all && all.NOTES ? all.NOTES[base] : null;
    return note && all.TIERS ? all.TIERS.filter(function(t){ return t.id === note.tier; })[0] : null;
  }
  /* one region's own window, as the atlas fills it (v12.56): what it does,
     then Associated brain disorders and When damaged, from region-notes.js */
  function fillNote(headEl, whereEl, bodyEl, s){
    var all = window.MN_NOTES, note = all && all.NOTES ? all.NOTES[s.base] : null, tier = tierOf(s.base);
    if (headEl) headEl.textContent = s.name;
    /* the layer's label is written as HTML (its middle dot an entity): read as text here */
    var label = ""; if (tier){ var tmp = document.createElement("span"); tmp.innerHTML = tier.label; label = tmp.textContent; }
    if (whereEl) whereEl.textContent = [label, s.sideTag].filter(Boolean).join(" · ");
    if (!bodyEl) return;
    bodyEl.innerHTML = "";
    [["What it does", note ? note.fn : "No note on this region yet."],
     ["Associated brain disorders", note && note.disease],
     ["When damaged", note && note.damage]].forEach(function(pair){
      if (!pair[1]) return;
      bodyEl.appendChild(el("h4", null, pair[0]));
      bodyEl.appendChild(el("p", null, pair[1]));
    });
  }

  function attach(o){
    var host = o.host, box = o.box || host.closest(".drawer-box") || host.parentNode;
    var REGIONS = window.MN_ATLAS ? MN_ATLAS.REGIONS : [];
    var byBase = {};
    REGIONS.forEach(function(r){ byBase[r.base] = r; });
    var selections = new Map(), link = "all", mirror = true, light = false;
    var id = "rb" + (++seq) + "-";
    host.classList.add("region-box");

    /* ── the parts ── */
    host.innerHTML = "";
    var partPick = el("section", "rail-part");
    partPick.appendChild(el("h2", null, o.headings && o.headings.pick || "Regions"));
    var rpick = el("div", "selwrap rpick");
    var rpickBtn = el("button", "rpick-btn"); rpickBtn.type = "button"; rpickBtn.id = id + "btn";
    rpickBtn.setAttribute("aria-haspopup", "listbox"); rpickBtn.setAttribute("aria-expanded", "false"); rpickBtn.setAttribute("aria-controls", id + "pop");
    rpickBtn.textContent = "Add a region…";
    var rpickPop = el("div", "rpick-pop"); rpickPop.id = id + "pop"; rpickPop.hidden = true;
    var searchwrap = el("div", "searchwrap");
    var rpickQ = document.createElement("input"); rpickQ.type = "search"; rpickQ.id = id + "q";
    rpickQ.setAttribute("enterkeyhint", "search"); rpickQ.setAttribute("role", "combobox"); rpickQ.setAttribute("aria-expanded", "true");
    rpickQ.setAttribute("aria-controls", id + "list"); rpickQ.setAttribute("aria-autocomplete", "list"); rpickQ.setAttribute("aria-describedby", id + "count");
    rpickQ.setAttribute("autocomplete", "off"); rpickQ.setAttribute("spellcheck", "false");
    rpickQ.placeholder = "name, lobe, or what it does…"; rpickQ.setAttribute("aria-label", "Search the regions");
    var rpickClear = el("button", "clear hidden", "×"); rpickClear.type = "button"; rpickClear.setAttribute("aria-label", "Clear search");
    searchwrap.appendChild(rpickQ); searchwrap.appendChild(rpickClear);
    var rpickCount = el("p", "search-count"); rpickCount.id = id + "count"; rpickCount.setAttribute("aria-live", "polite");
    var rpickList = el("div", "rpick-list"); rpickList.id = id + "list"; rpickList.setAttribute("role", "listbox"); rpickList.setAttribute("aria-label", "Regions");
    rpickPop.appendChild(searchwrap); rpickPop.appendChild(rpickCount); rpickPop.appendChild(rpickList);
    rpick.appendChild(rpickBtn); rpick.appendChild(rpickPop);
    partPick.appendChild(rpick);
    var toggles = el("div", "toggles"), toggle = el("label", "toggle");
    var mirrorEl = document.createElement("input"); mirrorEl.type = "checkbox"; mirrorEl.checked = true; mirrorEl.className = "rb-mirror";
    toggle.appendChild(mirrorEl); toggle.appendChild(document.createTextNode(" Mirror left / right pairs"));
    toggles.appendChild(toggle);
    var lightEl = null;
    if (o.light){
      var lightRow = el("label", "toggle");
      lightEl = document.createElement("input"); lightEl.type = "checkbox"; lightEl.checked = false; lightEl.className = "rb-light";
      lightRow.appendChild(lightEl); lightRow.appendChild(document.createTextNode(" Highlight the regions"));
      lightRow.title = "Draw the highlighted regions themselves among the streamlines, each in its colour";
      toggles.appendChild(lightRow);
    }
    partPick.appendChild(toggles);
    var linkWrap = null, linkBtns = {}, noteEl = null;
    if (o.link){
      linkWrap = el("div", "rb-link rb-link3"); linkWrap.setAttribute("role", "group"); linkWrap.setAttribute("aria-label", "Which streamlines to show");
      [["all", "All through", "Every streamline through any highlighted region"],
       ["ending", "Ending in", "Every streamline with an end in a highlighted region, where it stops in the region or within 2 mm of it"],
       ["connecting", "Connecting", "Only the streamlines with one end in one highlighted region and the other end in another"]].forEach(function(pair){
        var b = el("button", "ts-btn", pair[1]); b.type = "button"; b.setAttribute("data-link", pair[0]); b.setAttribute("aria-pressed", "false");
        b.title = pair[2];
        b.addEventListener("click", function(){ if (b.disabled) return; setLink(pair[0], false); });
        linkBtns[pair[0]] = b; linkWrap.appendChild(b);
      });
      partPick.appendChild(linkWrap);
      noteEl = el("p", "rail-note rb-note"); partPick.appendChild(noteEl);
    }
    host.appendChild(partPick);
    var partList = el("section", "rail-part");
    partList.appendChild(el("h2", null, o.headings && o.headings.list || "Highlighted"));
    var chipsEl = el("div", "rchips");
    var emptyMsg = el("div", "empty-note", o.empty || "Nothing highlighted yet — pick a region above.");
    chipsEl.appendChild(emptyMsg);
    partList.appendChild(chipsEl);
    var countEl = el("p", "rb-count"); countEl.setAttribute("aria-live", "polite"); partList.appendChild(countEl);
    var btns = el("div", "btns"), clearBtn = el("button", "btn rb-clear", "Clear all"); clearBtn.type = "button";
    btns.appendChild(clearBtn); partList.appendChild(btns);
    host.appendChild(partList);

    /* ── the selection ── */
    function nextColor(){
      var used = new Set();
      selections.forEach(function(s){ used.add(s.color); });
      for (var i = 0; i < PALETTE.length; i++) if (!used.has(PALETTE[i])) return PALETTE[i];
      return PALETTE[selections.size % PALETTE.length];
    }
    function entryFor(key){
      var mode = key.slice(0, 1), base = key.slice(2), r = byBase[base];
      if (!r) return null;
      if (mode === "P" && r.L != null) return {name: r.pretty, base: r.base, sideTag: "L+R", indices: [r.L, r.R]};
      if (mode === "L" && r.L != null) return {name: r.pretty, base: r.base, sideTag: "L", indices: [r.L]};
      if (mode === "R" && r.R != null) return {name: r.pretty, base: r.base, sideTag: "R", indices: [r.R]};
      if (mode === "S" && r.S != null) return {name: r.pretty, base: r.base, sideTag: "", indices: [r.S]};
      return null;
    }
    var api;
    function changed(reason, prevSize){
      settleLink(prevSize);
      renderRows();
      if (regionPicker.isOpen()) regionPicker.rebuild();
      if (o.onChange) o.onChange(api, reason);
    }
    /* Connecting needs two regions: the switch turns itself to it as the
       list goes from one to two, and back to what stood before as the list
       falls below two again; between, it is the person's */
    var before = "all";
    function settleLink(prevSize){
      var size = selections.size;
      if (size < 2){ if (link === "connecting") link = before; }
      else if (prevSize < 2){ before = link; link = "connecting"; }
      paintLink();
    }
    function paintLink(){
      if (!linkWrap) return;
      var size = selections.size, none = !size, few = size < 2;
      Object.keys(linkBtns).forEach(function(k){
        linkBtns[k].setAttribute("aria-pressed", String(link === k));
        linkBtns[k].classList.toggle("active", link === k);
        linkBtns[k].disabled = k === "connecting" ? few : none;
      });
      if (noteEl) noteEl.textContent = none
        ? "Highlight a region to see every streamline through it, or only those that end in it."
        : few ? (link === "ending"
          ? "Only the streamlines with an end in the region; add a second to see what connects them."
          : "Every streamline through the region; add a second to see what connects them.")
        : link === "all" ? "Every streamline through any of the highlighted regions."
        : link === "ending" ? "Every streamline with an end in any of the highlighted regions."
        : "Only the streamlines with one end in one highlighted region and the other end in another.";
    }
    function setLink(v, silent){
      if (v !== "all" && v !== "ending" && v !== "connecting") return;
      if (v === "connecting" && selections.size < 2) v = before;
      var was = link;
      if (v === "connecting" && was !== "connecting") before = was;
      link = v;
      paintLink();
      if (!silent && was !== link && o.onChange) o.onChange(api, "link");
    }
    function add(key){
      if (selections.has(key)) return false;
      var e = entryFor(key);
      if (!e) return false;
      e.color = nextColor();
      var prev = selections.size;
      selections.set(key, e);
      changed("add", prev);
      return true;
    }
    function remove(key){
      if (!selections.has(key)) return false;
      var prev = selections.size;
      selections.delete(key);
      changed("remove", prev);
      return true;
    }
    function clear(){
      if (!selections.size) return;
      var prev = selections.size;
      selections.clear();
      changed("clear", prev);
    }
    function set(keys, opts){
      opts = opts || {};
      var prev = selections.size;
      selections.clear();
      (keys || []).forEach(function(k){
        if (selections.has(k)) return;
        var e = entryFor(k);
        if (!e) return;
        e.color = nextColor();
        selections.set(k, e);
      });
      if (typeof opts.mirror === "boolean"){ mirror = opts.mirror; mirrorEl.checked = mirror; }
      if (typeof opts.light === "boolean" && lightEl){ light = opts.light; lightEl.checked = light; }
      settleLink(prev);
      if (opts.link === "all" || opts.link === "ending" || opts.link === "connecting") setLink(opts.link, true);
      renderRows();
      if (regionPicker.isOpen()) regionPicker.rebuild();
      if (o.onChange) o.onChange(api, "set");
    }

    /* ── the rows: under a subheading per layer, in the atlas's order ── */
    function renderRows(){
      chipsEl.querySelectorAll(".rchip, .rchip-head").forEach(function(c){ c.remove(); });
      emptyMsg.classList.toggle("hidden", selections.size > 0);
      clearBtn.disabled = !selections.size;
      var notes = window.MN_NOTES || null, bucket = {}, loose = [];
      selections.forEach(function(s, key){
        var note = notes && notes.NOTES[s.base], tier = note && note.tier;
        if (tier) (bucket[tier] = bucket[tier] || []).push([key, s]); else loose.push([key, s]);
      });
      function heading(label, rows){
        var h = el("div", "rchip-head");
        h.innerHTML = "<span>" + label + "</span><span class=\"n\">" + rows.length + "</span>";
        chipsEl.appendChild(h);
      }
      function chip(key, s){
        var row = el("div", "rchip");
        var dot = el("span", "dot"); dot.style.background = s.color;
        var read = el("button", "rread"); read.type = "button";
        read.title = "About " + s.name; read.setAttribute("aria-label", "About " + s.name);
        read.appendChild(el("span", "name", s.name)); read.appendChild(el("span", "side", s.sideTag));
        read.addEventListener("click", function(){ if (o.onRead) o.onRead(key, s); });
        var x = el("button", "x", "×"); x.type = "button"; x.setAttribute("aria-label", "Remove " + s.name);
        x.addEventListener("click", function(){ remove(key); });
        row.appendChild(dot); row.appendChild(read); row.appendChild(x);
        chipsEl.appendChild(row);
      }
      (notes ? notes.TIERS : []).forEach(function(tier){
        var rows = bucket[tier.id];
        if (!rows || !rows.length) return;
        heading(tier.label, rows);
        rows.forEach(function(r){ chip(r[0], r[1]); });
      });
      loose.forEach(function(r){ chip(r[0], r[1]); });
    }

    /* ── the picker: the atlas's list, built by lobe from the region table ── */
    function items(){
      var out = [];
      REGIONS.forEach(function(r){
        var push = function(value, text){
          var base = value.slice(2), note = window.MN_NOTES && MN_NOTES.NOTES[base];
          out.push({value: value, text: text, group: r.group,
                    hay: {name: norm(text + " " + r.group + " " + base.replace(/_/g, " ")), fn: note ? words(note.fn) : ""}});
        };
        if (r.S != null) push("S:" + r.base, r.pretty);
        else if (mirror) push("P:" + r.base, r.pretty);
        else { push("L:" + r.base, r.pretty + " (L)"); push("R:" + r.base, r.pretty + " (R)"); }
      });
      return out;
    }
    function regionHas(hay, t){ return hay.name.indexOf(t) !== -1 || (!!hay.fn && hay.fn.indexOf(words(t)) !== -1); }
    /* a row whose name does not carry the match says where it was found:
       the stretch of what the region does that holds it */
    function whyLine(base, marks){
      var note = window.MN_NOTES && MN_NOTES.NOTES[base];
      if (!note || !note.fn || !marks.length) return null;
      var text = note.fn, low = norm(text), at = -1;
      marks.forEach(function(m){
        var re = new RegExp("(^|[^a-z0-9À-ɏ])" + m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        var hit = re.exec(low), i = hit ? hit.index + hit[1].length : -1;
        if (i !== -1 && (at === -1 || i < at)) at = i;
      });
      if (at === -1) return null;
      var from = at > 28 ? text.lastIndexOf(" ", at - 20) + 1 : 0;
      var span = el("span", "why");
      span.appendChild(highlightText((from > 0 ? "…" : "") + text.slice(from), marks));
      return span;
    }
    function buildList(raw){
      var terms = norm(raw).split(/\s+/).filter(Boolean), list = items();
      var whole = norm(raw).trim().replace(/\s+/g, " ");
      var phrase = terms.length > 1 && list.some(function(it){ return regionHas(it.hay, whole); }) ? whole : null;
      var marks = phrase ? [phrase] : terms;
      rpickList.innerHTML = "";
      var opts = [], group = null, groupEl = null, named = -1;
      list.forEach(function(it){
        if (terms.length && !(phrase ? regionHas(it.hay, phrase) : terms.every(function(t){ return regionHas(it.hay, t); }))) return;
        if (it.group !== group){
          group = it.group;
          groupEl = el("div"); groupEl.setAttribute("role", "group");
          var h = el("div", "balobe"); h.id = id + "g" + opts.length;
          h.appendChild(highlightText(group, marks));
          groupEl.setAttribute("aria-labelledby", h.id);
          groupEl.appendChild(h);
          rpickList.appendChild(groupEl);
        }
        var k = opts.length, row = el("div", "barow rpick-opt");
        row.id = id + "o" + k; row.setAttribute("role", "option"); row.setAttribute("aria-selected", "false"); row.setAttribute("data-value", it.value);
        var nm = el("span", "nm"); nm.appendChild(highlightText(it.text, marks));
        if (marks.length && !marks.some(function(m){ return norm(it.text + " " + group).indexOf(m) !== -1; })){
          var why = whyLine(it.value.slice(2), marks);
          if (why) nm.appendChild(why);
        }
        row.appendChild(nm);
        var on = selections.get(it.value);
        if (on){
          var sw = el("span", "swatch"); sw.style.background = on.color; sw.title = "Highlighted";
          row.appendChild(sw);
          row.setAttribute("aria-label", it.text + ", highlighted");
        }
        if (named === -1 && marks.length && marks.every(function(m){ return norm(it.text).indexOf(m) !== -1; })) named = k;
        groupEl.appendChild(row);
        opts.push({el: row, value: it.value});
      });
      if (!opts.length){
        rpickList.appendChild(el("p", "balist-empty", "Nothing matches “" + raw.trim() + "”. Try part of a name, a lobe, or what you want the region to do."));
      }
      rpickCount.textContent = terms.length ? opts.length + (opts.length === 1 ? " region matches" : " regions match") : "All " + list.length + " regions.";
      return {opts: opts, first: terms.length && opts.length ? (named !== -1 ? named : 0) : -1};
    }
    /* the panel's behaviour, the atlas's: hung from the box under its
       button, outside the box's scroller, closing on a pick, a press
       outside, Escape or the box scrolling */
    function dropPicker(p){
      var opts = [], active = -1, gone = null;
      function isOpen(){ return p.wrap.classList.contains("open"); }
      function setActive(i){
        var was = opts[active];
        if (was){ was.el.classList.remove("active"); was.el.setAttribute("aria-selected", "false"); }
        active = i;
        var it = opts[i];
        if (!it){ p.q.removeAttribute("aria-activedescendant"); return; }
        it.el.classList.add("active"); it.el.setAttribute("aria-selected", "true");
        p.q.setAttribute("aria-activedescendant", it.el.id);
        var top = it.el.offsetTop - p.list.offsetTop, bottom = top + it.el.offsetHeight;
        if (top < p.list.scrollTop) p.list.scrollTop = top;
        else if (bottom > p.list.scrollTop + p.list.clientHeight) p.list.scrollTop = bottom - p.list.clientHeight;
      }
      function rebuild(){
        var raw = p.q.value, r = p.build(raw);
        opts = r.opts; active = -1;
        p.q.removeAttribute("aria-activedescendant");
        p.clear.classList.toggle("hidden", !raw);
        if (r.first >= 0) setActive(r.first);
      }
      function place(){
        if (!box) return;
        var b = box.getBoundingClientRect(), r = p.btn.getBoundingClientRect();
        p.pop.style.setProperty("--pop-left", Math.round(r.left - b.left - box.clientLeft) + "px");
        p.pop.style.setProperty("--pop-top", Math.round(r.bottom - b.top - box.clientTop + 4) + "px");
        p.pop.style.setProperty("--pop-w", Math.round(r.width) + "px");
      }
      /* the list ends where the visible part of the screen does, above a
         phone's keyboard, and never below the bar */
      function fit(){
        if (!isOpen()) return;
        place();
        var vv = window.visualViewport;
        var floor = vv ? vv.height + vv.offsetTop : window.innerHeight;
        var deck = document.getElementById("deck");
        if (deck) floor = Math.min(floor, deck.getBoundingClientRect().bottom - 14);
        var room = floor - p.list.getBoundingClientRect().top - 14;
        p.list.style.maxHeight = Math.round(Math.max(176, Math.min(420, room))) + "px";
      }
      function open(seed, typed){
        if (isOpen()) return;
        clearTimeout(gone);
        p.pop.hidden = false;
        p.q.value = seed || "";
        rebuild();
        p.list.scrollTop = 0;
        void p.pop.offsetWidth;
        p.wrap.classList.add("open");
        p.btn.setAttribute("aria-expanded", "true");
        fit();
        /* the field takes the focus where a keyboard is at hand, a mouse's or
           the one that typed on the button; on a touch screen the on-screen
           keyboard would rise over the list, so the field waits for a tap */
        var coarse = window.matchMedia && matchMedia("(pointer:coarse)").matches;
        if (typed || !coarse){ try{ p.q.focus({preventScroll: true}); }catch(e){ p.q.focus(); } }
        /* iOS can hand back a list that has just appeared without its
           scrolling; taking the overflow away and giving it back once the
           panel has arrived makes it build the scroller afresh */
        if (coarse){
          setTimeout(function(){
            if (!isOpen()) return;
            p.list.style.overflowY = "hidden";
            void p.list.offsetHeight;
            p.list.style.overflowY = "";
          }, 260);
        }
      }
      function close(refocus){
        if (!isOpen()) return;
        p.wrap.classList.remove("open");
        p.btn.setAttribute("aria-expanded", "false");
        p.q.removeAttribute("aria-activedescendant");
        clearTimeout(gone);
        gone = setTimeout(function(){ if (!isOpen()) p.pop.hidden = true; }, 240);
        if (refocus){ try{ p.btn.focus({preventScroll: true}); }catch(e){ p.btn.focus(); } }
      }
      function choose(v){ p.pick(v); close(true); }
      p.btn.addEventListener("click", function(){ if (isOpen()) close(false); else open(); });
      p.btn.addEventListener("keydown", function(e){
        if (e.key === "ArrowDown" || e.key === "ArrowUp"){ e.preventDefault(); open("", true); }
        else if (e.key.length === 1 && e.key !== " " && !e.ctrlKey && !e.metaKey && !e.altKey){ e.preventDefault(); open(e.key, true); }
      });
      p.q.addEventListener("input", rebuild);
      p.q.addEventListener("keydown", function(e){
        if (e.key === "ArrowDown"){ e.preventDefault(); setActive(Math.min(active + 1, opts.length - 1)); }
        else if (e.key === "ArrowUp"){ e.preventDefault(); setActive(Math.max(active - 1, 0)); }
        else if (e.key === "Enter"){
          e.preventDefault();
          var it = opts[active];
          p.q.blur();
          if (it) choose(it.value);
        }
        else if (e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); close(true); }
      });
      p.clear.addEventListener("click", function(){ p.q.value = ""; rebuild(); p.q.focus(); });
      p.list.addEventListener("mousedown", function(e){ e.preventDefault(); });
      p.list.addEventListener("click", function(e){
        var row = e.target.closest ? e.target.closest("[data-value]") : null;
        if (row && p.list.contains(row)) choose(row.getAttribute("data-value"));
      });
      document.addEventListener("pointerdown", function(e){ if (isOpen() && !p.wrap.contains(e.target)) close(false); });
      p.wrap.addEventListener("focusout", function(e){ if (isOpen() && e.relatedTarget && !p.wrap.contains(e.relatedTarget)) close(false); });
      if (window.visualViewport) window.visualViewport.addEventListener("resize", fit);
      window.addEventListener("resize", fit);
      var scroller = host.closest(".drawer-in") || host;
      scroller.addEventListener("scroll", function(){ close(false); }, {passive: true});
      return {isOpen: isOpen, open: open, close: close, rebuild: rebuild};
    }
    var regionPicker = dropPicker({ wrap: rpick, btn: rpickBtn, pop: rpickPop, q: rpickQ, list: rpickList, clear: rpickClear,
                                    build: buildList, pick: function(v){ add(v); } });
    mirrorEl.addEventListener("change", function(){
      mirror = mirrorEl.checked;
      if (regionPicker.isOpen()) regionPicker.rebuild();
      if (o.onChange) o.onChange(api, "mirror");
    });
    clearBtn.addEventListener("click", clear);
    if (lightEl) lightEl.addEventListener("change", function(){
      light = lightEl.checked;
      if (o.onChange) o.onChange(api, "light");
    });

    api = {
      entries: function(){ var out = []; selections.forEach(function(s, k){ out.push({key: k, name: s.name, base: s.base, sideTag: s.sideTag, indices: s.indices.slice(), color: s.color}); }); return out; },
      keys: function(){ return Array.from(selections.keys()); },
      get: function(k){ return selections.get(k) || null; },
      has: function(k){ return selections.has(k); },
      add: add, remove: remove, clear: clear, set: set,
      link: function(){ return link; },
      setLink: function(v){ setLink(v, false); },
      mirror: function(){ return mirror; },
      light: function(){ return !!(lightEl && light); },
      setLight: function(v){ if (!lightEl) return; light = !!v; lightEl.checked = light; if (o.onChange) o.onChange(api, "light"); },
      colourOf: function(k){ var s = selections.get(k); return s ? s.color : null; },
      count: function(text){ countEl.textContent = text || ""; },
      picker: regionPicker
    };
    paintLink();
    renderRows();
    return api;
  }

  return { attach: attach, fillNote: fillNote, PALETTE: PALETTE };
})();
