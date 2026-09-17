"""Build the layer V pyramidal cell for the Microanatomy page.

usage: python3 build.py [seed]      (default seed 7)

Writes the two files site/assets/cells.js fetches:

  site/assets/cells/pyramidal-neuron.svg   the drawing, click targets marked
  site/assets/cells/pyramidal-neuron.json  the structures, with their text

The drawing is original and generated, not traced: the arbor is grown from a
seeded random walk inside a set of rules about where a pyramidal cell sends
its branches, and the same seed gives the same cell every time. Standard
library only, so it runs anywhere python3 does.

How it is drawn. Every dendrite and axon is a centreline plus a radius that
tapers along it. A run of centreline is stroked twice: once in ink, a little
wider, and once in the cell colour on top, so where two branches meet they
merge into one silhouette instead of showing a seam. Runs whose radius
rounds to the same step are batched into one path element, which is what
keeps the file to a few hundred elements rather than a few thousand.

The plate's colours are not in this file. Every shape carries a class, and
site/microanatomy.html paints it, so the drawing follows the page's theme.

Conventions, shared with the multipolar neuron:
  data-part="<id>"   a click target
  data-vis="<id>"    what recolours when that structure is picked, carrying
                     its accent as an inline --acc
  #mn-callout        the empty group the page draws the label into
"""
import json, math, os, random, sys, colorsys

W, H = 1180, 1010
SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 7

# ── the cortex the cell sits in ────────────────────────────────────────────
# A layer V pyramidal cell spans the whole cortical thickness: its tuft is in
# layer I under the pia, its body is in V, and its axon leaves through VI into
# the white matter. The bands are context and are not click targets.
LAYERS = [("I", 22, 150), ("II/III", 150, 370), ("IV", 370, 452),
          ("V", 452, 664), ("VI", 664, 796), ("white matter", 796, 1010)]

SOMA = (548.0, 546.0)          # centre of the cell body
APEX = (548.0, 472.0)          # where the apical dendrite leaves it
BASE_Y = 618.0                 # the flat base of the pyramid
HALF = 66.0                    # half the width of that base

# ── numbers, small ─────────────────────────────────────────────────────────
def f(v):
    """A number with no more precision than the drawing needs."""
    s = f"{v:.1f}"
    if s.endswith(".0"): s = s[:-2]
    return "0" if s == "-0" else s

def P(p): return f"{f(p[0])} {f(p[1])}"

def rainbow(t, l_floor=0.60, s_floor=0.62):
    """d3.interpolateRainbow with luminance and saturation floors, so every
    accent reads against both the light and the dark plate. Same generator
    the multipolar neuron uses, so the two cells share one palette."""
    t %= 1.0
    ts = abs(t - 0.5)
    h = 360 * t - 100; s = 1.5 - 1.5 * ts; l = 0.8 - 0.9 * ts
    hr = math.radians(h + 120); a = s * l * (1 - l); ch, sh = math.cos(hr), math.sin(hr)
    r = l + a * (-0.14861 * ch + 1.78277 * sh)
    g = l + a * (-0.29227 * ch - 0.90649 * sh)
    b = l + a * (1.97294 * ch)
    r, g, b = (min(1, max(0, v)) for v in (r, g, b))
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    r, g, b = colorsys.hls_to_rgb(hh, max(ll, l_floor), max(ss, s_floor))
    return "#%02x%02x%02x" % tuple(int(round(v * 255)) for v in (r, g, b))

# ── geometry ───────────────────────────────────────────────────────────────
def smooth(pts, passes=2):
    """A three-point moving average, so a random walk reads as a branch."""
    for _ in range(passes):
        out = [pts[0]]
        for i in range(1, len(pts) - 1):
            a, b, c = pts[i - 1], pts[i], pts[i + 1]
            out.append(((a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4))
        out.append(pts[-1])
        pts = out
    return pts

def walk(rng, start, ang, length, drift=0.10, step=9.0):
    """A branch: a step at a time, the heading wandering a little each step."""
    pts, p, a = [start], start, ang
    n = max(2, int(round(length / step)))
    for _ in range(n):
        a += rng.uniform(-drift, drift)
        p = (p[0] + math.cos(a) * step, p[1] + math.sin(a) * step)
        pts.append(p)
    return smooth(pts), a

def clamp(branches, x0, x1, y0, y1):
    """Hold a branch inside the frame. A tuft branch that reaches the top runs
    along under the pia rather than through it, which is what one does."""
    out = []
    for pts, r0, r1 in branches:
        p = [(min(max(x, x0), x1), min(max(y, y0), y1)) for x, y in pts]
        out.append((smooth(p, 1), r0, r1))
    return out

def arclen(pts):
    return sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))

def at_frac(pts, t):
    """The point a fraction t along a centreline, and the heading there."""
    total = arclen(pts) * t
    run = 0.0
    for i in range(len(pts) - 1):
        d = math.dist(pts[i], pts[i + 1])
        if run + d >= total or i == len(pts) - 2:
            k = 0 if d == 0 else (total - run) / d
            p = (pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k,
                 pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k)
            return p, math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])
        run += d
    return pts[-1], 0.0

# ── the tubes ──────────────────────────────────────────────────────────────
# A branch is kept as (centreline, radius at the start, radius at the end).
# Quantising the radius lets a whole run share one stroke width, and one path
# element can then carry every run of that width in the structure.
STEP = 0.55

