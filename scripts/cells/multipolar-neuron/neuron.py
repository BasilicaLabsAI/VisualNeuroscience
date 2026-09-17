"""Original parametric construction of a large multipolar neuron plate.
Stages: soma+axon+trunks -> synapses+astrocyte -> dendritic growth -> silhouette/regions -> spines -> organelles."""
import math, random, sys, json
import numpy as np
from shapely.geometry import Polygon, MultiPolygon, Point, LineString, box
from shapely.ops import unary_union, substring
from shapely.prepared import prep
from shapely import affinity
from geom import *
from tree import Grower, Branch, radii_taper

W, H = 1200, 780
C = np.array([648.0, 392.0])
SOMA_RX, SOMA_RY = 90.0, 78.0
OUT = 1.6            # visible outline thickness (ink), in viewBox units
GAP = 2 * OUT + 1.8  # polygon-to-polygon gap between two outlined cells (cleft)

def U(v): return np.array([math.cos(v), math.sin(v)])

def closing(g, r, qs=12):
    return g.buffer(r, quad_segs=qs).buffer(-r, quad_segs=qs)

def biggest(g):
    return max(g.geoms, key=lambda x: x.area) if hasattr(g, "geoms") else g

def spline(points, step=4.0):
    """Catmull-Rom through waypoints, sampled to ~step spacing."""
    P_ = [np.asarray(p, float) for p in points]
    out = []
    n = len(P_)
    for i in range(n - 1):
        p0 = P_[max(i - 1, 0)]; p1 = P_[i]; p2 = P_[i + 1]; p3 = P_[min(i + 2, n - 1)]
        m = max(2, int(np.linalg.norm(p2 - p1) / step))
        for k in range(m):
            t = k / m
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(P_[-1])
    pts, _, _ = resample(np.array(out), step)
    return pts

def arclen(pts):
    return np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))])

def soma_blob(rng):
    pts = []
    n = 44
    ph = [rng.uniform(0, 6.28) for _ in range(3)]
    for i in range(n):
        a = 2 * math.pi * i / n
        r = 1 + 0.04 * math.sin(2 * a + ph[0]) + 0.03 * math.sin(3 * a + ph[1]) + 0.015 * math.sin(5 * a + ph[2])
        pts.append(C + np.array([SOMA_RX * r * math.cos(a), SOMA_RY * r * math.sin(a)]))
    return pts

def flare_radii(s, s_edge, r_base, r_mid, r_end, lam):
    L = s[-1]
    lin = r_end + (r_mid - r_end) * np.clip(1 - (s - s_edge) / max(L - s_edge, 1), 0, 1)
    r = lin + (r_base - r_mid) * np.exp(-np.maximum(s - s_edge, 0) / lam)
    return np.minimum(r, r_base)

def ray_hit(ring_or_poly, origin, theta, far=600.0):
    ext = ring_or_poly.exterior if hasattr(ring_or_poly, "exterior") else ring_or_poly
    line = LineString([origin, origin + far * U(theta)])
    inter = line.intersection(ext)
    pts = [inter] if inter.geom_type == "Point" else list(getattr(inter, "geoms", []))
    pts = [p for p in pts if p.geom_type == "Point"]
    pts.sort(key=lambda p: (p.x - origin[0]) ** 2 + (p.y - origin[1]) ** 2)
    return np.array([pts[0].x, pts[0].y])

def outward_normal(poly, pt, eps=2.0):
    ext = poly.exterior
    t = ext.project(Point(pt))
    a = ext.interpolate((t - eps) % ext.length); b = ext.interpolate((t + eps) % ext.length)
    tv = np.array([b.x - a.x, b.y - a.y]); tv /= np.linalg.norm(tv)
    n = np.array([tv[1], -tv[0]])
    if poly.contains(Point(pt + 3 * n)): n = -n
    return n

