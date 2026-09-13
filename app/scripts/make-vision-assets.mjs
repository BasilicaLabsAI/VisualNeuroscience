// Builds the two files the visionOS app's brain window draws from, out of
// the site's own MNI152 template and the same surface code the Region Atlas
// uses for its 3D export:
//
//   visionos/VisionAtlas/Resources/brain.mesh.gz   the brain's outer surface
//   visionos/VisionAtlas/Resources/brain.vol.gz    the template, brain only
//   visionos/VisionAtlas/Resources/regions.mesh.gz a surface for each AAL label
//   visionos/VisionAtlas/Resources/aal.vol.gz      the AAL labels, one byte each
//   visionos/VisionAtlas/Regions.swift             the region table, as the site has it
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

const result = await page.evaluate(async (stride) => {
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

  const A = vol.hdr.affine;
  return { verts: part.pos.length / 3, tris: part.idx.length / 3, pos: enc(part.pos), nrm: enc(part.nrm), idx: enc(part.idx),
           dims: d, spacing: A[0][0], origin: [A[0][3], A[1][3], A[2][3]], inside, vol: enc(brain),
           regions, atlasDims: ad, atlasSpacing: aa[0][0], atlasOrigin: [aa[0][3], aa[1][3], aa[2][3]], atlasVol: enc(labels),
           table: MN_ATLAS.REGIONS };
}, STRIDE);
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

// regions.mesh.gz: 'VNR1', count, then per label: uint16 label, uint32
// vertex count, uint32 index count, and the same packing as the brain.
const parts = [Buffer.alloc(8)];
parts[0].write("VNR1", 0, "ascii"); parts[0].writeUInt32LE(result.regions.length, 4);
let regionTris = 0;
for (const r of result.regions) {
  const h = Buffer.alloc(10); h.writeUInt16LE(r.label, 0); h.writeUInt32LE(r.verts, 2); h.writeUInt32LE(r.tris * 3, 6);
  parts.push(h, packed(r)); regionTris += r.tris;
}
await writeFile(join(out, "regions.mesh.gz"), gzipSync(Buffer.concat(parts), { level: 9 }));

// aal.vol.gz: the same layout as brain.vol.gz, one label byte per voxel
const aalHead = Buffer.alloc(32);
aalHead.write("VNV1", 0, "ascii");
aalHead.writeUInt32LE(result.atlasDims[0], 4); aalHead.writeUInt32LE(result.atlasDims[1], 8); aalHead.writeUInt32LE(result.atlasDims[2], 12);
aalHead.writeFloatLE(result.atlasSpacing, 16);
aalHead.writeFloatLE(result.atlasOrigin[0], 20); aalHead.writeFloatLE(result.atlasOrigin[1], 24); aalHead.writeFloatLE(result.atlasOrigin[2], 28);
await writeFile(join(out, "aal.vol.gz"), gzipSync(Buffer.concat([aalHead, Buffer.from(result.atlasVol, "base64")]), { level: 9 }));

// Regions.swift: the region table the picker shows, generated so it can
// never drift from the site's
const swift = [
  "// Generated by app/scripts/make-vision-assets.mjs from site/assets/atlas-data.js. Do not edit.",
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
  "enum AtlasRegions {",
  "    static let all: [AtlasRegion] = [",
  ...result.table.map((r) => `        AtlasRegion(base: ${JSON.stringify(r.base)}, name: ${JSON.stringify(r.pretty)}, group: ${JSON.stringify(r.group)}, left: ${r.L ?? "nil"}, right: ${r.R ?? "nil"}, single: ${r.S ?? "nil"}),`),
  "    ]",
  "",
  "    /// The order the site hands colours out in.",
  "    static let palette: [String] = [\"#915AD8\", \"#D85AC9\", \"#FE4B83\", \"#FF7847\", \"#E6C14C\", \"#AFF05B\", \"#52F667\", \"#4AE8B7\", \"#4FBEE3\", \"#5575DD\"]",
  "}",
  "",
];
await writeFile(join(here, "..", "visionos", "VisionAtlas", "Regions.swift"), swift.join("\n"));

const volHead = Buffer.alloc(32);
volHead.write("VNV1", 0, "ascii");
volHead.writeUInt32LE(result.dims[0], 4); volHead.writeUInt32LE(result.dims[1], 8); volHead.writeUInt32LE(result.dims[2], 12);
volHead.writeFloatLE(result.spacing, 16);
volHead.writeFloatLE(result.origin[0], 20); volHead.writeFloatLE(result.origin[1], 24); volHead.writeFloatLE(result.origin[2], 28);
await writeFile(join(out, "brain.vol.gz"), gzipSync(Buffer.concat([volHead, Buffer.from(result.vol, "base64")]), { level: 9 }));

console.log(`brain.mesh.gz: ${result.verts} vertices, ${result.tris} triangles`);
console.log(`brain.vol.gz: ${result.dims.join("×")} voxels at ${result.spacing.toFixed(3)} mm, ${result.inside} inside the brain`);
console.log(`regions.mesh.gz: ${result.regions.length} labels, ${regionTris} triangles`);
console.log(`aal.vol.gz: ${result.atlasDims.join("×")} voxels at ${result.atlasSpacing.toFixed(3)} mm; Regions.swift: ${result.table.length} entries`);
