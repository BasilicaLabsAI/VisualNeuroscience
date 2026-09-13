// Builds the two files the visionOS app's brain window draws from, out of
// the site's own MNI152 template and the same surface code the Region Atlas
// uses for its 3D export:
//
//   visionos/VisionAtlas/Resources/brain.mesh.gz   the brain's outer surface
//   visionos/VisionAtlas/Resources/brain.vol.gz    the template, brain only
//   visionos/VisionAtlas/Resources/regions.mesh.gz a surface for each AAL label
//   visionos/VisionAtlas/Resources/aal.vol.gz      the AAL labels, one byte each
//   visionos/VisionAtlas/Resources/brodmann.mesh.gz a surface for each Brodmann area
//   visionos/VisionAtlas/Resources/brodmann.vol.gz  the Brodmann labels, one byte each
//   visionos/VisionAtlas/Resources/tracts.mesh.gz   the HCP1065 streamlines as tubes, by colour
//   visionos/VisionAtlas/Generated.swift            the region, note, Brodmann and frame tables
//
// Run from app/ with `node scripts/make-vision-assets.mjs`. Needs the
// playwright devDependency (npm install), nothing else. The file formats are
// described at the top of visionos/VisionAtlas/BrainData.swift.

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const site = join(here, "..", "..", "site");
const out = join(here, "..", "visionos", "VisionAtlas", "Resources");
const STRIDE = 1; // voxels per surface cell: 1 keeps every sulcus the Region Atlas shows
const TRACT_COUNT = 4000; // streamlines in the tract window; the page draws 5,000

