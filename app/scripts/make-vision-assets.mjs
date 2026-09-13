// Builds the two files the visionOS app's brain window draws from, out of
// the site's own MNI152 template and the same surface code the Region Atlas
// uses for its 3D export:
//
//   visionos/VisionAtlas/Resources/brain.mesh    the brain's outer surface
//   visionos/VisionAtlas/Resources/brain.vol.gz  the template, brain only
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
const STRIDE = 2; // voxels per surface cell: 2 is smooth enough to hold in the hand

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

  const A = vol.hdr.affine;
  return { verts: part.pos.length / 3, tris: part.idx.length / 3, pos: enc(part.pos), nrm: enc(part.nrm), idx: enc(part.idx),
           dims: d, spacing: A[0][0], origin: [A[0][3], A[1][3], A[2][3]], inside, vol: enc(brain) };
}, STRIDE);
await browser.close();
server.close();

await mkdir(out, { recursive: true });
const meshHead = Buffer.alloc(12);
meshHead.write("VNM1", 0, "ascii"); meshHead.writeUInt32LE(result.verts, 4); meshHead.writeUInt32LE(result.tris * 3, 8);
await writeFile(join(out, "brain.mesh"), Buffer.concat([meshHead, Buffer.from(result.pos, "base64"), Buffer.from(result.nrm, "base64"), Buffer.from(result.idx, "base64")]));

const volHead = Buffer.alloc(32);
volHead.write("VNV1", 0, "ascii");
volHead.writeUInt32LE(result.dims[0], 4); volHead.writeUInt32LE(result.dims[1], 8); volHead.writeUInt32LE(result.dims[2], 12);
volHead.writeFloatLE(result.spacing, 16);
volHead.writeFloatLE(result.origin[0], 20); volHead.writeFloatLE(result.origin[1], 24); volHead.writeFloatLE(result.origin[2], 28);
await writeFile(join(out, "brain.vol.gz"), gzipSync(Buffer.concat([volHead, Buffer.from(result.vol, "base64")]), { level: 9 }));

console.log(`brain.mesh: ${result.verts} vertices, ${result.tris} triangles`);
console.log(`brain.vol.gz: ${result.dims.join("×")} voxels at ${result.spacing.toFixed(3)} mm, ${result.inside} inside the brain`);
