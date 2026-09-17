"""Build the multipolar neuron for the Microanatomy page from the seeded geometry.

usage: python3 build.py [seed]      (default seed 12)

Writes two files into site/assets/cells/, which site/assets/cells.js fetches
and site/microanatomy.html paints:

  multipolar-neuron.svg   the interactive drawing: click targets carry
                          data-part, recolourable pieces carry data-vis
  multipolar-neuron.json  the seventeen structures, each with its accent,
                          its label anchor and position, and its text

Seed 12 reproduces the drawing the page ships. Needs numpy and shapely."""
import sys, json, os
from neuron import compose
import emit
from parts_text import TEXT

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.normpath(os.path.join(here, "..", "..", "..", "site", "assets", "cells"))
seed = int(sys.argv[1]) if len(sys.argv) > 1 else 12

G = compose(seed, verbose=True); G.pop("gw", None)
inner, ACC = emit.build(G)
A = emit.anchors(G); L = emit.labels(G, A)
parts = []
for pid, name in emit.PARTS:
    d = dict(id=pid, name=name, acc=ACC[pid], anchor=A[pid], label=L[pid]); d.update(TEXT[pid]); parts.append(d)

svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 780" role="group" '
       'aria-label="Multipolar neuron with an astrocyte and two incoming synapses">'
       '<!-- An original drawing of a large multipolar neuron, generated from code by scripts/cells/multipolar-neuron. '
       'Every structure that can be clicked carries data-part; what recolours carries data-vis. Painted by the page that loads it. -->'
       + inner + '</svg>\n')
doc = {"cell": "multipolar-neuron", "name": "Multipolar neuron", "centre": [648, 392], "parts": parts}

os.makedirs(out, exist_ok=True)
with open(os.path.join(out, "multipolar-neuron.svg"), "w", encoding="utf-8") as f:
    f.write(svg)
with open(os.path.join(out, "multipolar-neuron.json"), "w", encoding="utf-8") as f:
    f.write(json.dumps(doc, ensure_ascii=False, indent=1) + "\n")
print("wrote", out, "multipolar-neuron.svg", len(svg), "bytes, and multipolar-neuron.json with", len(parts), "parts")