const types = { ".html": "text/html", ".js": "text/javascript", ".gz": "application/gzip", ".css": "text/css" };
const server = createServer(async (req, res) => {
  const path = join(site, decodeURIComponent(new URL(req.url, "http://x").pathname));
  let body;
  try { body = await readFile(path); } catch { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": types[extname(path)] || "application/octet-stream" });
  res.end(body);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.error("page error:", e.message));
await page.goto(`${base}/about.html`, { waitUntil: "load" });
await page.addScriptTag({ url: "assets/niivue.js" });
await page.addScriptTag({ url: "assets/export3d.js" });
await page.addScriptTag({ url: "assets/atlas-data.js" });
await page.addScriptTag({ url: "assets/region-notes.js" });
await page.addScriptTag({ url: "assets/brodmann-areas.js" });

const result = await page.evaluate(async ({ stride, tractCount }) => {
  const enc = (a) => {
    const u = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    let s = "";
    for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
    return btoa(s);
  };
  const vol = await MN_EXPORT3D.volume("assets/mni152.nii.gz");
  const thr = MN_EXPORT3D.autoThreshold(vol);
  const d = vol.hdr.dims.slice(1, 4), X = d[0], Y = d[1], Z = d[2], N = X * Y * Z, img = vol.img;

  // the surface, exactly as the Region Atlas exports it
  const part = MN_EXPORT3D.isoSurface(vol, thr, { stride, largest: true, name: "Brain surface" });

  // the brain mask: the largest connected piece above the threshold, then
  // every hole inside it (ventricles, dark tissue) filled by flood-filling
  // the outside from the volume's border
  const above = new Uint8Array(N);
  for (let i = 0; i < N; i++) above[i] = img[i] >= thr ? 1 : 0;
  const label = new Int32Array(N), queue = new Int32Array(N), nb = [1, -1, X, -X, X * Y, -X * Y];
  const edge = (v, k) => {
    const x = v % X, y = ((v / X) | 0) % Y, z = (v / (X * Y)) | 0;
    return (k === 0 && x === X - 1) || (k === 1 && x === 0) || (k === 2 && y === Y - 1) || (k === 3 && y === 0) || (k === 4 && z === Z - 1) || (k === 5 && z === 0);
  };
  let best = 0, bestSize = 0, cur = 0;
  for (let s = 0; s < N; s++) {
    if (!above[s] || label[s]) continue;
    cur++; let head = 0, tail = 0, size = 0; queue[tail++] = s; label[s] = cur;
    while (head < tail) {
      const v = queue[head++]; size++;
      for (let k = 0; k < 6; k++) { if (edge(v, k)) continue; const w = v + nb[k]; if (above[w] && !label[w]) { label[w] = cur; queue[tail++] = w; } }
    }
    if (size > bestSize) { bestSize = size; best = cur; }
  }
  const outside = new Uint8Array(N); let head = 0, tail = 0;
  const push = (v) => { if (!outside[v] && label[v] !== best) { outside[v] = 1; queue[tail++] = v; } };
  for (let z = 0; z < Z; z++) for (let y = 0; y < Y; y++) { push((z * Y + y) * X); push((z * Y + y) * X + X - 1); }
  for (let z = 0; z < Z; z++) for (let x = 0; x < X; x++) { push((z * Y) * X + x); push((z * Y + Y - 1) * X + x); }
  for (let y = 0; y < Y; y++) for (let x = 0; x < X; x++) { push(y * X + x); push(((Z - 1) * Y + y) * X + x); }
  while (head < tail) { const v = queue[head++]; for (let k = 0; k < 6; k++) if (!edge(v, k)) push(v + nb[k]); }
  const brain = new Uint8Array(N); let inside = 0;
  for (let i = 0; i < N; i++) if (!outside[i]) { brain[i] = Math.max(1, img[i]); inside++; }

  // one surface per AAL label, as the Region Atlas exports them
  const atlas = await MN_EXPORT3D.volume("assets/aal.nii.gz");
  const regions = [];
  for (const r of MN_ATLAS.REGIONS) for (const side of ["L", "R", "S"]) {
    if (r[side] == null) continue;
    const part = MN_EXPORT3D.labelSurface(atlas, [r[side]], { stride: 1, name: r.base });
    if (part) regions.push({ label: r[side], verts: part.pos.length / 3, tris: part.idx.length / 3, pos: enc(part.pos), nrm: enc(part.nrm), idx: enc(part.idx) });
  }
  const aa = atlas.hdr.affine, ad = atlas.hdr.dims.slice(1, 4);
  const labels = new Uint8Array(atlas.img.length);
  for (let i = 0; i < labels.length; i++) labels[i] = atlas.img[i];

  // the Brodmann areas the same way, one surface per area, both hemispheres in one label
  const bro = await MN_EXPORT3D.volume("assets/brodmann.nii.gz");
  const brodmann = [];
  for (const a of MN_BRODMANN.AREAS) {
    const part = MN_EXPORT3D.labelSurface(bro, [a.ba], { stride: 1, name: "BA" + a.ba });
    if (part) brodmann.push({ label: a.ba, verts: part.pos.length / 3, tris: part.idx.length / 3, pos: enc(part.pos), nrm: enc(part.nrm), idx: enc(part.idx) });
  }
  const ba = bro.hdr.affine, bd = bro.hdr.dims.slice(1, 4);
  const broLabels = new Uint8Array(bro.img.length);
  for (let i = 0; i < broLabels.length; i++) broLabels[i] = bro.img[i];

  // the tractogram: a sample of the streamlines as three-sided tubes, the
  // triangles binned by their direction colour so each bin is one mesh
  const trx = await (await fetch("assets/tracts/hcp1065.trx")).arrayBuffer();
  const tract = await niivue.NVMeshLoaders.readTRX(trx);
  const sample = MN_EXPORT3D.sampleLines(tract.pts, tract.offsetPt0, tractCount);
  const tubes = MN_EXPORT3D.linesToTubes(MN_EXPORT3D.lines(sample.pts, sample.offsets, { name: "HCP1065" }), 0.3, 3);
  const binOf = (v) => (Math.min(3, tubes.vcol[v * 3] >> 6) << 4) | (Math.min(3, tubes.vcol[v * 3 + 1] >> 6) << 2) | Math.min(3, tubes.vcol[v * 3 + 2] >> 6);
  const bins = new Map();
  for (let t = 0; t < tubes.idx.length; t += 3) {
    const b = binOf(tubes.idx[t]);
    let bin = bins.get(b);
    if (!bin) { bin = { tris: [], sum: [0, 0, 0], n: 0 }; bins.set(b, bin); }
    bin.tris.push(tubes.idx[t], tubes.idx[t + 1], tubes.idx[t + 2]);
    for (const v of [tubes.idx[t], tubes.idx[t + 1], tubes.idx[t + 2]]) { bin.sum[0] += tubes.vcol[v * 3]; bin.sum[1] += tubes.vcol[v * 3 + 1]; bin.sum[2] += tubes.vcol[v * 3 + 2]; bin.n++; }
  }
  const tracts = [];
  for (const [, bin] of bins) {
    const remap = new Map(); const pos = [], nrm = [], idx = [];
    for (const v of bin.tris) {
      let r = remap.get(v);
      if (r === undefined) { r = pos.length / 3; remap.set(v, r); pos.push(tubes.pos[v * 3], tubes.pos[v * 3 + 1], tubes.pos[v * 3 + 2]); nrm.push(tubes.nrm[v * 3], tubes.nrm[v * 3 + 1], tubes.nrm[v * 3 + 2]); }
      idx.push(r);
    }
    tracts.push({ colour: bin.sum.map((c) => Math.round(c / bin.n)), verts: pos.length / 3, tris: idx.length / 3, pos: enc(new Float32Array(pos)), nrm: enc(new Float32Array(nrm)), idx: enc(new Uint32Array(idx)) });
  }

  const A = vol.hdr.affine;
  return { verts: part.pos.length / 3, tris: part.idx.length / 3, pos: enc(part.pos), nrm: enc(part.nrm), idx: enc(part.idx),
           dims: d, spacing: A[0][0], origin: [A[0][3], A[1][3], A[2][3]], inside, vol: enc(brain),
           regions, atlasDims: ad, atlasSpacing: aa[0][0], atlasOrigin: [aa[0][3], aa[1][3], aa[2][3]], atlasVol: enc(labels),
           brodmann, broDims: bd, broSpacing: ba[0][0], broOrigin: [ba[0][3], ba[1][3], ba[2][3]], broVol: enc(broLabels),
           tracts, tractSampled: sample.count, tractTotal: tract.offsetPt0.length - 1,
           table: MN_ATLAS.REGIONS, notes: MN_NOTES.NOTES, tiers: MN_NOTES.TIERS,
           areas: MN_BRODMANN.AREAS.map((a) => ({ ba: a.ba, name: a.name, region: a.region, lobe: a.lobe, fn: a.fn, note: a.note || "", tags: a.tags || "" })),
           lobes: MN_BRODMANN.LOBES };
}, { stride: STRIDE, tractCount: TRACT_COUNT });
await browser.close();
server.close();

await mkdir(out, { recursive: true });
// brain.mesh.gz: positions in hundredths of a millimetre as int16, normals
// as int8, indices as uint32, gzipped. A third of the size of float32.
function packed(part) {
  const pos = Buffer.from(part.pos, "base64"), nrm = Buffer.from(part.nrm, "base64");
  const posQ = Buffer.alloc(pos.length / 2), nrmQ = Buffer.alloc(nrm.length / 4);
  for (let i = 0; i < pos.length / 4; i++) posQ.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(pos.readFloatLE(i * 4) * 100))), i * 2);
  for (let i = 0; i < nrm.length / 4; i++) nrmQ.writeInt8(Math.max(-127, Math.min(127, Math.round(nrm.readFloatLE(i * 4) * 127))), i);
  return Buffer.concat([posQ, nrmQ, Buffer.from(part.idx, "base64")]);
}
const meshHead = Buffer.alloc(12);
meshHead.write("VNM2", 0, "ascii"); meshHead.writeUInt32LE(result.verts, 4); meshHead.writeUInt32LE(result.tris * 3, 8);
await writeFile(join(out, "brain.mesh.gz"), gzipSync(Buffer.concat([meshHead, packed(result)]), { level: 9 }));