# ------------------------------------------------------------------ stage 1
def stage1(rng, P):
    G = {}
    soma_pts = soma_blob(rng)
    soma = Polygon(soma_pts)
    th_ax = ang(9)
    dirv = U(th_ax); nrm = np.array([-dirv[1], dirv[0]])
    a0 = C + 46 * dirv
    s = np.arange(0, 604, 4.0)
    und = 13 * np.sin((s - 150) / 150.0) * (1 - np.exp(-np.maximum(s - 130, 0) / 110))
    ax_pts = a0 + np.outer(s, dirv) + np.outer(und, nrm)
    r_ax = 5.7 + (33 - 5.7) * np.exp(-np.maximum(s - 40.0, 0) / 24.0)
    r_ax = np.minimum(r_ax, 33) - 0.8 * np.exp(-((s - 168) / 30.0) ** 2)
    G.update(soma_pts=soma_pts, soma=soma, axon=dict(pts=ax_pts, s=s, r=r_ax, a0=a0, dir=dirv, nrm=nrm, th=th_ax),
             axon_cuts=dict(hillock=(0, 132), initial=(132, 204), axon=(204, float(s[-1]))))
    G["axon_poly"] = poly_of(ax_pts, r_ax)

    gw = Grower(rng, C, (18, 16, W - 18, H - 16), [], clearance=P.get("clear", 15.0))
    prim = P.get("prim", [(-82, 150, 34), (-131, 170, 35), (-174, 200, 37), (150, 190, 36), (103, 150, 34), (52, 170, 34)])
    ax_keep = prep(LineString(ax_pts[30:]).buffer(36))
    trunks = []
    for ti, (adeg, L, rb) in enumerate(prim):
        th = ang(adeg)
        p0 = C + 40 * U(th)
        for t in range(300):
            pts, ths = walk(p0, th + rng.uniform(-0.04, 0.04), L, rng, ds=4.0, wiggle=0.0016, curl=rng.uniform(-0.0020, 0.0020))
            ss = np.arange(len(pts)) * 4.0
            inside = [soma.contains(Point(p)) for p in pts]
            s_edge = ss[max(i for i, v in enumerate(inside) if v)]
            rad = flare_radii(ss, s_edge, rb, 13.0, 9.6, 34.0)
            if ax_keep.intersects(LineString(pts[12:]).buffer(16)): continue
            if gw._ok(pts, rad, None, [], skip=s_edge + 46, use_keep=False):
                b = Branch(ti, 1, pts, ths, rad, None, "trunk"); b.s_edge = s_edge
                gw.add(b); trunks.append(b); break
        else:
            raise RuntimeError(f"trunk {ti} failed")
    G["trunks"] = trunks
    G["gw"] = gw
    G["core"] = closing(unary_union([soma, G["axon_poly"]] + [t.poly for t in trunks]), 22.0)
    return G

# ------------------------------------------------------------------ stage 2: synapses + astrocyte
def bouton_fibre(way, c, n, rb, r_f=2.3):
    """Afferent fibre along waypoints ending in a bouton centred at c (approached along -n)."""
    pts = spline(list(way) + [c + n * 40, c + n * (rb - 1)], step=3.0)
    fibre = LineString(pts).buffer(r_f, quad_segs=8)
    bulb = affinity.rotate(affinity.scale(Point(c).buffer(rb, quad_segs=24), 0.92, 1.08), math.degrees(math.atan2(n[1], n[0])) + 90, origin=(c[0], c[1]))
    poly = closing(unary_union([fibre, bulb]), 7.0, qs=16)
    return dict(pts=pts, c=c, n=n, rb=rb, r_f=r_f, poly=poly)

