/* The circular network graph, drawn by hand.

   Trigonometry and paths — no charting library, so the pages carry no
   dependency and the ring wears the site's own type and palette.

   Regions keep their ring position and colour whatever state is showing;
   only the threads between them are rebuilt when the state changes. The
   caller owns selection, because on the Network Atlas a selection also
   drives the scan. A ring made with bare:true (v12.6) is the diagram alone,
   no names on the regions or the networks, for a small copy of the ring:
   its arcs are the whole target, and its dots answer to the pointer too. */
window.MN_RING = (function(){

var SVG_NS = "http://www.w3.org/2000/svg";
var SIZE = 720, CX = SIZE/2, CY = SIZE/2;
var ARC_R = 236, ARC_W = 11;
var ER = ARC_R + ARC_W/2;          /* chord ends sit under the ring */
var DOT_R = 254, LABEL_R = 266, GROUP_R = 328;
var GAP = 6*Math.PI/180;

function el(tag, attrs){
  var node = document.createElementNS(SVG_NS, tag);
  for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
  return node;
}
function norm(a){
  while (a > Math.PI) a -= 2*Math.PI;
  while (a < -Math.PI) a += 2*Math.PI;
  return a;
}
function arcPath(r, a0, a1){
  var x0 = CX + r*Math.cos(a0), y0 = CY + r*Math.sin(a0);
  var x1 = CX + r*Math.cos(a1), y1 = CY + r*Math.sin(a1);
  return "M" + x0 + "," + y0 + " A" + r + "," + r + " 0 " +
         ((a1 - a0) > Math.PI ? 1 : 0) + " 1 " + x1 + "," + y1;
}

function create(opts){
  var svg = opts.svg, data = opts.data, bare = !!opts.bare;
  var NODES = data.NODES, GROUPS = data.GROUPS, PALETTE = data.PALETTE;
  var dashed = opts.dashed || function(){ return false; };
  if (bare) svg.classList.add("bare");

  /* ── geometry, fixed for every state ─────────────────────────────────── */
  /* carry every field the data gives a group, not just id and label — the
     pages read its description straight off this object */
  var byGroup = GROUPS.map(function(g){
    var copy = {};
    for (var k in g) copy[k] = g[k];
    copy.nodes = NODES.filter(function(n){ return n.group === g.id; });
    return copy;
  });
  var per = (2*Math.PI - GAP*byGroup.length) / NODES.length;
  var ARC_SPAN = per*0.80;

  var a = -Math.PI/2 + GAP/2;      /* start at the top */
  var order = [];
  byGroup.forEach(function(g){
    g.a0 = a;
    g.nodes.forEach(function(n){ n.angle = a + per/2; order.push(n); a += per; });
    g.a1 = a;
    a += GAP;
  });
  order.forEach(function(n, i){ n.color = PALETTE[i % PALETTE.length]; });
  var N = {};
  NODES.forEach(function(n){ N[n.id] = n; });

  /* ── the parts that never change ─────────────────────────────────────── */
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  var defs = el("defs");
  svg.appendChild(defs);

  var groupLabels = bare ? [] : byGroup.map(function(g){
    var mid = (g.a0 + g.a1)/2;
    var gx = CX + GROUP_R*Math.cos(mid), gy = CY + GROUP_R*Math.sin(mid);
    var rot = mid*180/Math.PI + 90;
    if (mid > 0 && mid < Math.PI) rot += 180;
    var t = el("text", {"class":"grouplabel", x:gx, y:gy, "text-anchor":"middle",
                        transform:"rotate(" + rot + "," + gx + "," + gy + ")", dy:"0.35em",
                        tabindex:"0", role:"button"});
    t.textContent = g.label;
    svg.appendChild(t);
    return {g:g, text:t};
  });

  var chordLayer = el("g"); svg.appendChild(chordLayer);
  var arcLayer = el("g");   svg.appendChild(arcLayer);
  var nodeLayer = el("g");  svg.appendChild(nodeLayer);

  var arcs = NODES.map(function(n){
    var path = el("path", {"class":"regionarc" + (dashed(n) ? " nomap" : ""), stroke:n.color,
      d: arcPath(ARC_R, n.angle - ARC_SPAN/2, n.angle + ARC_SPAN/2)});
    arcLayer.appendChild(path);
    return {n:n, path:path};
  });

  var dots = {}, labels = [];
  NODES.forEach(function(n){
    var dot = el("circle", {"class":"nodedot",
      cx: CX + DOT_R*Math.cos(n.angle), cy: CY + DOT_R*Math.sin(n.angle), r: bare ? 7 : 4,
      fill:n.color, stroke:n.color});
    nodeLayer.appendChild(dot);
    dots[n.id] = dot;
    if (bare) return;

    var lx = CX + LABEL_R*Math.cos(n.angle), ly = CY + LABEL_R*Math.sin(n.angle);
    var rot = n.angle*180/Math.PI, anchor = "start";
    if (n.angle > Math.PI/2 || n.angle < -Math.PI/2){ rot += 180; anchor = "end"; }
    var text = el("text", {"class":"nodelabel", fill:n.color, x:lx, y:ly,
      "text-anchor":anchor, transform:"rotate(" + rot + "," + lx + "," + ly + ")", dy:"0.35em"});
    text.textContent = n.id;
    nodeLayer.appendChild(text);
    labels.push({n:n, text:text});
  });

  /* ── the parts the state owns ────────────────────────────────────────── */
  var state = null, links = [], chords = [], weight = 1, gradSeq = 0;

  function layoutLinks(){
    /* fan each region's chord ends out along its own arc, ordered by where
       the other end sits, so threads leave the ring without crossing
       themselves */
    NODES.forEach(function(n){
      var mine = links.filter(function(l){ return l.s === n.id || l.t === n.id; });
      mine.sort(function(p, q){
        var pa = N[p.s === n.id ? p.t : p.s].angle, qa = N[q.s === n.id ? q.t : q.s].angle;
        return norm(pa - n.angle) - norm(qa - n.angle);
      });
      var k = mine.length, spread = ARC_SPAN*0.66;
      mine.forEach(function(l, i){
        var t = k === 1 ? 0 : (i/(k - 1) - 0.5);
        var ang = n.angle + t*spread;
        l.pts = l.pts || {};
        l.pts[n.id] = {x: CX + ER*Math.cos(ang), y: CY + ER*Math.sin(ang)};
      });
    });
  }
  function chordPath(l){
    var p = l.pts[l.s], q = l.pts[l.t], k = 0.22;
    return "M" + p.x + "," + p.y +
           " C" + (CX + (p.x - CX)*k) + "," + (CY + (p.y - CY)*k) +
           " " + (CX + (q.x - CX)*k) + "," + (CY + (q.y - CY)*k) +
           " " + q.x + "," + q.y;
  }

  function drawState(){
    while (chordLayer.firstChild) chordLayer.removeChild(chordLayer.firstChild);
    while (defs.firstChild) defs.removeChild(defs.firstChild);

    links = state.links.map(function(l){
      return {s:l.s, t:l.t, w:l.w, quiet:!!l.quiet};
    });
    layoutLinks();

    chords = links.map(function(l){
      if (!l.quiet){
        l.grad = "ng" + (gradSeq++);
        var p = l.pts[l.s], q = l.pts[l.t];
        var g = el("linearGradient", {id:l.grad, gradientUnits:"userSpaceOnUse",
                                      x1:p.x, y1:p.y, x2:q.x, y2:q.y});
        g.appendChild(el("stop", {offset:"0%",   "stop-color":N[l.s].color}));
        g.appendChild(el("stop", {offset:"100%", "stop-color":N[l.t].color}));
        defs.appendChild(g);
      }
      var path = el("path", {"class":"chord" + (l.quiet ? " quiet" : ""), d:chordPath(l),
                             stroke: l.quiet ? null : "url(#" + l.grad + ")"});
      path.style.opacity = Math.min(1, 0.58 + l.w*0.8);
      chordLayer.appendChild(path);
      return {l:l, path:path};
    });

    /* a hollow marker means the region powers down in this state */
    var down = state.down || [];
    NODES.forEach(function(n){
      dots[n.id].setAttribute("fill", down.indexOf(n.id) >= 0 ? "var(--paper)" : n.color);
    });

    applyWeight();
    clear();
  }

  function applyWeight(){
    chords.forEach(function(c){
      var w = (1.9 + c.l.w*3.8)*weight;
      c.path.setAttribute("stroke-width", w);
      if (c.l.quiet){
        var d = Math.max(2.2, w*1.5);
        c.path.setAttribute("stroke-dasharray", d + " " + d);
      }
    });
  }

  function linked(x, y){
    return links.some(function(l){
      return (l.s === x && l.t === y) || (l.t === x && l.s === y);
    });
  }

  function inGroup(gid, nodeId){ return N[nodeId] && N[nodeId].group === gid; }

  /* A whole network at once: every thread with one end inside it. The regions
     it reaches keep their colour, so what the group touches is as legible as
     the group itself. */
  function focusGroup(gid){
    var touched = {};
    chords.forEach(function(c){
      var on = inGroup(gid, c.l.s) || inGroup(gid, c.l.t);
      if (on){ touched[c.l.s] = true; touched[c.l.t] = true; }
      c.path.classList.toggle("dim", !on);
      c.path.classList.toggle("lit", on);
    });
    arcs.forEach(function(x){
      var keep = x.n.group === gid || touched[x.n.id];
      x.path.classList.toggle("dimarc", !keep);
    });
    labels.forEach(function(x){
      var keep = x.n.group === gid || touched[x.n.id];
      x.text.setAttribute("fill", keep ? x.n.color : "var(--ink-35)");
    });
    groupLabels.forEach(function(x){
      x.text.classList.toggle("lit-group", x.g.id === gid);
      x.text.classList.toggle("dim-group", x.g.id !== gid);
    });
    return Object.keys(touched);
  }

  function focus(id){
    chords.forEach(function(c){
      var on = c.l.s === id || c.l.t === id;
      c.path.classList.toggle("dim", !on);
      c.path.classList.toggle("lit", on);
    });
    arcs.forEach(function(x){
      x.path.classList.toggle("dimarc", x.n.id !== id && !linked(id, x.n.id));
    });
    labels.forEach(function(x){
      x.text.setAttribute("fill", (x.n.id === id || linked(id, x.n.id)) ? x.n.color : "var(--ink-35)");
    });
    groupLabels.forEach(function(x){
      x.text.classList.remove("lit-group");
      x.text.classList.toggle("dim-group", !N[id] || x.g.id !== N[id].group);
    });
  }
  function clear(){
    chords.forEach(function(c){ c.path.classList.remove("dim", "lit"); });
    arcs.forEach(function(x){ x.path.classList.remove("dimarc"); });
    labels.forEach(function(x){ x.text.setAttribute("fill", x.n.color); });
    groupLabels.forEach(function(x){ x.text.classList.remove("lit-group", "dim-group"); });
  }

  /* ── wiring ──────────────────────────────────────────────────────────── */
  function bind(node, n){
    node.addEventListener("mouseenter", function(){ if (opts.onHover) opts.onHover(n); });
    node.addEventListener("mouseleave", function(){ if (opts.onLeave) opts.onLeave(n); });
    node.addEventListener("click", function(e){
      e.stopPropagation();
      if (opts.onSelect) opts.onSelect(n);
    });
  }
  function bindGroup(node, g){
    node.addEventListener("mouseenter", function(){ if (opts.onGroupHover) opts.onGroupHover(g); });
    node.addEventListener("mouseleave", function(){ if (opts.onGroupLeave) opts.onGroupLeave(g); });
    node.addEventListener("click", function(e){
      e.stopPropagation();
      if (opts.onGroupSelect) opts.onGroupSelect(g);
    });
    node.addEventListener("keydown", function(e){
      if (e.key === "Enter" || e.key === " "){
        e.preventDefault(); e.stopPropagation();
        if (opts.onGroupSelect) opts.onGroupSelect(g);
      }
    });
  }
  arcs.forEach(function(x){ bind(x.path, x.n); });
  labels.forEach(function(x){ bind(x.text, x.n); });
  if (bare) NODES.forEach(function(n){ bind(dots[n.id], n); });
  groupLabels.forEach(function(x){ bindGroup(x.text, x.g); });
  svg.addEventListener("click", function(){ if (opts.onBackground) opts.onBackground(); });

  return {
    nodes: NODES,
    byId: N,
    setState: function(s){ state = s; drawState(); },
    get state(){ return state; },
    setWeight: function(k){ weight = k; applyWeight(); },
    isLinked: linked,
    groups: byGroup,
    membersOf: function(gid){
      return NODES.filter(function(n){ return n.group === gid; });
    },
    focus: focus,
    focusGroup: focusGroup,
    clear: clear
  };
}

return { create: create };
})();
