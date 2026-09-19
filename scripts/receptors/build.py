"""Build the Receptors and channels section for the Microanatomy page.

usage: python3 build.py            (standard library only)

Writes site/assets/rx/receptors.json, which site/assets/rx.js reads: the
kinds of receptor with what each kind means and a schematic of its
architecture, then the receptors, channels and transporters themselves,
grouped by the transmitter they answer to, each with its kind, what binds
it and how tightly, what it does when bound, and a line of context.

The schematics are drawn here as SVG templates, one per architecture, with
no colours of their own: the page paints them through its custom
properties. Each carries text slots (data-slot) that rx.js fills with the
molecule's own ligand, ion and G protein, so one drawing serves a family.

The text is uncited textbook-level description, and the page says so.
"""
import json, os

# ── the kinds, and what each means ──────────────────────────────────────────
KINDS = {
 "iono_cat": dict(label="Ionotropic · cation channel", arch="lgic",
   means="A ligand-gated ion channel. The transmitter itself opens a pore through the receptor, cations rush in and the membrane depolarises. Fast, and over in milliseconds."),
 "iono_cl": dict(label="Ionotropic · chloride channel", arch="lgic",
   means="A ligand-gated ion channel that passes chloride. When the transmitter binds, chloride flows in and the cell is held down or shunted: inhibition, fast and brief."),
 "iglur": dict(label="Ionotropic · glutamate receptor", arch="iglur",
   means="A tetramer whose four clamshell domains each close on a glutamate; the pore opens for cations. Fast excitation, and the machinery of most synaptic plasticity."),
 "gs": dict(label="Metabotropic · GPCR, Gs", arch="gpcr",
   means="A G-protein-coupled receptor: seven helices through the membrane and no pore. Binding changes its shape and switches on a G protein inside. Gs raises cAMP, which turns on protein kinase A. Slower than a channel, and its effects last."),
 "gi": dict(label="Metabotropic · GPCR, Gi/o", arch="gpcr",
   means="A G-protein-coupled receptor working through Gi/o: it lowers cAMP, opens K⁺ channels and closes Ca²⁺ channels. The net effect is to quieten the cell or the terminal it sits on."),
 "gq": dict(label="Metabotropic · GPCR, Gq", arch="gpcr",
   means="A G-protein-coupled receptor working through Gq: it splits a membrane lipid into IP₃ and DAG, releasing Ca²⁺ from stores and turning on protein kinase C. Usually excitatory, and slow."),
 "voltage": dict(label="Voltage-gated channel", arch="vgc",
   means="Not a receptor: nothing binds it. A charged helix in each domain senses the membrane potential and pulls the gate open when the cell depolarises. These are what turn a receptor's small voltage change into an action potential, or let Ca²⁺ in to release transmitter."),
 "leak": dict(label="Background channel", arch="pore",
   means="A channel open at rest, or gated from inside the cell rather than by a transmitter. These set the resting potential and how easily a cell fires."),
 "cak": dict(label="Ca²⁺-activated K⁺ channel", arch="pore",
   means="A potassium channel opened by calcium arriving inside the cell. It follows every burst of activity with a pause, and shapes how fast a neuron can fire."),
 "transporter": dict(label="Transporter", arch="carrier",
   means="Not a receptor: a carrier that binds the transmitter and hauls it across a membrane, one molecule per cycle, driven by an ion gradient. Reuptake transporters end the signal; vesicular ones load the next one."),
}

# ── the drawings ───────────────────────────────────────────────────────────
def membrane():
    return ('<rect class="rxd-mem" x="0" y="104" width="320" height="44"/>'
            '<line class="rxd-hair" x1="0" x2="320" y1="104" y2="104"/><line class="rxd-hair" x1="0" x2="320" y1="148" y2="148"/>'
            '<text class="rxd-side" x="8" y="97">outside</text><text class="rxd-side" x="8" y="163">inside</text>')

def arrow_down(x, y0, y1, dashed_to=None):
    d = f'<path class="rxd-ion" d="M{x} {y0}V{y1}"/>'
    return d + f'<path class="rxd-ion rxd-head" d="M{x - 5} {y1 - 7}L{x} {y1}L{x + 5} {y1 - 7}"/>'

def arrow_up(x, y0, y1):
    return f'<path class="rxd-ion" d="M{x} {y0}V{y1}"/><path class="rxd-ion rxd-head" d="M{x - 5} {y1 + 7}L{x} {y1}L{x + 5} {y1 + 7}"/>'

def ball(x, y, r=7):
    return f'<circle class="rxd-lig" cx="{x}" cy="{y}" r="{r}"/>'

def slot(name, x, y, anchor="middle", cls="rxd-t"):
    return f'<text class="{cls}" data-slot="{name}" x="{x}" y="{y}" text-anchor="{anchor}"></text>'

def lgic():
    L = '<path class="rxd-body" d="M108 166V62Q108 34 132 34H146Q152 34 152 44V166Z"/>'
    R = '<path class="rxd-body" d="M212 166V62Q212 34 188 34H174Q168 34 168 44V166Z"/>'
    return (membrane() + L + R + ball(106, 70) + slot("ligand", 94, 74, "end") +
            arrow_down(160, 20, 176) + slot("ion", 172, 30, "start"))

def iglur():
    def sub(cx):
        return (f'<ellipse class="rxd-body" cx="{cx}" cy="38" rx="17" ry="13"/>'
                f'<path class="rxd-body" d="M{cx - 20} 80Q{cx - 20} 58 {cx} 58Q{cx + 20} 58 {cx + 20} 80Z"/>'
                f'<path class="rxd-body" d="M{cx - 20} 84Q{cx - 20} 104 {cx} 104Q{cx + 20} 104 {cx + 20} 84Z"/>'
                f'<rect class="rxd-body" x="{cx - 20}" y="106" width="40" height="60" rx="6"/>')
    return (membrane() + sub(130) + sub(190) + ball(130, 82, 6) + ball(190, 82, 6) +
            slot("ligand", 100, 86, "end") + arrow_down(160, 96, 178) + slot("ion", 216, 100, "start"))

def gpcr():
    helices = "".join(f'<rect class="rxd-body" x="{96 + i * 20}" y="98" width="13" height="56" rx="6"/>' for i in range(7))
    loops = "".join(f'<path class="rxd-hair" d="M{103 + i * 20} 98Q{113 + i * 20} 84 {123 + i * 20} 98"/>' for i in (0, 2, 4)) + \
            "".join(f'<path class="rxd-hair" d="M{103 + i * 20} 154Q{113 + i * 20} 168 {123 + i * 20} 154"/>' for i in (1, 3))
    g = ('<ellipse class="rxd-g" cx="140" cy="176" rx="24" ry="13"/>' + slot("g", 140, 180, "middle", "rxd-t rxd-tg") +
         '<ellipse class="rxd-g" cx="176" cy="182" rx="13" ry="9"/><text class="rxd-t rxd-tg" x="176" y="185" text-anchor="middle">β</text>'
         '<ellipse class="rxd-g" cx="196" cy="174" rx="9" ry="7"/><text class="rxd-t rxd-tg" x="196" y="177" text-anchor="middle">γ</text>')
    eff = '<path class="rxd-ion" d="M210 176H244"/><path class="rxd-ion rxd-head" d="M238 171L244 176L238 181"/>' + slot("effect", 250, 180, "start")
    return membrane() + helices + loops + ball(156, 88) + slot("ligand", 156, 70) + g + eff

def vgc():
    cols = ('<rect class="rxd-body" x="104" y="96" width="46" height="60" rx="8"/>'
            '<rect class="rxd-body" x="170" y="96" width="46" height="60" rx="8"/>')
    s4 = "".join(f'<text class="rxd-plus" x="{x}" y="{y}" text-anchor="middle">+</text>' for x in (118, 202) for y in (114, 128, 142))
    gate = '<path class="rxd-hair" d="M150 152L143 164"/><path class="rxd-hair" d="M170 152L177 164"/>'
    trace = '<path class="rxd-ion" d="M22 62H44V40H68"/><text class="rxd-t" x="22" y="32">ΔV</text>'
    return (membrane() + cols + s4 + gate + trace + arrow_down(160, 56, 186) + slot("ion", 172, 66, "start") +
            '<text class="rxd-side" x="118" y="90" text-anchor="middle">S4</text><text class="rxd-side" x="202" y="90" text-anchor="middle">S4</text>')

