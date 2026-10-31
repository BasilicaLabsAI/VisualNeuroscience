#!/usr/bin/env python3
"""Which streamlines of the web tractogram run through, and end in, which AAL region.

The Tractography page can show the streamlines through the regions a person
picks (v12.59, at the owner's word): the amygdala's alone, or only those that
run between the amygdala and the hippocampus. Since v12.75 it can also show
the streamlines that end in a region, and Connecting means a streamline with
one end in one highlighted region and the other end in another, rather than
one that merely passes through both. The page does not search the file for
any of this; this script does it once and writes the answer beside the
tractogram, and the page reads it.

    python3 scripts/make_tract_regions.py
    python3 scripts/make_tract_regions.py --tract site/assets/tracts/hcp1065.trx \
        --atlas site/assets/aal.nii.gz --out site/assets/tracts/hcp1065-regions.json

A streamline runs through a region when the line the page draws, straight
from each stored point to the next, enters one of the region's own voxels:
every segment is walked in steps of --step millimetres (1 mm, finer than the
1 mm voxels) and each step's voxel looked up in the AAL volume. No tolerance
is added around a region, at the owner's word, so a bundle that merely skirts
a region's edge does not count for it, and the counts read lower than they
would with a margin. The tractogram and the AAL volume share MNI space, and
the file's positions are RAS millimetres, which the volume's affine turns
into voxel indices.

A streamline ends in a region when its first or its last point lies in one of
the region's voxels or within --search millimetres of one (2 mm): the
tractography stops its lines in the white matter just short of the grey, so
an end a millimetre or two from a gyrus is that gyrus's, while an end in the
brainstem, which the AAL does not label, is no region's. Each end takes the
nearest labelled voxel within the search, and the ends are read with no
search along the line, so a line that runs on past a region does not end
there. On the shipped file 83 per cent of the streamlines end in a region at
both ends and 99 per cent at one.

The output is JSON: for each AAL label (1 to 116, in the order
assets/atlas-data.js lists them; index 0 is unused) the sorted indices of the
streamlines through it, and for each streamline the labels at its two ends
(two to a streamline, interleaved, 0 where no region is within the search).
The page checks that the streamline count matches the tractogram it drew, so
a rebuilt tractogram needs this run again.

Reads a .trx (the zip the page ships: positions.3.float32 and offsets.int32)
with numpy alone, or a .trk through nibabel where it is installed.
"""
import argparse, gzip, json, os, re, struct, sys, zipfile
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read_trx(path):
    z = zipfile.ZipFile(path)
    names = z.namelist()
    pos_name = [n for n in names if n.startswith("positions.3.")][0]
    off_name = [n for n in names if n.startswith("offsets.")][0]
    pos_dtype = {"float32": np.float32, "float16": np.float16, "float64": np.float64}[pos_name.rsplit(".", 1)[1]]
    off_dtype = {"int32": np.int32, "uint32": np.uint32, "int64": np.int64, "uint64": np.uint64}[off_name.rsplit(".", 1)[1]]
    pos = np.frombuffer(z.read(pos_name), dtype=pos_dtype).reshape(-1, 3).astype(np.float64)
    off = np.frombuffer(z.read(off_name), dtype=off_dtype).astype(np.int64)
    if off[-1] != len(pos):
        off = np.concatenate([off, [len(pos)]])
    return pos, off


def read_trk(path):
    try:
        import nibabel as nib
    except ImportError:
        sys.exit("a .trk needs nibabel: pip install nibabel")
    t = nib.streamlines.load(path)
    lines = t.streamlines
    pos = np.vstack([np.asarray(s, dtype=np.float64) for s in lines])
    off = np.zeros(len(lines) + 1, dtype=np.int64)
    off[1:] = np.cumsum([len(s) for s in lines])
    return pos, off