def stage2(G, rng):
    core = G["core"]
    S = {}
    # --- axosomatic bouton on the upper-right shoulder of the cell body
    th1 = ang(-27)
    e1 = ray_hit(core, C, th1)
    n1 = outward_normal(core, e1)
    rb1 = 11.0
    c1 = e1 + n1 * (rb1 + GAP)
    S["syn_soma"] = bouton_fibre([(1216, 292), (1080, 304), (950, 298), (850, 302)], c1, n1, rb1)
    S["syn_soma"]["e"] = e1
    # --- axodendritic bouton on the first trunk (right-hand side)
    t1 = G["trunks"][0]
    i = int(np.searchsorted(t1.s, 104))
    pT = t1.pts[i]; thT = t1.ths[i]
    side = np.array([-math.sin(thT), math.cos(thT)])
    if side[0] < 0: side = -side                     # pick the side facing right
    e2 = ray_hit(core, pT, math.atan2(side[1], side[0]))
    n2 = outward_normal(core, e2)
    rb2 = 9.6
    c2 = e2 + n2 * (rb2 + GAP)
    S["syn_dend"] = bouton_fibre([(880, -16), (862, 70), (815, 160)], c2, n2, rb2)
    S["syn_dend"]["e"] = e2
    # --- astrocyte: body in the upper-right corner, one long process ending in two end-feet on the neuron
    r_foot = 6.2
    oc = core.buffer(r_foot + GAP, quad_segs=16).exterior
    q0 = ray_hit(oc, C, ang(-55))
    t0 = oc.project(Point(q0)); tA = oc.project(Point(c1)); tB = oc.project(Point(c2))
    Lr = oc.length
    def along(ta, tb):
        """points on the ring from ta to tb the short way round"""
        d = (tb - ta) % Lr
        if d > Lr / 2: d -= Lr
        n = max(3, int(abs(d) / 3.0))
        return np.array([[*oc.interpolate((ta + d * k / n) % Lr).coords[0]] for k in range(n + 1)]), abs(d)
    ptsA, dA = along(t0, tA); ptsB, dB = along(t0, tB)
    stopA = dA - (rb1 + GAP + r_foot) + 1.0
    stopB = dB - (rb2 + GAP + r_foot) + 1.0
    def cut(pts, stop):
        s = arclen(pts); k = s <= stop
        return pts[k]
    footA = cut(ptsA, stopA); footB = cut(ptsB, stopB)
    body_c = np.array([1096.0, 96.0])
    nq = outward_normal(core, ray_hit(core, C, ang(-55)))
    main = spline([body_c, (1012, 140), (930, 196), (848, 250), q0 + nq * 44, q0 + nq * 14, q0], step=3.0)
    sm = arclen(main)
    def lumpy(s, base, ph):
        return base * (1 + 0.13 * np.sin(s / 10.5 + ph) + 0.07 * np.sin(s / 4.7 + 2.1 * ph))
    r_main = lumpy(sm, 6.0 + 6.5 * np.exp(-sm / 46.0) + 0.0 * sm, 0.7)
    polys = [poly_of(main, r_main)]
    fibrils = [main]
    for ft, ph in ((footA, 1.9), (footB, 3.3)):
        s = arclen(ft)
        r = lumpy(s, np.full(len(ft), r_foot), ph)
        r[-4:] = r_foot
        polys.append(poly_of(ft, np.minimum(r, r_foot + 0.2)))
    # body: irregular star blob
    bp = []
    for k in range(36):
        a = 2 * math.pi * k / 36
        rr = 25 * (1 + 0.10 * math.sin(3 * a + 0.4) + 0.06 * math.sin(5 * a + 1.1))
        bp.append(body_c + rr * U(a))
    polys.append(Polygon(bp))
    # other processes leaving the frame / ending in tufts
    others = [(-112, 150, 9.5, 4.8, 0.0020), (-28, 150, 9.5, 5.0, -0.0025), (38, 190, 10, 4.4, 0.0018), (196, 150, 8.5, 3.2, -0.003), (104, 120, 8.0, 3.0, 0.004)]
    side_tufts = []
    for adeg, L, r0, r1, curl in others:
        pts, ths = walk(body_c + 12 * U(ang(adeg)), ang(adeg), L, rng, ds=3.0, wiggle=0.004, curl=curl)
        s = arclen(pts)
        r = lumpy(s, r1 + (r0 - r1) * np.exp(-s / 40.0), rng.uniform(0, 6))
        polys.append(poly_of(pts, r)); fibrils.append(pts)
        if adeg in (196, 104):   # little terminal tuft
            for sg in (-1, 1):
                p2, _ = walk(pts[-1], ths[-1] + sg * 0.6, 34, rng, ds=3.0, wiggle=0.004)
                polys.append(poly_of(p2, np.linspace(r[-1] * 0.9, 2.0, len(p2))))
    astro = closing(unary_union(polys), 5.0)
    astro = biggest(astro)
    S["astro"] = dict(poly=astro, body_c=body_c, fibrils=fibrils, footA=footA, footB=footB, main=main)
    G["S"] = S
    return G

