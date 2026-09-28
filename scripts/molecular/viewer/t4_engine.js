
  // ------------------------------------------------------------------ receptor models (built on first use)
  var MODELS = {}, RX = 'D2', M = null;
  function getModel(k) { if (!MODELS[k]) MODELS[k] = makeModel(D.models[k]); return MODELS[k]; }
  var CAMS = D.cams;
  function camFor(name) { return (M && M.D.cams[name]) || CAMS[name] || CAMS.overview; }

  // ------------------------------------------------------------------ camera controls
  var ctl = { target: new THREE.Vector3(0, -6, 0), theta: 0, phi: 1.4, radius: 300, gTarget: new THREE.Vector3(0, -6, 0), gTheta: 0, gPhi: 1.4, gRadius: 300, speed: 2 };
  var W = 1, H = 1, distMul = 1, freeW = 1, freeH = 1, spinOn = false, dragging = false;
  var camRight = new THREE.Vector3(), camUp = new THREE.Vector3();
  function applyCam() {
    var sp = Math.sin(ctl.phi);
    camera.position.set(ctl.target.x + ctl.radius * sp * Math.sin(ctl.theta), ctl.target.y + ctl.radius * Math.cos(ctl.phi), ctl.target.z + ctl.radius * sp * Math.cos(ctl.theta));
    camera.lookAt(ctl.target); camera.updateMatrixWorld();
  }
  function stepCtl(dt) {
    if (spinOn && !dragging && !RM) ctl.gTheta += dt * 0.14;
    var k = RM ? 1 : 1 - Math.exp(-dt * ctl.speed);
    ctl.target.lerp(ctl.gTarget, k);
    ctl.theta += (ctl.gTheta - ctl.theta) * k; ctl.phi += (ctl.gPhi - ctl.phi) * k; ctl.radius += (ctl.gRadius - ctl.radius) * k;
    applyCam();
  }
  function flyTo(cam, instant) {
    var d = cam.dir, th = Math.atan2(d[0], d[2]), ph = Math.acos(clamp(d[1], -1, 1));
    ctl.gTarget.set(cam.target[0], cam.target[1], cam.target[2]);
    ctl.gTheta = th + 2 * Math.PI * Math.round((ctl.theta - th) / (2 * Math.PI));
    ctl.gPhi = clamp(ph, 0.06, Math.PI - 0.06); ctl.gRadius = cam.dist * distMul; ctl.speed = 2.4;
    if (instant || RM) { ctl.target.copy(ctl.gTarget); ctl.theta = ctl.gTheta; ctl.phi = ctl.gPhi; ctl.radius = ctl.gRadius; }
  }
  function panBy(dx, dy) {
    var s = 2 * ctl.radius * Math.tan(FOV * Math.PI / 360) / H;
    camRight.setFromMatrixColumn(camera.matrixWorld, 0); camUp.setFromMatrixColumn(camera.matrixWorld, 1);
    ctl.gTarget.addScaledVector(camRight, -dx * s).addScaledVector(camUp, dy * s);
  }
  var ptrs = new Map(), down = null, pinchD = 0, lastMid = null;
  canvas.addEventListener('pointerdown', function (e) {
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), pan: e.button === 2 || e.shiftKey || e.ctrlKey || e.metaKey, moved: 0 };
    else { if (down) down.moved = 99; var v = Array.from(ptrs.values()); pinchD = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y); lastMid = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 }; }
    dragging = true; ctl.speed = 16; hideHint();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!ptrs.has(e.pointerId)) { if (e.pointerType === 'mouse') hoverQ = { x: e.clientX, y: e.clientY }; return; }
    var p = ptrs.get(e.pointerId), dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 1 && down) {
      down.moved += Math.abs(dx) + Math.abs(dy);
      if (down.pan) panBy(dx, dy);
      else { ctl.gTheta -= dx * 0.0065; ctl.gPhi = clamp(ctl.gPhi - dy * 0.0065, 0.06, Math.PI - 0.06); }
    } else if (ptrs.size === 2) {
      var v = Array.from(ptrs.values()), dd = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y), mid = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
      if (pinchD > 0 && dd > 0) ctl.gRadius = clamp(ctl.gRadius * pinchD / dd, 14, 700);
      pinchD = dd; if (lastMid) panBy(mid.x - lastMid.x, mid.y - lastMid.y); lastMid = mid;
    }
  });
  function endPtr(e) {
    if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId);
    if (ptrs.size === 0) {
      dragging = false;
      if (down && e.type === 'pointerup' && down.moved < 7 && performance.now() - down.t < 500) onTap(e.clientX, e.clientY);
      down = null; lastMid = null;
    } else { pinchD = 0; lastMid = null; }
  }
  canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && !ptrs.size && !pinned) clearInfo(); });
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault(); var dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    ctl.gRadius = clamp(ctl.gRadius * Math.exp(clamp(dy, -240, 240) * 0.0011), 14, 700); ctl.speed = 12; hideHint();
  }, { passive: false });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  canvas.addEventListener('keydown', function (e) {
    var k = e.key, used = true; ctl.speed = 10;
    if (k === 'ArrowLeft') ctl.gTheta += 0.15; else if (k === 'ArrowRight') ctl.gTheta -= 0.15;
    else if (k === 'ArrowUp') ctl.gPhi = clamp(ctl.gPhi - 0.12, 0.06, Math.PI - 0.06); else if (k === 'ArrowDown') ctl.gPhi = clamp(ctl.gPhi + 0.12, 0.06, Math.PI - 0.06);
    else if (k === '+' || k === '=') ctl.gRadius = clamp(ctl.gRadius * 0.86, 14, 700); else if (k === '-' || k === '_') ctl.gRadius = clamp(ctl.gRadius * 1.16, 14, 700);
    else used = false;
    if (used) e.preventDefault();
  });

  // ------------------------------------------------------------------ picking and the info card
  var ray = new THREE.Ray(), PV = new THREE.Vector3();
  function castRay(cx, cy) { ray.origin.setFromMatrixPosition(camera.matrixWorld); ray.direction.set((cx / W) * 2 - 1, -(cy / H) * 2 + 1, 0.5).unproject(camera).sub(ray.origin).normalize(); }
  function makeTester() {
    var o = ray.origin, d = ray.direction, best = null;
    return { test: function (x, y, z, r, mk) {
      var ox = x - o.x, oy = y - o.y, oz = z - o.z, tc2 = ox * d.x + oy * d.y + oz * d.z; if (tc2 < 0) return;
      var d2 = ox * ox + oy * oy + oz * oz - tc2 * tc2; if (d2 > r * r) return;
      var th = tc2 - Math.sqrt(r * r - d2); if (!best || th < best.t) { best = mk(); best.t = th; best.x = x; best.y = y; best.z = z; }
    }, get: function () { return best; } };
  }
  function pick(cx, cy) {
    castRay(cx, cy); var T = makeTester(), test = T.test, CA = M.caPA.cur, P = M.scPA.cur, SC = M.SC;
    M.RIBRES.forEach(function (r, i) { test(CA[i * 3], CA[i * 3 + 1], CA[i * 3 + 2], 2.3, function () { return { kind: 'res', r: r, rad: 2.8 }; }); });
    for (var k = 0; k < M.NA; k++) if (M.scS[k] > 0.5) (function (k) { test(P[k * 3], P[k * 3 + 1], P[k * 3 + 2], 0.9, function () { return { kind: 'res', r: SC.res[k], rad: 1.3 }; }); })(k);
    M.LIGNAMES.forEach(function (n) { var lg = M.LIGS[n]; if (ligOn(M, n) && M.LW[n] > 0.5) for (var k = 0; k < lg.n; k++) test(lg.cur[k * 3], lg.cur[k * 3 + 1], lg.cur[k * 3 + 2], 1.15, function () { return { kind: 'lig', name: n, rad: 1.5 }; }); });
    M.chains.forEach(function (c) { if (!M.chainVisible(c)) return; for (var i = 0; i < c.n; i++) (function (i) { var g = (c.b0 + i) * 3; test(M.ghostCur[g], M.ghostCur[g + 1], M.ghostCur[g + 2], 1.35, function () { return { kind: 'ghost', key: c.key, r: c.res[i], known: c.known[i], rad: 1.7 }; }); })(i); });
    if (ST.showGhost) {
      M.glyPos.forEach(function (g) { test(g.p[0], g.p[1], g.p[2], 1.7, function () { return { kind: 'glycan', res: g.res, rad: 2.1 }; }); });
      M.palPos.forEach(function (p) { test(p[0], p[1], p[2], 1.0, function () { return { kind: 'palm', rad: 1.3 }; }); });
    }
    M.GKS.forEach(function (k) {
      if (M.GW[k] < 0.4) return; var oy2 = M.GPM[k].grp.position.y;
      M.GPM[k].res.forEach(function (g) { test(g.p[0], g.p[1] + oy2, g.p[2], 2.3, function () { return { kind: 'gp', g: k, chain: g.chain, label: g.label, r: g.r, aa: g.aa, a5: g.a5, rad: 2.8 }; }); });
    });
    if (memGroup.visible) for (var i = 0; i < nH; i++) if (headS[i] > 0.5) test(LH[i * 3], LH[i * 3 + 1], LH[i * 3 + 2], 2.0, function () { return { kind: 'lipid', rad: 2.4 }; });
    return T.get();
  }
  var info = $('#info'), pinned = false, hoverQ = null;
  function showInfo(h, x, y) {
    var d = M.describe(h);
    info.innerHTML = '<div class="t">' + d.title + '</div>' + (d.sub ? '<div class="s">' + d.sub + '</div>' : '') + (d.note ? '<p class="n">' + d.note + '</p>' : '');
    info.hidden = false;
    var w = info.offsetWidth, hh = info.offsetHeight, px = x + 18, py = y + 18;
    if (px + w > W - 10) px = x - w - 18; if (py + hh > H - 10) py = y - hh - 18;
    info.style.transform = 'translate(' + Math.max(8, px) + 'px,' + Math.max(8, py) + 'px)';
    halo.position.set(h.x, h.y, h.z); halo.scale.setScalar(h.rad || 2); halo.visible = true;
    var r = h.kind === 'res' ? h.r : null; if (r !== ST.hoverRes) { ST.hoverRes = r; M.dirty.sc = true; }
  }
  function clearInfo() { info.hidden = true; halo.visible = false; pinned = false; if (ST.hoverRes !== null) { ST.hoverRes = null; M.dirty.sc = true; } }
  function onTap(x, y) { var h = pick(x, y); if (h) { showInfo(h, x, y); pinned = true; } else clearInfo(); }

  // ------------------------------------------------------------------ transitions between structures of the current receptor
  var TR = null, pendingP = null, pendingPlay = null;
  function transitionTo(st, then) {
    FN.active = false; FN.anim = null; pendingP = null; pendingPlay = null;
    M.bake(); M.target(st.conf);
    var lt = {}, gt = {};
    M.LIGNAMES.forEach(function (n) { lt[n] = n === st.lig ? 1 : 0; });
    M.GKS.forEach(function (k) { gt[k] = k === st.gp ? 1 : 0; });
    TR = { t0: performance.now(), dur: RM ? 1 : 2600, lf: Object.assign({}, M.LW), lt: lt, gf: Object.assign({}, M.GW), gt: gt, duF: M.DU, duT: st.du == null ? M.DU : st.du, then: then };
  }
  function instantState(st) {
    FN.active = false; FN.anim = null; TR = null; pendingP = null; pendingPlay = null;
    M.from(st.conf); M.target(st.conf); M.setRW(0);
    M.LIGNAMES.forEach(function (n) { M.LW[n] = n === st.lig ? 1 : 0; });
    M.GKS.forEach(function (k) { M.GW[k] = k === st.gp ? 1 : 0; });
    if (st.du != null) M.DU = st.du;
    M.dirty.lig = true; M.dirty.gp = true;
  }
  function stepTR(now) {
    if (!TR) return;
    var p = clamp((now - TR.t0) / TR.dur, 0, 1);
    M.setRW(sm(0.22, 0.82, p));
    M.LIGNAMES.forEach(function (n) { var a = TR.lf[n], b = TR.lt[n]; M.LW[n] = a + (b - a) * (b > a ? sm(0.6, 1, p) : sm(0, 0.35, p)); });
    M.GKS.forEach(function (k) { var a = TR.gf[k], b = TR.gt[k]; M.GW[k] = a + (b - a) * (b > a ? sm(0.55, 1, p) : sm(0, 0.4, p)); });
    M.DU = TR.duF + (TR.duT - TR.duF) * sm(0.2, 0.8, p);
    M.dirty.lig = true; M.dirty.gp = true;
    if (p >= 1) {
      var th = TR.then; TR = null; if (th) th();
      if (pendingP !== null) { var v = pendingP; pendingP = null; if (FN.active) fnApply(v); else fnEnter(v); }
      if (pendingPlay !== null) { var t = pendingPlay; pendingPlay = null; fnPlayTo(t); }
    }
  }

  // the function timeline: resting -> agonist in -> activation -> G protein docked (or, with no resting structure, the last two steps only)
  var FN = { active: false, p: 0, anim: null };
  var morphInput = $('#morph'), cap = $('#cap'), capKind = '', bindBtn = $('#bind');
  function restConf() { return M.D.rest === null ? M.D.function : M.D.rest; }
  function fnEnter(p) { FN.active = true; TR = null; M.from(restConf()); M.target(M.D.function); fnApply(p); }
  function fnApply(p) {
    FN.p = clamp(p, 0, 1); var hasRest = M.D.rest !== null;
    M.setRW(hasRest ? sm(0.35, 0.85, FN.p) : 0);
    M.LIGNAMES.forEach(function (n) { M.LW[n] = n === M.fn ? 1 : 0; });
    M.DU = hasRest ? sm(0, 0.4, FN.p) : sm(0, 0.55, FN.p);
    var gk = M.gpOf(M.D.function);
    M.GKS.forEach(function (k) { M.GW[k] = k === gk ? sm(0.6, 1, FN.p) : 0; });
    M.dirty.lig = true; M.dirty.gp = true; syncFnUI();
  }
  function fnPlayTo(target) {
    if (TR) { pendingPlay = target; return; }
    if (!FN.active) fnEnter(FN.p);
    if (Math.abs(target - FN.p) < 1e-3) { FN.anim = null; return; }
    FN.anim = { from: FN.p, to: target, t0: performance.now(), dur: RM ? 1 : 1000 + 4200 * Math.abs(target - FN.p) };
  }
  function stepFn(now) {
    if (!FN.anim) return; var a = FN.anim, q = clamp((now - a.t0) / a.dur, 0, 1), e = 0.5 - 0.5 * Math.cos(Math.PI * q);
    fnApply(a.from + (a.to - a.from) * e); if (q >= 1) FN.anim = null;
  }
  function fnCaption(p) {
    var lig = M.fn, LN = disp(lig), gk = M.gpOf(M.D.function), gn = gk ? M.GPM[gk].kind : null, hasRest = M.D.rest !== null, pdb = M.D.confs[M.D.function].key;
    if (p < 0.02) return hasRest ? 'Resting: ' + LN + ' is still in the synapse. The faint copy shows where it will bind.' : 'No resting structure of ' + M.key + ' exists, so it is shown already in its active shape. ' + LN + ' waits outside.';
    if (hasRest) {
      if (p < 0.4) return LN + ' drifts down into the binding pocket. Its path is illustrative.';
      if (p < 0.62) return 'Bound: ' + M.resName(M.resAt('3.32')) + ' grips its amine' + (M.D.facts.tm6 >= 2.5 ? ' while the helices start to move.' : '.');
      if (p < 0.98) return gn ? 'TM6 swings out and ' + gn + ' moves in to dock.' : (M.D.facts.tm6 >= 2.5 ? 'TM6 swings out.' : 'The helices settle around it.');
    } else {
      if (p < 0.55) return LN + ' drifts down into the binding pocket. Its path is illustrative.';
      if (p < 0.98) return 'Bound: ' + M.resName(M.resAt('3.32')) + ' grips its amine' + (gn ? ', and ' + gn + ' moves in to dock.' : '.');
    }
    return (gn ? 'Signalling: ' : 'Bound: ') + LN + ' bound' + (gn ? ', receptor switched on, ' + gn + ' docked' : '') + '. Structure ' + pdb + '.';
  }
  function syncFnUI() {
    morphInput.value = Math.round(FN.p * 1000);
    morphInput.style.setProperty('--mix', '#' + tc.set(TH.inact).lerp(new THREE.Color(TH.act), FN.p).getHexString());
    var t = fnCaption(FN.p);
    if (t !== capKind) { capKind = t; cap.textContent = t; }
    $('#toRest').setAttribute('aria-pressed', String(FN.p < 0.02)); $('#toSig').setAttribute('aria-pressed', String(FN.p > 0.98));
    var bt = FN.p < 0.5 ? 'Bind ' + lowerName(M.fn) : 'Reset'; if (bindBtn.textContent !== bt) bindBtn.textContent = bt;
    morphInput.setAttribute('aria-valuetext', FN.p < 0.02 ? 'Resting' : FN.p > 0.98 ? 'Signalling' : Math.round(FN.p * 100) + ' percent of the way to signalling');
  }
  morphInput.addEventListener('input', function () { FN.anim = null; pendingPlay = null; var v = morphInput.value / 1000; if (TR) { pendingP = v; return; } if (!FN.active) fnEnter(v); else fnApply(v); });
  $('#toRest').addEventListener('click', function () { fnPlayTo(0); });
  $('#toSig').addEventListener('click', function () { fnPlayTo(1); });
  bindBtn.addEventListener('click', function () { fnPlayTo(FN.p < 0.5 ? 1 : 0); });
  function currentBound() {
    if (MODE === 'da') return FN.active && M.DU > 0.985 && (M.D.rest === null || M.RW > 0.97) ? M.fn : '';
    if (MODE === 'drugs') return !TR && curDrug && M.LW[curDrug] > 0.97 && M.RW > 0.97 ? curDrug : '';
    if (MODE === 'cmp') return !TR && M.RW > 0.97 ? cmpLig() : '';
    return '';
  }
  var boundKey = '';

  // ------------------------------------------------------------------ tour content, generated from each receptor's own data
  function R(r, t) { return { r: r, t: t }; }
  function lowerName(n) { var d = disp(n); return /^[A-Z][a-z]/.test(d) ? d.charAt(0).toLowerCase() + d.slice(1) : d; }
  function fmtRange(ds) { var lo = Math.min.apply(null, ds), hi = Math.max.apply(null, ds); return lo === hi ? lo.toFixed(1) : lo.toFixed(1) + '–' + hi.toFixed(1); }
  var LOOPTEXT = {
    D1: ['Long tail, short loop', '<p>D1’s third intracellular loop is short, but its C-terminal tail runs for about 100 residues, none of them resolved in any structure (beads). The tail carries the phosphorylation and palmitoylation sites that tune how quickly the receptor is switched off again.</p>'],
    D2: ['The floppy third loop, and two isoforms', '<p>Between TM5 and TM6 hangs a loop of about 140 residues that none of these structures resolve: the crystals replaced it with fusion proteins, and it is invisible in the cryo-EM maps.</p><p>Alternative splicing of exon 6 decides whether 29 of its residues (242–270, highlighted) are made. The long form, D2L, is thought to act mainly after the synapse and the short form, D2S, mainly as the presynaptic autoreceptor.</p><div class="inline-iso"><button type="button" class="pill" data-iso="L">Show D2L</button><button type="button" class="pill" data-iso="S">Show D2S</button></div>'],
    D3: ['A long third loop', '<p>Between TM5 and TM6 hangs a loop of nearly 100 residues that none of these structures resolve: the crystal replaced it with T4 lysozyme. D3’s C-terminus, by contrast, is tiny and ends right after helix 8.</p>'],
    D4: ['The variable loop', '<p>D4’s third intracellular loop carries a 16-residue repeat present in 2 to 11 copies between people, and the 7-repeat form has been linked to ADHD. None of the loop is resolved (beads). Residues are numbered as in the common 4-repeat form.</p>'],
    D5: ['Long tail, long loops', '<p>D5’s C-terminal tail runs for about 100 residues, none resolved (beads), and its second extracellular loop is unusually long, with 31 residues missing from the structure.</p>']
  };
  var SIGNOTE = {
    D1: 'In the striatum D1 receptors sit on the neurons of the “direct” pathway that promotes movement, and in the cortex they support working memory.',
    D2: 'At presynaptic D2 autoreceptors this curbs further dopamine release.', D3: 'D3 is dense in the nucleus accumbens, where this signal shapes reward and motivation.',
    D4: 'D4 is dense in the prefrontal cortex, where this signal shapes attention and working memory.', D5: 'D5 does the same in its own territories, such as the hippocampus and thalamus, and shows more activity than D1 even without an agonist.',
    '5-HT1A': 'As the autoreceptor on raphe neurons it brakes serotonin release; postsynaptically, in the cortex and hippocampus, it calms excitability. Buspirone works here, and antidepressants slowly desensitise the autoreceptor.',
    '5-HT1B': 'On serotonin terminals it acts as an autoreceptor; on cranial blood vessels and trigeminal nerve endings it is a target of the triptans for migraine.',
    '5-HT1D': 'On trigeminal nerve endings this signal quietens the release of pain-related peptides, part of how triptans stop a migraine.',
    '5-HT1E': 'What 5-HT1E does in the cortex and hippocampus is still unclear: no selective drug exists to probe it.',
    '5-HT1F': 'On trigeminal neurons this signal damps pain signalling without constricting blood vessels, the basis of lasmiditan.',
    '5-HT2A': 'On cortical pyramidal neurons this signal raises excitability and is the basis of the psychedelic experience; blocking it is part of what makes antipsychotics “atypical”.',
    '5-HT2B': 'On heart valves and pulmonary vessels this signal drives cell growth, which is why drugs that activate 5-HT2B, such as fenfluramine, caused valve disease.',
    '5-HT2C': 'In the hypothalamus this signal suppresses appetite, the basis of the withdrawn weight-loss drug lorcaserin. 5-HT2C is also unusual in being edited at the RNA level.',
    '5-HT4': 'In the gut this signal speeds motility, which prucalopride exploits for constipation; in the hippocampus it supports memory.',
    '5-HT5A': 'Its role is still being worked out; it is found in the cortex and hippocampus and has no approved drug.',
    '5-HT6': 'Found almost only in the brain, where it tunes acetylcholine and glutamate release; 5-HT6 antagonists have been tried, so far without success, for Alzheimer’s disease.',
    '5-HT7': 'In the suprachiasmatic nucleus this signal shifts the circadian clock; 5-HT7 also shapes mood and body temperature, and is blocked by the antidepressant vortioxetine.'
  };
  function stopsFor(M) {
    var MD = M.D, F = MD.facts, rx = M.key, mono = M.mono, lig = MD.funcLig, L = MD.lig[lig], LN = disp(lig), ln = lowerName(lig);
    var gk = M.gpOf(MD.function), G = gk ? MD.gprot[gk] : null, gn = G ? G.kind : null, hasRest = MD.rest !== null, gfam = MD.gp;
    var rn = function (p) { return M.resName(M.resAt(p)); }, d332 = M.resAt('3.32'), byRes = {};
    L.ix.forEach(function (p) { var r = M.SC.res[p[1]]; if (!(r in byRes) || p[2] < byRes[r]) byRes[r] = p[2]; });
    var others = Object.keys(byRes).map(Number).filter(function (r) { return r !== d332; }).sort(function (a, b) { return byRes[a] - byRes[b]; });
    var polarWord = lig === 'dopamine' ? 'Its catechol hydroxyls sit' : lig === 'serotonin' ? 'Its hydroxyl and indole N–H sit' : 'Its other polar groups sit';
    var hb = others.length ? ' ' + polarWord + ' within hydrogen-bonding distance of ' + listJoin(others.map(function (r) { return M.resName(r); })) + ' (' + fmtRange(others.map(function (r) { return byRes[r]; })) + '\u00a0Å).' : '';
    var depth = Math.round(19.2 - M.EP[2][1]), restPdb = hasRest ? MD.confs[MD.rest].key : null, restLig = hasRest ? MD.confs[MD.rest].name : null;
    var standin = lig === mono ? '' : 'No ' + mono + '-bound structure of ' + rx + ' exists' + (rx === '5-HT2A' ? ' with a G protein' : '') + ', so ' + ln + ', ' + (STANDIN[lig] || 'a drug that activates it') + ', stands in for it. ';
    var stops = [];
    if (hasRest) stops.push({ p: 0, cam: 'arrive', sc: [], labels: [], title: LN + ' arrives',
      body: '<p>' + rx + ' sits in the membrane of a neuron, its seven helices (TM1 to TM7) crossing from the synapse to the cytoplasm. Here it is resting, in its inactive shape, taken from ' + restPdb + ' with ' + lowerName(restLig) + ' removed.</p><p>The amber molecule is ' + ln + ', not yet bound. ' + standin + 'The faint copy inside the receptor marks its binding site, about ' + depth + '\u00a0Å below the membrane surface, and the dotted line shows a route in (illustrative). Press Bind ' + ln + ' to watch it dock.</p>' });
    else stops.push({ p: 0, cam: 'arrive', sc: [], labels: [], title: 'Switched on by ' + ln,
      body: '<p>No structure of ' + rx + ' in its resting state has been solved, so the receptor is shown already in its active shape, from ' + L.pdb + '. Its seven helices cross the membrane from the synapse to the cytoplasm.</p><p>The amber molecule is ' + ln + ', not yet bound. ' + standin + 'The faint copy inside marks its binding site, about ' + depth + '\u00a0Å below the membrane surface, and the dotted line shows a route in (illustrative). Press Bind ' + ln + ' to bring it in' + (gn ? ' and dock ' + gn : '') + '.</p>' });
    stops.push({ p: 1, cam: 'pocket', sc: L.contacts, labels: [R(d332)].concat(others.slice(0, 4).map(function (r) { return R(r); })), title: LN + ' docks',
      body: '<p>' + LN + '’s protonated amine pairs with ' + rn('3.32') + ' on TM3 (' + L.asp.toFixed(1) + '\u00a0Å).' + hb + '</p><p>' + standin + 'The dashed lines are its polar contacts. The pose comes straight from ' + L.pdb + '.</p>' });
    if (hasRest && F.tm6 >= 2.5) {
      var lockT = F.lock != null && F.lock <= 4.5 ? ' The ionic lock between ' + rn('3.50') + ' of the DRY motif and ' + rn('6.30') + (F.lock_f != null ? ' breaks, opening from ' + F.lock + '\u00a0Å to ' + Math.round(F.lock_f) + '\u00a0Å.' : ' (' + F.lock + '\u00a0Å at rest) breaks.') : '';
      var yT = F.y753 != null && F.y753 >= 1.5 ? ' and ' + rn('7.53') + ' of NPxxY, which moves ' + F.y753 + '\u00a0Å' : '';
      var primed = restLig && DRUGTEXT[restLig] && DRUGTEXT[restLig].act === 'act' ? ' compared with the ' + lowerName(restLig) + ' structure, an agonist-bound crystal whose outer half had already started to move' : '';
      stops.push({ p: 1, cam: 'switch', sc: ['2.50', '3.40', '3.49', '3.50', '3.51', '5.50', '6.30', '6.44', '6.48', '6.50', '7.49', '7.50', '7.53'].map(M.resAt), labels: [R(M.resAt('3.50')), R(M.resAt('6.30')), R(M.resAt('6.48')), R(M.resAt('6.44')), R(M.resAt('7.53')), R(M.resAt('5.50'))], title: 'Switching on',
        body: '<p>The grip on TM5 and TM6 at the top of the pocket propagates down the helices, and the cytoplasmic end of TM6 swings out by about ' + Math.round(F.tm6) + '\u00a0Å' + primed + '.' + lockT + '</p><p>Conserved micro-switches repack on the way: ' + rn('6.48') + ' of CWxP, the PIF motif (' + rn('5.50') + ', ' + rn('3.40') + ', ' + rn('6.44') + ')' + yT + '.</p>' });
    }
    if (G) {
      var couple = gfam === 'Gs' ? rx + ' couples to Gs' + (M.family === 'dopamine' ? ', and in the striatum to its close relative Golf' : '') + '.' : gfam === 'Gq' ? rx + ' couples to Gq and G11.' : rx + ' couples to Gi and Go proteins.';
      var which = gn === 'Go' ? 'This structure has Go' + (G.mini ? ', as an engineered mini-Go' : rx === 'D2' ? ', one of the most abundant G proteins in the brain' : '') + '.' : gn === 'Gq' ? 'This structure has an engineered mini-Gq: the GTPase domain of Gαq, with its helical domain removed, on a Gβγ dimer.' : gn === 'Gs' ? '' : 'This structure has Gi1.';
      var extra = gn === 'Gs' ? 'The Gs here was captured with the nanobody Nb35, which is left out. Its helical domain is only partly resolved.' : gn === 'Go' && rx === 'D2' ? 'Unusually, both domains of Gαo are resolved, including the helical domain that is normally too mobile to see.' : G.mini ? 'The stabilising antibody scFv16 is left out.' : 'Gα’s helical domain moves too much to be resolved, so only its Ras-like domain is shown; the stabilising antibody scFv16 is left out.';
      stops.push({ p: 1, cam: 'go', sc: G.a5, labels: [R(M.resAt('3.50'))].concat(G.a5.filter(function (r) { return r !== M.resAt('3.50'); }).slice(0, 3).map(function (r) { return R(r); })), title: gn + ' docks',
        body: '<p>' + [couple, which, 'The α5 helix at the tip of Gα slots into the cavity opened by TM6, reaching ' + rn('3.50') + ' (' + G.r350 + '\u00a0Å) and packing against intracellular loop 2.'].filter(Boolean).join(' ') + '</p><p>' + extra + '</p>' });
    }
    var dock = G ? 'Docking pries GDP out of ' : 'Once ' + (gfam === 'Gs' ? 'Gs' : gfam === 'Gq' ? 'Gq' : 'a Gi or Go protein') + ' docks, the receptor pries GDP out of ';
    var sig = gfam === 'Gs' ? '<p>' + dock + 'Gαs, which takes up GTP and separates from Gβγ. Gαs switches on adenylyl cyclase, raising cAMP, which activates protein kinase A' + (M.family === 'dopamine' ? ' and, in striatal neurons, the signalling hub DARPP-32' : '') + '.</p>'
      : gfam === 'Gq' ? '<p>' + dock + 'Gαq, which takes up GTP and separates from Gβγ. Gαq switches on phospholipase Cβ, which splits PIP2 into IP3 and diacylglycerol: IP3 releases calcium from internal stores and diacylglycerol activates protein kinase C.</p>'
      : '<p>' + dock + 'Gα, which then takes up GTP and separates from Gβγ. Gαi/o subunits inhibit adenylyl cyclase and lower cAMP, while the freed Gβγ opens GIRK potassium channels and damps voltage-gated calcium channels, quietening the neuron.</p>';
    var noG = !G ? '<p>No structure catches ' + rx + ' with ' + (lig === mono ? mono + ' and a G protein' : 'a G protein') + (rx === '5-HT2A' ? ': the Gq-coupled receptor, captured with the research psychedelic 25-CN-NBOH, is in the Drugs tab.' : ' yet, so the G protein is not shown here.') + '</p>' : '';
    stops.push({ p: 1, cam: G ? 'signal' : 'switch', sc: [], labels: [], title: 'What the signal does', body: sig + '<p>' + (SIGNOTE[rx] || '') + '</p>' + (gn === 'Go' && rx === 'D2' ? '<p>This Gαo carries K46E, a GNAO1 mutation found in a neurodevelopmental disorder. It holds the complex in this nucleotide-free moment, which made it easier to capture.</p>' : '') + noG });
    var lt = LOOPTEXT[rx];
    if (!lt) {
      var parts = [];
      M.chains.forEach(function (c) { if (c.isoS) return; var nm = c.key === 'nterm' ? 'the N-terminus' : c.key === 'cterm' ? 'the C-terminal tail' : (segNameS(MD.seg, c.res[0]) || 'a loop').toLowerCase(); parts.push(nm + ' (' + c.n + (c.n === 1 ? ' residue' : ' residues') + ')'); });
      lt = ['Loops and tails', '<p>Parts missing from every structure of ' + rx + ' are drawn as beads on illustrative paths: ' + listJoin(parts) + '. The fusion proteins and antibodies used to solve the structures are left out.</p>'];
    }
    stops.push({ p: 0, cam: 'loops', sc: [], labels: [], insert: rx === 'D2', ghosts: true, title: lt[0], body: lt[1] });
    return stops;
  }
  var STOPS = [], stopIdx = 0, stepsEl = $('#steps');
  function buildTour() {
    STOPS = stopsFor(M); stopIdx = Math.min(stopIdx, STOPS.length - 1); stepsEl.innerHTML = ''; stepsEl.style.gridTemplateColumns = 'repeat(' + STOPS.length + ', 1fr)';
    STOPS.forEach(function (s, i) {
      var b = document.createElement('button'); b.type = 'button'; b.title = s.title; b.setAttribute('aria-label', 'Stop ' + (i + 1) + ': ' + s.title);
      b.addEventListener('click', function () { setStop(i); }); stepsEl.appendChild(b);
    });
    var gk = M.gpOf(M.D.function), gn = gk ? M.GPM[gk].kind : null;
    $('#toRest .e2').textContent = lowerName(M.fn) + ' outside'; $('#toSig .e2').textContent = gn ? 'bound, ' + gn + ' docked' : 'bound';
  }
  function applyStopVisuals(i) {
    var s = STOPS[i];
    ST.highlighted = new Set(s.sc); ST.hlInsert = !!s.insert; M.recolorGhosts();
    if (s.ghosts && !ST.showGhost) setToggle('t-ghost', true);
    setResLabels(s.labels); M.dirty.sc = true; M.dirty.ghost = true;
  }
  function renderStop(i) {
    stopIdx = i; var s = STOPS[i];
    $('#stop-title').textContent = s.title; $('#stop-body').innerHTML = s.body;
    $('#stop-count').textContent = (i + 1) + ' of ' + STOPS.length;
    $('#prev').disabled = i === 0; $('#next').textContent = i === STOPS.length - 1 ? 'Start again' : 'Next';
    Array.prototype.forEach.call(stepsEl.children, function (b, k) { if (k === i) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); b.classList.toggle('done', k < i); });
    syncIsoButtons();
  }
  function setStop(i, instant) {
    var s = STOPS[i], pn = document.querySelector('.panes'); if (pn) pn.scrollTop = 0;
    renderStop(i); applyStopVisuals(i);
    if (instant) { if (!FN.active) fnEnter(s.p); else fnApply(s.p); } else fnPlayTo(s.p);
    flyTo(camFor(s.cam), instant);
  }
  $('#next').addEventListener('click', function () { setStop((stopIdx + 1) % STOPS.length); });
  $('#prev').addEventListener('click', function () { if (stopIdx > 0) setStop(stopIdx - 1); });
  $('#stop-body').addEventListener('click', function (e) { var b = e.target.closest('[data-iso]'); if (b) setIso(b.getAttribute('data-iso')); });
  function syncIsoButtons() { document.querySelectorAll('[data-iso]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-iso') === ST.iso)); }); }

  // ------------------------------------------------------------------ drugs of the current receptor
  var curDrug = 'risperidone', listEl = $('#drug-list');
  function drugsFor(M) { return M.LIGNAMES.filter(function (n) { return n !== M.mono; }); }
  function buildDrugs() {
    var names = drugsFor(M); if (names.indexOf(curDrug) < 0) curDrug = names[0] || null;
    listEl.innerHTML = '';
    names.forEach(function (n) {
      var d = DRUGTEXT[n] || { cls: '', act: 'act' }, lab = document.createElement('label'); lab.className = 'drug';
      lab.innerHTML = '<input type="radio" name="drug" value="' + n + '"' + (n === curDrug ? ' checked' : '') + '><span class="card"><span class="nm">' + disp(n) + '</span><span class="cl">' + d.cls + '</span><span class="badge ' + (d.act === 'block' ? 'block">Blocks' : d.act === 'partial' ? 'act">Partly activates' : 'act">Activates') + '</span></span>';
      lab.querySelector('input').addEventListener('change', function (e) { if (e.target.checked) applyDrug(n, true); });
      listEl.appendChild(lab);
    });
    $('#drug-intro').textContent = names.length > 1 ? 'Each drug is shown in its own experimental structure of ' + M.key + ', sitting in the pocket ' + M.mono + ' uses.' : names.length === 1 ? 'Only one drug-bound structure of ' + M.key + ' has been solved so far.' : 'No drug-bound structure of ' + M.key + ' has been solved yet; its only structure has ' + M.mono + ' itself.';
    $('#cmp-text').textContent = M.fn === M.mono ? 'Show ' + M.mono + '’s position' : 'Show where the ' + M.mono + ' mimic sits';
    $('#drug-detail').hidden = !names.length;
  }
  function renderDrug(n) {
    var d = DRUGTEXT[n] || { cls: '', act: 'act', body: '' }, L = M.D.lig[n], rn = function (p) { return M.resName(M.resAt(p)); }, body = (M.key === 'D2' && D2TEXT[n]) || d.body;
    $('#drug-title').textContent = disp(n);
    $('#drug-meta').textContent = d.cls + '. ' + (d.act === 'block' ? 'Blocks the receptor (antagonist).' : d.act === 'partial' ? 'Partly activates the receptor (partial agonist).' : 'Activates the receptor (agonist).');
    var seen = {}, polar = [];
    L.ix.forEach(function (p) { var r = M.SC.res[p[1]]; if (!(r in seen)) { seen[r] = 1; polar.push(M.resName(r) + ' (' + p[2].toFixed(1) + '\u00a0Å)'); } });
    var auto = '<p>' + (L.asp != null ? 'In ' + L.pdb + ' its amine sits ' + L.asp.toFixed(1) + '\u00a0Å from ' + rn('3.32') + '. ' : '') + (polar.length ? 'Dashed lines mark its polar contacts: ' + listJoin(polar) + '.' : '') + '</p>';
    $('#drug-body').innerHTML = body + auto;
    $('#drug-chips').innerHTML = L.contacts.map(function (r) { return '<span>' + M.resHTML(r) + '</span>'; }).join('');
    $('#drug-src').textContent = 'Structure ' + L.pdb + ' (' + L.method + '), ' + L.cite + '.';
  }
  function drugLabels(n) {
    var L = M.D.lig[n], seen = new Set(), out = [];
    L.ix.forEach(function (p) { var r = M.SC.res[p[1]]; if (!seen.has(r)) { seen.add(r); out.push(r); } });
    L.contacts.forEach(function (r) { if (out.length < 5 && !seen.has(r)) { seen.add(r); out.push(r); } });
    return out.slice(0, 5).map(function (r) { return R(r); });
  }
  function applyDrug(n, fly, instant) {
    curDrug = n; emit(); if (MODE !== 'drugs' || !n) return;
    var L = M.D.lig[n], st = { conf: L.conf, lig: n, gp: M.gpOf(L.conf), du: 1 };
    if (instant) instantState(st); else transitionTo(st);
    ST.highlighted = new Set(L.contacts); ST.hlInsert = false; M.recolorGhosts();
    setResLabels(drugLabels(n)); M.dirty.sc = true;
    $('#cmp-wrap').hidden = n === M.fn;
    renderDrug(n);
    if (fly) flyTo(CAMS.drugs, instant);
  }
  var cmpOn = false;
  $('#t-cmp').addEventListener('change', function () { cmpOn = this.checked; });

  // ------------------------------------------------------------------ labels
  var showLabels = true, resLabs = [];
  function setResLabels(list) { resLabs.forEach(function (x) { x.el.remove(); }); resLabs = list.map(function (o) { return { r: o.r, el: mkLab('res', o.t || M.resHTML(o.r)) }; }); }
  function proj(x, y, z) {
    PV.set(x, y, z).project(camera);
    if (PV.z > 1 || PV.z < -1 || Math.abs(PV.x) > 1.3 || Math.abs(PV.y) > 1.3) return null;
    return [(PV.x * 0.5 + 0.5) * W, (-PV.y * 0.5 + 0.5) * H];
  }
  function setLab(el, sp) {
    if (sp) el.style.transform = 'translate3d(' + sp[0].toFixed(1) + 'px,' + sp[1].toFixed(1) + 'px,0) translate(-50%,-50%)';
    var show = !!sp; if (show !== el._v) { el.style.opacity = show ? '1' : '0'; el._v = show; }
  }
  var ZONE = { out: mkLab('zone', 'Extracellular side'), inn: mkLab('zone', 'Cytoplasm') };
  function updateLabels() {
    camRight.setFromMatrixColumn(camera.matrixWorld, 0);
    var steep = Math.abs(Math.cos(ctl.phi)) > 0.72, vw = 2 * ctl.radius * Math.tan(FOV * Math.PI / 360) * (freeW / H);
    var bx = ctl.target.x + camRight.x * vw * 0.34, bz = ctl.target.z + camRight.z * vw * 0.34;
    setLab(ZONE.out, showLabels && !steep ? proj(bx, 31, bz) : null); setLab(ZONE.inn, showLabels && !steep ? proj(bx, -31, bz) : null);
    var items = [], near = ctl.radius < 125 * distMul, LP = M.labPA.cur;
    M.LABS.forEach(function (L) {
      if (L.kind === 'zone') return;
      var show = showLabels, p = [LP[L.i * 3], LP[L.i * 3 + 1], LP[L.i * 3 + 2]];
      if (L.key === 'Nterm' || L.key === 'Cterm' || /^[EI]CL/.test(L.key)) show = show && ST.showGhost && !ST.cmp;
      if (Math.hypot(p[0] - ctl.target.x, p[1] - ctl.target.y, p[2] - ctl.target.z) > 0.62 * ctl.radius / distMul) show = false;
      items.push({ o: L, sp: show ? proj(p[0], p[1], p[2]) : null });
    });
    M.LIGNAMES.forEach(function (n) {
      var L = M.LIGLAB[n], show = showLabels && ligOn(M, n) && M.LW[n] > 0.6 && (near || (n === M.fn && M.DU < 0.5));
      var p = n === M.fn ? [M.fnCen[0], M.fnCen[1] + 5, M.fnCen[2]] : L.pos;
      items.push({ o: L, sp: show ? proj(p[0], p[1], p[2]) : null });
    });
    items.push({ o: M.SITELAB, sp: MODE === 'da' && showLabels && ST.showMono && M.OVW > 0.5 && near ? proj(M.SITELAB.pos[0], M.SITELAB.pos[1], M.SITELAB.pos[2]) : null });
    M.GKS.forEach(function (k) {
      var show = showLabels && M.GW[k] > 0.75 && ctl.radius > 130 * distMul, oy = M.GPM[k].grp.position.y;
      M.GPM[k].labs.forEach(function (L) { items.push({ o: L, sp: show ? proj(L.pos[0], L.pos[1] + oy, L.pos[2]) : null }); });
    });
    resLabs.forEach(function (x) { var p = M.resLabelPos(x.r); items.push({ o: x, sp: showLabels && p ? proj(p[0], p[1], p[2]) : null }); });
    items.forEach(function (it) { if (it.sp && !it.o.w) it.o.w = it.o.el.offsetWidth || 50; });
    for (var k = 0; k < 6; k++) for (var i = 0; i < items.length; i++) for (var j = i + 1; j < items.length; j++) {
      var a = items[i].sp, b = items[j].sp; if (!a || !b) continue;
      var ox = (items[i].o.w + items[j].o.w) / 2 + 4 - Math.abs(a[0] - b[0]), oy = 21 - Math.abs(a[1] - b[1]);
      if (ox > 0 && oy > 0) { var push = (oy / 2 + 0.5) * (a[1] <= b[1] ? -1 : 1); a[1] += push; b[1] -= push; }
    }
    items.forEach(function (it) { setLab(it.o.el, it.sp); });
  }
  function hideModelLabels(m) { m.allLabelEls().forEach(function (el) { setLab(el, null); }); }
