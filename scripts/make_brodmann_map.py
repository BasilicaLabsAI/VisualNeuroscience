#!/usr/bin/env python3
"""Trace the flat Brodmann map out of the volume, lateral and medial.

    python3 scripts/make_brodmann_map.py > site/assets/brodmann-map.js

The cartoon is not drawn by hand here. Each view is a projection of the atlas
itself: for the external view, walk in from the far left and take the first
labelled voxel over every point of the (y, z) plane; for the internal view,
walk out from the midline instead. What that returns is exactly what you would
see looking at the hemisphere from outside or from the cut face — which is why
area 41 is absent from the external view and area 25 from neither: 41 really
is buried in the Sylvian fissure, and the projection knows it.

The resulting label images are then traced to vector. Every boundary between
one area and another is followed exactly along the pixel edges, simplified,
and smoothed, so the map scales without going blocky and every area is a real
shape that can be clicked rather than a coloured rectangle.

Both views put anterior on the left. The medial view is conventionally drawn
facing the other way; the two are read side by side here and mirroring one of
them makes the pair harder to hold in the head.
"""

import gzip, json, os, struct, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATLAS = os.path.join(ROOT, "site", "assets", "brodmann.nii.gz")


def load(path):
    d = gzip.open(path, "rb").read()
    dim = struct.unpack("<8h", d[40:56])[1:4]
    off = int(struct.unpack("<f", d[108:112])[0])
    v = np.frombuffer(d[off:off + dim[0]*dim[1]*dim[2]], dtype=np.uint8)
    return v.reshape(dim[2], dim[1], dim[0]).transpose(2, 1, 0)


def project(vol, order):
    nx, ny, nz = vol.shape
    out = np.zeros((ny, nz), dtype=np.uint8)
    for i in order:
        sl = vol[i]
        m = (out == 0) & (sl > 0)
        out[m] = sl[m]
    return out


def loops(mask):
    """Every closed boundary of a binary mask, followed along pixel edges.

    Each inside pixel contributes the sides that face outside, as directed
    corner-to-corner segments wound so the inside stays on the left. Chaining
    them by shared corner yields exact loops — no marching-squares ambiguity
    at a diagonal touch, which these labels are full of."""
    h, w = mask.shape
    edges = {}
    for y in range(h):
        row = mask[y]
        for x in range(w):
            if not row[x]:
                continue
            if y == 0 or not mask[y-1][x]:   edges.setdefault((x, y),       []).append((x+1, y))
            if x == w-1 or not mask[y][x+1]: edges.setdefault((x+1, y),     []).append((x+1, y+1))
            if y == h-1 or not mask[y+1][x]: edges.setdefault((x+1, y+1),   []).append((x, y+1))
            if x == 0 or not mask[y][x-1]:   edges.setdefault((x, y+1),     []).append((x, y))
    out = []
    while edges:
        start = next(iter(edges))
        path = [start]
        cur = start
        while True:
            nxts = edges.get(cur)
            if not nxts:
                break
            nxt = nxts.pop()
            if not nxts:
                del edges[cur]
            path.append(nxt)
            cur = nxt
            if cur == start:
                break
        if len(path) > 8:
            out.append(path)
    return out


def rdp(pts, eps):
    """Douglas-Peucker, so a staircase of unit steps becomes a few points."""
    if len(pts) < 3:
        return pts
    a, b = np.array(pts[0], float), np.array(pts[-1], float)
    ab = b - a
    n = np.hypot(*ab)
    P = np.array(pts, float)
    if n == 0:
        d = np.hypot(*(P - a).T)
    else:
        d = np.abs(np.cross(np.tile(ab, (len(P), 1)), P - a)) / n
    i = int(np.argmax(d))
    if d[i] > eps:
        return rdp(pts[:i+1], eps)[:-1] + rdp(pts[i:], eps)
    return [pts[0], pts[-1]]


def smooth(pts, t=0.22):
    n = len(pts)
    if n < 4:
        return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z"
    d = [f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"]
    for i in range(n):
        p0, p1, p2, p3 = pts[(i-1) % n], pts[i % n], pts[(i+1) % n], pts[(i+2) % n]
        c1 = (p1[0] + (p2[0]-p0[0])*t, p1[1] + (p2[1]-p0[1])*t)
        c2 = (p2[0] - (p3[0]-p1[0])*t, p2[1] - (p3[1]-p1[1])*t)
        d.append(f"C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}")
    return " ".join(d) + "Z"


def trace(img, scale=3.0, eps=1.1):
    """label -> {d: svg path, at: [x, y] for the number}"""
    ny, nz = img.shape
    W, H = ny, nz
    areas = {}
    for ba in sorted(int(v) for v in np.unique(img) if v):
        mask = (img == ba)
        if mask.sum() < 40:          # a few stray voxels are not an area here
            continue
        # to image space: anterior left, superior up
        m2 = np.zeros((H, W), dtype=bool)
        ys, xs = np.nonzero(mask)                     # ys=j (A-P), xs=k (S-I)
        m2[H - 1 - xs, W - 1 - ys] = True
        parts = []
        for lp in loops(m2):
            s = rdp(lp, eps)
            if len(s) > 3 and abs(_area(s)) > 12:
                parts.append(smooth([(x*scale, y*scale) for x, y in s]))
        if not parts:
            continue
        # the number goes at the centroid, unless the shape is concave enough
        # that the centroid falls outside it — then at the filled pixel
        # nearest the centroid, so a label never floats in a notch
        cy, cx = np.nonzero(m2)
        mx, my = float(cx.mean()), float(cy.mean())
        if not m2[int(round(my)) % m2.shape[0], int(round(mx)) % m2.shape[1]]:
            k = int(np.argmin((cx - mx)**2 + (cy - my)**2))
            mx, my = float(cx[k]), float(cy[k])
        areas[ba] = {"d": " ".join(parts),
                     "at": [round(mx*scale, 1), round(my*scale, 1)]}
    return areas, round(W*scale, 1), round(H*scale, 1)


def _area(p):
    s = 0.0
    for i in range(len(p)):
        x1, y1 = p[i]; x2, y2 = p[(i+1) % len(p)]
        s += x1*y2 - x2*y1
    return s/2


vol = load(ATLAS)
mid = vol.shape[0] // 2
lat, W, H = trace(project(vol, range(0, mid)))
med, _, _ = trace(project(vol, range(mid, -1, -1)))

sys.stderr.write(f"lateral {len(lat)} areas, medial {len(med)} areas, frame {W}x{H}\n")

print("/* The flat Brodmann map, traced out of the volume by")
print("   scripts/make_brodmann_map.py. Do not edit by hand — re-run it. */")
print("window.MN_BA_MAP = {")
print(f'  viewBox: "0 0 {W:.0f} {H:.0f}",')
for name, tbl in (("lateral", lat), ("medial", med)):
    print(f"  {name}: {{")
    for ba in sorted(tbl):
        print(f'    {ba}: {{d:"{tbl[ba]["d"]}", at:{json.dumps(tbl[ba]["at"])}}},')
    print("  },")
print("};")
