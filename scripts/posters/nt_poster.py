"""The neurotransmitters poster, A1 portrait, for white matte paper.

    python nt_poster.py   ->  out/nt_poster.html (then render.js makes the PDF)

The seventeen molecules and their words come from the site's own build
script (scripts/neurotransmitters/build.py), so the poster says what the
Microanatomy page says. Every molecule is drawn at the same bond length."""
import html
from common import *

BOND = 7.0          # mm per bond in the grid: nearly fifty million times life size
PATH_BOND = 6.0     # mm per bond in the pathways band
DRAW_W, DRAW_H = 96.0, 56.0   # the drawing box inside a tile, in mm
URL = "https://visualneuroscience.ai/microanatomy.html#neurotransmitters"

groups = load_site_molecules()
KIND = {"amino acid": "Amino acid", "ester": "Ester", "monoamine": "Monoamine", "purine": "Purine",
        "endocannabinoid": "Endocannabinoid", "gas": "Gas", "neuropeptide": "Neuropeptide"}

# the one molecule whose usual layout will not lie flat in a tile: ATP's
# CoordGen layout turned 30 degrees, chosen as the least crowded that fits
LAYOUT = {"atp": (True, 30)}
# the peptide takes two columns: it is the one drawn to show the scale
WIDE = {"enkephalin"}

def tile(kind, mid, name, smi, role, desc):
    f, mw, heavy = mol_facts(smi)
    wide = mid in WIDE
    fit = (DRAW_W * 2 + 10.0 if wide else DRAW_W, DRAW_H)
    return f"""<article class="tile{' wide' if wide else ''}" id="t-{mid}">
  <div class="ck">{KIND[kind]} <span class="dot">&middot;</span> <span class="lc">{formula_html(f)} <span class="dot">&middot;</span> {mw:.2f} g/mol</span></div>
  <div class="draw">{draw_mol(smi, name, bond_mm=BOND, fit=fit, layout=LAYOUT.get(mid))}</div>
  <h3 class="cn">{html.escape(name)}</h3>
  <p class="cs">{html.escape(role)}</p>
  <p class="cd">{html.escape(desc)}</p>
</article>"""

tiles = []
for g in groups:
    for mid, name, smi, role, desc in g["items"]:
        tiles.append(tile(g["kind"], mid, name, smi, role, desc))

key_tile = f"""<article class="tile note">
  <div class="ck">Key</div>
  <h3 class="cn">How to read them</h3>
  <p class="cd">Each corner, and each free end of a line, is a carbon atom; the hydrogens on carbon are left out. Every other atom is written in, in the colours chemists use:</p>
  <ul class="els">
    <li><b style="color:{EL[7]}">N</b> nitrogen</li><li><b style="color:{EL[8]}">O</b> oxygen</li>
    <li><b style="color:{EL[16]}">S</b> sulfur</li><li><b style="color:{EL[15]}">P</b> phosphorus</li>
  </ul>
  <p class="cd">A double line is a double bond. A solid wedge comes out of the page towards you; a hashed one goes back behind it.</p>
  <p class="cd">Every molecule is drawn with the same bond length, {BOND:.0f}&nbsp;mm for a bond about 0.15&nbsp;nanometres long: nearly fifty million times life size, so their sizes compare. Glycine has five atoms heavier than hydrogen; met-enkephalin has forty.</p>
  <svg class="bar" viewBox="0 0 100 14" width="{BOND*4:.0f}mm" height="{14*BOND*4/100:.1f}mm">
    <line x1="0" y1="7" x2="25" y2="7" stroke="{INK}" stroke-width="2.4"/><line x1="25" y1="7" x2="100" y2="7" stroke="{INK35}" stroke-width="1.2" stroke-dasharray="3 3"/>
    <line x1="0" y1="2" x2="0" y2="12" stroke="{INK}" stroke-width="1.2"/><line x1="25" y1="2" x2="25" y2="12" stroke="{INK}" stroke-width="1.2"/>
  </svg>
  <p class="barcap">One bond, {BOND:.0f}&nbsp;mm &asymp; 0.15&nbsp;nm</p>
</article>"""

