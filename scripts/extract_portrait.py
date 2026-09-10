#!/usr/bin/env python3
"""Pull the framed portrait and the signature out of the CV, for the About page.

Three separable things sit on the CV's first page. The photograph is a
raster cutout with its own soft mask. The engraved oval frame and the
signature beside it are vector line work, several hundred hairline paths
of it. So this writes the photograph as a picture and the two drawings as
alpha stencils, which CSS then paints in whatever the page's ink colour
is — dark on paper, pale in the dark theme, from one set of files.

The frame is split in two because the original stacks it that way: the
guilloche engraving sits behind the photograph, and the name ribbon sits
in front of it, over the shoulders.

    python3 scripts/extract_portrait.py path/to/Fadil_Karim_CV.pdf

The CV itself is not in the repository. Outputs are WebP in
site/assets/portrait/ and the geometry the CSS needs is printed at the end.
"""
import json
import pathlib
import sys

import pymupdf
from PIL import Image, ImageChops, ImageDraw

SCALE = 6                                   # render factor for the stencils
OLIVE = {(0.349, 0.365, 0.306), (0.349, 0.361, 0.306)}
CREAM = (0.984, 0.98, 0.886)
SLATE = (0.243, 0.275, 0.306)
OUT = pathlib.Path("site/assets/portrait")


def rnd(c):
    return tuple(round(v, 3) for v in (c or ()))


def union(paths):
    u = paths[0]["rect"]
    for p in paths[1:]:
        u = u | p["rect"]
    return u


def classify(page):
    """Sort the page's vectors into the engraving, the ribbon, the signature,
       and the cream oval the photograph is laid over."""
    back, front, sign, backdrop = [], [], [], None
    for dr in page.get_drawings():
        r, col, fil = dr["rect"], rnd(dr.get("color")), rnd(dr.get("fill"))
        width = dr.get("width") or 0
        in_frame = r.x0 > 70 and r.x1 < 200 and r.y0 > 60 and r.y1 < 215
        if fil == CREAM and dr["type"] == "f" and r.width > 50:
            backdrop = dr
        elif in_frame and (col in OLIVE or fil == CREAM):
            ribbon_shape = dr["type"] == "fs" and r.y0 >= 199 and 108 < r.x0 < 165
            ribbon_letter = dr["type"] == "s" and 0.11 < width < 0.13 and r.y0 > 201
            (front if ribbon_shape or ribbon_letter else back).append(dr)
        elif (col == SLATE or fil == SLATE) and r.x0 > 155 and r.y0 > 180 and r.y1 < 215:
            sign.append(dr)
    if not backdrop:
        sys.exit("could not find the oval the photograph sits on")
    return back, front, sign, backdrop


def replay(paths, box, pad=0.5, ink=None):
    """Redraw the paths over `box` on a transparent page, in document order.

       With `ink` left alone each path keeps the CV's own colours, which is
       how the frame is reproduced. Passing an ink colour draws everything
       in it instead, for the signature, whose stencil CSS recolours."""
    box = pymupdf.Rect(box.x0 - pad, box.y0 - pad, box.x1 + pad, box.y1 + pad)
    tmp = pymupdf.open()
    page = tmp.new_page(width=box.width, height=box.height)
    shift = pymupdf.Matrix(1, 0, 0, 1, -box.x0, -box.y0)
    for dr in paths:
        shape = page.new_shape()          # one shape per path, so z-order holds
        for it in dr["items"]:
            if it[0] == "l":
                shape.draw_line(it[1] * shift, it[2] * shift)
            elif it[0] == "c":
                shape.draw_bezier(it[1] * shift, it[2] * shift, it[3] * shift, it[4] * shift)
            elif it[0] == "re":
                shape.draw_rect(it[1] * shift)
            elif it[0] == "qu":
                shape.draw_quad(it[1] * shift)
        stroke = dr.get("color") if dr["type"] in ("s", "fs") else None
        fill = dr.get("fill") if dr["type"] in ("f", "fs") else None
        if ink is not None:
            stroke = ink if stroke is not None else None
            fill = ink if fill is not None else None
        shape.finish(color=stroke, fill=fill,
                     width=max(dr.get("width") or 0.04, 0.04),
                     even_odd=bool(dr.get("even_odd")),
                     closePath=bool(dr.get("closePath")))
        shape.commit()
    pix = page.get_pixmap(matrix=pymupdf.Matrix(SCALE, SCALE), alpha=True)
    return Image.frombytes("RGBA", (pix.width, pix.height), pix.samples)


