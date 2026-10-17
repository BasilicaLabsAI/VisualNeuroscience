"""The receptors poster, A1 portrait, for white matte paper.

    python rx_poster.py      ->  out/rx_poster.html (render.js makes the PDF)

Every receptor and its words come from the site's receptor data
(site/assets/rx/receptors.json). The affinity of each receptor's own
transmitter comes from out/affinities.json, written by extract_gtopdb.py from
the IUPHAR/BPS Guide to PHARMACOLOGY. Without that file the poster renders
as a layout proof, marked as one, with no numbers on it."""
import re, html, json, math, os
from common import *

URL = "https://visualneuroscience.ai/microanatomy.html#receptors"
P_MIN, P_MAX = 3.0, 10.0      # the scale: 1 mM on the left to 100 pM on the right
site = json.load(open(SITE + "/assets/rx/receptors.json"))
AFF_PATH = os.path.join(OUT, "affinities.json")
AFF = json.load(open(AFF_PATH)) if os.path.exists(AFF_PATH) else None
PROOF = AFF is None

COLUMNS = [["glutamate", "gaba", "ach", "dopamine", "histamine"], ["adrenergic", "serotonin", "purine"], ["cannabinoid", "opioid", "peptide"]]
FAMILY_COLOUR = {"glutamate": "#FF507A", "gaba": "#5A61D8", "ach": "#F89F3A", "dopamine": "#E250A9", "adrenergic": "#915AD8",
                 "serotonin": "#4E95E4", "histamine": "#4AE8C3", "cannabinoid": "#41F186", "opioid": "#CD5AD8",
                 "purine": "#DAD358", "peptide": "#4DCAE5"}
TRANSMITTER = {"Glu": "glutamate", "Glu + Gly": "glutamate + glycine", "Gly": "glycine", "GABA": "GABA", "ACh": "acetylcholine",
 "DA": "dopamine", "NA": "noradrenaline", "5-HT": "serotonin", "His": "histamine", "Ado": "adenosine", "ATP": "ATP", "ADP": "ADP",
 "UTP": "UTP", "UDP": "UDP", "ATP · UTP": "ATP, UTP", "UDP-glucose": "UDP-glucose", "2-AG": "2-AG", "β-endorphin": "β-endorphin",
 "Enkephalin": "enkephalin", "Dynorphin": "dynorphin", "N/OFQ": "nociceptin", "SP": "substance P", "NKA": "neurokinin A",
 "NKB": "neurokinin B", "NPY": "neuropeptide Y", "PP": "pancreatic polypeptide", "SST": "somatostatin", "OX-A": "orexin-A",
 "OX-B": "orexin-B", "OT": "oxytocin", "AVP": "vasopressin", "CRF": "CRF", "Ucn": "urocortin", "α-MSH": "α-MSH", "Mel": "melatonin",
 "PGE₂": "PGE₂", "BK": "bradykinin", "des-Arg-BK": "des-Arg-bradykinin"}

# none of the site's faces carries the Unicode superscript and subscript
# characters (Cl⁻, PGE₂), so they are set as real superscripts and subscripts
_SUP = str.maketrans("⁰⁴⁵⁶⁷⁸⁹⁺⁻", "0456789+−")
_SUB = str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")
def typeset(text):
    out = html.escape(text)
    out = re.sub("[⁰⁴-⁹⁺⁻]+", lambda m: "<sup>" + m.group(0).translate(_SUP) + "</sup>", out)
    return re.sub("[₀-₉]+", lambda m: "<sub>" + m.group(0).translate(_SUB) + "</sub>", out)

def coupling(it):
    k, g = it["kind"], it.get("g", "")
    if k == "iono_cl": return "Cl⁻ channel"
    if k in ("iono_cat", "iglur"): return "Cation channel"
    if "·" in g: return "Gs · Gq"
    return {"gs": "Gs", "gq": "Gq", "gi": "Go" if g == "Gαo" else "Gi/o"}.get(k, k)

SHORT = {"NACHR_MUSCLE": "Muscle", "GABAA_RHO": "GABA-A ρ", "GLYR": "Glycine", "MOR": "μ · MOR", "DOR": "δ · DOR",
         "KOR": "κ · KOR", "NOP": "NOP", "OTR": "OT", "MC4R": "MC4", "BDKRB1": "B1", "BDKRB2": "B2"}