// A set of labelled meshes: 'VNR1', count, then per label: uint16 label,
// uint32 vertex count, uint32 index count, and the same packing as the brain.
async function writeLabelled(name, list) {
  const parts = [Buffer.alloc(8)];
  parts[0].write("VNR1", 0, "ascii"); parts[0].writeUInt32LE(list.length, 4);
  let tris = 0;
  for (const r of list) {
    const h = Buffer.alloc(10); h.writeUInt16LE(r.label, 0); h.writeUInt32LE(r.verts, 2); h.writeUInt32LE(r.tris * 3, 6);
    parts.push(h, packed(r)); tris += r.tris;
  }
  await writeFile(join(out, name), gzipSync(Buffer.concat(parts), { level: 9 }));
  return tris;
}
// A label volume: the same layout as brain.vol.gz, one label byte per voxel.
async function writeLabels(name, dims, spacing, origin, data) {
  const head = Buffer.alloc(32);
  head.write("VNV1", 0, "ascii");
  head.writeUInt32LE(dims[0], 4); head.writeUInt32LE(dims[1], 8); head.writeUInt32LE(dims[2], 12);
  head.writeFloatLE(spacing, 16);
  head.writeFloatLE(origin[0], 20); head.writeFloatLE(origin[1], 24); head.writeFloatLE(origin[2], 28);
  await writeFile(join(out, name), gzipSync(Buffer.concat([head, Buffer.from(data, "base64")]), { level: 9 }));
}
const regionTris = await writeLabelled("regions.mesh.gz", result.regions);
await writeLabels("aal.vol.gz", result.atlasDims, result.atlasSpacing, result.atlasOrigin, result.atlasVol);
const brodmannTris = await writeLabelled("brodmann.mesh.gz", result.brodmann);
await writeLabels("brodmann.vol.gz", result.broDims, result.broSpacing, result.broOrigin, result.broVol);

