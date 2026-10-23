#!/usr/bin/env python3
"""Draw the app mark as line vectors from the owner's drawing of the brain.

The mark is the line drawing of a brain wired with circuit traces and nodes,
supplied as brain.jpg beside this script (white strokes on a dark ground, soft
from its journey). Rather than tracing the strokes' edges, which carry the
drawing's wobble, this finds the centre line of every stroke and draws it
again as a clean stroke of one width with round caps and joins, and replaces
every node with a true circle:

    python3 scripts/appmark/trace.py

writes two files into site/assets: app-mark.svg, the lines in currentColor,
and app-mark-colour.svg, the same lines wearing the ring's colours (the
palette of scripts/make_logo.py, swept clockwise from the top as the ring
carries them, in ninety flat wedges that read as one sweep). Neither carries
a background, so the icon script chooses the ground: white for the app icons,
the paper black for the splash screens.

How: the drawing is cropped to its ink, enlarged three times and softened, the
glow is cut off at the stroke's core, the strokes are thinned to their
skeleton (Zhang-Suen), the skeleton is cut into lines between its junctions,
each line is smoothed and simplified into cubic curves with every bend
rounded, the small holes mark the nodes, which become circles the lines are
snapped to, the stroke's width is read off the drawing, and the corners where
the lines meet each other and the rings are filled with fillets, traced from
a closing of the drawn lines and kept as small filled shapes beside them.

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
OUT_MONO = os.path.join(HERE, "..", "..", "site", "assets", "app-mark.svg")
OUT_COLOUR = os.path.join(HERE, "..", "..", "site", "assets", "app-mark-colour.svg")
SCALE = 3          # enlargement before tracing
BLUR = 1.2         # softening after enlargement, in pixels
LEVEL = 140        # where the stroke's core ends and the glow begins (0-255)
SMOOTH = 7.0       # the lines' smoothing, in enlarged pixels
SIMPLIFY = 1.2     # Douglas-Peucker tolerance, in enlarged pixels
MARGIN = 0.04      # breathing room around the ink, as a share of its width
WEDGES = 90        # the sweep of colour, in flat steps of four degrees
BEND = 0.7         # the least radius of a bend in a line, as a share of the stroke's width
FILLET = 0.4       # the fillet in every corner where lines meet, as a share of the stroke's width

# the ring's palette, as scripts/make_logo.py has it, clockwise from the top
PALETTE = ["#915AD8", "#CD5AD8", "#E250A9", "#FF507A", "#FF704E", "#F89F3A",
           "#DAD358", "#AFF05B", "#6BF75C", "#41F186", "#4AE8C3", "#4DCAE5",
           "#4E95E4", "#5A61D8"]

EIGHT = np.ones((3, 3), dtype=bool)


def palette_at(t):
    """The ring's colour at t, a share of the way round clockwise from the top."""
    x = (t % 1.0) * len(PALETTE)
    i, f = int(x), x - int(x)
    a = tuple(int(PALETTE[i][k:k + 2], 16) for k in (1, 3, 5))
    b = tuple(int(PALETTE[(i + 1) % len(PALETTE)][k:k + 2], 16) for k in (1, 3, 5))
    return "#%02X%02X%02X" % tuple(round(a[k] + (b[k] - a[k]) * f) for k in range(3))


