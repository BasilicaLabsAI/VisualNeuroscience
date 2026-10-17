"""Shared pieces for the print posters: the site's typefaces embedded, its
light-theme colours, molecules drawn to one physical scale, formulas set
with real subscripts, and a QR code back to the site.

Everything here is vector: RDKit draws the molecules as SVG paths, the type
is embedded in the PDF, and the QR code is a set of squares."""
import base64, glob, html, os, re
from rdkit import Chem
from rdkit.Chem import rdDepictor, Descriptors
from rdkit.Chem.Draw import rdMolDraw2D
from rdkit.Chem.rdMolDescriptors import CalcMolFormula
import segno

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SITE = os.path.join(ROOT, "site")
OUT = os.path.join(HERE, "out")          # everything built or fetched; not committed

# the site's light theme, which is what white paper is
INK, INK60, INK35, PAPER = "#111111", "#5A5A5A", "#A9A9A9", "#FFFFFF"
EL = {7: "#1a4fd6", 8: "#d2222d", 16: "#a08c00", 15: "#d97a00"}
# the fourteen-colour palette of the network ring, in its hue order
PALETTE = ["#915AD8", "#CD5AD8", "#E250A9", "#FF507A", "#FF704E", "#F89F3A", "#DAD358",
           "#AFF05B", "#6BF75C", "#41F186", "#4AE8C3", "#4DCAE5", "#4E95E4", "#5A61D8"]

GREEK = "U+0370-03FF, U+1F00-1FFF"

def _b64(path):
    with open(path, "rb") as fh:
        return base64.b64encode(fh.read()).decode()

def font_css():
    f = SITE + "/fonts/"
    serif = glob.glob(OUT + "/fontpkgs/fontsource-noto-serif-*/package/files/")[0]
    sans = glob.glob(OUT + "/fontpkgs/fontsource-noto-sans-*/package/files/")[0]
    faces = [
        ("Flux", "normal", "400 700", OUT + "/Flux-Regular-tt.ttf", None),   # TrueType copy, see otf2ttf.py
        ("Afacad Flux", "normal", "400", f + "afacad-flux-latin-400-normal.woff2", None),
        ("Afacad Flux", "normal", "500", f + "afacad-flux-latin-500-normal.woff2", None),
        ("Afacad Flux", "normal", "600", f + "afacad-flux-latin-600-normal.woff2", None),
        ("Newsreader", "normal", "400", f + "newsreader-latin-400-normal.woff2", None),
        ("Newsreader", "normal", "500", f + "newsreader-latin-500-normal.woff2", None),
        ("Newsreader", "italic", "400", f + "newsreader-latin-400-italic.woff2", None),
        ("Prata", "normal", "400", f + "prata-latin-400-normal.woff2", None),
        # Greek, which none of the three carries: Noto's, for that range only,
        # declared last so it is the face tried first for those letters
        ("Newsreader", "normal", "400", serif + "noto-serif-greek-400-normal.woff2", GREEK),
        ("Newsreader", "normal", "500", serif + "noto-serif-greek-500-normal.woff2", GREEK),
        ("Newsreader", "italic", "400", serif + "noto-serif-greek-400-italic.woff2", GREEK),
        ("Prata", "normal", "400", serif + "noto-serif-greek-400-normal.woff2", GREEK),
        # Prata's figure one has no flag and reads as a lowercase l (mGluRl,
        # 5-HTlA); the site's text serif lends its one for receptor names
        ("Prata", "normal", "400", f + "newsreader-latin-500-normal.woff2", "U+0031"),
        ("Flux", "normal", "400 700", sans + "noto-sans-greek-500-normal.woff2", GREEK),
        ("Afacad Flux", "normal", "400", sans + "noto-sans-greek-400-normal.woff2", GREEK),
        ("Afacad Flux", "normal", "500", sans + "noto-sans-greek-500-normal.woff2", GREEK),
        ("Afacad Flux", "normal", "600", sans + "noto-sans-greek-600-normal.woff2", GREEK),
    ]
    out = []
    for fam, style, weight, path, rng in faces:
        r = f" unicode-range:{rng};" if rng else ""
        fmt, mime = ("truetype", "font/ttf") if path.endswith(".ttf") else ("woff2", "font/woff2")
        out.append(f"@font-face{{font-family:'{fam}';font-style:{style};font-weight:{weight};"
                   f"src:url(data:{mime};base64,{_b64(path)}) format('{fmt}');{r}}}")
    return "\n".join(out)

