#!/usr/bin/env python3
"""Trace the app mark from the owner's drawing of the brain.

The mark is the line drawing of a brain wired with circuit traces and nodes,
supplied as brain.jpg beside this script (white strokes on a dark ground, soft
from its journey). This traces it into one clean vector path so the icons can
be drawn at any size:

    python3 scripts/appmark/trace.py

writes two files into site/assets: app-mark.svg, the path alone filled with
currentColor, and app-mark-colour.svg, the same path wearing the ring's
colours (the palette of scripts/make_logo.py, swept clockwise from the top as
the ring carries them, in ninety flat wedges that read as one sweep). Neither
carries a background, so the icon script chooses the ground: white for the
app icons, the paper black for the splash screens.

The drawing is cropped to its ink, enlarged three times and softened, the glow
is cut off at the stroke's core, the edge is followed at sub-pixel precision
(marching squares), simplified and smoothed into cubic curves.

Needs numpy, scipy and Pillow (python3.13 here).
"""

import math
import os
import sys

import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "brain.jpg")
SCALE = 3          # enlargement before tracing
BLUR = 1.2         # softening after enlargement, in pixels
LEVEL = 140        # where the stroke's core ends and the glow begins (0-255)
SIMPLIFY = 1.5     # Douglas-Peucker tolerance, in enlarged pixels
MIN_LOOP = 60      # drop specks shorter than this, in enlarged pixels
MARGIN = 0.04      # breathing room around the ink, as a share of its width
OUT_MONO = os.path.join(HERE, "..", "..", "site", "assets", "app-mark.svg")
OUT_COLOUR = os.path.join(HERE, "..", "..", "site", "assets", "app-mark-colour.svg")
WEDGES = 90        # the sweep of colour, in flat steps of four degrees

# the ring's palette, as scripts/make_logo.py has it, clockwise from the top
PALETTE = ["#915AD8", "#CD5AD8", "#E250A9", "#FF507A", "#FF704E", "#F89F3A",
           "#DAD358", "#AFF05B", "#6BF75C", "#41F186", "#4AE8C3", "#4DCAE5",
           "#4E95E4", "#5A61D8"]


def palette_at(t):
    """The ring's colour at t, a share of the way round clockwise from the top."""
    x = (t % 1.0) * len(PALETTE)
    i, f = int(x), x - int(x)
    a = tuple(int(PALETTE[i][k:k + 2], 16) for k in (1, 3, 5))
    b = tuple(int(PALETTE[(i + 1) % len(PALETTE)][k:k + 2], 16) for k in (1, 3, 5))
    return "#%02X%02X%02X" % tuple(round(a[k] + (b[k] - a[k]) * f) for k in range(3))


