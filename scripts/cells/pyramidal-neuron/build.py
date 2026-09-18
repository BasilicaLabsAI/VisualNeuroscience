"""Build the layer V pyramidal cell for the Microanatomy page.

usage: python3 build.py [seed]      (default seed 7)

Writes the two files site/assets/cells.js fetches:

  site/assets/cells/pyramidal-neuron.svg   the drawing, click targets marked
  site/assets/cells/pyramidal-neuron.json  the structures, with their text

The drawing is original and generated, not traced: the arbor is grown from a
seeded random walk inside a set of rules about where a pyramidal cell sends
its branches, and the same seed gives the same cell every time. Standard
library only, so it runs anywhere python3 does.

How it is grown. Every branch is tried against everything already placed
and thrown away if it would run through a neighbour, the cell body or the
axon; a branch that finds no room is shortened until it does. That is what
keeps the basal skirt a skirt rather than a tangle. Spines are then set out
along each dendrite at spaced intervals, and one is dropped wherever its
head would land on another branch or another spine.

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
PIA = 38                       # nothing grows above this
WM = 780                       # dendrites stay above the white matter

SOMA = (560.0, 556.0)          # centre of the cell body
APEX = (560.0, 468.0)          # where the apical dendrite leaves it
BASE_Y = 634.0                 # the flat base of the pyramid
HALF = 80.0                    # half the width of that base

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

def walk(rng, start, ang, length, drift=0.10, step=8.0, relax=0.0, centre=None):
    """A branch: a step at a time, the heading wandering a little each step
    and, when asked, easing back towards straight out from a centre, which
    is what makes a set of branches read as a fan."""
    pts, p, a = [start], start, ang
    n = max(2, int(round(length / step)))
    for _ in range(n):
        a += rng.uniform(-drift, drift)
        if relax and centre is not None:
            want = math.atan2(p[1] - centre[1], p[0] - centre[0])
            a += relax * ((want - a + math.pi) % (2 * math.pi) - math.pi)
        p = (p[0] + math.cos(a) * step, p[1] + math.sin(a) * step)
        pts.append(p)
    return smooth(pts), a

def bez(p0, p1, p2, p3, n=14):
    out = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        out.append((u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
                    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]))
    return out

def arclen(pts):
    return sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))

def at_len(pts, s):
    """The point a distance s along a centreline, and the heading there."""
    run = 0.0
    for i in range(len(pts) - 1):
        d = math.dist(pts[i], pts[i + 1])
        if run + d >= s or i == len(pts) - 2:
            k = 0 if d == 0 else min(1.0, max(0.0, (s - run) / d))
            p = (pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k,
                 pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k)
            return p, math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0])
        run += d
    return pts[-1], 0.0

def at_frac(pts, t):
    return at_len(pts, arclen(pts) * t)

def radius_at(b, s):
    pts, r0, r1 = b
    return r0 + (r1 - r0) * s / (arclen(pts) or 1.0)

# ── what has been placed, so the next branch can keep clear of it ──────────
class Field:
    """Every centreline point so far, bucketed on a grid, so a candidate is
    checked against its neighbours rather than against the whole cell."""
    CELL = 40.0

    def __init__(self):
        self.cells = {}
        self.count = 0
        self.ids = {}                      # id(centreline) -> branch id

    def key(self, p):
        return (int(p[0] // self.CELL), int(p[1] // self.CELL))

    def add(self, pts, r0, r1, bid=None):
        if bid is None:
            self.count += 1; bid = self.count
        self.ids[id(pts)] = bid
        total = arclen(pts) or 1.0; run = 0.0
        for i, p in enumerate(pts):
            if i: run += math.dist(pts[i - 1], p)
            self.cells.setdefault(self.key(p), []).append((p[0], p[1], r0 + (r1 - r0) * run / total, bid))
        return bid

    def near(self, p, reach):
        kx, ky = self.key(p); n = int(reach // self.CELL) + 1
        for dx in range(-n, n + 1):
            for dy in range(-n, n + 1):
                for q in self.cells.get((kx + dx, ky + dy), ()):
                    yield q

    def clear(self, pts, r0, r1, skip=24.0, gap=12.0):
        """True when the candidate, past its first few steps, stays a gap
        clear of everything placed. What sits at the junction it leaves
        from is its own parent and siblings, and is not counted."""
        total = arclen(pts) or 1.0; run = 0.0; start = pts[0]
        for i, p in enumerate(pts):
            if i: run += math.dist(pts[i - 1], p)
            if run < skip: continue
            r = r0 + (r1 - r0) * run / total
            for x, y, rq, _ in self.near(p, r + gap + 16):
                if math.dist((x, y), start) < skip + 16: continue
                if math.dist(p, (x, y)) < r + rq + gap: return False
        return True

    def touching(self, p, pad, ignore=None):
        for x, y, rq, bid in self.near(p, pad + 16):
            if bid != ignore and math.dist(p, (x, y)) < rq + pad: return True
        return False

def place(rng, field, start, ang, length, r0, r1, drift, relax, centre, keep, tries=36, min_len=28):
    """Walk from start until a branch lands clear of everything placed,
    shortening the branch when nothing at that length fits. The first few
    steps are not held to the keep rule: a basal dendrite starts on the
    wall of the body it must otherwise stay away from."""
    L = length
    while L >= min_len:
        for t in range(tries):
            jitter = rng.uniform(-0.3, 0.3) * min(1.0, t / 10) if t else 0.0
            pts, end = walk(rng, start, ang + jitter, L, drift, relax=relax, centre=centre)
            if all(keep(p) for p in pts[3:]) and field.clear(pts, r0, r1):
                return pts, end
        L *= 0.72
    return None, None

def grow(rng, field, start, ang, length, r0, r1, depth, spread, shrink=0.66, drift=0.12,
         relax=0.0, centre=None, keep=lambda p: True):
    """A branch and everything that grows out of its end."""
    pts, end = place(rng, field, start, ang, length, r0, r1, drift, relax, centre, keep)
    if pts is None:
        return [], []
    field.add(pts, r0, r1)
    out = [(pts, r0, r1)]
    if depth <= 0:
        return out, [(pts, r0, r1)]
    tips = []
    kids = 2 if rng.random() < 0.84 else 3
    for k in range(kids):
        off = (k - (kids - 1) / 2) * spread * rng.uniform(0.8, 1.25)
        sub, sub_tips = grow(rng, field, pts[-1], end + off, length * rng.uniform(0.58, 0.84),
                             r1, max(0.9, r1 * shrink), depth - 1, spread * 0.86, shrink, drift, relax, centre, keep)
        out += sub; tips += sub_tips
    return out, tips or [(pts, r0, r1)]

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

def tube_layers(branches, ink_extra=3.2, cap=None):
    """The two passes: ink underneath, the cell's own colour on top. Stroke is
    an inherited property, so the paths carry only their width and take their
    colour from whichever classed group they sit in. A square cap is for a
    run that must end exactly where it ends, like a length of sheath."""
    rr = runs(branches)
    c = f' stroke-linecap="{cap}"' if cap else ""
    ink = "".join(f'<path stroke-width="{f(w * 2 + ink_extra)}"{c} d="{d}"/>' for w, d in rr)
    body = "".join(f'<path stroke-width="{f(w * 2)}"{c} d="{d}"/>' for w, d in rr)
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

def dots(points, w):
    return f'<path stroke-width="{f(w)}" d="' + "".join("M" + P(p) + "h.01" for p in points) + '"/>'

# ── the soma ───────────────────────────────────────────────────────────────
# The pyramid the cell is named for: a peak drawn up into the apical dendrite,
# a flat base, and corners the basal dendrites leave from.
def soma_curves():
    ax, ay = APEX
    lx, rx = SOMA[0] - HALF, SOMA[0] + HALF
    return [
        ((ax - 11, ay + 3), (ax - 36, ay + 40), (lx - 10, BASE_Y - 80), (lx - 4, BASE_Y - 22)),
        ((lx - 4, BASE_Y - 22), (lx - 3, BASE_Y - 6), (lx + 6, BASE_Y), (lx + 20, BASE_Y + 1)),
        ((lx + 20, BASE_Y + 1), (SOMA[0], BASE_Y + 1), (SOMA[0], BASE_Y + 1), (rx - 20, BASE_Y + 1)),
        ((rx - 20, BASE_Y + 1), (rx - 6, BASE_Y), (rx + 3, BASE_Y - 6), (rx + 4, BASE_Y - 22)),
        ((rx + 4, BASE_Y - 22), (rx + 10, BASE_Y - 80), (ax + 36, ay + 40), (ax + 11, ay + 3)),
    ]

def soma_path():
    cs = soma_curves()
    return "M" + P(cs[0][0]) + "".join(f"C{P(b)} {P(c)} {P(d)}" for a, b, c, d in cs) + "Z"

SOMA_PTS = []
for a, b, c, d in soma_curves():
    SOMA_PTS += bez(a, b, c, d, 16)[:-1]

def inside_soma(p):
    x, y = p; n = len(SOMA_PTS); hit = False
    for i in range(n):
        x1, y1 = SOMA_PTS[i]; x2, y2 = SOMA_PTS[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            hit = not hit
    return hit

def near_soma(p, m):
    """Inside the cell body, or within m of its wall."""
    if not (SOMA[0] - HALF - m - 12 < p[0] < SOMA[0] + HALF + m + 12 and APEX[1] - m < p[1] < BASE_Y + m + 4):
        return False
    return inside_soma(p) or min(math.dist(p, q) for q in SOMA_PTS) < m

def wall_at(ang):
    """The point on the cell wall in a given direction from the centre, and
    the outward direction there."""
    q = min(SOMA_PTS, key=lambda q: abs((math.atan2(q[1] - SOMA[1], q[0] - SOMA[0]) - ang + math.pi) % (2 * math.pi) - math.pi))
    return q, math.atan2(q[1] - SOMA[1], q[0] - SOMA[0])

# ── growing the cell ───────────────────────────────────────────────────────
rng = random.Random(SEED)
UP = -math.pi / 2
field = Field()
in_frame = lambda p: 30 < p[0] < W - 30 and PIA < p[1] < H - 14

# The apical trunk: one thick dendrite straight up through the layers. It is
# the cell's defining feature and the reason the cortex has its layered look.
apical, _ = walk(rng, APEX, UP + 0.02, 322, drift=0.03, step=8)
apical = [(x + math.sin(y / 90.0) * 2.4, y) for x, y in apical]
APICAL_TOP = apical[-1]
apical_b = [(apical, 10.5, 5.6)]
field.add(apical, 10.5, 5.6)

# ── the axon, out through the white matter ─────────────────────────────────
HILL_TOP, HILL_END = BASE_Y - 10, BASE_Y + 36          # the hillock's cone
IS_END = HILL_END + 72                                 # the initial segment
hillock_b = [([(SOMA[0], HILL_TOP), (SOMA[0] + 1, HILL_END)], 15.0, 7.2)]
initial_b = [([(SOMA[0] + 1, HILL_END), (SOMA[0] + 2.5, IS_END)], 7.2, 6.0)]

axon_pts, _ = walk(rng, (SOMA[0] + 2.5, IS_END), math.pi / 2 + 0.03, H - IS_END - 6, drift=0.025, step=10)
axon_b = [(axon_pts, 6.0, 5.0)]
AXON_LEN = arclen(axon_pts)

# the body and the axon are in the field before any dendrite grows, so no
# dendrite is drawn through either
for a, b, c, d in soma_curves():
    field.add(bez(a, b, c, d, 10), 1.5, 1.5, bid=-1)
field.add(hillock_b[0][0], 15.0, 7.2, bid=-2)
field.add(initial_b[0][0], 7.2, 6.0, bid=-2)
field.add(axon_pts, 6.0, 5.0, bid=-2)

# The tuft: where the trunk reaches layer I it breaks into a spray of thin
# branches that spread sideways under the pia.
tuft, tuft_tips = [], []
for a in (-1.3, -0.8, -0.3, 0.3, 0.8, 1.3):
    br, tips = grow(rng, field, APICAL_TOP, UP + a * 1.1, 82 * rng.uniform(0.86, 1.2), 5.6, 3.8, 2, 0.9,
                    shrink=0.7, drift=0.13, relax=0.06, centre=APICAL_TOP, keep=in_frame)
    tuft += br; tuft_tips += tips

# Oblique dendrites: side branches off the trunk, the cell's ears in the
# middle layers, where most of the cortex's own traffic arrives.
oblique, oblique_tips = [], []
for t, side in ((0.16, 1), (0.30, -1), (0.45, 1), (0.58, -1), (0.72, 1), (0.85, -1)):
    p, _ = at_frac(apical, t)
    a = UP + side * rng.uniform(1.12, 1.38)
    br, tips = grow(rng, field, p, a, rng.uniform(120, 170), 4.6, 2.8, 1, 0.62,
                    shrink=0.72, drift=0.12, keep=in_frame)
    oblique += br; oblique_tips += tips

# The basal skirt: trunks off the base and lower corners of the pyramid,
# fanning down and out into the same layer the body sits in.
basal, basal_tips = [], []
basal_starts = []
keep_basal = lambda p: in_frame(p) and p[1] < WM and not near_soma(p, 10)
for a in (2.62, 2.34, 2.06, 1.8, 1.34, 1.08, 0.8, 0.52):
    start, out_ang = wall_at(a)
    basal_starts.append(start)
    br, tips = grow(rng, field, start, a + rng.uniform(-0.1, 0.1), rng.uniform(104, 146), 7.0, 4.2, 2, 0.72,
                    shrink=0.7, drift=0.12, relax=0.04, centre=SOMA, keep=keep_basal)
    basal += br; basal_tips += tips

# ── the sheath, and the collateral given off before it starts ──────────────
# Internodes of myelin with a bare node of Ranvier between each pair, which
# is what lets the signal jump rather than crawl. Each length of sheath is
# drawn thinning at both ends, the way the wraps peel off at a paranode.
INTERNODES = [(0.10, 0.34), (0.40, 0.64), (0.70, 0.94)]
GAPS = [(0.34, 0.40), (0.64, 0.70)]
MYE_R, PARA_R = 9.0, 6.0

def slice_between(pts, t0, t1, n=12):
    return [at_frac(pts, t0 + (t1 - t0) * k / n)[0] for k in range(n + 1)]

myelin_b = []
for a, b in INTERNODES:
    e = 0.028                                   # the paranodal taper, as a fraction of the axon
    myelin_b += [(slice_between(axon_pts, a, a + e, 4), PARA_R, MYE_R),
                 (slice_between(axon_pts, a + e, b - e), MYE_R, MYE_R),
                 (slice_between(axon_pts, b - e, b, 4), MYE_R, PARA_R)]
node_b = [(slice_between(axon_pts, a, b, 4), 5.6, 5.6) for a, b in GAPS]

# A recurrent collateral: the branch that turns back into the cortex and
# talks to the cell's neighbours, given off on the bare stretch of axon
# before the sheath begins.
col_start, _ = at_frac(axon_pts, 0.045)
keep_col = lambda p: in_frame(p) and p[1] < WM + 10 and p[0] < SOMA[0] - 12 and not near_soma(p, 12)
collateral, col_tips = grow(rng, field, col_start, math.pi * 0.84, 84, 3.4, 2.8, 0, 0.0, drift=0.08, keep=keep_col)
if collateral:
    col_up, up_tips = grow(rng, field, collateral[0][0][-1], -math.pi * 0.7, 150, 2.8, 2.0, 1, 0.62,
                           shrink=0.74, drift=0.12, keep=keep_col)
    collateral += col_up; col_tips = up_tips or col_tips
col_boutons = [b[0][-1] for b in col_tips]

# ── the oligodendrocyte that lays the sheath down ──────────────────────────
OLIGO = (748.0, 842.0)
oligo_arms = []
for k, (a, b) in enumerate(INTERNODES):
    mid, _ = at_frac(axon_pts, (a + b) / 2)
    end = (mid[0] + MYE_R + 1.5, mid[1])
    bow = (-26, 18, 34)[k]
    pts = smooth([OLIGO,
                  (OLIGO[0] - (OLIGO[0] - end[0]) * 0.35, OLIGO[1] + (end[1] - OLIGO[1]) * 0.3 + bow * 0.5),
                  (OLIGO[0] - (OLIGO[0] - end[0]) * 0.72, OLIGO[1] + (end[1] - OLIGO[1]) * 0.7 + bow),
                  end], 2)
    oligo_arms.append((pts, 4.2, 2.4))
for ang, ln in ((-0.22, 120), (0.55, 96)):        # processes reaching other axons, out of frame
    pts, _ = walk(rng, OLIGO, ang, ln, drift=0.09, step=8)
    oligo_arms.append((pts, 3.8, 1.4))

# ── spines, and the synapse that sits on one ───────────────────────────────
# Pyramidal cells are the spiny cell of the cortex: nearly every excitatory
# contact they receive lands on a spine rather than on the shaft. Three
# shapes, as in the multipolar cell: thin, mushroom and stubby.
HEAD = {0: 1.3, 1: 2.5, 2: 1.8}                   # head radius by kind
tip_grid = {}
def tip_free(p, d=5.6):
    kx, ky = int(p[0] // 12), int(p[1] // 12)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for q in tip_grid.get((kx + dx, ky + dy), ()):
                if math.dist(p, q) < d: return False
    return True

def spines_on(branches, group, skip=14.0, spacing=(7.0, 15.0), r_max=6.6):
    out = []
    for b in branches:
        pts, r0, r1 = b
        total = arclen(pts); bid = field.ids.get(id(pts))
        for side in (1, -1):
            s = skip + rng.uniform(0, spacing[1])
            while s < total - 4:
                p, a = at_len(pts, s); r = radius_at(b, s)
                if r <= r_max and in_frame(p) and not near_soma(p, 16):
                    th = a + side * math.pi / 2 + rng.gauss(0, 0.3)
                    kind = rng.choices([0, 1, 2], weights=[0.32, 0.44, 0.24])[0]
                    ln = {0: rng.uniform(5.0, 8.6), 1: rng.uniform(4.4, 7.0), 2: rng.uniform(2.4, 3.8)}[kind]
                    base = (p[0] + math.cos(th) * (r - 1.0), p[1] + math.sin(th) * (r - 1.0))
                    tip = (base[0] + math.cos(th) * ln, base[1] + math.sin(th) * ln)
                    if tip_free(tip) and not field.touching(tip, HEAD[kind] + 2.0, ignore=bid) \
                            and not field.touching(((base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2), 2.2, ignore=bid):
                        out.append((base, tip, kind, group, th))
                        tip_grid.setdefault((int(tip[0] // 12), int(tip[1] // 12)), []).append(tip)
                s += rng.uniform(*spacing)
    return out

spines = []
spines += spines_on(oblique, "oblique")
spines += spines_on(basal, "basal")
spines += spines_on(tuft, "tuft", spacing=(8.0, 17.0))
spines += spines_on(apical_b, "apical", skip=44, spacing=(14.0, 30.0), r_max=11)
spine_stalks = [(b, t) for b, t, k, g, th in spines]
spine_heads = {k: [t for b, t, kk, g, th in spines if kk == k] for k in HEAD}

# the one spine drawn with a terminal on it, so the contact itself can be
# seen: a mushroom spine on the basal skirt with room round its head
def syn_room(sp):
    b, t, k, g, th = sp
    c = (t[0] + math.cos(th) * 12, t[1] + math.sin(th) * 12)
    return k == 1 and g == "basal" and not field.touching(c, 12) and tip_free(c, 11.5) and in_frame(c)
SYN_SP = min((sp for sp in spines if syn_room(sp)), key=lambda sp: math.dist(sp[1], (300, 700)))
SYN, SYN_ANG = SYN_SP[1], SYN_SP[4]

# inhibitory terminals: the basket-cell contacts that ring a pyramidal soma,
# and the pair that sits on the start of the axon
inhib = []
for a in (-2.55, 2.95, 2.3, -0.55, 0.2, 0.85):
    q, n = wall_at(a)
    if min(math.dist(q, s) for s in basal_starts) < 19:
        continue
    inhib.append((q[0] + math.cos(n) * 1.5, q[1] + math.sin(n) * 1.5, n))
for k, side in ((16, -1), (44, 1)):
    inhib.append((SOMA[0] + 1 + side * 7.0, HILL_END + k, math.pi if side < 0 else 0.0))

# ── organelles ─────────────────────────────────────────────────────────────
NUC_C = (SOMA[0] - 1, SOMA[1] + 6)
NUC_R = (33, 30)

def in_nucleus(p, pad=0.0):
    return ((p[0] - NUC_C[0]) / (NUC_R[0] + pad)) ** 2 + ((p[1] - NUC_C[1]) / (NUC_R[1] + pad)) ** 2 < 1

def in_cytoplasm(p, pad):
    """Inside the cell body but clear of its wall, the nucleus and the
    Nissl-free cone above the hillock."""
    if not inside_soma(p) or min(math.dist(p, q) for q in SOMA_PTS) < pad: return False
    if in_nucleus(p, pad): return False
    if p[1] > BASE_Y - 36 and abs(p[0] - SOMA[0]) < 24: return False
    return True

# Nissl bodies: the stacked rough ER that makes a neuron stain in blocks, and
# which in a pyramidal cell reaches up into the apical dendrite.
nissl = []
tries = 0
while len(nissl) < 21 and tries < 8000:
    tries += 1
    x = rng.uniform(SOMA[0] - HALF, SOMA[0] + HALF)
    y = rng.uniform(APEX[1] + 10, BASE_Y - 8)
    if not in_cytoplasm((x, y), 7): continue
    if any(math.dist((x, y), (n[0], n[1])) < 17 for n in nissl): continue
    nissl.append((x, y, rng.uniform(0, math.pi), rng.uniform(7.5, 12.0), rng.uniform(3.0, 4.4)))
for k in range(4):                      # a few carried up into the base of the trunk
    p, a = at_frac(apical, 0.03 + k * 0.045)
    r = radius_at(apical_b[0], arclen(apical) * (0.03 + k * 0.045))
    nissl.append((p[0] + rng.uniform(-1.5, 1.5), p[1], a, min(7.0, r * 0.9), min(2.6, r * 0.32)))

mito = []
tries = 0
while len(mito) < 8 and tries < 9000:
    tries += 1
    x = rng.uniform(SOMA[0] - HALF, SOMA[0] + HALF)
    y = rng.uniform(APEX[1] + 14, BASE_Y - 8)
    if not in_cytoplasm((x, y), 6): continue
    if any(math.dist((x, y), (m[0], m[1])) < 20 for m in mito): continue
    if any(math.dist((x, y), (n[0], n[1])) < 13 for n in nissl): continue
    mito.append((x, y, rng.uniform(0, math.pi), rng.uniform(8, 11)))
if not mito: raise SystemExit("no room for a mitochondrion: loosen the packing")

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

def clearest_in_soma():
    """The point of cytoplasm furthest from anything drawn in it, so the
    body's label points at the body and not at an organelle."""
    things = [(n[0], n[1]) for n in nissl] + [(m[0], m[1]) for m in mito]
    best, score = SOMA, -1
    for x in range(int(SOMA[0] - HALF), int(SOMA[0] + HALF), 3):
        for y in range(int(APEX[1] + 10), int(BASE_Y), 3):
            if not in_cytoplasm((x, y), 9): continue
            d = min(min(math.dist((x, y), t) for t in things), min(math.dist((x, y), q) for q in SOMA_PTS) - 4)
            if d > score: best, score = (x, y), d
    return best