families_tile = """<article class="tile note">
  <div class="ck">Classes</div>
  <h3 class="cn">Seven families</h3>
  <ul class="fam">
    <li><b>Amino acids.</b> Glutamate excites, GABA and glycine inhibit: most of the brain's fast signalling.</li>
    <li><b>Acetylcholine.</b> The first transmitter identified, in 1921, and every motor neuron's.</li>
    <li><b>Monoamines.</b> Each made from a single amino acid and sent from a few small nuclei across the whole brain.</li>
    <li><b>Purines.</b> ATP, the cell's energy currency, released as a signal, and adenosine, what it breaks down to.</li>
    <li><b>Endocannabinoids.</b> Made on demand from membrane lipids, and sent backwards across the synapse.</li>
    <li><b>A gas.</b> Nitric oxide, made on demand, diffusing straight through membranes.</li>
    <li><b>Neuropeptides.</b> Over a hundred short chains of amino acids; one is drawn here to show the scale.</li>
  </ul>
</article>"""

# ── where they come from ────────────────────────────────────────────────
P = {
 "L-Tyrosine": "N[C@@H](Cc1ccc(O)cc1)C(=O)O", "L-DOPA": "N[C@@H](Cc1ccc(O)c(O)c1)C(=O)O",
 "Dopamine": "NCCc1ccc(O)c(O)c1", "Noradrenaline": "NC[C@H](O)c1ccc(O)c(O)c1", "Adrenaline": "CNC[C@H](O)c1ccc(O)c(O)c1",
 "L-Tryptophan": "N[C@@H](Cc1c[nH]c2ccccc12)C(=O)O", "5-HTP": "N[C@@H](Cc1c[nH]c2ccc(O)cc12)C(=O)O",
 "Serotonin": "NCCc1c[nH]c2ccc(O)cc12", "Melatonin": "CC(=O)NCCc1c[nH]c2ccc(OC)cc12",
 "L-Histidine": "N[C@@H](Cc1c[nH]cn1)C(=O)O", "Histamine": "NCCc1c[nH]cn1",
 "L-Glutamine": "N[C@@H](CCC(N)=O)C(=O)O", "Glutamate": "N[C@@H](CCC(=O)O)C(=O)O", "GABA": "NCCCC(=O)O",
 "Choline": "C[N+](C)(C)CCO", "Acetylcholine": "CC(=O)OCC[N+](C)(C)C", "Acetate": "CC(=O)[O-]",
 "L-Arginine": "N[C@@H](CCCNC(N)=N)C(=O)O", "Nitric oxide": "[N]=O", "L-Citrulline": "N[C@@H](CCCNC(N)=O)C(=O)O",
}
def pm(name, label=None):
    return f'<figure class="pm">{draw_mol(P[name], name, bond_mm=PATH_BOND, font_mm=2.9, line_mm=0.34)}<figcaption>{html.escape(label or name)}</figcaption></figure>'
def arrow(enzyme):
    return (f'<div class="arr"><span class="enz">{enzyme}</span>'
            f'<svg viewBox="0 0 100 10" preserveAspectRatio="none"><line x1="0" y1="5" x2="92" y2="5" stroke="{INK}" stroke-width="1.6"/>'
            f'<polygon points="100,5 90,1 90,9" fill="{INK}"/></svg></div>')
def plus(txt="+"):
    return f'<div class="plus">{txt}</div>'
def chain(title, parts, cls=""):
    return f'<section class="chain {cls}"><div class="ck">{title}</div><div class="row">{"".join(parts)}</div></section>'

catechol = chain("Catecholamines, from tyrosine", [pm("L-Tyrosine"), arrow("tyrosine hydroxylase"), pm("L-DOPA"),
       arrow("aromatic L-amino acid decarboxylase"), pm("Dopamine"), arrow("dopamine &beta;-hydroxylase"),
       pm("Noradrenaline"), arrow("phenylethanolamine N-methyltransferase"), pm("Adrenaline")])
indole = chain("Indolamines, from tryptophan", [pm("L-Tryptophan"), arrow("tryptophan hydroxylase"), pm("5-HTP"),
       arrow("aromatic L-amino acid decarboxylase"), pm("Serotonin"), arrow("two steps in the pineal gland"), pm("Melatonin")])