def pore():
    cols = ('<rect class="rxd-body" x="112" y="96" width="38" height="60" rx="8"/>'
            '<rect class="rxd-body" x="170" y="96" width="38" height="60" rx="8"/>')
    return membrane() + cols + arrow_up(160, 190, 62) + slot("ion", 172, 66, "start") + slot("ligand", 108, 176, "end")

def carrier():
    body = '<rect class="rxd-body" x="118" y="92" width="84" height="68" rx="16"/>'
    path = ('<path class="rxd-ion" d="M160 60V92"/><path class="rxd-ion" d="M160 160V186"/>'
            '<path class="rxd-ion rxd-head" d="M155 179L160 186L165 179"/>'
            '<path class="rxd-hair" d="M140 110Q160 126 140 142"/><path class="rxd-hair" d="M180 110Q160 126 180 142"/>')
    return (membrane() + body + path + ball(160, 62) + slot("ligand", 176, 66, "start") +
            '<circle class="rxd-co" cx="142" cy="66" r="4"/>' + slot("co", 134, 70, "end"))

ARCH = {k: f'<svg class="rxd" viewBox="0 0 320 200" role="img" aria-label="Schematic of a {n}">{f()}</svg>'
        for k, n, f in (("lgic", "ligand-gated ion channel", lgic), ("iglur", "ionotropic glutamate receptor", iglur),
                        ("gpcr", "G-protein-coupled receptor", gpcr), ("vgc", "voltage-gated ion channel", vgc),
                        ("pore", "background ion channel", pore), ("carrier", "transporter", carrier))}

