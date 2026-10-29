/* The bundles of the HCP1065 tractogram (v12.63, at the owner's word): the
   87 named groups the file carries (hcp1065.trx's groups/, every streamline in
   exactly one), as 46 bundles, each a left and a right or one across the
   midline, with the name a reader knows it by, the system it belongs to, a
   line on what it joins, and the colour the Tractography page draws it in when
   colouring by bundle. The abbreviations are the atlas's own (Yeh FC, Nat
   Commun 13:4933, 2022); the systems follow the textbook's division of the
   white matter, the cranial nerves apart. The colours step round the hue wheel
   by the golden angle in list order, in OKLCH at three lightnesses, so a bundle
   and the next in the list never share a hue, and both sides of a bundle share
   one; they read on the page's black and on its white.

     MN_BUNDLES.SYSTEMS   [{id, label, note}] in the order the list shows them
     MN_BUNDLES.LIST      [{base, name, system, joins, colour}] in that order
     MN_BUNDLES.find(id)  the bundle a group's id names ("AF_L" → AF, side "L"),
                          as {bundle, side}, or null */
window.MN_BUNDLES = (function(){
  "use strict";
  var SYSTEMS = [
    { id: "association", label: "Association", note: "within one hemisphere, lobe to lobe" },
    { id: "projection", label: "Projection", note: "between the cortex and the deep nuclei, the brainstem and the cord" },
    { id: "commissural", label: "Commissural", note: "across the midline, one hemisphere to the other" },
    { id: "cerebellar", label: "Cerebellar", note: "into, out of and within the cerebellum" },
    { id: "cranial", label: "Cranial nerves", note: "the nerves the atlas follows out of the brain" }
  ];
  var A = "association", P = "projection", C = "commissural", B = "cerebellar", N = "cranial";
  var LIST = [
    ["SLF1", "Superior longitudinal fasciculus I", A, "Joins the upper frontal lobe and the upper parietal lobe", "#FD7E82"],
    ["SLF2", "Superior longitudinal fasciculus II", A, "Joins the middle frontal gyrus and the angular gyrus", "#05A667"],
    ["SLF3", "Superior longitudinal fasciculus III", A, "Joins the inferior frontal gyrus and the supramarginal gyrus", "#C8B7FF"],
    ["AF", "Arcuate fasciculus", A, "Joins the frontal and temporal language areas, arching round the Sylvian fissure", "#E59811"],
    ["FAT", "Frontal aslant tract", A, "Joins the inferior frontal gyrus and the supplementary motor area", "#059EB1"],
    ["PAT", "Parietal aslant tract", A, "Runs obliquely within the parietal lobe, from its upper part to its lower", "#FDA4D2"],
    ["C_FP", "Cingulum, frontal and parietal", A, "Runs in the cingulate gyrus, from the frontal lobe to the parietal", "#94BB3B"],
    ["C_FPH", "Cingulum, frontal and parahippocampal", A, "Joins the frontal lobe and the parahippocampal gyrus, round the corpus callosum", "#5588EC"],
    ["C_PH", "Cingulum, parahippocampal", A, "Runs in the parahippocampal gyrus, toward the hippocampus", "#FCAE93"],
    ["C_PHP", "Cingulum, parahippocampal and parietal", A, "Joins the parahippocampal gyrus and the precuneus", "#0EC6AA"],
    ["C_PO", "Cingulum, parolfactory", A, "Runs in the parolfactory area, beneath the front of the corpus callosum", "#B06ACE"],
    ["UF", "Uncinate fasciculus", A, "Joins the orbitofrontal cortex and the temporal pole, hooking round the insula", "#E8C025"],
    ["EMC", "Extreme capsule", A, "Joins the inferior frontal and the temporal lobe, outside the claustrum", "#13BAF4"],
    ["IFOF", "Inferior fronto-occipital fasciculus", A, "Joins the frontal and the occipital lobe, through the temporal stem", "#D95B7A"],
    ["ILF", "Inferior longitudinal fasciculus", A, "Joins the occipital lobe and the front of the temporal lobe", "#7BDF81"],
    ["MdLF", "Middle longitudinal fasciculus", A, "Joins the superior temporal gyrus and the parietal and occipital lobes", "#9F9FFD"],
    ["VOF", "Vertical occipital fasciculus", A, "Joins the upper and the lower occipital lobe", "#CA7312"],
    ["CST", "Corticospinal tract", P, "From the motor cortex to the spinal cord", "#23DEE3"],
    ["CBT", "Corticobulbar tract", P, "From the motor cortex to the cranial nerves' nuclei in the brainstem", "#E781D2"],
    ["CPT_F", "Corticopontine tract, frontal", P, "From the frontal cortex to the pons, and on to the cerebellum", "#8E940A"],
    ["CPT_P", "Corticopontine tract, parietal", P, "From the parietal cortex to the pons", "#98C9FD"],
    ["CPT_O", "Corticopontine tract, occipital", P, "From the occipital cortex to the pons", "#FD8073"],
    ["ML", "Medial lemniscus", P, "Touch and the sense of position, from the medulla to the thalamus", "#16A478"],
    ["RST", "Reticulospinal tract", P, "From the brainstem's reticular formation to the spinal cord", "#D1B4FD"],
    ["DRTT", "Dentatorubrothalamic tract", P, "From the cerebellum's dentate nucleus to the red nucleus and the thalamus", "#DB9E12"],
    ["TR_A", "Thalamic radiation, anterior", P, "Joins the thalamus and the prefrontal cortex", "#199CB8"],
    ["TR_S", "Thalamic radiation, superior", P, "Joins the thalamus and the motor and sensory cortex", "#FDA6C7"],
    ["TR_P", "Thalamic radiation, posterior", P, "Joins the thalamus and the parietal and occipital cortex", "#82BF4D"],
    ["CS_A", "Corticostriatal tract, anterior", P, "From the frontal cortex to the striatum", "#6883EC"],
    ["CS_S", "Corticostriatal tract, superior", P, "From the motor and sensory cortex to the striatum", "#FFAE85"],
    ["CS_P", "Corticostriatal tract, posterior", P, "From the parietal and occipital cortex to the striatum", "#02C5B6"],
    ["OR", "Optic radiation", P, "From the thalamus's lateral geniculate to the visual cortex", "#B966C4"],
    ["AR", "Acoustic radiation", P, "From the thalamus's medial geniculate to the auditory cortex", "#DCC62C"],
    ["F", "Fornix", P, "From the hippocampus to the mammillary bodies and the septum", "#30B7FD"],
    ["CC", "Corpus callosum", C, "Joins the two hemispheres", "#DB5C6C"],
    ["AC", "Anterior commissure", C, "Joins the two temporal lobes and the olfactory areas", "#65E191"],
    ["SCP", "Superior cerebellar peduncle", B, "The cerebellum's main way out, to the midbrain and the thalamus", "#AB9AFC"],
    ["MCP", "Middle cerebellar peduncle", B, "The cerebellum's main way in, from the pons", "#C37903"],
    ["ICP", "Inferior cerebellar peduncle", B, "From the medulla and the spinal cord to the cerebellum", "#01DDEF"],
    ["CB", "Cerebellar hemisphere", B, "Runs within the cerebellar hemisphere", "#EE7EC5"],
    ["V", "Vermis", B, "Runs within the cerebellum's midline", "#81990A"],
    ["CNII", "Optic nerve and tract (II)", N, "From the eye to the thalamus's lateral geniculate", "#A0C6FF"],
    ["CNIII", "Oculomotor nerve (III)", N, "From the midbrain to the muscles that move the eye", "#FF8161"],
    ["CNV", "Trigeminal nerve (V)", N, "Between the pons and the face: its feeling, and chewing", "#12A385"],
    ["CNVII", "Facial nerve (VII)", N, "From the brainstem to the muscles of the face", "#DCAEFE"],
    ["CNVIII", "Vestibulocochlear nerve (VIII)", N, "Between the brainstem and the inner ear: hearing and balance", "#D2A408"]
  ].map(function(r){ return { base: r[0], name: r[1], system: r[2], joins: r[3], colour: r[4] }; });
  var byBase = {};
  LIST.forEach(function(b){ byBase[b.base] = b; });
  /* a group's id is the base with _L or _R, or the base alone across the midline */
  function find(id){
    id = String(id || "");
    var m = /^(.*)_([LR])$/.exec(id);
    if (m && byBase[m[1]]) return { bundle: byBase[m[1]], side: m[2] };
    if (byBase[id]) return { bundle: byBase[id], side: "" };
    return null;
  }
  return { SYSTEMS: SYSTEMS, LIST: LIST, find: find };
})();
