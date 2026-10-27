/* Example maps for the 3D Region Atlas's Saved maps window (v12.47, at the
   owner's word): a few circuits to open and build on, standing under the
   person's own maps. Each names its regions as the atlas keeps a selection,
   P: both sides of a paired region, L: or R: one side, S: a midline
   structure, by the AAL base name in atlas-data.js; regions.html resolves
   them into a model as a save keeps one (selKeyFor, the palette in its
   order) and hands them to models.js, which draws them with no delete
   button and fills the name box on opening so Save keeps a copy; a map
   opened leaves the cuts and the view as they are. Mirror false keeps a
   one-sided map one-sided under the probe. The
   serotonin hotspots are the regions the receptor table ranks highest for
   its six serotonin tracers (receptor-data.js: SERT, 5-HT1A, 5-HT1B,
   5-HT2A, 5-HT4 and 5-HT6). */
window.VN_EXAMPLE_MAPS = [
  { name: "Memory circuit",
    note: "Papez's loop: the hippocampus, the thalamus its output reaches through the fornix and the mammillary bodies, the cingulate cortex, and the parahippocampal gyrus that leads back into it.",
    regions: ["P:Hippocampus", "P:ParaHippocampal", "P:Thalamus", "P:Cingulum_Post"] },
  { name: "Visual pathway",
    note: "From the lateral geniculate nucleus in the thalamus to the calcarine cortex, V1, then out across the cuneus and the lingual gyrus to the middle occipital gyrus of the dorsal stream and the fusiform gyrus of the ventral.",
    regions: ["P:Thalamus", "P:Calcarine", "P:Cuneus", "P:Lingual", "P:Occipital_Mid", "P:Fusiform"] },
  { name: "Serotonin receptor hotspots",
    note: "Where the receptor table's serotonin tracers bind most densely: the globus pallidus and the putamen for the transporter, 5-HT4 and 5-HT6, the parahippocampal gyrus for 5-HT1A, Heschl's gyrus and the medial orbitofrontal cortex for 5-HT2A, and the insula for 5-HT1A and 5-HT6 both.",
    regions: ["P:Pallidum", "P:Putamen", "P:ParaHippocampal", "P:Heschl", "P:Frontal_Med_Orb", "P:Insula"] },
  { name: "Basal ganglia motor loop",
    note: "The motor cortex to the striatum, the striatum to the pallidum, the pallidum to the thalamus and the thalamus back to the cortex: the loop that selects a movement and scales it.",
    regions: ["P:Precentral", "P:Supp_Motor_Area", "P:Caudate", "P:Putamen", "P:Pallidum", "P:Thalamus"] },
  { name: "Language network",
    note: "The left hemisphere's language regions alone: Broca's area in the inferior frontal gyrus, Wernicke's in the superior temporal gyrus, the middle temporal gyrus beneath it, and the supramarginal and angular gyri the arcuate fasciculus runs between.",
    regions: ["L:Frontal_Inf_Tri", "L:Frontal_Inf_Oper", "L:Temporal_Sup", "L:Temporal_Mid", "L:SupraMarginal", "L:Angular"],
    mirror: false },
  { name: "Default mode network",
    note: "The regions that come up when nothing is asked of the brain, resting, remembering and imagining: the precuneus and the posterior cingulate, the medial prefrontal cortex, the angular gyrus and the middle temporal gyrus.",
    regions: ["P:Precuneus", "P:Cingulum_Post", "P:Frontal_Sup_Medial", "P:Frontal_Med_Orb", "P:Angular", "P:Temporal_Mid"] },
  { name: "Dopamine reward circuit",
    note: "The striatum that the midbrain's dopamine reaches, the caudate and the putamen, with the orbitofrontal and anterior cingulate cortex that weigh a reward and the insula that feels it; the ventral tegmental area that sends the dopamine and the nucleus accumbens that receives it are too small for the parcellation.",
    regions: ["P:Caudate", "P:Putamen", "P:Frontal_Med_Orb", "P:Cingulum_Ant", "P:Insula"] }
];
