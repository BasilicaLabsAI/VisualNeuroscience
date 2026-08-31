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


def build_view(stack, tag):
    imgs = np.stack([v for v in stack.values()])
    base = np.median(imgs.astype(np.int16), axis=0).astype(np.uint8)
    write_png(os.path.join(OUT, f"base-{tag}.png"), base)

    marks = masks_for(stack)
    regions = segment(base[..., :3].astype(np.int16), base[..., 3].astype(np.int16))

    entries = {}
    for ba, px in stack.items():
        m = marks.get(ba)
        if m is None or not m.any():
            sys.stderr.write(f"  !! BA{ba}: empty highlight\n")
            continue
        # the patch: this image's pixels where they differ, rim included
        grown = shift_or(m, 2)
        ys, xs = np.nonzero(grown)
        y0, y1, x0, x1 = ys.min(), ys.max()+1, xs.min(), xs.max()+1
        patch = px[y0:y1, x0:x1].copy()
        keep = grown[y0:y1, x0:x1]
        patch[~keep] = 0
        write_png(os.path.join(OUT, f"{tag}-{ba}.png"), patch)

        # the hit shape: the drawing's own region(s) under this highlight,
        # falling back to the highlight mask if segmentation missed it
        hit = np.zeros_like(m)
        for r in regions:
            if (r & m).sum() > 0.5 * r.sum():
                hit |= r
        if not hit.any():
            hit = m
        parts = []
        for lp in loops(fill_small_holes(close(hit, 1), maxpx=60)):
            s = rdp(lp, 1.0)
            if len(s) > 3 and abs(_area(s)) > 20:
                parts.append(smooth(s))
        entries[ba] = {"view": tag, "href": f"assets/ba/{tag}-{ba}.png",
                       "x": int(x0), "y": int(y0),
                       "w": int(x1-x0), "h": int(y1-y0),
                       "d": " ".join(parts)}
    H, W = next(iter(stack.values())).shape[:2]
    sys.stderr.write(f"{tag}: base {W}x{H}, {len(entries)} patches\n")
    return entries, W, H


def main():
    import re
    src = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    files = {}
    for f in os.listdir(src):
        m = re.match(r"broadmann_(\d+)a?\.png$", f)
        if m:
            files[f] = int(m.group(1))
    imgs = {f: read_png(os.path.join(src, f)) for f in files}
    shape_lat = imgs["broadmann_04.png"].shape
    shape_med = imgs["broadmann_23a.png"].shape
    lat, med = {}, {}
    for f, px in imgs.items():
        if px.shape == shape_lat:
            lat[files[f]] = px
        elif px.shape == shape_med:
            med[files[f]] = px
        else:
            sys.stderr.write(f"  -- {f}: own canvas, skipped\n")

    latE, WL, HL = build_view(lat, "lateral")
    medE, WM, HM = build_view(med, "medial")

    js = os.path.join(ROOT, "site", "assets", "brodmann-art.js")
    with open(js, "w") as o:
        o.write("/* The Brodmann cartoon as the artwork itself: per-view base drawing,\n")
        o.write("   one highlight patch per area, and invisible hit shapes. Built by\n")
        o.write("   scripts/build_ba_artwork.py — do not edit by hand. */\n")
        o.write("window.MN_BA_ART = {\n")
        o.write(f'  box: {{ lateral: "0 0 {WL} {HL}", medial: "0 0 {WM} {HM}" }},\n')
        o.write('  base: { lateral: "assets/ba/base-lateral.png", medial: "assets/ba/base-medial.png" },\n')
        o.write("  areas: {\n")
        for ba in sorted({**latE, **medE}):
            e = latE.get(ba) or medE.get(ba)
            o.write(f'    {ba}: {{view:"{e["view"]}", href:"{e["href"]}", '
                    f'x:{e["x"]}, y:{e["y"]}, w:{e["w"]}, h:{e["h"]}, d:"{e["d"]}"}},\n')
        o.write("  }\n};\n")
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    sys.stderr.write(f"assets: {len(os.listdir(OUT))} files, {total/1024:.0f} KB; wrote {js}\n")


if __name__ == "__main__":
    main()