def ink_mask():
    """The drawing's ink, cropped, enlarged and cut off at the stroke's core."""
    im = Image.open(SRC).convert("L")
    big = im.resize((im.width * SCALE, im.height * SCALE), Image.BICUBIC).filter(ImageFilter.GaussianBlur(BLUR))
    f = np.asarray(big).astype(np.float32)
    ink = f >= LEVEL
    lab, n = ndimage.label(ink, structure=EIGHT)
    if n > 1:
        sizes = ndimage.sum(ink, lab, range(1, n + 1))
        ink = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 200])
    ys, xs = np.where(ink)
    pad = 8
    y0, y1 = max(0, ys.min() - pad), min(ink.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(ink.shape[1], xs.max() + pad + 1)
    return ink[y0:y1, x0:x1]


def thin(mask):
    """Zhang-Suen thinning: the strokes reduced to one-pixel centre lines."""
    img = np.pad(mask, 1).astype(bool)
    def nb(a, dy, dx):
        return np.roll(np.roll(a, dy, axis=0), dx, axis=1)
    while True:
        changed = False
        for step in (0, 1):
            P2, P3, P4, P5 = nb(img, 1, 0), nb(img, 1, -1), nb(img, 0, -1), nb(img, -1, -1)
            P6, P7, P8, P9 = nb(img, -1, 0), nb(img, -1, 1), nb(img, 0, 1), nb(img, 1, 1)
            seq = [P2, P3, P4, P5, P6, P7, P8, P9, P2]
            B = sum(p.astype(np.uint8) for p in seq[:8])
            A = sum(((~seq[i]) & seq[i + 1]).astype(np.uint8) for i in range(8))
            if step == 0:
                c1, c2 = ~(P2 & P4 & P6), ~(P4 & P6 & P8)
            else:
                c1, c2 = ~(P2 & P4 & P8), ~(P2 & P6 & P8)
            kill = img & (B >= 2) & (B <= 6) & (A == 1) & c1 & c2
            if kill.any():
                img[kill] = False
                changed = True
        if not changed:
            break
    return img[1:-1, 1:-1]


def neighbour_count(skel):
    return ndimage.convolve(skel.astype(np.uint8), np.ones((3, 3), dtype=np.uint8), mode="constant") - skel.astype(np.uint8)


def crossings(skel):
    """How many times the ring of eight neighbours steps from empty to set:
    one at a line's end, two along it, three or more at a junction. (A count
    of neighbours would call the corner of a diagonal's staircase a junction,
    and cut the line there.)"""
    img = np.pad(skel, 1).astype(bool)
    def nb(dy, dx):
        return np.roll(np.roll(img, dy, axis=0), dx, axis=1)
    seq = [nb(1, 0), nb(1, -1), nb(0, -1), nb(-1, -1), nb(-1, 0), nb(-1, 1), nb(0, 1), nb(1, 1)]
    seq.append(seq[0])
    return sum(((~seq[i]) & seq[i + 1]).astype(np.uint8) for i in range(8))[1:-1, 1:-1]


def prune(skel, length, protect):
    """Drop the short spurs thinning leaves beside bends and rings: a branch
    that runs from a free end into a junction within the given length. Ends
    under the protect mask, the lines cut at the nodes, are real and stay."""
    skel = np.pad(skel, 1).copy()
    protect = np.pad(protect, 1)
    while True:
        junc = crossings(skel) >= 3
        removed = False
        for y, x in np.argwhere(skel & (crossings(skel) <= 1) & ~protect):
            path, cur, prev, hit = [(y, x)], (y, x), None, False
            for _ in range(length):
                nxt = [(cur[0] + dy, cur[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                       if (dy or dx) and skel[cur[0] + dy, cur[1] + dx] and (cur[0] + dy, cur[1] + dx) != prev
                       and (cur[0] + dy, cur[1] + dx) not in path]
                if not nxt:
                    break
                if len(nxt) >= 2 or junc[nxt[0]]:
                    hit = True
                    break
                prev, cur = cur, nxt[0]
                path.append(cur)
            if hit:
                for py, px in path:
                    skel[py, px] = False
                removed = True
        if not removed:
            break
    return skel[1:-1, 1:-1]


def walk(component):
    """Order a one-pixel-wide component's pixels along its length."""
    pts = [tuple(p) for p in component]
    left = set(pts)
    def nbrs(p):
        y, x = p
        out = []
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            q = (y + dy, x + dx)
            if q in left:
                out.append(q)
        return out
    # start at an end if there is one, else anywhere (a loop); an end is a
    # pixel whose neighbours all sit together on one side, which a count
    # would miss where the cut leaves a line's end two pixels wide
    def transitions(p):
        y, x = p
        ring = [(y - 1, x), (y - 1, x + 1), (y, x + 1), (y + 1, x + 1), (y + 1, x), (y + 1, x - 1), (y, x - 1), (y - 1, x - 1)]
        bits = [q in left for q in ring]
        return sum(1 for i in range(8) if not bits[i] and bits[(i + 1) % 8])
    start = next((p for p in pts if transitions(p) <= 1), None)
    closed = start is None
    cur = start or pts[0]
    order = [cur]
    left.discard(cur)
    while True:
        nxt = nbrs(cur)
        if not nxt:
            break
        # straight before diagonal, so the walk does not skip a pixel
        nxt.sort(key=lambda q: abs(q[0] - cur[0]) + abs(q[1] - cur[1]))
        cur = nxt[0]
        order.append(cur)
        left.discard(cur)
    return np.array(order, dtype=np.float64), closed


def resample(pts, step=1.0):
    """The chain's points spaced evenly along its length."""
    if len(pts) < 2:
        return pts
    seg = np.hypot(*np.diff(pts, axis=0).T)
    cum = np.concatenate([[0.0], np.cumsum(seg)])
    total = cum[-1]
    if total < step:
        return pts
    at = np.arange(0.0, total, step)
    at = np.append(at, total)
    return np.stack([np.interp(at, cum, pts[:, k]) for k in range(2)], axis=1)


def smooth_chain(pts, closed, sigma):
    if len(pts) < 5:
        return pts
    mode = "wrap" if closed else "nearest"
    out = np.stack([ndimage.gaussian_filter1d(pts[:, k], sigma, mode=mode) for k in range(2)], axis=1)
    if not closed:
        out[0], out[-1] = pts[0], pts[-1]
    return out


def simplify(pts, tol):
    """Douglas-Peucker on an open chain."""
    keep = np.zeros(len(pts), dtype=bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        p, q = pts[a], pts[b]
        v = q - p
        L = math.hypot(*v)
        w = pts[a + 1:b] - p
        dist = np.hypot(*w.T) if L == 0 else np.abs(v[0] * w[:, 1] - v[1] * w[:, 0]) / L
        k = int(np.argmax(dist))
        if dist[k] > tol:
            keep[a + 1 + k] = True
            stack.append((a, a + 1 + k))
            stack.append((a + 1 + k, b))
    return pts[keep]


def bezier(pts, closed):
    """A Catmull-Rom spline through the points as SVG cubic curves; (x, y) order."""
    n = len(pts)
    if n < 2:
        return ""
    if n == 2 and not closed:
        return f"M{pts[0][0]:.1f},{pts[0][1]:.1f}L{pts[1][0]:.1f},{pts[1][1]:.1f}"
    d = [f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"]
    last = n if closed else n - 1
    for i in range(last):
        if closed:
            p0, p1, p2, p3 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        else:
            p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, n - 1)]
        if np.hypot(*(p2 - p1)) < 1e-6:
            continue                     # a doubled point: a corner, not a loop
        c1 = p1 + (p2 - p0) / 6.0
        c2 = p2 - (p3 - p1) / 6.0
        d.append(f"C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}")
    if closed:
        d.append("Z")
    return "".join(d)


def round_corners(pts, R, closed=False):
    """A bend sharper than R is drawn as an arc of radius R, or of the radius
    its two segments allow, in place of the spline's tight turn through one
    point: the drawing's corners are rounded, and the simplified line's were
    not."""
    n = len(pts)
    if n < 3:
        return pts
    out = [] if closed else [pts[0]]
    for i in (range(n) if closed else range(1, n - 1)):
        p0, p1, p2 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n]
        a, b = p0 - p1, p2 - p1
        la, lb = math.hypot(*a), math.hypot(*b)
        if la < 1e-6 or lb < 1e-6:
            out.append(p1)
            continue
        ua, ub = a / la, b / lb
        theta = math.acos(max(-1.0, min(1.0, float(np.dot(ua, ub)))))   # the angle inside the bend
        turn = math.pi - theta
        if turn < math.radians(8):
            out.append(p1)
            continue
        t = min(R * math.tan(turn / 2), 0.5 * min(la, lb))     # the tangent length, within its segments
        r = t / math.tan(turn / 2)
        A, B = p1 + ua * t, p1 + ub * t
        bis = ua + ub
        bis = bis / math.hypot(*bis)
        C = p1 + bis * (r / math.sin(theta / 2))
        a0 = math.atan2(A[0] - C[0], A[1] - C[1])
        a1 = math.atan2(B[0] - C[0], B[1] - C[1])
        d = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
        k = max(2, int(abs(d) * r / 3))
        for f in np.linspace(0, 1, k + 1):
            out.append(np.array([C[0] + r * math.sin(a0 + d * f), C[1] + r * math.cos(a0 + d * f)]))
    if not closed:
        out.append(pts[-1])
    return np.array(out)


def spline_points(pts, closed, step):
    """Points every step along the curves bezier() draws through pts."""
    n = len(pts)
    if n < 2:
        return pts
    if n == 2 and not closed:
        k = max(2, int(math.hypot(*(pts[1] - pts[0])) / step))
        return pts[0] + (pts[1] - pts[0]) * np.linspace(0, 1, k + 1)[:, None]
    out = []
    last = n if closed else n - 1
    for i in range(last):
        if closed:
            p0, p1, p2, p3 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        else:
            p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, n - 1)]
        if np.hypot(*(p2 - p1)) < 1e-6:
            continue
        c1 = p1 + (p2 - p0) / 6.0
        c2 = p2 - (p3 - p1) / 6.0
        k = max(2, int((np.hypot(*(c1 - p1)) + np.hypot(*(c2 - c1)) + np.hypot(*(p2 - c2))) / step))
        t = np.linspace(0, 1, k, endpoint=False)[:, None]
        out.append((1 - t) ** 3 * p1 + 3 * (1 - t) ** 2 * t * c1 + 3 * (1 - t) * t ** 2 * c2 + t ** 3 * p2)
    out.append(pts[0:1] if closed else pts[-1:])
    return np.vstack(out)


