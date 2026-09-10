#!/usr/bin/env node
/* Build the translucent brain the Brodmann border graph is drawn inside.

   The graph turns freely, so the brain behind it cannot be a picture: it
   has to be geometry the page can project through the very same maths as
   the nodes. What it ships is a cage of contour rings — the brain's own
   outline in a handful of sagittal and coronal planes — which reads as a
   transparent brain from any angle and gives the page enough surface
   points to fill in a silhouette behind them.

       node scripts/make_brain_hull.mjs

   Reads site/assets/mni152.nii.gz and writes site/assets/brain-hull.js.
   The threshold matches MN_EXPORT3D.autoThreshold, so this shell and the
   brain surface in the 3D exports describe the same brain.
*/
import fs from "node:fs";
import zlib from "node:zlib";

const SRC = "site/assets/mni152.nii.gz";
const OUT = "site/assets/brain-hull.js";
const RING_PTS = 64;                      /* points around each contour */
/* Where the rings are cut, in MNI millimetres. Sagittal planes read as the
   brain's profile, coronal ones as its width; together they are a cage. */
const SAGITTAL = [-62, -48, -34, -20, -7, 7, 20, 34, 48, 62];
const CORONAL = [-92, -72, -52, -32, -12, 8, 28, 48, 66];

/* ── NIfTI-1: a 348-byte header, then the voxels ───────────────────────── */
function readNifti(path) {
  const buf = zlib.gunzipSync(fs.readFileSync(path));
  const le = buf.readInt32LE(0) === 348;
  if (!le && buf.readInt32BE(0) !== 348) throw new Error("not a NIfTI-1 volume");
  const i16 = (o) => (le ? buf.readInt16LE(o) : buf.readInt16BE(o));
  const f32 = (o) => (le ? buf.readFloatLE(o) : buf.readFloatBE(o));
  const dims = [i16(42), i16(44), i16(46)];
  const datatype = i16(70), bitpix = i16(72);
  const voxOffset = Math.round(f32(108));
  const srow = [
    [f32(280), f32(284), f32(288), f32(292)],
    [f32(296), f32(300), f32(304), f32(308)],
    [f32(312), f32(316), f32(320), f32(324)],
  ];
  const n = dims[0] * dims[1] * dims[2];
  let img;
  if (datatype === 2) img = new Uint8Array(buf.buffer, buf.byteOffset + voxOffset, n);
  else if (datatype === 4) img = new Int16Array(buf.buffer, buf.byteOffset + voxOffset, n);
  else if (datatype === 16) img = new Float32Array(buf.buffer, buf.byteOffset + voxOffset, n);
  else throw new Error(`unsupported NIfTI datatype ${datatype} (bitpix ${bitpix})`);
  return { dims, img, srow };
}

const { dims, img, srow } = readNifti(SRC);
const [X, Y, Z] = dims;
console.log(`volume ${X}x${Y}x${Z}, ${img.length.toLocaleString()} voxels`);

const toMm = (i, j, k) => [
  srow[0][0] * i + srow[0][1] * j + srow[0][2] * k + srow[0][3],
  srow[1][0] * i + srow[1][1] * j + srow[1][2] * k + srow[1][3],
  srow[2][0] * i + srow[2][1] * j + srow[2][2] * k + srow[2][3],
];

/* the same threshold the 3D exports use, so both describe one brain */
const sample = [];
for (let i = 0; i < img.length; i += Math.max(1, Math.floor(img.length / 400000)))
  if (img[i] > 0) sample.push(img[i]);
sample.sort((a, b) => a - b);
const threshold = sample[Math.floor(0.98 * (sample.length - 1))] * 0.42;
console.log("threshold", threshold.toFixed(2));

/* ── the brain proper: the largest six-connected piece above it ────────── */
const mask = new Uint8Array(img.length);
for (let i = 0; i < img.length; i++) mask[i] = img[i] >= threshold ? 1 : 0;

const label = new Int32Array(img.length);
const stack = new Int32Array(img.length);
let best = 0, bestCount = 0, next = 1;
for (let s = 0; s < img.length; s++) {
  if (!mask[s] || label[s]) continue;
  let top = 0, count = 0;
  stack[top++] = s; label[s] = next;
  while (top) {
    const i = stack[--top]; count++;
    const x = i % X, y = ((i / X) | 0) % Y, z = (i / (X * Y)) | 0;
    if (x > 0 && mask[i - 1] && !label[i - 1]) { label[i - 1] = next; stack[top++] = i - 1; }
    if (x < X - 1 && mask[i + 1] && !label[i + 1]) { label[i + 1] = next; stack[top++] = i + 1; }
    if (y > 0 && mask[i - X] && !label[i - X]) { label[i - X] = next; stack[top++] = i - X; }
    if (y < Y - 1 && mask[i + X] && !label[i + X]) { label[i + X] = next; stack[top++] = i + X; }
    if (z > 0 && mask[i - X * Y] && !label[i - X * Y]) { label[i - X * Y] = next; stack[top++] = i - X * Y; }
    if (z < Z - 1 && mask[i + X * Y] && !label[i + X * Y]) { label[i + X * Y] = next; stack[top++] = i + X * Y; }
  }
  if (count > bestCount) { bestCount = count; best = next; }
  next++;
}
console.log(`largest component ${bestCount.toLocaleString()} voxels of ${next - 1} pieces`);

