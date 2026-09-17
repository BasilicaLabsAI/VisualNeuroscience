#!/usr/bin/env node
/* Build the receptor-density dataset the Region Atlas draws, from two open
   sources, onto the site's own AAL-116 volume.

   1. In vivo PET. The group-average tracer maps compiled by Hansen et al.
      2022 (Nature Neuroscience 25:1569, github.com/netneurolab/hansen_receptors,
      CC BY-NC-SA 4.0). One map per receptor or transporter, the one the
      paper's Table 1 names where its volume covers the cortex, otherwise the
      fullest alternative in the same repository. Each map is read as NIfTI
      (either byte order, any sform/qform), every AAL voxel is looked up at
      the map's nearest voxel through both affines, and the per-label mean of
      finite non-zero samples is kept, with the fraction of the label that
      the map actually covered. A label the map covers less than half of is
      left empty rather than averaged over padding.

   2. Ex vivo autoradiography. Zilles & Palomero-Gallagher 2017 (Frontiers in
      Neuroanatomy 11:78, CC BY 4.0): 15 receptors in 44 cytoarchitectonic
      areas of three post-mortem brains, fmol/mg protein, as redistributed in
      the same repository (data/autoradiography, via Goulas et al. 2021). The
      44 areas are mapped onto AAL regions by the table below, and a region's
      value is the mean of the areas mapped onto it. Every mapping is marked
      exact or approximate, and the page shows the mark.

   Usage:
       git clone --depth 1 https://github.com/netneurolab/hansen_receptors /tmp/hansen
       node scripts/build_receptor_data.mjs /tmp/hansen

   Writes site/assets/receptor-data.js, which the page and the MCP build
   read, and the same numbers as CSV under backend/data/receptors/ so the
   derived table is shared under the licences it inherits. */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import zlib from "node:zlib";

const root = path.dirname(path.dirname(url.fileURLToPath(import.meta.url)));
const hansen = process.argv[2];
if (!hansen || !fs.existsSync(path.join(hansen, "data", "PET_nifti_images"))) {
  console.error("usage: node scripts/build_receptor_data.mjs <path to hansen_receptors clone>");
  process.exit(1);
}

/* ── the atlas ─────────────────────────────────────────────────────────── */
function evalAsset(file) {
  const w = {};
  new Function("window", "document", fs.readFileSync(path.join(root, "site", file), "utf8"))(w, { currentScript: null });
  return w;
}
const ATLAS = evalAsset("assets/atlas-data.js").MN_ATLAS;
/* the cerebrum only: for most tracers the cerebellum is the reference
   region, so its binding is zero by construction and would mislead */
const REGIONS = ATLAS.REGIONS.filter(r => r.group !== "Cerebellum" && r.group !== "Vermis")
  .map(r => ({ base: r.base, name: r.pretty, group: r.group, L: r.L, R: r.R }));