# marching squares: the edges of a cell, 0 top, 1 right, 2 bottom, 3 left
SEGS = {
    1: [(3, 2)], 2: [(2, 1)], 3: [(3, 1)], 4: [(0, 1)], 6: [(0, 2)], 7: [(3, 0)],
    8: [(3, 0)], 9: [(0, 2)], 11: [(0, 1)], 12: [(3, 1)], 13: [(2, 1)], 14: [(3, 2)],
}


def contours(f):
    """Marching squares at level .5 over a field: closed loops of (x, y)."""
    b = f >= 0.5
    tl, tr, br, bl = b[:-1, :-1], b[:-1, 1:], b[1:, 1:], b[1:, :-1]
    idx = tl.astype(np.uint8) * 8 + tr.astype(np.uint8) * 4 + br.astype(np.uint8) * 2 + bl.astype(np.uint8)
    cells = np.argwhere((idx > 0) & (idx < 15))

    def cross(a, bv):
        d = bv - a
        return 0.5 if d == 0 else (0.5 - a) / d

    def point(i, j, e):
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
    key = lambda p: (round(p[0] * 64), round(p[1] * 64))
    at = {}
    for si, (p, q) in enumerate(segs):
        at.setdefault(key(p), []).append(si)
        at.setdefault(key(q), []).append(si)
    used = [False] * len(segs)
    loops = []
    for s0 in range(len(segs)):
        if used[s0]:
            continue
        used[s0] = True
        p, q = segs[s0]
        loop, cur = [p, q], q
        while True:
            nxt = next((si for si in at.get(key(cur), []) if not used[si]), None)
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