def runs(branches):
    """Group the branches of one structure into (width, path data) pairs."""
    buckets = {}
    for pts, r0, r1 in branches:
        total = arclen(pts) or 1.0
        run, cur, start = 0.0, None, 0
        for i in range(len(pts)):
            if i:
                run += math.dist(pts[i - 1], pts[i])
            r = r0 + (r1 - r0) * (run / total)
            q = max(STEP, round(r / STEP) * STEP)
            if cur is None:
                cur = q
            elif q != cur or i == len(pts) - 1:
                seg = pts[start:i + 1]
                if len(seg) > 1:
                    buckets.setdefault(round(cur, 2), []).append(seg)
                start, cur = i, q
        if cur is not None and start < len(pts) - 1:
            buckets.setdefault(round(cur, 2), []).append(pts[start:])
    out = []
    for w in sorted(buckets, reverse=True):
        d = "".join("M" + P(seg[0]) + "".join("L" + P(p) for p in seg[1:]) for seg in buckets[w])
        out.append((w, d))
    return out

def tube_layers(branches, ink_extra=3.2):
    """The two passes: ink underneath, the cell's own colour on top. Stroke is
    an inherited property, so the paths carry only their width and take their
    colour from whichever classed group they sit in."""
    rr = runs(branches)
    ink = "".join(f'<path stroke-width="{f(w * 2 + ink_extra)}" d="{d}"/>' for w, d in rr)
    body = "".join(f'<path stroke-width="{f(w * 2)}" d="{d}"/>' for w, d in rr)
    return ink, body

def hit_layer(branches, part, pad=9.0, cap=None):
    """A transparent fat stroke along the centrelines, so a structure can be
    hit anywhere near it and not only where the ink lands. A square cap is
    for a run that stops beside something else's target, like the sheath
    stopping short of the bare stretch of axon past it."""
    d = "".join("M" + P(pts[0]) + "".join("L" + P(p) for p in pts[1:]) for pts, _, _ in branches)
    w = max(13.0, pad + 2 * max(max(r0, r1) for _, r0, r1 in branches))
    c = f' stroke-linecap="{cap}"' if cap else ""
    return f'<g class="mn-spn-hit" data-part="{part}"><path stroke-width="{f(w)}"{c} d="{d}"/></g>'

# ── growing the cell ───────────────────────────────────────────────────────
rng = random.Random(SEED)
UP = -math.pi / 2

# The apical trunk: one thick dendrite straight up through the layers. It is
# the cell's defining feature and the reason the cortex has its layered look.
apical, _ = walk(rng, APEX, UP + 0.02, 318, drift=0.033, step=8)
apical = [(x + math.sin(y / 90.0) * 2.2, y) for x, y in apical]
APICAL_TOP = apical[-1]
apical_b = [(apical, 13.0, 6.6)]

# The tuft: where the trunk reaches layer I it breaks into a spray of thin
# branches that spread sideways under the pia.
def grow(rng, start, ang, length, r0, r1, depth, spread, shrink=0.62, drift=0.13):
    """A branch and everything that grows out of its end."""
    pts, end_ang = walk(rng, start, ang, length, drift=drift)
    out = [(pts, r0, r1)]
    if depth <= 0:
        return out, [(pts, r0, r1)]
    tips = []
    kids = 2 if rng.random() < 0.86 else 3
    for k in range(kids):
        off = (k - (kids - 1) / 2) * spread * rng.uniform(0.8, 1.25)
        sub, sub_tips = grow(rng, pts[-1], end_ang + off, length * rng.uniform(0.58, 0.84),
                             r1, max(0.85, r1 * shrink), depth - 1, spread * 0.86, shrink, drift)
        out += sub; tips += sub_tips
    return out, tips

tuft, tuft_tips = [], []
for k, a in enumerate((-1.24, -0.74, -0.26, 0.24, 0.74, 1.22)):
    br, tips = grow(rng, APICAL_TOP, UP + a * 1.16, 70 * rng.uniform(0.86, 1.2),
                    6.0, 4.0, 2, 0.94, 0.68, 0.16)
    tuft += br; tuft_tips += tips
tuft = clamp(tuft, 30, W - 30, 34, H)
tuft_tips = clamp(tuft_tips, 30, W - 30, 34, H)

# Oblique dendrites: side branches off the trunk, the cell's ears in the
# middle layers, where most of the cortex's own traffic arrives.
oblique, oblique_tips = [], []
for t, side in ((0.22, 1), (0.36, -1), (0.50, 1), (0.63, -1), (0.76, 1), (0.87, -1)):
    p, _ = at_frac(apical, t)
    a = UP + side * rng.uniform(1.02, 1.30)
    br, tips = grow(rng, p, a, rng.uniform(96, 142), 4.8, 3.0, 1, 0.64, 0.72, 0.15)
    oblique += br; oblique_tips += tips

# The basal skirt: trunks off the base and lower corners of the pyramid,
# fanning down and out into the same layer the body sits in.
basal, basal_tips = [], []

for a in (2.70, 2.40, 2.10, 1.82, 1.32, 1.04, 0.74, 0.44):
    sx = math.cos(a) * HALF * 0.82
    start = (SOMA[0] + sx, BASE_Y - 16 + abs(math.cos(a)) * 6)
    br, tips = grow(rng, start, a + rng.uniform(-0.08, 0.08), rng.uniform(116, 158),
                    7.4, 4.4, 2, 0.70, 0.72, 0.14)
    basal += br; basal_tips += tips