/* ── NIfTI ─────────────────────────────────────────────────────────────── */
function readNifti(p) {
  let buf = fs.readFileSync(p);
  if (p.endsWith(".gz")) buf = zlib.gunzipSync(buf);
  const le = buf.readInt32LE(0) === 348;
  if (!le && buf.readInt32BE(0) !== 348) throw new Error("not NIfTI-1: " + p);
  const i16 = o => le ? buf.readInt16LE(o) : buf.readInt16BE(o);
  const f32 = o => le ? buf.readFloatLE(o) : buf.readFloatBE(o);
  const dim = [i16(42), i16(44), i16(46)];
  const dt = i16(70), vox = f32(108), slope = f32(112), inter = f32(116);
  const pix = [f32(80), f32(84), f32(88)];
  const qcode = i16(252), scode = i16(254);
  let A;
  if (scode > 0) {
    A = [[f32(280), f32(284), f32(288), f32(292)], [f32(296), f32(300), f32(304), f32(308)], [f32(312), f32(316), f32(320), f32(324)]];
  } else if (qcode > 0) {
    const b = f32(256), c = f32(260), d = f32(264), qx = f32(268), qy = f32(272), qz = f32(276);
    const a = Math.sqrt(Math.max(0, 1 - b * b - c * c - d * d));
    const qfac = f32(76) < 0 ? -1 : 1;
    const R = [[a*a+b*b-c*c-d*d, 2*b*c-2*a*d, 2*b*d+2*a*c], [2*b*c+2*a*d, a*a+c*c-b*b-d*d, 2*c*d-2*a*b], [2*b*d-2*a*c, 2*c*d+2*a*b, a*a+d*d-c*c-b*b]];
    A = R.map((row, i) => [row[0] * pix[0], row[1] * pix[1], row[2] * pix[2] * qfac, [qx, qy, qz][i]]);
  } else {
    A = [[pix[0], 0, 0, 0], [0, pix[1], 0, 0], [0, 0, pix[2], 0]];
  }
  const n = dim[0] * dim[1] * dim[2], off = Math.round(vox);
  const rd = { 2: o => buf.readUInt8(o), 4: o => le ? buf.readInt16LE(o) : buf.readInt16BE(o), 8: o => le ? buf.readInt32LE(o) : buf.readInt32BE(o),
               16: o => le ? buf.readFloatLE(o) : buf.readFloatBE(o), 64: o => le ? buf.readDoubleLE(o) : buf.readDoubleBE(o), 512: o => le ? buf.readUInt16LE(o) : buf.readUInt16BE(o) }[dt];
  const sz = { 2: 1, 4: 2, 8: 4, 16: 4, 64: 8, 512: 2 }[dt];
  if (!rd) throw new Error("datatype " + dt + " in " + p);
  const s = slope !== 0 ? slope : 1, t = slope !== 0 ? inter : 0;
  const data = new Float32Array(n);
  for (let i = 0; i < n; i++) data[i] = rd(off + i * sz) * s + t;
  return { dim, A, data };
}
function invert(A) {
  const [a, b, c] = A;
  const det = a[0]*(b[1]*c[2]-b[2]*c[1]) - a[1]*(b[0]*c[2]-b[2]*c[0]) + a[2]*(b[0]*c[1]-b[1]*c[0]);
  const inv = [[(b[1]*c[2]-b[2]*c[1])/det, (a[2]*c[1]-a[1]*c[2])/det, (a[1]*b[2]-a[2]*b[1])/det],
               [(b[2]*c[0]-b[0]*c[2])/det, (a[0]*c[2]-a[2]*c[0])/det, (a[2]*b[0]-a[0]*b[2])/det],
               [(b[0]*c[1]-b[1]*c[0])/det, (a[1]*c[0]-a[0]*c[1])/det, (a[0]*b[1]-a[1]*b[0])/det]];
  const tr = [a[3], b[3], c[3]];
  return inv.map(r => [r[0], r[1], r[2], -(r[0]*tr[0] + r[1]*tr[1] + r[2]*tr[2])]);
}
const aal = readNifti(path.join(root, "site", "assets", "aal.nii.gz"));
const [nx, ny, nz] = aal.dim;
/* world coordinates of every labelled AAL voxel, computed once */
const labelled = [];
{
  let idx = 0;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++, idx++) {
    const lab = aal.data[idx]; if (!lab) continue;
    labelled.push(lab,
      aal.A[0][0]*i + aal.A[0][1]*j + aal.A[0][2]*k + aal.A[0][3],
      aal.A[1][0]*i + aal.A[1][1]*j + aal.A[1][2]*k + aal.A[1][3],
      aal.A[2][0]*i + aal.A[2][1]*j + aal.A[2][2]*k + aal.A[2][3]);
  }
}
function parcellate(file) {
  const m = readNifti(file);
  const inv = invert(m.A);
  const [mx, my, mz] = m.dim;
  const sum = new Float64Array(200), cnt = new Uint32Array(200), tot = new Uint32Array(200);
  for (let p = 0; p < labelled.length; p += 4) {
    const lab = labelled[p], wx = labelled[p + 1], wy = labelled[p + 2], wz = labelled[p + 3];
    const vi = Math.round(inv[0][0]*wx + inv[0][1]*wy + inv[0][2]*wz + inv[0][3]);
    const vj = Math.round(inv[1][0]*wx + inv[1][1]*wy + inv[1][2]*wz + inv[1][3]);
    const vk = Math.round(inv[2][0]*wx + inv[2][1]*wy + inv[2][2]*wz + inv[2][3]);
    tot[lab]++;
    if (vi < 0 || vj < 0 || vk < 0 || vi >= mx || vj >= my || vk >= mz) continue;
    const v = m.data[vi + vj * mx + vk * mx * my];
    if (!Number.isFinite(v) || v === 0) continue;
    sum[lab] += v; cnt[lab]++;
  }
  return lab => ({ mean: cnt[lab] ? sum[lab] / cnt[lab] : null, cov: tot[lab] ? cnt[lab] / tot[lab] : 0 });
}

/* ── the PET maps: one per receptor, with what Table S3 of the paper says
   about each. Where the paper's first choice is a Copenhagen map whose
   volumetric form carries subcortex only (the cortex lives on the surface
   version), the next-fullest map of the same target in the repository is
   used, and the note says so. ──────────────────────────────────────────── */