def fillets(finished, nodes, width, W, H):
    """The corners where a line meets a ring or another line, filled with a
    fillet of radius FILLET * width, as the drawing's softness filled them:
    the lines are drawn on a raster four times the field, the drawing is
    closed (grown by the radius and shrunk again, each ring's hole cut back
    out), and what the closing added is traced as small filled shapes to
    draw beside the lines. Each reaches a little way under the lines, so no
    hairline shows where they meet."""
    S, f, m = 4, FILLET * width, width
    shape = (int(round((H + 2 * m) * S)), int(round((W + 2 * m) * S)))
    seeds = np.zeros(shape, dtype=bool)

    def plant(p):
        yy = np.clip(np.round((p[:, 0] + m) * S).astype(int), 0, shape[0] - 1)
        xx = np.clip(np.round((p[:, 1] + m) * S).astype(int), 0, shape[1] - 1)
        seeds[yy, xx] = True
    for pts, closed, length in finished:
        plant(spline_points(pts, closed, 1.0 / S))
    for cy, cx, h, ro in nodes:
        rc = ro - width / 2
        a = np.linspace(0, 2 * np.pi, int(2 * np.pi * rc * S) + 1)
        plant(np.stack([cy + rc * np.sin(a), cx + rc * np.cos(a)], axis=1))
    d = ndimage.distance_transform_edt(~seeds)
    ink = d <= width / 2 * S
    grown = d <= (width / 2 + f) * S
    shut = ndimage.distance_transform_edt(grown) > f * S + 0.75
    for cy, cx, h, ro in nodes:
        r = (ro - width) * S
        R = int(r) + 2
        y0, x0 = int(round((cy + m) * S)), int(round((cx + m) * S))
        ys, xs = np.ogrid[-R:R + 1, -R:R + 1]
        shut[y0 - R:y0 + R + 1, x0 - R:x0 + R + 1][ys * ys + xs * xs <= r * r] = False
    added = shut & ~ink
    added |= (ndimage.distance_transform_edt(~added) <= 1.5 * S) & ink
    lab, n = ndimage.label(added)
    out = []
    for i, sl in enumerate(ndimage.find_objects(lab), start=1):
        pad = 3
        sl = tuple(slice(max(0, a.start - pad), a.stop + pad) for a in sl)
        blob = lab[sl] == i
        if blob.sum() < 6 * S * S:
            continue
        # a fillet fills a corner, where the ink it touches is one piece; a
        # bridge across a gap between two lines touches two, and is not drawn
        touch = ndimage.binary_dilation(blob, structure=EIGHT) & ink[sl] & ~blob
        if ndimage.label(touch, structure=EIGHT)[1] != 1:
            continue
        field = blob.astype(np.float32)
        field = ndimage.gaussian_filter(field, 1.0)
        loops = contours(field)
        if not loops:
            continue
        loop = max(loops, key=len)
        pts = np.array([[(y + sl[0].start) / S - m, (x + sl[1].start) / S - m] for x, y in loop])
        pts = smooth_chain(resample(np.vstack([pts, pts[:1]]), 0.3)[:-1], True, 2.0)
        pts = simplify(np.vstack([pts, pts[:1]]), 0.1)[:-1]
        if len(pts) >= 3:
            out.append(bezier(pts[:, ::-1], True))
    return out


