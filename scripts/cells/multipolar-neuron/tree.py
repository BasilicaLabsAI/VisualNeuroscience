"""Dendritic tree growth with rejection sampling against already-placed geometry (numpy distance checks)."""
import math, random
import numpy as np
from shapely.geometry import Polygon, Point, LineString, box
from shapely.prepared import prep
from geom import *

class Branch:
    _n = 0
    def __init__(self, tree, order, pts, ths, radii, parent=None, kind="end"):
        self.tree, self.order, self.pts, self.ths, self.radii = tree, order, pts, ths, radii
        self.parent, self.kind = parent, kind
        self.children = []
        self.poly = poly_of(pts, radii)
        Branch._n += 1
        self.id = Branch._n
        seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
        self.s = np.concatenate([[0], np.cumsum(seg)])
        self.length = self.s[-1]
        self.s0 = 0.0

def radii_taper(n, r0, r1):
    t = np.linspace(0, 1, n)
    return r0 + (r1 - r0) * t ** 0.85

class Grower:
    def __init__(self, rng, centre, bounds_xyxy, keepouts, clearance=15.0):
        self.rng = rng
        self.centre = np.array(centre, float)
        self.bx = bounds_xyxy
        self.keepouts = keepouts
        self.keep_prep = [prep(k) for k in keepouts]
        self.clear = clearance
        self.branches = []
        self._P = np.zeros((0, 2)); self._R = np.zeros(0); self._B = np.zeros(0, int)

    def set_keepouts(self, keepouts):
        self.keepouts = keepouts
        self.keep_prep = [prep(k) for k in keepouts]

    def add(self, b):
        self.branches.append(b)
        self._P = np.vstack([self._P, b.pts])
        self._R = np.concatenate([self._R, b.radii])
        self._B = np.concatenate([self._B, np.full(len(b.pts), b.id)])

    def _ok(self, pts, rad, parent, siblings, skip=16.0, use_keep=True):
        seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
        s = np.concatenate([[0], np.cumsum(seg)])
        L = s[-1]
        distal = s >= skip
        if distal.sum() < 2: return False
        x0, y0, x1, y1 = self.bx
        m = rad + 6.0
        if (pts[:, 0] - m < x0).any() or (pts[:, 0] + m > x1).any() or (pts[:, 1] - m < y0).any() or (pts[:, 1] + m > y1).any():
            return False
        if use_keep and self.keep_prep:
            line = LineString(pts[distal]).buffer(float(rad[distal].max()) + 2.0)
            for k in self.keep_prep:
                if k.intersects(line): return False
        if len(self._P):
            late = s >= 0.5 * L
            fam = set([parent.id] if parent is not None else []) | set(sb.id for sb in siblings)
            is_fam = np.isin(self._B, list(fam)) if fam else np.zeros(len(self._B), bool)
            D = np.hypot(pts[:, None, 0] - self._P[None, :, 0], pts[:, None, 1] - self._P[None, :, 1])
            need = rad[:, None] + self._R[None, :] + self.clear
            bad = D < need
            # non-family: check all distal points; family: only the late half
            if bad[np.ix_(distal, ~is_fam)].any(): return False
            if is_fam.any() and bad[np.ix_(late, is_fam)].any(): return False
        return True

    def try_branch(self, tree, order, p0, th0, L, r0, r1, parent, siblings, kind, tries=60, spread=0.0,
                   wiggle=0.0016, relax=0.004, shrink=0.72, min_len=34, curl_max=0.0042):
        rng = self.rng
        length = L
        while length >= min_len:
            for t in range(tries):
                th = th0 + rng.uniform(-spread, spread)
                curl = rng.uniform(-curl_max, curl_max)
                pts, ths = walk(p0, th, length, rng, ds=4.0, wiggle=wiggle, relax_to=self.centre, relax=relax, curl=curl)
                rad = radii_taper(len(pts), r0, r1)
                if self._ok(pts, rad, parent, siblings):
                    b = Branch(tree, order, pts, ths, rad, parent, kind)
                    self.add(b)
                    if parent is not None: parent.children.append(b)
                    return b
            length *= shrink
        return None
