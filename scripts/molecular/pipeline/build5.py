import json, os, re, numpy as np
from scipy.spatial import cKDTree
FAMS = {'dopamine': ['D1', 'D2', 'D3', 'D4', 'D5'], 'serotonin': ['5-HT1A', '5-HT1B', '5-HT1D', '5-HT1E', '5-HT1F', '5-HT2A', '5-HT2B', '5-HT2C', '5-HT4', '5-HT5A', '5-HT6', '5-HT7']}
KEYS = FAMS['dopamine'] + FAMS['serotonin']
models = {k: json.load(open(f'model_{k}.json')) for k in KEYS}
tc = json.load(open('tour_cam2.json'))['cams']
OVR = json.load(open('cam_override2.json')) if os.path.exists('cam_override2.json') else {}
for k, v in OVR.items(): tc.setdefault(k, {}).update(v)
d2c = models['D2']['cams']
for k in ('pocket', 'arrive', 'go', 'signal'): d2c[k] = tc[k]
d2c['loops'] = tc['icl3']
cams = {k: tc[k] for k in ('overview', 'switch', 'drugs')}
famtab = json.load(open('families.json'))
families = {f: dict(name=f.capitalize(), mono=f, rx=FAMS[f], pocketPos=famtab[f]['pocketPos'], table=famtab[f]['table']) for f in FAMS}
# membrane lipids clear of everything drawn: every conformation of every receptor, their ligands, G proteins, beads and the palmitate
pal = np.vstack([np.array(p['C']).reshape(-1, 3) for p in models['D2']['palm']])
tP = cKDTree(np.load('model_pts.npy')); tL = cKDTree(pal)
rng = np.random.default_rng(3); heads, tails = [], []; sp = 8.2
for y0 in (19.2, -19.2):
    for i in range(-9, 10):
        for j in range(-9, 10):
            x = (i + 0.5 * (j % 2)) * sp + rng.normal(0, 0.9); z = j * sp * 0.866 + rng.normal(0, 0.9)
            if x * x + z * z > 62 ** 2: continue
            h = np.array([x, y0 + rng.normal(0, 0.6), z])
            if tP.query(h)[0] < 6.0 or tL.query(h)[0] < 4.5: continue
            tl, ok = [], True
            for sgn in (-1, 1):
                off = np.array([sgn * 1.3, 0, rng.normal(0, 0.6)])
                q = np.array([h + off * 0.6] + [h + off + np.array([rng.normal(0, 0.35) + (0.45 if k % 2 else -0.45), -np.sign(y0) * (k + 1) / 6 * (abs(y0) - 3.5), rng.normal(0, 0.35)]) for k in range(6)])
                if tP.query(q)[0].min() < 3.9 or tL.query(q)[0].min() < 3.2: ok = False
                tl.append(q)
            if ok: heads.append(h); tails.extend(tl)
data = dict(families=families, models=models, cams=cams, lipids=dict(heads=[round(float(v), 1) for v in np.array(heads).ravel()], tails=[round(float(v), 1) for v in np.array(tails).ravel()], tailLen=7))
nstruct = len({c['key'] for m in models.values() for c in m['confs']})
print('lipids', len(heads), '| structures', nstruct)
s = json.dumps(data, separators=(',', ':'), ensure_ascii=False)
assert '</script' not in s

# ---- serotonin references, from the PDB headers
JN = {'NATURE': 'Nature', 'SCIENCE': 'Science', 'CELL(CAMBRIDGE,MASS.)': 'Cell', 'CELL': 'Cell', 'CELL RES.': 'Cell Res', 'MOL.CELL': 'Mol Cell', 'NAT.NEUROSCI.': 'Nat Neurosci',
      'NAT.STRUCT.MOL.BIOL.': 'Nat Struct Mol Biol', 'NAT. STRUCT. MOL. BIOL.': 'Nat Struct Mol Biol', 'NEURON': 'Neuron', 'CELL DISCOV': 'Cell Discov'}
