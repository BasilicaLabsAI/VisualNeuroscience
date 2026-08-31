#!/usr/bin/env python3
"""Trace the classic Brodmann cartoon out of a stack of one-area-highlight
images, lateral and medial.

    python3 scripts/trace_ifen_map.py <dir-with-broadmann_XX.png> > site/assets/brodmann-map.js

The source is a saved copy of a teaching page whose diagram ships as one
300x200 PNG per area: the same base drawing every time, with exactly one
area's fill swapped for a highlight colour. That structure is the whole
trick. The per-pixel median across a view's stack recovers the untouched
base (each pixel is highlighted in at most one image), and whatever differs
from the median in a given image IS that image's area — no flood fill, no
guessing at shared fills, which is what sank every attempt to cut a flat
scan of this diagram apart.

Images are assigned to the lateral or medial view by which reconstructed
base they resemble, not by filename — the export's names lie about a few
deeply medial areas. Interior line work and the baked-in numbers survive in
both base and highlight, so they diff to nothing and would riddle the mask
with holes; a binary close bridges the lines and a flood fill from outside
swallows the holes. The boundaries are then followed, simplified and
smoothed exactly as the atlas projection was (loops/rdp/smooth are copies
from make_brodmann_map.py, which still generates the alternative
projection-styled map from the volume itself).

The drawing this reproduces is a modern redraw of Brodmann's 1909 figures,
which are public domain; the numbers are re-set as live text, and the fills
are the site's own lobe palette, so the cartoon keeps working in dark mode
and stays of a piece with the graph and the scan.
"""

import json, os, re, struct, sys, zlib
from collections import deque

import numpy as np


# ── PNG decode, dependency-free (8-bit RGBA, as these all are) ───────────────