def basal_anchor():
    """A point on the skirt's longest branch to the right of the body, at a
    spot where no spine stands."""
    pts = max((b for b in basal if b[0][-1][0] > SOMA[0] + 40), key=lambda b: arclen(b[0]))[0]
    bases = [b for b, t in spine_stalks]
    return max((at_frac(pts, t)[0] for t in (0.3, 0.36, 0.42, 0.48, 0.54, 0.6, 0.66, 0.72)),
               key=lambda p: min(math.dist(p, q) for q in bases))

def organelle_anchor(points, label):
    free = [p for p in points if min(math.dist(p, (x, y)) for x, y, _ in inhib) > 18 and inside_soma(p)]
    return min(free or points, key=lambda p: math.dist(p, label))

def spine_anchor():
    """A mushroom spine on an oblique, well away from any terminal."""
    taken = [(x, y) for x, y, _ in inhib] + [SYN]
    picks = [sp for sp in spines if sp[2] == 1 and sp[3] == "oblique"]
    return max(picks, key=lambda sp: min(math.dist(sp[1], t) for t in taken))[1]

LABEL = {
    "apical": (880, 340), "tuft": (940, 70), "oblique": (900, 250), "basal": (1010, 640),
    "spines": (170, 200), "syn": (150, 700), "soma": (850, 500), "nucleus": (330, 470),
    "nucleolus": (830, 440), "nissl": (870, 560), "mito": (300, 530), "inhib": (240, 590),
    "hillock": (1010, 700), "initial": (1010, 760), "axon": (760, 990), "myelin": (330, 850),
    "node": (330, 920), "collateral": (200, 830), "oligo": (960, 810),
}

