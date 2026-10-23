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
each line is smoothed and simplified into cubic curves, the small holes mark
the nodes, which become circles the lines are snapped to, and the stroke's
width is read off the drawing.

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


def prune(skel, length, protect):
    """Drop the short spurs thinning leaves beside bends and rings: a branch
    that runs from a free end into a junction within the given length. Ends
    under the protect mask, the lines cut at the nodes, are real and stay."""
    skel = np.pad(skel, 1).copy()
    protect = np.pad(protect, 1)
    while True:
        nbc = neighbour_count(skel)
        removed = False
        for y, x in np.argwhere(skel & (nbc == 1) & ~protect):
            path, cur, prev, hit = [(y, x)], (y, x), None, False
            for _ in range(length):
                nxt = [(cur[0] + dy, cur[1] + dx) for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                       if (dy or dx) and skel[cur[0] + dy, cur[1] + dx] and (cur[0] + dy, cur[1] + dx) != prev
                       and (cur[0] + dy, cur[1] + dx) not in path]
                if not nxt:
                    break
                if len(nxt) >= 2 or nbc[nxt[0]] >= 3:
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
    # start at an end if there is one, else anywhere (a loop)
    start = None
    for p in pts:
        y, x = p
        if sum(1 for dy in (-1, 0, 1) for dx in (-1, 0, 1) if (dy or dx) and (y + dy, x + dx) in left) <= 1:
            start = p
            break
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
        c1 = p1 + (p2 - p0) / 6.0
        c2 = p2 - (p3 - p1) / 6.0
        d.append(f"C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}")
    if closed:
        d.append("Z")
    return "".join(d)


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
    nbc = neighbour_count(skel)
    junc = skel & (nbc >= 3)
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

    # snap the lines' free ends to the circle each one ran into
    lines = []
    for pts, closed, jid in chains:
        ends_at = [None if jid[e] is None else np.array(centroids[jid[e] - 1], dtype=np.float64) for e in (0, 1)]
        pts = smooth_chain(pts, closed, SMOOTH * (1.4 if len(pts) > 300 else 1.0))   # the long outline a touch more
        snapped = [False, False]
        if not closed:
            for e, idx in ((0, 0), (1, -1)):
                y, x = pts[idx]
                # an end within reach of a node goes into its circle, whatever
                # the skeleton made of the ring's remains beside it
                for cy, cx, h, ro in nodes:
                    if math.hypot(y - cy, x - cx) <= ro + 1.5 * width:   # past the bulge's junction too
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
                            d = q / (np.hypot(*q) or 1)
                            snap = np.array([cy, cx]) + d * rc
                        pts = np.vstack([snap[None], pts]) if e == 0 else np.vstack([pts, snap[None]])
                        snapped[e] = True
                        break
                if not snapped[e] and ends_at[e] is not None:
                    pts = np.vstack([ends_at[e][None], pts]) if e == 0 else np.vstack([pts, ends_at[e][None]])
            length = float(np.hypot(*(np.diff(pts, axis=0)).T).sum())
            loose = sum(1 for e in (0, 1) if ends_at[e] is None and not snapped[e])
            if loose and length < 0.9 * width:
                continue                      # a spur the thinning left
            if length < 0.6 * width and any(snapped):
                continue                      # an arm of the bulge beside a ring
        else:
            if float(np.hypot(*(np.diff(np.vstack([pts, pts[:1]]), axis=0)).T).sum()) < 3 * width:
                continue
        if not closed:
            # once the ends are in place, a lighter pass over the whole line,
            # evenly spaced, softens the joint where an extension meets its curve
            pts = smooth_chain(resample(pts), False, SMOOTH * 0.6)
        pts = simplify(pts, SIMPLIFY) if not closed else pts[::max(1, len(pts) // 60)]
        lines.append(bezier(pts[:, ::-1], closed))   # to (x, y)

    circles = [f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{ro - width / 2:.1f}"/>' for cy, cx, h, ro in nodes]
    m = W * MARGIN
    vb = f"{-m:.1f} {-m:.1f} {W + 2 * m:.1f} {H + 2 * m:.1f}"
    head = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" role="img" aria-label="VisualNeuroscience">\n'
            "<title>VisualNeuroscience</title>\n")
    body = "".join(f'<path d="{d}"/>' for d in lines) + "".join(circles)
    style = f'fill="none" stroke-width="{width:.1f}" stroke-linecap="round" stroke-linejoin="round"'
    with open(OUT_MONO, "w") as out:
        out.write(head + f'<g {style} stroke="currentColor">' + body + "</g>\n</svg>\n")
    cx0, cy0, R = W / 2.0, H / 2.0, math.hypot(W, H)
    step = 360.0 / WEDGES
    defs = [f'<g id="brain" {style}>' + body + "</g>"]
    uses = []
    for i in range(WEDGES):
        a0 = math.radians(-90 + i * step - 0.35)
        a1 = math.radians(-90 + (i + 1) * step + 0.35)
        poly = f"{cx0:.1f},{cy0:.1f} {cx0 + R * math.cos(a0):.1f},{cy0 + R * math.sin(a0):.1f} {cx0 + R * math.cos(a1):.1f},{cy0 + R * math.sin(a1):.1f}"
        defs.append(f'<clipPath id="w{i}"><polygon points="{poly}"/></clipPath>')
        uses.append(f'<use href="#brain" clip-path="url(#w{i})" stroke="{palette_at((i + 0.5) / WEDGES)}"/>')
    with open(OUT_COLOUR, "w") as out:
        out.write(head + "<defs>" + "".join(defs) + "</defs>\n" + "\n".join(uses) + "\n</svg>\n")
    sys.stderr.write(f"{len(lines)} lines, {len(nodes)} nodes, stroke {width:.1f} on a {W}x{H} field; wrote {os.path.relpath(OUT_MONO)} and {os.path.relpath(OUT_COLOUR)}\n")


if __name__ == "__main__":
    main()