glu = chain("Glutamate and GABA, from glutamine", [pm("L-Glutamine"), arrow("glutaminase"), pm("Glutamate"),
       arrow("glutamate decarboxylase"), pm("GABA")])
his = chain("Histamine, from histidine", [pm("L-Histidine"), arrow("histidine decarboxylase"), pm("Histamine")])
ach = chain("Acetylcholine, made and unmade", [pm("Choline"), plus("+ acetyl-CoA"), arrow("choline acetyltransferase"),
       pm("Acetylcholine"), arrow("acetylcholinesterase, in the cleft"), pm("Choline"), plus("+"), pm("Acetate")])
no = chain("Nitric oxide, from arginine", [pm("L-Arginine"), arrow("nitric oxide synthase"), pm("Nitric oxide"), plus("+"), pm("L-Citrulline")])
ROWS = [[catechol, his], [indole, glu], [ach, no]]

CSS = f"""
{font_css()}
@page {{ size: 594mm 841mm; margin: 0; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
html, body {{ background: {PAPER}; }}
body {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
.poster {{ width: 594mm; height: 841mm; padding: 20mm 24mm 16mm; color: {INK};
  font-family: 'Newsreader', serif; display: flex; flex-direction: column; }}
.brand {{ display: flex; justify-content: center; align-items: center; gap: 4.2mm;
  font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 500; font-size: 30pt; letter-spacing: .01em; }}
.brand svg {{ width: 12mm; height: 12mm; }}
.kick {{ text-align: center; font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 500; font-size: 11pt;
  letter-spacing: .32em; text-transform: uppercase; margin-top: 7mm; }}
h1 {{ font-family: 'Prata', serif; font-weight: 400; font-size: 122pt; line-height: 1; text-align: center;
  letter-spacing: -.005em; margin-top: 3mm; }}
.stand {{ font-style: italic; font-size: 21pt; line-height: 1.32; text-align: center; color: {INK};
  max-width: 400mm; margin: 5mm auto 0; }}
.dateline {{ display: flex; justify-content: space-between; align-items: baseline; margin-top: 8mm;
  border-top: .3mm solid {INK}; border-bottom: .3mm solid {INK}; padding: 2.6mm 1mm;
  font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 500; font-size: 9.5pt; letter-spacing: .26em;
  text-transform: uppercase; color: {INK60}; }}
.dateline .mid {{ font-family: 'Newsreader', serif; font-style: italic; font-size: 13pt; letter-spacing: 0;
  text-transform: none; color: {INK}; }}
.grid {{ display: grid; grid-template-columns: repeat(5, 1fr); gap: 4.5mm; margin-top: 6mm; }}
.tile {{ border: .25mm solid {INK}; padding: 4mm 4.2mm 4.6mm; display: flex; flex-direction: column; }}
.ck {{ font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 500; font-size: 7.6pt; letter-spacing: .2em;
  text-transform: uppercase; color: {INK60}; }}
.ck sub, .ck sup {{ font-size: 70%; letter-spacing: 0; }}
.ck .dot {{ margin: 0 .25em; }}
.ck .lc {{ text-transform: none; letter-spacing: .08em; }}
.draw {{ height: 56mm; display: flex; align-items: center; justify-content: center; margin: 1mm 0 2mm; }}
.cn {{ font-family: 'Prata', serif; font-weight: 400; font-size: 21pt; line-height: 1.1; }}
.cs {{ font-style: italic; font-size: 11.5pt; line-height: 1.3; color: {INK60}; margin-top: 1mm; }}
.cd {{ font-size: 9.6pt; line-height: 1.38; margin-top: 2.6mm; hyphens: auto; }}
.note .cn {{ margin-top: 2.4mm; }}
.wide {{ grid-column: span 2; }}
.note .cd + .cd {{ margin-top: 2mm; }}
.els {{ list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 1.4mm 4mm; margin-top: 3mm; font-size: 10.5pt; }}
.els b {{ font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 600; font-size: 13pt; margin-right: 1.6mm; }}
.bar {{ display: block; margin-top: 4mm; }}
.barcap {{ font-family: 'Flux', 'Afacad Flux', sans-serif; font-size: 8pt; letter-spacing: .14em; text-transform: uppercase; color: {INK60}; margin-top: 1.2mm; }}
.fam {{ list-style: none; margin-top: 2.6mm; font-size: 9.4pt; line-height: 1.34; }}
.fam li + li {{ margin-top: 1.5mm; }}
.fam b {{ font-weight: 500; }}
.paths {{ margin-top: 7mm; border-top: .3mm solid {INK}; padding-top: 4mm; }}
.paths h2 {{ font-family: 'Prata', serif; font-weight: 400; font-size: 34pt; line-height: 1.05; }}
.paths .lede {{ font-style: italic; font-size: 13pt; color: {INK60}; margin-top: 1.2mm; }}
.prow {{ display: grid; grid-template-columns: 352mm 1fr; column-gap: 12mm; align-items: start; margin-top: 4mm; }}
.chain .row {{ display: flex; align-items: center; gap: 2.2mm; margin-top: 2mm; }}
.pm {{ display: flex; flex-direction: column; align-items: center; }}
.pm figcaption {{ font-size: 9.5pt; line-height: 1.15; margin-top: .8mm; text-align: center; white-space: nowrap; }}
.arr {{ width: 27mm; display: flex; flex-direction: column; align-items: center; }}
.arr .enz {{ font-style: italic; font-size: 8.6pt; line-height: 1.15; text-align: center; color: {INK60}; min-height: 7.5mm;
  display: flex; align-items: flex-end; }}
.arr svg {{ width: 27mm; height: 2.6mm; margin-top: .6mm; }}
.plus {{ font-size: 11pt; color: {INK}; white-space: nowrap; }}
.colophon {{ margin-top: auto; border-top: .3mm solid {INK}; padding-top: 4mm; display: flex; align-items: center; gap: 7mm; }}
.colophon .qr svg {{ width: 24mm; height: 24mm; display: block; }}
.colophon .qrcap {{ font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 500; font-size: 8pt; letter-spacing: .18em;
  text-transform: uppercase; color: {INK60}; max-width: 44mm; line-height: 1.5; }}
.colophon .credits {{ flex: 1; font-size: 8.8pt; line-height: 1.42; color: {INK60}; }}
.colophon .sig {{ text-align: right; font-family: 'Flux', 'Afacad Flux', sans-serif; font-weight: 500; font-size: 14pt; }}
.colophon .sig small {{ display: block; font-size: 8pt; letter-spacing: .2em; text-transform: uppercase; color: {INK60}; margin-top: 1mm; }}
"""