const PET = [
  { id: "D1", name: "D1", family: "Dopamine", file: "D1_SCH23390_hc13_kaller.nii", tracer: "[11C]SCH23390", measure: "BPND", ref: "cerebellum", n: 13, age: "33 (SD 13)",
    cite: "Kaller S et al., Eur J Nucl Med Mol Imaging 2017" },
  { id: "D2", name: "D2", family: "Dopamine", file: "D2_fallypride_hc49_jaworska.nii", tracer: "[18F]fallypride", measure: "BPND", ref: "cerebellum", n: 49, age: "18.4 (SD 0.6)",
    cite: "Jaworska N et al., Neuropsychopharmacology 2020", note: "Fallypride rather than the paper's FLB-457 maps, because FLB-457 is not quantitative in the striatum and this atlas draws the striatum." },
  { id: "DAT", name: "DAT", family: "Dopamine", kind: "transporter", file: "DAT_fpcit_hc174_dukart_spect.nii", tracer: "[123I]FP-CIT SPECT", measure: "SUVR", ref: "occipital cortex", n: 174, age: "61 (SD 11)",
    cite: "Dukart J et al., Sci Rep 2018 (PPMI healthy controls)", note: "SPECT, not PET, and an older cohort than the rest." },
  { id: "NET", name: "NET", family: "Noradrenaline", kind: "transporter", file: "NAT_MRB_hc77_ding.nii.gz", tracer: "[11C]MRB", measure: "BPND", ref: "occipital cortex", n: 77, age: "33.4 (SD 9.2)",
    cite: "Ding YS et al., Synapse 2010" },
  { id: "5HT1A", name: "5-HT1A", family: "Serotonin", file: "5HT1a_way_hc36_savli.nii", tracer: "[carbonyl-11C]WAY-100635", measure: "BPND", ref: "cerebellum", n: 35, age: "26.3 (SD 5.2)",
    cite: "Savli M et al., NeuroImage 2012" },
  { id: "5HT1B", name: "5-HT1B", family: "Serotonin", file: "5HT1b_p943_hc65_gallezot.nii.gz", tracer: "[11C]P943", measure: "BPND", ref: "cerebellum", n: 65, age: "33.7 (SD 9.7)",
    cite: "Gallezot JD et al., J Cereb Blood Flow Metab 2010" },
  { id: "5HT2A", name: "5-HT2A", family: "Serotonin", file: "5HT2a_alt_hc19_savli.nii", tracer: "[18F]altanserin", measure: "BPND", ref: "cerebellum", n: 19, age: "28.2 (SD 5.7)",
    cite: "Savli M et al., NeuroImage 2012", note: "The paper's first choice, the Copenhagen [11C]Cimbi-36 map, carries only subcortex in volumetric form; this is the fullest cortical map of the same receptor in the collection." },
  { id: "5HT4", name: "5-HT4", family: "Serotonin", file: "5HT4_sb20_hc59_beliveau.nii", tracer: "[11C]SB207145", measure: "Bmax", ref: "cerebellum", n: 59, age: "25.9 (SD 5.3)",
    cite: "Beliveau V et al., J Neurosci 2017", note: "The only 5-HT4 map, and in volumetric form it covers the subcortex only; cortical regions are left empty rather than averaged over padding." },
  { id: "5HT6", name: "5-HT6", family: "Serotonin", file: "5HT6_gsk_hc30_radhakrishnan.nii.gz", tracer: "[11C]GSK215083", measure: "BPND", ref: "cerebellum", n: 30, age: "36.6 (SD 9.0)",
    cite: "Radhakrishnan R et al., J Nucl Med 2018" },
  { id: "SERT", name: "SERT", family: "Serotonin", kind: "transporter", file: "5HTT_dasb_hc30_savli.nii", tracer: "[11C]DASB", measure: "BPND", ref: "cerebellum", n: 18, age: "30.5 (SD 9.5)",
    cite: "Savli M et al., NeuroImage 2012", note: "The larger Copenhagen DASB map carries only subcortex in volumetric form; this one covers the cortex." },
  { id: "A4B2", name: "α4β2 nicotinic", family: "Acetylcholine", file: "A4B2_flubatine_hc30_hillmer.nii.gz", tracer: "[18F]flubatine", measure: "VT", ref: "none (arterial input)", n: 30, age: "33.5 (SD 10.7)",
    cite: "Hillmer AT et al., NeuroImage 2016" },
  { id: "M1", name: "M1 muscarinic", family: "Acetylcholine", file: "M1_lsn_hc24_naganawa.nii.gz", tracer: "[11C]LSN3172176", measure: "BPND", ref: "cerebellum", n: 24, age: "40.4 (SD 11.7)",
    cite: "Naganawa M et al., J Nucl Med 2020" },
  { id: "VACHT", name: "VAChT", family: "Acetylcholine", kind: "transporter", file: "VAChT_feobv_hc18_aghourian_sum.nii", tracer: "[18F]FEOBV", measure: "SUVR", ref: "white matter", n: 18, age: "66.8 (SD 6.8)",
    cite: "Aghourian M et al., Mol Psychiatry 2017", note: "An older cohort than the rest." },
  { id: "NMDA", name: "NMDA", family: "Glutamate", file: "NMDA_ge179_hc29_galovic.nii.gz", tracer: "[18F]GE-179", measure: "VT", ref: "none (arterial input)", n: 29, age: "≈ 41",
    cite: "Galovic M et al., NeuroImage 2021, with McGinnity CJ et al., J Nucl Med 2014", note: "Three cohorts pooled by the compilers (10 + 10 + 9). GE-179 binds the open channel, so this is activated NMDA receptors more than their number." },
  { id: "MGLUR5", name: "mGluR5", family: "Glutamate", file: "mGluR5_abp_hc73_smart.nii", tracer: "[11C]ABP688", measure: "BPND", ref: "cerebellar cortex", n: 73, age: "19.9 (SD 3.0)",
    cite: "Smart K et al., Eur J Nucl Med Mol Imaging 2019" },
  { id: "GABAA", name: "GABA-A / benzodiazepine site", family: "GABA", file: "GABAa-bz_flumazenil_hc16_norgaard.nii", tracer: "[11C]flumazenil", measure: "Bmax", ref: "none (arterial input)", n: 16, age: "26.6 (SD 8)",
    cite: "Nørgaard M et al., NeuroImage 2021", note: "Taken from the Hansen compilation, which redistributes it under CC BY-NC-SA 4.0; the atlas paper itself is CC BY-NC-ND." },
  { id: "H3", name: "H3", family: "Histamine", file: "H3_cban_hc8_gallezot.nii.gz", tracer: "[11C]GSK189254", measure: "VT", ref: "none (arterial input)", n: 8, age: "31.7 (SD 9.0)",
    cite: "Gallezot JD et al., J Cereb Blood Flow Metab 2017", note: "Eight people." },
  { id: "CB1", name: "CB1", family: "Cannabinoid", file: "CB1_omar_hc77_normandin.nii.gz", tracer: "[11C]OMAR", measure: "VT", ref: "none (arterial input)", n: 77, age: "30.0 (SD 8.9)",
    cite: "Normandin MD et al., J Cereb Blood Flow Metab 2015" },
  { id: "MOR", name: "μ-opioid", family: "Opioid", file: "MU_carfentanil_hc204_kantonen.nii", tracer: "[11C]carfentanil", measure: "BPND", ref: "occipital cortex", n: 204, age: "32.3 (SD 10.8)",
    cite: "Kantonen T et al., NeuroImage 2020" }
];
const MEASURES = {
  BPND: "non-displaceable binding potential: specific binding relative to a reference region",
  VT: "total distribution volume from an arterial input function",
  SUVR: "standardised uptake value ratio to a reference region",
  Bmax: "binding-site density estimated from binding potential with an autoradiography-derived scale"
};