NODE_MID = at_frac(axon_pts, sum(GAPS[0]) / 2)[0]
MYE_MID = at_frac(axon_pts, sum(INTERNODES[1]) / 2)[0]
SYN_OUT = (SYN[0] + math.cos(SYN_ANG) * 12.0, SYN[1] + math.sin(SYN_ANG) * 12.0)
ANCHOR = {
    "apical": at_frac(apical, 0.40)[0],
    "tuft": mid_of(tuft),
    "oblique": mid_of(oblique),
    "basal": basal_anchor(),
    "spines": spine_anchor(),
    "syn": SYN_OUT,
    "soma": clearest_in_soma(),
    "nucleus": (NUC_C[0] - 15, NUC_C[1] + 9),
    "nucleolus": (NUC_C[0] + 11, NUC_C[1] - 4),
    # the organelle nearest its label that has no terminal drawn over it
    "nissl": organelle_anchor([(n[0], n[1]) for n in nissl], LABEL["nissl"]),
    "mito": organelle_anchor([(m[0], m[1]) for m in mito], LABEL["mito"]),
    "inhib": (inhib[0][0], inhib[0][1]),
    "hillock": (SOMA[0], (BASE_Y + HILL_END) / 2 + 2),
    "initial": (SOMA[0] + 2, (HILL_END + IS_END) / 2 + 6),
    "axon": at_frac(axon_pts, 0.97)[0],
    "myelin": MYE_MID,
    "node": NODE_MID,
    "collateral": mid_of(collateral),
    "oligo": OLIGO,
}