// tracts.mesh.gz: 'VNT1', count, then per colour bin: uint8 r, g, b, uint32
// vertex count, uint32 index count, and the same packing as the brain.
const tractParts = [Buffer.alloc(8)];
tractParts[0].write("VNT1", 0, "ascii"); tractParts[0].writeUInt32LE(result.tracts.length, 4);
let tractTris = 0;
for (const t of result.tracts) {
  const h = Buffer.alloc(11); h[0] = t.colour[0]; h[1] = t.colour[1]; h[2] = t.colour[2]; h.writeUInt32LE(t.verts, 3); h.writeUInt32LE(t.tris * 3, 7);
  tractParts.push(h, packed(t)); tractTris += t.tris;
}
await writeFile(join(out, "tracts.mesh.gz"), gzipSync(Buffer.concat(tractParts), { level: 9 }));

// Generated.swift: the tables the pickers and notes show, generated so they
// can never drift from the site's
const q = JSON.stringify;
const swift = [
  "// Generated by app/scripts/make-vision-assets.mjs from the site's atlas-data.js,",
  "// region-notes.js, brodmann-areas.js and mni152.nii.gz. Do not edit.",
  "",
  "import simd",
  "",
  "/// One entry of the AAL-116 region list as the site shows it: a pair of",
  "/// left and right labels, or a single midline label.",
  "struct AtlasRegion: Hashable {",
  "    let base: String",
  "    let name: String",
  "    let group: String",
  "    let left: Int?",
  "    let right: Int?",
  "    let single: Int?",
  "}",
  "",
  "/// What a region does, and which layer of the brain it belongs to.",
  "struct RegionNote {",
  "    let tier: String",
  "    let function: String",
  "}",
  "",
  "struct RegionTier: Hashable {",
  "    let id: String",
  "    let label: String",
  "    let sub: String",
  "}",
  "",
  "/// One Brodmann area as the shipped atlas draws it, both hemispheres in one label.",
  "struct BrodmannArea: Hashable {",
  "    let ba: Int",
  "    let name: String",
  "    let region: String",
  "    let lobe: String",
  "    let function: String",
  "    let note: String",
  "    let tags: String",
  "}",
  "",
  "struct BrodmannLobe: Hashable {",
  "    let id: String",
  "    let label: String",
  "    let sub: String",
  "}",
  "",
  "enum AtlasRegions {",
  "    static let all: [AtlasRegion] = [",
  ...result.table.map((r) => `        AtlasRegion(base: ${q(r.base)}, name: ${q(r.pretty)}, group: ${q(r.group)}, left: ${r.L ?? "nil"}, right: ${r.R ?? "nil"}, single: ${r.S ?? "nil"}),`),
  "    ]",
  "",
  "    /// The order the site hands colours out in.",
  `    static let palette: [String] = [${["#915AD8", "#D85AC9", "#FE4B83", "#FF7847", "#E6C14C", "#AFF05B", "#52F667", "#4AE8B7", "#4FBEE3", "#5575DD"].map(q).join(", ")}]`,
  "",
  "    static let tiers: [RegionTier] = [",
  ...result.tiers.map((t) => `        RegionTier(id: ${q(t.id)}, label: ${q(t.label.replace(/&middot;/g, "\u00b7"))}, sub: ${q(t.sub)}),`),
  "    ]",
  "",
  "    /// Keyed by AAL base name.",
  "    static let notes: [String: RegionNote] = [",
  ...Object.entries(result.notes).map(([k, v]) => `        ${q(k)}: RegionNote(tier: ${q(v.tier)}, function: ${q(v.fn)}),`),
  "    ]",
  "}",
  "",
  "enum Brodmann {",
  "    static let areas: [BrodmannArea] = [",
  ...result.areas.map((a) => `        BrodmannArea(ba: ${a.ba}, name: ${q(a.name)}, region: ${q(a.region)}, lobe: ${q(a.lobe)}, function: ${q(a.fn)}, note: ${q(a.note)}, tags: ${q(a.tags)}),`),
  "    ]",
  "",
  "    static let lobes: [BrodmannLobe] = [",
  ...result.lobes.map((l) => `        BrodmannLobe(id: ${q(l.id)}, label: ${q(l.label)}, sub: ${q(l.sub)}),`),
  "    ]",
  "}",
  "",
  "/// The MNI152 template's millimetre box, which every window centres on.",
  "enum AtlasFrame {",
  `    static let minMm = SIMD3<Float>(${result.origin.map((v) => v.toFixed(4)).join(", ")})`,
  `    static let maxMm = SIMD3<Float>(${result.origin.map((v, i) => (v + (result.dims[i] - 1) * result.spacing).toFixed(4)).join(", ")})`,
  "    static var centreMm: SIMD3<Float> { (minMm + maxMm) / 2 }",
  "}",
  "",
];
await writeFile(join(here, "..", "visionos", "VisionAtlas", "Generated.swift"), swift.join("\n"));