console.error("parcellating", PET.length, "PET maps onto", REGIONS.length, "cerebral regions");
const COVER = 0.5;
for (const r of PET) {
  const at = parcellate(path.join(hansen, "data", "PET_nifti_images", r.file));
  r.values = {};
  let filled = 0;
  for (const reg of REGIONS) {
    const l = at(reg.L), rr = at(reg.R);
    const lv = l.cov >= COVER ? l.mean : null, rv = rr.cov >= COVER ? rr.mean : null;
    const m = lv != null && rv != null ? (lv + rv) / 2 : (lv != null ? lv : rv);
    r.values[reg.base] = { l: lv, r: rv, m: m, cov: +((l.cov + rr.cov) / 2).toFixed(2) };
    if (m != null) filled++;
  }
  const max = Math.max(...Object.values(r.values).map(v => v.m).filter(v => v != null));
  r.max = max;
  r.covered = filled;
  console.error(" ", r.name.padEnd(30), r.file.padEnd(42), "regions", filled, "/", REGIONS.length, "max", max.toFixed(3));
}

/* ── the autoradiography ───────────────────────────────────────────────── */
function readNpy(p) {
  const b = fs.readFileSync(p);
  if (b.toString("latin1", 0, 6) !== "\x93NUMPY") throw new Error("not npy: " + p);
  const major = b[6], hl = major === 1 ? b.readUInt16LE(8) : b.readUInt32LE(8), hs = major === 1 ? 10 : 12;
  const head = b.toString("latin1", hs, hs + hl);
  const descr = /'descr':\s*'([^']+)'/.exec(head)[1];
  const shape = /'shape':\s*\(([^)]*)\)/.exec(head)[1].split(",").map(s => s.trim()).filter(Boolean).map(Number);
  const fortran = /'fortran_order':\s*True/.test(head);
  const data = b.subarray(hs + hl);
  if (descr.startsWith("<U")) {
    const n = Number(descr.slice(2)), out = [];
    for (let i = 0; i < shape[0]; i++) {
      let s = "";
      for (let c = 0; c < n; c++) { const cp = data.readUInt32LE((i * n + c) * 4); if (cp) s += String.fromCodePoint(cp); }
      out.push(s);
    }
    return out;
  }
  if (descr === "<f8") {
    const rows = shape[0], cols = shape[1] || 1, out = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) row.push(data.readDoubleLE((fortran ? j * rows + i : i * cols + j) * 8));
      out.push(row);
    }
    return out;
  }
  throw new Error("unsupported npy dtype " + descr);
}
const AR_DIR = path.join(hansen, "data", "autoradiography");
const AR_AREAS = readNpy(path.join(AR_DIR, "RegionNames.npy"));
const AR_NAMES = readNpy(path.join(AR_DIR, "ReceptorNames.npy"));
const AR_DATA = readNpy(path.join(AR_DIR, "ReceptData.npy"));
const AR_META = {
  "AMPA":     { id: "AMPA", name: "AMPA", family: "Glutamate" },
  "NMDA":     { id: "NMDA", name: "NMDA", family: "Glutamate" },
  "kainate":  { id: "KAINATE", name: "Kainate", family: "Glutamate" },
  "GABAa":    { id: "GABAA", name: "GABA-A", family: "GABA" },
  "GABAa/BZ": { id: "GABAA_BZ", name: "GABA-A benzodiazepine site", family: "GABA" },
  "GABAb":    { id: "GABAB", name: "GABA-B", family: "GABA" },
  "m1":       { id: "M1", name: "M1 muscarinic", family: "Acetylcholine" },
  "m2":       { id: "M2", name: "M2 muscarinic", family: "Acetylcholine" },
  "m3":       { id: "M3", name: "M3 muscarinic", family: "Acetylcholine" },
  "a4b2":     { id: "A4B2", name: "α4β2 nicotinic", family: "Acetylcholine" },
  "a1":       { id: "ALPHA1", name: "α1 adrenoceptors (class)", family: "Noradrenaline" },
  "a2":       { id: "ALPHA2", name: "α2 adrenoceptors (class)", family: "Noradrenaline" },
  "5-HT1a":   { id: "5HT1A", name: "5-HT1A", family: "Serotonin" },
  "5-HT2":    { id: "5HT2", name: "5-HT2 (class)", family: "Serotonin" },
  "D1":       { id: "D1", name: "D1", family: "Dopamine" }
};
/* the 44 areas onto AAL regions. "exact" where the area is the gyrus the
   region is named for; "approx" where it is part of one, or spans two */