FAMILY_WORDS = ("Dopamine ", "Histamine ", "Adenosine ", "Muscarinic ", "Nicotinic ", "Somatostatin ", "NPY ", "Orexin ",
                "Vasopressin ", "Melanocortin ", "Melatonin ", "Prostaglandin ", "Bradykinin ")
def short(it):
    if it["id"] in SHORT: return SHORT[it["id"]]
    n = it["name"].split(" (")[0]
    for w in FAMILY_WORDS:
        if n.startswith(w): n = n[len(w):]
    for suffix in (" receptor", " receptors"):
        if n.endswith(suffix): n = n[: -len(suffix)]
    return n

def x_of(p):            # position along the track, 0..100
    return (min(max(p, P_MIN), P_MAX) - P_MIN) / (P_MAX - P_MIN) * 100

def track(rid, colour):
    a = (AFF or {}).get(rid)
    ticks = "".join(f'<line x1="{x_of(p):.2f}" y1="5.2" x2="{x_of(p):.2f}" y2="6.8" stroke="{INK35}" stroke-width=".25"/>'
                    for p in range(int(P_MIN), int(P_MAX) + 1))
    base = f'<line x1="0" y1="6" x2="100" y2="6" stroke="{INK35}" stroke-width=".3"/>{ticks}'
    if not a:
        return f'<svg class="trk" viewBox="0 0 100 12" preserveAspectRatio="none">{base}</svg>', ""
    lo, hi, v = x_of(a["low"]), x_of(a["high"]), x_of(a["value"])
    hollow = a["param"] == "pEC50"
    bar = f'<line x1="{lo:.2f}" y1="6" x2="{hi:.2f}" y2="6" stroke="{colour}" stroke-width="1.6" stroke-linecap="butt" opacity=".45"/>' if hi - lo > .3 else ""
    dot = (f'<ellipse cx="{v:.2f}" cy="6" rx="1.25" ry="2.6" fill="{"#fff" if hollow else colour}" stroke="{INK}" stroke-width=".35"/>')
    label = f'{a["param"]} {a["value"]:.1f}'
    return f'<svg class="trk" viewBox="0 0 100 12" preserveAspectRatio="none">{base}{bar}{dot}</svg>', label

def scale_head():
    labels = {3: "1 mM", 4: "100 µM", 5: "10 µM", 6: "1 µM", 7: "100 nM", 8: "10 nM", 9: "1 nM", 10: "100 pM"}
    cells = "".join(f'<span style="left:{x_of(p):.2f}%">{labels[p]}</span>' for p in labels)
    return f'<div class="axis"><div class="lab"></div><div class="ticks">{cells}</div></div>'

def family(gid):
    g = next(x for x in site["groups"] if x["id"] == gid)
    col = FAMILY_COLOUR[gid]
    rows = []
    for it in g["items"]:
        trk, val = track(it["id"], col)
        rows.append(f"""<div class="r">
  <div class="lab"><span class="nm">{typeset(short(it))}</span><span class="cp">{typeset(coupling(it))}</span><span class="tx">{typeset(TRANSMITTER.get(it["lig"], it["lig"]))}</span></div>
  <div class="tk">{trk}</div><div class="val">{html.escape(val) if val else ('&mdash;' if not PROOF else '')}</div>
</div>""")
    return f"""<section class="fam">
  <h3><span class="sw" style="background:{col}"></span>{typeset(g["name"])}</h3>
  <p class="fn">{typeset(g["note"])}</p>
  {scale_head()}
  {"".join(rows)}
</section>"""

n_rx = sum(len(next(x for x in site["groups"] if x["id"] == gid)["items"]) for col in COLUMNS for gid in col)
WORDS = {108: "A hundred and eight"}
lead = WORDS.get(n_rx, str(n_rx))

proof_banner = """<div class="proof"><b>Layout proof.</b> The affinities are filled in from the IUPHAR/BPS Guide to PHARMACOLOGY, with
every number traced to its study; until they are, the scales stand empty rather than carry a figure from anywhere else.</div>""" if PROOF else ""

