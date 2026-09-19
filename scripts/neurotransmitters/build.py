"""Draw the neurotransmitters for the Microanatomy page.

usage: python3 build.py            (needs rdkit: pip install rdkit)

Writes site/assets/nt/molecules.json, which site/assets/nt.js reads to lay
the Neurotransmitters section out: each molecule as a skeletal formula in
SVG, with its name, class, formula and a few lines on what it does.

The drawings are made by RDKit from SMILES and then stripped to the bones:
no header, no background, no fixed size, and every colour swapped for one
of the page's custom properties, so the formulas follow the light and dark
themes like the cell plates do. Carbon skeleton in the page's ink; nitrogen,
oxygen, sulfur and phosphorus in the colours chemists expect.
"""
import json, os, re
from rdkit import Chem
from rdkit.Chem import rdDepictor
from rdkit.Chem.Draw import rdMolDraw2D
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

# stand-in colours, each swapped for a custom property once the SVG is
# drawn; every colour in the output is matched to the nearest of these
INK = (0.11, 0.10, 0.09)
PALETTE = {6: INK, 1: INK, 7: (0.0, 0.0, 1.0), 8: (1.0, 0.0, 0.0), 16: (0.8, 0.8, 0.0), 15: (1.0, 0.5, 0.0)}
SWAP = {INK: "var(--ink)", PALETTE[7]: "var(--el-n)", PALETTE[8]: "var(--el-o)", PALETTE[16]: "var(--el-s)", PALETTE[15]: "var(--el-p)"}