basal = clamp(basal, 26, W - 26, 0, H - 8)
basal_tips = clamp(basal_tips, 26, W - 26, 0, H - 8)
oblique = clamp(oblique, 26, W - 26, 0, H)
oblique_tips = clamp(oblique_tips, 26, W - 26, 0, H)

# ── the axon, out through the white matter ─────────────────────────────────
HILL_TOP, HILL_END = BASE_Y - 8, BASE_Y + 34          # the hillock's cone
IS_END = HILL_END + 74                                # the initial segment
hillock_b = [([(SOMA[0], HILL_TOP), (SOMA[0] + 1, HILL_END)], 15.0, 7.4)]
initial_b = [([(SOMA[0] + 1, HILL_END), (SOMA[0] + 2.5, IS_END)], 7.4, 6.2)]

axon_pts, _ = walk(rng, (SOMA[0] + 2.5, IS_END), math.pi / 2 + 0.035, H - IS_END - 6,
                   drift=0.028, step=10)
axon_b = [(axon_pts, 6.2, 5.0)]

# The sheath: internodes of myelin with a bare node of Ranvier between each
# pair, which is what lets the signal jump rather than crawl.
NODES = 3
gaps, internodes = [], []
t0 = 0.05
for i in range(NODES + 1):
    t1 = t0 + 0.175
    internodes.append((min(t0, 1.0), min(t1, 1.0)))
    t0 = t1 + 0.048
    if i < NODES and t0 < 1.0:
        gaps.append((t1, min(t0, 1.0)))

def slice_between(pts, t0, t1, n=14):
    return [at_frac(pts, t0 + (t1 - t0) * k / n)[0] for k in range(n + 1)]

myelin_b = [(slice_between(axon_pts, a, b), 12.4, 11.2) for a, b in internodes]
node_b = [(slice_between(axon_pts, a, b, 4), 5.4, 5.4) for a, b in gaps]

# A recurrent collateral: the branch that turns back into the cortex and
# talks to the cell's neighbours, given off at a node where the sheath stops.
col_start, _ = at_frac(axon_pts, (gaps[0][0] + gaps[0][1]) / 2)
collateral, col_tips = grow(rng, col_start, math.pi * 0.93, 104, 4.4, 3.0, 1, 0.5, 0.72, 0.13)
col_up, up_tips = grow(rng, collateral[0][0][-1], -math.pi * 0.62, 132, 3.2, 2.2, 2, 0.5, 0.74, 0.15)
collateral += col_up; col_tips += up_tips

# ── spines, and the synapse that sits on one ───────────────────────────────
# Pyramidal cells are the spiny cell of the cortex: nearly every excitatory
# contact they receive lands on a spine rather than on the shaft.
def spines_on(branches, density, r_at, keep=lambda p: True):
    stalks, heads = [], []
    for pts, r0, r1 in branches:
        total = arclen(pts)
        n = int(total * density)
        for _ in range(n):
            t = rng.uniform(0.06, 0.98)
            p, a = at_frac(pts, t)
            if not keep(p): continue
            r = r0 + (r1 - r0) * t
            if r > r_at: continue
            side = 1 if rng.random() < 0.5 else -1
            th = a + side * (math.pi / 2) * rng.uniform(0.68, 1.22)
            ln = rng.uniform(5.2, 8.4)
            base = (p[0] + math.cos(th) * r * 0.6, p[1] + math.sin(th) * r * 0.6)
            tip = (base[0] + math.cos(th) * ln, base[1] + math.sin(th) * ln)
            stalks.append((base, tip))
            heads.append(tip)
    return stalks, heads

def spine_hit_path(stalks):
    """Only the outer half of each spine, so clicking the dendrite it stands
    on still reaches the dendrite."""
    d = []
    for (bx, by), (tx, ty) in stalks:
        mx, my = bx + (tx - bx) * 0.55, by + (ty - by) * 0.55
        d.append("M" + P((mx, my)) + "L" + P((tx, ty)))
    return "".join(d)

spine_stalks, spine_heads = [], []
for group, dens, rmax in ((oblique, 0.30, 5.0), (basal, 0.26, 6.0), (tuft, 0.24, 5.0), (apical_b, 0.10, 9.0)):
    s, h = spines_on(group, dens, rmax, keep=lambda p: 20 < p[0] < W - 20 and 26 < p[1] < 980)
    spine_stalks += s; spine_heads += h

# the one spine drawn with a terminal on it, so the contact itself can be seen
SYN = min(spine_heads, key=lambda p: math.dist(p, (318, 726)))
SYN_ANG = math.atan2(SYN[1] - SOMA[1], SYN[0] - SOMA[0])

# inhibitory terminals, the basket-cell contacts that ring a pyramidal soma
inhib = []
for a in (2.90, 2.48, 0.68, 0.26, math.pi / 2 + 0.34):
    x = SOMA[0] + math.cos(a) * HALF * 1.02
    y = SOMA[1] + 22 + math.sin(a) * 26
    inhib.append((x, y, a))

# ── the soma ───────────────────────────────────────────────────────────────
# The pyramid the cell is named for: a peak drawn up into the apical dendrite,
# a flat base, and corners the basal dendrites leave from.
def soma_path():
    ax, ay = APEX
    l = (SOMA[0] - HALF, BASE_Y); r = (SOMA[0] + HALF, BASE_Y)
    return ("M" + P((ax - 9, ay + 4)) +
            f"C{P((ax - 30, ay + 34))} {P((l[0] - 6, BASE_Y - 62))} {P((l[0] - 2, BASE_Y - 18))}" +
            f"C{P((l[0] - 1, BASE_Y - 5))} {P((l[0] + 8, BASE_Y))} {P((l[0] + 20, BASE_Y + 1))}" +
            f"L{P((r[0] - 20, BASE_Y + 1))}" +
            f"C{P((r[0] - 8, BASE_Y))} {P((r[0] + 1, BASE_Y - 5))} {P((r[0] + 2, BASE_Y - 18))}" +
            f"C{P((r[0] + 6, BASE_Y - 62))} {P((ax + 30, ay + 34))} {P((ax + 9, ay + 4))}Z")