# ── the receptors ──────────────────────────────────────────────────────────
# (id, name, kind, ligand label, ion or effect label, G label, binds, effect, note)
CAT = "Na⁺ K⁺"; CACA = "Na⁺ Ca²⁺"
G = {"gs": ("Gαs", "↑ cAMP"), "gi": ("Gαi/o", "↓ cAMP"), "gq": ("Gαq", "IP₃ · DAG")}
GROUPS = [
 ("glutamate", "Glutamate receptors", "The excitatory receptors. Three kinds of channel and eight G-protein-coupled receptors answer to the same transmitter, at different speeds.", [
  ("AMPA", "AMPA receptor", "iglur", "Glu", CAT, "", "Glutamate, with low affinity: it needs the millimolar burst a synapse releases, and lets go within a millisecond. AMPA itself is the selective agonist it is named for.",
   "Opens for Na⁺ and K⁺, depolarising the spine. GluA2-containing receptors exclude Ca²⁺; those without it let Ca²⁺ in.",
   "The workhorse of fast excitation. Adding and removing AMPA receptors from a spine is what long-term potentiation and depression mostly are."),
  ("NMDA", "NMDA receptor", "iglur", "Glu + Gly", "Ca²⁺ Na⁺", "", "Glutamate at the GluN2 subunits, with high affinity, and glycine or D-serine at GluN1, which must also be occupied. At rest a Mg²⁺ ion plugs the pore.",
   "Passes Ca²⁺ as well as Na⁺, but only once the membrane is already depolarised enough to expel the Mg²⁺: a coincidence detector for input and activity.",
   "The trigger for most synaptic plasticity, and the receptor ketamine, PCP and memantine block."),
  ("KAINATE", "Kainate receptor", "iglur", "Glu", CAT, "", "Glutamate, at an affinity between AMPA's and NMDA's; kainate, a seaweed toxin, is its selective agonist.",
   "A slower, smaller cation current than AMPA, on both sides of the synapse: postsynaptic in the hippocampus, presynaptic where it tunes release.",
   "Less abundant than the other two, and still the least understood."),
  ("MGLUR1", "mGluR1", "gq", "Glu", "", "Gαq", "Glutamate, with high affinity; group I with mGluR5. Sits at the edge of the synapse rather than under it, so it answers to strong or repeated release.",
   "Gq: IP₃, Ca²⁺ from stores, PKC; a slow excitatory current. In the cerebellum it drives long-term depression at parallel-fibre synapses.",
   "Concentrated in Purkinje cells and the thalamus."),
  ("MGLUR5", "mGluR5", "gq", "Glu", "", "Gαq", "Glutamate, high affinity; group I. Held at the synapse edge by Homer proteins, coupled to the NMDA receptor.",
   "Gq signalling, Ca²⁺ oscillations, and a boost to NMDA currents. Drives the protein synthesis behind some long-term depression.",
   "The receptor over-active in fragile X syndrome; the target of trials there and in addiction."),
  ("MGLUR2", "mGluR2", "gi", "Glu", "", "Gαi/o", "Glutamate, moderate affinity; group II. Presynaptic, and mostly outside the active zone, so it senses spill-over.",
   "Gi/o: lowers cAMP and reduces release from the terminal it sits on. An autoreceptor that turns the volume down.",
   "Agonists were tried as antipsychotics; the receptor is thick in the prefrontal cortex."),
  ("MGLUR3", "mGluR3", "gi", "Glu", "", "Gαi/o", "Glutamate; group II, and also on astrocytes, where it senses what the synapse spills.",
   "Gi/o: damps release and, in glia, sets off the release of growth factors.",
   "Variants are linked to schizophrenia risk."),
  ("MGLUR4", "mGluR4", "gi", "Glu", "", "Gαi/o", "Glutamate, low affinity; group III. Presynaptic, in the active zone.",
   "Gi/o: cuts release at the terminal. In the basal ganglia it damps the striatopallidal pathway.",
   "A target under study for Parkinson's disease."),
  ("MGLUR6", "mGluR6", "gi", "Glu", "", "Gαo", "Glutamate; group III. Found on one cell only: the ON bipolar cell of the retina.",
   "Gαo closes a cation channel (TRPM1), so the bipolar cell is inhibited by glutamate and depolarises when the photoreceptor stops releasing it in the light.",
   "The reason there is an ON pathway at all. Mutations cause congenital stationary night blindness."),
  ("MGLUR7", "mGluR7", "gi", "Glu", "", "Gαi/o", "Glutamate, with the lowest affinity of the family: it needs the concentration right inside the active zone, where it sits.",
   "Gi/o: a brake on release, engaged only during high-frequency firing.",
   "The most widespread of the group III receptors."),
  ("MGLUR8", "mGluR8", "gi", "Glu", "", "Gαi/o", "Glutamate, moderate affinity; group III, presynaptic.",
   "Gi/o: reduces release, in the hippocampus and the olfactory bulb among others.",
   "Studied in anxiety and in epilepsy."),
 ]),
 ("gaba", "GABA and glycine receptors", "The inhibitory receptors: two chloride channels and one G-protein-coupled receptor.", [
  ("GABAA", "GABA-A receptor", "iono_cl", "GABA", "Cl⁻", "", "GABA at two sites between the α and β subunits, opening at micromolar GABA. Benzodiazepines bind a separate site at the α–γ interface and make GABA more effective; barbiturates, neurosteroids, alcohol and propofol each have a site of their own.",
   "Opens for Cl⁻ within a millisecond. In a mature neuron chloride flows in and hyperpolarises or shunts the cell; in the newborn brain, where chloride is high inside, the same channel excites.",
   "A pentamer assembled from nineteen possible subunits; the mix decides where it sits and what drugs touch it. α5 in the hippocampus, α6 in cerebellar granule cells, δ-containing receptors outside the synapse for tonic inhibition."),
  ("GABAA_RHO", "GABA-A ρ receptor (GABA-C)", "iono_cl", "GABA", "Cl⁻", "", "GABA, with higher affinity than the ordinary GABA-A receptor and much slower to let go. Insensitive to benzodiazepines and to bicuculline.",
   "A small, sustained Cl⁻ current.",
   "Mostly in the retina, on bipolar cell terminals."),
  ("GABAB", "GABA-B receptor", "gi", "GABA", "", "Gαi/o", "GABA, with high affinity, and baclofen. Works only as a pair: GABA-B1 binds, GABA-B2 signals.",
   "Gi/o: opens GIRK K⁺ channels on the dendrite for a slow, long hyperpolarisation, and closes Ca²⁺ channels on terminals to cut release, of GABA itself included.",
   "The slow phase of inhibition; baclofen's target in spasticity."),
  ("GLYR", "Glycine receptor", "iono_cl", "Gly", "Cl⁻", "", "Glycine, high affinity, at the interfaces of a pentamer of α and β subunits; also taurine and β-alanine, weakly. Strychnine blocks it.",
   "Opens for Cl⁻: fast inhibition.",
   "The chief inhibitory receptor of the spinal cord and brainstem, on motor neurons among others. Mutations cause hyperekplexia, the startle disease."),
 ]),
 ("ach", "Acetylcholine receptors", "Two families that share nothing but the transmitter: the nicotinic channels, named for tobacco's alkaloid, and the muscarinic G-protein-coupled receptors, named for a mushroom's.", [
  ("NACHR_MUSCLE", "Nicotinic, muscle type", "iono_cat", "ACh", CAT, "", "Two acetylcholines, one at each α1 subunit interface, with micromolar affinity. Curare and α-bungarotoxin block it; the antibodies of myasthenia gravis destroy it.",
   "A large, fast cation current that depolarises the muscle fibre past threshold every time.",
   "The receptor at the neuromuscular junction, (α1)₂β1δε in the adult, and the first receptor ever isolated."),
  ("A4B2", "Nicotinic α4β2", "iono_cat", "ACh", CAT, "", "Acetylcholine and nicotine, both with high affinity: this is the receptor nicotine is addictive through. Varenicline is a partial agonist here.",
   "Cation current, and a rise in Ca²⁺ that boosts transmitter release from the terminals it sits on.",
   "The commonest nicotinic receptor in the brain, on dopamine neurons of the ventral tegmental area among many others."),
  ("A7", "Nicotinic α7", "iono_cat", "ACh", "Ca²⁺ Na⁺", "", "Acetylcholine with low affinity and choline as well; α-bungarotoxin blocks it. Desensitises within milliseconds.",
   "Unusually permeable to Ca²⁺ for a nicotinic receptor, so it signals like a second messenger as much as a channel.",
   "A homopentamer, dense in the hippocampus; on microglia it damps inflammation."),
  ("A3B4", "Nicotinic α3β4", "iono_cat", "ACh", CAT, "", "Acetylcholine, with moderate affinity; the ganglionic receptor, blocked by hexamethonium.",
   "Fast cation current.",
   "Carries every autonomic signal through its ganglion, and sits in the medial habenula, where it shapes nicotine aversion."),
  ("M1", "Muscarinic M1", "gq", "ACh", "", "Gαq", "Acetylcholine, with high affinity; pirenzepine is the selective antagonist.",
   "Gq: closes the M-type K⁺ channel and raises Ca²⁺, making the cell more excitable for seconds.",
   "The main muscarinic receptor of the cortex and hippocampus, and the one behind acetylcholine's part in memory."),
  ("M2", "Muscarinic M2", "gi", "ACh", "", "Gαi/o", "Acetylcholine, high affinity; methoctramine blocks it.",
   "Gi/o: opens GIRK K⁺ channels and lowers cAMP. On cholinergic terminals it is the autoreceptor that limits release; in the heart it slows the beat.",
   "The vagus nerve's receptor on the sinoatrial node."),
  ("M3", "Muscarinic M3", "gq", "ACh", "", "Gαq", "Acetylcholine, high affinity.",
   "Gq: Ca²⁺ release, contraction, secretion.",
   "Smooth muscle and glands: the receptor of salivation, bronchoconstriction and the bladder. Sparse in the brain."),
  ("M4", "Muscarinic M4", "gi", "ACh", "", "Gαi/o", "Acetylcholine, high affinity.",
   "Gi/o: lowers cAMP; on striatal neurons it opposes dopamine's D1 signal.",
   "Concentrated in the striatum; a target in trials for psychosis."),
  ("M5", "Muscarinic M5", "gq", "ACh", "", "Gαq", "Acetylcholine, high affinity.",
   "Gq signalling; on dopamine neurons it prolongs their firing and dopamine release.",
   "The rarest muscarinic receptor, on the dopamine cells of the midbrain and on cerebral blood vessels."),
 ]),
 ("dopamine", "Dopamine receptors", "Five G-protein-coupled receptors in two families: D1-like raise cAMP, D2-like lower it.", [
  ("D1", "Dopamine D1", "gs", "DA", "", "Gαs", "Dopamine, with low affinity, so it answers to the burst of release that follows an unexpected reward rather than the steady background level.",
   "Gs: raises cAMP, phosphorylating DARPP-32; on striatal direct-pathway neurons it says 'go'.",
   "The most abundant dopamine receptor, in the striatum, nucleus accumbens and prefrontal cortex."),
  ("D2", "Dopamine D2", "gi", "DA", "", "Gαi/o", "Dopamine, with high affinity, enough to sense the tonic level and to notice when it dips. Every antipsychotic blocks it; the potency of the older ones tracks their D2 affinity exactly.",
   "Gi/o: lowers cAMP, opens K⁺ channels; on indirect-pathway neurons it releases the brake, and on dopamine neurons themselves it is the autoreceptor.",
   "Its short isoform is the autoreceptor, the long one the postsynaptic receptor. Thick in the striatum and the pituitary."),
  ("D3", "Dopamine D3", "gi", "DA", "", "Gαi/o", "Dopamine, with the highest affinity of the five.",
   "Gi/o signalling, like D2.",
   "Confined to the limbic striatum: nucleus accumbens, islands of Calleja. Studied in addiction and in restless legs."),
  ("D4", "Dopamine D4", "gi", "DA", "", "Gαi/o", "Dopamine, moderate affinity; clozapine binds it well.",
   "Gi/o signalling.",
   "Sparse, in prefrontal cortex and the retina; a variable repeat in its gene was long linked to novelty seeking."),
  ("D5", "Dopamine D5", "gs", "DA", "", "Gαs", "Dopamine, with ten times the affinity of D1.",
   "Gs: raises cAMP.",
   "Rare: hippocampus, hypothalamus, and the cholinergic interneurons of the striatum."),
 ]),
 ("adrenergic", "Adrenergic receptors", "Nine receptors for noradrenaline and adrenaline: α1 excites through Gq, α2 damps through Gi, β raises cAMP through Gs.", [
  ("ALPHA1A", "α1A", "gq", "NA", "", "Gαq", "Noradrenaline and adrenaline about equally, moderate affinity; prazosin blocks all three α1 receptors.",
   "Gq: Ca²⁺ release and PKC; a slow excitation of the cell.",
   "Smooth muscle and, in the brain, the cortex and spinal motor neurons, where noradrenaline sharpens responsiveness."),
  ("ALPHA1B", "α1B", "gq", "NA", "", "Gαq", "Noradrenaline and adrenaline, moderate affinity.",
   "Gq signalling.",
   "Blood vessels and the brain; the α1 receptor behind much of noradrenaline's arousal effect."),
  ("ALPHA1D", "α1D", "gq", "NA", "", "Gαq", "Noradrenaline and adrenaline, moderate affinity.",
   "Gq signalling.",
   "Arteries and the cortex; the least studied of the three."),
  ("ALPHA2A", "α2A", "gi", "NA", "", "Gαi/o", "Noradrenaline with high affinity; clonidine and guanfacine are its agonists.",
   "Gi/o: on noradrenergic terminals the autoreceptor that limits release; on prefrontal dendrites it closes HCN channels and strengthens working memory.",
   "The receptor guanfacine works through in ADHD, and clonidine in opioid withdrawal."),
  ("ALPHA2B", "α2B", "gi", "NA", "", "Gαi/o", "Noradrenaline and adrenaline, high affinity.",
   "Gi/o signalling; in blood vessels it constricts.",
   "Mostly peripheral; in the brain, the thalamus."),
  ("ALPHA2C", "α2C", "gi", "NA", "", "Gαi/o", "Noradrenaline and adrenaline, high affinity.",
   "Gi/o signalling; a second autoreceptor, and a brake on dopamine release in the striatum.",
   "Basal ganglia and hippocampus."),
  ("BETA1", "β1", "gs", "NA", "", "Gαs", "Noradrenaline and adrenaline with equal, moderate affinity; the beta-blockers' main target.",
   "Gs: raises cAMP. In the heart, faster and stronger beats; in the brain, more cAMP in the cortex and hippocampus.",
   "Cardiac muscle first, then the cortex and the pineal gland."),
  ("BETA2", "β2", "gs", "NA", "", "Gαs", "Adrenaline with much higher affinity than noradrenaline: this is the receptor the adrenal medulla's hormone reaches. Salbutamol is its agonist.",
   "Gs: raises cAMP; relaxes bronchial and vascular smooth muscle. In the amygdala and hippocampus it strengthens emotional memories, which is what propranolol interrupts.",
   "Lungs, blood vessels, astrocytes and the limbic system."),
  ("BETA3", "β3", "gs", "NA", "", "Gαs", "Noradrenaline over adrenaline, low affinity.",
   "Gs: raises cAMP; drives fat burning and relaxes the bladder.",
   "Brown and white fat, bladder; little in the brain."),
 ]),
 ("serotonin", "Serotonin receptors", "Fourteen receptors, more than for any other transmitter. All but one are G-protein-coupled; 5-HT3 is a channel.", [
  ("5HT1A", "5-HT1A", "gi", "5-HT", "", "Gαi/o", "Serotonin, high affinity; buspirone is a partial agonist, and many antipsychotics touch it.",
   "Gi/o: opens GIRK K⁺ channels, hyperpolarising. On raphe neurons the autoreceptor that limits their firing; on cortical and hippocampal pyramidal cells a brake on excitability.",
   "The receptor behind the delay before SSRIs work: their effect waits for the raphe autoreceptors to desensitise."),
  ("5HT1B", "5-HT1B", "gi", "5-HT", "", "Gαi/o", "Serotonin, high affinity; triptans are its agonists.",
   "Gi/o: on serotonin terminals the autoreceptor for release; on other terminals a brake on GABA and glutamate release. Constricts cranial blood vessels.",
   "The migraine receptor, in the basal ganglia and on cerebral arteries."),
  ("5HT1D", "5-HT1D", "gi", "5-HT", "", "Gαi/o", "Serotonin and the triptans, high affinity.",
   "Gi/o: cuts release from trigeminal terminals.",
   "Sparse; the other triptan receptor."),
  ("5HT1E", "5-HT1E", "gi", "5-HT", "", "Gαi/o", "Serotonin, low affinity; no selective drug.",
   "Gi/o: lowers cAMP.",
   "Cortex and hippocampus, in humans and few other species; its role is unknown."),
  ("5HT1F", "5-HT1F", "gi", "5-HT", "", "Gαi/o", "Serotonin, moderate affinity; lasmiditan is its selective agonist.",
   "Gi/o: silences trigeminal terminals without constricting vessels.",
   "The newest migraine target."),
  ("5HT2A", "5-HT2A", "gq", "5-HT", "", "Gαq", "Serotonin, moderate affinity; LSD, psilocin and mescaline are agonists here, and their potency as hallucinogens tracks their 5-HT2A affinity. Most atypical antipsychotics block it.",
   "Gq: Ca²⁺ and PKC; a slow excitation of layer V pyramidal cells in the cortex.",
   "Dense in the prefrontal cortex; the psychedelic receptor."),
  ("5HT2B", "5-HT2B", "gq", "5-HT", "", "Gαq", "Serotonin, high affinity; fenfluramine and ergot derivatives are agonists.",
   "Gq: proliferation and contraction in the heart valves and gut.",
   "The reason fenfluramine and pergolide were withdrawn: valvular disease. Little in the brain."),
  ("5HT2C", "5-HT2C", "gq", "5-HT", "", "Gαq", "Serotonin, high affinity; lorcaserin was its agonist. Its mRNA is edited, giving receptors of different sensitivity.",
   "Gq: excites GABA interneurons and so damps dopamine release; cuts appetite through the hypothalamus.",
   "Choroid plexus, hypothalamus, striatum."),
  ("5HT3", "5-HT3", "iono_cat", "5-HT", CAT, "", "Serotonin, with micromolar affinity, at the interfaces of a pentamer; ondansetron and other setrons block it.",
   "A fast cation current, the only one serotonin produces directly. Excites interneurons in the cortex and the vagal afferents that trigger vomiting.",
   "The anti-emetic receptor; the setrons act on it in the gut, the area postrema and the vagus."),
  ("5HT4", "5-HT4", "gs", "5-HT", "", "Gαs", "Serotonin, high affinity; prucalopride is its agonist.",
   "Gs: raises cAMP; speeds gut motility and boosts acetylcholine release in the hippocampus.",
   "Gut, hippocampus, striatum."),
  ("5HT5A", "5-HT5A", "gi", "5-HT", "", "Gαi/o", "Serotonin, moderate affinity; no selective drug.",
   "Gi/o: lowers cAMP.",
   "Cortex, hippocampus, cerebellum; function uncertain."),
  ("5HT6", "5-HT6", "gs", "5-HT", "", "Gαs", "Serotonin, high affinity; many antipsychotics and antidepressants block it.",
   "Gs: raises cAMP; modulates acetylcholine and glutamate release.",
   "Confined to the brain: striatum, cortex, hippocampus. Antagonists were tried for cognition in Alzheimer's."),
  ("5HT7", "5-HT7", "gs", "5-HT", "", "Gαs", "Serotonin, high affinity; blocked by some antipsychotics and by amisulpride.",
   "Gs: raises cAMP; resets the circadian clock in the suprachiasmatic nucleus.",
   "Thalamus, hypothalamus, hippocampus."),
 ]),
 ("histamine", "Histamine receptors", "Four G-protein-coupled receptors, one of them the reason old antihistamines sedate.", [
  ("H1", "Histamine H1", "gq", "His", "", "Gαq", "Histamine, moderate affinity; diphenhydramine and the other first-generation antihistamines block it and cross into the brain.",
   "Gq: excites, closing K⁺ channels; in the cortex it keeps the cell awake.",
   "Widespread; the receptor that makes antihistamines drowsy and antipsychotics fattening."),
  ("H2", "Histamine H2", "gs", "His", "", "Gαs", "Histamine, moderate affinity; ranitidine and famotidine block it.",
   "Gs: raises cAMP; drives acid secretion in the stomach and damps the after-hyperpolarisation in cortical neurons.",
   "Stomach first, then basal ganglia and cortex."),
  ("H3", "Histamine H3", "gi", "His", "", "Gαi/o", "Histamine with the highest affinity of the four; pitolisant is an inverse agonist.",
   "Gi/o: the autoreceptor on histamine terminals, and a brake on release of acetylcholine, dopamine, noradrenaline and serotonin.",
   "The wake-promoting target: blocking it raises histamine and treats narcolepsy."),
  ("H4", "Histamine H4", "gi", "His", "", "Gαi/o", "Histamine, high affinity.",
   "Gi/o: chemotaxis of immune cells.",
   "Mast cells, eosinophils, microglia; barely in neurons."),
 ]),
 ("purine", "Purine receptors", "Adenosine's four G-protein-coupled receptors, and ATP's seven channels and eight G-protein-coupled receptors.", [
  ("A1", "Adenosine A1", "gi", "Ado", "", "Gαi/o", "Adenosine, high affinity, enough to sense the level that builds through waking. Caffeine and theophylline block it.",
   "Gi/o: opens K⁺ channels and closes Ca²⁺ channels, cutting release of glutamate. The brain's general brake.",
   "Everywhere, thickest in cortex, hippocampus and cerebellum. The receptor sleep pressure works through."),
  ("A2A", "Adenosine A2A", "gs", "Ado", "", "Gαs", "Adenosine, high affinity; caffeine blocks it, and istradefylline is a selective antagonist.",
   "Gs: raises cAMP. In the striatum it sits with D2, opposing it; in the ventrolateral preoptic area it promotes sleep.",
   "Concentrated in the striatum; the other caffeine receptor, and a Parkinson's target."),
  ("A2B", "Adenosine A2B", "gs", "Ado", "", "Gαs", "Adenosine, low affinity: only the concentrations of injury or hypoxia reach it.",
   "Gs: raises cAMP; in astrocytes and mast cells.",
   "Glia and vasculature more than neurons."),
  ("A3", "Adenosine A3", "gi", "Ado", "", "Gαi/o", "Adenosine, low affinity in humans.",
   "Gi/o signalling; anti-inflammatory.",
   "Immune cells, and little in the brain."),
  ("P2X1", "P2X1", "iono_cat", "ATP", CACA, "", "ATP, high affinity; desensitises within a second.",
   "A fast cation current.",
   "Smooth muscle and platelets more than neurons."),
  ("P2X2", "P2X2", "iono_cat", "ATP", CACA, "", "ATP, moderate affinity, slow to desensitise.",
   "Sustained cation current; on sensory and autonomic neurons and in the cochlea.",
   "Often paired with P2X3 in taste and pain afferents."),
  ("P2X3", "P2X3", "iono_cat", "ATP", CACA, "", "ATP, high affinity, fast to desensitise; gefapixant blocks it.",
   "Fast cation current on sensory nerve endings.",
   "The ATP receptor of pain, bladder sensation and the cough reflex."),
  ("P2X4", "P2X4", "iono_cat", "ATP", CACA, "", "ATP, moderate affinity; ivermectin potentiates it.",
   "Cation current with high Ca²⁺ permeability; in microglia it triggers release of BDNF.",
   "The microglial receptor behind neuropathic pain."),
  ("P2X5", "P2X5", "iono_cat", "ATP", CACA, "", "ATP, moderate affinity; most humans carry a non-functional splice variant.",
   "Small cation current.",
   "Little known."),
  ("P2X6", "P2X6", "iono_cat", "ATP", CACA, "", "ATP; will not assemble on its own and appears only in mixed receptors.",
   "Modest cation current, in combination.",
   "Cerebellum and hippocampus, with P2X2 or P2X4."),
  ("P2X7", "P2X7", "iono_cat", "ATP", CACA, "", "ATP with the lowest affinity of the family: it needs the hundreds of micromolar that only damaged cells leak.",
   "A cation channel that, held open, dilates into a large pore and starts inflammation, releasing interleukin-1β.",
   "Microglia and astrocytes; the damage sensor."),
  ("P2Y1", "P2Y1", "gq", "ADP", "", "Gαq", "ADP over ATP, high affinity.",
   "Gq: Ca²⁺ release; in astrocytes the main route of calcium waves.",
   "Astrocytes, platelets, and neurons of the cortex and cerebellum."),
  ("P2Y2", "P2Y2", "gq", "ATP · UTP", "", "Gαq", "ATP and UTP equally, moderate affinity.",
   "Gq: Ca²⁺ release; drives secretion in epithelia.",
   "Epithelia, glia, endothelium."),
  ("P2Y4", "P2Y4", "gq", "UTP", "", "Gαq", "UTP, with ATP as an antagonist in humans.",
   "Gq signalling.",
   "Gut epithelium, choroid plexus."),
  ("P2Y6", "P2Y6", "gq", "UDP", "", "Gαq", "UDP, high affinity, over other nucleotides.",
   "Gq: in microglia it triggers phagocytosis of dying cells.",
   "Microglia: the 'eat me' receptor."),
  ("P2Y11", "P2Y11", "gs", "ATP", "", "Gαs · Gαq", "ATP, low affinity; absent in rodents.",
   "Gs and Gq both: raises cAMP and Ca²⁺.",
   "Immune cells and the spleen; rarely in the brain."),
  ("P2Y12", "P2Y12", "gi", "ADP", "", "Gαi/o", "ADP, high affinity; clopidogrel and ticagrelor block it.",
   "Gi/o: lowers cAMP. In platelets it drives aggregation; in microglia it is the receptor that sends processes towards injury within minutes.",
   "Platelets and microglia, where it is the marker of the resting, surveying state."),
  ("P2Y13", "P2Y13", "gi", "ADP", "", "Gαi/o", "ADP, high affinity.",
   "Gi/o signalling.",
   "Spleen, and sparsely in the brain."),
  ("P2Y14", "P2Y14", "gi", "UDP-glucose", "", "Gαi/o", "UDP-glucose and UDP, moderate affinity.",
   "Gi/o signalling; a damage sensor on immune cells.",
   "Glia and immune cells."),
 ]),
 ("cannabinoid", "Cannabinoid receptors", "Two G-protein-coupled receptors for the brain's own lipid messengers, and for THC.", [
  ("CB1", "CB1", "gi", "2-AG", "", "Gαi/o", "2-AG as a full agonist and anandamide as a partial one, both with high affinity; THC is a partial agonist. Sits on the presynaptic terminal, facing the cell that made the endocannabinoid.",
   "Gi/o: closes Ca²⁺ channels and opens K⁺ channels on the terminal, so release drops. The retrograde brake on both GABA and glutamate synapses.",
   "The most abundant GPCR in the brain: basal ganglia, cerebellum, hippocampus, cortex. Rimonabant blocked it and was withdrawn for depression."),
  ("CB2", "CB2", "gi", "2-AG", "", "Gαi/o", "2-AG and anandamide, high affinity.",
   "Gi/o signalling; damps inflammation.",
   "Microglia and immune cells; rises in the brain with injury and inflammation."),
 ]),
 ("opioid", "Opioid receptors", "Four G-protein-coupled receptors for the endogenous opioid peptides, three of which morphine and its relatives act on.", [
  ("MOR", "μ-opioid receptor (MOR)", "gi", "β-endorphin", "", "Gαi/o", "β-endorphin and the enkephalins with high affinity, endomorphins too; morphine, fentanyl, oxycodone and methadone are agonists, naloxone the antagonist.",
   "Gi/o: opens K⁺ channels and closes Ca²⁺ channels. In the periaqueductal grey it silences the GABA cells that hold pain control back; in the ventral tegmental area the same trick frees dopamine release.",
   "The receptor of opioid analgesia, euphoria, constipation and respiratory depression, all of it."),
  ("DOR", "δ-opioid receptor (DOR)", "gi", "Enkephalin", "", "Gαi/o", "The enkephalins with high affinity, β-endorphin less so; no approved drug is selective for it.",
   "Gi/o signalling; analgesia with less euphoria, and an antidepressant tone in animals.",
   "Cortex, striatum, olfactory bulb."),
  ("KOR", "κ-opioid receptor (KOR)", "gi", "Dynorphin", "", "Gαi/o", "The dynorphins with high affinity; salvinorin A is a potent agonist.",
   "Gi/o: cuts dopamine release in the nucleus accumbens. Dysphoria rather than euphoria.",
   "Hypothalamus, striatum, spinal cord; the receptor of stress-induced aversion."),
  ("NOP", "Nociceptin receptor (NOP)", "gi", "N/OFQ", "", "Gαi/o", "Nociceptin/orphanin FQ with high affinity; insensitive to naloxone and to morphine.",
   "Gi/o signalling; blocks stress analgesia and damps reward.",
   "Cortex, amygdala, hypothalamus; the fourth member, found from its receptor's sequence before its ligand was known."),
 ]),
 ("peptide", "Neuropeptide receptors", "All G-protein-coupled, and answering to peptides that are released only when a neuron fires hard. A selection of the best known.", [
  ("NK1", "NK1 (substance P)", "gq", "SP", "", "Gαq", "Substance P with the highest affinity, neurokinin A and B less; aprepitant blocks it.",
   "Gq: slow excitation. On dorsal horn neurons it carries persistent pain; in the brainstem it triggers vomiting.",
   "Dorsal horn, striatum, amygdala; the anti-emetic aprepitant's target."),
  ("NK2", "NK2 (neurokinin A)", "gq", "NKA", "", "Gαq", "Neurokinin A over substance P.",
   "Gq: smooth muscle contraction.",
   "Gut and airways more than brain."),
  ("NK3", "NK3 (neurokinin B)", "gq", "NKB", "", "Gαq", "Neurokinin B, high affinity; fezolinetant blocks it.",
   "Gq signalling; drives the kisspeptin neurons that pulse GnRH.",
   "Hypothalamus; the receptor fezolinetant blocks to treat hot flushes."),
  ("Y1", "NPY Y1", "gi", "NPY", "", "Gαi/o", "Neuropeptide Y and peptide YY with high affinity.",
   "Gi/o: damps excitability; in the hypothalamus it drives feeding, in the amygdala it lowers anxiety.",
   "Cortex, hypothalamus, amygdala."),
  ("Y2", "NPY Y2", "gi", "NPY", "", "Gαi/o", "Neuropeptide Y and PYY(3–36), the gut's satiety form, with high affinity.",
   "Gi/o: presynaptic, cutting release of NPY, glutamate and GABA; in the arcuate nucleus it suppresses appetite.",
   "Hippocampus, hypothalamus; the receptor PYY(3–36) reaches after a meal."),
  ("Y4", "NPY Y4", "gi", "PP", "", "Gαi/o", "Pancreatic polypeptide over NPY.",
   "Gi/o signalling; slows gastric emptying.",
   "Brainstem and hypothalamus."),
  ("Y5", "NPY Y5", "gi", "NPY", "", "Gαi/o", "Neuropeptide Y, high affinity.",
   "Gi/o signalling; with Y1, the feeding receptor.",
   "Hypothalamus and hippocampus."),
  ("SSTR1", "Somatostatin SSTR1", "gi", "SST", "", "Gαi/o", "Somatostatin-14 and -28, high affinity.",
   "Gi/o: lowers cAMP, opens K⁺ channels.",
   "Cortex and hippocampus."),
  ("SSTR2", "Somatostatin SSTR2", "gi", "SST", "", "Gαi/o", "Somatostatin, high affinity; octreotide binds it best.",
   "Gi/o: inhibits hormone release and dendritic excitability.",
   "Pituitary, cortex, and the receptor octreotide works through against acromegaly."),
  ("SSTR3", "Somatostatin SSTR3", "gi", "SST", "", "Gαi/o", "Somatostatin, high affinity.",
   "Gi/o signalling; in the primary cilium of neurons.",
   "Cerebellum, cortex."),
  ("SSTR4", "Somatostatin SSTR4", "gi", "SST", "", "Gαi/o", "Somatostatin, high affinity.",
   "Gi/o signalling; analgesic and anti-inflammatory in animals.",
   "Hippocampus and cortex."),
  ("SSTR5", "Somatostatin SSTR5", "gi", "SST", "", "Gαi/o", "Somatostatin-28 over -14; pasireotide binds it.",
   "Gi/o: inhibits growth hormone and insulin release.",
   "Pituitary, hypothalamus."),
  ("OX1", "Orexin OX1", "gq", "OX-A", "", "Gαq", "Orexin-A with high affinity, orexin-B less; suvorexant blocks both orexin receptors.",
   "Gq: slow excitation of the locus coeruleus and the ventral tegmental area.",
   "The arousal receptor: its loss, or its ligand's, is narcolepsy."),
  ("OX2", "Orexin OX2", "gq", "OX-B", "", "Gαq", "Orexin-A and orexin-B equally, high affinity.",
   "Gq: excites the histamine neurons of the tuberomammillary nucleus.",
   "The receptor whose mutation causes canine narcolepsy; daridorexant's target for insomnia."),
  ("OTR", "Oxytocin receptor", "gq", "OT", "", "Gαq", "Oxytocin with high affinity, vasopressin with lower.",
   "Gq: excites; in the amygdala and nucleus accumbens it tunes social approach, in the uterus it contracts.",
   "Hypothalamus, amygdala, nucleus accumbens, uterus."),
  ("V1A", "Vasopressin V1a", "gq", "AVP", "", "Gαq", "Vasopressin, high affinity, oxytocin lower.",
   "Gq: constricts vessels; in the brain shapes social memory and, in voles, pair bonding.",
   "Blood vessels, lateral septum, ventral pallidum."),
  ("V1B", "Vasopressin V1b", "gq", "AVP", "", "Gαq", "Vasopressin, high affinity.",
   "Gq: in the pituitary drives ACTH release with CRF.",
   "Pituitary and hippocampus; a stress-axis receptor."),
  ("CRF1", "CRF1", "gs", "CRF", "", "Gαs", "Corticotropin-releasing factor with high affinity, urocortin-1 too.",
   "Gs: raises cAMP. In the pituitary it releases ACTH; in the amygdala and locus coeruleus it drives the anxiety of stress.",
   "The receptor that starts the stress response."),
  ("CRF2", "CRF2", "gs", "Ucn", "", "Gαs", "The urocortins with high affinity, CRF itself with less.",
   "Gs signalling; in the raphe and the septum it tends to calm rather than alarm.",
   "Septum, raphe, hypothalamus; the counterweight to CRF1."),
  ("MC4R", "Melanocortin MC4", "gs", "α-MSH", "", "Gαs", "α-MSH as agonist; agouti-related peptide is its natural antagonist, and setmelanotide a drug agonist.",
   "Gs: raises cAMP in the paraventricular nucleus, suppressing appetite.",
   "Hypothalamus; the commonest single-gene cause of severe obesity when mutated."),
  ("MT1", "Melatonin MT1", "gi", "Mel", "", "Gαi/o", "Melatonin with picomolar affinity, the highest of any receptor on this page; ramelteon and agomelatine are agonists.",
   "Gi/o: quietens the suprachiasmatic nucleus at night and constricts cerebral arteries.",
   "Suprachiasmatic nucleus, pituitary."),
  ("MT2", "Melatonin MT2", "gi", "Mel", "", "Gαi/o", "Melatonin, high affinity.",
   "Gi/o: shifts the phase of the circadian clock.",
   "Suprachiasmatic nucleus, retina, hippocampus."),
  ("EP1", "Prostaglandin EP1", "gq", "PGE₂", "", "Gαq", "Prostaglandin E₂, moderate affinity.",
   "Gq: Ca²⁺ release; sensitises pain fibres.",
   "Kidney, and sparsely in the brain."),
  ("EP2", "Prostaglandin EP2", "gs", "PGE₂", "", "Gαs", "Prostaglandin E₂, low affinity.",
   "Gs: raises cAMP; in microglia it amplifies inflammation.",
   "Cortex, hippocampus, microglia."),
  ("EP3", "Prostaglandin EP3", "gi", "PGE₂", "", "Gαi/o", "Prostaglandin E₂ with the highest affinity of the four.",
   "Gi/o: in the preoptic area it is the receptor through which fever is set, which is what aspirin stops upstream.",
   "The fever receptor, in the median preoptic nucleus."),
  ("EP4", "Prostaglandin EP4", "gs", "PGE₂", "", "Gαs", "Prostaglandin E₂, high affinity.",
   "Gs: raises cAMP; anti-inflammatory in microglia, and keeps the ductus arteriosus open before birth.",
   "Widespread, including the hippocampus."),
  ("BDKRB1", "Bradykinin B1", "gq", "des-Arg-BK", "", "Gαq", "des-Arg⁹-bradykinin, the breakdown product, high affinity; hardly expressed until injury induces it.",
   "Gq signalling; chronic pain and inflammation.",
   "Induced in inflamed tissue and injured nerve."),
  ("BDKRB2", "Bradykinin B2", "gq", "BK", "", "Gαq", "Bradykinin, high affinity; icatibant blocks it.",
   "Gq: Ca²⁺ release and prostaglandin synthesis; the receptor of the sharp pain of injury.",
   "Sensory nerve endings, blood vessels; icatibant's target in angioedema."),
 ]),
 ("trp", "TRP channels", "Cation channels of the senses: opened by temperature, chemicals and stretch as much as by any ligand.", [
  ("TRPV1", "TRPV1", "iono_cat", "capsaicin · heat", CACA, "", "Capsaicin with high affinity, heat above about 43 °C, protons, and anandamide; each lowers the threshold for the others.",
   "A Ca²⁺-rich cation current that fires the pain fibre. Held open, it desensitises the fibre, which is how capsaicin cream works.",
   "The heat and chilli receptor, on C fibres and in the hypothalamus."),
  ("TRPM8", "TRPM8", "iono_cat", "menthol · cold", CACA, "", "Menthol and icilin, and cold below about 26 °C.",
   "Cation current on cold-sensing fibres.",
   "The cold and menthol receptor."),
  ("TRPA1", "TRPA1", "iono_cat", "irritants", CACA, "", "Allyl isothiocyanate (mustard oil), acrolein, and the electrophiles of smoke and tear gas, by covalent attachment.",
   "Cation current on nociceptors and vagal afferents; cough, tears and the sting of wasabi.",
   "The chemical-irritant receptor, alongside TRPV1 on the same fibres."),
  ("TRPM3", "TRPM3", "iono_cat", "heat · PS", CACA, "", "Pregnenolone sulfate and noxious heat.",
   "Cation current on sensory neurons; part of heat pain with TRPV1 and TRPA1.",
   "Sensory ganglia; mutations cause epilepsy."),
 ]),
 ("voltage", "Voltage-gated channels", "Not receptors, and nothing binds them, but every receptor on this page acts through them: the sodium and potassium channels of the action potential and the calcium channels of release.", [
  ("NAV11", "Nav1.1", "voltage", "", "Na⁺", "", "Nothing: it opens on depolarisation past about −55 mV and inactivates within a millisecond. Tetrodotoxin blocks it in the nanomolar range.",
   "The rising phase of the action potential in fast-spiking GABA interneurons.",
   "Its loss in interneurons is Dravet syndrome: a sodium channel mutation that causes epilepsy by silencing inhibition."),
  ("NAV12", "Nav1.2", "voltage", "", "Na⁺", "", "Voltage; tetrodotoxin-sensitive.",
   "Action potentials in unmyelinated axons and the immature initial segment.",
   "Cortex and hippocampus early in life; mutations cause epilepsy and autism."),
  ("NAV16", "Nav1.6", "voltage", "", "Na⁺", "", "Voltage; tetrodotoxin-sensitive, and carries a persistent and a resurgent current as well as the transient one.",
   "The channel of the adult initial segment and of every node of Ranvier: where the spike starts and how it jumps.",
   "Clustered by ankyrin-G at the initial segment; the channel drawn at the nodes on the plates above."),
  ("NAV17", "Nav1.7", "voltage", "", "Na⁺", "", "Voltage, with a threshold near rest that amplifies small depolarisations.",
   "Sets the threshold of pain fibres.",
   "People born without it feel no pain; gain-of-function mutations cause erythromelalgia. A much-pursued analgesic target."),
  ("NAV18", "Nav1.8", "voltage", "", "Na⁺", "", "Voltage; tetrodotoxin-resistant, and works at potentials where other sodium channels have inactivated.",
   "The upstroke of the action potential in C-fibre nociceptors.",
   "Confined to sensory neurons; another pain target."),
  ("CAV12", "Cav1.2 (L-type)", "voltage", "", "Ca²⁺", "", "Voltage, opening at strong depolarisation; dihydropyridines such as nifedipine block it.",
   "A long-lasting Ca²⁺ current on the cell body and dendrites that drives gene expression, and in the heart the plateau of every beat.",
   "Heart, smooth muscle, and neuronal dendrites; variants are linked to bipolar disorder."),
  ("CAV13", "Cav1.3 (L-type)", "voltage", "", "Ca²⁺", "", "Voltage, opening at lower potentials than Cav1.2.",
   "Pacemaking in the sinoatrial node and in dopamine neurons, whose slow Ca²⁺ load may be why they are lost in Parkinson's disease.",
   "Cochlear hair cells, heart, substantia nigra."),
  ("CAV21", "Cav2.1 (P/Q-type)", "voltage", "", "Ca²⁺", "", "Voltage; ω-agatoxin blocks it.",
   "The Ca²⁺ that triggers transmitter release at most central synapses and at the neuromuscular junction.",
   "Presynaptic terminals; mutations cause familial hemiplegic migraine and ataxia."),
  ("CAV22", "Cav2.2 (N-type)", "voltage", "", "Ca²⁺", "", "Voltage; ω-conotoxin from cone snails blocks it, as does ziconotide, its drug form. Gi/o-coupled receptors close it directly.",
   "Release at sympathetic and sensory terminals, including the pain synapses of the dorsal horn.",
   "The channel opioids and cannabinoids close to stop release."),
  ("CAV23", "Cav2.3 (R-type)", "voltage", "", "Ca²⁺", "", "Voltage; resistant to the toxins that block the others.",
   "A residual Ca²⁺ current in dendritic spines and some terminals.",
   "Hippocampus and cerebellum."),
  ("CAV3", "Cav3 (T-type)", "voltage", "", "Ca²⁺", "", "Voltage, opening near rest and inactivating fast: a transient, low-threshold current. Ethosuximide blocks it.",
   "Bursts. When a thalamic neuron is hyperpolarised these channels recover, and the next small depolarisation fires a burst of spikes on top of a Ca²⁺ spike.",
   "Thalamus; the rhythm of sleep spindles and of absence seizures, which ethosuximide treats."),
  ("KV1", "Kv1 (delayed rectifier)", "voltage", "", "K⁺", "", "Voltage; dendrotoxin from mamba venom blocks it, and 4-aminopyridine.",
   "Repolarises the action potential and sets the threshold at the initial segment and the juxtaparanodes.",
   "Axons; 4-aminopyridine's target in multiple sclerosis."),
  ("KV2", "Kv2.1", "voltage", "", "K⁺", "", "Voltage, opening slowly at strong depolarisation.",
   "The delayed rectifier of the cell body: keeps repetitive firing going without depolarisation block.",
   "Somatic clusters on cortical and hippocampal neurons."),
  ("KV4", "Kv4 (A-type)", "voltage", "", "K⁺", "", "Voltage, opening and inactivating quickly at sub-threshold potentials.",
   "A transient outward current that delays the first spike and damps back-propagating action potentials in dendrites.",
   "Dendrites of pyramidal cells; the current that lets a neuron fire slowly."),
  ("KV7", "Kv7 (M-current, KCNQ)", "voltage", "", "K⁺", "", "Voltage, at rest: a slow, non-inactivating current. Muscarinic M1 receptors close it, which is how it was named; retigabine opens it.",
   "Sets the resting potential and stops repetitive firing.",
   "Initial segment and nodes; mutations cause neonatal epilepsy."),
  ("KV11", "Kv11.1 (hERG)", "voltage", "", "K⁺", "", "Voltage, with fast inactivation and slow recovery; blocked by many drugs by accident.",
   "Repolarises the heart's action potential.",
   "Heart, and some neurons; the reason every new drug is tested for QT prolongation."),
  ("HCN1", "HCN1", "voltage", "", "Na⁺ K⁺", "", "Voltage, but backwards: opens on hyperpolarisation, and cAMP opens it a little more. Ivabradine blocks the family.",
   "The h-current: a cation current that pulls a hyperpolarised cell back towards threshold, and in distal dendrites damps the summation of inputs.",
   "Dendrites of cortical and hippocampal pyramidal cells."),
  ("HCN2", "HCN2", "voltage", "", "Na⁺ K⁺", "", "Hyperpolarisation, and strongly cAMP: this is the isoform noradrenaline speeds up.",
   "Pacemaking in the thalamus and the heart's sinoatrial node.",
   "Thalamus, heart, and the pain fibres where it drives neuropathic firing."),
 ]),
 ("background", "Background and Ca²⁺-activated K⁺ channels", "The channels that set how a neuron rests and how it recovers from firing.", [
  ("BK", "BK (KCa1.1)", "cak", "Ca²⁺", "K⁺", "", "Ca²⁺ arriving inside, and depolarisation together; iberiotoxin blocks it.",
   "A large K⁺ current that sharpens the action potential and cuts release at the terminal.",
   "Presynaptic terminals, the cell body, and smooth muscle."),
  ("SK", "SK (KCa2)", "cak", "Ca²⁺", "K⁺", "", "Ca²⁺ inside, through calmodulin, at sub-micromolar levels; apamin from bee venom blocks it.",
   "The medium after-hyperpolarisation that follows a burst and sets the firing rate.",
   "Dendritic spines, where it damps NMDA currents, and dopamine neurons, where it sets their pacemaker rhythm."),
  ("KIR2", "Kir2 (inward rectifier)", "leak", "", "K⁺", "", "Nothing outside; the channel is open at rest and blocked from inside by Mg²⁺ and polyamines when the cell depolarises.",
   "Holds the resting potential near the K⁺ equilibrium and lets go once the cell fires.",
   "Muscle, heart and neurons; mutations cause Andersen–Tawil syndrome."),
  ("GIRK", "GIRK (Kir3)", "leak", "Gβγ", "K⁺", "", "The βγ subunits of Gi/o proteins, from inside: GABA-B, D2, μ-opioid, 5-HT1A, A1, M2 and α2 receptors all open it.",
   "A slow K⁺ current that hyperpolarises the cell for hundreds of milliseconds: the common effector of inhibitory metabotropic receptors.",
   "Dendrites throughout the brain; the channel drawn under 'K⁺ open' in the GPCR schematics above."),
  ("KATP", "K-ATP (Kir6)", "leak", "ATP", "K⁺", "", "ATP from inside closes it; ADP opens it. Sulfonylureas close it, diazoxide opens it.",
   "Couples metabolism to excitability: when energy runs low the channel opens and the cell falls quiet.",
   "Pancreatic β cells, where it controls insulin, and hypothalamic glucose sensors."),
  ("TREK1", "TREK-1 (K2P2)", "leak", "stretch · lipids", "K⁺", "", "Membrane stretch, heat, polyunsaturated fatty acids and volatile anaesthetics open it; Gq and Gs receptor signalling close it.",
   "A background K⁺ leak that sets the resting potential; opening it is part of how anaesthetics quieten neurons.",
   "Cortex, hippocampus, sensory neurons."),
  ("TASK", "TASK-1 and TASK-3 (K2P3, K2P9)", "leak", "pH", "K⁺", "", "Closed by extracellular acid, opened by anaesthetics; muscarinic and other Gq receptors close them.",
   "Leak K⁺ current that keeps motor neurons and cerebellar granule cells at rest; closing it is the excitation acetylcholine gives.",
   "Motor neurons, cerebellum, carotid body."),
 ]),
 ("transporter", "Transporters", "Not receptors, but they bind the transmitters more selectively than many receptors do: the reuptake carriers that end a signal, and the vesicular carriers that load the next.", [
  ("EAAT2", "EAAT2 (GLT-1)", "transporter", "Glu", "", "", "Glutamate, with micromolar affinity, three Na⁺ and one H⁺ carried in, one K⁺ out. Aspartate as well.",
   "Clears most of the glutamate released in the brain, within milliseconds, into astrocytes. Its loss is excitotoxic.",
   "Astrocyte membranes facing the synapse; ninety per cent of glutamate uptake."),
  ("EAAT1", "EAAT1 (GLAST)", "transporter", "Glu", "", "", "Glutamate and aspartate, micromolar affinity, Na⁺-coupled.",
   "Glutamate clearance in the cerebellum and retina.",
   "Bergmann glia and Müller cells."),
  ("EAAT3", "EAAT3 (EAAC1)", "transporter", "Glu · Cys", "", "", "Glutamate and cysteine, Na⁺-coupled.",
   "Neuronal uptake, and the cysteine supply for glutathione.",
   "Neuronal dendrites; a minor route for glutamate itself."),
  ("GAT1", "GAT-1", "transporter", "GABA", "", "", "GABA, micromolar affinity, with two Na⁺ and one Cl⁻; tiagabine blocks it.",
   "Reuptake of GABA into the terminal that released it, ending inhibition.",
   "GABA terminals and astrocytes; tiagabine's target in epilepsy."),
  ("GLYT1", "GlyT1", "transporter", "Gly", "", "", "Glycine, with two Na⁺ and one Cl⁻.",
   "Clears glycine from around NMDA receptors, so it sets how much co-agonist they see; blocking it boosts NMDA currents.",
   "Astrocytes and glutamatergic neurons in the forebrain."),
  ("GLYT2", "GlyT2", "transporter", "Gly", "", "", "Glycine, with three Na⁺ and one Cl⁻: the extra sodium lets it fill the terminal to high concentration.",
   "Reloads inhibitory terminals with glycine for the next release.",
   "Glycinergic terminals of the spinal cord and brainstem; mutations cause hyperekplexia."),
  ("DAT", "Dopamine transporter (DAT)", "transporter", "DA", "", "", "Dopamine with sub-micromolar affinity, Na⁺- and Cl⁻-coupled; cocaine and methylphenidate block it, amphetamine runs it backwards.",
   "Ends the dopamine signal by taking it back into the terminal. Where it is sparse, as in the prefrontal cortex, the noradrenaline transporter does the job instead.",
   "Dopamine terminals in the striatum; its loss on a DaT scan is the imaging sign of Parkinson's disease."),
  ("NET", "Noradrenaline transporter (NET)", "transporter", "NA", "", "", "Noradrenaline, and dopamine almost as well; atomoxetine, reboxetine and the tricyclics block it, amphetamine reverses it.",
   "Reuptake of noradrenaline, and of prefrontal dopamine.",
   "Noradrenergic terminals; atomoxetine's target in ADHD."),
  ("SERT", "Serotonin transporter (SERT)", "transporter", "5-HT", "", "", "Serotonin, with nanomolar affinity; every SSRI binds it, and MDMA reverses it.",
   "Ends the serotonin signal; blocking it raises synaptic serotonin within hours, though the antidepressant effect waits weeks.",
   "Serotonin terminals and platelets; the target of fluoxetine, sertraline and the rest."),
  ("VMAT2", "VMAT2", "transporter", "monoamines", "", "", "Dopamine, noradrenaline, serotonin and histamine, in exchange for two H⁺ from the vesicle's acid interior; reserpine and tetrabenazine block it.",
   "Loads monoamines into vesicles. Blocked, the terminals empty and the transmitter is destroyed by monoamine oxidase.",
   "Monoamine vesicles; tetrabenazine's target in Huntington's chorea."),
  ("VGLUT", "VGLUT1 and VGLUT2", "transporter", "Glu", "", "", "Glutamate, low affinity, driven by the vesicle's membrane potential; aspartate is refused.",
   "Fills vesicles with glutamate, which is what makes a terminal glutamatergic.",
   "VGLUT1 in cortex and hippocampus, VGLUT2 in thalamus and brainstem."),
  ("VGAT", "VGAT (VIAAT)", "transporter", "GABA · Gly", "", "", "GABA and glycine both, driven by the vesicle's proton gradient.",
   "Fills inhibitory vesicles; one carrier for both inhibitory transmitters.",
   "GABA and glycine terminals."),
  ("VACHT", "VAChT", "transporter", "ACh", "", "", "Acetylcholine, exchanged for two H⁺; vesamicol blocks it.",
   "Loads acetylcholine into vesicles at the neuromuscular junction and in the brain.",
   "Cholinergic terminals; the PET marker of cholinergic loss in dementia."),
 ]),
]

out = {"kinds": {k: dict(v, svg=ARCH[v["arch"]]) for k, v in KINDS.items()}, "groups": []}
n = 0
for gid, name, note, items in GROUPS:
    rows = []
    for rid, nm, kind, lig, ion, g, binds, effect, note_ in items:
        gl, ge = G.get(kind, ("", ""))
        rows.append(dict(id=rid, name=nm, kind=kind, lig=lig, ion=ion, g=(g or gl), eff=ge if kind in G else "",
                         binds=binds, effect=effect, note=note_))
        n += 1
    out["groups"].append(dict(id=gid, name=name, note=note, items=rows))

here = os.path.dirname(os.path.abspath(__file__))
dest = os.path.normpath(os.path.join(here, "..", "..", "site", "assets", "rx"))
os.makedirs(dest, exist_ok=True)
with open(os.path.join(dest, "receptors.json"), "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=0); fh.write("\n")
print("wrote receptors.json:", n, "entries in", len(GROUPS), "groups,", len(KINDS), "kinds,", os.path.getsize(os.path.join(dest, "receptors.json")), "bytes")
