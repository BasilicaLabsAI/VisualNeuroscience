#!/usr/bin/env python3
"""Cut greyscale MRI slices for the sharing card.

Reads the same MNI152 volume the site ships — no download, no second copy of
the data — takes one slice down each anatomical axis and writes it out under
the greyscale a scanner writes, so the card's scans read as scans rather than
as stock art with a filter on them.

    python3 scripts/make_social.py

Writes site/assets/social/{sagittal,coronal,axial}.png. Pillow is not
available here, so the PNGs are encoded by hand; they are plain 8-bit RGB.
"""

import base64
import gzip
import os
import re
import struct
import sys
import zlib

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ATLAS_JS = os.path.join(ROOT, "site", "assets", "atlas-data.js")
OUT_DIR = os.path.join(ROOT, "site", "assets", "social")

# The standard radiological greyscale: black through to white, with the mid
# tones lifted a little so grey and white matter stay apart on a small card.
RAMP = [
    (0.00, (0, 0, 0)),
    (0.25, (58, 58, 58)),
    (0.50, (124, 124, 124)),
    (0.75, (196, 196, 196)),
    (1.00, (255, 255, 255)),
]


def load_template():
    """Pull the gzipped NIfTI out of the site's own asset and decode it."""
    src = open(ATLAS_JS).read()
    m = re.search(r'TPL_B64\s*=\s*"([A-Za-z0-9+/=]+)"', src)
    if not m:
        sys.exit("could not find TPL_B64 in " + ATLAS_JS)
    nii = gzip.decompress(base64.b64decode(m.group(1)))
    dim = struct.unpack_from("<8h", nii, 40)[1:4]
    offset = int(struct.unpack_from("<f", nii, 108)[0])
    vox = np.frombuffer(nii, dtype=np.uint8, count=dim[0]*dim[1]*dim[2], offset=offset)
    # NIfTI is fastest-varying-first, so i is the innermost axis
    return vox.reshape(dim[2], dim[1], dim[0]).transpose(2, 1, 0), dim


def ramp_lut():
    lut = np.zeros((256, 3), dtype=np.uint8)
    for i in range(256):
        t = i/255.0
        for (t0, c0), (t1, c1) in zip(RAMP, RAMP[1:]):
            if t0 <= t <= t1:
                f = 0.0 if t1 == t0 else (t - t0)/(t1 - t0)
                lut[i] = [round(c0[k] + (c1[k] - c0[k])*f) for k in range(3)]
                break
    return lut


def window(slab):
    """Stretch to the 1st–99th percentile of the tissue, not of the air."""
    lit = slab[slab > 0]
    if lit.size == 0:
        return slab.astype(np.uint8)
    lo, hi = np.percentile(lit, 1), np.percentile(lit, 99)
    if hi <= lo:
        return slab.astype(np.uint8)
    out = (slab.astype(np.float32) - lo)/(hi - lo)
    return (np.clip(out, 0, 1)*255).astype(np.uint8)


def write_png(path, rgb):
    h, w, _ = rgb.shape
    raw = b"".join(b"\x00" + rgb[y].tobytes() for y in range(h))

    def chunk(tag, data):
        return (struct.pack(">I", len(data)) + tag + data +
                struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))

    png = (b"\x89PNG\r\n\x1a\n"
           + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
           + chunk(b"IDAT", zlib.compress(raw, 9))
           + chunk(b"IEND", b""))
    open(path, "wb").write(png)


def main():
    vol, dim = load_template()
    lut = ramp_lut()
    os.makedirs(OUT_DIR, exist_ok=True)

    # i is left–right, j anterior–posterior, k superior–inferior
    cuts = {
        "sagittal": np.rot90(vol[dim[0]//2, :, :]),
        "coronal":  np.rot90(vol[:, int(dim[1]*0.56), :]),
        "axial":    np.rot90(vol[:, :, int(dim[2]*0.52)]),
    }
    for name, slab in cuts.items():
        rgb = lut[window(np.ascontiguousarray(slab))]
        path = os.path.join(OUT_DIR, name + ".png")
        write_png(path, rgb)
        print("%-9s %sx%s -> %s" % (name, rgb.shape[1], rgb.shape[0], path))


if __name__ == "__main__":
    main()
