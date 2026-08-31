#!/usr/bin/env python3
"""Build the Brodmann cartoon from the artwork itself, untouched.

    python3 scripts/build_ba_artwork.py <dir-with-broadmann_XX.png>

Writes site/assets/ba/ (the reconstructed base drawing per view and one
cropped highlight patch per area) and site/assets/brodmann-art.js (where
each patch sits and the invisible hit shape over it).

Where trace_ifen_map.py re-rendered the diagram as flat vector tiles, this
keeps every pixel of the original: the base of each view is the per-pixel
median across its stack (each pixel is highlighted in at most one image, so
the median is the untouched drawing — outlines, gyral shading, numbers and
all), and an area's highlight patch is its own image's pixels wherever they
differ from that base, dilated a little so the anti-aliased rim comes
along, cropped to its box. Showing a patch over the base reproduces that
area's highlight exactly as drawn. The traced region shapes survive only
as invisible hit-targets, so clicking is precise while the eye sees
nothing but the artwork.

The drawing descends from Brodmann's 1909 figures (public domain)."""

import json, os, struct, sys, zlib

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trace_ifen_map import (read_png, masks_for, segment, components, close,
                            shift_or, fill_small_holes, loops, rdp, smooth, _area)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "site", "assets", "ba")

# Every source is doubled before anything else happens: Catmull-Rom for the
# half-phase samples, then a light unsharp on the colour channels. The same
# deterministic kernel runs on every image, so identical source pixels stay
# identical after scaling and the median/diff arithmetic downstream is
# untouched — no model-based upscaler is allowed near the artwork, because a
# hallucinated digit on a brain map is worse than a soft one.
UP = 2

def up2(px):
    x = px.astype(np.float32)
    def axis_double(a):                       # along axis 0
        n = a.shape[0]
        pad = np.concatenate([a[:1], a, a[-1:], a[-1:]], axis=0)
        half = (-0.0625*pad[0:n] + 0.5625*pad[1:n+1]
                + 0.5625*pad[2:n+2] - 0.0625*pad[3:n+3])
        out = np.empty((2*n,) + a.shape[1:], np.float32)
        out[0::2] = a
        out[1::2] = half
        return out
    x = axis_double(x)
    x = axis_double(x.swapaxes(0, 1)).swapaxes(0, 1)
    # unsharp the colour, not the alpha — a haloed edge mask tears the rims
    blur = x.copy()
    for ax in (0, 1):
        blur = (np.roll(blur, 1, ax) + 2*blur + np.roll(blur, -1, ax)) / 4
    x[..., :3] += 0.5 * (x[..., :3] - blur[..., :3])
    return np.clip(x, 0, 255).astype(np.uint8)


# Regions the drawings show but never highlight, read off the artwork by
# hand and verified visually (zoomed crops of every one). Keyed by the
# region's centroid at source scale; a wrong number on a brain area being
# worse than none, anything not listed here stays inert. The two absentees
# are real: the callosum/ventricle interior and an unnumbered sliver.
REGION_BA = {
    "lateral": { (80, 155): 38 },
    "medial": {
        (123, 8): 2, (134, 12): 1, (148, 7): 3, (139, 18): 3,
        (87, 26): 7, (175, 28): 4, (131, 36): 5, (221, 38): 6,
        (49, 56): 19, (250, 52): 8, (275, 79): 9, (36, 81): 18,
        (31, 102): 17, (284, 117): 10, (37, 122): 18, (64, 130): 19,
        (86, 141): 37, (234, 153): 11, (134, 167): 20,
    },
}

def region_ba(tag, mask):
    ys, xs = np.nonzero(mask)
    cx, cy = xs.mean() / UP, ys.mean() / UP
    for (tx, ty), ba in REGION_BA[tag].items():
        if abs(cx - tx) <= 8 and abs(cy - ty) <= 8:
            return ba
    return None


def write_png(path, px):
    h, w = px.shape[:2]
    raw = b"".join(b"\x00" + px[y].tobytes() for y in range(h))
    def chunk(typ, body):
        c = typ + body
        return struct.pack(">I", len(body)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)
    open(path, "wb").write(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b""))


def hit_path(hit):
    parts = []
    for lp in loops(fill_small_holes(close(hit, 2), maxpx=240)):
        s = rdp(lp, 1.6)
        if len(s) > 3 and abs(_area(s)) > 80:
            parts.append(smooth(s))
    return " ".join(parts)


def cut_patch(px, mask, name):
    ys, xs = np.nonzero(mask)
    y0, y1, x0, x1 = ys.min(), ys.max()+1, xs.min(), xs.max()+1
    patch = px[y0:y1, x0:x1].copy()
    patch[~mask[y0:y1, x0:x1]] = 0
    write_png(os.path.join(OUT, name), patch)
    return {"x": int(x0), "y": int(y0), "w": int(x1-x0), "h": int(y1-y0)}


def prep(stack, tag):
    imgs = np.stack([v for v in stack.values()])
    base = np.median(imgs.astype(np.int16), axis=0).astype(np.uint8)
    write_png(os.path.join(OUT, f"base-{tag}.png"), base)
    marks = masks_for(stack)
    regions = segment(base[..., :3].astype(np.int16), base[..., 3].astype(np.int16))
    return base, marks, regions