const AREA_MAP = [
  ["1",   ["Postcentral"], "exact"], ["2", ["Postcentral"], "exact"], ["3a", ["Postcentral"], "exact"], ["3b", ["Postcentral"], "exact"],
  ["4",   ["Precentral"], "exact"],
  ["6",   ["Precentral", "Supp_Motor_Area"], "approx"],
  ["8",   ["Frontal_Sup", "Frontal_Mid"], "approx"],
  ["9",   ["Frontal_Sup", "Frontal_Mid"], "approx"],
  ["10L", ["Frontal_Mid"], "approx"], ["10M", ["Frontal_Sup_Medial"], "approx"],
  ["11",  ["Frontal_Med_Orb", "Rectus"], "approx"],
  ["44",  ["Frontal_Inf_Oper"], "exact"], ["45", ["Frontal_Inf_Tri"], "exact"],
  ["46",  ["Frontal_Mid"], "approx"], ["47", ["Frontal_Inf_Orb"], "approx"],
  ["24",  ["Cingulum_Ant", "Cingulum_Mid"], "approx"], ["32", ["Cingulum_Ant"], "approx"],
  ["23",  ["Cingulum_Post", "Cingulum_Mid"], "approx"], ["31", ["Precuneus", "Cingulum_Post"], "approx"],
  ["V1",  ["Calcarine"], "exact"], ["V2d", ["Cuneus"], "approx"], ["V2v", ["Lingual"], "approx"],
  ["V3A", ["Occipital_Sup", "Cuneus"], "approx"], ["V3d", ["Occipital_Sup", "Cuneus"], "approx"],
  ["V3v", ["Lingual", "Occipital_Inf"], "approx"], ["V4v", ["Lingual", "Occipital_Inf"], "approx"],
  ["FG1", ["Fusiform"], "exact"], ["FG2", ["Fusiform"], "exact"],
  ["37B", ["Fusiform", "Temporal_Inf"], "approx"], ["37L", ["Temporal_Inf", "Occipital_Mid"], "approx"], ["37M", ["Fusiform"], "approx"],
  ["41",  ["Heschl"], "exact"], ["42", ["Heschl", "Temporal_Sup"], "approx"],
  ["20",  ["Temporal_Inf"], "exact"], ["21", ["Temporal_Mid"], "exact"], ["22", ["Temporal_Sup"], "exact"],
  ["36",  ["ParaHippocampal"], "approx"], ["38", ["Temporal_Pole_Sup", "Temporal_Pole_Mid"], "exact"],
  ["5L",  ["Parietal_Sup"], "approx"], ["5M", ["Paracentral_Lobule", "Precuneus"], "approx"],
  ["PGa", ["Angular"], "exact"], ["PGp", ["Angular"], "exact"],
  ["PFt", ["SupraMarginal"], "exact"], ["PFm", ["SupraMarginal", "Parietal_Inf"], "approx"]
];
const areaIndex = Object.fromEntries(AR_AREAS.map((a, i) => [a, i]));
for (const [a] of AREA_MAP) if (areaIndex[a] == null) throw new Error("area not in the data: " + a);
const AR = AR_NAMES.map((nm, j) => {
  const meta = AR_META[nm]; if (!meta) throw new Error("no metadata for " + nm);
  const values = {}, areas = {};
  for (const reg of REGIONS) {
    const mine = AREA_MAP.filter(([, bases]) => bases.includes(reg.base));
    if (!mine.length) continue;
    const vals = mine.map(([a]) => AR_DATA[areaIndex[a]][j]);
    values[reg.base] = +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
    areas[reg.base] = { areas: mine.map(([a]) => a), fit: mine.every(([, , f]) => f === "exact") ? "exact" : "approx" };
  }
  const max = Math.max(...Object.values(values));
  return { ...meta, values, areas, max, unit: "fmol/mg protein" };
});
console.error("autoradiography:", AR.length, "receptors,", Object.keys(AR[0].values).length, "regions reached from", AREA_MAP.length, "areas");