def read_png(path):
    d = open(path, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n", path
    pos, idat, w, h, ctype = 8, b"", 0, 0, 0
    while pos < len(d):
        ln, typ = struct.unpack(">I4s", d[pos:pos+8])
        body = d[pos+8:pos+8+ln]
        if typ == b"IHDR":
            w, h, depth, ctype = struct.unpack(">IIBB", body[:10])
            assert depth == 8, f"{path}: {depth}-bit"
        elif typ == b"IDAT":
            idat += body
        elif typ == b"IEND":
            break
        pos += 12 + ln
    raw = zlib.decompress(idat)
    ch = {0: 1, 2: 3, 4: 2, 6: 4}[ctype]
    stride = w * ch
    out = np.zeros((h, stride), dtype=np.uint8)
    prev = np.zeros(stride, dtype=np.uint8)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = np.frombuffer(raw[p:p+stride], dtype=np.uint8).astype(np.int16)
        p += stride
        if f == 0:
            cur = line
        elif f == 2:
            cur = (line + prev) % 256
        else:
            cur = np.zeros(stride, dtype=np.int16)
            for x in range(stride):
                a = cur[x-ch] if x >= ch else 0
                b = prev[x]
                c = prev[x-ch] if x >= ch else 0
                if f == 1:   pr = a
                elif f == 3: pr = (a + b) // 2
                else:
                    pa, pb, pc = abs(b-c), abs(a-c), abs(a+b-2*c)
                    pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                cur[x] = (line[x] + pr) % 256
        out[y] = cur.astype(np.uint8)
        prev = out[y].astype(np.int16)
    px = out.reshape(h, w, ch)
    if ch == 3:
        px = np.dstack([px, np.full((h, w), 255, np.uint8)])
    return px


# ── mask morphology, numpy-only ──────────────────────────────────────────────

def shift_or(m, r):
    out = m.copy()
    for dy in range(-r, r+1):
        for dx in range(-r, r+1):
            if dy or dx:
                out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out

def close(m, r=1):
    grown = shift_or(m, r)
    return ~shift_or(~grown, r)

def fill_holes(m):
    h, w = m.shape
    outside = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h-1):
            if not m[y, x] and not outside[y, x]:
                outside[y, x] = True; q.append((y, x))
    for y in range(h):
        for x in (0, w-1):
            if not m[y, x] and not outside[y, x]:
                outside[y, x] = True; q.append((y, x))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
            if 0 <= ny < h and 0 <= nx < w and not m[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True; q.append((ny, nx))
    return ~outside

def components(m, keep=15):
    h, w = m.shape
    seen = np.zeros((h, w), dtype=bool)
    out = []
    for y0, x0 in zip(*np.nonzero(m)):
        if seen[y0, x0]:
            continue
        comp = np.zeros((h, w), dtype=bool)
        q = deque([(y0, x0)]); seen[y0, x0] = True
        while q:
            y, x = q.popleft()
            comp[y, x] = True
            for ny, nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
                if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; q.append((ny, nx))
        if comp.sum() >= keep:
            out.append(comp)
    return out


# ── boundary → path (as in make_brodmann_map.py) ─────────────────────────────

def loops(mask):
    h, w = mask.shape
    edges = {}
    for y in range(h):
        row = mask[y]
        for x in range(w):
            if not row[x]:
                continue
            if y == 0 or not mask[y-1, x]:
                edges[(x, y)] = (x+1, y)
            if x == w-1 or not mask[y, x+1]:
                edges[(x+1, y)] = (x+1, y+1)
            if y == h-1 or not mask[y+1, x]:
                edges[(x+1, y+1)] = (x, y+1)
            if x == 0 or not mask[y, x-1]:
                edges[(x, y+1)] = (x, y)
    out = []
    while edges:
        start, cur = next(iter(edges.items()))
        loop = [start]
        del edges[start]
        while cur != start:
            loop.append(cur)
            nxt = edges.pop(cur, None)
            if nxt is None:
                break
            cur = nxt
        if len(loop) > 3:
            out.append(loop)
    return out

def rdp(pts, eps):
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

def _area(p):
    s = 0.0
    for i in range(len(p)):
        x1, y1 = p[i]; x2, y2 = p[(i+1) % len(p)]
        s += x1*y2 - x2*y1
    return s/2


# ── completing a view from its base drawing ──────────────────────────────────
#
# Highlights only cover the areas a view highlights; the drawing shows more
# (the medial face repeats 4, 6, 7, the occipital areas … and the lateral
# face shows 38, highlighted only medially). The base itself supplies the
# rest: its boundary lines are solid black closed contours, so the regions
# between them segment cleanly — the very thing dashed-boundary figures
# refuse to do. A region matching a known highlight mask becomes that
# area's clickable tile; every other region is kept as an inert, unnumbered
# backdrop tile, so each view is the complete drawing. (Reading the numbers
# baked into the leftover regions was tried and dropped: the digits sit in
# a soup of gyral decoration, some are printed outside the brain on leader
# lines, and a wrong number on a brain area is far worse than none. Every
# area is still clickable in exactly one view, which is the source
# diagram's own scheme.)

def dark_mask(base_rgb, base_a):
    return (base_rgb.sum(axis=2) < 400) & (base_a > 128)

def segment(base_rgb, base_a):
    fill = (base_a > 128) & ~dark_mask(base_rgb, base_a)
    return [c for c in components(fill, keep=40)]

def fill_small_holes(m, maxpx=38):
    """The numbers printed inside a region punch it full of digit-shaped
    holes; swallow those, but keep any large enclosed void — on the medial
    face the cortical ring genuinely encloses the callosum and ventricle,
    and those must stay holes."""
    filled = fill_holes(m)
    out = m.copy()
    for hole in components(filled & ~m, keep=1):
        if hole.sum() <= maxpx:
            out |= hole
    return out


# ── the extraction itself ────────────────────────────────────────────────────

SCALE = 2.0          # 300x200 source → 600x400 drawing box
DIFF  = 35           # sum-of-|ΔRGB| that counts as "this pixel was recoloured";
                     # the palest highlight (46, yellow on pink) runs ~40-90
                     # against the base while the residual noise floor is <20

def masks_for(stack):
    """stack: {ba: HxWx4}. The median image is the base; each area is what
    differs from it."""
    imgs = np.stack([v for v in stack.values()])
    base = np.median(imgs[..., :3].astype(np.int16), axis=0)
    out = {}
    for ba, px in stack.items():
        diff = np.abs(px[..., :3].astype(np.int16) - base).sum(axis=2)
        m = (diff > DIFF) & (px[..., 3] > 128)
        m = close(m, 1)
        m = fill_holes(m) if m.any() else m
        out[ba] = m
    return out

def trace_masks(masks):
    areas = {}
    for ba, m in masks.items():
        parts = []
        for comp in components(m):
            for lp in loops(comp):
                s = rdp(lp, 1.0)
                if len(s) > 3 and abs(_area(s)) > 20:
                    parts.append(smooth([(x*SCALE, y*SCALE) for x, y in s]))
        if not parts:
            sys.stderr.write(f"  !! BA{ba}: nothing traced\n")
            continue
        cy, cx = np.nonzero(m)
        mx, my = float(cx.mean()), float(cy.mean())
        if not m[int(round(my)) % m.shape[0], int(round(mx)) % m.shape[1]]:
            k = int(np.argmin((cx - mx)**2 + (cy - my)**2))
            mx, my = float(cx[k]), float(cy[k])
        areas[ba] = {"d": " ".join(parts),
                     "at": [round(mx*SCALE, 1), round(my*SCALE, 1)]}
    return areas


def main():
    src = sys.argv[1]
    files = {}
    for f in os.listdir(src):
        m = re.match(r"broadmann_(\d+)a?\.png$", f)
        if m:
            files[f] = int(m.group(1))
    if not files:
        sys.exit("no broadmann_XX.png files in " + src)

    imgs = {f: read_png(os.path.join(src, f)) for f in files}

    # Which view is which is decided by the pictures, not the filenames —
    # each base drawing was exported at its own canvas size, so the image
    # shape alone separates them: 300x200 is the lateral face (area 4, the
    # pink motor strip, confirms it), 300x191 the medial. Anything else is a
    # standalone illustration with no stack to diff against — area 13, the
    # insula, drawn on its own pulled-open view — and is reported and left
    # out; an area absent from both tables simply falls to the page's
    # "only the scan shows it" line.
    shape_lat = imgs["broadmann_04.png"].shape
    shape_med = imgs["broadmann_23a.png"].shape
    lat, med = {}, {}
    for f, px in imgs.items():
        if px.shape == shape_lat:
            lat[files[f]] = px
        elif px.shape == shape_med:
            med[files[f]] = px
        else:
            sys.stderr.write(f"  -- {f}: own canvas {px.shape[1]}x{px.shape[0]}, no stack to diff — skipped\n")
    sys.stderr.write(f"lateral {sorted(lat)}\nmedial  {sorted(med)}\n")

    def build_view(stack, tag):
        imgsA = np.stack([v for v in stack.values()])
        base_rgb = np.median(imgsA[..., :3].astype(np.int16), axis=0)
        base_a = np.median(imgsA[..., 3].astype(np.int16), axis=0)
        marks = masks_for(stack)
        regions = segment(base_rgb, base_a)

        known = {}
        for i, r in enumerate(regions):
            rs = r.sum()
            for ba, m in marks.items():
                if (r & m).sum() > 0.5 * rs:
                    known[i] = ba
                    break

        by_ba, mute = {}, []
        for i, r in enumerate(regions):
            if i in known:
                by_ba.setdefault(known[i], []).append(i)
            else:
                mute.append(i)

        def paths_of(mask):
            """A digit that touches a boundary line bites a notch out of the
            region instead of a hole; a one-pixel close turns the notch into
            a hole, and the hole filler swallows it with the rest."""
            parts = []
            for lp in loops(fill_small_holes(close(mask, 1), maxpx=60)):
                s = rdp(lp, 1.0)
                if len(s) > 3 and abs(_area(s)) > 20:
                    parts.append(smooth([(x*SCALE, y*SCALE) for x, y in s]))
            return parts

        table = {}
        for ba, idxs in sorted(by_ba.items()):
            parts = []
            for i in idxs:
                parts += paths_of(regions[i])
            if not parts:
                continue
            m = regions[max(idxs, key=lambda i: regions[i].sum())]
            cy, cx = np.nonzero(m)
            mx, my = float(cx.mean()), float(cy.mean())
            if not m[int(round(my)) % m.shape[0], int(round(mx)) % m.shape[1]]:
                k = int(np.argmin((cx - mx)**2 + (cy - my)**2))
                mx, my = float(cx[k]), float(cy[k])
            table[ba] = {"d": " ".join(parts),
                         "at": [round(mx*SCALE, 1), round(my*SCALE, 1)]}

        mutes = []
        for i in mute:
            mutes += paths_of(regions[i])

        missed = sorted(set(marks) - set(table))
        sys.stderr.write(f"{tag}: {len(regions)} regions — {len(table)} areas clickable, "
                         f"{len(mute)} backdrop tiles"
                         + (f", !! highlighted but unmatched: {missed}" if missed else "") + "\n")
        H, W = next(iter(stack.values())).shape[:2]
        return table, mutes, W, H

    latA, latMute, WL, HL = build_view(lat, "lateral")
    medA, medMute, WM, HM = build_view(med, "medial")

    print("/* The flat Brodmann map: the classic cartoon, traced from a stack of")
    print("   one-area-highlight images by scripts/trace_ifen_map.py (a redraw")
    print("   descending from Brodmann 1909, which is public domain). Do not")
    print("   edit by hand — re-run the script. The projection-styled map can")
    print("   be regenerated instead with scripts/make_brodmann_map.py. */")
    print("window.MN_BA_MAP = {")
    print(f'  viewBox: "0 0 {WL*SCALE:.0f} {HL*SCALE:.0f}",')
    print(f'  box: {{ lateral: "0 0 {WL*SCALE:.0f} {HL*SCALE:.0f}", medial: "0 0 {WM*SCALE:.0f} {HM*SCALE:.0f}" }},')
    for name, tbl in (("lateral", latA), ("medial", medA)):
        print(f"  {name}: {{")
        for ba in sorted(tbl):
            print(f'    {ba}: {{d:"{tbl[ba]["d"]}", at:{json.dumps(tbl[ba]["at"])}}},')
        print("  },")
    print("  mute: {")
    for name, ms in (("lateral", latMute), ("medial", medMute)):
        print(f'    {name}: [' + ", ".join(f'"{d}"' for d in ms) + "],")
    print("  },")
    print("};")
    sys.stderr.write(f"traced lateral {len(latA)} in {WL*SCALE:.0f}x{HL*SCALE:.0f}, "
                     f"medial {len(medA)} in {WM*SCALE:.0f}x{HM*SCALE:.0f}\n")


if __name__ == "__main__":
    main()