HTML = f"""<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><title>The Neurotransmitters, poster</title>
<style>{CSS}</style></head><body><div class="poster">
<div class="brand">{logo_svg()}<span>VisualNeuroscience.AI</span></div>
<div class="kick">Microanatomy</div>
<h1>The Neurotransmitters</h1>
<p class="stand">Seventeen molecules, from a gas of two atoms to a chain of five amino acids, carry nearly everything one neuron says to the next.</p>
<div class="dateline"><span>Skeletal formulas</span><span class="mid">every molecule drawn to the same scale</span><span>visualneuroscience.ai</span></div>
<div class="grid">
{"".join(tiles)}
{key_tile}
{families_tile}
</div>
<section class="paths">
  <h2>Where they come from</h2>
  <p class="lede">Most are a few enzymes away from an ordinary amino acid or nutrient. Drawn smaller, at {PATH_BOND:.0f}&nbsp;mm a bond.</p>
  {"".join('<div class="prow">' + "".join(r) + '</div>' for r in ROWS)}
</section>
<footer class="colophon">
  <div class="qr">{qr_svg(URL)}</div>
  <div class="qrcap">The same molecules, and the receptors they act on, at visualneuroscience.ai</div>
  <div class="credits">Skeletal formulas drawn with RDKit from SMILES, every one at the same bond length, with formulas and average molar masses computed by RDKit for the forms drawn. Words from the Microanatomy page of VisualNeuroscience.AI. Set in Flux, Newsreader and Prata, with Noto for Greek.</div>
  <div class="sig">VisualNeuroscience.AI<small>&copy; 2026 Fadil Karim</small></div>
</footer>
</div></body></html>"""

open(os.path.join(OUT, "nt_poster.html"), "w").write(HTML)
print("wrote nt_poster.html", len(HTML) // 1024, "KB,", len(tiles), "molecules")