/* ── every receptor the section lists, whether or not either source has a
   number for it. The page shows the whole catalogue and writes "Not enough
   information" against the rest, with the reason. pet and ar name the
   layer entries that carry the data; a status of "class" means the sub-type
   was only ever measured as its class, "mrna" that only gene expression has
   been mapped region by region, "none" that no open human region-by-region
   density exists at all. ────────────────────────────────────────────────── */
const REASON = {
  class: "Not enough information for this sub-type: measured only as its receptor class, listed separately.",
  mrna: "Not enough information: only gene expression has been mapped region by region, not receptor density.",
  none: "Not enough information: no open human region-by-region density data has been published."
};
const CATALOGUE = [
  ["NMDA", "NMDA", "Glutamate", { pet: "NMDA", ar: "NMDA" }],
  ["AMPA", "AMPA", "Glutamate", { ar: "AMPA" }],
  ["KAINATE", "Kainate", "Glutamate", { ar: "KAINATE" }],
  ["MGLUR5", "mGluR5", "Glutamate", { pet: "MGLUR5" }],
  ["GABAA", "GABA-A", "GABA", { ar: "GABAA" }],
  ["GABAA_BZ", "GABA-A benzodiazepine site", "GABA", { pet: "GABAA", ar: "GABAA_BZ" }],
  ["GABAB", "GABA-B", "GABA", { ar: "GABAB" }],
  ["D1", "D1", "Dopamine", { pet: "D1", ar: "D1" }],
  ["D2", "D2", "Dopamine", { pet: "D2" }],
  ["D3", "D3", "Dopamine", { status: "none" }],
  ["D4", "D4", "Dopamine", { status: "none" }],
  ["D5", "D5", "Dopamine", { status: "none" }],
  ["DAT", "DAT (transporter)", "Dopamine", { pet: "DAT" }],
  ["5HT1A", "5-HT1A", "Serotonin", { pet: "5HT1A", ar: "5HT1A" }],
  ["5HT1B", "5-HT1B", "Serotonin", { pet: "5HT1B" }],
  ["5HT1D", "5-HT1D", "Serotonin", { status: "none" }],
  ["5HT1E", "5-HT1E", "Serotonin", { status: "none" }],
  ["5HT1F", "5-HT1F", "Serotonin", { status: "none" }],
  ["5HT2A", "5-HT2A", "Serotonin", { pet: "5HT2A" }],
  ["5HT2", "5-HT2 (class)", "Serotonin", { ar: "5HT2" }],
  ["5HT2B", "5-HT2B", "Serotonin", { status: "class" }],
  ["5HT2C", "5-HT2C", "Serotonin", { status: "class" }],
  ["5HT3", "5-HT3", "Serotonin", { status: "none" }],
  ["5HT4", "5-HT4", "Serotonin", { pet: "5HT4" }],
  ["5HT5A", "5-HT5A", "Serotonin", { status: "none" }],
  ["5HT6", "5-HT6", "Serotonin", { pet: "5HT6" }],
  ["5HT7", "5-HT7", "Serotonin", { status: "none" }],
  ["SERT", "SERT (transporter)", "Serotonin", { pet: "SERT" }],
  ["M1", "M1 muscarinic", "Acetylcholine", { pet: "M1", ar: "M1" }],
  ["M2", "M2 muscarinic", "Acetylcholine", { ar: "M2" }],
  ["M3", "M3 muscarinic", "Acetylcholine", { ar: "M3" }],
  ["M4", "M4 muscarinic", "Acetylcholine", { status: "none" }],
  ["A4B2", "α4β2 nicotinic", "Acetylcholine", { pet: "A4B2", ar: "A4B2" }],
  ["A7", "α7 nicotinic", "Acetylcholine", { status: "none" }],
  ["VACHT", "VAChT (transporter)", "Acetylcholine", { pet: "VACHT" }],
  ["ALPHA1", "α1 adrenoceptors (class)", "Noradrenaline", { ar: "ALPHA1" }],
  ["ALPHA1A", "α1A", "Noradrenaline", { status: "class" }],
  ["ALPHA1B", "α1B", "Noradrenaline", { status: "class" }],
  ["ALPHA1D", "α1D", "Noradrenaline", { status: "class" }],
  ["ALPHA2", "α2 adrenoceptors (class)", "Noradrenaline", { ar: "ALPHA2" }],
  ["ALPHA2A", "α2A", "Noradrenaline", { status: "class" }],
  ["ALPHA2B", "α2B", "Noradrenaline", { status: "class" }],
  ["ALPHA2C", "α2C", "Noradrenaline", { status: "class" }],
  ["BETA1", "β1", "Noradrenaline", { status: "none" }],
  ["BETA2", "β2", "Noradrenaline", { status: "none" }],
  ["BETA3", "β3", "Noradrenaline", { status: "none" }],
  ["NET", "NET (transporter)", "Noradrenaline", { pet: "NET" }],
  ["H1", "H1", "Histamine", { status: "none" }],
  ["H2", "H2", "Histamine", { status: "none" }],
  ["H3", "H3", "Histamine", { pet: "H3" }],
  ["MOR", "μ-opioid", "Opioid", { pet: "MOR" }],
  ["DOR", "δ-opioid", "Opioid", { status: "none" }],
  ["KOR", "κ-opioid", "Opioid", { status: "none" }],
  ["CB1", "CB1", "Cannabinoid", { pet: "CB1" }],
  ["CB2", "CB2", "Cannabinoid", { status: "none" }],
  ["Y1", "Y1", "Neuropeptide Y", { status: "mrna" }],
  ["Y2", "Y2", "Neuropeptide Y", { status: "mrna" }],
  ["SST1", "SST1", "Somatostatin", { status: "mrna" }],
  ["SST2", "SST2", "Somatostatin", { status: "mrna" }],
  ["SST3", "SST3", "Somatostatin", { status: "mrna" }],
  ["SST4", "SST4", "Somatostatin", { status: "mrna" }],
  ["MT1", "MT1", "Melatonin", { status: "mrna" }],
  ["MT2", "MT2", "Melatonin", { status: "mrna" }],
  ["OX1", "OX1", "Orexin", { status: "mrna" }],
  ["OX2", "OX2", "Orexin", { status: "mrna" }],
  ["EP1", "EP1", "Prostaglandin", { status: "mrna" }],
  ["EP2", "EP2", "Prostaglandin", { status: "mrna" }],
  ["EP3", "EP3", "Prostaglandin", { status: "mrna" }],
  ["EP4", "EP4", "Prostaglandin", { status: "mrna" }]
].map(([id, name, family, link]) => ({ id, name, family, pet: link.pet || null, ar: link.ar || null, status: link.status || null, reason: link.status ? REASON[link.status] : null }));
for (const c of CATALOGUE) {
  if (c.pet && !PET.some(r => r.id === c.pet)) throw new Error("catalogue names a PET entry that is not built: " + c.pet);
  if (c.ar && !AR.some(r => r.id === c.ar)) throw new Error("catalogue names an autoradiography entry that is not built: " + c.ar);
}
for (const r of PET) if (!CATALOGUE.some(c => c.pet === r.id)) throw new Error("PET entry missing from the catalogue: " + r.id);
for (const r of AR) if (!CATALOGUE.some(c => c.ar === r.id)) throw new Error("autoradiography entry missing from the catalogue: " + r.id);