const volHead = Buffer.alloc(32);
volHead.write("VNV1", 0, "ascii");
volHead.writeUInt32LE(result.dims[0], 4); volHead.writeUInt32LE(result.dims[1], 8); volHead.writeUInt32LE(result.dims[2], 12);
volHead.writeFloatLE(result.spacing, 16);
volHead.writeFloatLE(result.origin[0], 20); volHead.writeFloatLE(result.origin[1], 24); volHead.writeFloatLE(result.origin[2], 28);
await writeFile(join(out, "brain.vol.gz"), gzipSync(Buffer.concat([volHead, Buffer.from(result.vol, "base64")]), { level: 9 }));

console.log(`brain.mesh.gz: ${result.verts} vertices, ${result.tris} triangles`);
console.log(`brain.vol.gz: ${result.dims.join("×")} voxels at ${result.spacing.toFixed(3)} mm, ${result.inside} inside the brain`);
console.log(`regions.mesh.gz: ${result.regions.length} labels, ${regionTris} triangles; aal.vol.gz: ${result.atlasDims.join("×")} voxels`);
console.log(`brodmann.mesh.gz: ${result.brodmann.length} areas, ${brodmannTris} triangles; brodmann.vol.gz: ${result.broDims.join("×")} voxels`);
console.log(`tracts.mesh.gz: ${result.tractSampled} of ${result.tractTotal} streamlines, ${result.tracts.length} colour bins, ${tractTris} triangles`);
console.log(`Generated.swift: ${result.table.length} regions, ${Object.keys(result.notes).length} notes, ${result.areas.length} Brodmann areas`);
