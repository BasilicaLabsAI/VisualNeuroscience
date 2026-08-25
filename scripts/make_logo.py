#!/usr/bin/env python3
"""Draw the site mark: the flow-state ring, stripped to arcs and threads.

The mark is the network ring the site is built around, with the labels,
markers and group names taken off so it reads at sixteen pixels as well as at
five hundred. Geometry, palette and links are the same ones the live page
uses (site/assets/network-ring.js and network-states.js) — change them there
and re-run this to keep the mark in step.

    python3 scripts/make_logo.py > site/assets/logo.svg

The mark has no background of its own. It is the ring and nothing else, so it
reads on a white page and a black one alike, and the browser tab picks up
whichever chrome the reader is running.

The site uses this one mark everywhere — masthead and browser tab alike — so
the tab shows what the page shows. A --favicon variant is kept for the case
where that stops working: it drops the threads and thickens the arcs to the
coloured ring alone, which holds up better if the icon is ever rendered very
small. Nothing references it at present.
"""

import math
import sys

# ── the same cast, in the same ring order as network-states.js ──────────────
GROUP_SIZES = [2, 1, 2, 2, 3, 2, 2]        # dmn, exec, sal, attn, reward, arousal, motor
NODES = ["mPFC", "PCC", "dlPFC", "AI", "dACC", "FEF", "IPS",
         "VStr", "Put", "VTA", "LC", "Amy", "SMA", "Cb"]

PALETTE = ["#915AD8", "#CD5AD8", "#E250A9", "#FF507A", "#FF704E", "#F89F3A",
           "#DAD358", "#AFF05B", "#6BF75C", "#41F186", "#4AE8C3", "#4DCAE5",
           "#4E95E4", "#5A61D8"]

LINKS = [
    ("AI", "dACC", .55, False), ("AI", "VStr", .50, False), ("dACC", "FEF", .45, False),
    ("FEF", "IPS", .55, False), ("IPS", "SMA", .40, False), ("SMA", "Cb", .50, False),
    ("Put", "SMA", .50, False), ("VTA", "VStr", .55, False), ("VTA", "Put", .40, False),
    ("LC", "dACC", .40, False), ("VStr", "Put", .35, False), ("AI", "IPS", .35, False),
    ("mPFC", "PCC", .55, True), ("AI", "mPFC", .45, True),
    ("mPFC", "Amy", .45, True), ("Amy", "LC", .35, True),
    ("dlPFC", "SMA", .40, True), ("dlPFC", "mPFC", .35, True),
    ("PCC", "IPS", .30, True),
]

# ── geometry, lifted from network-ring.js ───────────────────────────────────
FAVICON = "--favicon" in sys.argv

CX = CY = 360.0
ARC_R = 236.0
ARC_W = 62.0 if FAVICON else 13.0          # heavier than the page's 11 either way
ER = ARC_R + 13.0/2                        # threads still meet the page's ring
GAP = math.radians(6)
PER = (2*math.pi - GAP*len(GROUP_SIZES)) / len(NODES)
ARC_SPAN = PER*0.80
QUIET = "#8A8A8A"
BOX = ARC_R + ARC_W/2 + (6 if FAVICON else 8)   # crop square to the ring

angle = {}
a = -math.pi/2 + GAP/2
i = 0
for size in GROUP_SIZES:
    for _ in range(size):
        angle[NODES[i]] = a + PER/2
        a += PER
        i += 1
    a += GAP

colour = {n: PALETTE[i % len(PALETTE)] for i, n in enumerate(NODES)}


def norm(x):
    while x > math.pi:
        x -= 2*math.pi
    while x < -math.pi:
        x += 2*math.pi
    return x


# fan each region's thread ends along its own arc, as the page does
ends = {}
for n in NODES:
    mine = [l for l in LINKS if l[0] == n or l[1] == n]
    mine.sort(key=lambda l: norm(angle[l[1] if l[0] == n else l[0]] - angle[n]))
    k, spread = len(mine), ARC_SPAN*0.66
    for j, l in enumerate(mine):
        t = 0 if k == 1 else (j/(k - 1) - 0.5)
        ang = angle[n] + t*spread
        ends[(l, n)] = (CX + ER*math.cos(ang), CY + ER*math.sin(ang))


def arc_d(r, a0, a1):
    x0, y0 = CX + r*math.cos(a0), CY + r*math.sin(a0)
    x1, y1 = CX + r*math.cos(a1), CY + r*math.sin(a1)
    return f"M{x0:.2f},{y0:.2f} A{r},{r} 0 {1 if a1-a0 > math.pi else 0} 1 {x1:.2f},{y1:.2f}"


def chord_d(l):
    (px, py), (qx, qy), k = ends[(l, l[0])], ends[(l, l[1])], 0.22
    return (f"M{px:.2f},{py:.2f} C{CX+(px-CX)*k:.2f},{CY+(py-CY)*k:.2f} "
            f"{CX+(qx-CX)*k:.2f},{CY+(qy-CY)*k:.2f} {qx:.2f},{qy:.2f}")


out = [
    '<svg xmlns="http://www.w3.org/2000/svg" '
    f'viewBox="{CX-BOX:.0f} {CY-BOX:.0f} {BOX*2:.0f} {BOX*2:.0f}" '
    'role="img" aria-label="VisualNeuroscience">',
    "<title>VisualNeuroscience</title>",
    "<defs>",
]
for j, l in enumerate(LINKS):
    if l[3]:
        continue
    (px, py), (qx, qy) = ends[(l, l[0])], ends[(l, l[1])]
    out.append(
        f'<linearGradient id="lg{j}" gradientUnits="userSpaceOnUse" '
        f'x1="{px:.2f}" y1="{py:.2f}" x2="{qx:.2f}" y2="{qy:.2f}">'
        f'<stop offset="0%" stop-color="{colour[l[0]]}"/>'
        f'<stop offset="100%" stop-color="{colour[l[1]]}"/></linearGradient>')
out.append("</defs>")

# No plate behind the ring: the mark is drawn on whatever it is placed on, so
# it sits on the light page and the dark one without carrying its own square.
out.append('<g fill="none" stroke-linecap="butt">')
for j, l in enumerate(LINKS if not FAVICON else []):
    w = (1.9 + l[2]*3.8)*1.18              # heavier than the page, for small sizes
    if l[3]:
        d = max(2.2, w*1.5)
        out.append(f'<path d="{chord_d(l)}" stroke="{QUIET}" stroke-width="{w:.2f}" '
                   f'stroke-dasharray="{d:.2f} {d:.2f}" opacity="{min(1, .58+l[2]*.8):.2f}"/>')
    else:
        out.append(f'<path d="{chord_d(l)}" stroke="url(#lg{j})" stroke-width="{w:.2f}" '
                   f'opacity="{min(1, .58+l[2]*.8):.2f}"/>')
for n in NODES:
    out.append(f'<path d="{arc_d(ARC_R, angle[n]-ARC_SPAN/2, angle[n]+ARC_SPAN/2)}" '
               f'stroke="{colour[n]}" stroke-width="{ARC_W}"/>')
out.append("</g></svg>")

sys.stdout.write("\n".join(out) + "\n")