CSS = f"""
{font_css()}
@page {{ size: 594mm 841mm; margin: 0; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ background: {PAPER}; }}
body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
.poster {{ width: 594mm; height: 841mm; padding: 20mm 24mm 16mm; color: {INK}; font-family: 'Newsreader', serif; display: flex; flex-direction: column; }}
.brand {{ display: flex; justify-content: center; align-items: center; gap: 4.2mm; font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 500; font-size: 30pt; }}
.brand svg {{ width: 12mm; height: 12mm; }}
.kick {{ text-align: center; font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 500; font-size: 11pt; letter-spacing: .32em; text-transform: uppercase; margin-top: 7mm; }}
h1 {{ font-family: 'Prata', serif; font-weight: 400; font-size: 122pt; line-height: 1; text-align: center; margin-top: 3mm; }}
.stand {{ font-style: italic; font-size: 21pt; line-height: 1.32; text-align: center; max-width: 420mm; margin: 5mm auto 0; }}
.dateline {{ display: flex; justify-content: space-between; align-items: baseline; margin-top: 8mm; border-top: .3mm solid {INK}; border-bottom: .3mm solid {INK};
  padding: 2.6mm 1mm; font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 500; font-size: 9.5pt; letter-spacing: .26em; text-transform: uppercase; color: {INK60}; }}
.dateline .mid {{ font-family: 'Newsreader', serif; font-style: italic; font-size: 13pt; letter-spacing: 0; text-transform: none; color: {INK}; }}
.guide {{ display: grid; grid-template-columns: 1.05fr 1fr 1fr; gap: 9mm; margin-top: 6mm; font-size: 10.2pt; line-height: 1.42; }}
.guide h4 {{ font-family: 'Prata', serif; font-weight: 400; font-size: 17pt; line-height: 1.15; margin-bottom: 1.6mm; }}
.guide .key {{ display: flex; gap: 6mm; margin-top: 2.4mm; font-size: 9.6pt; align-items: center; }}
.guide .key svg {{ width: 7mm; height: 5mm; }}
.proof {{ margin-top: 5mm; border: .3mm dashed {INK}; padding: 2.6mm 4mm; font-size: 10.5pt; line-height: 1.4; }}
.proof b {{ font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; font-size: 9pt; margin-right: 2mm; }}
.cols {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 10mm; margin-top: 7mm; flex: 1; }}
.fam + .fam {{ margin-top: 8mm; }}
.fam h3 {{ font-family: 'Prata', serif; font-weight: 400; font-size: 22pt; line-height: 1.1; display: flex; align-items: center; gap: 2.4mm;
  border-top: .3mm solid {INK}; padding-top: 2.2mm; }}
.fam .sw {{ width: 3.2mm; height: 3.2mm; border-radius: 50%; display: inline-block; border: .2mm solid {INK}; flex: none; }}
.fam .fn {{ font-style: italic; font-size: 10pt; line-height: 1.35; color: {INK60}; margin-top: 1mm; }}
.axis, .r {{ display: grid; grid-template-columns: 82mm 1fr 14mm; align-items: center; column-gap: 2mm; }}
.axis {{ margin-top: 2.6mm; height: 5mm; }}
.axis .ticks {{ position: relative; height: 5mm; }}
.axis .ticks span {{ position: absolute; transform: translateX(-50%); bottom: 0; font-family: 'Flux', 'Afacad Flux', sans-serif; font-size: 7.4pt;
  letter-spacing: .04em; color: {INK60}; white-space: nowrap; }}
.r {{ height: 12.4mm; border-bottom: .15mm solid #DDDDDD; }}
.r .lab {{ display: grid; grid-template-columns: 27mm 24mm 1fr; align-items: center; column-gap: 1.6mm; }}
.r .nm {{ font-family: 'Prata', serif; font-size: 16pt; white-space: nowrap; }}
.r .lab sup, .r .lab sub {{ font-size: .72em; line-height: 0; }}
.r .cp {{ font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 500; font-size: 8pt; letter-spacing: .03em; color: {INK60}; white-space: nowrap; }}
.r .tx {{ font-style: italic; font-size: 10.6pt; line-height: 1.08; color: {INK}; }}
.r .tk svg {{ width: 100%; height: 5.6mm; display: block; }}
.r .val {{ font-family: 'Flux', 'Afacad Flux', sans-serif; font-size: 8.6pt; letter-spacing: .04em; text-align: right; color: {INK}; white-space: nowrap; }}
.colophon {{ margin-top: 6mm; border-top: .3mm solid {INK}; padding-top: 4mm; display: flex; align-items: center; gap: 7mm; }}
.colophon .qr svg {{ width: 24mm; height: 24mm; display: block; }}
.colophon .qrcap {{ font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 500; font-size: 8pt; letter-spacing: .18em; text-transform: uppercase; color: {INK60}; max-width: 44mm; line-height: 1.5; }}
.colophon .credits {{ flex: 1; font-size: 8.8pt; line-height: 1.42; color: {INK60}; }}
.colophon .sig {{ text-align: right; font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 500; font-size: 14pt; }}
.colophon .sig small {{ display: block; font-size: 8pt; letter-spacing: .2em; text-transform: uppercase; color: {INK60}; margin-top: 1mm; }}
"""