def read_nifti(path):
    raw = gzip.open(path).read() if path.endswith(".gz") else open(path, "rb").read()
    dim = struct.unpack("<8h", raw[40:56])
    datatype = struct.unpack("<h", raw[70:72])[0]
    vox_offset = int(struct.unpack("<f", raw[108:112])[0])
    sform_code = struct.unpack("<h", raw[254:256])[0]
    if sform_code <= 0:
        sys.exit("the atlas volume carries no sform affine")
    srow = np.array(struct.unpack("<12f", raw[280:328])).reshape(3, 4)
    A = np.vstack([srow, [0, 0, 0, 1]])
    dt = {2: np.uint8, 4: np.int16, 8: np.int32, 16: np.float32, 64: np.float64, 512: np.uint16, 768: np.uint32}[datatype]
    n = dim[1] * dim[2] * dim[3]
    vol = np.frombuffer(raw[vox_offset:], dtype=dt)[:n].reshape((dim[1], dim[2], dim[3]), order="F")
    return vol, A


def label_names():
    """the AAL names in label order, read from the page's own list"""
    src = open(os.path.join(ROOT, "site", "assets", "atlas-data.js"), encoding="utf-8").read()
    m = re.search(r"RAW_LABELS\s*=\s*(\[[^\]]*\])", src)
    return json.loads(m.group(1)) if m else None


