/* The Brodmann areas, as the shipped atlas draws them.

   Brodmann published 52 areas in 1909, numbered in the order he cut and
   stained them rather than by where they sit or what they do — which is why
   the numbers jump about the brain. Several of the 52 were described in
   monkey and have no agreed human counterpart, and the atlas here carries the
   41 that do: 12–16, 31, 33 and 49–52 are absent.

   Every area is bilateral in this atlas: Brodmann numbered cortical types,
   not hemispheres, so a single label covers both sides. Where a function is
   strongly lateralised in most people — language, most obviously — the note
   says so rather than the atlas splitting the area in two.

   `tags` exists only to be searched. What an area is for and what someone
   types to look for it are different vocabularies — nobody searching "working
   memory" should be handed whichever areas happen to use that exact phrase in
   their prose, and area 46 does not use it at all. The tags carry the words
   people actually reach for, including abbreviations and both spellings of
   colour, and are never shown.

   `fn` is what the area is for. `note` is the caveat that belongs with it:
   a boundary that is disputed, a name that means two things, or a function
   that is better established for some of the area than for all of it.

   Keyed by the label value in assets/brodmann.nii.gz. */
window.MN_BRODMANN = (function(){

var AREAS = [
  {ba:1, at:[15.0,-42.0,72.0], vox:3079,  name:"Primary somatosensory cortex", region:"Postcentral gyrus, crown", lobe:"parietal",
   tags:"touch somatosensory S1 skin texture homunculus body map",
   fn:"Touch. Takes the skin senses from the thalamus and lays them out as a map of the body — the homunculus — with the lips and fingertips given far more cortex than their size warrants. Reads texture and the fine detail of contact.",
   note:"Areas 3, 1 and 2 form one strip and are usually treated together as S1; the boundaries between them are cytoarchitectural, not visible on a scan."},
  {ba:2, at:[17.0,-39.0,59.0], vox:14491,  name:"Primary somatosensory cortex", region:"Postcentral gyrus, posterior", lobe:"parietal",
   tags:"proprioception touch somatosensory S1 shape stereognosis body",
   fn:"Proprioception and shape. The posterior strip of S1, weighted towards deep sensation — joint position, limb pressure, the size and form of a held object rather than the feel of its surface.",
   note:"Damage here impairs recognising objects by handling them alone, with ordinary touch intact."},
  {ba:3, at:[19.0,-31.0,59.0], vox:24988,  name:"Primary somatosensory cortex", region:"Posterior bank of the central sulcus", lobe:"parietal",
   tags:"touch somatosensory S1 skin proprioception central sulcus",
   fn:"The first cortical stop for body sensation. Area 3b receives skin input and 3a receives muscle spindles, both arriving from the ventral posterior thalamus. Most of it is buried in the sulcus rather than on the surface.",
   note:"3a and 3b are separate cytoarchitectural fields; this atlas does not divide them."},
  {ba:4, at:[1.0,-23.0,60.0], vox:34133,  name:"Primary motor cortex", region:"Precentral gyrus", lobe:"frontal",
   tags:"motor M1 movement voluntary movement corticospinal Betz homunculus paralysis",
   fn:"Voluntary movement. The output stage: its giant Betz cells contribute much of the corticospinal tract, and stimulating a point here moves a specific part of the body. Mapped as a homunculus mirroring the sensory one across the central sulcus.",
   note:"It executes rather than decides — the plan arrives from area 6 and the parietal cortex."},
  {ba:5, at:[1.0,-50.0,66.0], vox:15942,  name:"Somatosensory association cortex", region:"Superior parietal lobule, anterior", lobe:"parietal",
   tags:"somatosensory association reaching proprioception body superior parietal",
   fn:"Integrates touch with limb position to build a sense of where the body is and what it is holding. Feeds reaching and grasping.",
   note:""},
  {ba:6, at:[1.0,-3.0,56.0], vox:98011,  name:"Premotor cortex and supplementary motor area", region:"Precentral gyrus, anterior; medial frontal", lobe:"frontal",
   tags:"premotor supplementary motor area SMA movement planning sequencing preparation",
   fn:"Planning and sequencing movement before it happens. The lateral part prepares movements cued by something in the world; the medial part, the SMA, prepares self-initiated sequences and holds their order.",
   note:"One Brodmann number covering two functionally distinct territories — lateral premotor and SMA are routinely separated in imaging work."},
  {ba:7, at:[1.0,-65.0,53.0], vox:49438,  name:"Superior parietal lobule and precuneus", region:"Superior parietal, medial and lateral", lobe:"parietal",
   tags:"spatial attention reaching visuomotor precuneus default mode optic ataxia eye hand",
   fn:"Where vision meets action: guiding the hand to what the eye has found, holding attention on a location, and building the spatial frame the body moves through. The medial part, the precuneus, is also a hub of the default mode network.",
   note:"Lesions can produce optic ataxia — reaching that misses under visual guidance while vision and movement are each intact."},
  {ba:8, at:[0.0,23.0,56.0], vox:25307,  name:"Frontal eye fields and superior frontal", region:"Posterior middle and superior frontal gyri", lobe:"frontal",
   tags:"frontal eye fields FEF eye movement eye movements saccades gaze looking",
   fn:"Moving the eyes on purpose. Contains the frontal eye field, which drives voluntary saccades and holds gaze against distraction; the surrounding cortex is involved in managing uncertainty about what to do next.",
   note:"The frontal eye field is a part of area 8, not the whole of it."},
  {ba:9, at:[0.0,37.0,43.0], vox:36227,  name:"Dorsolateral prefrontal cortex", region:"Superior and middle frontal gyri", lobe:"frontal",
   tags:"dorsolateral prefrontal DLPFC working memory executive function attention control inhibition",
   fn:"Executive control. Holding information in mind while working on it, sustaining attention, suppressing the obvious-but-wrong response, and keeping a goal in play across a delay.",
   note:"Areas 9 and 46 together are what most papers mean by DLPFC; the split between them is not consistent across studies."},
  {ba:10, at:[0.0,59.0,10.0], vox:37235, name:"Frontopolar cortex", region:"Anterior prefrontal, frontal pole", lobe:"frontal",
   tags:"frontopolar anterior prefrontal prospective memory multitasking planning abstract reasoning",
   fn:"The furthest forward cortex there is, and proportionally larger in humans than in any other primate. Associated with holding an intention while doing something else, switching between goals, and reasoning about things not present.",
   note:"Among the least understood areas in the brain: it is large, late-developing, and its functions are described more confidently than the evidence supports."},
  {ba:11, at:[0.0,42.0,-12.0], vox:65959, name:"Orbitofrontal cortex", region:"Orbital gyri, gyrus rectus", lobe:"frontal",
   tags:"orbitofrontal OFC reward value valuation decision making judgement personality",
   fn:"Putting a value on things. Represents how rewarding or aversive an outcome is expected to be, and updates that when the world changes — which is what lets behaviour follow consequences rather than habit.",
   note:"Damage here spares intelligence and memory while wrecking judgement; Phineas Gage's injury is the classic account."},
  {ba:17, at:[-1.0,-79.0,6.0], vox:30366, name:"Primary visual cortex (V1)", region:"Calcarine sulcus, striate cortex", lobe:"occipital",
   tags:"primary visual V1 striate vision sight seeing retinotopic blindness",
   fn:"The first cortical stage of sight. Receives the retina by way of the lateral geniculate nucleus and holds a retinotopic map, with the central few degrees of vision taking a disproportionate share. Its cells respond to edges at particular orientations.",
   note:"Called striate for the stripe of Gennari visible in section — the one Brodmann area identifiable by eye."},
  {ba:18, at:[5.0,-83.0,8.0], vox:77215, name:"Secondary visual cortex (V2)", region:"Occipital, surrounding V1", lobe:"occipital",
   tags:"V2 secondary visual vision contour figure ground grouping",
   fn:"The second pass: binds edges into contours, separates figure from ground, and begins to represent shapes rather than the lines that bound them.",
   note:""},
  {ba:19, at:[13.0,-79.0,15.0], vox:82758, name:"Associative visual cortex (V3, V4, V5)", region:"Lateral and ventral occipital", lobe:"occipital",
   tags:"V3 V4 V5 MT visual association motion colour color form dorsal ventral stream",
   fn:"Where vision divides. Motion, colour constancy and complex form are handled across this territory, and the two great visual streams leave it — dorsally towards the parietal lobe for where and how, ventrally towards the temporal lobe for what.",
   note:"A Brodmann number covering several functionally distinct visual areas that are now mapped separately."},
  {ba:20, at:[24.0,-17.0,-19.0], vox:89799, name:"Inferior temporal gyrus", region:"Inferior temporal, lateral", lobe:"temporal",
   tags:"inferior temporal object recognition ventral stream vision what pathway",
   fn:"The far end of the ventral stream: recognising objects regardless of size, lighting or angle. Cells here respond to whole objects rather than to features.",
   note:""},
  {ba:21, at:[44.0,-28.0,-5.0], vox:46894, name:"Middle temporal gyrus", region:"Middle temporal", lobe:"temporal",
   tags:"middle temporal semantics language meaning tools actions auditory",
   fn:"Meaning. Involved in retrieving what words and objects refer to, in knowledge of actions and tools, and in making sense of sound that carries information.",
   note:"Strongly left-lateralised for language in most right-handed people."},
  {ba:22, at:[48.0,-30.0,6.0], vox:22652, name:"Superior temporal gyrus, including Wernicke's area", region:"Superior temporal", lobe:"temporal",
   tags:"Wernicke speech comprehension auditory association language aphasia hearing words",
   fn:"Turning sound into speech. The posterior part on the left is Wernicke's area, where heard words become words rather than noise; damage produces fluent speech emptied of sense, and comprehension that fails without the speaker noticing.",
   note:"Wernicke's area is a posterior part of left area 22 — its exact boundary has been disputed for a century."},
  {ba:23, at:[1.0,-37.0,31.0], vox:18943, name:"Posterior cingulate cortex, ventral", region:"Posterior cingulate", lobe:"cingulate",
   tags:"posterior cingulate PCC default mode self referential memory retrieval Alzheimer",
   fn:"A core hub of the default mode network: most active when attention is turned inward — remembering, imagining, thinking about oneself — and suppressed by demanding external tasks.",
   note:"Among the first regions to show reduced metabolism in Alzheimer's disease."},
  {ba:24, at:[0.0,17.0,31.0], vox:10500, name:"Anterior cingulate cortex, ventral", region:"Anterior cingulate", lobe:"cingulate",
   tags:"anterior cingulate ACC emotion pain autonomic conflict affect",
   fn:"Where feeling meets control. Registers the affective side of pain and effort, tracks conflict between competing responses, and drives the autonomic changes that go with emotion.",
   note:""},
  {ba:25, at:[-1.0,16.0,-5.0], vox:13692, name:"Subgenual cingulate cortex", region:"Below the genu of the corpus callosum", lobe:"cingulate",
   tags:"subgenual cingulate depression mood deep brain stimulation DBS treatment resistant",
   fn:"A small area with an outsized role in mood. Overactive in depression and quietened by treatments that work, which made it the target for deep brain stimulation in treatment-resistant cases.",
   note:"The DBS trials have been mixed: early open-label results were striking, the controlled trial was not."},
  {ba:26, at:[2.0,-41.0,23.0], vox:1836, name:"Ectosplenial area", region:"Behind the splenium, retrosplenial", lobe:"cingulate",
   tags:"ectosplenial retrosplenial spatial memory scene construction",
   fn:"A thin strip of retrosplenial cortex involved in spatial memory and in building the scene a remembered or imagined event takes place in.",
   note:"Small and difficult to separate from areas 29 and 30 on a scan."},
  {ba:27, at:[5.0,-37.0,-1.0], vox:7536, name:"Piriform and presubicular cortex", region:"Medial temporal, uncal", lobe:"temporal",
   tags:"piriform olfaction smell presubiculum odour odor",
   fn:"Olfaction, and the approach to the hippocampus. Piriform cortex receives smell directly from the olfactory bulb — the one sense that reaches cortex without passing through the thalamus.",
   note:""},
  {ba:28, at:[-11.0,1.0,-24.0], vox:4857, name:"Entorhinal cortex", region:"Parahippocampal gyrus, anterior", lobe:"temporal",
   tags:"entorhinal memory grid cells navigation Alzheimer hippocampus gateway",
   fn:"The doorway to the hippocampus. Nearly everything the cortex sends to memory passes through here, and its grid cells carry a metric for space that underpins navigation.",
   note:"The first cortical site where Alzheimer's tangles appear, typically years before symptoms."},
  {ba:29, at:[1.0,-43.0,12.0], vox:2725, name:"Retrosplenial cingulate, granular", region:"Retrosplenial", lobe:"cingulate",
   tags:"retrosplenial navigation spatial orientation episodic memory granular",
   fn:"Translating between the view from here and the map from above — the step that lets a remembered layout be used from a new vantage point. Central to navigation and to recalling episodes in their place.",
   note:""},
  {ba:30, at:[-4.0,-37.0,-13.0], vox:19575, name:"Retrosplenial cingulate, agranular", region:"Retrosplenial", lobe:"cingulate",
   tags:"retrosplenial navigation spatial orientation episodic memory agranular",
   fn:"The agranular half of the retrosplenial cortex, working with area 29 on spatial orientation and episodic memory.",
   note:""},
  {ba:32, at:[0.0,34.0,31.0], vox:32053, name:"Anterior cingulate cortex, dorsal", region:"Dorsal anterior cingulate", lobe:"cingulate",
   tags:"dorsal anterior cingulate dACC conflict monitoring error detection effort salience",
   fn:"Monitoring how things are going: detecting errors, registering conflict between what is being done and what should be, and signalling that more effort is required. A node of the salience network.",
   note:"Whether it detects conflict, predicts effort cost, or signals surprise is still argued over."},
  {ba:34, at:[12.0,-1.0,-14.0], vox:4901, name:"Anterior entorhinal cortex", region:"Uncus, medial temporal", lobe:"temporal",
   tags:"entorhinal uncus olfaction smell amygdala memory",
   fn:"The uncal part of the entorhinal region, taking olfactory input and feeding the amygdala and hippocampus.",
   note:""},
  {ba:35, at:[-8.0,-12.0,-24.0], vox:6928, name:"Perirhinal cortex", region:"Collateral sulcus, medial temporal", lobe:"temporal",
   tags:"perirhinal recognition memory familiarity objects",
   fn:"Recognition memory for objects — the sense that a thing has been met before, which is separable from recalling where or when.",
   note:""},
  {ba:36, at:[-14.0,-2.0,-34.0], vox:14783, name:"Ectorhinal and parahippocampal cortex", region:"Parahippocampal gyrus", lobe:"temporal",
   tags:"parahippocampal scene context memory place area PPA",
   fn:"Memory for scenes and context. Overlaps the parahippocampal place area, which responds to places and spatial layouts far more than to objects within them.",
   note:""},
  {ba:37, at:[-13.0,-51.0,-21.0], vox:81365, name:"Fusiform and occipitotemporal cortex", region:"Fusiform gyrus", lobe:"temporal",
   tags:"fusiform face recognition faces FFA visual word form reading VWFA colour",
   fn:"Recognising the highly practised. Carries the fusiform face area, which responds to faces more than to any other object class, and on the left the visual word form area, which responds to written words in a language the reader knows.",
   note:"Whether the face area is dedicated to faces or to any category of long expertise is a long-running argument."},
  {ba:38, at:[20.0,17.0,-26.0], vox:27141, name:"Temporal pole", region:"Anterior temporal", lobe:"temporal",
   tags:"temporal pole semantic memory social emotion semantic dementia knowledge",
   fn:"Where meaning is stored and where meaning meets feeling: general knowledge about things and people, and the emotional weight attached to them.",
   note:"Atrophies in semantic dementia, which erodes knowledge of what things are while leaving fluent speech."},
  {ba:39, at:[32.0,-65.0,20.0], vox:28753, name:"Angular gyrus", region:"Inferior parietal lobule, posterior", lobe:"parietal",
   tags:"angular gyrus reading semantics number theory of mind Gerstmann arithmetic",
   fn:"A crossroads. Involved in reading, in retrieving meaning, in number, and in taking someone else's point of view — functions that share little except needing several kinds of information brought together at once.",
   note:"Left-sided damage can produce Gerstmann syndrome: losing writing, arithmetic, left-right sense and finger naming together."},
  {ba:40, at:[27.0,-47.0,40.0], vox:32231, name:"Supramarginal gyrus", region:"Inferior parietal lobule, anterior", lobe:"parietal",
   tags:"supramarginal phonological loop working memory tool use body schema neglect",
   fn:"Holding speech sounds in mind long enough to use them, and knowing where the body is and how a tool is handled. The phonological loop of working memory depends on it.",
   note:"Right-sided damage is a common cause of hemispatial neglect."},
  {ba:41, at:[34.0,-41.0,17.0], vox:8073, name:"Primary auditory cortex", region:"Heschl's gyrus", lobe:"temporal",
   tags:"primary auditory A1 Heschl hearing sound tonotopic deafness",
   fn:"The first cortical stage of hearing, laid out tonotopically — low frequencies at one end, high at the other. Buried in the Sylvian fissure rather than on the surface.",
   note:""},
  {ba:42, at:[-48.0,-40.0,12.0], vox:6569, name:"Auditory association cortex", region:"Lateral Heschl's gyrus, planum temporale", lobe:"temporal",
   tags:"auditory association planum temporale hearing sound speech melody voice",
   fn:"The second pass at sound: patterns rather than tones — a melody, a voice, a syllable. Feeds area 22 and the speech system.",
   note:"The planum temporale is typically larger on the left, one of the earliest anatomical asymmetries found in the human brain."},
  {ba:43, at:[52.0,-8.0,25.0], vox:6683, name:"Subcentral area, gustatory cortex", region:"Base of the pre- and postcentral gyri", lobe:"parietal",
   tags:"gustatory taste subcentral mouth throat operculum",
   fn:"Taste, and sensation from the mouth and throat. Sits at the foot of the central sulcus where the body map runs out.",
   note:"Primary taste cortex is often placed in the frontal operculum and insula as much as here."},
  {ba:44, at:[-29.0,15.0,33.0], vox:18843, name:"Pars opercularis, Broca's area", region:"Inferior frontal gyrus, posterior", lobe:"frontal",
   tags:"Broca speech production syntax language aphasia pars opercularis grammar",
   fn:"Producing speech and handling its structure. With area 45 it forms Broca's area on the left; damage leaves comprehension largely intact while speech becomes effortful, sparse and stripped of grammar.",
   note:"Broca's area is areas 44 and 45 on the dominant side — usually but not always the left."},
  {ba:45, at:[34.0,36.0,12.0], vox:28499, name:"Pars triangularis, Broca's area", region:"Inferior frontal gyrus, anterior", lobe:"frontal",
   tags:"Broca semantics word selection language pars triangularis retrieval",
   fn:"Selecting the right word against competition, and retrieving meaning under control. The more semantic half of Broca's area, where 44 is the more syntactic.",
   note:""},
  {ba:46, at:[-19.0,48.0,22.0], vox:28523, name:"Dorsolateral prefrontal cortex", region:"Middle frontal gyrus", lobe:"frontal",
   tags:"dorsolateral prefrontal DLPFC working memory attention TMS depression maintenance",
   fn:"Keeping information active in the absence of the thing itself, and using it to guide what happens next. The clearest working-memory territory in the frontal lobe.",
   note:"The standard target for repetitive TMS in depression, usually on the left."},
  {ba:47, at:[18.0,33.0,-3.0], vox:34452, name:"Pars orbitalis, ventrolateral prefrontal", region:"Inferior frontal gyrus, orbital", lobe:"frontal",
   tags:"ventrolateral prefrontal VLPFC inhibition semantics pars orbitalis response selection",
   fn:"Stopping and choosing: suppressing a response already under way, and picking among competing options. Also carries semantic retrieval, continuous with area 45 above it.",
   note:""},
  {ba:48, at:[-38.0,-14.0,7.0], vox:158164, name:"Peri-Sylvian and insular territory", region:"Insula, operculum, temporal stem", lobe:"temporal",
   tags:"insula insular operculum retrosubicular perisylvian sylvian temporal stem catch all",
   fn:"In this atlas, label 48 does not draw Brodmann's retrosubicular area. Cross-tabulated against AAL it is the insula (15%), the Rolandic operculum (10%), the superior temporal gyrus (10%), the putamen (6%) and the supramarginal gyrus (6%), with a third of it falling in white matter that AAL does not label as cortex at all.",
   note:"Treat this label as the peri-Sylvian territory it actually covers rather than as an area with a function. It is the largest label in the volume — nearly a tenth of everything labelled — which is a sign of a catch-all, not of an area."}
];

var LOBES = [
  {id:"frontal",   label:"Frontal",   sub:"movement, planning, speech"},
  {id:"parietal",  label:"Parietal",  sub:"touch, space, the body"},
  {id:"temporal",  label:"Temporal",  sub:"hearing, memory, meaning"},
  {id:"occipital", label:"Occipital", sub:"vision"},
  {id:"cingulate", label:"Cingulate", sub:"attention, feeling, navigation"}
];


/* Which areas share a border, measured off the volume rather than asserted:
   every pair of different labels meeting face-to-face was counted, and a pair
   is an edge here if it meets across at least 150 voxel faces. Below that the
   contact is an artefact of labels that were grown outward into white matter,
   not a boundary. 118 edges over the 41 areas, and nothing isolated.

   [a, b, faces] — faces is how much border the two share, which the graph
   draws as the weight of the line. */
var EDGES = [[18,19,11186],[17,18,8549],[4,6,6059],[19,37,5925],[3,4,5548],[21,22,5466],[20,21,5240],[20,37,4631],[10,11,4339],[20,36,3668],[11,47,3174],[22,48,2944],[2,40,2897],[6,44,2870],[7,19,2867],[44,48,2807],[45,48,2762],[45,46,2742],[6,8,2567],[2,3,2497],[19,39,2497],[8,9,2450],[5,7,2442],[9,46,2367],[21,37,2340],[47,48,2318],[24,32,2113],[11,25,2112],[10,46,2034],[22,42,1982],[41,48,1977],[6,48,1873],[7,40,1770],[39,40,1734],[10,32,1672],[45,47,1656],[9,32,1649],[30,37,1640],[20,38,1550],[38,48,1545],[43,48,1512],[38,47,1502],[40,48,1479],[20,48,1426],[42,48,1362],[1,3,1353],[2,48,1279],[21,38,1262],[37,39,1165],[21,48,1126],[34,48,1122],[27,30,1079],[46,47,1066],[8,32,1041],[7,39,1031],[44,45,1016],[6,9,990],[20,30,969],[11,48,949],[35,36,935],[3,48,897],[6,32,851],[44,46,826],[17,30,820],[1,2,809],[17,19,783],[9,10,751],[9,44,744],[30,35,719],[28,36,708],[28,35,686],[27,37,646],[28,34,645],[46,48,623],[19,30,578],[17,23,566],[23,26,562],[36,38,559],[11,32,551],[4,5,543],[2,7,536],[3,43,533],[10,47,527],[41,42,520],[21,41,513],[23,30,504],[29,30,498],[3,40,480],[2,5,480],[18,23,462],[22,39,461],[21,39,454],[1,5,415],[4,43,412],[18,30,396],[11,38,380],[4,48,350],[25,48,317],[30,36,283],[6,43,281],[27,29,277],[22,40,274],[23,24,267],[24,25,249],[39,41,246],[3,6,233],[20,22,220],[34,38,219],[22,41,212],[1,43,201],[26,30,196],[20,34,184],[28,38,172],[7,18,161],[3,5,157],[34,36,152],[26,29,152],[38,45,151]];

var BY_BA = {};
AREAS.forEach(function(a){ BY_BA[a.ba] = a; });

/* The label list the atlas volume is indexed by: position n is the name of
   voxel value n, and the gaps Brodmann's numbering leaves are blank. */
var MAX = 0;
AREAS.forEach(function(a){ if (a.ba > MAX) MAX = a.ba; });
var LABELS = new Array(MAX + 1).fill("");
LABELS[0] = "Air";
AREAS.forEach(function(a){ LABELS[a.ba] = "BA" + a.ba + " " + a.name; });

return { AREAS: AREAS, LOBES: LOBES, BY_BA: BY_BA, LABELS: LABELS,
           MAX: MAX, EDGES: EDGES };
})();
