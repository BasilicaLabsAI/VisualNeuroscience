"""Emit the plate as SVG markup (inline for the page, or standalone with literal colours)."""
import math, json, pickle, sys, colorsys
import numpy as np
from shapely.geometry import Point, LineString
from shapely.ops import unary_union, substring
from geom import fmt, P, smooth_open, resample
from silhouette import geom_path
from neuron import W, H, C, OUT, arclen

PARTS = [  # id, name  (index order)
    ("dendrites", "Dendrites"), ("spines", "Dendritic spines"), ("soma", "Cell body (soma)"), ("nucleus", "Nucleus"),
    ("nucleolus", "Nucleolus"), ("nissl", "Nissl bodies (rough ER)"), ("ribosomes", "Free ribosomes"), ("mito", "Mitochondria"),
    ("golgi", "Golgi apparatus"), ("lys", "Lysosomes"), ("tubes", "Neurotubules"), ("hillock", "Axon hillock"),
    ("initial", "Initial segment"), ("axon", "Axon"), ("syn_soma", "Axosomatic synapse"), ("syn_dend", "Axodendritic synapse"),
    ("glia", "Astrocyte process"),
]

def rainbow(t, l_floor=0.60, s_floor=0.62):
    """d3.interpolateRainbow with luminance / saturation floors."""
    t = t % 1.0
    ts = abs(t - 0.5)
    h = 360 * t - 100; s = 1.5 - 1.5 * ts; l = 0.8 - 0.9 * ts
    hr = math.radians(h + 120); a = s * l * (1 - l); ch, sh = math.cos(hr), math.sin(hr)
    r = l + a * (-0.14861 * ch + 1.78277 * sh); g = l + a * (-0.29227 * ch - 0.90649 * sh); b = l + a * (1.97294 * ch)
    r, g, b = [min(1, max(0, v)) for v in (r, g, b)]
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    ll = max(ll, l_floor); ss = max(ss, s_floor)
    r, g, b = colorsys.hls_to_rgb(hh, ll, ss)
    return "#%02x%02x%02x" % tuple(int(round(v * 255)) for v in (r, g, b))

HUE_T = dict(dendrites=0.000, spines=0.588, soma=0.235, nucleus=0.941, nucleolus=0.471, nissl=0.118, ribosomes=0.765, mito=0.353,
             golgi=0.647, lys=0.529, tubes=0.176, hillock=0.824, initial=0.059, axon=0.706, syn_soma=0.294, syn_dend=0.412, glia=0.882)

def accents():
    """Seventeen evenly spaced stops on the rainbow, dealt out so that neighbours on the drawing never share a hue."""
    return {pid: rainbow(HUE_T[pid]) for pid, _ in PARTS}

def xf(c, th=0.0, sc=1.0):
    t = f"translate({fmt(c[0])} {fmt(c[1])})"
    if abs(th) > 1e-9: t += f" rotate({fmt(math.degrees(th))})"
    if abs(sc - 1) > 1e-9: t += f" scale({fmt(round(sc, 2))})" if False else f" scale({round(sc, 2):g})"
    return t

def circ(c, r, cls=None, extra=""):
    k = f' class="{cls}"' if cls else ""
    return f'<circle{k} cx="{fmt(c[0])}" cy="{fmt(c[1])}" r="{round(r, 2):g}"{extra}/>'

def dots_path(points):
    return "".join(f"M{P(p)}h.01" for p in points)

LIGHT = dict(ink="#1d1b18", cell="#ece6db", glia="#d5dedd", bouton="#e6dac3", nuc="#f9f6f0", nucleolus="#6b665e", nissl="#d0c9bc", nissl_line="#77716a",
             mito="#8e8980", mito_line="#f1ece3", lys="#55514b", rib="#69645c", tube="#7b756c", golgi_lumen="#dbd4c8", ves="#f6f2ea", fibril="#96a3a3", anuc="#b7c3c3")

