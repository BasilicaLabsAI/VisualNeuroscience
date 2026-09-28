
  // ------------------------------------------------------------------ Compare: every receptor of the family in a comparable agonist-bound state
  var FAMILY = 'dopamine', cmpView = 'whole', MODE = 'da';
  var SUBTXT = {
    D1: '<p>The most abundant dopamine receptor in the brain, dense in the striatum and prefrontal cortex, where it supports reward learning, movement and working memory. It couples to Gs (Golf in the striatum) and raises cAMP.</p><p>Fenoldopam, a D1 agonist that stays out of the brain, is given intravenously for severe high blood pressure.</p>',
    D2: '<p>The main target of antipsychotics and of Parkinson’s drugs, and the autoreceptor that brakes dopamine release. It couples to Gi/o and lowers cAMP.</p><p>It is also the best-studied subtype, with resting, dopamine-bound and several drug-bound structures.</p>',
    D3: '<p>Concentrated in limbic areas such as the nucleus accumbens, D3 binds dopamine more tightly than D2 does. Pramipexole and ropinirole favour it, and the antipsychotic cariprazine is a D3-preferring partial agonist.</p><p>At all 17 pocket positions below, D3 matches D2 exactly, which is why subtype-selective drugs are so hard to design.</p>',
    D4: '<p>Found mainly in the prefrontal cortex. Its third intracellular loop carries a 16-residue repeat present in 2 to 11 copies between people, and the 7-repeat form has been linked to ADHD. The antipsychotic clozapine binds D4 relatively tightly.</p><p>Residues are numbered as in the common 4-repeat form.</p>',
    D5: '<p>A D1-like receptor with higher affinity for dopamine than D1, found at lower levels, including in the hippocampus and thalamus. Like D1 it couples to Gs and raises cAMP, and it is more active than D1 even without an agonist.</p><p>Its pocket matches D1’s at every position below.</p>',
    '5-HT1A': '<p>The best-known serotonin receptor: the autoreceptor on raphe neurons that brakes serotonin release, and a postsynaptic receptor across the cortex, hippocampus and amygdala. It couples to Gi/o.</p><p>Buspirone is a partial agonist here, and the slow desensitisation of the autoreceptor is one explanation for the delayed action of antidepressants.</p>',
    '5-HT1B': '<p>An autoreceptor on serotonin terminals and a receptor on cranial blood vessels and trigeminal nerve endings, where the triptans act to stop migraine. It couples to Gi/o.</p><p>Its ergotamine structure, in 2013, was the first of any serotonin receptor.</p>',
    '5-HT1D': '<p>The triptans’ other target, found on trigeminal nerve endings and cerebral vessels. It couples to Gi/o and is so similar to 5-HT1B in the pocket that no drug separates the two cleanly.</p>',
    '5-HT1E': '<p>The least understood serotonin receptor, found in the cortex and hippocampus. It couples to Gi/o, has no selective drug, and even its natural role is unclear.</p>',
    '5-HT1F': '<p>Found on trigeminal neurons. Lasmiditan, the first “ditan”, targets it to treat migraine without constricting blood vessels. It couples to Gi/o.</p>',
    '5-HT2A': '<p>The receptor behind psychedelics: LSD, psilocin and mescaline all activate it on cortical pyramidal neurons. Atypical antipsychotics such as risperidone and clozapine block it. It couples to Gq/11 and raises calcium.</p><p>It is the best-studied serotonin receptor, with resting, serotonin-bound, psychedelic-bound and Gq-coupled structures.</p>',
    '5-HT2B': '<p>Found on heart valves, pulmonary vessels and in the gut. Drugs that activate it, such as fenfluramine and the ergots, caused heart-valve disease, so new medicines are now screened against it. It couples to Gq/11.</p>',
    '5-HT2C': '<p>A brain receptor that suppresses appetite and shapes mood; lorcaserin targeted it for weight loss before being withdrawn. Its mRNA is edited at up to five sites, tuning how strongly it couples to Gq/11.</p>',
    '5-HT4': '<p>Found in the gut, where it speeds motility, and in the hippocampus. Prucalopride activates it to treat chronic constipation. It couples to Gs and raises cAMP.</p>',
    '5-HT5A': '<p>A poorly understood receptor of the cortex and hippocampus with no approved drug. It couples to Gi/o.</p>',
    '5-HT6': '<p>Found almost only in the brain, in the striatum, cortex and hippocampus, where it tunes acetylcholine and glutamate release. Antagonists were tried for Alzheimer’s disease without success. It couples to Gs.</p>',
    '5-HT7': '<p>Found in the thalamus, hypothalamus and suprachiasmatic nucleus, where it helps set the circadian clock, and it shapes mood and body temperature. It couples to Gs.</p>'
  };
  var CMPINTRO = {
    dopamine: 'All five human dopamine receptors bound to the same drug, rotigotine, in one study. Same ligand, same method, so the differences are the receptors’ own. Use the buttons above to switch between them.',
    serotonin: 'The twelve serotonin receptors that are GPCRs, each in its agonist-bound state: serotonin itself where such a structure exists, a stand-in agonist elsewhere. Use the buttons above to switch between them. 5-HT3 is an ion channel, not a GPCR, and is not included.'
  };
  var TABLENOTE = {
    dopamine: 'Residues around the drug, by Ballesteros–Weinstein position. Shaded rows differ between subtypes. D1 and D5 share every one of these, and so do D2 and D3. The D1-like pair carries lysine at 2.61, tryptophan at 3.28 and asparagine at 6.55, where the D2-like three have hydrophobic residues and a histidine.',
    serotonin: 'Residues around the agonist, by Ballesteros–Weinstein position. Shaded rows differ between subtypes. The anchor Asp3.32 and the aromatic wall at 6.51–6.52 are shared by all twelve; most of the variation is on TM5 and at the top of TM7.'
  };
  function cmpConf() { return M.D.cmp; }
  function cmpLig() { var c = cmpConf(); for (var n in M.D.lig) if (M.D.lig[n].conf === c) return n; return M.fn; }
  function cmpState() { var c = cmpConf(); return { conf: c, lig: cmpLig(), gp: M.gpOf(c), du: 1 }; }
  function buildTable() {
    var fam = D.families[FAMILY], keys = fam.rx, pos = fam.pocketPos;
    var h = '<thead><tr><th scope="col">Position</th>' + keys.map(function (k) { return '<th scope="col" data-col="' + k + '">' + RXINFO[k].short + '</th>'; }).join('') + '</tr></thead><tbody>';
    pos.forEach(function (p) {
      var letters = keys.map(function (k) { return fam.table[k][p].charAt(0); }), diff = letters.some(function (l) { return l !== letters[0]; });
      h += '<tr' + (diff ? ' class="diff"' : '') + '><th scope="row">' + p + '</th>' + keys.map(function (k) { var v = fam.table[k][p]; return '<td data-col="' + k + '" title="' + k + ' ' + (AA3[v.charAt(0)] || v.charAt(0)) + v.slice(1) + '">' + v + '</td>'; }).join('') + '</tr>';
    });
    $('#pocket').innerHTML = h + '</tbody>'; $('#pocket').classList.toggle('wide', keys.length > 6);
    $('#cmp-intro').textContent = CMPINTRO[FAMILY]; $('#table-note').textContent = TABLENOTE[FAMILY];
  }
  function renderSub(k) {
    var m = D.models[k], f = m.cmpfacts, cf = m.confs[m.cmp];
    document.querySelectorAll('#pocket [data-col]').forEach(function (c) { c.classList.toggle('cur', c.getAttribute('data-col') === k); });
    $('#sub-title').textContent = k + ' receptor';
    $('#sub-meta').textContent = RXINFO[k].fam + '. ' + GPMETA[m.gp];
    $('#sub-body').innerHTML = SUBTXT[k] || '';
    var rows = [['Gene', m.gene + ', ' + m.length + ' residues'], ['Helices identical to ' + f.ref, k === f.ref ? 'Reference' : f.ident + '%'],
      ['Loop 3 and tail', f.icl3 + ' and ' + f.ctail + ' residues']];
    if (f.tm6 != null) rows.push(['TM6 inner end', f.tm6.toFixed(1) + '\u00a0Å from resting ' + f.restref]);
    rows.push(['Shown here', cf.key + ' with ' + lowerName(cf.name) + ', ' + cf.method]);
    $('#sub-facts').innerHTML = rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('');
  }
  function setCmpView(v, instant) {
    cmpView = v; $('#f-whole').setAttribute('aria-pressed', String(v === 'whole')); $('#f-pocket').setAttribute('aria-pressed', String(v === 'pocket'));
    flyTo(v === 'whole' ? (M.gpOf(cmpConf()) ? camFor('go') : CAMS.overview) : CAMS.drugs, instant);
  }
  $('#f-whole').addEventListener('click', function () { setCmpView('whole'); });
  $('#f-pocket').addEventListener('click', function () { setCmpView('pocket'); });
  function cmpLabels() {
    var fam = D.families[FAMILY], out = [];
    ['3.32', '5.42', '5.46', '6.55', '7.39'].forEach(function (p) { if (fam.pocketPos.indexOf(p) >= 0 || p === '3.32') out.push(R(M.resAt(p))); });
    return out;
  }
  function enterCmp(instant) {
    FN.anim = null; FN.active = false; ST.cmp = true; clearInfo();
    var st = cmpState(); if (instant) instantState(st); else transitionTo(st);
    var fam = D.families[FAMILY], pocket = new Set(M.D.lig[st.lig].contacts.concat(fam.pocketPos.map(M.resAt)));
    ST.highlighted = pocket; ST.hlInsert = false; M.recolorGhosts(); setResLabels(cmpLabels()); M.dirty.sc = true; M.dirty.ghost = true;
    renderSub(RX); setCmpView(cmpView, instant);
  }
  function leaveCmp() { ST.cmp = false; M.dirty.ghost = true; M.dirty.sc = true; clearInfo(); }

  // ------------------------------------------------------------------ the family and receptor selectors, shared by every tab
  var lastRX = { dopamine: 'D2', serotonin: '5-HT2A' };
  function buildRxRow() {
    var row = $('#rxpick'), fam = D.families[FAMILY]; row.innerHTML = '';
    row.classList.toggle('many', fam.rx.length > 6);
    fam.rx.forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-rx', k); b.setAttribute('aria-label', k); b.textContent = RXINFO[k].short; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { setReceptor(k); }); row.appendChild(b);
    });
  }
  function rxCaption() { $('#rx-cap').textContent = RX + ', the ' + M.D.gene + ' gene, ' + M.D.length + ' residues. ' + RXINFO[RX].fam + '. ' + GPMETA[M.D.gp]; }
  function setReceptor(k, instant) {
    if (k === RX && M) return;
    var prev = M; RX = k; lastRX[FAMILY] = k;
    document.querySelectorAll('[data-rx]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-rx') === k)); });
    clearInfo(); FN.anim = null; TR = null; pendingP = null; pendingPlay = null;
    if (prev) { prev.group.visible = false; hideModelLabels(prev); }
    M = getModel(k); M.group.visible = true; M.recolor();
    buildTour(); renderStop(stopIdx); buildDrugs(); rxCaption();
    document.querySelectorAll('.d2only').forEach(function (el) { el.hidden = !M.hasIso; });
    if (MODE === 'da') { fnEnter(STOPS[stopIdx].p); setStop(stopIdx, instant); }
    else if (MODE === 'drugs') applyDrug(curDrug, false, true);
    else if (MODE === 'cmp') enterCmp(true);
    M.dirty.sc = true; M.dirty.ghost = true; M.dirty.lig = true; M.dirty.gp = true; emit();
  }
  function setFamily(f, instant) {
    if (f === FAMILY && M) return;
    FAMILY = f;
    document.querySelectorAll('[data-fam]').forEach(function (b) { var on = b.getAttribute('data-fam') === f; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    buildRxRow(); buildTable();
    $('#tab-da').textContent = FAMINFO[f].name;
    setReceptor(lastRX[f], instant);
  }
  var famBtns = Array.prototype.slice.call(document.querySelectorAll('[data-fam]'));
  famBtns.forEach(function (b, i) {
    b.addEventListener('click', function () { setFamily(b.getAttribute('data-fam')); });
    b.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var n = famBtns[(i + (e.key === 'ArrowRight' ? 1 : famBtns.length - 1)) % famBtns.length]; setFamily(n.getAttribute('data-fam')); n.focus(); } });
  });

  // ------------------------------------------------------------------ modes and tabs
  function setMode(m) {
    if (m === MODE) return; var prev = MODE; MODE = m;
    if (prev === 'cmp') leaveCmp();
    M.recolor(); M.dirty.lig = true;
    if (m === 'cmp') { enterCmp(false); return; }
    if (m === 'drugs') { FN.anim = null; applyDrug(curDrug, true); }
    else {
      var p0 = FN.p >= 0.5 ? 1 : 0, c = p0 ? M.D.function : restConf();
      transitionTo({ conf: c, lig: M.fn, gp: p0 ? M.gpOf(M.D.function) : null, du: p0 }, function () { fnEnter(p0); });
      applyStopVisuals(stopIdx); flyTo(camFor(STOPS[stopIdx].cam));
    }
  }
  var TABS = ['da', 'drugs', 'cmp', 'show', 'about'];
  function selectTab(n, focus) {
    TABS.forEach(function (m) { var on = m === n, t = $('#tab-' + m); t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; $('#pane-' + m).hidden = !on; });
    var pn = document.querySelector('.panes'); if (pn) pn.scrollTop = 0;
    if (focus) $('#tab-' + n).focus();
    if (n === 'da' || n === 'drugs' || n === 'cmp') setMode(n);
    emit();
  }
  TABS.forEach(function (n, i) {
    var t = $('#tab-' + n);
    t.addEventListener('click', function () { selectTab(n); });
    t.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); selectTab(TABS[(i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length], true); } });
  });

  // ------------------------------------------------------------------ display controls
  function setToggle(id, v) { var el = $('#' + id); el.checked = v; el.dispatchEvent(new Event('change')); }
  function bindToggle(id, fn) { var el = $('#' + id); el.addEventListener('change', function () { fn(el.checked); }); }
  bindToggle('t-mem', function (v) { memGroup.visible = v; });
  bindToggle('t-mono', function (v) { ST.showMono = v; M.dirty.lig = true; });
  bindToggle('t-drug', function (v) { ST.showDrugs = v; M.dirty.lig = true; });
  bindToggle('t-ghost', function (v) { ST.showGhost = v; M.dirty.ghost = true; });
  bindToggle('t-lab', function (v) { showLabels = v; labLayer.hidden = !v; });
  bindToggle('t-spin', function (v) { spinOn = v; });
  document.querySelectorAll('input[name=sc]').forEach(function (el) { el.addEventListener('change', function () { if (el.checked) { ST.scMode = el.value; M.dirty.sc = true; } }); });
  document.querySelectorAll('input[name=iso]').forEach(function (el) { el.addEventListener('change', function () { if (el.checked) setIso(el.value); }); });
  function setIso(v) { ST.iso = v; var el = document.querySelector('input[name=iso][value=' + v + ']'); if (el) el.checked = true; M.dirty.ghost = true; syncIsoButtons(); }
  $('#v-reset').addEventListener('click', function () { if (MODE === 'cmp') setCmpView('whole'); else flyTo(CAMS.overview); });
  $('#v-top').addEventListener('click', function () { flyTo({ target: [0, 4, 0], dir: [0.02, 0.999, 0.04], dist: 140 }); });
  $('#v-bot').addEventListener('click', function () { flyTo({ target: [0, -20, 0], dir: [0.02, -0.999, 0.04], dist: 200 }); });
  var keyHTML = '';
  ['TM1', 'TM2', 'TM3', 'TM4', 'TM5', 'TM6', 'TM7', 'H8'].forEach(function (k) { keyHTML += '<span><i style="background:' + SEGCOL[k] + '"></i>' + k + '</span>'; });
  keyHTML += '<span><i style="background:' + LOOPCOL + '"></i>Loops</span><span><i style="background:var(--mod);box-shadow:inset 0 0 0 1px var(--line)"></i>Borrowed loop</span><span><i style="background:var(--ghost)"></i>Unresolved</span><span><i style="background:var(--insert)"></i>D2L-only stretch</span><span><i style="background:var(--da)"></i>Dopamine or serotonin (or its stand-in)</span><span><i style="background:var(--ligc)"></i>Drug carbon</span><span><i style="background:' + GCOL.Gs + '"></i>Gαs</span><span><i style="background:' + GCOL.Gi + '"></i>Gαi1</span><span><i style="background:' + GCOL.Go + '"></i>Gαo</span><span><i style="background:' + GCOL.Gq + '"></i>Gαq</span><span><i style="background:' + GCOL.a5 + '"></i>α5 helix</span><span><i style="background:' + GCOL.B + '"></i>Gβ1</span><span><i style="background:' + GCOL.C + '"></i>Gγ2</span><span><i class="sq" style="background:#1F6DB3"></i>GlcNAc</span><span><i style="background:#1E9B58"></i>Mannose</span>';
  $('#key').innerHTML = keyHTML;
  var panel = $('#panel');
  $('#collapse').addEventListener('click', function () { var c = panel.classList.toggle('collapsed'); this.textContent = c ? 'Show' : 'Hide'; this.setAttribute('aria-expanded', String(!c)); layout(); });
  var hint = $('#hint'), hintShown = true;
  hint.textContent = coarse ? 'Drag to rotate, pinch to zoom, tap any part to identify it.' : 'Drag to rotate, right-drag to pan, scroll to zoom, hover to identify.';
  function hideHint() { if (hintShown && coarse) { hint.style.opacity = '0'; hintShown = false; } }

  // ------------------------------------------------------------------ theme
  function applyTheme() {
    readTheme();
    bgU.cTop.value.set(TH['c-extra']); bgU.cBot.value.set(TH['c-cyto']);
    headMat.color.set(TH['c-head']); tailMat.color.set(TH['c-tail']);
    U.modCol.value.set(TH.mod); halo.material.color.set(TH.accent); hbMat.color.set(TH.hb); pathMat.color.set(TH.da);
    Object.keys(MODELS).forEach(function (k) { MODELS[k].recolor(); });
    capKind = ''; if (M) syncFnUI();
  }
  var dq = window.matchMedia('(prefers-color-scheme: dark)');
  if (dq.addEventListener) dq.addEventListener('change', applyTheme);
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });

  // ------------------------------------------------------------------ layout and membrane cutaway
  function layout() {
    W = window.innerWidth; H = window.innerHeight;
    renderer.setSize(W, H, false); camera.aspect = W / H;
    var pr = panel.getBoundingClientRect(), mobile = W <= 760, ox = 0, oy = 0;
    if (mobile) { freeW = W; freeH = Math.max(120, pr.top); oy = (H - freeH) / 2; }
    else { freeW = Math.max(200, W - pr.right); freeH = H; ox = pr.right / 2; }
    camera.setViewOffset(W, H, -ox, oy, W, H); camera.updateProjectionMatrix();
    var nd = Math.max(1, 0.9 * Math.max(H / freeH, H / freeW));
    if (Math.abs(nd - distMul) > 1e-3) { ctl.gRadius *= nd / distMul; distMul = nd; }
  }
  window.addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(panel);
  function updateCut() {
    var c = cutU.uCam.value, d = cutU.uDir.value; c.copy(camera.position); d.copy(ctl.target).sub(c); var tt = d.length() || 1; d.multiplyScalar(1 / tt);
    var r = 0.287 * tt * (1.25 - 0.8 * sm(60, 160, tt)) * clamp(freeW / H, 1, 1.5); cutU.uTT.value = tt; cutU.uR.value = r;
    for (var i = 0; i < nH; i++) {
      var x = LH[i * 3] - c.x, y = LH[i * 3 + 1] - c.y, z = LH[i * 3 + 2] - c.z, t = x * d.x + y * d.y + z * d.z, s = 1;
      if (t < tt) { var px = x - t * d.x, py = y - t * d.y, pz = z - t * d.z; s = sm(r - 3, r + 1.5, Math.sqrt(px * px + py * py + pz * pz)); }
      if (Math.abs(s - headS[i]) > 1e-3 || headS[i] === 0 && s === 0 && !heads._init) { headS[i] = s; setSph(heads, i, LH[i * 3], LH[i * 3 + 1], LH[i * 3 + 2], 1.35 * s); heads.instanceMatrix.needsUpdate = true; }
    }
    heads._init = true;
  }

  // ------------------------------------------------------------------ render loop
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.2, (now - last) / 1000); last = now; var time = now / 1000;
    stepFn(now); stepTR(now);
    M.OVT = !ST.showMono ? 0 : MODE === 'drugs' ? (cmpOn ? 1 : 0) : MODE === 'da' && FN.active ? clamp((0.95 - M.DU) * 12, 0, 1) : 0;
    var bk = currentBound(); if (bk !== boundKey) { boundKey = bk; ST.ixRes = M.ixRes(bk); M.dirty.sc = true; }
    if (Math.abs(M.OVT - M.OVW) > 1e-3) { M.OVW += (M.OVT - M.OVW) * (RM ? 1 : 1 - Math.exp(-dt * 6)); M.dirty.lig = true; }
    stepCtl(dt); updateCut();
    bg.position.copy(camera.position); bgU.split.value = clamp(-camera.position.y / Math.max(1, camera.position.distanceTo(ctl.target)), -0.995, 0.995);
    var dirty = M.dirty;
    if (dirty.rec) { M.eval(); dirty.rec = false; dirty.sc = true; dirty.ghost = true; }
    if (dirty.sc) { M.updateSC(); dirty.sc = false; }
    if (dirty.lig) { M.drawLigs(); dirty.lig = false; }
    var wob = ST.showGhost && !ST.cmp && !RM;
    if (dirty.ghost || wob) { M.updateGhosts(time, wob); if (M.updateGlycans) M.updateGlycans(); if (M.updatePalm) M.updatePalm(); dirty.ghost = false; }
    if (dirty.gp) { M.updateGp(); dirty.gp = false; }
    drawDashes(M.dashes(boundKey));
    drawPath(M, MODE === 'da' && FN.active && ST.showMono && M.DU < 0.97);
    if (hoverQ && !dragging && !pinned) { var h = pick(hoverQ.x, hoverQ.y); if (h) showInfo(h, hoverQ.x, hoverQ.y); else clearInfo(); hoverQ = null; }
    renderer.render(scene, camera);
    updateLabels();
    requestAnimationFrame(frame);
  }
  // ------------------------------------------------------------------ deep links, a small API and messages for host pages
  var TABALIAS = { binding: 'da', da: 'da', drugs: 'drugs', compare: 'cmp', cmp: 'cmp', display: 'show', show: 'show', about: 'about' };
  function curTab() { var t = document.querySelector('.tabs [aria-selected="true"]'); var k = t ? t.id.slice(4) : 'da'; return k === 'da' ? 'binding' : k === 'cmp' ? 'compare' : k === 'show' ? 'display' : k; }
  function findKey(v) { if (!v) return null; var s = String(v).toLowerCase().replace(/^(5ht|ht)/, '5-ht'); for (var k in D.models) if (k.toLowerCase() === s) return k; return null; }
  function setDrug(n) {
    if (!M) return false; var hit = null; drugsFor(M).forEach(function (x) { if (x.toLowerCase() === String(n).toLowerCase()) hit = x; });
    if (!hit) return false;
    var el = null; document.querySelectorAll('#drug-list input').forEach(function (i) { if (i.value === hit) el = i; });
    if (el) { el.checked = true; el.dispatchEvent(new Event('change')); } else applyDrug(hit, true);
    return true;
  }
  function show(o, instant) {   // o: { family, receptor, tab, drug, stop, panel }
    o = o || {};
    var rx = findKey(o.receptor), fam = rx ? D.models[rx].family : (o.family && FAMINFO[String(o.family).toLowerCase()] ? String(o.family).toLowerCase() : null);
    if (fam) setFamily(fam, instant);
    if (rx) setReceptor(rx, instant);
    var tab = TABALIAS[String(o.tab || '').toLowerCase()]; if (tab) selectTab(tab);
    if (o.drug) { if (curTab() !== 'drugs') selectTab('drugs'); setDrug(o.drug); }
    if (o.stop != null && MODE === 'da') setStop(Math.max(0, Math.min(STOPS.length - 1, parseInt(o.stop, 10) || 0)), instant);
    if (o.panel === 'hidden' && !panel.classList.contains('collapsed')) $('#collapse').click();
    if (o.panel === 'shown' && panel.classList.contains('collapsed')) $('#collapse').click();
  }
  function fromLocation() {
    var q = new URLSearchParams(location.search), o = {};
    ['family', 'receptor', 'tab', 'drug', 'stop', 'panel'].forEach(function (k) { if (q.has(k)) o[k] = q.get(k); });
    if (q.has('rx')) o.receptor = q.get('rx');
    var h = location.hash.replace(/^#\/?/, '');   // #5-HT2A/drugs/LSD
    if (h && !o.receptor) { var p = h.split('/'); o.receptor = decodeURIComponent(p[0]); if (p[1]) o.tab = p[1]; if (p[2]) o.drug = decodeURIComponent(p[2]); }
    return o;
  }
  function viewerState() { return { family: FAMILY, receptor: RX, tab: curTab(), drug: curTab() === 'drugs' ? curDrug : null, stop: stopIdx, stops: STOPS.length }; }
  var emitQ = null;
  function emit() { if (window.parent === window || emitQ) return; emitQ = setTimeout(function () { emitQ = null; try { window.parent.postMessage(Object.assign({ type: 'receptor-viewer' }, viewerState()), '*'); } catch (e) {} }, 0); }
  window.receptorViewer = {
    show: function (o) { show(o, false); return viewerState(); },
    state: viewerState,
    families: function () { return Object.keys(D.families); },
    receptors: function (f) { return D.families[f || FAMILY].rx.slice(); },
    drugs: function () { return M ? drugsFor(M) : []; }
  };
  window.addEventListener('message', function (e) { var d = e.data; if (d && d.type === 'receptor-viewer') show(d, false); });
  window.addEventListener('hashchange', function () { show(fromLocation(), false); });

  applyTheme();
  layout();
  setFamily('dopamine', true);
  show(fromLocation(), true);
  emit();
  if (!RM) { ctl.radius = ctl.gRadius * 1.45; ctl.theta = ctl.gTheta - 0.9; ctl.phi = ctl.gPhi + 0.12; ctl.speed = 1.6; }
  applyCam();
  requestAnimationFrame(frame);
})();