# ------------------------------------------------------------------ stage 3: growth
def stage3(G, rng, P):
    gw = G["gw"]; S = G["S"]
    ax = G["axon"]
    keep = [LineString(ax["pts"][30:]).buffer(34), G["soma"].buffer(14),
            unary_union([S["astro"]["poly"], S["syn_soma"]["poly"], S["syn_dend"]["poly"]]).buffer(P.get("glia_clear", 17.0))]
    gw.set_keepouts(keep)
    frontier = list(G["trunks"])
    max_order = P.get("max_order", 5)
    Lr = {2: (140, 195), 3: (100, 155), 4: (66, 112), 5: (40, 66), 6: (30, 50)}
    tscale = P.get("tscale", {2: 1.22, 3: 1.18})
    while frontier:
        nxt = []
        rng.shuffle(frontier)
        for b in frontier:
            if b.order >= max_order or b.radii[-1] < 2.75: continue
            th_end, r_end = b.ths[-1], b.radii[-1]
            split = rng.uniform(ang(26), ang(38)); skew = rng.uniform(-ang(9), ang(9))
            kids = []
            for sgn in (+1, -1):
                r0 = r_end * 0.80
                k = gw.try_branch(b.tree, b.order + 1, b.pts[-1], th_end + sgn * split + skew, rng.uniform(*Lr[b.order + 1]) * tscale.get(b.tree, 1.0),
                                  r0, max(r0 * 0.72, 2.1), b, kids, "end", spread=ang(14), tries=44, min_len=34)
                if k is not None:
                    k.s0 = b.s0 + b.length; kids.append(k); nxt.append(k)
            if b.order >= 2 and b.length > 90 and rng.random() < P.get("side_p", 0.62):
                i = int(len(b.pts) * rng.uniform(0.38, 0.62)); sgn = rng.choice([-1, 1]); r0 = b.radii[i] * 0.66
                if r0 > 2.5:
                    L = rng.uniform(*Lr[min(b.order + 2, 6)]) * 1.35
                    for sg in (sgn, -sgn):
                        k = gw.try_branch(b.tree, b.order + 1, b.pts[i], b.ths[i] + sg * rng.uniform(ang(44), ang(60)), L,
                                          r0, max(r0 * 0.72, 2.1), b, [], "side", spread=ang(9), tries=28, min_len=40)
                        if k is not None:
                            k.s0 = b.s0 + b.s[i]; nxt.append(k); break
        frontier = nxt
    # prune blunt stumps: short childless branches that start thick
    for b in list(gw.branches):
        if b.order > 1 and not b.children and b.radii[0] > 4.0 and b.length < max(52, 9.5 * b.radii[0]):
            gw.branches.remove(b)
            if b.parent is not None and b in b.parent.children: b.parent.children.remove(b)
    for b in gw.branches:
        if not b.children and b.order > 1:
            t = b.s / max(b.length, 1e-6)
            r_tip = 1.9
            b.radii = b.radii[0] + (r_tip - b.radii[0]) * t ** 0.9 if b.radii[-1] > r_tip else b.radii
            b.poly = poly_of(b.pts, b.radii)
    G["branches"] = gw.branches
    return G

# ------------------------------------------------------------------ stage 4: silhouette + regions
def stage4(G):
    rest = [b.poly for b in G["branches"] if b.order > 1]
    neuron = biggest(closing(unary_union([G["core"]] + rest), 5.0))
    G["neuron"] = neuron
    soma_mask = affinity.scale(G["soma"], 1.09, 1.09, origin=(C[0], C[1]))
    line = LineString(G["axon"]["pts"])
    cuts = G["axon_cuts"]
    sec = lambda a, b, w: substring(line, a, b).buffer(w, cap_style="flat")
    R = {}
    R["hillock"] = biggest(neuron.intersection(sec(0, cuts["hillock"][1], 60)).difference(soma_mask))
    R["initial"] = biggest(neuron.intersection(sec(*cuts["initial"], 30)))
    R["axon"] = biggest(neuron.intersection(sec(*cuts["axon"], 30)))
    ax_all = unary_union([R["hillock"], R["initial"], R["axon"]])
    den = neuron.difference(soma_mask).difference(ax_all.buffer(0.5))
    parts = [g for g in (den.geoms if hasattr(den, "geoms") else [den])]
    R["dendrites"] = MultiPolygon([g for g in parts if g.area > 400])
    # everything else belongs to the cell body (includes webbing slivers)
    R["soma"] = biggest(neuron.difference(unary_union([R["dendrites"], ax_all]).buffer(0.01)))
    G["R"] = R; G["soma_mask"] = soma_mask
    return G