def literal_styles(T):
    """Presentation attributes for the standalone file (no CSS, no variables) keyed by (class, context)."""
    ink = T["ink"]
    of = lambda fill, w=1.15: f'fill="{fill}" stroke="{ink}" stroke-width="{w}"'
    ol = lambda stroke, w=.95: f'fill="none" stroke="{stroke}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"'
    return {
        ("mn-ink", None): f'fill="{ink}" stroke="{ink}" stroke-width="3.2" stroke-linejoin="round"',
        ("mn-body", None): f'fill="{T["cell"]}"',
        ("mn-fillcell", "glia"): f'fill="{T["glia"]}"', ("mn-fillcell", "bouton"): f'fill="{T["bouton"]}"',
        ("mn-spn-ink", None): f'fill="none" stroke="{ink}" stroke-linecap="round"',
        ("mn-spn-body", None): f'fill="none" stroke="{T["cell"]}" stroke-linecap="round"',
        ("mn-of", "nissl"): of(T["nissl"]), ("mn-ol", "nissl"): ol(T["nissl_line"]),
        ("mn-of", "mito"): of(T["mito"]), ("mn-ol", "mito"): ol(T["mito_line"]),
        ("mn-of", "lys"): of(T["lys"]), ("mn-of", "nucleus"): of(T["nuc"], 1.5), ("mn-of", "nucleolus"): of(T["nucleolus"]),
        ("mn-ol", "tubes"): ol(T["tube"], 1.05),
        ("mn-dots", "rib"): f'fill="none" stroke="{T["rib"]}" stroke-width="2.1" stroke-linecap="round"',
        ("mn-dots", "chromatin"): f'fill="none" stroke="{T["rib"]}" stroke-width="2.5" stroke-linecap="round" opacity=".42"',
        ("mn-ves", None): f'fill="{T["ves"]}" stroke="{ink}" stroke-width=".9"',
        ("mn-glint", None): f'fill="{T["cell"]}" opacity=".5"',
        ("mn-psd", None): f'fill="none" stroke="{ink}" stroke-width="3.3" stroke-linecap="round"',
        ("mn-fibril", None): f'fill="none" stroke="{T["fibril"]}" stroke-width=".85" stroke-linecap="round"',
        ("mn-anuc", None): f'fill="{T["anuc"]}" stroke="{ink}" stroke-width="1.1"',
        ("mn-env", None): f'fill="none" stroke="{ink}" stroke-width=".6" opacity=".5"',
        ("mn-g-ink", None): f'fill="none" stroke="{ink}" stroke-width="4.4" stroke-linecap="round"',
        ("mn-g-lumen", None): f'fill="none" stroke="{T["golgi_lumen"]}" stroke-width="2.1" stroke-linecap="round"',
    }