# ── the markup ─────────────────────────────────────────────────────────────
def g_open(cls, part=None, vis=None, extra=""):
    s = f'<g class="{cls}"'
    if vis: s += f' data-vis="{vis}" style="--acc:{ACC[vis]}"'
    if part: s += f' data-part="{part}"'
    return s + extra + ">"

def body_group(branches, pid, extra=""):
    return g_open("mn-spn-body", vis=pid) + tube_layers(branches)[1] + extra + "</g>"

def ink_of(branches):
    return tube_layers(branches)[0]

STALK_W, INK_X = 1.7, 2.8
def spine_ink():
    s = '<path stroke-width="' + f(STALK_W + INK_X) + '" d="' + "".join("M" + P(a) + "L" + P(b) for a, b in spine_stalks) + '"/>'
    return s + "".join(dots(spine_heads[k], HEAD[k] * 2 + INK_X) for k in HEAD)

def spine_body():
    s = '<path stroke-width="' + f(STALK_W) + '" d="' + "".join("M" + P(a) + "L" + P(b) for a, b in spine_stalks) + '"/>'
    return s + "".join(dots(spine_heads[k], HEAD[k] * 2) for k in HEAD)

def spine_hit_path():
    """Only the outer half of each spine, so clicking the dendrite it stands
    on still reaches the dendrite."""
    d = []
    for (bx, by), (tx, ty) in spine_stalks:
        d.append("M" + P((bx + (tx - bx) * 0.55, by + (ty - by) * 0.55)) + "L" + P((tx, ty)))
    return "".join(d)

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
oli += f'<ellipse class="mn-of" cx="{f(OLIGO[0])}" cy="{f(OLIGO[1])}" rx="20" ry="16"/>'
oli += f'<ellipse class="mn-oli-nuc" cx="{f(OLIGO[0] + 2)}" cy="{f(OLIGO[1] - 1)}" rx="9.5" ry="7.5"/>'
add(g_open("mn-oligo", part="oligo", vis="oligo") + oli + "</g>")