NUC_C = (SOMA[0] - 2, SOMA[1] + 6)
NUC_R = (40, 35)

# ── organelles ─────────────────────────────────────────────────────────────
def in_soma(p, pad=0.0):
    """Roughly inside the pyramid, so nothing is drawn through its wall."""
    x, y = p
    if not (APEX[1] + 16 + pad < y < BASE_Y - 6 - pad): return False
    k = (y - APEX[1]) / (BASE_Y - APEX[1])
    half = 10 + (HALF - 12) * k
    return abs(x - SOMA[0]) < half - pad

def in_nucleus(p, pad=0.0):
    return ((p[0] - NUC_C[0]) / (NUC_R[0] + pad)) ** 2 + ((p[1] - NUC_C[1]) / (NUC_R[1] + pad)) ** 2 < 1

# Nissl bodies: the stacked rough ER that makes a neuron stain in blocks, and
# which in a pyramidal cell reaches up into the apical dendrite.
nissl = []
tries = 0
while len(nissl) < 19 and tries < 6000:
    tries += 1
    x = rng.uniform(SOMA[0] - HALF, SOMA[0] + HALF)
    y = rng.uniform(APEX[1] + 18, BASE_Y - 10)
    if not in_soma((x, y), 6) or in_nucleus((x, y), 7): continue
    if any(math.dist((x, y), (n[0], n[1])) < 16 for n in nissl): continue
    nissl.append((x, y, rng.uniform(0, math.pi), rng.uniform(7.5, 12.5), rng.uniform(3.0, 4.6)))
for k in range(5):                      # a few carried into the trunk
    p, a = at_frac(apical, 0.9 - k * 0.055)
    nissl.append((p[0] + rng.uniform(-2, 2), p[1], a + math.pi / 2, rng.uniform(5.5, 8), rng.uniform(2.4, 3.2)))

mito = []
tries = 0
while len(mito) < 7 and tries < 9000:
    tries += 1
    x = rng.uniform(SOMA[0] - HALF, SOMA[0] + HALF)
    y = rng.uniform(APEX[1] + 22, BASE_Y - 10)
    if not in_soma((x, y), 6) or in_nucleus((x, y), 7): continue
    if any(math.dist((x, y), (m[0], m[1])) < 21 for m in mito): continue
    if any(math.dist((x, y), (n[0], n[1])) < 12 for n in nissl): continue
    mito.append((x, y, rng.uniform(0, math.pi), rng.uniform(8, 11)))
if not mito: raise SystemExit("no room for a mitochondrion: loosen the packing")

# ── the oligodendrocyte that lays the sheath down ──────────────────────────
OLIGO = (904, 880)
oligo_arms = []
for k, (a, b) in enumerate(internodes[2:]):
    mid, _ = at_frac(axon_pts, (a + b) / 2)
    bow = -34 if k == 0 else 30
    pts = smooth([OLIGO,
                  (OLIGO[0] - (OLIGO[0] - mid[0]) * 0.35, OLIGO[1] + bow * 0.5),
                  (OLIGO[0] - (OLIGO[0] - mid[0]) * 0.72, OLIGO[1] + bow),
                  (mid[0] + 10, mid[1])], 2)
    oligo_arms.append((pts, 3.6, 2.2))

# ── the structures, their accents and their words ──────────────────────────
PARTS = [
    ("apical", "Apical dendrite"), ("tuft", "Apical tuft"), ("oblique", "Oblique dendrites"),
    ("basal", "Basal dendrites"), ("spines", "Dendritic spines"), ("syn", "Excitatory synapse"),
    ("soma", "Cell body (soma)"), ("nucleus", "Nucleus"), ("nucleolus", "Nucleolus"),
    ("nissl", "Nissl bodies (rough ER)"), ("mito", "Mitochondria"), ("inhib", "Inhibitory terminals"),
    ("hillock", "Axon hillock"), ("initial", "Initial segment"), ("axon", "Axon"),
    ("myelin", "Myelin sheath"), ("node", "Node of Ranvier"), ("collateral", "Axon collateral"),
    ("oligo", "Oligodendrocyte"),
]
# Dealt round the wheel so that nothing touching anything else on the drawing
# lands near it in hue: the axon and its sheath furthest apart of all, then the
# hillock against the initial segment, the spines against what they stand on.
HUE_ORDER = ["apical", "myelin", "nissl", "initial", "soma", "syn", "mito", "nucleolus", "spines",
             "node", "nucleus", "oligo", "axon", "tuft", "hillock", "inhib", "oblique", "basal", "collateral"]
ACC = {pid: rainbow(HUE_ORDER.index(pid) / len(HUE_ORDER)) for pid, _ in PARTS}