def logo_svg():
    s = open(SITE + "/assets/logo.svg").read()
    return s[s.index("<svg"):]

def qr_svg(url, px_per_module=10):
    q = segno.make(url, error="m")
    return q.svg_inline(scale=px_per_module, dark=INK, light=None, border=0, omitsize=True)

def formula_html(f):
    m = re.match(r"^([A-Za-z0-9]+)([+-]\d*)?$", f)
    body, charge = (m.group(1), m.group(2) or "") if m else (f, "")
    out = re.sub(r"(\d+)", r"<sub>\1</sub>", body)
    if charge:
        out += "<sup>" + ("+" if charge == "+" else charge.replace("-", "−")) + "</sup>"
    return out

def mol_facts(smiles):
    m = Chem.MolFromSmiles(smiles)
    return CalcMolFormula(m), Descriptors.MolWt(m), m.GetNumHeavyAtoms()

_NUM = re.compile(r"-?\d+(?:\.\d+)?")

def _layout(m, coordgen, angle):
    rdDepictor.SetPreferCoordGen(coordgen)
    rdDepictor.Compute2DCoords(m)
    if angle:
        import math
        c = m.GetConformer(); n = m.GetNumAtoms()
        cx = sum(c.GetAtomPosition(i).x for i in range(n)) / n
        cy = sum(c.GetAtomPosition(i).y for i in range(n)) / n
        ca, sa = math.cos(math.radians(angle)), math.sin(math.radians(angle))
        from rdkit.Geometry import Point3D
        for i in range(n):
            p = c.GetAtomPosition(i); x, y = p.x - cx, p.y - cy
            c.SetAtomPosition(i, Point3D(cx + x * ca - y * sa, cy + x * sa + y * ca, 0))
    c = m.GetConformer()
    # one layout unit = one bond, whichever engine drew it: RDKit's drawing
    # code scales by layout units, so a 1.5-unit bond would print too large
    L = _bond(m)
    if abs(L - 1.0) > 1e-6:
        from rdkit.Geometry import Point3D
        for i in range(m.GetNumAtoms()):
            p = c.GetAtomPosition(i)
            c.SetAtomPosition(i, Point3D(p.x / L, p.y / L, 0))
    xs = [c.GetAtomPosition(i).x for i in range(m.GetNumAtoms())]
    ys = [c.GetAtomPosition(i).y for i in range(m.GetNumAtoms())]
    return max(xs) - min(xs), max(ys) - min(ys)

def _extent(m):
    c = m.GetConformer()
    xs = [c.GetAtomPosition(i).x for i in range(m.GetNumAtoms())]
    ys = [c.GetAtomPosition(i).y for i in range(m.GetNumAtoms())]
    return max(xs) - min(xs), max(ys) - min(ys)

def _bond(m):
    """The layout's own bond length: 1.0 under CoordGen, 1.5 under RDKit's engine."""
    c = m.GetConformer()
    if m.GetNumBonds() == 0:
        return 1.0
    return sum((c.GetAtomPosition(b.GetBeginAtomIdx()) - c.GetAtomPosition(b.GetEndAtomIdx())).Length()
               for b in m.GetBonds()) / m.GetNumBonds()