# ── the ink pass: everything that is one continuous cell, underneath ──
ink = "".join(ink_of(b) for b in (apical_b, tuft, oblique, basal, hillock_b, initial_b, axon_b, collateral))
ink += dots(col_boutons, 7.0 + 3.2)
ink += spine_ink()
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
add(body_group(collateral, "collateral", dots(col_boutons, 7.0)))
add(g_open("mn-spn-body", vis="spines") + spine_body() + "</g>")
add('<use href="#pc-soma" class="mn-body"/>')
add(f'<use href="#pc-soma" class="mn-tint" data-vis="soma" style="--acc:{ACC["soma"]}"/>')

# ── what can be clicked, the wide regions first ──
# A click resolves to the last thing drawn under it, so the big structures
# put their targets down here and everything small is drawn afterwards and
# keeps its own clicks.
for branches, pid in ((apical_b, "apical"), (tuft, "tuft"), (oblique, "oblique"),
                      (basal, "basal"), (collateral, "collateral")):
    add(hit_layer(branches, pid))
add(hit_layer(axon_b, "axon", pad=6))
add(g_open("mn-spn-hit", part="spines") + f'<path stroke-width="8" d="{spine_hit_path()}"/></g>')
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
for _ in range(30):
    a, rr = rng.uniform(0, 2 * math.pi), math.sqrt(rng.random()) * 0.82
    chrom.append((NUC_C[0] + math.cos(a) * NUC_R[0] * rr, NUC_C[1] + math.sin(a) * NUC_R[1] * rr))
