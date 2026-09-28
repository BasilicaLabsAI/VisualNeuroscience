
  // ------------------------------------------------------------------ shared display state read by every model
  var ST = { scMode: 'key', showGhost: true, showMono: true, showDrugs: true, iso: 'L', hlInsert: false, highlighted: new Set(), hoverRes: null, ixRes: new Set(), cmp: false };
  // which toggle governs a ligand: the neurotransmitter (or whatever plays its part) follows the monoamine toggle, everything in the Drugs tab follows the drugs toggle
  function ligOn(M, n) { return MODE === 'drugs' ? ST.showDrugs : ST.showMono; }

  // ------------------------------------------------------------------ a receptor model: one receptor, several conformations, one pose engine
  function makeModel(MD) {
    var M = { key: MD.key, D: MD, NC: MD.confs.length, seg: MD.seg, seq: MD.seq, mono: MD.mono, family: MD.family, group: new THREE.Group(), dirty: { rec: true, sc: true, lig: true, ghost: true, gp: true } };
    M.group.visible = false; scene.add(M.group);
    var CI = {}; MD.confs.forEach(function (c, i) { CI[c.key] = i; }); M.CI = CI;
    M.confKey = function (c) { return MD.confs[c].key; };
    function segOf(r) { return segOfS(MD.seg, r); }
    function segCol(r) { return SEGCOL[segOf(r)] || LOOPCOL; }
    M.bw = function (r) { return bwS(MD.seg, r); };
    M.aa = function (r) { return AA3[MD.seq.charAt(r - 1)] || 'Xaa'; };
    M.resName = function (r) { return M.aa(r) + r; };
    M.resHTML = function (r) { var b = M.bw(r); return M.resName(r) + (b ? '<sup>' + b + '</sup>' : ''); };
    M.resAt = function (p) { var k = p.split('.'); return MD.seg['TM' + k[0]][1] + parseInt(k[1], 10) - 50; };

    // ribbon with morph targets
    var recRuns = MD.runs.map(function (rn) {
      return { n: rn.n, start: rn.start, colorAt: function (i) { return segCol(rn.start + i); },
        states: MD.confs.map(function (c, s) { return { ca: F32(rn.ca[s]), side: F32(rn.side[s]), ss: rn.ss[s], mod: rn.mod[s] }; }) };
    });
    var RB = buildRibbonData(recRuns, M.NC, 7, 10);
    var ribGeo = ribbonGeometry(RB, true);
    var ribMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0, morphTargets: true, morphNormals: true });
    ribMat.onBeforeCompile = function (sh) {
      sh.uniforms.uMorph = M.morphU; sh.uniforms.uModCol = U.modCol;
      sh.vertexShader = 'attribute vec2 aMod;\nuniform float uMorph;\nvarying float vMod;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vMod = mix(aMod.x, aMod.y, uMorph);');
      sh.fragmentShader = 'uniform vec3 uModCol;\nvarying float vMod;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, uModCol, vMod * 0.6);');
    };
    M.morphU = { value: 0 };
    var ribbon = new THREE.Mesh(ribGeo, ribMat); ribbon.frustumCulled = false; M.group.add(ribbon);
    var ribPos = ribGeo.attributes.position, ribNrm = ribGeo.attributes.normal, ribMod = ribGeo.attributes.aMod, ribTP = ribGeo.morphAttributes.position[0], ribTN = ribGeo.morphAttributes.normal[0];
    var PAS = []; M.RW = 0; M.RTO = 0;
    function PA(arrs) { var o = { conf: arrs, from: arrs[0].slice(), cur: arrs[0].slice() }; PAS.push(o); return o; }
    M.setRW = function (w) { M.RW = w; ribbon.morphTargetInfluences[0] = w; M.morphU.value = w; M.dirty.rec = true; };
    M.bake = function () {
      PAS.forEach(function (o) { var f = o.from, t = o.conf[M.RTO]; for (var i = 0; i < f.length; i++) f[i] += (t[i] - f[i]) * M.RW; });
      var p = ribPos.array, n = ribNrm.array, tp = ribTP.array, tn = ribTN.array, am = ribMod.array;
      for (var i = 0; i < p.length; i++) { p[i] += (tp[i] - p[i]) * M.RW; n[i] += (tn[i] - n[i]) * M.RW; }
      for (var v = 0; v < RB.nV; v++) am[2 * v] += (am[2 * v + 1] - am[2 * v]) * M.RW;
      ribPos.needsUpdate = true; ribNrm.needsUpdate = true; ribMod.needsUpdate = true;
      M.setRW(0);
    };
    M.target = function (c) {
      M.RTO = c; ribTP.array.set(RB.pos[c]); ribTN.array.set(RB.nrm[c]);
      var am = ribMod.array, m = RB.mod[c]; for (var v = 0; v < RB.nV; v++) am[2 * v + 1] = m[v];
      ribTP.needsUpdate = true; ribTN.needsUpdate = true; ribMod.needsUpdate = true; M.dirty.rec = true;
    };
    M.from = function (c) {
      PAS.forEach(function (o) { o.from.set(o.conf[c]); });
      ribPos.array.set(RB.pos[c]); ribNrm.array.set(RB.nrm[c]);
      var am = ribMod.array, m = RB.mod[c]; for (var v = 0; v < RB.nV; v++) am[2 * v] = m[v];
      ribPos.needsUpdate = true; ribNrm.needsUpdate = true; ribMod.needsUpdate = true; M.dirty.rec = true;
    };
    M.eval = function () { PAS.forEach(function (o) { var f = o.from, t = o.conf[M.RTO], c = o.cur; for (var i = 0; i < f.length; i++) c[i] = f[i] + (t[i] - f[i]) * M.RW; }); };
    var RIBRES = []; MD.runs.forEach(function (rn) { for (var i = 0; i < rn.n; i++) RIBRES.push(rn.start + i); });
    M.RIBRES = RIBRES; M.ribIdx = new Map(RIBRES.map(function (r, i) { return [r, i]; }));
    M.caPA = PA(MD.confs.map(function (c, ci) { var a = []; MD.runs.forEach(function (rn) { a = a.concat(rn.ca[ci]); }); return F32(a); }));

    // side chains
    var SC = MD.sc, NA = SC.res.length, NB = SC.bonds.length; M.SC = SC; M.NA = NA; M.scS = new Float32Array(NA);
    M.scPA = PA(SC.pos.map(F32));
    var presPA = PA(MD.confs.map(function (c, ci) { return Float32Array.from(SC.pres, function (b) { return (b >> ci) & 1; }); }));
    var bondPA = PA(MD.confs.map(function (c, ci) { return Float32Array.from(SC.bonds, function (b) { return (b[2] >> ci) & 1; }); }));
    M.resAtoms = new Map(); SC.res.forEach(function (r, k) { if (!M.resAtoms.has(r)) M.resAtoms.set(r, []); M.resAtoms.get(r).push(k); });
    var scMat = new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0 });
    var scAtoms = inst(sphGeo, scMat, NA), scBonds = inst(cylGeo, scMat, NB * 2);
    function atomCol(k) { var e = SC.el[k]; if (e === 'C') return tc.set(segCol(SC.res[k])).multiplyScalar(0.86); return tc.set(ELCOL[e] || '#999999'); }
    for (var k0 = 0; k0 < NA; k0++) scAtoms.setColorAt(k0, atomCol(k0));
    SC.bonds.forEach(function (b, q) { scBonds.setColorAt(2 * q, atomCol(b[0])); scBonds.setColorAt(2 * q + 1, atomCol(b[1])); });
    M.group.add(scAtoms); M.group.add(scBonds);
    function resVis(r) { if (ST.scMode === 'off') return false; if (ST.scMode === 'all') return true; return ST.highlighted.has(r) || r === ST.hoverRes || ST.ixRes.has(r); }
    M.updateSC = function () {
      var P = M.scPA.cur, PR = presPA.cur, BD = bondPA.cur, vc = new Map(), scS = M.scS;
      for (var k = 0; k < NA; k++) {
        var r = SC.res[k], v = vc.get(r); if (v === undefined) { v = resVis(r); vc.set(r, v); }
        var pr = PR[k], s = v ? pr * pr * (3 - 2 * pr) : 0; scS[k] = s;
        setSph(scAtoms, k, P[k * 3], P[k * 3 + 1], P[k * 3 + 2], 0.36 * s * (SC.name[k] === 'CA' ? 0.85 : 1));
      }
      for (var q = 0; q < NB; q++) {
        var b = SC.bonds[q], i = b[0] * 3, j = b[1] * 3, bd = BD[q], rr = Math.min(scS[b[0]], scS[b[1]]) * 0.17 * bd * bd * (3 - 2 * bd);
        var mx = (P[i] + P[j]) / 2, my = (P[i + 1] + P[j + 1]) / 2, mz = (P[i + 2] + P[j + 2]) / 2;
        setCyl(scBonds, 2 * q, P[i], P[i + 1], P[i + 2], mx, my, mz, rr); setCyl(scBonds, 2 * q + 1, mx, my, mz, P[j], P[j + 1], P[j + 2], rr);
      }
      scAtoms.instanceMatrix.needsUpdate = true; scBonds.instanceMatrix.needsUpdate = true;
    };
    M.resLabelPos = function (r) {
      var ks = M.resAtoms.get(r), P = M.scPA.cur;
      if (!ks) { var i = M.ribIdx.get(r); return i === undefined ? null : [M.caPA.cur[i * 3], M.caPA.cur[i * 3 + 1], M.caPA.cur[i * 3 + 2]]; }
      var ca = ks[0], best = ca, bd = -1;
      ks.forEach(function (k) { if (M.scS[k] < 0.3 && k !== ca) return; var dx = P[k * 3] - P[ca * 3], dy = P[k * 3 + 1] - P[ca * 3 + 1], dz = P[k * 3 + 2] - P[ca * 3 + 2], dd = dx * dx + dy * dy + dz * dz; if (dd > bd) { bd = dd; best = k; } });
      var p = [P[best * 3], P[best * 3 + 1], P[best * 3 + 2]];
      if (best !== ca) { var L = Math.sqrt(bd); for (var c = 0; c < 3; c++) p[c] += (p[c] - P[ca * 3 + c]) / L * 2.0; }
      return p;
    };

    // ligands: the natural agonist of the function timeline and each drug, plus a see-through copy of the agonist marking the site
    M.LIGNAMES = Object.keys(MD.lig); M.LIGS = {}; M.LW = {};
    M.LIGNAMES.forEach(function (n) { var lg = makeLigMesh(MD.lig[n], n, false, M.group); lg.mono = n === MD.mono; M.LIGS[n] = lg; M.LW[n] = 0; });
    M.fn = MD.funcLig; M.FL = M.LIGS[M.fn];
    M.OVL = makeLigMesh(MD.lig[M.fn], 'overlay', true, M.group); M.OVL.mono = true; M.OVW = 0; M.OVT = 0;
    var EP = MD.entryPath, DAX = new THREE.Vector3(0.35, 0.8, 0.48).normalize(), DQ = new THREE.Quaternion(), DV = new THREE.Vector3();
    M.EP = EP; M.DU = 0;
    M.ligAt = function (u) { var a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u; return [a * EP[0][0] + b * EP[1][0] + c * EP[2][0], a * EP[0][1] + b * EP[1][1] + c * EP[2][1], a * EP[0][2] + b * EP[1][2] + c * EP[2][2]]; };
    M.ligPose = function (u) {
      var lg = M.FL, P = lg.P, c0 = lg.cen, p = M.ligAt(u);
      DQ.setFromAxisAngle(DAX, Math.pow(1 - u, 1.4) * 2.6);
      for (var k = 0; k < lg.n; k++) { DV.set(P[k * 3] - c0[0], P[k * 3 + 1] - c0[1], P[k * 3 + 2] - c0[2]).applyQuaternion(DQ); lg.cur[k * 3] = p[0] + DV.x; lg.cur[k * 3 + 1] = p[1] + DV.y; lg.cur[k * 3 + 2] = p[2] + DV.z; }
      return p;
    };
    M.fnCen = M.ligPose(0); M.lastDU = -1;
    M.drawLigs = function () {
      var moved = Math.abs(M.DU - M.lastDU) > 1e-5; if (moved) { M.fnCen = M.ligPose(M.DU); M.lastDU = M.DU; }
      M.LIGNAMES.forEach(function (n) { drawLig(M.LIGS[n], ligOn(M, n) ? M.LW[n] : 0, n === M.fn && moved); });
      drawLig(M.OVL, ST.showMono ? M.OVW : 0, false);
    };
    M.recolor = function () {
      var da = MODE === 'da';   // whatever plays the neurotransmitter's part is amber in the Binding tab, drug-coloured elsewhere
      M.LIGNAMES.forEach(function (n) { var lg = M.LIGS[n]; lg.mono = n === M.mono || (n === M.fn && da); recolorLig(lg); });
      recolorLig(M.OVL); M.recolorGhosts();
    };

    // unresolved regions (beads): N-tail, each gap between ribbon runs, C-tail, and D2's short isoform
    var ghostMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, transparent: true, opacity: 0.66, depthWrite: false });
    var chains = [], nBead = 0, nLink = 0;
    Object.keys(MD.ghost).forEach(function (key) {
      var g = MD.ghost[key], n = g.res.length;
      var c = { key: key, res: g.res, known: g.known, insert: g.insert || null, isoS: key === 'icl3s', n: n, b0: nBead, l0: nLink, hasS: !!g.anc[0][0], hasE: !!g.anc[1][0], amp: new Float32Array(n), ph: new Float32Array(n * 3) };
      for (var i = 0; i < n; i++) {
        var dS = c.hasS ? i + 1 : 1e9, dE = c.hasE ? n - i : 1e9;
        c.amp[i] = 0.8 * Math.min(1, Math.min(dS, dE) / 5);
        c.ph[i * 3] = rand() * 6.283; c.ph[i * 3 + 1] = rand() * 6.283; c.ph[i * 3 + 2] = rand() * 6.283;
      }
      nBead += n; nLink += n - 1 + (c.hasS ? 1 : 0) + (c.hasE ? 1 : 0);
      chains.push(c);
    });
    M.chains = chains; M.hasIso = !!MD.ghost.icl3s;
    var CH = {}; chains.forEach(function (c) { CH[c.key] = c; }); M.CH = CH;
    var ghostPA = PA(MD.confs.map(function (cf, ci) { var a = new Float32Array(nBead * 3); chains.forEach(function (c) { a.set(MD.ghost[c.key].pos[ci], c.b0 * 3); }); return a; }));
    var ancPA = PA(MD.confs.map(function (cf, ci) {
      var a = new Float32Array(chains.length * 6);
      chains.forEach(function (c, k) { var g = MD.ghost[c.key]; if (g.anc[0][ci]) a.set(g.anc[0][ci], k * 6); if (g.anc[1][ci]) a.set(g.anc[1][ci], k * 6 + 3); });
      return a;
    }));
    var beads = inst(sphGeo, ghostMat, nBead), links = inst(cylGeo, ghostMat, nLink);
    M.group.add(beads); M.group.add(links);
    M.ghostCur = new Float32Array(nBead * 3); M.ghostPA = ghostPA;
    M.chainVisible = function (c) { return ST.showGhost && !ST.cmp && (c.insert && M.hasIso ? ST.iso === 'L' : c.isoS ? ST.iso === 'S' : true); };
    M.recolorGhosts = function () {
      chains.forEach(function (c) { for (var i = 0; i < c.n; i++) { var r = c.res[i]; beads.setColorAt(c.b0 + i, tc.set(ST.hlInsert && c.insert && r >= c.insert[0] && r <= c.insert[1] ? TH.insert : TH.ghost)); } });
      tc.set(TH.ghost); for (var l = 0; l < nLink; l++) links.setColorAt(l, tc);
      beads.instanceColor.needsUpdate = true; links.instanceColor.needsUpdate = true;
    };
    M.updateGhosts = function (time, wob) {
      var B = ghostPA.cur, A = ancPA.cur, G = M.ghostCur;
      chains.forEach(function (c, ck) {
        var vis = M.chainVisible(c), br = vis ? 0.82 : 0, lr = vis ? 0.2 : 0;
        for (var i = 0; i < c.n; i++) {
          var o = i * 3, gi = (c.b0 + i) * 3, x = B[gi], y = B[gi + 1], z = B[gi + 2];
          if (wob) { var a = c.amp[i]; x += a * Math.sin(time * 0.83 + c.ph[o]); y += a * Math.sin(time * 0.67 + c.ph[o + 1]); z += a * Math.sin(time * 0.97 + c.ph[o + 2]); }
          G[gi] = x; G[gi + 1] = y; G[gi + 2] = z;
          setSph(beads, c.b0 + i, x, y, z, br);
        }
        var l = c.l0, ao = ck * 6;
        if (c.hasS) { var q0 = c.b0 * 3; setCyl(links, l++, A[ao], A[ao + 1], A[ao + 2], G[q0], G[q0 + 1], G[q0 + 2], lr); }
        for (var i = 0; i < c.n - 1; i++) { var p = (c.b0 + i) * 3; setCyl(links, l++, G[p], G[p + 1], G[p + 2], G[p + 3], G[p + 4], G[p + 5], lr); }
        if (c.hasE) { var q1 = (c.b0 + c.n - 1) * 3; setCyl(links, l++, G[q1], G[q1 + 1], G[q1 + 2], A[ao + 3], A[ao + 4], A[ao + 5], lr); }
      });
      beads.instanceMatrix.needsUpdate = true; links.instanceMatrix.needsUpdate = true;
    };
    function beadOffset(c, i) { var g = (c.b0 + i) * 3, B = ghostPA.cur; return [M.ghostCur[g] - B[g], M.ghostCur[g + 1] - B[g + 1], M.ghostCur[g + 2] - B[g + 2]]; }

    // schematic glycans and palmitate where the receptor has them (D2)
    M.glyPos = []; M.palPos = [];
    if (MD.glycans && MD.glycans.length) {
      var glcMat = new THREE.MeshStandardMaterial({ color: '#1F6DB3', roughness: 0.5 }), manMat = new THREE.MeshStandardMaterial({ color: '#1E9B58', roughness: 0.5 }), gLinkMat = new THREE.MeshStandardMaterial({ color: '#8E8A84', roughness: 0.7 });
      var GLYRES = MD.glycans[0].map(function (g) { return g.res; }), nGly = GLYRES.length;
      var glyPA = PA(MD.confs.map(function (cf, ci) { var a = []; MD.glycans[ci].forEach(function (g) { a = a.concat(g.glcnac[0], g.glcnac[1], g.man[0], g.man[1], g.man[2]); }); return F32(a); }));
      var glcM = inst(cubeGeo, glcMat, nGly * 2), manM = inst(sphGeo, manMat, nGly * 3), glyL = inst(cylGeo, gLinkMat, nGly * 5);
      M.group.add(glcM); M.group.add(manM); M.group.add(glyL);
      M.updateGlycans = function () {
        var nt = CH.nterm, vis = ST.showGhost && !ST.cmp ? 1 : 0, A = glyPA.cur; M.glyPos.length = 0;
        GLYRES.forEach(function (res, gi) {
          var bi = res - 1, off = beadOffset(nt, bi), bp = (nt.b0 + bi) * 3;
          function P(q) { var o = gi * 15 + q * 3; return [A[o] + off[0], A[o + 1] + off[1], A[o + 2] + off[2]]; }
          var G = [P(0), P(1)], Mn = [P(2), P(3), P(4)];
          G.forEach(function (p, q) { if (vis) { M4.makeScale(2, 2, 2); M4.setPosition(p[0], p[1], p[2]); glcM.setMatrixAt(gi * 2 + q, M4); } else glcM.setMatrixAt(gi * 2 + q, ZERO); M.glyPos.push({ p: p, res: res }); });
          Mn.forEach(function (p, q) { setSph(manM, gi * 3 + q, p[0], p[1], p[2], 1.15 * vis); M.glyPos.push({ p: p, res: res }); });
          var asn = [M.ghostCur[bp], M.ghostCur[bp + 1], M.ghostCur[bp + 2]];
          [[asn, G[0]], [G[0], G[1]], [G[1], Mn[0]], [Mn[0], Mn[1]], [Mn[0], Mn[2]]].forEach(function (pr, q) { setCyl(glyL, gi * 5 + q, pr[0][0], pr[0][1], pr[0][2], pr[1][0], pr[1][1], pr[1][2], 0.24 * vis); });
        });
        glcM.instanceMatrix.needsUpdate = true; manM.instanceMatrix.needsUpdate = true; glyL.instanceMatrix.needsUpdate = true;
      };
    }
    if (MD.palm && CH.cterm) {
      var palMat = new THREE.MeshStandardMaterial({ roughness: 0.55 });
      var palA = inst(sphGeo, palMat, 18), palB = inst(cylGeo, palMat, 18);
      for (var q0 = 0; q0 < 18; q0++) { palA.setColorAt(q0, tc.set(q0 === 0 ? ELCOL.S : q0 === 17 ? ELCOL.O : '#C9AE70')); palB.setColorAt(q0, tc.set('#C9AE70')); }
      M.group.add(palA); M.group.add(palB);
      var palPA = PA(MD.confs.map(function (cf, ci) { var p = MD.palm[ci]; return F32([].concat(p.S, p.C, p.O)); }));
      M.updatePalm = function () {
        var ct = CH.cterm, bi = ct.n - 1, off = beadOffset(ct, bi), bp = (ct.b0 + bi) * 3, vis = ST.showGhost && !ST.cmp ? 1 : 0, A = palPA.cur, atoms = [];
        for (var i = 0; i < 18; i++) atoms.push([A[i * 3] + off[0], A[i * 3 + 1] + off[1], A[i * 3 + 2] + off[2]]);
        M.palPos = atoms;
        atoms.forEach(function (p, i) { setSph(palA, i, p[0], p[1], p[2], (i === 0 ? 0.55 : 0.42) * vis); });
        var S = atoms[0], C = atoms.slice(1, 17), O = atoms[17], cys = [M.ghostCur[bp], M.ghostCur[bp + 1], M.ghostCur[bp + 2]], bonds = [[cys, S], [S, C[0]], [C[0], O]];
        for (var i = 0; i < 15; i++) bonds.push([C[i], C[i + 1]]);
        bonds.forEach(function (b, i) { setCyl(palB, i, b[0][0], b[0][1], b[0][2], b[1][0], b[1][1], b[1][2], 0.2 * vis); });
        palA.instanceMatrix.needsUpdate = true; palB.instanceMatrix.needsUpdate = true;
      };
    }

    // G proteins, one per agonist-bound conformation
    M.GKS = Object.keys(MD.gprot); M.GW = {}; M.GPM = {};
    M.GKS.forEach(function (k) {
      var g = MD.gprot[k], acol = GCOL[g.kind] || GCOL.Gi;
      var runs = g.runs.map(function (r) { return { n: r.n, start: r.start, colorAt: function (i) { return r.chain === 'A' ? (r.a5 && r.a5[i] ? GCOL.a5 : acol) : GCOL[r.chain]; }, states: [{ ca: F32(r.ca), side: F32(r.side), ss: r.ss, mod: null }] }; });
      var mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, transparent: true, opacity: 1 });
      var mesh = new THREE.Mesh(ribbonGeometry(buildRibbonData(runs, 1, 5, 8), false), mat); mesh.frustumCulled = false;
      var grp = new THREE.Group(); grp.add(mesh); grp.visible = false; M.group.add(grp);
      var res = [];
      g.runs.forEach(function (r) { for (var i = 0; i < r.n; i++) res.push({ chain: r.chain, label: r.label, r: r.start + i, aa: r.seq.charAt(i), a5: r.a5 ? r.a5[i] : 0, p: r.ca.slice(i * 3, i * 3 + 3) }); });
      M.GPM[k] = { grp: grp, mat: mat, res: res, kind: g.kind, conf: g.conf, labs: g.labels.map(function (l) { return { el: mkLab('gprot', l.text), pos: l.pos }; }) };
      M.GW[k] = 0;
    });
    M.gpOf = function (c) { for (var k in M.GPM) if (M.GPM[k].conf === c) return k; return null; };
    M.updateGp = function () { M.GKS.forEach(function (k) { var g = M.GW[k], m = M.GPM[k]; m.grp.visible = g > 0.002; m.mat.opacity = g; m.grp.position.y = -26 * (1 - g); }); };

    // labels anchored on the receptor, its ligands and its binding site
    M.LABS = MD.labels.map(function (l, i) {
      var col = SEGCOL[l.key] || (/^E?[CI]L/.test(l.key) ? LOOPCOL : null);
      return { key: l.key, kind: l.kind, i: i, el: mkLab(l.kind, (col ? '<span class="dot" style="background:' + col + '"></span>' : '') + l.text) };
    });
    M.labPA = PA(MD.confs.map(function (c, ci) { var a = []; MD.labels.forEach(function (l) { a = a.concat(l.pos[ci]); }); return F32(a); }));
    M.LIGLAB = {}; M.LIGNAMES.forEach(function (n) { M.LIGLAB[n] = { el: mkLab('lig', LIGDISP[n] || cap(n)), pos: MD.lig[n].lab }; });
    M.SITELAB = { el: mkLab('lig', 'Binding site'), pos: [EP[2][0], EP[2][1] - 4.5, EP[2][2]] };
    M.allLabelEls = function () { var a = M.LABS.map(function (l) { return l.el; }); M.LIGNAMES.forEach(function (n) { a.push(M.LIGLAB[n].el); }); a.push(M.SITELAB.el); M.GKS.forEach(function (k) { M.GPM[k].labs.forEach(function (l) { a.push(l.el); }); }); return a; };

    // notes
    var MUTC = MD.confs.filter(function (c) { return Object.keys(c.mut).length; }).map(function (c) { return c.key; });
    var MODR = new Set([].concat.apply([], MD.confs.map(function (c) { return c.mod; })));
    function modConfs(r) { return MD.confs.filter(function (c) { return c.mod.indexOf(r) >= 0; }).map(function (c) { return c.key; }); }
    var MUTR = {}; MD.confs.forEach(function (c) { Object.keys(c.mut).forEach(function (r) { MUTR[r] = c.mut[r]; }); });
    var TOUCH = {}; M.LIGNAMES.forEach(function (n) { MD.lig[n].contacts.forEach(function (r) { (TOUCH[r] = TOUCH[r] || []).push(LIGDISP[n].toLowerCase()); }); });
    var A5 = {}; M.GKS.forEach(function (k) { MD.gprot[k].a5.forEach(function (r) { (A5[r] = A5[r] || []).push(MD.gprot[k].kind === 'Gs' ? 'Gαs' : MD.gprot[k].kind === 'Go' ? 'Gαo' : 'Gαi1'); }); });
    M.noteFor = function (r) {
      var note = (M.key === 'D2' && D2NOTE[r]) || BWNOTE[M.bw(r)] || '';
      if (note.indexOf('Arg3.50') >= 0) note = note.replace('Arg3.50', M.resName(M.resAt('3.50')));
      if (note.indexOf('Asp3.32') >= 0) note = note.replace('Asp3.32', M.resName(M.resAt('3.32')));
      if (A5[r]) note += (note ? ' ' : '') + 'Touches the α5 helix of ' + listJoin(Array.from(new Set(A5[r]))) + '.';
      if (MUTR[r]) note += (note ? ' ' : '') + 'Mutated to ' + (AA3[MUTR[r]] || MUTR[r]).toLowerCase() + ' in the ' + listJoin(MUTC) + ' construct' + (MUTC.length > 1 ? 's' : '') + ', so ' + (MUTC.length > 1 ? 'those views show' : 'that view shows') + ' the mutant side chain.';
      if (MODR.has(r)) { var mc = modConfs(r); note += (note ? ' ' : '') + 'This stretch is missing from ' + listJoin(mc) + '; there it is borrowed from another structure and drawn pale.'; }
      if (TOUCH[r]) note += (note ? ' ' : '') + 'Within 4\u00a0Å of ' + listJoin(TOUCH[r]) + ' in their structures.';
      return note;
    };
    M.describe = function (h) {
      if (h.kind === 'res') return { title: M.resHTML(h.r), sub: segNameS(MD.seg, h.r), note: M.noteFor(h.r) };
      if (h.kind === 'ghost') {
        var kb = h.known, ks = MD.confs.filter(function (c, i) { return (kb >> i) & 1; }).map(function (c) { return c.key; }), c = M.CH[h.key];
        var note = ks.length ? 'Resolved only in ' + listJoin(ks) + '; in the other views its bead position is illustrative.' : 'Not resolved in any of these structures, so its bead position is illustrative.';
        if (M.key === 'D2' && [5, 17, 23].indexOf(h.r) >= 0) note = 'An N-glycosylation site. ' + note;
        if (M.key === 'D2' && h.r === 443) note = 'The last residue. It carries a palmitoyl lipid, drawn schematically, that anchors the tail in the membrane. ' + note;
        if (c.insert && h.r >= c.insert[0] && h.r <= c.insert[1]) note = 'One of the 29 residues (242–270) that the short isoform, D2S, lacks. ' + note;
        return { title: M.seq.charAt(h.r - 1) === '-' ? 'Residue ' + h.r : M.resName(h.r), sub: segNameS(MD.seg, h.r), note: note };
      }
      if (h.kind === 'lig') {
        var L = MD.lig[h.name], t = DRUGTEXT[h.name];
        if (h.name === M.mono) return { title: disp(h.name), sub: M.DU < 0.97 ? 'On its way in; the path is illustrative' : 'Bound pose from ' + L.pdb, note: 'The neurotransmitter. Dashed lines mark its polar contacts once it is bound.' };
        return { title: disp(h.name), sub: (t ? t.cls : '') + ', pose from ' + L.pdb, note: !t ? '' : t.act === 'block' ? 'Blocks the receptor, holding it in its inactive shape.' : t.act === 'partial' ? 'A partial agonist: it switches the receptor on, but less fully than ' + M.mono + ' does.' : 'Activates the receptor, as ' + M.mono + ' does.' };
      }
      if (h.kind === 'gp') {
        var g = M.GPM[h.g], src = h.g;
        return { title: h.label + ' ' + (AA3[h.aa] || h.aa) + h.r, sub: (h.a5 ? 'α5 helix, from ' : 'From ') + src, note: h.a5 ? GNOTE.a5 : h.chain === 'A' ? GNOTE[g.kind] + (g.mini && g.kind !== 'Gq' ? ' This structure used an engineered mini-G, a trimmed Gα without its helical domain.' : '') : GNOTE[h.chain] };
      }
      if (h.kind === 'glycan') return { title: 'N-linked glycan', sub: 'On Asn' + h.res + ', schematic', note: 'Sugars are not in any of these structures. D2 carries N-glycans at Asn5, Asn17 and Asn23; drawn here is the shared core of two GlcNAc (blue cubes) and three mannose (green spheres).' };
      if (h.kind === 'palm') return { title: 'Palmitoyl chain', sub: 'On Cys443, schematic', note: 'A 16-carbon fatty acid attached to the C-terminal cysteine, anchoring the tail in the inner leaflet.' };
      return { title: 'Membrane lipid', sub: 'Schematic bilayer', note: 'Head groups sit about 19\u00a0Å either side of the midplane. The receptor is placed so its most hydrophobic band lines up with the lipid tails.' };
    };
    M.dashes = function (bound) {
      if (!bound || !ligOn(M, bound) || ST.scMode === 'off') return [];
      var lg = M.LIGS[bound], P = M.scPA.cur;
      return MD.lig[bound].ix.filter(function (p) { return M.scS[p[1]] > 0.5; }).map(function (p) { var i = p[0] * 3, k = p[1] * 3; return [lg.cur[i], lg.cur[i + 1], lg.cur[i + 2], P[k], P[k + 1], P[k + 2]]; });
    };
    M.ixRes = function (bound) { return new Set(bound && MD.lig[bound] ? MD.lig[bound].ix.map(function (p) { return SC.res[p[1]]; }) : []); };
    var mk = MD.gprot; M.GKS.forEach(function (k) { M.GPM[k].mini = !!mk[k].mini; });
    M.recolor();
    return M;
  }