# ------------------------------------------------------------------ stage 5: spines
def stage5(G, rng, P):
    neuron = G["neuron"]; S = G["S"]
    nb = prep(neuron.buffer(1.4))
    obstacles = prep(unary_union([S["astro"]["poly"], S["syn_soma"]["poly"], S["syn_dend"]["poly"]]).buffer(6.5))
    axk = prep(G["axon_poly"].buffer(8))
    spines = []   # (base, tip, kind) kind: 0 thin, 1 mushroom, 2 stubby
    tips = np.zeros((0, 2))
    for b in G["branches"]:
        for side in (+1, -1):
            s = rng.uniform(4, 10)
            s_start = 0.0
            if b.order == 1:
                s_start = b.s_edge + 58
            while s < b.length - 1.5:
                if s >= s_start:
                    dist = b.s0 + s
                    dens = min(1.0, 0.35 + dist / 260.0) if b.order == 1 else 1.0
                    if rng.random() < dens:
                        i = int(np.searchsorted(b.s, s)); i = min(i, len(b.pts) - 1)
                        th = b.ths[i]; r = b.radii[i]
                        nv = side * np.array([-math.sin(th), math.cos(th)])
                        lean = rng.gauss(0, 0.34)
                        dv = U(math.atan2(nv[1], nv[0]) + lean)
                        kind = rng.choices([0, 1, 2], weights=[0.30, 0.40, 0.30])[0]
                        ln = {0: rng.uniform(4.6, 8.2), 1: rng.uniform(4.2, 6.6), 2: rng.uniform(2.4, 3.8)}[kind]
                        base = b.pts[i] + nv * (r - 1.2)
                        tip = b.pts[i] + nv * r + dv * ln
                        ptip = Point(tip)
                        ok = (not nb.contains(ptip)) and (not nb.contains(Point((base + tip) / 2 + dv * 1.2))) \
                             and (not obstacles.contains(ptip)) and (not axk.contains(ptip)) \
                             and 8 < tip[0] < W - 8 and 8 < tip[1] < H - 8
                        if ok and len(tips):
                            if np.min(np.linalg.norm(tips - tip, axis=1)) < 5.4: ok = False
                        if ok:
                            spines.append((base, tip, kind)); tips = np.vstack([tips, tip])
                s += rng.uniform(6.5, 15.5) if b.order > 1 else rng.uniform(9, 19)
    G["spines"] = spines
    return G

def capsule(c, th, L, Wd):
    """Rounded lozenge polygon centred c, long axis at angle th."""
    core = LineString([c - U(th) * (L / 2 - Wd / 2), c + U(th) * (L / 2 - Wd / 2)])
    return core.buffer(Wd / 2, quad_segs=6)