/* ── centre of mass, then the farthest voxel in each direction ─────────── */
let sx = 0, sy = 0, sz = 0, nIn = 0;
for (let i = 0; i < label.length; i++) {
  if (label[i] !== best) continue;
  sx += i % X; sy += ((i / X) | 0) % Y; sz += (i / (X * Y)) | 0; nIn++;
}
const centre = toMm(sx / nIn, sy / nIn, sz / nIn);
console.log("centre of mass MNI", centre.map((v) => v.toFixed(1)).join(", "));

/* ── the rings ─────────────────────────────────────────────────────────────
   One contour per plane, taken as the farthest voxel in each of RING_PTS
   directions from the slice's own middle. A brain's cross-section is close
   enough to star-shaped for this to trace it faithfully, and it cannot fail
   the way boundary-chaining does on a slice that comes apart into pieces. */
const inv = (() => {
  /* millimetres back to voxel indices, for finding a plane's slab */
  const a = srow;
  const det = a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
            - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
            + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  if (Math.abs(det) < 1e-9) throw new Error("singular affine");
  return (mm) => {
    const b = [mm[0] - a[0][3], mm[1] - a[1][3], mm[2] - a[2][3]];
    const m = [
      [a[1][1] * a[2][2] - a[1][2] * a[2][1], a[0][2] * a[2][1] - a[0][1] * a[2][2], a[0][1] * a[1][2] - a[0][2] * a[1][1]],
      [a[1][2] * a[2][0] - a[1][0] * a[2][2], a[0][0] * a[2][2] - a[0][2] * a[2][0], a[0][2] * a[1][0] - a[0][0] * a[1][2]],
      [a[1][0] * a[2][1] - a[1][1] * a[2][0], a[0][1] * a[2][0] - a[0][0] * a[2][1], a[0][0] * a[1][1] - a[0][1] * a[1][0]],
    ];
    return [0, 1, 2].map((r) => (m[r][0] * b[0] + m[r][1] * b[1] + m[r][2] * b[2]) / det);
  };
})();

function ring(axis, at) {
  /* the two axes the contour lives in */
  const u = axis === 0 ? 1 : 0, v = 2;
  const slabVox = inv(axis === 0 ? [at, 0, 0] : [0, at, 0])[axis];
  const lo = Math.floor(slabVox - 0.5), hi = Math.ceil(slabVox + 0.5);
  const pts = [];
  for (let k = 0; k < Z; k++) for (let j = 0; j < Y; j++) for (let i = 0; i < X; i++) {
    const idx = i + X * (j + Y * k);
    if (label[idx] !== best) continue;
    const vox = axis === 0 ? i : j;
    if (vox < lo || vox > hi) continue;
    const mm = toMm(i, j, k);
    pts.push([mm[u], mm[v]]);
  }
  if (pts.length < 40) return null;
  let cu = 0, cv = 0;
  for (const p of pts) { cu += p[0]; cv += p[1]; }
  cu /= pts.length; cv /= pts.length;
  const bestR = new Float64Array(RING_PTS), bu = new Float64Array(RING_PTS), bv = new Float64Array(RING_PTS);
  for (const p of pts) {
    const du = p[0] - cu, dv = p[1] - cv, r = du * du + dv * dv;
    const b = Math.floor(((Math.atan2(dv, du) + Math.PI) / (2 * Math.PI)) * RING_PTS) % RING_PTS;
    if (r > bestR[b]) { bestR[b] = r; bu[b] = p[0]; bv[b] = p[1]; }
  }
  const out = [];
  for (let b = 0; b < RING_PTS; b++) {
    if (bestR[b] <= 0) continue;
    out.push(axis === 0 ? [at, Math.round(bu[b]), Math.round(bv[b])]
                        : [Math.round(bu[b]), at, Math.round(bv[b])]);
  }
  return out.length >= RING_PTS * 0.6 ? out : null;
}

const rings = [];
for (const at of SAGITTAL) { const r = ring(0, at); if (r) rings.push(r); }
for (const at of CORONAL) { const r = ring(1, at); if (r) rings.push(r); }
const total = rings.reduce((n, r) => n + r.length, 0);
const flat = rings.flat();
const ext = [0, 1, 2].map((k) => [Math.min(...flat.map((p) => p[k])), Math.max(...flat.map((p) => p[k]))]);
console.log(`${rings.length} rings, ${total} points, extent ` +
  ext.map(([a, b], k) => "xyz"[k] + " " + a + ".." + b).join("  "));

const body = `/* Generated by scripts/make_brain_hull.mjs from assets/mni152.nii.gz — do not edit.

   The brain as a cage of contour rings, in whole MNI millimetres: its own
   outline in ${SAGITTAL.length} sagittal and ${CORONAL.length} coronal planes. The Brodmann border
   graph projects these through the same maths as its nodes, so the brain
   turns with the graph, and fills a silhouette behind them from the same
   points. The threshold matches MN_EXPORT3D.autoThreshold, so this and the
   3D exports describe one brain. */
window.MN_BRAIN_HULL = {
  centre: [${centre.map((v) => Math.round(v * 10) / 10).join(", ")}],
  rings: [
${rings.map((r) => "    " + JSON.stringify(r)).join(",\n")}
  ]
};
`;
fs.writeFileSync(OUT, body);
console.log("wrote", OUT, Math.round(fs.statSync(OUT).size / 1024) + " KB");