CIT = json.load(open('citations.json')) if os.path.exists('citations.json') else {}   # citation cache, so the page can be rebuilt without the PDB files
def jrnl(pid):
    if not os.path.exists(f'gp_{pid}.pdb'): return CIT[pid]
    L = [l for l in open(f'gp_{pid}.pdb') if l.startswith('JRNL')]
    auth = ' '.join(l[19:].strip() for l in L if l[12:16] == 'AUTH').split(',')
    ref = [l[19:].strip() for l in L if l[12:16] == 'REF '][0]
    m = re.match(r'(.+?)\s+V\.\s*(\d+)\s+(\d+)\s+(\d{4})', ref)
    if m: jn, vol, page, year = m.group(1).strip(), m.group(2), m.group(3), m.group(4)
    else: jn, vol, page, year = ref.rsplit(' ', 1)[0].strip(), '', '', ref.rsplit(' ', 1)[1]
    exp = [l for l in open(f'gp_{pid}.pdb') if l.startswith('EXPDTA')][0][10:].strip(); res = [l for l in open(f'gp_{pid}.pdb') if l.startswith('REMARK   2 RESOLUTION')][0].split()[3]
    def nm(a):
        a = a.strip(); parts = a.split('.'); sur = parts[-1].strip().title().replace('Garcia-Nafria', 'García-Nafría').replace('Nehme', 'Nehmé'); ini = ''.join(p.strip() for p in parts[:-1])
        return sur + ' ' + ini
    names = [nm(a) for a in auth if a.strip()]
    authors = ', '.join(names[:3]) + (', et al.' if len(names) > 3 else '')
    CIT[pid] = dict(authors=authors, journal=JN.get(jn, jn.title()), vol=vol, page=page, year=year, method='cryo-EM' if 'ELECTRON' in exp else 'X-ray', res=res)
    return CIT[pid]
def link(p): return f'<a href="https://www.rcsb.org/structure/{p}" target="_blank" rel="noopener">{p}</a>'
LIGDISP = {'BRL-54443': 'BRL-54443', 'LSD': 'LSD', '25-CN-NBOH': '25-CN-NBOH', 'AS2674723': 'AS2674723', '5-CT': '5-CT'}
def ligname(n): return LIGDISP.get(n, n.capitalize())
refs = ['        <h3 class="famh">Serotonin receptors</h3>']
for k in FAMS['serotonin']:
    m = models[k]; refs.append(f'        <h3>{k}</h3>')
    papers = {}
    for ci, c in enumerate(m['confs']):
        j = jrnl(c['key']); papers.setdefault((j['authors'], j['journal'], j['vol'], j['year']), []).append((ci, c, j))
    for (authors, journal, vol, year), items in papers.items():
        def gof(ci):
            for g, v in m['gprot'].items():
                if v['conf'] == ci: return ('mini-' if v.get('mini') else '') + v['kind']
            return None
        gps = [gof(ci) for ci, c, j in items]
        def ln(i, c): return ligname(c['name']) if i == 0 or c['name'] in LIGDISP else c['name']
        def rs(j): return ('%.1f' % float(j['res'])) if float(j['res']) * 10 == int(float(j['res']) * 10) else j['res']
        if all(gps) and len(set(gps)) == 1: parts = [f"{ln(i, c)} ({link(c['key'])}, {rs(j)}\u00a0Å)" for i, (ci, c, j) in enumerate(items)]; withg = ', with ' + gps[0]
        else: parts = [f"{ln(i, c)} ({link(c['key'])}, {rs(j)}\u00a0Å" + (f", with {g}" if g else '') + ')' for i, ((ci, c, j), g) in enumerate(zip(items, gps))]; withg = ''
        head = ', '.join(parts[:-1]) + (' and ' if len(parts) > 1 else '') + parts[-1]
        j = items[0][2]; page = f", {j['page']}" if j['page'] else ''
        extra = ' Also the resting ' + k + '.' if any(ci == m['rest'] for ci, c, jj in items) else ''
        refs.append(f'        <p class="ref"><strong>{head}{withg}:</strong> {j["method"]}. {authors} <i>{journal}</i> {vol}{page} ({year}).{extra}</p>')
sero = '\n'.join(refs)
json.dump(CIT, open('citations.json', 'w'), indent=1)
css = open('base.css').read() + '\n' + open('extra.css').read()
js = ''.join(open(f, encoding='utf-8').read() for f in ('t4_common.js', 't4_model.js', 't4_engine.js', 't4_engine2.js'))
open('t4_all.js', 'w').write(js)
html = open('t4_markup.html', encoding='utf-8').read().replace('__CSS__', css).replace('__D2DATA__', s).replace('__JS__', js).replace('__SEROREFS__', sero).replace('__NSTRUCT__', str(nstruct))
assert '__' not in html.replace('__proto__', '')
OUT = os.environ.get('OUT', 'receptors.html')
open(OUT, 'w', encoding='utf-8').write(html)
print('written', len(html.encode()) // 1024, 'KB; data', len(s.encode()) // 1024, 'KB')
