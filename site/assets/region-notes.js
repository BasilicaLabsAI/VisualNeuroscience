/* What each region does, and which layer of the brain it belongs to.

   The three layers are MacLean's triune scheme — reptilian core, limbic
   midbrain, neocortex. It is a useful way to stack a brain map and a poor
   account of how brains actually evolved: the "reptilian" structures are not
   reptilian, and every one of these layers is present in every vertebrate
   with a brain. It is kept here because it reads well as a stack, not
   because the evolutionary story holds up. The functions below are the part
   that does. They say what a region does and not where it sits: the maps
   show where.

   Keyed by AAL base name, so it lines up with MN_ATLAS.REGIONS. */
window.MN_NOTES = (function(){

var TIERS = [
  {id:"cerebrum",  label:"Cortex",
   sub:"the neocortical sheet — perception, language, planning, deliberate action"},
  {id:"midbrain",  label:"Midbrain &middot; limbic",
   sub:"memory, emotion and the body's inner report"},
  {id:"reptilian", label:"Reptilian core",
   sub:"the deep machinery — relay, habit, balance and timing"}
];

var NOTES = {
  /* ── cerebrum ─────────────────────────────────────────────────────── */
  Precentral:        {tier:"cerebrum", fn:"Sends the command that moves the body: the primary motor strip, mapped along its length from the tongue to the foot."},
  Frontal_Sup:       {tier:"cerebrum", fn:"Working memory and the holding of a plan while it is carried out; part of it belongs to the default network."},
  Frontal_Sup_Orb:   {tier:"cerebrum", fn:"Weighs the value of an option against what else is on offer."},
  Frontal_Mid:       {tier:"cerebrum", fn:"Most of the dorsolateral prefrontal cortex: holds a goal, checks progress against it, and switches when the goal changes."},
  Frontal_Mid_Orb:   {tier:"cerebrum", fn:"Part of the reward-valuation surface, pricing what is on offer."},
  Frontal_Inf_Oper:  {tier:"cerebrum", fn:"Half of Broca’s area on the left, assembling speech before it is spoken."},
  Frontal_Inf_Tri:   {tier:"cerebrum", fn:"The other half of Broca’s area; on the right it does more of the work of inhibiting an action already begun."},
  Frontal_Inf_Orb:   {tier:"cerebrum", fn:"Where language meets valuation: semantic work with an emotional weighting."},
  Rolandic_Oper:     {tier:"cerebrum", fn:"Mouth and throat sensation, and the motor control of speech."},
  Supp_Motor_Area:   {tier:"cerebrum", fn:"Prepares and sequences movement; it fires before a self-initiated action, not after it."},
  Frontal_Sup_Medial:{tier:"cerebrum", fn:"Self-referential thought, and the core of the default network that quiets when a task takes over."},
  Heschl:            {tier:"cerebrum", fn:"The primary auditory cortex: first cortical stop for sound, mapped by pitch from one end to the other."},
  Temporal_Sup:      {tier:"cerebrum", fn:"Works sound up into speech, and on the left holds Wernicke’s territory, where speech becomes meaning."},
  Temporal_Mid:      {tier:"cerebrum", fn:"Association cortex for understood speech and for what things mean, as distinct from how they sound."},
  Temporal_Inf:      {tier:"cerebrum", fn:"The far end of the ventral visual stream, where seeing becomes recognising."},
  Postcentral:       {tier:"cerebrum", fn:"Receives touch, pressure and limb position: the primary somatosensory strip, mapped body part by body part."},
  Parietal_Sup:      {tier:"cerebrum", fn:"Holds where things are relative to the body, and keeps that map current as the body moves."},
  Parietal_Inf:      {tier:"cerebrum", fn:"Binds sight, sound and touch into one scene, and supports the sense of a body owning it."},
  SupraMarginal:     {tier:"cerebrum", fn:"Phonological working memory: holding a sound in mind long enough to repeat it."},
  Angular:           {tier:"cerebrum", fn:"Where written words, numbers and meaning meet; damage on the left disrupts reading and calculation."},
  Precuneus:         {tier:"cerebrum", fn:"Mental imagery, autobiographical memory and the sense of a self placed in a scene. One of the most metabolically active regions at rest."},
  Paracentral_Lobule:{tier:"cerebrum", fn:"Sensation and motor control for the legs, feet and pelvic floor."},
  Calcarine:         {tier:"cerebrum", fn:"The primary visual cortex, V1. Every conscious sight starts here, mapped point for point onto the retina."},
  Cuneus:            {tier:"cerebrum", fn:"Early visual cortex handling the lower half of the visual field."},
  Lingual:           {tier:"cerebrum", fn:"Early visual cortex carrying the upper visual field, colour and word form."},
  Occipital_Sup:     {tier:"cerebrum", fn:"An early station on the dorsal stream, tracking where things are and how they move."},
  Occipital_Mid:     {tier:"cerebrum", fn:"Motion and form, where the dorsal and ventral visual streams part company."},
  Occipital_Inf:     {tier:"cerebrum", fn:"Feeds the ventral stream that turns shapes into recognised objects."},
  Fusiform:          {tier:"cerebrum", fn:"Recognises faces, and on the left the visual form of written words."},

  /* ── midbrain · limbic ────────────────────────────────────────────── */
  Olfactory:         {tier:"midbrain", fn:"Smell — the one sense that reaches the cortex without passing through the thalamus first."},
  Frontal_Med_Orb:   {tier:"midbrain", fn:"Puts a value on an outcome, and updates it when the outcome changes."},
  Rectus:            {tier:"midbrain", fn:"Ventromedial prefrontal territory tied to social judgement."},
  Insula:            {tier:"midbrain", fn:"Reads the state of the body — heartbeat, breath, gut, pain — and turns it into feeling; its anterior end flags what matters now."},
  Cingulum_Ant:      {tier:"midbrain", fn:"Registers conflict, effort and error, and prices how much a thing is costing to do."},
  Cingulum_Mid:      {tier:"midbrain", fn:"Links pain and negative outcomes to the actions that would avoid them."},
  Cingulum_Post:     {tier:"midbrain", fn:"Hub of the default network, and the region whose activity most reliably marks a mind turned inwards."},
  Hippocampus:       {tier:"midbrain", fn:"Lays down new episodic memory and maps space; without it, experience stops being recorded."},
  ParaHippocampal:   {tier:"midbrain", fn:"The corridor into the hippocampus, and where the scene around you is recognised as a place."},
  Amygdala:          {tier:"midbrain", fn:"Detects threat and emotional significance, and stamps a memory with how much it mattered."},
  Temporal_Pole_Sup: {tier:"midbrain", fn:"Paralimbic cortex binding sound and language to emotion and social meaning."},
  Temporal_Pole_Mid: {tier:"midbrain", fn:"Semantic memory for people and concepts, and one of the first regions lost in semantic dementia."},

  /* ── reptilian core ───────────────────────────────────────────────── */
  Caudate:           {tier:"reptilian", fn:"Learns which action leads to which outcome; the striatal end of the loops that start and stop behaviour."},
  Putamen:           {tier:"reptilian", fn:"Turns a practised sequence into a habit that runs without supervision."},
  Pallidum:          {tier:"reptilian", fn:"The basal ganglia’s output gate: holds movement in check, and releases what is selected."},
  Thalamus:          {tier:"reptilian", fn:"Almost everything the cortex knows arrives through here; it relays and gates, and decides what gets through at all."},
  Cerebelum_Crus1:   {tier:"reptilian", fn:"Connected to prefrontal cortex: this part of the cerebellum works on thought and language, not movement."},
  Cerebelum_Crus2:   {tier:"reptilian", fn:"With Crus I, the cognitive cerebellum, tied to working memory and language."},
  Cerebelum_3:       {tier:"reptilian", fn:"Works on the limbs and posture."},
  Cerebelum_4_5:     {tier:"reptilian", fn:"Refines the timing and force of movement."},
  Cerebelum_6:       {tier:"reptilian", fn:"Sensorimotor and cognitive both, and heavily involved in speech."},
  Cerebelum_7b:      {tier:"reptilian", fn:"On the cognitive side of the cerebellum’s division of labour."},
  Cerebelum_8:       {tier:"reptilian", fn:"A second sensorimotor map of the body."},
  Cerebelum_9:       {tier:"reptilian", fn:"Vestibular and default-network connected, tied to balance and to self-motion."},
  Cerebelum_10:      {tier:"reptilian", fn:"The oldest part of the cerebellum: holds the eyes steady as the head moves."},
  Vermis_1_2:        {tier:"reptilian", fn:"Midline cerebellum for posture and the trunk."},
  Vermis_3:          {tier:"reptilian", fn:"Works on the trunk rather than the limbs."},
  Vermis_4_5:        {tier:"reptilian", fn:"Posture and the muscles that hold the body upright."},
  Vermis_6:          {tier:"reptilian", fn:"Eye movement and the coordination of gaze."},
  Vermis_7:          {tier:"reptilian", fn:"Part of the oculomotor vermis, tuning the accuracy of a saccade."},
  Vermis_8:          {tier:"reptilian", fn:"Gait and the rhythm of walking."},
  Vermis_9:          {tier:"reptilian", fn:"Balance and the sense of which way is up."},
  Vermis_10:         {tier:"reptilian", fn:"Vestibular processing at the cerebellum’s oldest core."}
};

return { TIERS: TIERS, NOTES: NOTES };
})();