TEXT = {
 "apical": ("the apical dendrite", "That is the apical dendrite",
   "The one thick dendrite that climbs from the peak of the cell body towards the surface of the cortex. It is what makes a cell pyramidal, and it lets one cell listen at two depths at once: the layers around its body, and layer I far above."),
 "tuft": ("the apical tuft", "That is the apical tuft",
   "Where the apical dendrite reaches the top layer it breaks into a spray of fine branches. These collect signals arriving from the thalamus and from other cortical areas, rather than from the cell's immediate neighbours."),
 "oblique": ("an oblique dendrite", "Those are the oblique dendrites",
   "Side branches leaving the apical trunk at an angle as it passes through the middle layers. Most of the traffic between one part of the cortex and another lands here."),
 "basal": ("the basal dendrites", "Those are the basal dendrites",
   "The skirt of dendrites spreading from the base of the cell body into the layer around it. Together with the obliques they carry the bulk of the cell's local input."),
 "spines": ("a dendritic spine", "That is a dendritic spine",
   "A tiny stalk with a head, standing out from the dendrite. Nearly every excitatory contact a pyramidal cell receives lands on one, and a single cell carries tens of thousands. They grow, shrink and disappear with experience, which is much of what learning looks like in a cortex."),
 "syn": ("the excitatory synapse", "That is the excitatory synapse",
   "A terminal from another cell resting on a spine head, with the cleft between the two. The spine keeps the chemistry of that one contact separate from its neighbours a micrometre away."),
 "soma": ("the cell body", "That is the cell body",
   "The pyramid the cell is named for: a peak drawn up into the apical dendrite, a flat base the basal dendrites leave from, and the axon departing beneath. It holds the nucleus and does the cell's housekeeping."),
 "nucleus": ("the nucleus", "That is the nucleus",
   "Holds the cell's DNA. In neurons it is large, round and pale, because much of the DNA is unpacked and in active use."),
 "nucleolus": ("the nucleolus", "That is the nucleolus",
   "The dense spot inside the nucleus where ribosomes are assembled. It is prominent in neurons because they make protein at a great rate."),
 "nissl": ("a Nissl body", "Those are the Nissl bodies",
   "Stacks of rough endoplasmic reticulum, studded with ribosomes. They take up the stain Franz Nissl introduced, which is how the layers of the cortex were first seen, and in a pyramidal cell they reach up into the base of the apical dendrite."),
 "mito": ("a mitochondrion", "Those are the mitochondria",
   "The cell's power supply. A pyramidal cell spends most of its energy pumping ions back across the membrane after each signal, so it keeps mitochondria wherever that work is done."),
 "inhib": ("an inhibitory terminal", "Those are the inhibitory terminals",
   "Terminals from local inhibitory cells, gathered around the cell body and the start of the axon. Sitting this close to where the signal is generated, a handful of them can veto everything the dendrites have collected."),
 "hillock": ("the axon hillock", "That is the axon hillock",
   "The cone where the axon leaves the cell body. It gathers what every dendrite has sent inward and hands it to the initial segment."),
 "initial": ("the initial segment", "That is the initial segment",
   "The short bare stretch just past the hillock, packed with sodium channels. This is where the signal is actually generated: the decision the whole cell has been building towards is made here."),
 "axon": ("the axon", "That is the axon",
   "The single fibre that carries the cell's output away, here down through the deep layers and into the white matter. A layer V pyramidal cell's axon may leave the cortex altogether, for the spinal cord or the brainstem. It is visible at the nodes; between them the sheath covers it."),
 "myelin": ("the myelin sheath", "That is the myelin sheath",
   "Wrapped insulation laid down in lengths along the axon. It stops the signal leaking out and forces it to jump from one gap to the next, which makes conduction both faster and cheaper."),
 "node": ("a node of Ranvier", "That is a node of Ranvier",
   "A bare gap between two lengths of sheath. The signal is rebuilt at each one and leaps to the next, so it travels by jumps rather than crawling the whole way."),
 "collateral": ("an axon collateral", "That is an axon collateral",
   "A branch that turns back into the cortex instead of leaving with the main axon. Through these a pyramidal cell speaks to its neighbours, and to itself, while its message also travels far away."),
 "oligo": ("the oligodendrocyte", "That is the oligodendrocyte",
   "The glial cell that lays down the myelin. One of them reaches out to several axons at once, wrapping a length of each, which is why the white matter is white."),
}

# ── where each label points, and where it sits ─────────────────────────────
def mid_of(branches):
    pts = max(branches, key=lambda b: arclen(b[0]))[0]
    return at_frac(pts, 0.55)[0]