nuc += '<path class="mn-dots mn-chromatin" d="' + "".join("M" + P(p) + "h.01" for p in chrom) + '"/>'
add(g_open("mn-nucleus", part="nucleus", vis="nucleus") + nuc + "</g>")
add(g_open("mn-nucleolus", part="nucleolus", vis="nucleolus") +
    f'<circle class="mn-of" cx="{f(NUC_C[0] + 11)}" cy="{f(NUC_C[1] - 4)}" r="9"/>' +
    f'<circle class="mn-glint" cx="{f(NUC_C[0] + 8)}" cy="{f(NUC_C[1] - 7)}" r="2.8"/></g>')

# ── the sheath over the axon, and the bare gaps left between its lengths ──
mye_ink, mye_body = tube_layers(myelin_b, ink_extra=2.4, cap="butt")
add(hit_layer(myelin_b, "myelin", pad=8, cap="butt"))
add(g_open("mn-myelin", part="myelin", vis="myelin") +
    g_open("mn-spn-ink") + mye_ink + "</g>" +
    g_open("mn-mye-body") + mye_body + "</g>" + "</g>")
node_ink, node_body = tube_layers(node_b, ink_extra=3.2)
add(hit_layer(node_b, "node", pad=16))
add(g_open("mn-spn-ink") + node_ink + "</g>")
def node_marks(pts):
    """A short bar across the axon at each end of the gap, where the sheath stops."""
    d = ""
    for p, q in ((pts[0], pts[1]), (pts[-1], pts[-2])):
        a = math.atan2(q[1] - p[1], q[0] - p[0]) + math.pi / 2
        d += f'<path class="mn-node-mark" d="M{P((p[0] + math.cos(a) * 7, p[1] + math.sin(a) * 7))}L{P((p[0] - math.cos(a) * 7, p[1] - math.sin(a) * 7))}"/>'
    return d
