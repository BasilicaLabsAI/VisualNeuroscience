(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  function fail(msg) { var f = $('#fail'); f.querySelector('p').textContent = msg; f.hidden = false; }
  if (!window.THREE) { fail('The 3D view needs the three.js library, which did not load. Check your connection, then reload the page.'); return; }
  var D = JSON.parse($('#d2data').textContent);
  var canvas = $('#gl');
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' }); }
  catch (e) { fail('This browser could not start WebGL, which the 3D view needs. Turn on hardware acceleration or try another browser.'); return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  var rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
  var RM = rmq.matches;
  if (rmq.addEventListener) rmq.addEventListener('change', function (e) { RM = e.matches; });
  var coarse = window.matchMedia('(pointer: coarse)').matches;

  // ------------------------------------------------------------------ helpers
  var AA3 = { A: 'Ala', R: 'Arg', N: 'Asn', D: 'Asp', C: 'Cys', Q: 'Gln', E: 'Glu', G: 'Gly', H: 'His', I: 'Ile', L: 'Leu', K: 'Lys', M: 'Met', F: 'Phe', P: 'Pro', S: 'Ser', T: 'Thr', W: 'Trp', Y: 'Tyr', V: 'Val' };
  var SEGNAME = { TM1: 'Transmembrane helix 1', TM2: 'Transmembrane helix 2', TM3: 'Transmembrane helix 3', TM4: 'Transmembrane helix 4', TM5: 'Transmembrane helix 5', TM6: 'Transmembrane helix 6', TM7: 'Transmembrane helix 7', H8: 'Helix 8' };
  var LOOPN = { TM1: 'Intracellular loop 1', TM2: 'Extracellular loop 1', TM3: 'Intracellular loop 2', TM4: 'Extracellular loop 2', TM5: 'Intracellular loop 3', TM6: 'Extracellular loop 3', TM7: 'Helix 8 linker' };
  var LOOPK = { TM1: 'ICL1', TM2: 'ECL1', TM3: 'ICL2', TM4: 'ECL2', TM5: 'ICL3', TM6: 'ECL3' };
  function segOfS(seg, r) { for (var k in seg) { var g = seg[k]; if (r >= g[0] && r <= g[2]) return k; } return ''; }
  function bwS(seg, r) { var k = segOfS(seg, r); return /^TM/.test(k) ? k.charAt(2) + '.' + (50 + r - seg[k][1]) : ''; }
  function segNameS(seg, r) {
    var k = segOfS(seg, r); if (k) return SEGNAME[k];
    if (r < seg.TM1[0]) return 'N-terminus'; if (r > seg.H8[2]) return 'C-terminus';
    for (var i = 1; i <= 7; i++) { var e = seg['TM' + i][2], b = i < 7 ? seg['TM' + (i + 1)][0] : seg.H8[0]; if (r > e && r < b) return LOOPN['TM' + i]; }
    return '';
  }
  function listJoin(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function F32(a) { return Float32Array.from(a); }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function sm(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  var seed = 12345; function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  // ------------------------------------------------------------------ colours and theme
  var SEGCOL = { TM1: '#6C8EBF', TM2: '#55A7A0', TM3: '#86AF63', TM4: '#C8B24F', TM5: '#D99B55', TM6: '#C8677A', TM7: '#9474B8', H8: '#7D8DA6' };
  var LOOPCOL = '#B3ADA2';
  var ELCOL = { N: '#3F64C9', O: '#D2443C', S: '#D8B32B', F: '#56B26A', Br: '#A34A2C', Cl: '#3FA34D' };
  var GCOL = { Go: '#8DB9B1', Gi: '#9DB0BE', Gs: '#D6B98E', Gq: '#C9A0A8', a5: '#4F86A3', B: '#B9AE9F', C: '#C2AFCB' };
  var TH = {};
  function readTheme() {
    var cs = getComputedStyle(document.documentElement);
    ['c-extra', 'c-cyto', 'c-head', 'c-tail', 'ghost', 'insert', 'mod', 'ligc', 'accent', 'inact', 'act', 'da', 'hb'].forEach(function (k) { TH[k] = cs.getPropertyValue('--' + k).trim() || '#888888'; });
  }
  readTheme();
  var tc = new THREE.Color();

  // ------------------------------------------------------------------ scene
  var scene = new THREE.Scene();
  var FOV = 32;
  var camera = new THREE.PerspectiveCamera(FOV, 1, 1, 5000);
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x958fa3, 0.62));
  var key = new THREE.DirectionalLight(0xffffff, 0.8); camera.add(key); key.position.set(-0.55, 0.85, 0.4); camera.add(key.target); key.target.position.set(0, 0, -1);
  var fill = new THREE.DirectionalLight(0xffffff, 0.22); camera.add(fill); fill.position.set(0.7, -0.35, 0.2); camera.add(fill.target); fill.target.position.set(0, 0, -1);
  var bgU = { cTop: { value: new THREE.Color() }, cBot: { value: new THREE.Color() }, split: { value: 0 } };
  var bg = new THREE.Mesh(new THREE.SphereGeometry(2000, 32, 16), new THREE.ShaderMaterial({
    uniforms: bgU, side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vDir; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vDir = wp.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: 'uniform vec3 cTop; uniform vec3 cBot; uniform float split; varying vec3 vDir; void main(){ vec3 d = normalize(vDir); float s = smoothstep(split - 0.01, split + 0.01, d.y); vec3 c = mix(cBot, cTop, s); float h = 1.0 - smoothstep(0.0, 0.75, abs(d.y)); c += h * 0.03; gl_FragColor = vec4(c, 1.0); }'
  }));
  bg.renderOrder = -10; bg.frustumCulled = false; scene.add(bg);
  var U = { morph: { value: 0 }, modCol: { value: new THREE.Color() } };

  // ------------------------------------------------------------------ labels layer
  var labLayer = $('#labels');
  function mkLab(kind, html) { var el = document.createElement('div'); el.className = 'lab ' + kind; el.innerHTML = html; labLayer.appendChild(el); el._v = false; return el; }

  // ------------------------------------------------------------------ ribbon builder
  var HEL = [1.32, 0.3], STR = [1.05, 0.3], COIL = [0.34, 0.34];
  function shape(ch) { return ch === 'H' ? HEL : ch === 'E' ? STR : COIL; }
  function crEval(P, n, i, f, out) {
    var f2 = f * f, f3 = f2 * f;
    for (var c = 0; c < 3; c++) {
      var p0 = i - 1 < 0 ? 2 * P[c] - P[3 + c] : P[(i - 1) * 3 + c];
      var p1 = P[i * 3 + c], p2 = P[(i + 1) * 3 + c];
      var p3 = i + 2 > n - 1 ? 2 * P[(n - 1) * 3 + c] - P[(n - 2) * 3 + c] : P[(i + 2) * 3 + c];
      var A = -p0 + 3 * p1 - 3 * p2 + p3, B = 2 * p0 - 5 * p1 + 4 * p2 - p3, C = -p0 + p2;
      out.p[c] = 0.5 * (2 * p1 + C * f + B * f2 + A * f3);
      out.d[c] = 0.5 * (C + 2 * B * f + 3 * A * f2);
    }
  }
  function buildRibbonData(runs, nStates, S, nA) {
    var nV = 0, nI = 0;
    runs.forEach(function (run) { run.R = (run.n - 1) * S + 1; run.v0 = nV; nV += run.R * nA + 2 * (nA + 1); nI += (run.R - 1) * nA * 6 + nA * 6; });
    var pos = [], nrm = [], mod = [];
    for (var s = 0; s < nStates; s++) { pos.push(new Float32Array(nV * 3)); nrm.push(new Float32Array(nV * 3)); mod.push(new Float32Array(nV)); }
    var col = new Float32Array(nV * 3), index = new Uint32Array(nI);
    var cr = { p: [0, 0, 0], d: [0, 0, 0] };
    var T = new THREE.Vector3(), Sv = new THREE.Vector3(), N = new THREE.Vector3(), prev = new THREE.Vector3();
    var ii = 0;
    runs.forEach(function (run) {
      var n = run.n, R = run.R, v0 = run.v0, ringRes = new Int16Array(R), sv0 = new Float32Array(R * 3);
      for (var k = 0; k < R; k++) ringRes[k] = Math.min(n - 1, Math.round(k / S));
      for (var s = 0; s < nStates; s++) {
        var st = run.states[s], P = st.ca, SD = st.side, pp = pos[s], nn = nrm[s], mm = mod[s];
        var havePrev = false, ends = [];
        for (var k = 0; k < R; k++) {
          var u = k / S, i = Math.min(Math.floor(u), n - 2), f = u - i;
          crEval(P, n, i, f, cr);
          T.set(cr.d[0], cr.d[1], cr.d[2]).normalize();
          Sv.set(SD[i * 3] * (1 - f) + SD[i * 3 + 3] * f, SD[i * 3 + 1] * (1 - f) + SD[i * 3 + 4] * f, SD[i * 3 + 2] * (1 - f) + SD[i * 3 + 5] * f);
          Sv.addScaledVector(T, -Sv.dot(T));
          if (Sv.lengthSq() < 1e-6) { if (havePrev) Sv.copy(prev); else Sv.set(T.y + 0.1, -T.x, 0.3); Sv.addScaledVector(T, -Sv.dot(T)); }
          Sv.normalize();
          if (s === 0) { if (havePrev && Sv.dot(prev) < 0) Sv.negate(); sv0[k * 3] = Sv.x; sv0[k * 3 + 1] = Sv.y; sv0[k * 3 + 2] = Sv.z; }
          else if (Sv.x * sv0[k * 3] + Sv.y * sv0[k * 3 + 1] + Sv.z * sv0[k * 3 + 2] < 0) Sv.negate();
          prev.copy(Sv); havePrev = true;
          N.crossVectors(T, Sv).normalize();
          var s0 = shape(st.ss[i]), s1 = shape(st.ss[i + 1]), g = f * f * (3 - 2 * f);
          var hw = s0[0] + (s1[0] - s0[0]) * g, ht = s0[1] + (s1[1] - s0[1]) * g;
          var mflag = st.mod && st.mod.charAt(ringRes[k]) === '1' ? 1 : 0;
          for (var j = 0; j < nA; j++) {
            var a = (j / nA) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), v = v0 + k * nA + j, o = v * 3;
            pp[o] = cr.p[0] + Sv.x * hw * ca + N.x * ht * sa;
            pp[o + 1] = cr.p[1] + Sv.y * hw * ca + N.y * ht * sa;
            pp[o + 2] = cr.p[2] + Sv.z * hw * ca + N.z * ht * sa;
            var nx = Sv.x * ca / hw + N.x * sa / ht, ny = Sv.y * ca / hw + N.y * sa / ht, nz = Sv.z * ca / hw + N.z * sa / ht;
            var L = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
            nn[o] = nx / L; nn[o + 1] = ny / L; nn[o + 2] = nz / L; mm[v] = mflag;
          }
          if (k === 0 || k === R - 1) ends.push([cr.p[0], cr.p[1], cr.p[2], T.x, T.y, T.z]);
        }
        var capBase = v0 + R * nA;
        for (var e = 0; e < 2; e++) {
          var E = ends[e], sg = e === 0 ? -1 : 1, rk = e === 0 ? 0 : R - 1, cb = capBase + e * (nA + 1);
          var mf = st.mod && st.mod.charAt(e === 0 ? 0 : n - 1) === '1' ? 1 : 0;
          pp[cb * 3] = E[0]; pp[cb * 3 + 1] = E[1]; pp[cb * 3 + 2] = E[2];
          nn[cb * 3] = E[3] * sg; nn[cb * 3 + 1] = E[4] * sg; nn[cb * 3 + 2] = E[5] * sg; mm[cb] = mf;
          for (var j = 0; j < nA; j++) {
            var src = (v0 + rk * nA + j) * 3, dst = (cb + 1 + j) * 3;
            pp[dst] = pp[src]; pp[dst + 1] = pp[src + 1]; pp[dst + 2] = pp[src + 2];
            nn[dst] = E[3] * sg; nn[dst + 1] = E[4] * sg; nn[dst + 2] = E[5] * sg; mm[cb + 1 + j] = mf;
          }
        }
      }
      function paint(v, ri) { tc.set(run.colorAt(ri)); col[v * 3] = tc.r; col[v * 3 + 1] = tc.g; col[v * 3 + 2] = tc.b; }
      for (var k = 0; k < R; k++) for (var j = 0; j < nA; j++) paint(v0 + k * nA + j, ringRes[k]);
      var capBase = v0 + R * nA;
      for (var j = 0; j <= nA; j++) { paint(capBase + j, 0); paint(capBase + nA + 1 + j, n - 1); }
      for (var k = 0; k < R - 1; k++) for (var j = 0; j < nA; j++) {
        var a = v0 + k * nA + j, b = v0 + k * nA + (j + 1) % nA, c = a + nA, d = b + nA;
        index[ii++] = a; index[ii++] = b; index[ii++] = c; index[ii++] = b; index[ii++] = d; index[ii++] = c;
      }
      for (var e = 0; e < 2; e++) {
        var cb = capBase + e * (nA + 1);
        for (var j = 0; j < nA; j++) {
          var r0 = cb + 1 + j, r1 = cb + 1 + (j + 1) % nA;
          if (e === 0) { index[ii++] = cb; index[ii++] = r1; index[ii++] = r0; } else { index[ii++] = cb; index[ii++] = r0; index[ii++] = r1; }
        }
      }
    });
    return { pos: pos, nrm: nrm, mod: mod, col: col, index: index, nV: nV };
  }
  function ribbonGeometry(RB, morph) {
    var g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(RB.pos[0].slice(), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(RB.nrm[0].slice(), 3));
    g.setAttribute('color', new THREE.BufferAttribute(RB.col, 3));
    if (morph) {
      var am = new Float32Array(RB.nV * 2);
      for (var v = 0; v < RB.nV; v++) { am[2 * v] = RB.mod[0][v]; am[2 * v + 1] = RB.mod[0][v]; }
      g.setAttribute('aMod', new THREE.BufferAttribute(am, 2));
      g.morphAttributes.position = [new THREE.BufferAttribute(RB.pos[0].slice(), 3)];
      g.morphAttributes.normal = [new THREE.BufferAttribute(RB.nrm[0].slice(), 3)];
    }
    g.setIndex(new THREE.BufferAttribute(RB.index, 1));
    return g;
  }

  // ------------------------------------------------------------------ instancing helpers
  var sphGeo = new THREE.SphereGeometry(1, 14, 10), cylGeo = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  var M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), V1 = new THREE.Vector3(), V2 = new THREE.Vector3(), VS = new THREE.Vector3(), UPY = new THREE.Vector3(0, 1, 0);
  var ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function inst(geo, mat, n) { var m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); for (var i = 0; i < m.count; i++) m.setMatrixAt(i, ZERO); return m; }
  function setSph(m, i, x, y, z, r) { if (r <= 1e-4) { m.setMatrixAt(i, ZERO); return; } M4.makeScale(r, r, r); M4.setPosition(x, y, z); m.setMatrixAt(i, M4); }
  function setCyl(m, i, ax, ay, az, bx, by, bz, r) {
    V1.set(bx - ax, by - ay, bz - az); var L = V1.length();
    if (L < 1e-4 || r <= 1e-4) { m.setMatrixAt(i, ZERO); return; }
    V1.multiplyScalar(1 / L); Q.setFromUnitVectors(UPY, V1); VS.set(r, L, r); V2.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    M4.compose(V2, Q, VS); m.setMatrixAt(i, M4);
  }
  function makeLigMesh(L, name, see, parent) {
    var n = L.el.length, P = F32(L.xyz);
    var mat = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0, transparent: !!see, opacity: see ? 0.45 : 1, depthWrite: !see, depthTest: !see });
    var lg = { name: name, L: L, P: P, cur: P.slice(), n: n, mat: mat, atoms: inst(sphGeo, mat, n), bonds: inst(cylGeo, mat, L.bonds.length * 2), s: -1, cen: [0, 0, 0] };
    for (var k = 0; k < n; k++) for (var c = 0; c < 3; c++) lg.cen[c] += P[k * 3 + c] / n;
    if (see) { lg.atoms.renderOrder = 6; lg.bonds.renderOrder = 6; }
    parent.add(lg.atoms); parent.add(lg.bonds); return lg;
  }
  function ligCol(lg, k) { var e = lg.L.el[k]; if (e === 'C') return tc.set(lg.mono ? TH.da : TH.ligc); return tc.set(ELCOL[e] || '#999999'); }
  function recolorLig(lg) {
    for (var k = 0; k < lg.n; k++) lg.atoms.setColorAt(k, ligCol(lg, k));
    lg.L.bonds.forEach(function (b, q) { lg.bonds.setColorAt(2 * q, ligCol(lg, b[0])); lg.bonds.setColorAt(2 * q + 1, ligCol(lg, b[1])); });
    lg.atoms.instanceColor.needsUpdate = true; lg.bonds.instanceColor.needsUpdate = true;
  }
  function drawLig(lg, s, moved) {
    if (!moved && Math.abs(s - lg.s) < 1e-4) return;
    if (s < 1e-4 && lg.s < 1e-4 && lg.s >= 0) { lg.s = s; return; }
    lg.s = s; var P = lg.cur;
    for (var k = 0; k < lg.n; k++) setSph(lg.atoms, k, P[k * 3], P[k * 3 + 1], P[k * 3 + 2], (lg.L.el[k] === 'Br' ? 0.72 : lg.L.el[k] === 'S' || lg.L.el[k] === 'Cl' ? 0.6 : 0.5) * s);
    lg.L.bonds.forEach(function (b, q) {
      var i = b[0] * 3, j = b[1] * 3, mx = (P[i] + P[j]) / 2, my = (P[i + 1] + P[j + 1]) / 2, mz = (P[i + 2] + P[j + 2]) / 2;
      setCyl(lg.bonds, 2 * q, P[i], P[i + 1], P[i + 2], mx, my, mz, 0.22 * s); setCyl(lg.bonds, 2 * q + 1, mx, my, mz, P[j], P[j + 1], P[j + 2], 0.22 * s);
    });
    lg.atoms.instanceMatrix.needsUpdate = true; lg.bonds.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------------ membrane (shared), halo, contact dashes, route dots
  var memGroup = new THREE.Group(); scene.add(memGroup);
  var LH = F32(D.lipids.heads), nH = LH.length / 3;
  var headMat = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  var heads = inst(new THREE.SphereGeometry(1, 10, 8), headMat, nH), headS = new Float32Array(nH);
  memGroup.add(heads);
  var cutU = { uCam: { value: new THREE.Vector3() }, uDir: { value: new THREE.Vector3() }, uTT: { value: 0 }, uR: { value: 0 } };
  var LT = D.lipids.tails, TL = D.lipids.tailLen, nT = LT.length / (3 * TL), segs = new Float32Array(nT * (TL - 1) * 6), si0 = 0;
  for (var t0 = 0; t0 < nT; t0++) for (var q1 = 0; q1 < TL - 1; q1++) { var b1 = (t0 * TL + q1) * 3; for (var c1 = 0; c1 < 6; c1++) segs[si0++] = LT[b1 + c1]; }
  var tailGeo = new THREE.BufferGeometry(); tailGeo.setAttribute('position', new THREE.BufferAttribute(segs, 3));
  var tailMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.42 });
  tailMat.onBeforeCompile = function (sh) {
    Object.assign(sh.uniforms, cutU);
    sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform vec3 uCam; uniform vec3 uDir; uniform float uTT; uniform float uR; varying vec3 vWP;\n' + sh.fragmentShader.replace('void main() {', 'void main() {\n  vec3 cv = vWP - uCam; float ct = dot(cv, uDir); if (ct < uTT && length(cv - ct * uDir) < uR - 1.0) discard;');
  };
  memGroup.add(new THREE.LineSegments(tailGeo, tailMat));
  var halo = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.28, depthWrite: false }));
  halo.visible = false; halo.renderOrder = 5; scene.add(halo);
  var hbMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  var HBN = 90, hbMesh = inst(cylGeo, hbMat, HBN); scene.add(hbMesh);
  var hbSig = '';
  function drawDashes(segs) {
    var sig = segs.map(function (s) { return s.map(function (v) { return v.toFixed(2); }).join(','); }).join(';');
    if (sig === hbSig) return; hbSig = sig;
    var k = 0;
    segs.forEach(function (s) {
      var dx = s[3] - s[0], dy = s[4] - s[1], dz = s[5] - s[2], len = Math.sqrt(dx * dx + dy * dy + dz * dz), nd = Math.max(3, Math.round(len / 0.5));
      for (var i = 0; i < nd && k < HBN; i++) { var t0 = (i + 0.22) / nd, t1 = (i + 0.72) / nd; setCyl(hbMesh, k++, s[0] + dx * t0, s[1] + dy * t0, s[2] + dz * t0, s[0] + dx * t1, s[1] + dy * t1, s[2] + dz * t1, 0.14); }
    });
    for (; k < HBN; k++) hbMesh.setMatrixAt(k, ZERO);
    hbMesh.instanceMatrix.needsUpdate = true;
  }
  var pathMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false });
  var PATHN = 18, pathMesh = inst(sphGeo, pathMat, PATHN); pathMesh.renderOrder = 7; scene.add(pathMesh);
  var pathKey = '';
  function drawPath(M, show) {
    var k = show ? M.key + ':' + M.DU.toFixed(4) : 'off'; if (k === pathKey) return; pathKey = k;
    for (var i = 0; i < PATHN; i++) {
      if (!show) { pathMesh.setMatrixAt(i, ZERO); continue; }
      var u = M.DU + (1 - M.DU) * (i + 1) / (PATHN + 1), p = M.ligAt(u);
      setSph(pathMesh, i, p[0], p[1], p[2], 0.3 * clamp((0.97 - M.DU) * 12, 0, 1));
    }
    pathMesh.instanceMatrix.needsUpdate = true;
  }

  // ------------------------------------------------------------------ shared annotations
  var BWNOTE = {
    '1.50': 'The most conserved residue of TM1 across class A GPCRs.',
    '2.50': 'Lines the sodium pocket. Sodium bound here stabilises the inactive state and lowers agonist affinity.',
    '3.32': 'The conserved aspartate that anchors the protonated amine of the neurotransmitter and of almost every ligand at these receptors.',
    '3.39': 'Part of the polar network around the sodium pocket.',
    '3.40': 'Part of the PIF micro-switch, which repacks on activation.',
    '3.49': 'The D of the DRY motif.', '3.50': 'The R of the DRY motif. At rest it can lock onto TM6; when active it reaches the G protein’s α5 helix.', '3.51': 'The Y of the DRY motif.',
    '4.50': 'The most conserved residue of TM4.',
    '5.42': 'A TM5 position that can hydrogen-bond the agonist’s hydroxyl.', '5.43': 'A TM5 position facing the agonist’s hydroxyl.', '5.46': 'A TM5 position that can hydrogen-bond the agonist’s hydroxyl.',
    '5.50': 'The P of the PIF micro-switch; this proline kinks TM5.',
    '6.30': 'Ionic-lock partner of Arg3.50 in the resting state.',
    '6.44': 'The F of the PIF micro-switch.', '6.47': 'The C of the CWxP motif.', '6.48': 'The “toggle switch” tryptophan of the CWxP motif at the base of the pocket.', '6.50': 'The CWxP proline. It kinks TM6, letting the helix’s cytoplasmic end swing out.',
    '6.51': 'An aromatic wall of the pocket.', '6.52': 'An aromatic wall of the pocket.', '6.55': 'A pocket residue at the top of TM6 that often hydrogen-bonds the ligand.',
    '7.35': 'On the rim of the pocket.', '7.39': 'Lines the pocket from TM7.', '7.43': 'Lines the floor of the pocket beside Asp3.32.',
    '7.45': 'Part of the sodium pocket.', '7.46': 'Part of the sodium pocket.', '7.49': 'The N of NPxxY, next to the sodium pocket.', '7.50': 'The P of NPxxY.', '7.53': 'The Y of NPxxY; it swings toward the helix core on activation.'
  };
  var D2NOTE = {
    91: 'Lines the side pocket that rotigotine’s thiophene reaches into.',
    94: 'Lines a side pocket between TM2 and TM3 that haloperidol’s chlorophenyl and rotigotine’s thiophene reach into.',
    100: 'Folds over risperidone like a lid. Mutating it to alanine made risperidone dissociate much faster.',
    107: 'Disulfide-bonded to Cys182, tying extracellular loop 2 to TM3.', 182: 'Disulfide partner of Cys107.',
    118: 'Lines the deep hydrophobic cleft where risperidone’s and haloperidol’s fluorinated rings lodge.',
    122: 'The I of the PIF micro-switch, which repacks on activation. It also lines the deep cleft used by the antipsychotics.',
    183: 'On extracellular loop 2, over the entrance to the pocket.', 184: 'On extracellular loop 2, over the entrance to the pocket.',
    193: 'Hydrogen-bonds both of dopamine’s catechol hydroxyls (2.7–2.8\u00a0Å).', 194: 'The middle serine of TM5. It touches rotigotine but sits farther from dopamine in these structures.',
    197: 'Hydrogen-bonds one of dopamine’s hydroxyls (2.8\u00a0Å). It also lines the deep cleft used by the antipsychotics.',
    198: 'Lines the deep cleft under the antipsychotics’ fluorinated rings.', 382: 'The F of the PIF micro-switch. It also lines the deep cleft used by the antipsychotics.',
    393: 'Hydrogen-bonds dopamine’s second hydroxyl (2.9\u00a0Å).', 399: 'Forms a short disulfide with Cys401 in extracellular loop 3 in three of these structures.', 401: 'Disulfide partner of Cys399.',
    408: 'On the rim of the pocket; hydrogen-bonds haloperidol’s hydroxyl (3.2\u00a0Å).', 412: 'Lines the pocket and touches every ligand here.', 416: 'Lines the floor of the pocket beside Asp114.'
  };
  var GNOTE = {
    Go: 'Gαo, one of the most abundant G proteins in the brain. Both its Ras-like and helical domains are resolved here. It carries K46E, a GNAO1 mutation found in a neurodevelopmental disorder.',
    Gi: 'Gαi1. Its helical domain moves too much to resolve in this complex, so only the Ras-like domain is shown.',
    Gs: 'Gαs, the stimulatory G protein. It switches on adenylyl cyclase and raises cAMP.',
    Gq: 'Gαq. It switches on phospholipase Cβ, which releases IP3 and diacylglycerol, raising calcium and activating protein kinase C. This structure used an engineered mini-Gq, a trimmed Gαq with the helical domain removed.',
    a5: 'The C-terminal α5 helix inserts into the cavity opened by TM6. It is a key determinant of which G proteins a receptor couples to.',
    B: 'Gβ1 folds into a seven-bladed β-propeller. With Gγ2 it forms the Gβγ dimer, which is freed on activation and opens GIRK potassium channels.',
    C: 'Gγ2 binds Gβ1. Its lipid tail, not visible in the structure, anchors Gβγ to the membrane.'
  };
  var DRUGTEXT = {
    risperidone: { cls: 'Atypical antipsychotic', act: 'block', body: '<p>Risperidone blocks D2 and 5-HT2A receptors, with the 5-HT2A block part of what makes it “atypical”. At both it takes the neurotransmitter’s anchor, pairing its piperidine nitrogen with Asp3.32, and wedges its fluorobenzisoxazole deep into the pocket to hold the receptor inactive.</p>' },
    haloperidol: { cls: 'Typical antipsychotic', act: 'block', body: '<p>Haloperidol grips Asp114 with its piperidine nitrogen and drops its fluorophenyl ring into the same deep cleft as risperidone. Its chlorophenyl end points the other way, up into a side pocket between TM2 and TM3 (Leu94, Cys107, Phe110), and its hydroxyl sits 3.2\u00a0Å from Tyr408.</p><p>It also holds the receptor inactive. With little action at 5-HT2A, its strong D2 block in the motor striatum is linked to the movement side effects of first-generation antipsychotics.</p>' },
    bromocriptine: { cls: 'Parkinson’s disease, high prolactin', act: 'act', body: '<p>Bromocriptine, an ergot-derived agonist, fills dopamine’s site with its ergoline core, bromine pointing down toward Val115, Cys118 and Ile122, while its bulky peptide part reaches up toward extracellular loop 2 (Ile183, Ile184).</p><p>Instead of blocking, it switches the receptor on, and this structure shows Gi docked underneath. It is used for Parkinson’s disease and to lower prolactin.</p>' },
    rotigotine: { cls: 'Parkinson’s disease, restless legs', act: 'act', body: '<p>Rotigotine mimics dopamine closely: an aminotetralin with a single phenol hydroxyl in place of the catechol. It activates all five dopamine receptor subtypes and is given as a skin patch for Parkinson’s disease and restless legs syndrome.</p>' },
    fenoldopam: { cls: 'Severe high blood pressure', act: 'act', body: '<p>A D1-selective agonist that does not cross into the brain. It is given intravenously to bring down severe high blood pressure, dilating vessels, especially in the kidney.</p>' },
    apomorphine: { cls: 'Parkinson’s rescue treatment', act: 'act', body: '<p>A non-ergot agonist at both D1-like and D2-like receptors, given by injection or under the tongue as a rescue treatment for sudden “off” periods in Parkinson’s disease.</p>' },
    pramipexole: { cls: 'Parkinson’s disease, restless legs', act: 'act', body: '<p>A non-ergot agonist that prefers D3 over D2, used for Parkinson’s disease and restless legs syndrome.</p>' },
    eticlopride: { cls: 'Research antagonist', act: 'block', body: '<p>A potent D2/D3 antagonist used as a research tool and radioligand rather than a medicine. It locks the receptor in its inactive shape, and gave the first structure of any dopamine receptor, D3, in 2010.</p>' },
    nemonapride: { cls: 'Antipsychotic used in Japan', act: 'block', body: '<p>A benzamide antipsychotic that binds D2, D3 and D4 tightly and holds the receptor inactive. It gave the first D4 structure, and at 1.96\u00a0Å one of the sharpest of any GPCR.</p>' },
    aripiprazole: { cls: 'Antipsychotic, adjunct antidepressant', act: 'partial', body: '<p>Aripiprazole is a partial agonist at D2 and 5-HT1A and an antagonist at 5-HT2A, a mix behind its “dopamine stabiliser” reputation. Its dichlorophenylpiperazine takes the amine anchor at Asp3.32 while its long tail reaches up toward the extracellular loops.</p>' },
    ergotamine: { cls: 'Migraine', act: 'act', body: '<p>An ergot alkaloid that activates 5-HT1B and 5-HT1D on cranial blood vessels and trigeminal nerve endings, and many other monoamine receptors besides. Its ergoline core takes serotonin’s place while the peptide half reaches up toward the extracellular loops.</p>' },
    dihydroergotamine: { cls: 'Migraine, cluster headache', act: 'act', body: '<p>Ergotamine’s hydrogenated cousin, given by injection or nasal spray for migraine attacks. It binds 5-HT1B and 5-HT1D much as ergotamine does.</p>' },
    donitriptan: { cls: 'Triptan (research)', act: 'act', body: '<p>A high-efficacy triptan, the migraine drug class built on serotonin’s indole. Triptans activate 5-HT1B and 5-HT1D to constrict cranial vessels and quieten trigeminal nerve endings; this one gave the first structure of a serotonin receptor coupled to a G protein.</p>' },
    'BRL-54443': { cls: 'Research agonist', act: 'act', body: '<p>A serotonin-like agonist that prefers 5-HT1E and 5-HT1F. It is a research tool: 5-HT1E has no drugs of its own yet, and its job in the brain is still unclear.</p>' },
    lasmiditan: { cls: 'Migraine', act: 'act', body: '<p>The first “ditan”: a selective 5-HT1F agonist for acute migraine that, unlike triptans, does not constrict blood vessels, so it can be used in people with heart disease.</p>' },
    LSD: { cls: 'Psychedelic', act: 'act', body: '<p>Lysergic acid diethylamide activates 5-HT2A, the receptor behind its psychedelic effects, and 5-HT2B among many others. Its ergoline core sits where serotonin’s indole goes, with the diethylamide tucked under extracellular loop 2, which closes over it like a lid and is thought to explain its very slow release and long-lasting effects.</p>' },
    psilocin: { cls: 'Psychedelic (from psilocybin)', act: 'act', body: '<p>The active form of psilocybin, from magic mushrooms. It is almost serotonin: an indole with a hydroxyl and a dimethylated amine, and it binds 5-HT2A in the same spot. It is now being trialled for depression.</p>' },
    '25-CN-NBOH': { cls: 'Research psychedelic', act: 'act', body: '<p>A selective 5-HT2A agonist from the “NBOH” phenethylamine series, used as a research tool. This is the structure that first caught 5-HT2A switched on and coupled to Gq.</p>' },
    methylergonovine: { cls: 'Postpartum bleeding', act: 'act', body: '<p>An ergot used to contract the uterus after childbirth. At 5-HT2B it is a full agonist, which is why long-term use of ergots has been linked to heart-valve disease.</p>' },
    ritanserin: { cls: 'Research antagonist', act: 'block', body: '<p>A 5-HT2 antagonist that never reached the clinic but is a classic tool compound. It holds 5-HT2C in its inactive shape, with its two fluorophenyl rings filling an extended pocket.</p>' },
    AS2674723: { cls: 'Research antagonist', act: 'block', body: '<p>A selective 5-HT5A antagonist developed by Astellas, used here to capture the receptor’s inactive state. No 5-HT5A drug has reached the clinic.</p>' },
    '5-CT': { cls: 'Research agonist', act: 'act', body: '<p>5-Carboxamidotryptamine: serotonin with its hydroxyl swapped for a carboxamide. A potent agonist at 5-HT1, 5-HT5 and 5-HT7 receptors, used as a tool compound.</p>' }
  };
  var D2TEXT = { risperidone: '<p>Risperidone takes dopamine’s anchor: its piperidine nitrogen pairs with Asp114. But it reaches far deeper than dopamine, wedging its fluorobenzisoxazole into a hydrophobic cleft lined by Cys118, Ile122, Ser197, Phe198 and Phe382, while Trp100 folds over it like a lid.</p><p>Lodged there it holds the receptor in its inactive shape, so dopamine cannot get in to switch it on. It also blocks 5-HT2A receptors, part of what makes it “atypical”.</p>' };
  var STANDIN = {
    rotigotine: 'a dopamine mimic used for Parkinson’s disease', donitriptan: 'a triptan, the migraine drug class built on serotonin’s indole', 'BRL-54443': 'a research agonist built on serotonin’s indole',
    lasmiditan: 'the migraine drug that activates 5-HT1F', LSD: 'the psychedelic ergot derivative, which activates it', ergotamine: 'the ergot migraine drug, which activates it', '5-CT': 'serotonin with its hydroxyl swapped for a carboxamide'
  };
  var LIGDISP = { dopamine: 'Dopamine', serotonin: 'Serotonin', risperidone: 'Risperidone', haloperidol: 'Haloperidol', bromocriptine: 'Bromocriptine', rotigotine: 'Rotigotine', fenoldopam: 'Fenoldopam', apomorphine: 'Apomorphine', pramipexole: 'Pramipexole', eticlopride: 'Eticlopride', nemonapride: 'Nemonapride',
    aripiprazole: 'Aripiprazole', ergotamine: 'Ergotamine', dihydroergotamine: 'Dihydroergotamine', donitriptan: 'Donitriptan', 'BRL-54443': 'BRL-54443', lasmiditan: 'Lasmiditan', LSD: 'LSD', psilocin: 'Psilocin', '25-CN-NBOH': '25-CN-NBOH', methylergonovine: 'Methylergonovine', ritanserin: 'Ritanserin', AS2674723: 'AS2674723', '5-CT': '5-CT' };
  function disp(n) { return LIGDISP[n] || cap(n); }
  var GPMETA = { Gs: 'Couples to Gs and raises cAMP.', Gi: 'Couples to Gi/o and lowers cAMP.', Gq: 'Couples to Gq/11 and raises calcium.' };
  var RXINFO = {
    D1: { fam: 'D1-like', short: 'D1' }, D2: { fam: 'D2-like', short: 'D2' }, D3: { fam: 'D2-like', short: 'D3' }, D4: { fam: 'D2-like', short: 'D4' }, D5: { fam: 'D1-like', short: 'D5' },
    '5-HT1A': { fam: '5-HT1', short: '1A' }, '5-HT1B': { fam: '5-HT1', short: '1B' }, '5-HT1D': { fam: '5-HT1', short: '1D' }, '5-HT1E': { fam: '5-HT1', short: '1E' }, '5-HT1F': { fam: '5-HT1', short: '1F' },
    '5-HT2A': { fam: '5-HT2', short: '2A' }, '5-HT2B': { fam: '5-HT2', short: '2B' }, '5-HT2C': { fam: '5-HT2', short: '2C' }, '5-HT4': { fam: '5-HT4', short: '4' }, '5-HT5A': { fam: '5-HT5', short: '5A' }, '5-HT6': { fam: '5-HT6', short: '6' }, '5-HT7': { fam: '5-HT7', short: '7' }
  };
  var FAMINFO = { dopamine: { name: 'Dopamine', mono: 'dopamine' }, serotonin: { name: 'Serotonin', mono: 'serotonin' } };