NODE_MID = at_frac(axon_pts, (gaps[1][0] + gaps[1][1]) / 2)[0]
MYE_MID = at_frac(axon_pts, (internodes[1][0] + internodes[1][1]) / 2)[0]
ANCHOR = {
    "apical": at_frac(apical, 0.45)[0],
    "tuft": mid_of(tuft),
    "oblique": mid_of(oblique),
    "basal": max((at_frac(b[0], 0.55)[0] for b in basal if at_frac(b[0], 0.55)[0][0] > SOMA[0] + 40),
                 key=lambda p: p[0]),
    "spines": spine_heads[len(spine_heads) // 3],
    "syn": (SYN[0] + math.cos(SYN_ANG) * 9, SYN[1] + math.sin(SYN_ANG) * 9),
    "soma": (SOMA[0] + 34, SOMA[1] + 44),
    "nucleus": (NUC_C[0] - 20, NUC_C[1] - 12),
    "nucleolus": (NUC_C[0] + 9, NUC_C[1] - 5),
    # the organelle furthest from any terminal, so the label points at the
    # organelle rather than at whatever is drawn over it
    "nissl": max(((n[0], n[1]) for n in nissl), key=lambda p: min(math.dist(p, (x, y)) for x, y, _ in inhib)),
    "mito": max(((m[0], m[1]) for m in mito), key=lambda p: min(math.dist(p, (x, y)) for x, y, _ in inhib)),
    "inhib": (inhib[0][0], inhib[0][1]),
    "hillock": (SOMA[0] - 5, (HILL_TOP + HILL_END) / 2 + 4),
    "initial": (SOMA[0] + 2, (HILL_END + IS_END) / 2),
    "axon": at_frac(axon_pts, 0.965)[0],
    "myelin": MYE_MID,
    "node": NODE_MID,
    "collateral": mid_of(collateral),
    "oligo": OLIGO,
}
LABEL = {
    "apical": (398, 320), "tuft": (250, 60), "oblique": (846, 290), "basal": (912, 700),
    "spines": (222, 470), "syn": (176, 764), "soma": (760, 534), "nucleus": (398, 486),
    "nucleolus": (700, 470), "nissl": (742, 600), "mito": (386, 584), "inhib": (372, 646),
    "hillock": (330, 620), "initial": (318, 686), "axon": (742, 972), "myelin": (322, 790),
    "node": (742, 856), "collateral": (196, 902), "oligo": (1040, 920),
}

# ── the markup ─────────────────────────────────────────────────────────────
def g_open(cls, part=None, vis=None, extra=""):
    s = f'<g class="{cls}"'
    if vis: s += f' data-vis="{vis}" style="--acc:{ACC[vis]}"'
    if part: s += f' data-part="{part}"'
    return s + extra + ">"

def body_group(branches, pid):
    return g_open("mn-spn-body", vis=pid) + tube_layers(branches)[1] + "</g>"

def ink_of(branches):
    return tube_layers(branches)[0]

out = []
add = out.append

# defs: the soma, used four times over
add('<defs>')
add(f'<path id="pc-soma" d="{soma_path()}"/>')
add('</defs>')

# the cortical layers, context only
bands = []
for k, (name, y0, y1) in enumerate(LAYERS):
    if k % 2 == 0:
        bands.append(f'<rect class="mn-band" x="0" y="{f(y0)}" width="{W}" height="{f(y1 - y0)}"/>')
    bands.append(f'<line class="mn-band-line" x1="0" x2="{W}" y1="{f(y1)}" y2="{f(y1)}"/>')
    bands.append(f'<text class="mn-band-t" x="16" y="{f((y0 + y1) / 2)}" dominant-baseline="central">{name}</text>')
add(g_open("mn-bands", extra=' aria-hidden="true"') + "".join(bands) + "</g>")
add(f'<text class="mn-band-t mn-band-edge" x="{W - 16}" y="40" text-anchor="end">pia</text>')

# the oligodendrocyte, behind the axon it wraps
oli = g_open("mn-spn-ink") + ink_of(oligo_arms) + "</g>"
oli += g_open("mn-spn-body") + tube_layers(oligo_arms)[1] + "</g>"
oli += f'<ellipse class="mn-of" cx="{f(OLIGO[0])}" cy="{f(OLIGO[1])}" rx="17" ry="14"/>'
oli += f'<ellipse class="mn-oli-nuc" cx="{f(OLIGO[0])}" cy="{f(OLIGO[1])}" rx="8.5" ry="7"/>'
add(g_open("mn-oligo", part="oligo", vis="oligo") + oli + "</g>")

# ── the ink pass: everything that is one continuous cell, underneath ──
ink = "".join(ink_of(b) for b in (apical_b, tuft, oblique, basal, hillock_b, initial_b, axon_b, collateral))
ink += '<path stroke-width="5.4" d="' + "".join("M" + P(a) + "L" + P(b) for a, b in spine_stalks) + '"/>'
ink += '<path stroke-width="9.2" d="' + "".join("M" + P(p) + "h.01" for p in spine_heads) + '"/>'
add(g_open("mn-spn-ink") + ink + "</g>")
add('<use href="#pc-soma" class="mn-ink"/>')

# ── the body pass, each structure its own group so it can be recoloured ──
add(body_group(apical_b, "apical"))
add(body_group(tuft, "tuft"))
add(body_group(oblique, "oblique"))
add(body_group(basal, "basal"))
add(body_group(hillock_b, "hillock"))
add(body_group(initial_b, "initial"))
add(body_group(axon_b, "axon"))
add(body_group(collateral, "collateral"))
add(g_open("mn-spn-body", vis="spines") +
    '<path stroke-width="2.2" d="' + "".join("M" + P(a) + "L" + P(b) for a, b in spine_stalks) + '"/>' +
    '<path stroke-width="6" d="' + "".join("M" + P(p) + "h.01" for p in spine_heads) + '"/>' + "</g>")
add('<use href="#pc-soma" class="mn-body"/>')
add(f'<use href="#pc-soma" class="mn-tint" data-vis="soma" style="--acc:{ACC["soma"]}"/>')

# ── inside the cell body ──
nis = "".join(f'<g transform="translate({f(x)} {f(y)}) rotate({f(math.degrees(a))})">'
              f'<rect class="mn-of" x="{f(-w)}" y="{f(-h2)}" width="{f(2 * w)}" height="{f(2 * h2)}" rx="{f(h2 * 0.8)}"/>'
              f'<path class="mn-ol" d="M{f(-w + 2)} {f(-h2 / 2)}h{f(2 * w - 4)}M{f(-w + 2)} {f(h2 / 2)}h{f(2 * w - 4)}"/></g>'
              for x, y, a, w, h2 in nissl)
add(g_open("mn-nissl", part="nissl", vis="nissl") + nis + "</g>")

mit = "".join(f'<g transform="translate({f(x)} {f(y)}) rotate({f(math.degrees(a))})">'
              f'<rect class="mn-of" x="{f(-w / 2)}" y="-4" width="{f(w)}" height="8" rx="4"/>'
              f'<path class="mn-ol" d="' + "".join(f"M{f(-w / 2 + 3 + i * 3.4)} -3.2l2.2 3.2l-2.2 3.2" for i in range(int(w / 3.4) - 1)) + '"/></g>'
              for x, y, a, w in mito)
add(g_open("mn-mito", part="mito", vis="mito") + mit + "</g>")

nuc = (f'<ellipse class="mn-of" cx="{f(NUC_C[0])}" cy="{f(NUC_C[1])}" rx="{f(NUC_R[0])}" ry="{f(NUC_R[1])}"/>'
       f'<ellipse class="mn-env" cx="{f(NUC_C[0])}" cy="{f(NUC_C[1])}" rx="{f(NUC_R[0] - 2.6)}" ry="{f(NUC_R[1] - 2.6)}"/>')
chrom = []
for _ in range(34):
    a, rr = rng.uniform(0, 2 * math.pi), math.sqrt(rng.random()) * 0.82
    chrom.append((NUC_C[0] + math.cos(a) * NUC_R[0] * rr, NUC_C[1] + math.sin(a) * NUC_R[1] * rr))
nuc += '<path class="mn-dots mn-chromatin" d="' + "".join("M" + P(p) + "h.01" for p in chrom) + '"/>'
add(g_open("mn-nucleus", part="nucleus", vis="nucleus") + nuc + "</g>")
add(g_open("mn-nucleolus", part="nucleolus", vis="nucleolus") +
    f'<circle class="mn-of" cx="{f(NUC_C[0] + 11)}" cy="{f(NUC_C[1] - 3)}" r="9.5"/>' +
    f'<circle class="mn-glint" cx="{f(NUC_C[0] + 8)}" cy="{f(NUC_C[1] - 6)}" r="3"/></g>')

# ── what can be clicked, the wide regions first ──
# A click resolves to the last thing drawn under it, so the big structures
# put their targets down here and everything small is drawn afterwards and
# keeps its own clicks.
for branches, pid in ((apical_b, "apical"), (tuft, "tuft"), (oblique, "oblique"),
                      (basal, "basal"), (collateral, "collateral")):
    add(hit_layer(branches, pid))
add(hit_layer(axon_b, "axon", pad=6))
add(g_open("mn-spn-hit", part="spines") +
    f'<path stroke-width="8" d="{spine_hit_path(spine_stalks)}"/></g>')
# the hillock and the initial segment are narrow and stand under the basal
# skirt, so their targets go down after the spines rather than before
add(hit_layer(hillock_b, "hillock", pad=4))
add(hit_layer(initial_b, "initial", pad=4))
add('<use href="#pc-soma" class="mn-hit" data-part="soma"/>')

# ── inside the cell body, drawn over the soma's own target ──
nis = "".join(f'<g transform="translate({f(x)} {f(y)}) rotate({f(math.degrees(a))})">'
              f'<rect class="mn-of" x="{f(-w)}" y="{f(-h2)}" width="{f(2 * w)}" height="{f(2 * h2)}" rx="{f(h2 * 0.8)}"/>'
              f'<path class="mn-ol" d="M{f(-w + 2)} {f(-h2 / 2)}h{f(2 * w - 4)}M{f(-w + 2)} {f(h2 / 2)}h{f(2 * w - 4)}"/></g>'
              for x, y, a, w, h2 in nissl)
add(g_open("mn-nissl", part="nissl", vis="nissl") + nis + "</g>")

mit = "".join(f'<g transform="translate({f(x)} {f(y)}) rotate({f(math.degrees(a))})">'
              f'<rect class="mn-of" x="{f(-w / 2)}" y="-4" width="{f(w)}" height="8" rx="4"/>'
              f'<path class="mn-ol" d="' + "".join(f"M{f(-w / 2 + 3 + i * 3.4)} -3.2l2.2 3.2l-2.2 3.2" for i in range(int(w / 3.4) - 1)) + '"/></g>'
              for x, y, a, w in mito)
add(g_open("mn-mito", part="mito", vis="mito") + mit + "</g>")

nuc = (f'<ellipse class="mn-of" cx="{f(NUC_C[0])}" cy="{f(NUC_C[1])}" rx="{f(NUC_R[0])}" ry="{f(NUC_R[1])}"/>'
       f'<ellipse class="mn-env" cx="{f(NUC_C[0])}" cy="{f(NUC_C[1])}" rx="{f(NUC_R[0] - 2.6)}" ry="{f(NUC_R[1] - 2.6)}"/>')
chrom = []
for _ in range(34):
    a, rr = rng.uniform(0, 2 * math.pi), math.sqrt(rng.random()) * 0.82
    chrom.append((NUC_C[0] + math.cos(a) * NUC_R[0] * rr, NUC_C[1] + math.sin(a) * NUC_R[1] * rr))
nuc += '<path class="mn-dots mn-chromatin" d="' + "".join("M" + P(p) + "h.01" for p in chrom) + '"/>'
add(g_open("mn-nucleus", part="nucleus", vis="nucleus") + nuc + "</g>")
add(g_open("mn-nucleolus", part="nucleolus", vis="nucleolus") +
    f'<circle class="mn-of" cx="{f(NUC_C[0] + 11)}" cy="{f(NUC_C[1] - 3)}" r="9.5"/>' +
    f'<circle class="mn-glint" cx="{f(NUC_C[0] + 8)}" cy="{f(NUC_C[1] - 6)}" r="3"/></g>')

# ── the sheath over the axon, and the bare gaps left between its lengths ──
mye_ink, mye_body = tube_layers(myelin_b, ink_extra=2.4)
add(hit_layer(myelin_b, "myelin", pad=10, cap="butt"))
add(g_open("mn-myelin", part="myelin", vis="myelin") +
    g_open("mn-spn-ink") + mye_ink + "</g>" +
    g_open("mn-mye-body") + mye_body + "</g>" + "</g>")
node_ink, node_body = tube_layers(node_b, ink_extra=3.2)
add(hit_layer(node_b, "node", pad=16))
add(g_open("mn-spn-ink") + node_ink + "</g>")
add(g_open("mn-node", part="node", vis="node") +
    g_open("mn-spn-body") + node_body + "</g>" +
    "".join(f'<path class="mn-node-mark" d="M{P(b[0][0])}L{P(b[0][-1])}"/>' for b in node_b) + "</g>")

# ── the terminals that land on the cell, drawn last so they take their own ──
def bouton(p, ang, cls, r=7.4):
    x = p[0] + math.cos(ang) * r * 0.2; y = p[1] + math.sin(ang) * r * 0.2
    return (f'<g transform="translate({f(x)} {f(y)}) rotate({f(math.degrees(ang))})">'
            f'<ellipse class="mn-fillcell {cls}" rx="{f(r * 1.25)}" ry="{f(r)}"/>'
            f'<path class="mn-ves" d="M-2 -2a1.8 1.8 0 1 0 .1 0M2.6 1.4a1.8 1.8 0 1 0 .1 0M-3.4 2.2a1.8 1.8 0 1 0 .1 0"/></g>')

inh = "".join(bouton((x, y), a, "mn-inhib-b", 6.6) for x, y, a in inhib)
inh += "".join(f'<path class="mn-psd" d="M{f(x - math.sin(a) * 5)} {f(y + math.cos(a) * 5)}L{f(x + math.sin(a) * 5)} {f(y - math.cos(a) * 5)}"/>'
               for x, y, a in inhib)
add(g_open("mn-inhib", part="inhib", vis="inhib") + inh + "</g>")

syn_out = (SYN[0] + math.cos(SYN_ANG) * 11.5, SYN[1] + math.sin(SYN_ANG) * 11.5)
syn = bouton(syn_out, SYN_ANG + math.pi, "mn-exc-b", 7.6)
syn += (f'<path class="mn-psd" d="M{f(SYN[0] - math.sin(SYN_ANG) * 4.4)} {f(SYN[1] + math.cos(SYN_ANG) * 4.4)}'
        f'L{f(SYN[0] + math.sin(SYN_ANG) * 4.4)} {f(SYN[1] - math.cos(SYN_ANG) * 4.4)}"/>')
add(g_open("mn-exc", part="syn", vis="syn") + syn + "</g>")
add(f'<circle class="mn-pad" data-part="syn" cx="{f(syn_out[0])}" cy="{f(syn_out[1])}" r="13"/>')

add('<g id="mn-callout" class="mn-callout" aria-hidden="true"></g>')

svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" role="group" '
       'aria-label="Layer V pyramidal cell of the cerebral cortex, with its apical dendrite, basal dendrites and myelinated axon">'
       '<!-- An original drawing of a layer V pyramidal cell, generated from code by scripts/cells/pyramidal-neuron. '
       'Every structure that can be clicked carries data-part; what recolours carries data-vis. Painted by the page that loads it. -->'
       % (W, H)) + "".join(out) + "</svg>\n"