def stage6(G, rng):
    neuron = G["neuron"]; ax = G["axon"]; th_ax = ax["th"]; dirv, nrm, a0 = ax["dir"], ax["nrm"], ax["a0"]
    O = {}
    nc = C + np.array([-11.0, -2.0])
    O["nucleus"] = dict(c=nc, rx=31.5, ry=28.0, rot=-14.0)
    O["nucleolus"] = dict(c=nc + np.array([5.0, 3.5]), r=8.4)
    nuc_poly = affinity.rotate(affinity.scale(Point(nc).buffer(1.0, quad_segs=24), 31.5, 28.0), -14.0, origin=(nc[0], nc[1]))
    # neurotubules: fan out of the perikaryon, converge through the hillock, run on into the initial segment
    tubes = []; tubes_hit = []
    js = [-3, -2, -1, 0, 1, 2, 3]
    for j in js:
        phi = th_ax + ang(14.5) * j
        start = nc + (41 + 3 * abs(j)) * U(phi) * np.array([1.0, 0.95])
        lat = lambda sv, k: a0 + dirv * sv + nrm * k
        way = [start, lat(40, j * 7.4), lat(74, j * 3.7), lat(104, j * 1.95), lat(132, j * 1.25), lat(160, j * 1.12)]
        s_end = 214 - 17 * abs(j) + rng.uniform(-5, 5)
        way.append(lat(s_end, j * 1.1))
        pts = spline(way, step=5.0)
        tubes.append(pts)
        sl = arclen(pts)
        # clickable only where the fan is spread out (soma + wide part of the hillock)
        axs = (pts - a0) @ dirv
        tubes_hit.append(pts[axs <= 96])
    O["tubes"] = tubes; O["tubes_hit"] = tubes_hit
    tube_block = unary_union([LineString(t).buffer(3.4) for t in tubes])
    # Golgi: a stack of curved cisternae wrapped round the nucleus (lower-left), vesicles budding outward
    g_mid = ang(128)
    golgi_arcs = []
    for k, (rad, span) in enumerate([(39.5, 27), (43.6, 31), (47.7, 29), (51.8, 24)]):
        a_ = np.radians(np.linspace(-span, span, 15)) + g_mid + ang(rng.uniform(-3, 3))
        golgi_arcs.append(np.array([nc + np.array([rad * 1.03 * math.cos(t), rad * 0.95 * math.sin(t)]) for t in a_]))
    ves = []
    for t_deg, rr, r in [(-33, 56.5, 2.3), (-16, 58.5, 1.8), (2, 57.6, 2.5), (19, 58.8, 1.9), (36, 55.5, 2.2), (-40, 48, 1.7), (41, 45.5, 1.8)]:
        t = g_mid + ang(t_deg)
        ves.append((nc + np.array([rr * 1.03 * math.cos(t), rr * 0.95 * math.sin(t)]), r))
    O["golgi"] = dict(arcs=golgi_arcs, ves=ves)
    golgi_block = unary_union([LineString(a).buffer(3.0) for a in golgi_arcs] + [Point(c).buffer(r + 1) for c, r in ves])
    O["golgi_hit"] = golgi_block.buffer(2.5).convex_hull.difference(nuc_poly.buffer(2))

    inner = neuron.buffer(-4.2)
    inner_p = prep(inner)
    wedge = Polygon([C + 26 * dirv + nrm * 18, C + 26 * dirv - nrm * 18, C + 150 * dirv - nrm * 80, C + 150 * dirv + nrm * 80])   # Nissl-free zone: hillock and its approach
    placed = [nuc_poly.buffer(5.5), tube_block, golgi_block.buffer(3.5)]
    def free(poly, extra=None):
        if not inner_p.contains(poly): return False
        for q in placed:
            if q.intersects(poly): return False
        return True
    def scatter(n, L, Wd, rmax, orient, avoid=None, pad=2.6, tries=4000, sector=None):
        out = []
        for t in range(tries):
            if len(out) >= n: break
            a = rng.uniform(0, 2 * math.pi); rr = math.sqrt(rng.uniform(0.12, 1)) * rmax
            c = C + np.array([rr * math.cos(a) * 1.08, rr * math.sin(a) * 0.95])
            th = orient(c)
            pg = capsule(c, th, L, Wd) if L > Wd else Point(c).buffer(Wd / 2)
            if avoid is not None and avoid.intersects(pg): continue
            if free(pg.buffer(pad)):
                out.append((c, th)); placed.append(pg.buffer(pad * 0.5))
        return out
    tang = lambda c: math.atan2(c[1] - nc[1], c[0] - nc[0]) + math.pi / 2 + rng.gauss(0, 0.30)
    anyo = lambda c: rng.uniform(0, math.pi)
    NL, NW, ML, MW = 27.0, 10.6, 21.0, 8.8
    # proximal dendrites first: Nissl bodies and mitochondria run out along the trunks
    nissl = []; mito = []
    for tr in G["trunks"]:
        for ds_, kind, off in ((28, "n", 3.0), (70, "n", -3.5), (112, "m", 2.0)):
            sv = tr.s_edge + ds_ + rng.uniform(-5, 5)
            if sv > tr.length - 14: continue
            i = int(np.searchsorted(tr.s, sv)); th = tr.ths[i]
            c = tr.pts[i] + off * np.array([-math.sin(th), math.cos(th)]) * rng.choice([-1, 1])
            L_, W_ = (NL * 0.92, NW * 0.92) if kind == "n" else (ML, MW)
            pg = capsule(c, th + rng.gauss(0, 0.10), L_, W_)
            if free(pg.buffer(2.2)):
                (nissl if kind == "n" else mito).append((c, th, 0.92 if kind == "n" else 1.0)); placed.append(pg.buffer(1.5))
    for c, th in scatter(17, NL, NW, 96, tang, avoid=wedge):
        nissl.append((c, th, 1.0))
    for c, th in scatter(9, ML, MW, 100, anyo):
        mito.append((c, th, 1.0))
    # one mitochondrion in the hillock, two slim ones travelling down the axon
    for sv, k, sc in ((330, 0.0, 0.62), (486, 0.0, 0.62)):
        i = int(np.searchsorted(ax["s"], sv)); p = ax["pts"][i] + nrm * k
        t_loc = math.atan2(*(ax["pts"][i + 1] - ax["pts"][i - 1])[::-1])
        mito.append((p, t_loc, sc)); placed.append(capsule(p, t_loc, ML * sc, MW * sc).buffer(2))
    lys = [(c, rng.uniform(4.3, 5.6)) for c, _ in scatter(6, 0, 11.5, 92, anyo, pad=2.2)]
    ros = [c for c, _ in scatter(30, 0, 10.0, 104, anyo, pad=1.6)]
    rib_dots = []
    for c in ros:
        k = rng.choice([5, 6, 6, 7]); a0_ = rng.uniform(0, 6.28)
        for m in range(k):
            a = a0_ + 2 * math.pi * m / k + rng.gauss(0, 0.18)
            rib_dots.append(c + rng.uniform(2.6, 3.7) * U(a))
    singles = [c for c, _ in scatter(46, 0, 3.4, 108, anyo, pad=1.2)]
    O.update(nissl=nissl, mito=mito, lys=lys, rosettes=ros, rib_dots=rib_dots, rib_singles=singles, nissl_size=(NL, NW), mito_size=(ML, MW))
    # synapse details on the final membrane
    ext = neuron.exterior
    for key in ("syn_soma", "syn_dend"):
        sy = G["S"][key]; c, n, rb = sy["c"], sy["n"], sy["rb"]
        t = ext.project(Point(c))
        seg = substring(ext, max(t - 7.5, 0), t + 7.5)
        sy["psd"] = np.array(seg.coords)
        ves_ = []
        for _ in range(400):
            if len(ves_) >= 8: break
            q = c - n * 2.6 + np.array([rng.uniform(-rb, rb), rng.uniform(-rb, rb)])
            if np.linalg.norm(q - c) > rb - 3.0: continue
            if (q - c) @ n > 2.2: continue
            if all(np.linalg.norm(q - v) > 3.3 for v in ves_): ves_.append(q)
        sy["ves"] = ves_
        sy["mito"] = (c + n * (rb * 0.52), math.atan2(n[1], n[0]) + math.pi / 2)
    G["O"] = O
    return G