def draw_mol(smiles, label, bond_mm=8.0, font_mm=3.4, line_mm=0.4, pad_mm=1.2, px_per_mm=10, fit=None, layout=None):
    """A skeletal formula at a fixed physical bond length, so every molecule
    drawn with the same bond_mm compares in size. Returns an <svg> sized in
    millimetres, cropped to the ink. With fit=(w_mm, h_mm), a molecule whose
    usual layout overflows that box is laid out again, by the other layout
    engine and in turns of 30 degrees, until it fits; the scale never changes."""
    m = Chem.MolFromSmiles(smiles)
    LABEL = 2.2 * font_mm                    # room the end labels take beyond the atoms
    def over(w, h):
        return max(0, w * bond_mm + LABEL - fit[0]) + max(0, h * bond_mm + LABEL - fit[1])
    w, h = _layout(m, *(layout or (True, 0)))
    if fit and not layout and over(w, h) > 0:
        tries = [(True, 0), (False, 0)] + [(cg, a) for a in (90, 180, 270) for cg in (True, False)] + \
                [(cg, a) for a in range(30, 360, 30) if a % 90 for cg in (True, False)]
        best = None
        for rank, (coordgen, angle) in enumerate(tries):
            w, h = _layout(m, coordgen, angle)
            key = (round(over(w, h), 1), rank)
            if best is None or key < best[0]:
                best = (key, coordgen, angle)
        _layout(m, best[1], best[2])
    c = m.GetConformer()
    L = _bond(m)
    xs = [c.GetAtomPosition(i).x for i in range(m.GetNumAtoms())]
    ys = [c.GetAtomPosition(i).y for i in range(m.GetNumAtoms())]
    bond_px = bond_mm * px_per_mm
    k = bond_px / L
    # a canvas with room to spare, so RDKit never has to shrink the drawing
    room = 4 * bond_px
    W = int((max(xs) - min(xs)) * k + 2 * room)
    H = int((max(ys) - min(ys)) * k + 2 * room)
    d = rdMolDraw2D.MolDraw2DSVG(W, H)
    o = d.drawOptions()
    o.clearBackground = False
    o.includeMetadata = False
    o.fixedBondLength = bond_px
    o.fixedFontSize = int(round(font_mm * px_per_mm))
    o.bondLineWidth = line_mm * px_per_mm
    o.multipleBondOffset = 0.18
    o.addStereoAnnotation = False
    rgb = lambda h: tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
    pal = {6: rgb(INK), 1: rgb(INK)}
    pal.update({z: rgb(col) for z, col in EL.items()})
    o.setAtomPalette(pal)
    d.DrawMolecule(m)
    d.FinishDrawing()
    if m.GetNumBonds():
        b = m.GetBondWithIdx(0)
        p, q = d.GetDrawCoords(b.GetBeginAtomIdx()), d.GetDrawCoords(b.GetEndAtomIdx())
        drawn = ((p.x - q.x) ** 2 + (p.y - q.y) ** 2) ** .5
        drawn_bonds = [((d.GetDrawCoords(x.GetBeginAtomIdx()).x - d.GetDrawCoords(x.GetEndAtomIdx()).x) ** 2 +
                        (d.GetDrawCoords(x.GetBeginAtomIdx()).y - d.GetDrawCoords(x.GetEndAtomIdx()).y) ** 2) ** .5
                       for x in m.GetBonds()]
        mean = sum(drawn_bonds) / len(drawn_bonds)
        assert abs(mean - bond_px) / bond_px < 0.02, f"{label}: drawn at {mean / px_per_mm:.2f} mm a bond, not {bond_mm}"
    s = d.GetDrawingText()
    body = s.split("<!-- END OF HEADER -->")[1] if "<!-- END OF HEADER -->" in s else s
    body = body.rsplit("</svg>", 1)[0]
    # crop to the ink: every coordinate in every path and ellipse
    pts = []
    for dd in re.findall(r"d='([^']+)'", body):
        nums = [float(x) for x in _NUM.findall(dd)]
        pts += list(zip(nums[0::2], nums[1::2]))
    for cx, cy, rx in re.findall(r"cx='([\d.]+)' cy='([\d.]+)' rx='([\d.]+)'", body):
        cx, cy, rx = float(cx), float(cy), float(rx)
        pts += [(cx - rx, cy - rx), (cx + rx, cy + rx)]
    x0 = min(p[0] for p in pts); x1 = max(p[0] for p in pts)
    y0 = min(p[1] for p in pts); y1 = max(p[1] for p in pts)
    pad = pad_mm * px_per_mm + line_mm * px_per_mm
    x0 -= pad; y0 -= pad; x1 += pad; y1 += pad
    w, h = x1 - x0, y1 - y0
    if fit:
        assert w / px_per_mm <= fit[0] + 0.5 and h / px_per_mm <= fit[1] + 0.5, \
            f"{label}: {w / px_per_mm:.1f} x {h / px_per_mm:.1f} mm does not fit {fit} at {bond_mm} mm a bond"
    body = re.sub(r"\s+", " ", body).strip()
    return (f'<svg class="mol" xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.1f} {y0:.1f} {w:.1f} {h:.1f}" '
            f'width="{w / px_per_mm:.2f}mm" height="{h / px_per_mm:.2f}mm" role="img" '
            f'aria-label="Skeletal formula of {html.escape(label)}">{body}</svg>')

def load_site_molecules():
    """The seventeen transmitters exactly as the site's build script lists them."""
    src = open(os.path.join(ROOT, "scripts", "neurotransmitters", "build.py")).read()
    ns = {}
    exec(src[src.index("GROUPS = ["):src.index("def draw(")], ns)
    return ns["GROUPS"]