def build(G, standalone=False, idp="mn-", theme=None):
    from shapely.geometry import box
    N = G["neuron"]; S = G["S"]; O = G["O"]; R = G["R"]; ACC = accents()
    LIT = literal_styles(theme or LIGHT)
    I = lambda name: idp + name
    HREF = "xlink:href" if standalone else "href"
    def st(cls, ctx=None, extra_cls=""):
        if standalone: return " " + LIT[(cls, ctx)]
        return f' class="{(cls + " " + extra_cls).strip()}"'
    def grp(pid, cls, ident=None):          # opening attributes of a structure group
        if standalone: return f' id="{I(ident or pid)}"'
        return f' class="{cls}" data-vis="{pid}" data-part="{pid}" style="--acc:{ACC[pid]}"'
    pad = lambda s_: "" if standalone else s_
    def circ(c, r, cls, ctx=None):
        return f'<circle{st(cls, ctx)} cx="{fmt(c[0])}" cy="{fmt(c[1])}" r="{round(r, 2):g}"/>'
    def padc(c, r): return pad(f'<circle class="mn-pad" cx="{fmt(c[0])}" cy="{fmt(c[1])}" r="{round(r, 2):g}"/>')
    use = lambda target, rest="": f'<use {HREF}="#{I(target)}"{rest}/>'

    # ---- defs
    sp = {0: [], 1: [], 2: []}; heads = []
    for base, tip, kind in G["spines"]:
        sp[kind].append(f"M{P(base)}L{P(tip)}")
        if kind == 1: heads.append(tip)
    spw = {0: 1.7, 1: 1.9, 2: 3.0, 3: 4.1}
    NL, NW = O["nissl_size"]; ML, MW = O["mito_size"]
    defs = [f'<path id="{I("sil")}" d="{geom_path(N, 0.1)}"/>']
    for k in (0, 1, 2):
        defs.append(f'<path id="{I("sp%d" % k)}" d="{"".join(sp[k])}"/>')
    defs.append(f'<path id="{I("sp3")}" d="{dots_path(heads)}"/>')
    for k in ("soma", "dendrites", "hillock", "initial", "axon"):
        defs.append(f'<path id="{I("r-" + k)}" d="{geom_path(R[k], 0.12)}"/>')
    defs.append(f'<path id="{I("astro-sil")}" d="{geom_path(S["astro"]["poly"].intersection(box(-6, -6, W + 6, H + 6)), 0.1)}"/>')
    defs.append(f'<path id="{I("b1-sil")}" d="{geom_path(S["syn_soma"]["poly"], 0.08)}"/>')
    defs.append(f'<path id="{I("b2-sil")}" d="{geom_path(S["syn_dend"]["poly"], 0.08)}"/>')
    hw, hh = NL / 2, NW / 2
    defs.append(f'<g id="{I("u-nissl")}">' + pad(f'<rect class="mn-pad" x="{fmt(-hw - 2.5)}" y="{fmt(-hh - 2.5)}" width="{fmt(NL + 5)}" height="{fmt(NW + 5)}" rx="{fmt(hh + 2.5)}"/>') +
                f'<rect{st("mn-of", "nissl")} x="{fmt(-hw)}" y="{fmt(-hh)}" width="{fmt(NL)}" height="{fmt(NW)}" rx="{fmt(hh)}"/>'
                f'<path{st("mn-ol", "nissl")} d="M-8.8-2.5q4.4-1.5 8.8 0t8.8 0M-10.2 0q5.1-1.5 10.2 0t10.2 0M-8.8 2.5q4.4-1.5 8.8 0t8.8 0"/></g>')
    mw, mh = ML / 2, MW / 2
    defs.append(f'<g id="{I("u-mito")}">' + pad(f'<rect class="mn-pad" x="{fmt(-mw - 2.5)}" y="{fmt(-mh - 2.5)}" width="{fmt(ML + 5)}" height="{fmt(MW + 5)}" rx="{fmt(mh + 2.5)}"/>') +
                f'<rect{st("mn-of", "mito")} x="{fmt(-mw)}" y="{fmt(-mh)}" width="{fmt(ML)}" height="{fmt(MW)}" rx="{fmt(mh)}"/>'
                f'<path{st("mn-ol", "mito")} d="M-7.2 0l2.4-2.3 2.4 4.6 2.4-4.6 2.4 4.6 2.4-4.6 2.4 2.3"/></g>')

    out = []
    # ---- neighbouring cells: astrocyte and the two afferent boutons
    A = S["astro"]
    fib = []
    for k, line in enumerate(A["fibrils"]):
        pts, _, _ = resample(line, 9.0)
        s_ = arclen(pts)
        for off in ((-2.0, 2.0) if k == 0 else (0.0,)):
            tg = np.gradient(pts, axis=0); tg /= np.linalg.norm(tg, axis=1)[:, None]
            nr = np.stack([-tg[:, 1], tg[:, 0]], 1)
            keep = (s_ > 16) & (s_ < s_[-1] - (18 if k == 0 else 10))
            q = (pts + nr * off)[keep]
            q = q[(q[:, 0] > -4) & (q[:, 0] < W + 4) & (q[:, 1] > -4) & (q[:, 1] < H + 4)]
            if len(q) > 3: fib.append(smooth_open(q))
    bc = A["body_c"]
    out.append(f'<g{grp("glia", "mn-cell mn-glia", "astrocyte")}>' + use("astro-sil", st("mn-ink")) + use("astro-sil", st("mn-fillcell", "glia")) +
               f'<path{st("mn-fibril")} d="{"".join(fib)}"/>'
               f'<ellipse{st("mn-anuc")} cx="{fmt(bc[0] - 1)}" cy="{fmt(bc[1] + 1)}" rx="10.5" ry="8.2" transform="rotate(-24 {fmt(bc[0])} {fmt(bc[1])})"/></g>')
    names = dict(syn_soma="axosomatic-synapse", syn_dend="axodendritic-synapse")
    for key, sid in (("syn_soma", "b1-sil"), ("syn_dend", "b2-sil")):
        sy = S[key]
        fp, _, _ = resample(sy["pts"], 14.0)
        fp = fp[(fp[:, 0] > -8) & (fp[:, 0] < W + 8) & (fp[:, 1] > -8)]
        m_c, m_th = sy["mito"]
        out.append(f'<g{grp(key, "mn-cell mn-bouton", names[key])}>' + pad(f'<path class="mn-fat" d="{smooth_open(fp)}"/>') +
                   use(sid, st("mn-ink")) + use(sid, st("mn-fillcell", "bouton")) + use("u-mito", f' transform="{xf(m_c, m_th, 0.42)}"') +
                   "".join(circ(v, 1.5, "mn-ves") for v in sy["ves"]) + "</g>")

    # ---- the neuron: two-pass silhouette with spines
    ink_w = 2 * OUT
    out.append(f'<g{st("mn-spn-ink")}>' + "".join(use("sp%d" % k, f' stroke-width="{spw[k] + ink_w:g}"') for k in range(4)) + "</g>")
    out.append(use("sil", st("mn-ink")))
    if standalone:
        out.append(f'<g id="{I("dendritic-spines")}"{st("mn-spn-body")}>' + "".join(use("sp%d" % k, f' stroke-width="{spw[k]:g}"') for k in range(4)) + "</g>")
    else:
        out.append(f'<g class="mn-spn-body" data-vis="spines" style="--acc:{ACC["spines"]}">' + "".join(use("sp%d" % k, f' stroke-width="{spw[k]:g}"') for k in range(4)) + "</g>")
    out.append(use("sil", st("mn-body")))
    rnames = dict(dendrites="dendrites", soma="cell-body", axon="axon", initial="initial-segment", hillock="axon-hillock")
    if standalone:   # region outlines kept as unpainted shapes: give one a fill to colour that part of the cell
        out.append('<g id="' + I("regions") + '" fill="none" stroke="none">' + "".join(use("r-" + k, f' id="{I(rnames[k])}"') for k in rnames) + "</g>")
    else:
        for k in rnames:
            out.append(use("r-" + k, f' class="mn-tint" data-vis="{k}" style="--acc:{ACC[k]}"'))
        for k in rnames:
            out.append(use("r-" + k, f' class="mn-hit" data-part="{k}"'))
    for key in ("syn_soma", "syn_dend"):
        ident = f' id="{I(names[key] + "-density")}"' if standalone else f' data-vis="{key}" style="--acc:{ACC[key]}"'
        out.append(f'<path{st("mn-psd")}{ident} d="{smooth_open(S[key]["psd"][::2])}"/>')

    # ---- organelles
    out.append(f'<g{grp("ribosomes", "mn-rib", "free-ribosomes")}>' + "".join(padc(c, 7.4) for c in O["rosettes"]) + "".join(padc(c, 3.3) for c in O["rib_singles"]) +
               f'<path{st("mn-dots", "rib")} d="{dots_path(list(O["rib_dots"]) + list(O["rib_singles"]))}"/></g>')
    out.append(f'<g{grp("nissl", "mn-nissl", "nissl-bodies")}>' + "".join(use("u-nissl", f' transform="{xf(c, th, sc)}"') for c, th, sc in O["nissl"]) + "</g>")
    out.append(f'<g{grp("mito", "mn-mito", "mitochondria")}>' + "".join(use("u-mito", f' transform="{xf(c, th, sc)}"') for c, th, sc in O["mito"]) + "</g>")
    out.append(f'<g{grp("lys", "mn-lys", "lysosomes")}>' + "".join(padc(c, r + 3) + circ(c, r, "mn-of", "lys") + circ(c + np.array([-r * .28, -r * .3]), r * .28, "mn-glint") for c, r in O["lys"]) + "</g>")
    ga = O["golgi"]
    arcs = "".join(smooth_open(a[::2]) for a in ga["arcs"])
    out.append(f'<g{grp("golgi", "mn-golgi", "golgi-apparatus")}>' + pad(f'<path class="mn-pad" d="{geom_path(O["golgi_hit"], 0.4)}"/>') +
               f'<path{st("mn-g-ink")} d="{arcs}"/><path{st("mn-g-lumen")} d="{arcs}"/>' + "".join(circ(c, r, "mn-ves") for c, r in ga["ves"]) + "</g>")
    tubes = "".join(smooth_open(t[::2]) for t in O["tubes"])
    thit = "".join(smooth_open(t[::2]) for t in O["tubes_hit"] if len(t) > 3)
    out.append(f'<g{grp("tubes", "mn-tubes", "neurotubules")}>' + pad(f'<path class="mn-fat mn-fat-s" d="{thit}"/>') + f'<path{st("mn-ol", "tubes")} d="{tubes}"/></g>')
    nu = O["nucleus"]; c = nu["c"]
    rngl = np.random.default_rng(5)
    flecks = []
    while len(flecks) < 16:
        q = c + rngl.uniform(-1, 1, 2) * np.array([nu["rx"] - 6, nu["ry"] - 6])
        if ((q - c)[0] / (nu["rx"] - 6)) ** 2 + ((q - c)[1] / (nu["ry"] - 6)) ** 2 > 1: continue
        if np.linalg.norm(q - O["nucleolus"]["c"]) < O["nucleolus"]["r"] + 4: continue
        flecks.append(q)
    out.append(f'<g{grp("nucleus", "mn-nucleus")} transform="rotate({nu["rot"]:g} {fmt(c[0])} {fmt(c[1])})">'
               f'<ellipse{st("mn-of", "nucleus")} cx="{fmt(c[0])}" cy="{fmt(c[1])}" rx="{nu["rx"]:g}" ry="{nu["ry"]:g}"/>'
               f'<ellipse{st("mn-env")} cx="{fmt(c[0])}" cy="{fmt(c[1])}" rx="{nu["rx"] - 2.7:g}" ry="{nu["ry"] - 2.7:g}"/>'
               f'<path{st("mn-dots", "chromatin", "mn-chromatin")} d="{dots_path(flecks)}"/></g>')
    no = O["nucleolus"]
    out.append(f'<g{grp("nucleolus", "mn-nucleolus")}>' + padc(no["c"], no["r"] + 2.5) + circ(no["c"], no["r"], "mn-of", "nucleolus") +
               circ(no["c"] + np.array([-2.2, -2.4]), 2.1, "mn-glint") + "</g>")
    if not standalone:
        out.append('<g class="mn-spn-hit" data-part="spines">' + "".join(use("sp%d" % k, f' stroke-width="{7.5 if k < 3 else 9:g}"') for k in range(4)) + "</g>")
        out.append(f'<g id="{I("callout")}" class="mn-callout" aria-hidden="true"></g>')
    return "<defs>" + "".join(defs) + "</defs>" + "".join(out), ACC

