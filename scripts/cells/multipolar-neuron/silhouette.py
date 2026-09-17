"""Union + morphological closing -> one organic silhouette, plus region polygons."""
import math
import numpy as np
from shapely.geometry import Polygon, MultiPolygon, LineString, Point
from shapely.ops import unary_union, substring
from shapely import affinity
from geom import *

def closing(g, r, qs=12):
    return g.buffer(r, quad_segs=qs).buffer(-r, quad_segs=qs)

def biggest(g):
    if isinstance(g, MultiPolygon):
        return max(g.geoms, key=lambda x: x.area)
    return g

def build_silhouette(G, R_core=22.0, R_fine=5.0):
    soma = G["soma_poly"]
    trunks = [b.poly for b in G["branches"] if b.order == 1]
    rest = [b.poly for b in G["branches"] if b.order > 1]
    core = unary_union([soma, G["axon_poly"]] + trunks)
    core_c = closing(core, R_core)
    allg = unary_union([core_c] + rest)
    neuron = closing(allg, R_fine)
    neuron = biggest(neuron)
    # clip to canvas a little beyond the right edge so the axon runs off-frame cleanly
    return neuron

def axon_section(G, s_a, s_b, halfw):
    ax = G["axon"]
    line = LineString(ax["pts"])
    seg = substring(line, s_a, s_b)
    return seg.buffer(halfw, cap_style="flat")

def regions(G, neuron):
    soma_mask = affinity.scale(G["soma_poly"], 1.09, 1.09, origin=(C[0], C[1]))
    cuts = G["axon_cuts"]
    hill = axon_section(G, 0, cuts["hillock"][1], 60)
    ini = axon_section(G, cuts["initial"][0], cuts["initial"][1], 30)
    axn = axon_section(G, cuts["axon"][0], cuts["axon"][1], 30)
    R = {}
    R["hillock"] = neuron.intersection(hill).difference(soma_mask)
    R["initial"] = neuron.intersection(ini)
    R["axon"] = neuron.intersection(axn)
    ax_all = unary_union([R["hillock"], R["initial"], R["axon"]]).buffer(0.6)
    R["soma"] = neuron.intersection(soma_mask)
    den = neuron.difference(soma_mask.buffer(-0.3)).difference(ax_all)
    parts = [g for g in (den.geoms if hasattr(den, "geoms") else [den]) if g.area > 40]
    R["dendrites"] = MultiPolygon(parts)
    # hillock may pick up slivers next to soma: keep the biggest piece
    R["hillock"] = biggest(R["hillock"])
    return R, soma_mask

def ring_path(ring, tol=0.3, rel=True):
    ls = LineString(ring.coords).simplify(tol, preserve_topology=False)
    pts = list(ls.coords)[:-1]
    d = "M" + P(pts[0])
    px, py = pts[0]
    # round the running position to avoid drift
    cx, cy = round(px, 1), round(py, 1)
    for (x, y) in pts[1:]:
        nx, ny = round(x, 1), round(y, 1)
        dx, dy = round(nx - cx, 1), round(ny - cy, 1)
        if dx == 0 and dy == 0: continue
        d += "l" + fmt(dx) + (" " if dy >= 0 else "") + fmt(dy)
        cx, cy = nx, ny
    return d + "z"

def geom_path(g, tol=0.3):
    polys = g.geoms if hasattr(g, "geoms") else [g]
    d = ""
    for pg in polys:
        d += ring_path(pg.exterior, tol)
        for h in pg.interiors:
            d += ring_path(h, tol)
    return d