GROUPS = [
 dict(id="amino", kind="amino acid", name="Amino acids", note="The workhorses. Between them glutamate and GABA carry most of the brain's signalling, and both are made from the same metabolic pool.",
  items=[
   ("glutamate", "Glutamate", "N[C@@H](CCC(=O)O)C(=O)O", "the main excitatory transmitter",
    "Released at the great majority of excitatory synapses in the brain. It acts on AMPA and NMDA receptors to depolarise the next cell, and on metabotropic receptors to tune the synapse. Too much of it, for too long, kills neurons, which is what happens in a stroke."),
   ("gaba", "GABA", "NCCCC(=O)O", "the main inhibitory transmitter",
    "Gamma-aminobutyric acid, made from glutamate in one enzymatic step. At GABA-A receptors it opens a chloride channel and quietens the cell; benzodiazepines, barbiturates and alcohol all work by helping it along."),
   ("glycine", "Glycine", "NCC(=O)O", "inhibition in the spinal cord and brainstem",
    "The simplest amino acid and the chief inhibitory transmitter below the brain, where it opens chloride channels of its own. Strychnine blocks them, which is why it causes convulsions. In the brain it also has to be present for NMDA receptors to open."),
   ("aspartate", "Aspartate", "N[C@@H](CC(=O)O)C(=O)O", "a second excitatory amino acid",
    "Glutamate's shorter cousin, excitatory at NMDA receptors. Whether it is a transmitter in its own right or a bystander in glutamate's pathways is still argued about."),
   ("dserine", "D-Serine", "N[C@H](CO)C(=O)O", "the co-agonist at NMDA receptors",
    "The mirror-image form of serine, made by astrocytes and neurons. An NMDA receptor will not open for glutamate alone: it needs D-serine or glycine at a second site as well."),
  ]),
 dict(id="ach", kind="ester", name="Acetylcholine", note="The first neurotransmitter ever identified, in 1921, and the one every motor neuron uses to speak to a muscle.",
  items=[
   ("acetylcholine", "Acetylcholine", "CC(=O)OCC[N+](C)(C)C", "muscle, memory and the autonomic nervous system",
    "An ester of acetic acid and choline, broken down within a millisecond by acetylcholinesterase. It drives every skeletal muscle through nicotinic receptors, runs much of the autonomic nervous system through muscarinic ones, and in the brain sets the tone for attention and memory. Nerve agents and many insecticides block the enzyme that clears it."),
  ]),
 dict(id="monoamine", kind="monoamine", name="Monoamines", note="Made from single amino acids by a handful of enzymes, and released from a few small nuclei whose axons reach the whole brain, which is why each one sets a mood rather than sending a message.",
  items=[
   ("dopamine", "Dopamine", "NCCc1ccc(O)c(O)c1", "reward, movement and motivation",
    "Made from tyrosine, largely in the substantia nigra and the ventral tegmental area. The nigral cells feed the striatum and are lost in Parkinson's disease; the tegmental cells signal the prediction of reward and are what most drugs of abuse act on."),
   ("noradrenaline", "Noradrenaline", "NC[C@H](O)c1ccc(O)c(O)c1", "arousal and vigilance",
    "Norepinephrine, one hydroxyl on from dopamine. Almost all of the brain's supply comes from the locus coeruleus, a few thousand cells in the pons whose axons reach nearly everywhere. It sharpens attention, raises heart rate and blood pressure, and is the first thing to go up when something alarming happens."),
   ("adrenaline", "Adrenaline", "CNC[C@H](O)c1ccc(O)c(O)c1", "the emergency hormone, and a minor transmitter",
    "Epinephrine, noradrenaline with a methyl group added. Mostly a hormone from the adrenal medulla, but a few brainstem neurons use it as a transmitter to regulate blood pressure and breathing."),
   ("serotonin", "Serotonin", "NCCc1c[nH]c2ccc(O)cc12", "mood, sleep, appetite and much else",
    "5-hydroxytryptamine, made from tryptophan in the raphe nuclei of the brainstem. Its receptors come in fourteen kinds, which is why it touches so many things: mood, sleep, appetite, pain, nausea. Most antidepressants work by slowing its reuptake. Ninety per cent of the body's serotonin is in the gut, not the brain."),
   ("histamine", "Histamine", "NCCc1c[nH]cn1", "wakefulness",
    "Made from histidine in the tuberomammillary nucleus of the hypothalamus, and released across the cortex to keep it awake. Antihistamines that cross into the brain make people drowsy for exactly this reason."),
  ]),
 dict(id="purine", kind="purine", name="Purines", note="The cell's energy currency doubles as a signal: ATP released with other transmitters, and the adenosine it breaks down to.",
  items=[
   ("adenosine", "Adenosine", "Nc1ncnc2c1ncn2[C@@H]1O[C@H](CO)[C@@H](O)[C@H]1O", "the brake that builds through the day",
    "Not stored in vesicles but made wherever ATP is used and broken down. It accumulates during waking and damps neurons through A1 and A2A receptors, which is a large part of why sleep pressure rises. Caffeine works by blocking those receptors."),
   ("atp", "ATP", "Nc1ncnc2c1ncn2[C@@H]1O[C@H](COP(=O)(O)OP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]1O", "co-released, and a signal of injury",
    "Adenosine triphosphate is packed into vesicles alongside other transmitters and acts on P2X and P2Y receptors. Released in quantity from damaged cells, it is one of the signals that summons microglia and starts pain."),
  ]),
 dict(id="lipid", kind="endocannabinoid", name="Endocannabinoids", note="Made on demand from membrane lipids, and sent backwards: from the receiving cell to the sending one, to tell it to release less.",
  items=[
   ("anandamide", "Anandamide", "CCCCC/C=C\\C/C=C\\C/C=C\\C/C=C\\CCCC(=O)NCCO", "the brain's own cannabinoid",
    "Arachidonoylethanolamide, named from the Sanskrit for bliss. A fatty acid joined to ethanolamine, acting on the same CB1 receptor that THC does. It is made when a neuron is strongly active and reaches back across the synapse to quieten the input."),
   ("2ag", "2-Arachidonoylglycerol", "CCCCC/C=C\\C/C=C\\C/C=C\\C/C=C\\CCCC(=O)OC(CO)CO", "the more abundant endocannabinoid",
    "2-AG, the same fatty acid on a glycerol backbone, present in the brain at far higher levels than anandamide and the main signal at CB1 receptors. Like anandamide it is made from the membrane as needed rather than stored."),
  ]),
 dict(id="gas", kind="gas", name="A gas", note="Not stored, not released from vesicles, not acting on a receptor at the surface: it is made on demand and simply diffuses into the next cell.",
  items=[
   ("no", "Nitric oxide", "[N]=O", "a messenger that passes straight through membranes",
    "Made from arginine by nitric oxide synthase when calcium enters a cell, and gone in seconds. It drifts into neighbouring cells, including the one that fired first, and switches on guanylate cyclase there. It also relaxes blood vessels, which is what nitroglycerin and sildenafil make use of."),
  ]),
 dict(id="peptide", kind="neuropeptide", name="A neuropeptide", note="Short chains of amino acids, cut from larger precursor proteins, packed in large dense-core vesicles and released only when a neuron fires hard. There are over a hundred; one is drawn to show the scale.",
  items=[
   ("enkephalin", "Met-enkephalin", "N[C@@H](Cc1ccc(O)cc1)C(=O)NCC(=O)NCC(=O)N[C@@H](Cc1ccccc1)C(=O)N[C@@H](CCSC)C(=O)O", "five amino acids: the body's own opioid",
    "Tyr-Gly-Gly-Phe-Met, one of the endogenous opioids, acting on the same receptors morphine does. Released in the spinal cord and the periaqueductal grey to blunt pain, and in the striatum and the nucleus accumbens where it colours reward. The same tyrosine on the end is what every opioid peptide, and morphine itself, uses to fit the receptor."),
  ]),
]