def build(views):
    entries = {}          # ba -> [entry, …]
    prepped = {tag: prep(stack, tag) for tag, stack in views.items()}

    def add(ba, e):
        entries.setdefault(ba, []).append(e)

    # the areas each view actually highlights: the artwork's own pixels
    for tag, stack in views.items():
        base, marks, regions = prepped[tag]
        for ba, px in stack.items():
            m = marks.get(ba)
            if m is None or not m.any():
                sys.stderr.write(f"  !! BA{ba}: empty highlight\n")
                continue
            box = cut_patch(px, shift_or(m, 2), f"{tag}-{ba}.png")
            hit = np.zeros_like(m)
            for r in regions:
                if (r & m).sum() > 0.5 * r.sum():
                    hit |= r
            if not hit.any():
                hit = m
            add(ba, dict(view=tag, href=f"assets/ba/{tag}-{ba}.png",
                         d=hit_path(hit), **box))

    # the drawing's own colour for an area, for the face that never
    # highlights it: median of its real highlight's pixels
    def colour_of(ba):
        for tag, stack in views.items():
            m = prepped[tag][1].get(ba)
            if m is not None and m.any() and ba in stack:
                return np.median(stack[ba][..., :3][m], axis=0)
        return None

    # every region the drawing shows but never highlights, identified by
    # hand in REGION_BA: give it a synthesized highlight in the artwork's
    # language — the area's own colour, shaded by the drawing's own
    # luminance, so lines stay lines and gyral shading shows through
    for tag in views:
        base, marks, regions = prepped[tag]
        claimed = np.zeros(base.shape[:2], dtype=bool)
        for m in marks.values():
            claimed |= m
        extras = {}
        for r in regions:
            if any((r & m).sum() > 0.5 * r.sum() for m in marks.values()):
                continue
            ba = region_ba(tag, r)
            if ba is not None:
                extras.setdefault(ba, np.zeros_like(r))
                extras[ba] |= r
        for ba, mask in sorted(extras.items()):
            col = colour_of(ba)
            if col is None:
                continue
            grown = shift_or(mask, 1)
            lum = base[..., :3].astype(np.float32).mean(axis=2)
            ref = float(np.median(lum[mask]))
            factor = np.clip(lum / max(ref, 1.0), 0, 1.12)
            synth = base.copy()
            synth[..., 0] = np.clip(col[0] * factor, 0, 255).astype(np.uint8)
            synth[..., 1] = np.clip(col[1] * factor, 0, 255).astype(np.uint8)
            synth[..., 2] = np.clip(col[2] * factor, 0, 255).astype(np.uint8)
            name = f"{tag}-{ba}.png"
            box = cut_patch(synth, grown, name)
            add(ba, dict(view=tag, href=f"assets/ba/{name}",
                         d=hit_path(mask), **box))
            sys.stderr.write(f"  ++ {tag}: BA{ba} synthesized from its own colour\n")
    return entries


def main():
    import re
    src = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        os.remove(os.path.join(OUT, f))
    files = {}
    for f in os.listdir(src):
        m = re.match(r"broadmann_(\d+)a?\.png$", f)
        if m:
            files[f] = int(m.group(1))
    imgs = {f: read_png(os.path.join(src, f)) for f in files}
    shape_lat = imgs["broadmann_04.png"].shape
    shape_med = imgs["broadmann_23a.png"].shape
    views = {"lateral": {}, "medial": {}}
    for f, px in imgs.items():
        if px.shape == shape_lat:
            views["lateral"][files[f]] = up2(px)
        elif px.shape == shape_med:
            views["medial"][files[f]] = up2(px)
        else:
            sys.stderr.write(f"  -- {f}: own canvas, skipped\n")

    entries = build(views)
    HL, WL = next(iter(views["lateral"].values())).shape[:2]
    HM, WM = next(iter(views["medial"].values())).shape[:2]

    js = os.path.join(ROOT, "site", "assets", "brodmann-art.js")
    with open(js, "w") as o:
        o.write("/* The Brodmann cartoon as the artwork itself: per-view base drawing,\n")
        o.write("   highlight patches (real where the source highlights an area, and\n")
        o.write("   synthesized in its colour on the face that only draws it), and\n")
        o.write("   invisible hit shapes. Built by scripts/build_ba_artwork.py at 2x —\n")
        o.write("   do not edit by hand. */\n")
        o.write("window.MN_BA_ART = {\n")
        o.write(f'  box: {{ lateral: "0 0 {WL} {HL}", medial: "0 0 {WM} {HM}" }},\n')
        o.write('  base: { lateral: "assets/ba/base-lateral.png", medial: "assets/ba/base-medial.png" },\n')
        o.write("  areas: {\n")
        for ba in sorted(entries):
            rows = ", ".join(
                f'{{view:"{e["view"]}", href:"{e["href"]}", x:{e["x"]}, y:{e["y"]}, '
                f'w:{e["w"]}, h:{e["h"]}, d:"{e["d"]}"}}' for e in entries[ba])
            o.write(f"    {ba}: [{rows}],\n")
        o.write("  }\n};\n")
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    sys.stderr.write(f"assets: {len(os.listdir(OUT))} files, {total/1024:.0f} KB; wrote {js}\n")


if __name__ == "__main__":
    main()