add(g_open("mn-node", part="node", vis="node") +
    g_open("mn-spn-body") + node_body + "</g>" +
    "".join(node_marks(b[0]) for b in node_b) + "</g>")

# ── the terminals that land on the cell, drawn last so they take their own ──
def bouton(p, ang, cls, r=7.4):
    """A terminal resting on the membrane at p, its long axis along the
    membrane, its far side out in the neuropil."""
    x = p[0] + math.cos(ang) * r * 0.95; y = p[1] + math.sin(ang) * r * 0.95
    return (f'<g transform="translate({f(x)} {f(y)}) rotate({f(math.degrees(ang) + 90)})">'
            f'<ellipse class="mn-fillcell {cls}" rx="{f(r * 1.3)}" ry="{f(r)}"/>'
            f'<path class="mn-ves" d="M-2.6 -1.4a1.8 1.8 0 1 0 .1 0M2.2 -2.2a1.8 1.8 0 1 0 .1 0M-.2 2a1.8 1.8 0 1 0 .1 0"/></g>')

def psd(p, ang, half):
    """The thickened patch of membrane under a terminal."""
    return (f'<path class="mn-psd" d="M{f(p[0] - math.sin(ang) * half)} {f(p[1] + math.cos(ang) * half)}'
            f'L{f(p[0] + math.sin(ang) * half)} {f(p[1] - math.cos(ang) * half)}"/>')