guide = f"""<div class="guide">
  <div><h4>How tightly it holds on</h4>Each receptor's mark sits where its own transmitter binds it. The scale runs in tenfold steps: further right is tighter. At a pK<sub>i</sub> of 9, a billionth of a mole per litre fills about half the receptors; at 5, it takes ten thousand times as much.</div>
  <div><h4>Two ways of measuring</h4>A filled mark is a binding constant, pK<sub>i</sub> or pK<sub>d</sub>: how much transmitter occupies half the receptors. An open mark is a potency, pEC<sub>50</sub>: how much switches on half the response, the usual measure for channels. A pale bar spans the studies.
    <div class="key"><span><svg viewBox="0 0 10 7"><ellipse cx="5" cy="3.5" rx="2" ry="3" fill="{INK60}" stroke="{INK}" stroke-width=".5"/></svg>binding</span><span><svg viewBox="0 0 10 7"><ellipse cx="5" cy="3.5" rx="2" ry="3" fill="#fff" stroke="{INK}" stroke-width=".5"/></svg>potency</span></div></div>
  <div><h4>Why they differ</h4>Channels at the synapse meet their transmitter in brief floods, and mostly keep a loose grip so that they let go at once. G-protein-coupled receptors, often further from where the transmitter is released, tend to hold on more tightly, and answer more slowly.</div>
</div>"""

HTML = f"""<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>The Receptors, poster</title><style>{CSS}</style></head><body><div class="poster">
<div class="brand">{logo_svg()}<span>VisualNeuroscience.AI</span></div>
<div class="kick">Microanatomy</div>
<h1>The Receptors</h1>
<p class="stand">{lead} of them, and how tightly each one holds the transmitter it answers to.</p>
<div class="dateline"><span>Affinity of the natural transmitter</span><span class="mid">further right holds tighter; each step is tenfold</span><span>visualneuroscience.ai</span></div>
{guide}
{proof_banner}
<div class="cols">{"".join('<div class="col">' + "".join(family(g) for g in col) + '</div>' for col in COLUMNS)}</div>
<footer class="colophon">
  <div class="qr">{qr_svg(URL)}</div>
  <div class="qrcap">Every receptor here, drawn and explained, at visualneuroscience.ai</div>
  <div class="credits">Affinities: IUPHAR/BPS Guide to PHARMACOLOGY (guidetopharmacology.org; Harding SD et al., Nucleic Acids Res 2024), the endogenous transmitter at each receptor, human where measured, the median of the studies listed with their spread. The database is available under the Open Database Licence and its contents under CC BY-SA 4.0. Receptors, couplings and families from the Microanatomy page of VisualNeuroscience.AI. Set in Flux, Newsreader and Prata, with Noto for Greek.</div>
  <div class="sig">VisualNeuroscience.AI<small>&copy; 2026 Fadil Karim</small></div>
</footer>
</div></body></html>"""
open(os.path.join(OUT, "rx_poster.html"), "w").write(HTML)
print("wrote rx_poster.html", "(layout proof, no affinity data)" if PROOF else f"with {len(AFF)} affinities", n_rx, "receptors")