def main():
    mask = ink_mask()
    H, W = mask.shape
    edt = ndimage.distance_transform_edt(mask)

    # the nodes: the small holes the rings leave in the ink
    bg, nbg = ndimage.label(~mask)
    outer = bg[0, 0]
    areas = ndimage.sum(~mask, bg, range(1, nbg + 1))
    nodes = []
    small = np.zeros_like(mask)
    for i, a in enumerate(areas):
        if i + 1 == outer or a > 2500:
            continue
        hole = bg == i + 1
        small |= hole
        cy, cx = ndimage.center_of_mass(hole)
        nodes.append([cy, cx, math.sqrt(a / math.pi)])
    filled = mask | small
    edt_f = ndimage.distance_transform_edt(filled)
    for nd in nodes:
        nd.append(float(edt_f[int(round(nd[0])), int(round(nd[1]))]))   # the ring's outer radius

    # the stroke's width, read along the centre lines away from the nodes
    skel = thin(mask)
    yy, xx = np.indices(mask.shape)
    near_node = np.zeros_like(mask)
    for cy, cx, h, ro in nodes:
        near_node |= (yy - cy) ** 2 + (xx - cx) ** 2 <= (ro + 2) ** 2
    width = float(np.median(2.0 * edt[skel & ~near_node]))
    # the rings go, with the bulge they leave in the lines beside them;
    # circles come back below and the lines are carried straight into them
    cut = np.zeros_like(mask)
    for cy, cx, h, ro in nodes:
        cut |= (yy - cy) ** 2 + (xx - cx) ** 2 <= (ro + 0.45 * width) ** 2
    skel &= ~cut

    # the skeleton's junctions, and the lines between them
    skel &= neighbour_count(skel) > 0        # no lone pixels
    skel = prune(skel, int(0.8 * width), ndimage.binary_dilation(cut, iterations=4))
    junc = skel & (crossings(skel) >= 3)
    jl, nj = ndimage.label(ndimage.binary_dilation(junc, structure=EIGHT) & skel, structure=EIGHT)
    centroids = ndimage.center_of_mass(skel, jl, range(1, nj + 1)) if nj else []
    seg, ns = ndimage.label(skel & (jl == 0), structure=EIGHT)
    chains = []                              # [pts, closed, [junction id or None] * 2]
    for s in range(1, ns + 1):
        comp = np.argwhere(seg == s)
        pts, closed = walk(comp)
        jid = [None, None]
        if not closed:
            for e, idx in ((0, 0), (1, -1)):
                y, x = int(pts[idx][0]), int(pts[idx][1])
                win = jl[max(0, y - 2):y + 3, max(0, x - 2):x + 3]
                ids = win[win > 0]
                if ids.size:
                    jid[e] = int(np.bincount(ids).argmax())
        chains.append([pts, closed, jid])

    # where a line runs on through a junction, join its two pieces into one,
    # so the outline is one smooth curve and the trace a branch off it
    def heading(ch, e):
        pts = ch[0]
        k = min(len(pts) - 1, max(2, int(width * 1.2)))
        a, b = (pts[k], pts[0]) if e == 0 else (pts[-1 - k], pts[-1])
        v = b - a
        n = np.hypot(*v)
        return v / n if n else v
    merged = True
    while merged:
        merged = False
        incident = {}
        for ci, ch in enumerate(chains):
            if ch[1]:
                continue
            for e in (0, 1):
                if ch[2][e] is not None:
                    incident.setdefault(ch[2][e], []).append((ci, e))
        for j, inc in incident.items():
            if len(inc) < 2:
                continue
            best, pair = -0.2, None
            for a in range(len(inc)):
                for b in range(a + 1, len(inc)):
                    d = float(np.dot(heading(chains[inc[a][0]], inc[a][1]), heading(chains[inc[b][0]], inc[b][1])))
                    if d < best:
                        best, pair = d, (inc[a], inc[b])
            if pair is None:
                continue
            (pa, ea), (pb, eb) = pair
            c = np.array(centroids[j - 1], dtype=np.float64)[None]
            if pa == pb:
                chains[pa] = [np.vstack([chains[pa][0], c]), True, [None, None]]
            else:
                A, B = chains[pa], chains[pb]
                ptsA = A[0] if ea == 1 else A[0][::-1]       # the junction end last
                ptsB = B[0] if eb == 0 else B[0][::-1]       # the junction end first
                jA = A[2][0] if ea == 1 else A[2][1]
                jB = B[2][1] if eb == 0 else B[2][0]
                chains[pa] = [np.vstack([ptsA, c, ptsB]), False, [jA, jB]]
                chains[pb] = None
            chains = [ch for ch in chains if ch is not None]
            merged = True
            break

    # the lines' ends: into the circle each one ran into, or onto the
    # junction's centre, and the thinning's spurs dropped
    drawn = []                               # [pts, closed, [node index or None] * 2]
    for pts, closed, jid in chains:
        ends_at = [None if jid[e] is None else np.array(centroids[jid[e] - 1], dtype=np.float64) for e in (0, 1)]
        pts = smooth_chain(pts, closed, SMOOTH * (1.4 if len(pts) > 300 else 1.0))   # the long outline a touch more
        snapped = [None, None]
        if not closed:
            for e, idx in ((0, 0), (1, -1)):
                y, x = pts[idx]
                # an end within reach of a node goes into its circle, whatever
                # the skeleton made of the ring's remains beside it
                for ni, (cy, cx, h, ro) in enumerate(nodes):
                    dist = math.hypot(y - cy, x - cx)
                    if dist > ro + 1.5 * width:                # past the bulge's junction too
                        continue
                    rc = ro - width / 2
                    # carry the line on along its own heading until it meets
                    # the circle's centre line, so it enters without a kink
                    k = min(len(pts) - 1, max(2, int(width * 1.2)))
                    hv = (pts[0] - pts[k]) if e == 0 else (pts[-1] - pts[-1 - k])
                    hn = np.hypot(*hv)
                    q = np.array([y - cy, x - cx])
                    snap = None
                    if hn:
                        hv = hv / hn
                        b = 2 * float(np.dot(q, hv))
                        c0 = float(np.dot(q, q)) - rc * rc
                        disc = b * b - 4 * c0
                        if disc >= 0:
                            roots = sorted(((-b - math.sqrt(disc)) / 2, (-b + math.sqrt(disc)) / 2))
                            t = next((r for r in roots if r >= 0), None)
                            if t is not None and t <= 3 * width:
                                snap = np.array([y, x]) + hv * t
                    if snap is None:
                        if dist > ro + 0.6 * width:
                            continue                           # heading away: not this ring's end
                        d = q / (np.hypot(*q) or 1)              # cut at the ring: straight in
                        snap = np.array([cy, cx]) + d * rc
                    pts = np.vstack([snap[None], pts]) if e == 0 else np.vstack([pts, snap[None]])
                    snapped[e] = ni
                    break
                if snapped[e] is None and ends_at[e] is not None:
                    pts = np.vstack([ends_at[e][None], pts]) if e == 0 else np.vstack([pts, ends_at[e][None]])
            length = float(np.hypot(*(np.diff(pts, axis=0)).T).sum())
            loose = sum(1 for e in (0, 1) if ends_at[e] is None and snapped[e] is None)
            if loose and length < 0.9 * width:
                continue                      # a spur the thinning left
            if length < 0.6 * width and any(n is not None for n in snapped):
                continue                      # an arm of the bulge beside a ring
        else:
            if float(np.hypot(*(np.diff(np.vstack([pts, pts[:1]]), axis=0)).T).sum()) < 3 * width:
                continue
        # a lighter pass over the piece, evenly spaced with its ends pinned,
        # softens the joint where an extension meets its curve; then the
        # piece is simplified here, before any joining, so a joint made
        # below stays the sharp corner it is drawn as
        if closed:
            pts = smooth_chain(resample(np.vstack([pts, pts[:1]]))[:-1], True, SMOOTH * 0.6)
            pts = round_corners(simplify(np.vstack([pts, pts[:1]]), SIMPLIFY)[:-1], BEND * width, True)
        else:
            pts = smooth_chain(resample(pts), False, SMOOTH * 0.6)
            pts = round_corners(simplify(pts, SIMPLIFY), BEND * width)
        # each end's way in, read over the whole piece: two pieces of one line
        # arrive at a node from opposite ways, even where both come down into
        # it from the bumps on either side; kept with the piece through the
        # joins below, where a joined chain's own ends would say nothing
        v = pts[-1] - pts[0]
        v = v / (np.hypot(*v) or 1)
        drawn.append([pts, closed, snapped, [-v, v]])

    # where a line runs straight on through a node, join its two pieces into
    # one, riding the ring's own centre line from where one piece enters to
    # where the other leaves, so the outline is one continuous line and the
    # ring's centre stays open; a line that only ends at a node stays a piece
    def ring_arc(ni, p_from, p_to):
        cy, cx, h, ro = nodes[ni]
        rc = ro - width / 2
        a0 = math.atan2(p_from[0] - cy, p_from[1] - cx)
        a1 = math.atan2(p_to[0] - cy, p_to[1] - cx)
        d = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
        if abs(abs(d) - math.pi) < 0.35:
            # nearly straight through: take the way round that bulges outward
            other = d - 2 * math.pi * (1 if d > 0 else -1)
            def outward(dd):
                am = a0 + dd / 2
                return math.hypot(cy + rc * math.sin(am) - H / 2, cx + rc * math.cos(am) - W / 2)
            d = max((d, other), key=outward)
        n = max(2, int(abs(d) * rc / 4))
        arc = np.array([[cy + rc * math.sin(a0 + d * t), cx + rc * math.cos(a0 + d * t)] for t in np.linspace(0, 1, n + 2)[1:-1]])
        # the joints doubled, so the curve turns onto the ring with a corner
        # (hidden under the ring) rather than rounding into its centre;
        # bezier() draws no segment between the doubled points
        return np.vstack([[p_from], arc, [p_to]])

    def heading_in(ch, e):
        return ch[3][e]
    merged = True
    while merged:
        merged = False
        at_node = {}
        for ci, ch in enumerate(drawn):
            if ch[1]:
                continue
            for e in (0, 1):
                if ch[2][e] is not None:
                    at_node.setdefault(ch[2][e], []).append((ci, e))
        for ni, inc in at_node.items():
            if len(inc) < 2:
                continue
            # two lines at a node are one line running through it; of three
            # or more, the two most nearly opposite run through and the rest end
            best, pair = (1.0 if len(inc) == 2 else -0.2), None
            for a in range(len(inc)):
                for b in range(a + 1, len(inc)):
                    d = float(np.dot(heading_in(drawn[inc[a][0]], inc[a][1]), heading_in(drawn[inc[b][0]], inc[b][1])))
                    if d < best:
                        best, pair = d, (inc[a], inc[b])
            if pair is None:
                continue
            (pa, ea), (pb, eb) = pair
            if pa == pb:
                pts = drawn[pa][0] if ea == 1 else drawn[pa][0][::-1]
                drawn[pa] = [np.vstack([pts, ring_arc(ni, pts[-1], pts[0])]), True, [None, None], [None, None]]
            else:
                A, B = drawn[pa], drawn[pb]
                ptsA = A[0] if ea == 1 else A[0][::-1]
                ptsB = B[0] if eb == 0 else B[0][::-1]
                nA = A[2][0] if ea == 1 else A[2][1]
                nB = B[2][1] if eb == 0 else B[2][0]
                hA = A[3][0] if ea == 1 else A[3][1]
                hB = B[3][1] if eb == 0 else B[3][0]
                drawn[pa] = [np.vstack([ptsA, ring_arc(ni, ptsA[-1], ptsB[0]), ptsB]), False, [nA, nB], [hA, hB]]
                drawn[pb] = None
            drawn = [ch for ch in drawn if ch is not None]
            merged = True
            break

    # the finished lines as curves; the longest closed line is the outline
    finished = []
    for pts, closed, snapped, heads in drawn:
        if closed:
            length = float(np.hypot(*(np.diff(np.vstack([pts, pts[:1]]), axis=0)).T).sum())
        else:
            length = float(np.hypot(*(np.diff(pts, axis=0)).T).sum())
        finished.append((pts, closed, length))
    outline_i = max((i for i, f in enumerate(finished) if f[1]), key=lambda i: finished[i][2], default=None)
    outline = bezier(finished[outline_i][0][:, ::-1], True) if outline_i is not None else ""
    lines = [bezier(f[0][:, ::-1], f[1]) for i, f in enumerate(finished) if i != outline_i]
    # the circles, each node a true circle, drawn over the lines
    circles = [f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{ro - width / 2:.1f}"/>' for cy, cx, h, ro in nodes]
    corners = fillets(finished, nodes, width, W, H)
    m = W * MARGIN
    vb = f"{-m:.1f} {-m:.1f} {W + 2 * m:.1f} {H + 2 * m:.1f}"
    head = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" role="img" aria-label="VisualNeuroscience">\n'
            "<title>VisualNeuroscience</title>\n")
    body = ('<g id="fillets" fill="currentColor" stroke="none">' + "".join(f'<path d="{d}"/>' for d in corners) + "</g>"
            + f'<path id="outline" d="{outline}"/>'
            + '<g id="traces">' + "".join(f'<path d="{d}"/>' for d in lines) + "</g>"
            + '<g id="nodes">' + "".join(circles) + "</g>")
    style = f'fill="none" stroke="currentColor" stroke-width="{width:.1f}" stroke-linecap="round" stroke-linejoin="round"'
    with open(OUT_MONO, "w") as out:
        out.write(head + f'<g {style}>' + body + "</g>\n</svg>\n")
    cx0, cy0, R = W / 2.0, H / 2.0, math.hypot(W, H)
    step = 360.0 / WEDGES
    defs = [f'<g id="brain" {style}>' + body + "</g>"]
    uses = []
    for i in range(WEDGES):
        a0 = math.radians(-90 + i * step - 0.35)
        a1 = math.radians(-90 + (i + 1) * step + 0.35)
        poly = f"{cx0:.1f},{cy0:.1f} {cx0 + R * math.cos(a0):.1f},{cy0 + R * math.sin(a0):.1f} {cx0 + R * math.cos(a1):.1f},{cy0 + R * math.sin(a1):.1f}"
        defs.append(f'<clipPath id="w{i}"><polygon points="{poly}"/></clipPath>')
        uses.append(f'<use href="#brain" clip-path="url(#w{i})" color="{palette_at((i + 0.5) / WEDGES)}"/>')
    with open(OUT_COLOUR, "w") as out:
        out.write(head + "<defs>" + "".join(defs) + "</defs>\n" + "\n".join(uses) + "\n</svg>\n")
    sys.stderr.write(f"one outline, {len(lines)} traces, {len(nodes)} nodes, {len(corners)} fillets, stroke {width:.1f} on a {W}x{H} field; wrote {os.path.relpath(OUT_MONO)} and {os.path.relpath(OUT_COLOUR)}\n")


if __name__ == "__main__":
    main()