def end_labels(pts, vol, A, search):
    """the label at each point, or of the nearest labelled voxel within search millimetres, else 0"""
    Ainv = np.linalg.inv(A)
    NX, NY, NZ = vol.shape
    h = np.hstack([pts, np.ones((len(pts), 1))])
    v = (Ainv @ h.T).T[:, :3]
    vi = np.rint(v).astype(np.int64)
    out = np.zeros(len(pts), dtype=np.int64)
    best = np.full(len(pts), np.inf)
    # the voxel sizes, so the search is in millimetres whatever the grid
    size = np.sqrt((A[:3, :3] ** 2).sum(0))
    R = np.ceil(search / size).astype(np.int64)
    for dx in range(-R[0], R[0] + 1):
        for dy in range(-R[1], R[1] + 1):
            for dz in range(-R[2], R[2] + 1):
                q = vi + np.array([dx, dy, dz])
                inside = (q[:, 0] >= 0) & (q[:, 0] < NX) & (q[:, 1] >= 0) & (q[:, 1] < NY) & (q[:, 2] >= 0) & (q[:, 2] < NZ)
                lab = np.zeros(len(pts), dtype=np.int64)
                lab[inside] = vol[q[inside, 0], q[inside, 1], q[inside, 2]]
                # the point's distance from the voxel's centre, in millimetres
                d = np.linalg.norm((q - v) * size, axis=1)
                ok = (lab > 0) & (d <= search) & (d < best)
                best[ok] = d[ok]
                out[ok] = lab[ok]
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--tract", default=os.path.join(ROOT, "site", "assets", "tracts", "hcp1065.trx"))
    ap.add_argument("--atlas", default=os.path.join(ROOT, "site", "assets", "aal.nii.gz"))
    ap.add_argument("--out", default=os.path.join(ROOT, "site", "assets", "tracts", "hcp1065-regions.json"))
    ap.add_argument("--step", type=float, default=1.0, help="millimetres between the samples along each segment")
    ap.add_argument("--search", type=float, default=2.0, help="millimetres around each end within which a region counts as where it ends")
    a = ap.parse_args()

    pos, off = read_trk(a.tract) if a.tract.endswith(".trk") else read_trx(a.tract)
    vol, A = read_nifti(a.atlas)
    Ainv = np.linalg.inv(A)
    NX, NY, NZ = vol.shape
    N = len(off) - 1
    names = label_names()
    L = int(vol.max())
    print(f"{N} streamlines, {len(pos)} points; atlas {NX}x{NY}x{NZ}, {L} labels")

    # every segment, sampled at --step along its length, and each streamline's last point
    sid = np.repeat(np.arange(N), np.diff(off))
    p0, p1, s0, s1 = pos[:-1], pos[1:], sid[:-1], sid[1:]
    keep = s0 == s1
    p0, p1, segs = p0[keep], p1[keep], s0[keep]
    d = np.linalg.norm(p1 - p0, axis=1)
    n = np.maximum(1, np.ceil(d / a.step)).astype(np.int64)
    reps = np.repeat(np.arange(len(p0)), n)
    t = (np.arange(n.sum()) - np.repeat(np.cumsum(n) - n, n)) / np.repeat(n, n)
    pts = np.vstack([p0[reps] + (p1[reps] - p0[reps]) * t[:, None], pos[off[1:] - 1]])
    psid = np.concatenate([segs[reps], np.arange(N)])

    # millimetres to the nearest voxel, and the label there
    h = np.hstack([pts, np.ones((len(pts), 1))])
    v = np.rint((Ainv @ h.T).T[:, :3]).astype(np.int64)
    inside = (v[:, 0] >= 0) & (v[:, 0] < NX) & (v[:, 1] >= 0) & (v[:, 1] < NY) & (v[:, 2] >= 0) & (v[:, 2] < NZ)
    lab = np.zeros(len(v), dtype=np.int64)
    lab[inside] = vol[v[inside, 0], v[inside, 1], v[inside, 2]]
    M = np.zeros((N, L + 1), dtype=bool)
    M[psid, lab] = True
    M[:, 0] = False

    through = [[] for _ in range(L + 1)]
    for l in range(1, L + 1):
        through[l] = np.flatnonzero(M[:, l]).tolist()
    counts = np.array([len(x) for x in through[1:]])
    per = M.sum(1)
    print(f"regions per streamline: mean {per.mean():.1f}, none for {int((per == 0).sum())}")
    print(f"streamlines per region: min {counts.min()}, median {int(np.median(counts))}, max {counts.max()}")
    if names:
        lo = np.argsort(counts)[:3] + 1
        hi = np.argsort(-counts)[:3] + 1
        print("fewest: " + ", ".join(f"{names[i]} {counts[i - 1]}" for i in lo))
        print("most: " + ", ".join(f"{names[i]} {counts[i - 1]}" for i in hi))

    # where each streamline ends (v12.75): the region at its first point and at its last, within the search
    first = end_labels(pos[off[:-1]], vol, A, a.search)
    last = end_labels(pos[off[1:] - 1], vol, A, a.search)
    ends = np.empty(2 * N, dtype=np.int64)
    ends[0::2], ends[1::2] = first, last
    both = (first > 0) & (last > 0)
    one = (first > 0) | (last > 0)
    pairs = {}
    for x, y in zip(first[both], last[both]):
        k = (min(x, y), max(x, y))
        pairs[k] = pairs.get(k, 0) + 1
    print(f"ends within {a.search:g} mm of a region: both ends {both.mean() * 100:.1f}%, one or both {one.mean() * 100:.1f}%; "
          f"{len(pairs)} region pairs, {sum(1 for c in pairs.values() if c >= 10)} with ten or more streamlines")
    if names:
        ending = np.array([int(((first == l) | (last == l)).sum()) for l in range(1, L + 1)])
        for want in ("Amygdala_L", "Thalamus_L", "Precentral_L"):
            if want in names:
                i = names.index(want)
                print(f"{want}: {counts[i - 1]} through, {ending[i - 1]} ending")

    out = {
        "v": 2,
        "source": os.path.basename(a.tract),
        "atlas": os.path.basename(a.atlas),
        "stepMm": a.step,
        "searchMm": a.search,
        "streamlines": N,
        "labels": names,
        "through": through,
        "ends": ends.tolist(),
    }
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(out, f, separators=(",", ":"))
    size = os.path.getsize(a.out)
    print(f"wrote {a.out}: {size / 1024:.0f} KB, {len(gzip.compress(open(a.out, 'rb').read())) / 1024:.0f} KB gzipped")


if __name__ == "__main__":
    main()