inh = "".join(bouton((x, y), a, "mn-inhib-b", 6.8) for x, y, a in inhib)
inh += "".join(psd((x, y), a, 5.2) for x, y, a in inhib)
add(g_open("mn-inhib", part="inhib", vis="inhib") + inh + "</g>")

syn = bouton((SYN[0] + math.cos(SYN_ANG) * HEAD[1], SYN[1] + math.sin(SYN_ANG) * HEAD[1]), SYN_ANG, "mn-exc-b", 7.4)
syn += psd((SYN[0] + math.cos(SYN_ANG) * (HEAD[1] - 0.6), SYN[1] + math.sin(SYN_ANG) * (HEAD[1] - 0.6)), SYN_ANG, 3.6)
add(g_open("mn-exc", part="syn", vis="syn") + syn + "</g>")
add(f'<circle class="mn-pad" data-part="syn" cx="{f(SYN_OUT[0])}" cy="{f(SYN_OUT[1])}" r="13"/>')

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
n_spines = int(round(len(spines), -2))
NOTE = ("A schematic, not to scale: the organelles are drawn larger and far fewer than in a real "
        f"cell, a real one carries tens of thousands of spines rather than the {n_spines:,} here, "
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
      "· spines:", len(spines), "· nissl:", len(nissl), "· mito:", len(mito), "· inhib:", len(inhib))