parts = []
for pid, name in PARTS:
    find, that, desc = TEXT[pid]
    parts.append({"id": pid, "name": name, "acc": ACC[pid],
                  "anchor": [round(ANCHOR[pid][0], 1), round(ANCHOR[pid][1], 1)],
                  "label": list(LABEL[pid]), "find": find, "that": that, "desc": desc})
NOTE = ("A schematic, not to scale: the organelles are drawn larger and far fewer than in a real "
        "cell, a real one carries tens of thousands of spines rather than the two thousand here, "
        "and the bands behind the cell are the cortical layers, marked to show how far it reaches.")
doc = {"cell": "pyramidal-neuron", "name": "Pyramidal cell", "box": [W, H], "note": NOTE,
       "centre": [SOMA[0], SOMA[1] - 10], "parts": parts}

here = os.path.dirname(os.path.abspath(__file__))
out_dir = os.path.normpath(os.path.join(here, "..", "..", "..", "site", "assets", "cells"))
os.makedirs(out_dir, exist_ok=True)
with open(os.path.join(out_dir, "pyramidal-neuron.svg"), "w", encoding="utf-8") as fh:
    fh.write(svg)
with open(os.path.join(out_dir, "pyramidal-neuron.json"), "w", encoding="utf-8") as fh:
    fh.write(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
print("wrote pyramidal-neuron.svg", len(svg), "bytes, and pyramidal-neuron.json with", len(parts), "parts")
print("   branches:", sum(len(b) for b in (apical_b, tuft, oblique, basal, collateral, axon_b)),
      "· spines:", len(spine_heads), "· nissl:", len(nissl), "· mito:", len(mito))