# ------------------------------------------------------------------ stage 7: incoming axons (drawn faint, behind the cell)
GHOST_OUT = 1.2                       # outline thickness of the faint fibres
SPINE_EXT = {0: 0.85, 1: 2.05, 2: 1.5}   # how far a drawn spine reaches past its centreline tip, by kind

def stage7(G, rng, P=None):
    """Axons of other neurons crossing the dendritic field. Where a fibre passes a spine head it swells into an
    en-passant bouton that sits one cleft away from that spine, then carries on and leaves the frame."""
    P = P or {}
    neuron = G["neuron"]; S = G["S"]; ax = G["axon"]
    tips = np.array([t for b, t, k in G["spines"]]); bases = np.array([b for b, t, k in G["spines"]]); kinds = [k for b, t, k in G["spines"]]
    sdir = tips - bases; sdir /= np.linalg.norm(sdir, axis=1)[:, None]
    A_MAJ, B_MIN, R_F, CLEFT = 6.2, 4.0, 1.5, 1.3
    contact = lambda k: SPINE_EXT[k] + OUT + CLEFT + GHOST_OUT + B_MIN
    others = unary_union([S["astro"]["poly"], S["syn_soma"]["poly"], S["syn_dend"]["poly"]])
    keep = prep(unary_union([others.buffer(24), LineString(ax["pts"]).buffer(30), Point(C).buffer(150)]))
    hide = prep(neuron.buffer(B_MIN + 1.0))
    fibres = []; used = np.zeros(len(tips), bool); placed_B = np.zeros((0, 2)); laid = []
    want = P.get("afferents", 8)
    for attempt in range(6000):
        if len(fibres) >= want: break
        phi = rng.uniform(-math.pi, math.pi); rho = rng.uniform(190, 560)
        p0 = C + rho * U(phi) * np.array([1.0, 0.8])
        if not (30 < p0[0] < W - 30 and 30 < p0[1] < H - 30): continue
        th0 = phi + rng.choice([-1, 1]) * rng.uniform(ang(32), ang(62))
        kap = rng.uniform(-0.0016, 0.0016)
        def run(sign):
            pts = []; x, y = p0; th = th0 + (math.pi if sign < 0 else 0); k = kap * sign
            for i in range(900):
                k = 0.985 * k + rng.gauss(0, 0.00042)
                k = max(-0.0075, min(0.0075, k))
                th += k * 2.0
                x += 2.0 * math.cos(th); y += 2.0 * math.sin(th)
                pts.append((x, y))
                if x < -14 or x > W + 14 or y < -14 or y > H + 14: break
            return pts
        path = np.array(run(-1)[::-1] + [tuple(p0)] + run(+1))
        if len(path) < 230: continue
        line = LineString(path)
        if keep.intersects(line): continue
        # keep fibres from running alongside each other
        if any(np.sum(np.min(np.hypot(path[::6, None, 0] - q[None, ::6, 0], path[::6, None, 1] - q[None, ::6, 1]), axis=1) < 17) > 5 for q in laid): continue
        if sum(1 for q in laid if LineString(q).crosses(line)) > 2: continue
        s = arclen(path)
        D = np.hypot(tips[:, None, 0] - path[None, :, 0], tips[:, None, 1] - path[None, :, 1])
        j = np.argmin(D, axis=1); d = D[np.arange(len(tips)), j]
        cand = []
        for i in np.where((d < 15.5) & (d > 1.0) & ~used)[0]:
            if j[i] < 8 or j[i] > len(path) - 9: continue
            q = path[j[i]]; u = (q - tips[i]) / d[i]
            if u @ sdir[i] < 0.5: continue                      # the fibre has to pass beyond the spine head, not beside the neck
            Bc = tips[i] + u * contact(kinds[i])
            if not (10 < Bc[0] < W - 10 and 10 < Bc[1] < H - 10): continue
            if hide.contains(Point(Bc)) or others.distance(Point(Bc)) < 9: continue
            od = np.hypot(tips[:, 0] - Bc[0], tips[:, 1] - Bc[1]); od[i] = 99
            if od.min() < B_MIN + 2.2: continue                  # not on top of a neighbouring spine
            if len(placed_B) and np.min(np.hypot(placed_B[:, 0] - Bc[0], placed_B[:, 1] - Bc[1])) < 13: continue
            cand.append((abs(contact(kinds[i]) - d[i]) - (1.5 if kinds[i] == 1 else 0), i, Bc))
        cand.sort(key=lambda c: c[0])
        chosen = []
        for cost, i, Bc in cand:
            if cost > 6.5: break
            if all(abs(s[j[i]] - s[j[c[1]]]) > 34 for c in chosen): chosen.append((cost, i, Bc))
            if len(chosen) >= 7: break
        if len(chosen) < 3: continue
        # bend the path so it passes exactly through every bouton centre
        disp = np.zeros_like(path)
        for cost, i, Bc in chosen:
            w = np.exp(-((s - s[j[i]]) / 15.0) ** 2)
            disp += np.outer(w, Bc - path[j[i]])
        path2 = path + disp
        if keep.intersects(LineString(path2)): continue
        tg = np.gradient(path2, axis=0); tg /= np.linalg.norm(tg, axis=1)[:, None]
        shapes = [LineString(path2).buffer(R_F, quad_segs=6)]; bout = []
        for cost, i, Bc in chosen:
            c = path2[j[i]]; a = math.degrees(math.atan2(tg[j[i]][1], tg[j[i]][0]))
            shapes.append(affinity.rotate(affinity.scale(Point(c).buffer(1.0, quad_segs=16), A_MAJ, B_MIN), a, origin=(c[0], c[1])))
            bout.append((c, a)); used[i] = True
            placed_B = np.vstack([placed_B, c])
        poly = closing(unary_union(shapes), 3.2, qs=8).intersection(box(-8, -8, W + 8, H + 8))
        poly = biggest(poly)
        fibres.append(dict(path=path2, boutons=bout, poly=poly, spines=[i for _, i, _ in chosen]))
        laid.append(path2)
    G["afferents"] = fibres
    return G

def compose(seed=31, P=None, verbose=False, upto=9):
    P = P or {}
    rng = random.Random(seed)
    Branch._n = 0
    G = stage1(rng, P)
    if upto >= 2: stage2(G, rng)
    if upto >= 3: stage3(G, rng, P)
    if upto >= 4: stage4(G)
    if upto >= 5: stage5(G, rng, P)
    if upto >= 6: stage6(G, random.Random(seed * 7 + 3))
    if upto >= 7: stage7(G, random.Random(seed * 11 + 5), P)
    if verbose:
        print("branches", len(G.get("branches", [])), "len", int(sum(b.length for b in G.get("branches", []))), "spines", len(G.get("spines", [])),
              "incoming axons", len(G.get("afferents", [])), "boutons", sum(len(f["boutons"]) for f in G.get("afferents", [])))
    return G