/* ── what has no open human data at all, so the page can say so ────────── */
const GAPS = {
  classOnly: ["α1 and α2 adrenoceptors are measured as classes, not as α1A/α1B/α1D or α2A/α2B/α2C", "5-HT2 in the autoradiography is the class, not 5-HT2A alone", "the autoradiography D1 ligand is D1-like"],
  mrnaOnly: ["Neuropeptide Y receptors Y1 and Y2", "somatostatin SST1 to SST4", "melatonin MT1 and MT2", "orexin OX1 and OX2", "prostaglandin EP1 to EP4"],
  none: ["dopamine D4 and D5", "serotonin 5-HT1D, 1E, 1F, 2B, 2C, 3, 5A and 7", "muscarinic M4", "β1, β2 and β3 adrenoceptors", "histamine H1 and H2", "cannabinoid CB2", "δ-opioid and κ-opioid as open normative maps"]
};

/* ── write ─────────────────────────────────────────────────────────────── */
const round = (v, d) => v == null ? null : +v.toFixed(d);
const out = {
  built: "by scripts/build_receptor_data.mjs from the Hansen et al. 2022 compilation and the Zilles & Palomero-Gallagher 2017 autoradiography table, parcellated onto the site's AAL-116 volume",
  regions: REGIONS,
  catalogue: CATALOGUE,
  pet: {
    title: "In vivo PET",
    source: { cite: "Hansen JY, Shafiei G, Markello RD, et al. Mapping neurotransmitter systems to the structural and functional organization of the human neocortex. Nat Neurosci 2022;25:1569–1581.", doi: "10.1038/s41593-022-01186-3", repo: "https://github.com/netneurolab/hansen_receptors", licence: "CC BY-NC-SA 4.0" },
    measures: MEASURES,
    coverage: COVER,
    receptors: PET.map(r => ({
      id: r.id, name: r.name, family: r.family, kind: r.kind || "receptor", tracer: r.tracer, measure: r.measure, ref: r.ref, n: r.n, age: r.age,
      cite: r.cite, note: r.note || "", file: r.file, max: round(r.max, 4), covered: r.covered,
      values: Object.fromEntries(Object.entries(r.values).map(([b, v]) => [b, { l: round(v.l, 4), r: round(v.r, 4), m: round(v.m, 4), cov: v.cov }]))
    }))
  },
  autoradiography: {
    title: "Ex vivo autoradiography",
    unit: "fmol/mg protein",
    source: { cite: "Zilles K, Palomero-Gallagher N. Multiple transmitter receptors in regions and layers of the human cerebral cortex. Front Neuroanat 2017;11:78.", doi: "10.3389/fnana.2017.00078", licence: "CC BY 4.0", via: "as redistributed in the Hansen et al. 2022 repository (data/autoradiography), from Goulas A et al., PNAS 2021" },
    sample: "three post-mortem brains, aged 72 to 77, two male; 44 cytoarchitectonic areas; each value is the mean across the supragranular, granular and infragranular layers",
    areaMap: AREA_MAP.map(([area, bases, fit]) => ({ area, bases, fit })),
    receptors: AR
  },
  gaps: GAPS
};
const js = "/* The receptor-density dataset behind the Region Atlas's receptor section.\n" +
  "   Generated " + out.built + ". Do not edit by hand: change the build\n" +
  "   script and run it. In vivo PET values are group-mean parcel averages in the\n" +
  "   units each tracer study reported (see pet.measures); autoradiography values\n" +
  "   are fmol/mg protein. Licences: PET compilation CC BY-NC-SA 4.0 (Hansen et al.\n" +
  "   2022, with the originating tracer study cited on each receptor); autoradiography\n" +
  "   CC BY 4.0 (Zilles & Palomero-Gallagher 2017). This derived table is shared under\n" +
  "   the same terms. */\n" +
  "window.MN_RECEPTORS = " + JSON.stringify(out) + ";\n";
