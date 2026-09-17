"""Geometry helpers for the multipolar-neuron plate (original construction, seeded)."""
import math, random
import numpy as np
from shapely.geometry import Polygon, Point, LineString
from shapely.ops import unary_union

def ang(d): return math.radians(d)

def angdiff(a, b):
    """signed smallest difference a-b in radians"""
    return (a - b + math.pi) % (2 * math.pi) - math.pi

def walk(p0, th0, length, rng, ds=4.0, wiggle=0.010, relax_to=None, relax=0.0, curl=0.0):
    """Smooth random-walk centreline. Returns (N,2) array of points, list of headings."""
    n = max(2, int(round(length / ds)))
    x, y = float(p0[0]), float(p0[1])
    xs = [x]; ys = [y]; ths = [th0]
    th = th0; k = curl
    gauss = rng.gauss; cos = math.cos; sin = math.sin; atan2 = math.atan2; pi = math.pi
    if relax_to is not None:
        cx, cy = float(relax_to[0]), float(relax_to[1])
    for i in range(n):
        k = 0.86 * k + gauss(0, wiggle) + 0.14 * curl
        th = th + k * ds
        if relax_to is not None and relax > 0:
            radial = atan2(y - cy, x - cx)
            th += relax * ((radial - th + pi) % (2 * pi) - pi)
        x += ds * cos(th); y += ds * sin(th)
        xs.append(x); ys.append(y); ths.append(th)
    return np.array([xs, ys]).T, ths

def outline(pts, radii, cap_n=5):
    """Closed outline (list of points) of a variable-width stroke, with round caps both ends."""
    pts = np.asarray(pts, float)
    n = len(pts)
    tang = np.zeros_like(pts)
    tang[1:-1] = pts[2:] - pts[:-2]
    tang[0] = pts[1] - pts[0]
    tang[-1] = pts[-1] - pts[-2]
    tang /= np.linalg.norm(tang, axis=1)[:, None]
    nor = np.stack([-tang[:, 1], tang[:, 0]], axis=1)  # left normal (screen coords)
    r = np.asarray(radii, float)[:, None]
    left = pts + nor * r
    right = pts - nor * r
    out = list(left)
    # tip cap
    th_t = math.atan2(tang[-1][1], tang[-1][0])
    for j in range(1, cap_n):
        a = th_t + math.pi / 2 - math.pi * j / cap_n
        out.append(pts[-1] + radii[-1] * np.array([math.cos(a), math.sin(a)]))
    out += list(right[::-1])
    # start cap (behind the start)
    th_s = math.atan2(tang[0][1], tang[0][0])
    for j in range(1, cap_n):
        a = th_s - math.pi / 2 - math.pi * j / cap_n
        out.append(pts[0] + radii[0] * np.array([math.cos(a), math.sin(a)]))
    return out

def fmt(v):
    s = f"{v:.1f}"
    if s.endswith(".0"): s = s[:-2]
    if s == "-0": s = "0"
    return s

def P(p): return f"{fmt(p[0])} {fmt(p[1])}"

def smooth_closed(pts):
    """Closed Catmull-Rom spline through pts as cubic Beziers."""
    pts = [np.asarray(p, float) for p in pts]
    n = len(pts)
    d = "M" + P(pts[0])
    for i in range(n):
        p0, p1, p2, p3 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = p1 + (p2 - p0) / 6.0
        c2 = p2 - (p3 - p1) / 6.0
        d += "C" + P(c1) + " " + P(c2) + " " + P(p2)
    return d + "Z"

def smooth_open(pts):
    pts = [np.asarray(p, float) for p in pts]
    n = len(pts)
    d = "M" + P(pts[0])
    for i in range(n - 1):
        p0 = pts[max(i - 1, 0)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(i + 2, n - 1)]
        c1 = p1 + (p2 - p0) / 6.0
        c2 = p2 - (p3 - p1) / 6.0
        d += "C" + P(c1) + " " + P(c2) + " " + P(p2)
    return d

def resample(pts, step):
    """Resample polyline at ~step spacing, keeping the end points."""
    pts = np.asarray(pts, float)
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    total = s[-1]
    m = max(2, int(round(total / step)) + 1)
    t = np.linspace(0, total, m)
    x = np.interp(t, s, pts[:, 0]); y = np.interp(t, s, pts[:, 1])
    return np.stack([x, y], axis=1), t, s

def poly_of(pts, radii):
    o = outline(pts, radii, cap_n=6)
    pg = Polygon(o)
    if not pg.is_valid:
        pg = pg.buffer(0)
    return pg