def draw(smiles, name):
    m = Chem.MolFromSmiles(smiles)
    rdDepictor.SetPreferCoordGen(True)
    rdDepictor.Compute2DCoords(m)
    d = rdMolDraw2D.MolDraw2DSVG(320, 220)
    o = d.drawOptions()
    o.clearBackground = False
    o.includeMetadata = False
    o.bondLineWidth = 1.6
    o.padding = 0.08
    o.fixedBondLength = 30
    o.fixedFontSize = 14
    o.addStereoAnnotation = False
    o.setAtomPalette(PALETTE)
    d.DrawMolecule(m)
    d.FinishDrawing()
    s = d.GetDrawingText()
    s = s.split("<!-- END OF HEADER -->")[1] if "<!-- END OF HEADER -->" in s else s
    s = s.rsplit("</svg>", 1)[0]
    def swap(m):
        r, g, b = (int(m.group(0)[k:k + 2], 16) / 255 for k in (1, 3, 5))
        near = min(PALETTE.values(), key=lambda c: (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2)
        return SWAP[near]
    s = re.sub(r"#[0-9a-f]{6}", swap, s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip()
    svg = (f'<svg class="mol" viewBox="0 0 320 220" role="img" aria-label="Skeletal formula of {name}">' + s + "</svg>")
    return svg, CalcMolFormula(m)

out = {"groups": []}
n = 0
for g in GROUPS:
    items = []
    for mid, name, smi, role, desc in g["items"]:
        svg, formula = draw(smi, name)
        items.append(dict(id=mid, name=name, role=role, formula=formula, desc=desc, svg=svg))
        n += 1
    out["groups"].append(dict(id=g["id"], name=g["name"], kind=g["kind"], note=g["note"], items=items))

here = os.path.dirname(os.path.abspath(__file__))
dest = os.path.normpath(os.path.join(here, "..", "..", "site", "assets", "nt"))
os.makedirs(dest, exist_ok=True)
with open(os.path.join(dest, "molecules.json"), "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=0)
    fh.write("\n")
print("wrote", os.path.join(dest, "molecules.json"), "with", n, "molecules in", len(GROUPS), "groups,", os.path.getsize(os.path.join(dest, "molecules.json")), "bytes")