def field():
    im = Image.open(SRC).convert("L")
    big = im.resize((im.width * SCALE, im.height * SCALE), Image.BICUBIC).filter(ImageFilter.GaussianBlur(BLUR))
    f = np.asarray(big).astype(np.float32)
    # 0 = ground, 1 = ink, crossing 0.5 at the stroke's core
    f = np.clip((f - (LEVEL - 20)) / 40.0, 0.0, 1.0)
    ink = f >= 0.5
    # keep the drawing, drop any speck of noise
    lab, n = ndimage.label(ink)
    if n > 1:
        sizes = ndimage.sum(ink, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 200])
        f = np.where(keep, f, 0.0).astype(np.float32)
        ink = f >= 0.5
    ys, xs = np.where(ink)
    pad = 6
    y0, y1 = max(0, ys.min() - pad), min(f.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(f.shape[1], xs.max() + pad + 1)
    return f[y0:y1, x0:x1]


# edges of a cell: 0 top, 1 right, 2 bottom, 3 left
SEGS = {
    1: [(3, 2)], 2: [(2, 1)], 3: [(3, 1)], 4: [(0, 1)], 6: [(0, 2)], 7: [(3, 0)],
    8: [(3, 0)], 9: [(0, 2)], 11: [(0, 1)], 12: [(3, 1)], 13: [(2, 1)], 14: [(3, 2)],
}


def contours(f):
    """Marching squares at level .5 over the field: closed loops of points."""
    H, W = f.shape
    b = f >= 0.5
    tl, tr, br, bl = b[:-1, :-1], b[:-1, 1:], b[1:, 1:], b[1:, :-1]
    idx = tl.astype(np.uint8) * 8 + tr.astype(np.uint8) * 4 + br.astype(np.uint8) * 2 + bl.astype(np.uint8)
    cells = np.argwhere((idx > 0) & (idx < 15))

    def cross(a, bv):
        d = bv - a
        return 0.5 if d == 0 else (0.5 - a) / d

    def point(i, j, e):
        # i, j: the cell's top-left corner; e: the edge crossed
        if e == 0:
            return (j + cross(f[i, j], f[i, j + 1]), float(i))
        if e == 1:
            return (float(j + 1), i + cross(f[i, j + 1], f[i + 1, j + 1]))
        if e == 2:
            return (j + cross(f[i + 1, j], f[i + 1, j + 1]), float(i + 1))
        return (float(j), i + cross(f[i, j], f[i + 1, j]))

    segs = []
    for i, j in cells:
        c = int(idx[i, j])
        if c == 5 or c == 10:
            centre = (f[i, j] + f[i, j + 1] + f[i + 1, j] + f[i + 1, j + 1]) / 4 >= 0.5
            if c == 5:
                pairs = [(3, 0), (1, 2)] if centre else [(0, 1), (3, 2)]
            else:
                pairs = [(0, 1), (3, 2)] if centre else [(3, 0), (1, 2)]
        else:
            pairs = SEGS[c]
        for e0, e1 in pairs:
            segs.append((point(i, j, e0), point(i, j, e1)))

    # link the segments into loops by their shared end points
    key = lambda p: (round(p[0] * 64), round(p[1] * 64))
    at = {}
    for s, (p, q) in enumerate(segs):
        at.setdefault(key(p), []).append(s)
        at.setdefault(key(q), []).append(s)
    used = [False] * len(segs)
    loops = []
    for s0 in range(len(segs)):
        if used[s0]:
            continue
        used[s0] = True
        p, q = segs[s0]
        loop = [p, q]
        cur = q
        while True:
            nxt = None
            for s in at.get(key(cur), []):
                if not used[s]:
                    nxt = s
                    break
            if nxt is None:
                break
            used[nxt] = True
            a, bq = segs[nxt]
            cur = bq if key(a) == key(cur) else a
            if key(cur) == key(loop[0]):
                break
            loop.append(cur)
        if len(loop) >= 3:
            loops.append(loop)
    return loops


def simplify(pts, tol):
    """Douglas-Peucker on a closed loop, keeping the loop closed."""
    pts = np.asarray(pts, dtype=np.float64)
    n = len(pts)
    if n < 6:
        return pts
    # open the loop at its two most distant points, simplify each half
    d = np.hypot(*(pts - pts[0]).T)
    far = int(np.argmax(d))
    order = np.r_[np.arange(0, far + 1), np.arange(far, n), [0]]
    half1, half2 = pts[order[: far + 1]], pts[order[far:]]

    def dp(seg):
        keep = np.zeros(len(seg), dtype=bool)
        keep[0] = keep[-1] = True
        stack = [(0, len(seg) - 1)]
        while stack:
            a, bq = stack.pop()
            if bq - a < 2:
                continue
            p, q = seg[a], seg[bq]
            v = q - p
            L = np.hypot(*v)
            if L == 0:
                dist = np.hypot(*(seg[a + 1:bq] - p).T)
            else:
                w = seg[a + 1:bq] - p
                dist = np.abs(v[0] * w[:, 1] - v[1] * w[:, 0]) / L
            k = int(np.argmax(dist))
            if dist[k] > tol:
                keep[a + 1 + k] = True
                stack.append((a, a + 1 + k))
                stack.append((a + 1 + k, bq))
        return seg[keep]

    out = np.vstack([dp(half1)[:-1], dp(half2)[:-1]])
    return out


def bezier_path(pts):
    """A closed Catmull-Rom spline through the points, as SVG cubic curves."""
    n = len(pts)
    if n < 3:
        return ""
    d = [f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"]
    for i in range(n):
        p0, p1, p2, p3 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = p1 + (p2 - p0) / 6.0
        c2 = p2 - (p3 - p1) / 6.0
        d.append(f"C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}")
    d.append("Z")
    return "".join(d)


def main():
    f = field()
    loops = contours(f)
    paths, kept = [], 0
    for loop in loops:
        pts = np.asarray(loop)
        length = np.hypot(*(np.roll(pts, -1, axis=0) - pts).T).sum()
        if length < MIN_LOOP:
            continue
        s = simplify(loop, SIMPLIFY)
        if len(s) >= 3:
            paths.append(bezier_path(s))
            kept += 1
    H, W = f.shape
    m = W * MARGIN
    vb = f"{-m:.1f} {-m:.1f} {W + 2 * m:.1f} {H + 2 * m:.1f}"
    d = "".join(paths)
    head = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" role="img" aria-label="VisualNeuroscience">\n'
            "<title>VisualNeuroscience</title>\n")
    with open(OUT_MONO, "w") as out:
        out.write(head + '<path fill="currentColor" fill-rule="evenodd" d="' + d + '"/>\n</svg>\n')
    # the sweep: wedges from the drawing's centre, each a flat step of the palette,
    # overlapping their neighbours a touch so no hairline shows between them
    cx, cy, R = W / 2.0, H / 2.0, math.hypot(W, H)
    step = 360.0 / WEDGES
    defs, uses = ['<path id="brain" fill-rule="evenodd" d="' + d + '"/>'], []
    for i in range(WEDGES):
        a0 = math.radians(-90 + i * step - 0.35)
        a1 = math.radians(-90 + (i + 1) * step + 0.35)
        pts = f"{cx:.1f},{cy:.1f} {cx + R * math.cos(a0):.1f},{cy + R * math.sin(a0):.1f} {cx + R * math.cos(a1):.1f},{cy + R * math.sin(a1):.1f}"
        defs.append(f'<clipPath id="w{i}"><polygon points="{pts}"/></clipPath>')
        uses.append(f'<use href="#brain" clip-path="url(#w{i})" fill="{palette_at((i + 0.5) / WEDGES)}"/>')
    with open(OUT_COLOUR, "w") as out:
        out.write(head + "<defs>" + "".join(defs) + "</defs>\n" + "\n".join(uses) + "\n</svg>\n")
    sys.stderr.write(f"traced {kept} loops of {len(loops)} from a {W}x{H} field; wrote {os.path.relpath(OUT_MONO)} and {os.path.relpath(OUT_COLOUR)}\n")


if __name__ == "__main__":
    main()
