/* 3D export: the brain as a file other programs can open.

   Everything the pages draw in three dimensions is either a labelled volume
   (the atlas parcels, the Brodmann areas, the template itself), a graph in
   MNI millimetres (the Brodmann border graph, the network couplings) or a
   set of polylines (the tractogram). This file turns any of those into a
   scene of coloured parts and writes the scene in the formats people
   actually use:

     glb   glTF 2.0 binary. Blender, three.js, Unity, Unreal, Windows 3D
           Viewer, Sketchfab, and most things made this decade. Metres, Y up.
     usdz  Apple's format. Opens in AR Quick Look straight from Files on an
           iPhone, iPad, Vision Pro or Mac. Millimetres declared, Y up.
     obj   Wavefront OBJ with an .mtl for colours, zipped together. Every
           modelling tool ever made. Millimetres, Y up.
     stl   Binary STL for slicers and printers. No colour. Millimetres, as
           MNI has them: x right, y anterior, z superior.
     ply   Binary PLY with vertex colours, and edges for the streamlines.
           MeshLab, CloudCompare, Blender. Millimetres, MNI axes.
     wrl   VRML 2.0, the classic web format, still read by everything.
     x3d   X3D, VRML's successor, as XML. Both millimetres, Y up.

   The geometry is made here, in the browser, off the same voxels the viewer
   is drawing, so what is exported is what is on screen. Surfaces come from
   a naive surface-nets pass over a slightly blurred label mask, which gives
   a smooth closed mesh at the voxel boundary without the staircase a plain
   voxel dump would have. The brain surface is the template thresholded and
   reduced to its largest connected piece, at a coarser stride so the file
   stays a few megabytes.

   Nothing here knows about any page. A page builds a scene from what it has
   selected and hands it over:

     MN_EXPORT3D.labelSurface(vol, labels, {name, colour, alpha})  → part
     MN_EXPORT3D.isoSurface(vol, threshold, {stride, name, …})     → part
     MN_EXPORT3D.sphere(centre, r, {…}) / .tube(a, b, r, {…})       → part
     MN_EXPORT3D.lines(pts, offsets, {colours, name})              → part
     MN_EXPORT3D.write(fmtId, {name, credit, parts})               → Blob
     MN_EXPORT3D.save(fmtId, scene, basename)                      → Promise
     MN_EXPORT3D.attach({host, build, basename, options, formats}) → controls

   Coordinates in a part are MNI millimetres throughout; the writers turn
   them the way each format expects. */