fs.writeFileSync(path.join(root, "site", "assets", "receptor-data.js"), js);

/* the CSVs, so the derived numbers travel without the site */
const csvDir = path.join(root, "backend", "data", "receptors");
fs.mkdirSync(csvDir, { recursive: true });
const q = s => '"' + String(s).replace(/"/g, '""') + '"';
{
  const lines = ["receptor,family,tracer,measure,reference_region,n,age,source,region,region_name,left,right,mean,coverage"];
  for (const r of PET) for (const reg of REGIONS) { const v = r.values[reg.base]; lines.push([r.name, r.family, r.tracer, r.measure, r.ref, r.n, r.age, r.cite, reg.base, reg.name, round(v.l, 4) ?? "", round(v.r, 4) ?? "", round(v.m, 4) ?? "", v.cov].map(q).join(",")); }
  fs.writeFileSync(path.join(csvDir, "pet_aal116.csv"), lines.join("\n") + "\n");
}
{
  const lines = ["receptor,family,region,region_name,fmol_per_mg_protein,areas,fit"];
  for (const r of AR) for (const reg of REGIONS) { if (r.values[reg.base] == null) continue; lines.push([r.name, r.family, reg.base, reg.name, r.values[reg.base], r.areas[reg.base].areas.join(" "), r.areas[reg.base].fit].map(q).join(",")); }
  fs.writeFileSync(path.join(csvDir, "autoradiography_aal116.csv"), lines.join("\n") + "\n");
  fs.writeFileSync(path.join(csvDir, "autoradiography_area_map.csv"), "area,aal_regions,fit\n" + AREA_MAP.map(([a, b, f]) => [a, b.join(" "), f].map(q).join(",")).join("\n") + "\n");
}
console.error("wrote site/assets/receptor-data.js (" + Math.round(js.length / 1024) + " KB) and", csvDir);