def colour_layer(paths, box, out):
    """The frame as the CV draws it, transparent everywhere it does not."""
    img = replay(paths, box)
    img.save(out, lossless=True, method=6)
    return img.size


def stencil(paths, box, out):
    """Line work reduced to opacity, for CSS to paint in the page's ink."""
    img = replay(paths, box, ink=(0, 0, 0))
    out_img = Image.new("LA", img.size, (0, 0))       # greyscale+alpha: half the bytes
    # quantised to 32 levels: this is a texture, not a gradient, and it halves
    # the file with nothing visible lost
    out_img.putalpha(img.getchannel("A").point(lambda v: (v // 8) * 8))
    out_img.save(out, lossless=True, method=6)
    return out_img.size


def flatten(items, to_px, steps=64):
    """The oval as a polygon, so PIL can fill it as a mask."""
    pts = []
    for it in items:
        if it[0] == "c":
            p0, p1, p2, p3 = [to_px(p.x, p.y) for p in it[1:5]]
            for s in range(steps + 1):
                t = s / steps
                u = 1 - t
                pts.append((u**3 * p0[0] + 3*u*u*t * p1[0] + 3*u*t*t * p2[0] + t**3 * p3[0],
                            u**3 * p0[1] + 3*u*u*t * p1[1] + 3*u*t*t * p2[1] + t**3 * p3[1]))
        elif it[0] == "l":
            pts += [to_px(it[1].x, it[1].y), to_px(it[2].x, it[2].y)]
    return pts


def main(src):
    doc = pymupdf.open(src)
    page = doc[0]
    back, front, sign, backdrop = classify(page)
    if not (back and front and sign):
        sys.exit(f"unexpected CV layout: {len(back)} engraving, {len(front)} ribbon, {len(sign)} signature paths")
    frame_box, sign_box = union(back + front), union(sign)
    OUT.mkdir(parents=True, exist_ok=True)

    # the cream ground belongs to the frame, behind the photograph
    print("frame       ", colour_layer([backdrop] + back, frame_box, OUT / "frame-back.webp"),
          f"({len(back) + 1} paths)")
    print("ribbon      ", colour_layer(front, frame_box, OUT / "ribbon.webp"), f"({len(front)} paths)")
    print("signature   ", stencil(sign, sign_box, OUT / "signature.webp"), f"({len(sign)} paths)")

    # the photograph, clipped to the oval it is laid over
    img_info = next(i for i in page.get_image_info(xrefs=True) if i["xref"] == 263)
    tx = img_info["transform"]
    photo = pymupdf.Pixmap(pymupdf.Pixmap(doc, 263), pymupdf.Pixmap(doc, 264))
    photo = Image.frombytes("RGBA", (photo.width, photo.height), photo.samples)
    side = photo.width
    to_px = lambda x, y: ((x - tx[4]) * side / tx[0], (y - tx[5]) * side / tx[0])

    oval = Image.new("L", photo.size, 0)
    ImageDraw.Draw(oval).polygon(flatten(backdrop["items"], to_px), fill=255)
    photo.putalpha(ImageChops.multiply(photo.getchannel("A"), oval))
    r = backdrop["rect"]
    photo = photo.crop(tuple(round(v) for v in (*to_px(r.x0, r.y0), *to_px(r.x1, r.y1))))
    photo.save(OUT / "portrait.webp", quality=88, method=6)
    print("photograph ", photo.size)

    geom = {
        "frameAspect": round(frame_box.width / frame_box.height, 5),
        "signAspect": round(sign_box.width / sign_box.height, 5),
        "photoInFrame": {
            "left":   round((r.x0 - frame_box.x0) / frame_box.width * 100, 3),
            "top":    round((r.y0 - frame_box.y0) / frame_box.height * 100, 3),
            "width":  round(r.width / frame_box.width * 100, 3),
            "height": round(r.height / frame_box.height * 100, 3),
        },
    }
    print("\ngeometry for the CSS:\n" + json.dumps(geom, indent=2))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