window.MN_EXPORT3D = (function(){
"use strict";

var FORMATS = [
  {id:"glb",  label:"glTF binary (.glb)",          ext:"glb",  mime:"model/gltf-binary",
   lines:true,  up:"Y", unit:0.001,
   note:"Blender, three.js, Unity, Unreal, Windows 3D Viewer, Sketchfab. Metres, Y up."},
  {id:"usdz", label:"USDZ for Apple Quick Look",   ext:"usdz", mime:"model/vnd.usdz+zip",
   lines:false, up:"Y", unit:1,
   note:"Opens in AR Quick Look from Files on iPhone, iPad, Vision Pro and Mac. Streamlines become thin tubes."},
  {id:"obj",  label:"Wavefront OBJ (.zip with .mtl)", ext:"zip", mime:"application/zip",
   lines:true,  up:"Y", unit:1,
   note:"Read by every modelling tool. Colours travel in the .mtl; streamlines as polylines."},
  {id:"stl",  label:"STL for 3D printing",          ext:"stl",  mime:"model/stl",
   lines:false, up:"Z", unit:1,
   note:"Slicers and printers. One solid, no colour, MNI millimetres. Streamlines become thin tubes."},
  {id:"ply",  label:"PLY with vertex colours",      ext:"ply",  mime:"application/octet-stream",
   lines:true,  up:"Z", unit:1,
   note:"MeshLab, CloudCompare, Blender. Binary, colours per vertex, MNI millimetres."},
  {id:"wrl",  label:"VRML 2.0 (.wrl)",              ext:"wrl",  mime:"model/vrml",
   lines:true,  up:"Y", unit:1,
   note:"The classic web 3D format, still read by everything. Millimetres, Y up."},
  {id:"x3d",  label:"X3D (.x3d)",                   ext:"x3d",  mime:"model/x3d+xml",
   lines:true,  up:"Y", unit:1,
   note:"VRML's successor, as XML. Millimetres, Y up."}
];
var BY_ID = {};
FORMATS.forEach(function(f){ BY_ID[f.id] = f; });

var CREDIT = "VisualNeuroscience.AI · MNI152 template (MNI) · AAL parcellation (GIN) · " +
             "Brodmann atlas (MRIcron, BSD) · HCP1065 tractography (Yeh 2018, CC BY-SA 4.0)";

/* ── surface nets ──────────────────────────────────────────────────────────
   Mikola Lysenko's naive surface nets: one vertex per cell the surface
   passes through, placed at the mean of the edge crossings, and one quad per
   crossed edge joining the four cells around it. Table-free apart from the
   two small ones built here. */
var CUBE_EDGES = new Int32Array(24), EDGE_TABLE = new Int32Array(256);
(function(){
  var k = 0, i, j, p;
  for (i = 0; i < 8; ++i) for (j = 1; j <= 4; j <<= 1){
    p = i ^ j;
    if (i <= p){ CUBE_EDGES[k++] = i; CUBE_EDGES[k++] = p; }
  }
  for (i = 0; i < 256; ++i){
    var em = 0;
    for (j = 0; j < 24; j += 2){
      var a = !!(i & (1 << CUBE_EDGES[j])), b = !!(i & (1 << CUBE_EDGES[j + 1]));
      em |= a !== b ? (1 << (j >> 1)) : 0;
    }
    EDGE_TABLE[i] = em;
  }
})();

function surfaceNets(data, dims, level){
  var verts = [], quads = [];
  var n = 0, x = [0, 0, 0], R = [1, dims[0] + 1, (dims[0] + 1) * (dims[1] + 1)];
  var grid = new Float32Array(8), bufNo = 1;
  var buffer = new Int32Array(R[2] * 2);
  var i, j, k;
  for (x[2] = 0; x[2] < dims[2] - 1; ++x[2], n += dims[0], bufNo ^= 1, R[2] = -R[2]){
    var m = 1 + (dims[0] + 1) * (1 + bufNo * (dims[1] + 1));
    for (x[1] = 0; x[1] < dims[1] - 1; ++x[1], ++n, m += 2)
    for (x[0] = 0; x[0] < dims[0] - 1; ++x[0], ++n, ++m){
      var mask = 0, g = 0, idx = n;
      for (k = 0; k < 2; ++k, idx += dims[0] * (dims[1] - 2))
      for (j = 0; j < 2; ++j, idx += dims[0] - 2)
      for (i = 0; i < 2; ++i, ++g, ++idx){
        var p = data[idx] - level;
        grid[g] = p;
        mask |= (p < 0) ? (1 << g) : 0;
      }
      if (mask === 0 || mask === 0xff) continue;
      var edgeMask = EDGE_TABLE[mask];
      var v = [0, 0, 0], eCount = 0;
      for (i = 0; i < 12; ++i){
        if (!(edgeMask & (1 << i))) continue;
        ++eCount;
        var e0 = CUBE_EDGES[i << 1], e1 = CUBE_EDGES[(i << 1) + 1];
        var g0 = grid[e0], g1 = grid[e1], t = g0 - g1;
        if (Math.abs(t) > 1e-6) t = g0 / t; else continue;
        for (j = 0, k = 1; j < 3; ++j, k <<= 1){
          var a = e0 & k, b = e1 & k;
          if (a !== b) v[j] += a ? 1.0 - t : t;
          else v[j] += a ? 1.0 : 0;
        }
      }
      var s = 1.0 / eCount;
      for (i = 0; i < 3; ++i) v[i] = x[i] + s * v[i];
      buffer[m] = verts.length / 3;
      verts.push(v[0], v[1], v[2]);
      for (i = 0; i < 3; ++i){
        if (!(edgeMask & (1 << i))) continue;
        var iu = (i + 1) % 3, iv = (i + 2) % 3;
        if (x[iu] === 0 || x[iv] === 0) continue;
        var du = R[iu], dv = R[iv];
        if (mask & 1) quads.push(buffer[m], buffer[m - du], buffer[m - du - dv], buffer[m - dv]);
        else          quads.push(buffer[m], buffer[m - dv], buffer[m - du - dv], buffer[m - du]);
      }
    }
  }
  return { verts: new Float32Array(verts), quads: new Uint32Array(quads) };
}

function quadsToTris(q){
  var n = q.length / 4, t = new Uint32Array(n * 6);
  for (var i = 0, o = 0; i < q.length; i += 4){
    t[o++] = q[i]; t[o++] = q[i + 1]; t[o++] = q[i + 2];
    t[o++] = q[i]; t[o++] = q[i + 2]; t[o++] = q[i + 3];
  }
  return t;
}

/* a closed surface wound the wrong way has negative volume; turn it over */
function orientOutward(pos, idx){
  var vol = 0;
  for (var i = 0; i < idx.length; i += 3){
    var a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    var ax = pos[a], ay = pos[a + 1], az = pos[a + 2];
    var bx = pos[b], by = pos[b + 1], bz = pos[b + 2];
    var cx = pos[c], cy = pos[c + 1], cz = pos[c + 2];
    vol += ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
  }
  if (vol < 0) for (var j = 0; j < idx.length; j += 3){ var t = idx[j + 1]; idx[j + 1] = idx[j + 2]; idx[j + 2] = t; }
  return Math.abs(vol / 6);
}

function vertexNormals(pos, idx){
  var n = new Float32Array(pos.length);
  for (var i = 0; i < idx.length; i += 3){
    var a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
    var ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    var vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    n[a] += nx; n[a + 1] += ny; n[a + 2] += nz;
    n[b] += nx; n[b + 1] += ny; n[b + 2] += nz;
    n[c] += nx; n[c + 1] += ny; n[c + 2] += nz;
  }
  for (var k = 0; k < n.length; k += 3){
    var L = Math.hypot(n[k], n[k + 1], n[k + 2]) || 1;
    n[k] /= L; n[k + 1] /= L; n[k + 2] /= L;
  }
  return n;
}

/* A binomial blur, [1 2 1]/4 on each axis, edges clamped. It rounds the
   voxel corners just enough for the level-0.5 surface to be smooth rather
   than stepped, without eating into thin structures the way a box blur
   does. The flat faces stay exactly where the voxel boundary is. */
function blur3(src, d){
  var tmp = new Float32Array(src.length), out = new Float32Array(src.length);
  var X = d[0], Y = d[1], Z = d[2], x, y, z, i;
  for (z = 0; z < Z; z++) for (y = 0; y < Y; y++){
    var row = (z * Y + y) * X;
    for (x = 0; x < X; x++){
      i = row + x;
      tmp[i] = (src[x > 0 ? i - 1 : i] + 2 * src[i] + src[x < X - 1 ? i + 1 : i]) / 4;
    }
  }
  for (z = 0; z < Z; z++) for (x = 0; x < X; x++) for (y = 0; y < Y; y++){
    i = (z * Y + y) * X + x;
    out[i] = (tmp[y > 0 ? i - X : i] + 2 * tmp[i] + tmp[y < Y - 1 ? i + X : i]) / 4;
  }
  var XY = X * Y;
  for (y = 0; y < Y; y++) for (x = 0; x < X; x++) for (z = 0; z < Z; z++){
    i = (z * Y + y) * X + x;
    tmp[i] = (out[z > 0 ? i - XY : i] + 2 * out[i] + out[z < Z - 1 ? i + XY : i]) / 4;
  }
  return tmp;
}

/* keep only the biggest connected piece of a binary grid, six-connected */
function largestComponent(bin, d){
  var X = d[0], Y = d[1], Z = d[2], N = X * Y * Z;
  var label = new Int32Array(N), stack = new Int32Array(N), best = 0, bestN = 0, next = 1;
  for (var s = 0; s < N; s++){
    if (!bin[s] || label[s]) continue;
    var top = 0, count = 0; stack[top++] = s; label[s] = next;
    while (top){
      var i = stack[--top]; count++;
      var x = i % X, y = ((i / X) | 0) % Y, z = (i / (X * Y)) | 0;
      var nb = [x > 0 ? i - 1 : -1, x < X - 1 ? i + 1 : -1, y > 0 ? i - X : -1, y < Y - 1 ? i + X : -1,
                z > 0 ? i - X * Y : -1, z < Z - 1 ? i + X * Y : -1];
      for (var k = 0; k < 6; k++){ var j = nb[k]; if (j >= 0 && bin[j] && !label[j]){ label[j] = next; stack[top++] = j; } }
    }
    if (count > bestN){ bestN = count; best = next; }
    next++;
  }
  var out = new Uint8Array(N);
  for (var t = 0; t < N; t++) out[t] = label[t] === best ? 1 : 0;
  return out;
}

/* ── volumes ───────────────────────────────────────────────────────────────
   A volume is a NiiVue NVImage: img is the voxel array in file order and
   hdr.affine maps a voxel index to millimetres. Bounding boxes per label are
   found once per volume and remembered. */
var VOL_CACHE = new Map();
function volume(src){
  if (src && src.img && src.hdr) return Promise.resolve(src);
  var url = String(src);
  if (VOL_CACHE.has(url)) return VOL_CACHE.get(url);
  if (typeof niivue === "undefined" || !niivue.NVImage) return Promise.reject(new Error("The viewer library is not loaded."));
  var p = niivue.NVImage.loadFromUrl({ url: url });
  VOL_CACHE.set(url, p);
  return p;
}

function affineOf(vol){
  var A = vol.hdr && vol.hdr.affine;
  if (!A) throw new Error("This volume has no affine.");
  return A;
}
function voxToMm(A, i, j, k){
  return [A[0][0] * i + A[0][1] * j + A[0][2] * k + A[0][3],
          A[1][0] * i + A[1][1] * j + A[1][2] * k + A[1][3],
          A[2][0] * i + A[2][1] * j + A[2][2] * k + A[2][3]];
}
function dimsOf(vol){ var d = vol.hdr.dims; return [d[1], d[2], d[3]]; }

var BBOX = new WeakMap();
function labelBoxes(vol){
  if (BBOX.has(vol)) return BBOX.get(vol);
  var d = dimsOf(vol), img = vol.img, boxes = {}, cent = {};
  var X = d[0], Y = d[1], Z = d[2], i = 0;
  for (var z = 0; z < Z; z++) for (var y = 0; y < Y; y++) for (var x = 0; x < X; x++, i++){
    var v = img[i]; if (!v) continue;
    var b = boxes[v];
    if (!b){ boxes[v] = [x, x, y, y, z, z]; cent[v] = [x, y, z, 1]; continue; }
    if (x < b[0]) b[0] = x; if (x > b[1]) b[1] = x;
    if (y < b[2]) b[2] = y; if (y > b[3]) b[3] = y;
    if (z < b[4]) b[4] = z; if (z > b[5]) b[5] = z;
    var c = cent[v]; c[0] += x; c[1] += y; c[2] += z; c[3]++;
  }
  var out = { boxes: boxes, centroids: cent };
  BBOX.set(vol, out);
  return out;
}

/* the centre of mass of a set of labels, in millimetres */
function labelCentroid(vol, labels){
  var info = labelBoxes(vol), A = affineOf(vol), s = [0, 0, 0], n = 0;
  labels.forEach(function(l){
    var c = info.centroids[l]; if (!c) return;
    s[0] += c[0]; s[1] += c[1]; s[2] += c[2]; n += c[3];
  });
  if (!n) return null;
  return voxToMm(A, s[0] / n, s[1] / n, s[2] / n);
}

/* mesh part from a set of label values */
function labelSurface(vol, labels, o){
  o = o || {};
  var info = labelBoxes(vol), d = dimsOf(vol), img = vol.img, A = affineOf(vol);
  var lut = new Uint8Array(65536);
  labels.forEach(function(l){ lut[l] = 1; });
  var box = null;
  labels.forEach(function(l){
    var b = info.boxes[l]; if (!b) return;
    if (!box){ box = b.slice(); return; }
    box[0] = Math.min(box[0], b[0]); box[1] = Math.max(box[1], b[1]);
    box[2] = Math.min(box[2], b[2]); box[3] = Math.max(box[3], b[3]);
    box[4] = Math.min(box[4], b[4]); box[5] = Math.max(box[5], b[5]);
  });
  if (!box) return null;
  /* a single gyrus keeps every voxel; a set the size of the whole
     cerebellum is sampled at 2 mm, which is still finer than the eye */
  var cells = (box[1] - box[0] + 1) * (box[3] - box[2] + 1) * (box[5] - box[4] + 1);
  var pad = 2, stride = Math.max(1, o.stride | 0 || (cells > 300000 ? 2 : 1));
  var gd = [Math.ceil((box[1] - box[0] + 1) / stride) + 2 * pad,
            Math.ceil((box[3] - box[2] + 1) / stride) + 2 * pad,
            Math.ceil((box[5] - box[4] + 1) / stride) + 2 * pad];
  var origin = [box[0] - pad * stride, box[2] - pad * stride, box[4] - pad * stride];
  var field = new Float32Array(gd[0] * gd[1] * gd[2]);
  var X = d[0], Y = d[1], Z = d[2];
  for (var gz = 0; gz < gd[2]; gz++){
    var z = origin[2] + gz * stride; if (z < 0 || z >= Z) continue;
    for (var gy = 0; gy < gd[1]; gy++){
      var y = origin[1] + gy * stride; if (y < 0 || y >= Y) continue;
      var row = (z * Y + y) * X, grow = (gz * gd[1] + gy) * gd[0];
      for (var gx = 0; gx < gd[0]; gx++){
        var x = origin[0] + gx * stride; if (x < 0 || x >= X) continue;
        if (lut[img[row + x]]) field[grow + gx] = 1;
      }
    }
  }
  return fieldToPart(o.smooth === false ? field : blur3(field, gd), gd, 0.5, origin, stride, A, o);
}

/* mesh part from a threshold on the volume's own intensities */
function isoSurface(vol, threshold, o){
  o = o || {};
  var d = dimsOf(vol), img = vol.img, A = affineOf(vol);
  var stride = Math.max(1, o.stride | 0 || 3), pad = 2;
  var gd = [Math.ceil(d[0] / stride) + 2 * pad, Math.ceil(d[1] / stride) + 2 * pad, Math.ceil(d[2] / stride) + 2 * pad];
  var origin = [-pad * stride, -pad * stride, -pad * stride];
  var bin = new Uint8Array(gd[0] * gd[1] * gd[2]);
  var X = d[0], Y = d[1], Z = d[2];
  for (var gz = 0; gz < gd[2]; gz++){
    var z = origin[2] + gz * stride; if (z < 0 || z >= Z) continue;
    for (var gy = 0; gy < gd[1]; gy++){
      var y = origin[1] + gy * stride; if (y < 0 || y >= Y) continue;
      var row = (z * Y + y) * X, grow = (gz * gd[1] + gy) * gd[0];
      for (var gx = 0; gx < gd[0]; gx++){
        var x = origin[0] + gx * stride; if (x < 0 || x >= X) continue;
        if (img[row + x] >= threshold) bin[grow + gx] = 1;
      }
    }
  }
  if (o.largest !== false) bin = largestComponent(bin, gd);
  var field = new Float32Array(bin.length);
  for (var i = 0; i < bin.length; i++) field[i] = bin[i];
  return fieldToPart(blur3(field, gd), gd, 0.5, origin, stride, A, o);
}

/* A surface-net vertex is the mean of its cell's edge crossings, which for a
   curved or tilted surface sits a little inside it: half a voxel on a sphere,
   a tenth of the volume. Two Newton steps along the trilinear gradient put
   each vertex back on the level itself. Topology is untouched. */
function trilinear(field, d, x, y, z){
  var X = d[0], Y = d[1], Z = d[2];
  x = Math.min(Math.max(x, 0), X - 1.001); y = Math.min(Math.max(y, 0), Y - 1.001); z = Math.min(Math.max(z, 0), Z - 1.001);
  var i = x | 0, j = y | 0, k = z | 0, fx = x - i, fy = y - j, fz = z - k;
  var i0 = (k * Y + j) * X + i, i1 = i0 + X, i2 = i0 + X * Y, i3 = i2 + X;
  var c00 = field[i0] * (1 - fx) + field[i0 + 1] * fx, c10 = field[i1] * (1 - fx) + field[i1 + 1] * fx;
  var c01 = field[i2] * (1 - fx) + field[i2 + 1] * fx, c11 = field[i3] * (1 - fx) + field[i3 + 1] * fx;
  var c0 = c00 * (1 - fy) + c10 * fy, c1 = c01 * (1 - fy) + c11 * fy;
  return c0 * (1 - fz) + c1 * fz;
}
function snapToLevel(verts, field, d, level){
  var h = 0.5, maxStep = 0.45;
  for (var it = 0; it < 2; it++){
    for (var i = 0; i < verts.length; i += 3){
      var x = verts[i], y = verts[i + 1], z = verts[i + 2];
      var f = trilinear(field, d, x, y, z) - level;
      var gx = (trilinear(field, d, x + h, y, z) - trilinear(field, d, x - h, y, z)) / (2 * h);
      var gy = (trilinear(field, d, x, y + h, z) - trilinear(field, d, x, y - h, z)) / (2 * h);
      var gz = (trilinear(field, d, x, y, z + h) - trilinear(field, d, x, y, z - h)) / (2 * h);
      var g2 = gx * gx + gy * gy + gz * gz;
      if (g2 < 1e-8) continue;
      var t = f / g2, L = Math.sqrt(g2) * Math.abs(t);
      if (L > maxStep) t *= maxStep / L;
      verts[i] = x - t * gx; verts[i + 1] = y - t * gy; verts[i + 2] = z - t * gz;
    }
  }
}

function fieldToPart(field, gd, level, origin, stride, A, o){
  var sn = surfaceNets(field, gd, level);
  if (!sn.quads.length) return null;
  snapToLevel(sn.verts, field, gd, level);
  var pos = new Float32Array(sn.verts.length);
  for (var i = 0; i < sn.verts.length; i += 3){
    var mm = voxToMm(A, origin[0] + sn.verts[i] * stride, origin[1] + sn.verts[i + 1] * stride, origin[2] + sn.verts[i + 2] * stride);
    pos[i] = mm[0]; pos[i + 1] = mm[1]; pos[i + 2] = mm[2];
  }
  var idx = quadsToTris(sn.quads);
  var volume = orientOutward(pos, idx);
  return { kind: "mesh", name: o.name || "Surface", pos: pos, idx: idx, nrm: vertexNormals(pos, idx),
           colour: o.colour || [0.8, 0.8, 0.8], alpha: o.alpha == null ? 1 : o.alpha, volumeMm3: volume };
}

/* The brain's outer surface: the template above a threshold set from its
   own intensities, at a 3-voxel stride, its largest connected piece only.
   Built once per volume and handed back with whatever alpha is wanted. */
var SHELL = new WeakMap();
function autoThreshold(vol, frac){
  var img = vol.img, vals = [], step = Math.max(1, Math.floor(img.length / 400000));
  for (var i = 0; i < img.length; i += step) if (img[i] > 0) vals.push(img[i]);
  if (!vals.length) return 1;
  vals.sort(function(a, b){ return a - b; });
  return vals[Math.floor(0.98 * (vals.length - 1))] * (frac || 0.42);
}
function brainSurface(vol, o){
  o = o || {};
  var base = SHELL.get(vol);
  if (!base){
    base = isoSurface(vol, o.threshold || autoThreshold(vol), { stride: o.stride || 3, name: "Brain surface", colour: [0.82, 0.80, 0.78], largest: true });
    if (base) SHELL.set(vol, base);
  }
  if (!base) return null;
  return { kind: "mesh", name: o.name || base.name, pos: base.pos, idx: base.idx, nrm: base.nrm,
           colour: o.colour || base.colour, alpha: o.alpha == null ? 0.25 : o.alpha, volumeMm3: base.volumeMm3 };
}

/* [atlas, template] from a viewer that has them, else loaded by URL */
function volumes(nv, atlasUrl, tplUrl){
  if (nv && nv.volumes && nv.volumes.length > 1 && nv.volumes[1].img && nv.volumes[0].img)
    return Promise.resolve([nv.volumes[1], nv.volumes[0]]);
  return Promise.all([volume(atlasUrl), volume(tplUrl)]);
}

/* ── primitives for graphs ─────────────────────────────────────────────── */
function sphere(c, r, o){
  o = o || {};
  var seg = o.segments || 12, rings = o.rings || 8, pos = [], idx = [];
  pos.push(c[0], c[1], c[2] + r);                       /* north pole: vertex 0 */
  for (var j = 1; j < rings; j++){
    var phi = Math.PI * j / rings, sp = Math.sin(phi), cp = Math.cos(phi);
    for (var i = 0; i < seg; i++){
      var th = 2 * Math.PI * i / seg;
      pos.push(c[0] + r * sp * Math.cos(th), c[1] + r * sp * Math.sin(th), c[2] + r * cp);
    }
  }
  var south = pos.length / 3;
  pos.push(c[0], c[1], c[2] - r);
  function at(ring, i){ return 1 + (ring - 1) * seg + (i % seg); }
  for (var i2 = 0; i2 < seg; i2++) idx.push(0, at(1, i2), at(1, i2 + 1));
  for (var jj = 1; jj < rings - 1; jj++) for (var ii = 0; ii < seg; ii++){
    var a = at(jj, ii), b = at(jj + 1, ii), a1 = at(jj, ii + 1), b1 = at(jj + 1, ii + 1);
    idx.push(a, b, a1, a1, b, b1);
  }
  for (var i3 = 0; i3 < seg; i3++) idx.push(south, at(rings - 1, i3 + 1), at(rings - 1, i3));
  return finishMesh(pos, idx, o, "Sphere");
}

function tube(a, b, r, o){
  o = o || {};
  var seg = o.segments || 6;
  var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz) || 1e-6;
  var ax = dx / L, ay = dy / L, az = dz / L;
  var ux, uy, uz;
  if (Math.abs(ax) < 0.9){ ux = 0; uy = -az; uz = ay; } else { ux = -az; uy = 0; uz = ax; }
  var uL = Math.hypot(ux, uy, uz) || 1; ux /= uL; uy /= uL; uz /= uL;
  var vx = ay * uz - az * uy, vy = az * ux - ax * uz, vz = ax * uy - ay * ux;
  var pos = [], idx = [];
  for (var i = 0; i < seg; i++){
    var th = 2 * Math.PI * i / seg, c = Math.cos(th) * r, s = Math.sin(th) * r;
    var ox = ux * c + vx * s, oy = uy * c + vy * s, oz = uz * c + vz * s;
    pos.push(a[0] + ox, a[1] + oy, a[2] + oz);
    pos.push(b[0] + ox, b[1] + oy, b[2] + oz);
  }
  for (var k = 0; k < seg; k++){
    var p0 = 2 * k, p1 = 2 * k + 1, q0 = 2 * ((k + 1) % seg), q1 = q0 + 1;
    idx.push(p0, q0, p1, p1, q0, q1);
  }
  var ca = pos.length / 3; pos.push(a[0], a[1], a[2]);
  var cb = pos.length / 3; pos.push(b[0], b[1], b[2]);
  for (var m = 0; m < seg; m++){
    var r0 = 2 * m, r1 = 2 * ((m + 1) % seg);
    idx.push(ca, r1, r0);
    idx.push(cb, r0 + 1, r1 + 1);
  }
  return finishMesh(pos, idx, o, "Tube");
}

function finishMesh(pos, idx, o, dflt){
  var P = new Float32Array(pos), I = new Uint32Array(idx);
  orientOutward(P, I);
  return { kind: "mesh", name: o.name || dflt, pos: P, idx: I, nrm: vertexNormals(P, I),
           colour: o.colour || [0.8, 0.8, 0.8], alpha: o.alpha == null ? 1 : o.alpha };
}

/* several mesh parts as one, keeping each vertex's colour */
function merge(parts, o){
  o = o || {};
  var nv = 0, ni = 0, mixed = false, first = parts.length ? rgb255(parts[0].colour).join() : "";
  parts.forEach(function(p){ nv += p.pos.length; ni += p.idx.length; if (p.vcol || rgb255(p.colour).join() !== first) mixed = true; });
  var wantCol = o.vcol == null ? mixed : !!o.vcol;
  var pos = new Float32Array(nv), nrm = new Float32Array(nv), idx = new Uint32Array(ni), vcol = wantCol ? new Uint8Array(nv) : null;
  var vo = 0, io = 0;
  parts.forEach(function(p){
    pos.set(p.pos, vo); nrm.set(p.nrm || vertexNormals(p.pos, p.idx), vo);
    var base = vo / 3;
    for (var i = 0; i < p.idx.length; i++) idx[io + i] = p.idx[i] + base;
    var c = rgb255(p.colour);
    if (vcol) for (var k = 0; k < p.pos.length; k += 3){
      if (p.vcol){ vcol[vo + k] = p.vcol[k]; vcol[vo + k + 1] = p.vcol[k + 1]; vcol[vo + k + 2] = p.vcol[k + 2]; }
      else { vcol[vo + k] = c[0]; vcol[vo + k + 1] = c[1]; vcol[vo + k + 2] = c[2]; }
    }
    vo += p.pos.length; io += p.idx.length;
  });
  var out = { kind: "mesh", name: o.name || "Group", pos: pos, idx: idx, nrm: nrm,
              colour: o.colour || (parts.length ? parts[0].colour : [0.8, 0.8, 0.8]), alpha: o.alpha == null ? 1 : o.alpha };
  if (vcol) out.vcol = vcol;
  return out;
}

/* ── polylines ─────────────────────────────────────────────────────────────
   pts is xyz per point, offsets marks where each line starts (length n+1).
   Colours per point default to the local direction, as the tractography
   page draws them. */
function lines(pts, offsets, o){
  o = o || {};
  var pos = pts instanceof Float32Array ? pts : new Float32Array(pts);
  var off = offsets instanceof Uint32Array ? offsets : new Uint32Array(offsets);
  var vcol = o.vcol;
  if (!vcol){
    vcol = new Uint8Array(pos.length);
    var fixed = o.colour ? rgb255(o.colour) : null;
    for (var s = 0; s + 1 < off.length; s++){
      var a = off[s], b = off[s + 1];
      for (var p = a; p < b; p++){
        if (fixed){ vcol[p * 3] = fixed[0]; vcol[p * 3 + 1] = fixed[1]; vcol[p * 3 + 2] = fixed[2]; continue; }
        var q = p + 1 < b ? p + 1 : p, r = p > a ? p - 1 : p;
        var dx = Math.abs(pos[q * 3] - pos[r * 3]), dy = Math.abs(pos[q * 3 + 1] - pos[r * 3 + 1]), dz = Math.abs(pos[q * 3 + 2] - pos[r * 3 + 2]);
        var L = Math.hypot(dx, dy, dz) || 1;
        vcol[p * 3] = Math.round(255 * dx / L); vcol[p * 3 + 1] = Math.round(255 * dy / L); vcol[p * 3 + 2] = Math.round(255 * dz / L);
      }
    }
  }
  return { kind: "lines", name: o.name || "Lines", pos: pos, offsets: off, vcol: vcol,
           colour: o.colour || [1, 1, 1], alpha: o.alpha == null ? 1 : o.alpha };
}

/* every k-th line of a tractogram, up to a cap */
function sampleLines(pts, offsets, cap){
  var n = offsets.length - 1;
  if (n <= cap) return { pts: pts, offsets: offsets, count: n };
  var step = n / cap, outOff = [0], outPts = [], total = 0;
  for (var i = 0; i < cap; i++){
    var s = Math.floor(i * step), a = offsets[s], b = offsets[s + 1];
    for (var p = a * 3; p < b * 3; p++) outPts.push(pts[p]);
    total += b - a; outOff.push(total);
  }
  return { pts: new Float32Array(outPts), offsets: new Uint32Array(outOff), count: cap };
}

/* thin three-sided tubes for the formats that cannot draw a line */
function linesToTubes(part, radius, sides){
  sides = sides || 3; radius = radius || 0.35;
  var pos = part.pos, off = part.offsets, P = pos.length / 3, S = off.length - 1;
  var outPos = new Float32Array(P * sides * 3), outCol = new Uint8Array(P * sides * 3);
  var outIdx = new Uint32Array((P - S) * sides * 6), io = 0;
  var ang = [];
  for (var s2 = 0; s2 < sides; s2++) ang.push([Math.cos(2 * Math.PI * s2 / sides), Math.sin(2 * Math.PI * s2 / sides)]);
  for (var s = 0; s < S; s++){
    var a = off[s], b = off[s + 1];
    var ux = 0, uy = 0, uz = 1;
    for (var p = a; p < b; p++){
      var q = p + 1 < b ? p + 1 : p, r = p > a ? p - 1 : p;
      var tx = pos[q * 3] - pos[r * 3], ty = pos[q * 3 + 1] - pos[r * 3 + 1], tz = pos[q * 3 + 2] - pos[r * 3 + 2];
      var L = Math.hypot(tx, ty, tz) || 1; tx /= L; ty /= L; tz /= L;
      /* keep the frame from twisting: project the last side vector off the tangent */
      var d = ux * tx + uy * ty + uz * tz;
      ux -= d * tx; uy -= d * ty; uz -= d * tz;
      var uL = Math.hypot(ux, uy, uz);
      if (uL < 1e-4){ if (Math.abs(tx) < 0.9){ ux = 0; uy = -tz; uz = ty; } else { ux = -tz; uy = 0; uz = tx; } uL = Math.hypot(ux, uy, uz); }
      ux /= uL; uy /= uL; uz /= uL;
      var vx = ty * uz - tz * uy, vy = tz * ux - tx * uz, vz = tx * uy - ty * ux;
      for (var k = 0; k < sides; k++){
        var c = ang[k][0] * radius, sn = ang[k][1] * radius, o = (p * sides + k) * 3;
        outPos[o] = pos[p * 3] + ux * c + vx * sn;
        outPos[o + 1] = pos[p * 3 + 1] + uy * c + vy * sn;
        outPos[o + 2] = pos[p * 3 + 2] + uz * c + vz * sn;
        outCol[o] = part.vcol[p * 3]; outCol[o + 1] = part.vcol[p * 3 + 1]; outCol[o + 2] = part.vcol[p * 3 + 2];
      }
      if (p + 1 < b){
        for (var m = 0; m < sides; m++){
          var a0 = p * sides + m, a1 = p * sides + (m + 1) % sides, b0 = a0 + sides, b1 = a1 + sides;
          outIdx[io++] = a0; outIdx[io++] = b0; outIdx[io++] = a1;
          outIdx[io++] = a1; outIdx[io++] = b0; outIdx[io++] = b1;
        }
      }
    }
  }
  return { kind: "mesh", name: part.name, pos: outPos, idx: outIdx, nrm: vertexNormals(outPos, outIdx), vcol: outCol,
           colour: part.colour, alpha: part.alpha };
}

/* ── writers ─────────────────────────────────────────────────────────────── */
function rgb255(c){ return [Math.round(c[0] * 255), Math.round(c[1] * 255), Math.round(c[2] * 255)]; }
function hexColour(h){
  var n = parseInt(String(h).replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/* positions into the format's frame: MNI is x right, y anterior, z up */
function framed(pos, fmt){
  var out = new Float32Array(pos.length), u = fmt.unit;
  if (fmt.up === "Y") for (var i = 0; i < pos.length; i += 3){ out[i] = pos[i] * u; out[i + 1] = pos[i + 2] * u; out[i + 2] = -pos[i + 1] * u; }
  else for (var j = 0; j < pos.length; j += 3){ out[j] = pos[j] * u; out[j + 1] = pos[j + 1] * u; out[j + 2] = pos[j + 2] * u; }
  return out;
}
function framedNormals(nrm, fmt){ return framed(nrm, { up: fmt.up, unit: 1 }); }

/* the parts as the format can hold them: lines become tubes where needed */
function partsFor(scene, fmt){
  return scene.parts.filter(Boolean).map(function(p){
    if (p.kind === "lines" && !fmt.lines) return linesToTubes(p, scene.tubeRadius || 0.35, 3);
    return p;
  });
}

function fmtNum(v, dp){ var s = v.toFixed(dp); return s.indexOf(".") >= 0 ? s.replace(/\.?0+$/, "") : s; }
function safeName(s){
  var t = String(s || "Part").replace(/[^A-Za-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  if (!t) t = "Part";
  if (/^[0-9]/.test(t)) t = "_" + t;
  return t;
}
function uniqueNames(parts){
  var seen = {}, out = [];
  parts.forEach(function(p){
    var n = safeName(p.name), base = n, k = 2;
    while (seen[n]) n = base + "_" + (k++);
    seen[n] = 1; out.push(n);
  });
  return out;
}

/* glTF 2.0 binary */
function writeGLB(scene, fmt){
  var parts = partsFor(scene, fmt), names = uniqueNames(parts);
  var chunks = [], byteLength = 0, bufferViews = [], accessors = [], materials = [], meshes = [], nodes = [];
  function view(arr, target){
    var bytes = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
    var padded = (bytes.length + 3) & ~3;
    var copy = new Uint8Array(padded); copy.set(bytes);
    chunks.push(copy);
    var v = { buffer: 0, byteOffset: byteLength, byteLength: bytes.length };
    if (target) v.target = target;
    byteLength += padded;
    bufferViews.push(v);
    return bufferViews.length - 1;
  }
  function accessor(o){ accessors.push(o); return accessors.length - 1; }
  function minMax(arr, n){
    var mn = [], mx = [];
    for (var c = 0; c < n; c++){ mn.push(Infinity); mx.push(-Infinity); }
    for (var i = 0; i < arr.length; i += n) for (var k = 0; k < n; k++){
      if (arr[i + k] < mn[k]) mn[k] = arr[i + k];
      if (arr[i + k] > mx[k]) mx[k] = arr[i + k];
    }
    return { min: mn, max: mx };
  }
  var unlit = false;
  parts.forEach(function(p, pi){
    var pos = framed(p.pos, fmt), mm = minMax(pos, 3);
    var attrs = { POSITION: accessor({ bufferView: view(pos, 34962), componentType: 5126, count: pos.length / 3, type: "VEC3", min: mm.min, max: mm.max }) };
    var indices;
    if (p.kind === "mesh"){
      var nrm = framedNormals(p.nrm || vertexNormals(p.pos, p.idx), fmt);
      attrs.NORMAL = accessor({ bufferView: view(nrm, 34962), componentType: 5126, count: nrm.length / 3, type: "VEC3" });
      indices = accessor({ bufferView: view(p.idx, 34963), componentType: 5125, count: p.idx.length, type: "SCALAR" });
    } else {
      var S = p.offsets.length - 1, P = p.pos.length / 3, idx = new Uint32Array((P - S) * 2), o = 0;
      for (var s = 0; s < S; s++) for (var q = p.offsets[s]; q + 1 < p.offsets[s + 1]; q++){ idx[o++] = q; idx[o++] = q + 1; }
      indices = accessor({ bufferView: view(idx, 34963), componentType: 5125, count: idx.length, type: "SCALAR" });
    }
    if (p.vcol){
      var rgba = new Uint8Array(p.vcol.length / 3 * 4);
      for (var i = 0, j = 0; i < p.vcol.length; i += 3, j += 4){ rgba[j] = p.vcol[i]; rgba[j + 1] = p.vcol[i + 1]; rgba[j + 2] = p.vcol[i + 2]; rgba[j + 3] = 255; }
      attrs.COLOR_0 = accessor({ bufferView: view(rgba, 34962), componentType: 5121, normalized: true, count: rgba.length / 4, type: "VEC4" });
    }
    var mat = { name: names[pi] + "_mat", doubleSided: true,
                pbrMetallicRoughness: { baseColorFactor: p.vcol ? [1, 1, 1, p.alpha] : [p.colour[0], p.colour[1], p.colour[2], p.alpha],
                                        metallicFactor: 0, roughnessFactor: 0.6 } };
    if (p.alpha < 1) mat.alphaMode = "BLEND";
    if (p.kind === "lines"){ mat.extensions = { KHR_materials_unlit: {} }; unlit = true; }
    materials.push(mat);
    meshes.push({ name: names[pi], primitives: [{ attributes: attrs, indices: indices, mode: p.kind === "mesh" ? 4 : 1, material: materials.length - 1 }] });
    nodes.push({ name: names[pi], mesh: meshes.length - 1 });
  });
  var children = nodes.map(function(_, i){ return i; });
  nodes.push({ name: safeName(scene.name || "Brain"), children: children });
  var json = { asset: { version: "2.0", generator: "VisualNeuroscience.AI", copyright: scene.credit || CREDIT },
               scene: 0, scenes: [{ name: scene.name || "Brain", nodes: [nodes.length - 1] }],
               nodes: nodes, meshes: meshes, materials: materials, accessors: accessors, bufferViews: bufferViews,
               buffers: [{ byteLength: byteLength }] };
  if (unlit) json.extensionsUsed = ["KHR_materials_unlit"];
  var jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  var jsonPad = (jsonBytes.length + 3) & ~3;
  var total = 12 + 8 + jsonPad + 8 + byteLength;
  var out = new Uint8Array(total), dv = new DataView(out.buffer), at = 0;
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true); at = 12;
  dv.setUint32(at, jsonPad, true); dv.setUint32(at + 4, 0x4E4F534A, true); at += 8;
  out.set(jsonBytes, at); for (var k = jsonBytes.length; k < jsonPad; k++) out[at + k] = 0x20; at += jsonPad;
  dv.setUint32(at, byteLength, true); dv.setUint32(at + 4, 0x004E4942, true); at += 8;
  chunks.forEach(function(c){ out.set(c, at); at += c.length; });
  return new Blob([out], { type: fmt.mime });
}

/* binary STL: every mesh part as one solid */
function writeSTL(scene, fmt){
  var parts = partsFor(scene, fmt).filter(function(p){ return p.kind === "mesh"; });
  var nTri = 0; parts.forEach(function(p){ nTri += p.idx.length / 3; });
  var out = new Uint8Array(84 + nTri * 50), dv = new DataView(out.buffer);
  var head = new TextEncoder().encode("VisualNeuroscience.AI " + (scene.name || "brain") + " MNI mm");
  out.set(head.slice(0, 80), 0);
  dv.setUint32(80, nTri, true);
  var at = 84;
  parts.forEach(function(p){
    var pos = framed(p.pos, fmt), idx = p.idx;
    for (var i = 0; i < idx.length; i += 3){
      var a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      var ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
      var vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, L = Math.hypot(nx, ny, nz) || 1;
      dv.setFloat32(at, nx / L, true); dv.setFloat32(at + 4, ny / L, true); dv.setFloat32(at + 8, nz / L, true); at += 12;
      [a, b, c].forEach(function(v){ dv.setFloat32(at, pos[v], true); dv.setFloat32(at + 4, pos[v + 1], true); dv.setFloat32(at + 8, pos[v + 2], true); at += 12; });
      dv.setUint16(at, 0, true); at += 2;
    }
  });
  return new Blob([out], { type: fmt.mime });
}

/* binary PLY: vertices with normals and colours, faces, and edges for lines */
function writePLY(scene, fmt){
  var parts = partsFor(scene, fmt);
  var nV = 0, nF = 0, nE = 0;
  parts.forEach(function(p){
    nV += p.pos.length / 3;
    if (p.kind === "mesh") nF += p.idx.length / 3;
    else nE += p.pos.length / 3 - (p.offsets.length - 1);
  });
  var header = "ply\nformat binary_little_endian 1.0\ncomment " + (scene.credit || CREDIT) + "\n" +
    "comment " + (scene.name || "Brain") + ", MNI152 millimetres: x right, y anterior, z superior\n" +
    "element vertex " + nV + "\nproperty float x\nproperty float y\nproperty float z\n" +
    "property float nx\nproperty float ny\nproperty float nz\n" +
    "property uchar red\nproperty uchar green\nproperty uchar blue\nproperty uchar alpha\n" +
    "element face " + nF + "\nproperty list uchar int vertex_indices\n" +
    (nE ? "element edge " + nE + "\nproperty int vertex1\nproperty int vertex2\nproperty uchar red\nproperty uchar green\nproperty uchar blue\n" : "") +
    "end_header\n";
  var hb = new TextEncoder().encode(header);
  var out = new Uint8Array(hb.length + nV * 28 + nF * 13 + nE * 11), dv = new DataView(out.buffer);
  out.set(hb, 0);
  var at = hb.length, base = 0, faceAt = at + nV * 28, edgeAt = faceAt + nF * 13;
  parts.forEach(function(p){
    var pos = framed(p.pos, fmt), n = pos.length / 3;
    var nrm = p.kind === "mesh" ? framedNormals(p.nrm || vertexNormals(p.pos, p.idx), fmt) : null;
    var c = rgb255(p.colour), a = Math.round(p.alpha * 255);
    for (var i = 0; i < n; i++){
      dv.setFloat32(at, pos[i * 3], true); dv.setFloat32(at + 4, pos[i * 3 + 1], true); dv.setFloat32(at + 8, pos[i * 3 + 2], true);
      if (nrm){ dv.setFloat32(at + 12, nrm[i * 3], true); dv.setFloat32(at + 16, nrm[i * 3 + 1], true); dv.setFloat32(at + 20, nrm[i * 3 + 2], true); }
      else { dv.setFloat32(at + 12, 0, true); dv.setFloat32(at + 16, 0, true); dv.setFloat32(at + 20, 0, true); }
      if (p.vcol){ out[at + 24] = p.vcol[i * 3]; out[at + 25] = p.vcol[i * 3 + 1]; out[at + 26] = p.vcol[i * 3 + 2]; }
      else { out[at + 24] = c[0]; out[at + 25] = c[1]; out[at + 26] = c[2]; }
      out[at + 27] = a; at += 28;
    }
    if (p.kind === "mesh"){
      for (var f = 0; f < p.idx.length; f += 3){
        out[faceAt] = 3;
        dv.setInt32(faceAt + 1, p.idx[f] + base, true); dv.setInt32(faceAt + 5, p.idx[f + 1] + base, true); dv.setInt32(faceAt + 9, p.idx[f + 2] + base, true);
        faceAt += 13;
      }
    } else {
      for (var s = 0; s + 1 < p.offsets.length; s++) for (var q = p.offsets[s]; q + 1 < p.offsets[s + 1]; q++){
        dv.setInt32(edgeAt, q + base, true); dv.setInt32(edgeAt + 4, q + 1 + base, true);
        out[edgeAt + 8] = p.vcol[q * 3]; out[edgeAt + 9] = p.vcol[q * 3 + 1]; out[edgeAt + 10] = p.vcol[q * 3 + 2];
        edgeAt += 11;
      }
    }
    base += n;
  });
  return new Blob([out], { type: fmt.mime });
}

/* Wavefront OBJ and its material file, zipped together with a note */
function writeOBJ(scene, fmt){
  var parts = partsFor(scene, fmt), names = uniqueNames(parts);
  var obj = ["# " + (scene.name || "Brain") + "\n# " + (scene.credit || CREDIT) + "\n# millimetres, Y up\nmtllib model.mtl\n"];
  var mtl = ["# materials for " + (scene.name || "Brain") + "\n"];
  var base = 1;
  parts.forEach(function(p, pi){
    var pos = framed(p.pos, fmt), n = pos.length / 3, c = p.colour;
    obj.push("o " + names[pi] + "\nusemtl " + names[pi] + "\n");
    mtl.push("newmtl " + names[pi] + "\nKd " + fmtNum(c[0], 4) + " " + fmtNum(c[1], 4) + " " + fmtNum(c[2], 4) +
             "\nKa 0 0 0\nKs 0.05 0.05 0.05\nNs 10\nd " + fmtNum(p.alpha, 3) + "\nillum 2\n");
    var vs = [];
    for (var i = 0; i < n; i++){
      var line = "v " + fmtNum(pos[i * 3], 3) + " " + fmtNum(pos[i * 3 + 1], 3) + " " + fmtNum(pos[i * 3 + 2], 3);
      if (p.vcol) line += " " + fmtNum(p.vcol[i * 3] / 255, 3) + " " + fmtNum(p.vcol[i * 3 + 1] / 255, 3) + " " + fmtNum(p.vcol[i * 3 + 2] / 255, 3);
      vs.push(line);
    }
    obj.push(vs.join("\n") + "\n");
    if (p.kind === "mesh"){
      var nrm = framedNormals(p.nrm || vertexNormals(p.pos, p.idx), fmt), ns = [], fs = [];
      for (var k = 0; k < n; k++) ns.push("vn " + fmtNum(nrm[k * 3], 4) + " " + fmtNum(nrm[k * 3 + 1], 4) + " " + fmtNum(nrm[k * 3 + 2], 4));
      obj.push(ns.join("\n") + "\n");
      for (var f = 0; f < p.idx.length; f += 3){
        var a = p.idx[f] + base, b = p.idx[f + 1] + base, d = p.idx[f + 2] + base;
        fs.push("f " + a + "//" + a + " " + b + "//" + b + " " + d + "//" + d);
      }
      obj.push(fs.join("\n") + "\n");
    } else {
      var ls = [];
      for (var s = 0; s + 1 < p.offsets.length; s++){
        var seg = ["l"];
        for (var q = p.offsets[s]; q < p.offsets[s + 1]; q++) seg.push(q + base);
        ls.push(seg.join(" "));
      }
      obj.push(ls.join("\n") + "\n");
    }
    base += n;
  });
  var enc = new TextEncoder();
  return zipStore([
    { name: "model.obj", data: enc.encode(obj.join("")) },
    { name: "model.mtl", data: enc.encode(mtl.join("")) },
    { name: "README.txt", data: enc.encode(readme(scene, "Wavefront OBJ, millimetres, Y up. Open model.obj; the colours are in model.mtl beside it.")) }
  ], 0, fmt.mime);
}

function readme(scene, how){
  return (scene.name || "Brain") + "\nExported from VisualNeuroscience.AI\n\n" + how + "\n\n" +
    "Coordinates are MNI152 space. In the file's own frame: x is the subject's right, " +
    "y is up (superior), and -z is anterior, which is MNI (x, y, z) written as (x, z, -y).\n\n" +
    "Data: " + (scene.credit || CREDIT) + "\n" +
    "The regions are the atlas's own labels drawn as closed surfaces; the brain surface is the template at a threshold. " +
    "An educational reference, not a medical device.\n";
}

/* VRML 2.0 */
function writeWRL(scene, fmt){
  var parts = partsFor(scene, fmt), names = uniqueNames(parts);
  var out = ["#VRML V2.0 utf8\n# " + (scene.credit || CREDIT) + "\nWorldInfo { title \"" + (scene.name || "Brain").replace(/"/g, "'") +
             "\" info [ \"VisualNeuroscience.AI\" \"millimetres, Y up, MNI152 space\" ] }\n"];
  parts.forEach(function(p, pi){
    var pos = framed(p.pos, fmt), pts = [];
    for (var i = 0; i < pos.length; i += 3) pts.push(fmtNum(pos[i], 3) + " " + fmtNum(pos[i + 1], 3) + " " + fmtNum(pos[i + 2], 3));
    var c = p.colour;
    out.push("DEF " + names[pi] + " Shape {\n appearance Appearance { material Material { diffuseColor " +
             fmtNum(c[0], 4) + " " + fmtNum(c[1], 4) + " " + fmtNum(c[2], 4) + " transparency " + fmtNum(1 - p.alpha, 3) + " } }\n");
    var cols = null;
    if (p.vcol){
      cols = [];
      for (var k = 0; k < p.vcol.length; k += 3) cols.push(fmtNum(p.vcol[k] / 255, 3) + " " + fmtNum(p.vcol[k + 1] / 255, 3) + " " + fmtNum(p.vcol[k + 2] / 255, 3));
    }
    if (p.kind === "mesh"){
      var ci = [];
      for (var f = 0; f < p.idx.length; f += 3) ci.push(p.idx[f] + " " + p.idx[f + 1] + " " + p.idx[f + 2] + " -1");
      out.push(" geometry IndexedFaceSet {\n  solid FALSE creaseAngle 1.2\n  coord Coordinate { point [ " + pts.join(", ") + " ] }\n" +
               "  coordIndex [ " + ci.join(", ") + " ]\n" +
               (cols ? "  color Color { color [ " + cols.join(", ") + " ] }\n  colorPerVertex TRUE\n" : "") + " }\n}\n");
    } else {
      var li = [];
      for (var s = 0; s + 1 < p.offsets.length; s++){
        var seg = [];
        for (var q = p.offsets[s]; q < p.offsets[s + 1]; q++) seg.push(q);
        li.push(seg.join(" ") + " -1");
      }
      out.push(" geometry IndexedLineSet {\n  coord Coordinate { point [ " + pts.join(", ") + " ] }\n  coordIndex [ " + li.join(", ") + " ]\n" +
               "  color Color { color [ " + cols.join(", ") + " ] }\n  colorPerVertex TRUE\n }\n}\n");
    }
  });
  return new Blob([out.join("")], { type: fmt.mime });
}

/* X3D */
function writeX3D(scene, fmt){
  var parts = partsFor(scene, fmt), names = uniqueNames(parts);
  function esc(s){ return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;"); }
  var out = ['<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE X3D PUBLIC "ISO//Web3D//DTD X3D 3.3//EN" "https://www.web3d.org/specifications/x3d-3.3.dtd">\n' +
             '<X3D profile="Immersive" version="3.3" xmlns:xsd="http://www.w3.org/2001/XMLSchema-instance" xsd:noNamespaceSchemaLocation="https://www.web3d.org/specifications/x3d-3.3.xsd">\n' +
             '<head>\n <meta name="title" content="' + esc(scene.name || "Brain") + '"/>\n <meta name="generator" content="VisualNeuroscience.AI"/>\n' +
             ' <meta name="rights" content="' + esc(scene.credit || CREDIT) + '"/>\n <meta name="description" content="MNI152 space, millimetres, Y up"/>\n</head>\n<Scene>\n<Group DEF="' + safeName(scene.name || "Brain") + '">\n'];
  parts.forEach(function(p, pi){
    var pos = framed(p.pos, fmt), pts = [];
    for (var i = 0; i < pos.length; i += 3) pts.push(fmtNum(pos[i], 3) + " " + fmtNum(pos[i + 1], 3) + " " + fmtNum(pos[i + 2], 3));
    var c = p.colour, cols = null;
    if (p.vcol){
      cols = [];
      for (var k = 0; k < p.vcol.length; k += 3) cols.push(fmtNum(p.vcol[k] / 255, 3) + " " + fmtNum(p.vcol[k + 1] / 255, 3) + " " + fmtNum(p.vcol[k + 2] / 255, 3));
    }
    out.push('<Shape DEF="' + names[pi] + '">\n <Appearance><Material diffuseColor="' + fmtNum(c[0], 4) + " " + fmtNum(c[1], 4) + " " + fmtNum(c[2], 4) +
             '" transparency="' + fmtNum(1 - p.alpha, 3) + '"/></Appearance>\n');
    if (p.kind === "mesh"){
      var ci = [];
      for (var f = 0; f < p.idx.length; f += 3) ci.push(p.idx[f] + " " + p.idx[f + 1] + " " + p.idx[f + 2] + " -1");
      out.push(' <IndexedFaceSet solid="false" creaseAngle="1.2"' + (cols ? ' colorPerVertex="true"' : "") + ' coordIndex="' + ci.join(" ") + '">\n' +
               '  <Coordinate point="' + pts.join(", ") + '"/>\n' + (cols ? '  <Color color="' + cols.join(", ") + '"/>\n' : "") + " </IndexedFaceSet>\n</Shape>\n");
    } else {
      var li = [];
      for (var s = 0; s + 1 < p.offsets.length; s++){
        var seg = [];
        for (var q = p.offsets[s]; q < p.offsets[s + 1]; q++) seg.push(q);
        li.push(seg.join(" ") + " -1");
      }
      out.push(' <IndexedLineSet colorPerVertex="true" coordIndex="' + li.join(" ") + '">\n  <Coordinate point="' + pts.join(", ") + '"/>\n' +
               '  <Color color="' + cols.join(", ") + '"/>\n </IndexedLineSet>\n</Shape>\n');
    }
  });
  out.push("</Group>\n</Scene>\n</X3D>\n");
  return new Blob([out.join("")], { type: fmt.mime });
}

/* USDZ: a usda layer in a zip whose file data sits on 64-byte boundaries,
   which is what the package format requires. UsdPreviewSurface materials,
   with vertex colours read through a primvar where a part has them. */
function writeUSDZ(scene, fmt){
  var parts = partsFor(scene, fmt), names = uniqueNames(parts);
  var root = safeName(scene.name || "Brain");
  var out = ['#usda 1.0\n(\n    defaultPrim = "' + root + '"\n    metersPerUnit = 0.001\n    upAxis = "Y"\n    doc = "' +
             (scene.credit || CREDIT).replace(/"/g, "'") + '"\n)\n\ndef Xform "' + root + '" (\n    kind = "component"\n)\n{\n'];
  out.push('    def Scope "Materials"\n    {\n');
  parts.forEach(function(p, pi){
    var c = p.colour;
    out.push('        def Material "M_' + names[pi] + '"\n        {\n            token outputs:surface.connect = </' + root + '/Materials/M_' + names[pi] + '/PBR.outputs:surface>\n' +
             '            def Shader "PBR"\n            {\n                uniform token info:id = "UsdPreviewSurface"\n');
    if (p.vcol) out.push('                color3f inputs:diffuseColor.connect = </' + root + '/Materials/M_' + names[pi] + '/Colour.outputs:result>\n');
    else out.push('                color3f inputs:diffuseColor = (' + fmtNum(c[0], 4) + ", " + fmtNum(c[1], 4) + ", " + fmtNum(c[2], 4) + ")\n");
    out.push('                float inputs:opacity = ' + fmtNum(p.alpha, 3) + '\n                float inputs:roughness = 0.6\n                float inputs:metallic = 0\n                token outputs:surface\n            }\n');
    if (p.vcol) out.push('            def Shader "Colour"\n            {\n                uniform token info:id = "UsdPrimvarReader_float3"\n                string inputs:varname = "displayColor"\n                float3 outputs:result\n            }\n');
    out.push("        }\n");
  });
  out.push("    }\n");
  parts.forEach(function(p, pi){
    var pos = framed(p.pos, fmt), pts = [], mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (var i = 0; i < pos.length; i += 3){
      pts.push("(" + fmtNum(pos[i], 3) + ", " + fmtNum(pos[i + 1], 3) + ", " + fmtNum(pos[i + 2], 3) + ")");
      for (var k = 0; k < 3; k++){ if (pos[i + k] < mn[k]) mn[k] = pos[i + k]; if (pos[i + k] > mx[k]) mx[k] = pos[i + k]; }
    }
    var counts = [], idx = [];
    for (var f = 0; f < p.idx.length; f += 3){ counts.push(3); idx.push(p.idx[f], p.idx[f + 1], p.idx[f + 2]); }
    var nrm = framedNormals(p.nrm || vertexNormals(p.pos, p.idx), fmt), ns = [];
    for (var n = 0; n < nrm.length; n += 3) ns.push("(" + fmtNum(nrm[n], 4) + ", " + fmtNum(nrm[n + 1], 4) + ", " + fmtNum(nrm[n + 2], 4) + ")");
    var c = p.colour, cols;
    if (p.vcol){
      cols = [];
      for (var v = 0; v < p.vcol.length; v += 3) cols.push("(" + fmtNum(p.vcol[v] / 255, 3) + ", " + fmtNum(p.vcol[v + 1] / 255, 3) + ", " + fmtNum(p.vcol[v + 2] / 255, 3) + ")");
    }
    out.push('    def Mesh "' + names[pi] + '" (\n        prepend apiSchemas = ["MaterialBindingAPI"]\n    )\n    {\n' +
             '        uniform token subdivisionScheme = "none"\n        uniform bool doubleSided = 1\n' +
             '        float3[] extent = [(' + mn.map(function(x){ return fmtNum(x, 3); }).join(", ") + "), (" + mx.map(function(x){ return fmtNum(x, 3); }).join(", ") + ")]\n" +
             "        int[] faceVertexCounts = [" + counts.join(", ") + "]\n" +
             "        int[] faceVertexIndices = [" + idx.join(", ") + "]\n" +
             "        point3f[] points = [" + pts.join(", ") + "]\n" +
             "        normal3f[] normals = [" + ns.join(", ") + "] (\n            interpolation = \"vertex\"\n        )\n" +
             (cols ? "        color3f[] primvars:displayColor = [" + cols.join(", ") + "] (\n            interpolation = \"vertex\"\n        )\n"
                   : "        color3f[] primvars:displayColor = [(" + fmtNum(c[0], 4) + ", " + fmtNum(c[1], 4) + ", " + fmtNum(c[2], 4) + ")]\n") +
             "        rel material:binding = </" + root + "/Materials/M_" + names[pi] + ">\n    }\n");
  });
  out.push("}\n");
  return zipStore([{ name: "model.usda", data: new TextEncoder().encode(out.join("")) }], 64, fmt.mime);
}

/* ── a stored zip, optionally with each file's data aligned ─────────────── */
var CRC_TABLE = (function(){
  var t = new Uint32Array(256);
  for (var n = 0; n < 256; n++){ var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
  return t;
})();
function crc32(u8){
  var c = 0xFFFFFFFF;
  for (var i = 0; i < u8.length; i++) c = CRC_TABLE[(c ^ u8[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function zipStore(entries, align, mime){
  var enc = new TextEncoder(), locals = [], centrals = [], offset = 0;
  entries.forEach(function(e){
    var name = enc.encode(e.name), crc = crc32(e.data);
    var extraLen = 0;
    if (align){
      var dataAt = offset + 30 + name.length;
      extraLen = (align - (dataAt % align)) % align;
      if (extraLen > 0 && extraLen < 4) extraLen += align;
    }
    var lh = new Uint8Array(30 + name.length + extraLen), dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0, true); dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true); dv.setUint16(12, 0x21, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, e.data.length, true); dv.setUint32(22, e.data.length, true);
    dv.setUint16(26, name.length, true); dv.setUint16(28, extraLen, true);
    lh.set(name, 30);
    if (extraLen){ dv.setUint16(30 + name.length, 0x1986, true); dv.setUint16(32 + name.length, extraLen - 4, true); }
    var ch = new Uint8Array(46 + name.length), cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0, true); cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true); cv.setUint16(14, 0x21, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, e.data.length, true); cv.setUint32(24, e.data.length, true);
    cv.setUint16(28, name.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true); cv.setUint16(34, 0, true); cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true); cv.setUint32(42, offset, true);
    ch.set(name, 46);
    locals.push(lh, e.data); centrals.push(ch);
    offset += lh.length + e.data.length;
  });
  var cdSize = 0; centrals.forEach(function(c){ cdSize += c.length; });
  var end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
  ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true); ev.setUint16(20, 0, true);
  return new Blob(locals.concat(centrals, [end]), { type: mime || "application/zip" });
}

var WRITERS = { glb: writeGLB, usdz: writeUSDZ, obj: writeOBJ, stl: writeSTL, ply: writePLY, wrl: writeWRL, x3d: writeX3D };

function write(fmtId, scene){
  var fmt = BY_ID[fmtId];
  if (!fmt) throw new Error("Unknown format " + fmtId);
  var parts = (scene.parts || []).filter(Boolean);
  if (!parts.length) throw new Error("There is nothing to export yet.");
  return WRITERS[fmtId]({ name: scene.name, credit: scene.credit, parts: parts, tubeRadius: scene.tubeRadius }, fmt);
}

function fileName(base, fmtId){
  var f = BY_ID[fmtId];
  return String(base || "brain").replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() + "." + f.ext;
}

function saveBlob(blob, name){
  if (window.MN && MN.saveFile) return MN.saveFile(blob, name);
  var u = URL.createObjectURL(blob);
  var a = document.createElement("a"); a.href = u; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ a.remove(); URL.revokeObjectURL(u); }, 1000);
  return Promise.resolve();
}

function save(fmtId, scene, basename){
  var blob = write(fmtId, scene), name = fileName(basename, fmtId);
  return saveBlob(blob, name).then(function(){ return { name: name, bytes: blob.size }; });
}

function human(bytes){
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

/* ── the controls a page drops into its rail ──────────────────────────────
   attach({ host, build, basename, options, formats, label })

     host      element to fill
     build     async ({fmt, options}) → scene {name, parts, credit}
     basename  string or function → the file name without extension
     options   [{id, label, checked}] checkboxes handed to build
     formats   ids to offer, default all
     label     button text, default "Export 3D model" */
var PREF_KEY = "vn-x3d-format";
function attach(o){
  var host = o.host; if (!host) return null;
  var wrap = document.createElement("div"); wrap.className = "x3d";
  var selWrap = document.createElement("div"); selWrap.className = "selwrap";
  var sel = document.createElement("select"); sel.setAttribute("aria-label", "3D file format");
  var ids = o.formats || FORMATS.map(function(f){ return f.id; });
  ids.forEach(function(id){
    var f = BY_ID[id]; if (!f) return;
    var opt = document.createElement("option"); opt.value = f.id; opt.textContent = f.label; sel.appendChild(opt);
  });
  try{ var pref = localStorage.getItem(PREF_KEY); if (pref && ids.indexOf(pref) >= 0) sel.value = pref; }catch(e){}
  selWrap.appendChild(sel); wrap.appendChild(selWrap);

  var checks = {};
  if (o.options && o.options.length){
    var tog = document.createElement("div"); tog.className = "toggles"; tog.style.gridTemplateColumns = "1fr";
    o.options.forEach(function(op){
      var lab = document.createElement("label"); lab.className = "toggle";
      var cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!op.checked;
      lab.appendChild(cb); lab.appendChild(document.createTextNode(" " + op.label));
      tog.appendChild(lab); checks[op.id] = cb;
    });
    wrap.appendChild(tog);
  }

  var btns = document.createElement("div"); btns.className = "btns";
  var btn = document.createElement("button"); btn.type = "button"; btn.className = "btn"; btn.textContent = o.label || "Export 3D model";
  btns.appendChild(btn); wrap.appendChild(btns);

  var note = document.createElement("p"); note.className = "x3d-note"; wrap.appendChild(note);
  var status = document.createElement("p"); status.className = "x3d-status"; status.setAttribute("aria-live", "polite"); wrap.appendChild(status);
  host.appendChild(wrap);

  function showNote(){ var f = BY_ID[sel.value]; note.textContent = f ? f.note : ""; }
  sel.addEventListener("change", function(){ showNote(); try{ localStorage.setItem(PREF_KEY, sel.value); }catch(e){} });
  showNote();

  var busy = false;
  btn.addEventListener("click", function(){
    if (busy) return;
    busy = true; btn.disabled = true; status.classList.remove("err");
    status.textContent = "Building the model…";
    var fmt = sel.value, opts = {};
    Object.keys(checks).forEach(function(k){ opts[k] = checks[k].checked; });
    var base = typeof o.basename === "function" ? o.basename(opts) : o.basename;
    /* let the status paint before the geometry work starts */
    setTimeout(function(){
      Promise.resolve().then(function(){ return o.build({ fmt: fmt, options: opts, format: BY_ID[fmt] }); })
        .then(function(scene){
          if (!scene) throw new Error("There is nothing to export yet.");
          status.textContent = "Writing the file…";
          return save(fmt, scene, base);
        })
        .then(function(r){
          if (window.MN) MN.tap("light");
          status.textContent = "Saved " + r.name + " (" + human(r.bytes) + ").";
        })
        .catch(function(err){
          console.error(err);
          status.classList.add("err");
          status.textContent = (err && err.message) || "The export failed.";
        })
        .then(function(){ busy = false; btn.disabled = false; });
    }, 30);
  });

  return { element: wrap, select: sel, button: btn, status: status };
}

return {
  FORMATS: FORMATS, CREDIT: CREDIT,
  volume: volume, volumes: volumes, labelBoxes: labelBoxes, labelCentroid: labelCentroid,
  labelSurface: labelSurface, isoSurface: isoSurface, brainSurface: brainSurface, autoThreshold: autoThreshold,
  sphere: sphere, tube: tube, merge: merge, lines: lines, sampleLines: sampleLines, linesToTubes: linesToTubes,
  hexColour: hexColour,
  write: write, save: save, fileName: fileName, attach: attach,
  _surfaceNets: surfaceNets, _zip: zipStore
};
})();