def standalone_svg(G):
    inner, _ = build(G, standalone=True)
    head = (f'<?xml version="1.0" encoding="UTF-8"?>\n<!-- Multipolar neuron: an original drawing constructed from code. Unlabelled. One id per structure;\n'
            f'     the unpainted shapes in #mn-regions outline dendrites, cell body, axon hillock, initial segment and axon. -->\n'
            f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {W} {H}" width="{W}" height="{H}">\n<title>Multipolar neuron</title>\n')
    return head + inner + "\n</svg>\n"

def anchors(G):
    O = G["O"]; S = G["S"]; ax = G["axon"]
    brs = G["branches"]
    second = [b for b in brs if b.order == 2 and b.tree == 2]
    b2 = max(second, key=lambda b: b.length)
    A = {}
    A["dendrites"] = b2.pts[len(b2.pts) // 2]
    tips = [(t, base) for base, t, k in G["spines"] if k == 1]
    target = np.array([250.0, 120.0])
    A["spines"] = min(tips, key=lambda tb: np.linalg.norm(tb[0] - target))[0]
    A["nucleus"] = O["nucleus"]["c"] + np.array([-15.0, -12.0])
    A["nucleolus"] = O["nucleolus"]["c"]
    A["nissl"] = min((c for c, th, sc in O["nissl"]), key=lambda c: np.linalg.norm(c - (C + np.array([-40, -62]))))
    A["ribosomes"] = min(O["rosettes"], key=lambda c: np.linalg.norm(c - (C + np.array([20, 62]))))
    A["mito"] = min((c for c, th, sc in O["mito"][:-2]), key=lambda c: np.linalg.norm(c - (C + np.array([-70, 30]))))
    A["golgi"] = O["golgi"]["arcs"][2][7]
    A["lys"] = min((c for c, r in O["lys"]), key=lambda c: np.linalg.norm(c - (C + np.array([30, -55]))))
    t = O["tubes"][5]; A["tubes"] = t[int(len(t) * 0.34)]
    i = lambda sv: int(np.searchsorted(ax["s"], sv))
    A["hillock"] = ax["pts"][i(104)] + ax["nrm"] * 7.0
    A["initial"] = ax["pts"][i(168)]
    A["axon"] = ax["pts"][i(420)]
    A["syn_soma"] = S["syn_soma"]["c"]; A["syn_dend"] = S["syn_dend"]["c"]
    m = S["astro"]["main"]; A["glia"] = m[int(len(m) * 0.45)]
    # a quiet patch of cytoplasm for the cell body
    blocks = unary_union([Point(c).buffer(16) for c, th, sc in O["nissl"]] + [Point(c).buffer(13) for c, th, sc in O["mito"]] +
                         [Point(O["nucleus"]["c"]).buffer(40)] + [LineString(t).buffer(6) for t in O["tubes"]] + [Point(c).buffer(9) for c in O["rosettes"]] +
                         [O["golgi_hit"].buffer(8)] + [Point(c).buffer(r + 7) for c, r in O["lys"]])
    best = None
    for a in np.linspace(0, 2 * np.pi, 72, endpoint=False):
        for rr in (58, 66, 74):
            q = C + np.array([rr * 1.05 * np.cos(a), rr * 0.92 * np.sin(a)])
            if G["R"]["soma"].buffer(-8).contains(Point(q)) and not blocks.contains(Point(q)):
                d = blocks.distance(Point(q))
                if best is None or d > best[0]: best = (d, q)
    A["soma"] = best[1] if best else C + np.array([0, 60])
    return {k: [round(float(v[0]), 1), round(float(v[1]), 1)] for k, v in A.items()}

def labels(G, A):
    """Pick a label-box position for every anchor: nearest spot that stays off the artwork."""
    from shapely.geometry import box
    S = G["S"]
    occ = unary_union([G["neuron"].buffer(8.5), S["astro"]["poly"].buffer(5), S["syn_soma"]["poly"].buffer(5), S["syn_dend"]["poly"].buffer(5)])
    out = {}
    taken = []
    for pid, name in PARTS:
        ax, ay = A[pid]
        bw, bh = 7.9 * len(name) + 22, 27
        best = None
        for r in (30, 42, 56, 72, 90, 112, 138, 168, 200):
            for a_deg in range(0, 360, 10):
                a = math.radians(a_deg)
                ux, uy = math.cos(a), math.sin(a)
                ext = abs(ux) * bw / 2 + abs(uy) * bh / 2
                cx, cy = ax + ux * (r + ext), ay + uy * (r + ext)
                if cx - bw / 2 < 8 or cx + bw / 2 > W - 8 or cy - bh / 2 < 8 or cy + bh / 2 > H - 8: continue
                bx = box(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2)
                ov = bx.intersection(occ).area / bx.area
                cost = ov * 600 + r + (14 if a_deg % 90 else 0) * 0.3
                if best is None or cost < best[0]: best = (cost, cx, cy, ov)
        out[pid] = [round(best[1], 1), round(best[2], 1)]
    return out

if __name__ == "__main__":
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    G = pickle.load(open(f"G_{seed}.pkl", "rb"))
    inner, ACC = build(G)
    open("inner.svg.txt", "w").write(inner)
    A_ = anchors(G)
    json.dump(dict(acc=ACC, anchors=A_, labels=labels(G, A_)), open("parts_geo.json", "w"), indent=1)
    print("inner svg bytes:", len(inner))
    for pid, c in ACC.items(): print(pid, c)
