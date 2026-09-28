import numpy as np, json, math, collections, os
import pandas as pd
from scipy.spatial import cKDTree
AA3 = dict(ALA='A', ARG='R', ASN='N', ASP='D', CYS='C', GLN='Q', GLU='E', GLY='G', HIS='H', ILE='I', LEU='L', LYS='K', MET='M', PHE='F', PRO='P', SER='S', THR='T', TRP='W', TYR='Y', VAL='V')
BB = ('N', 'CA', 'C', 'O')
ann = pd.ExcelFile('annot.xlsx')
SEQS = {r[0]: str(r[1]).strip() for r in ann.parse('Seqs', header=None).values}
# D4 structures use the common 4-repeat numbering (419 aa); GPCRdb's sequence is the 7-repeat form, so drop 48 residues from loop 3 and leave that loop unknown
_s4 = SEQS['drd4_human']; SEQS['drd4_human'] = _s4[:229] + '-' * 105 + _s4[382:]; assert len(SEQS['drd4_human']) == 419
SEGT = ann.parse('SegEnds_NonXtal_Prot#', header=None); SEGCOLS = SEGT.iloc[0].tolist()

def parse(fn):
    out = []
    for line in open(fn):
        if line.startswith('ENDMDL'): break
        if not line.startswith(('ATOM', 'HETATM')) or line[16] not in ' A': continue
        name = line[12:16].strip(); el = line[76:78].strip() or name[0]; el = el[0] + el[1:].lower()
        if el in ('H', 'D'): continue
        out.append(dict(rec=line[:6].strip(), name=name, resn=line[17:20].strip(), chain=line[21], resi=int(line[22:26]),
                        xyz=np.array([float(line[30:38]), float(line[38:46]), float(line[46:54])]), el=el))
    return out
def compnd(fn):
    comp, cur = {}, None
    for line in open(fn):
        if line.startswith('COMPND') and 'MOLECULE:' in line: cur = line.split('MOLECULE:')[1].strip().rstrip(';').upper()
        if line.startswith('COMPND') and 'CHAIN:' in line:
            for c in line.split('CHAIN:')[1].replace(';', '').split(','): comp[c.strip()] = cur
        if line.startswith('ATOM'): break
    return comp
def by_res(atoms):
    d = collections.OrderedDict()
    for a in sorted(atoms, key=lambda a: a['resi']):
        d.setdefault(a['resi'], {'resn': a['resn'], 'atoms': collections.OrderedDict()}); d[a['resi']]['atoms'][a['name']] = a
    return d
def kabsch(P, Q):
    Pc, Qc = P.mean(0), Q.mean(0); U, S, Vt = np.linalg.svd((P - Pc).T @ (Q - Qc)); d = np.sign(np.linalg.det(Vt.T @ U.T))
    R = Vt.T @ np.diag([1, 1, d]) @ U.T; return R, Qc - R @ Pc
def fit_iter(pairs_xyz, n=5, cut=1.5):
    P = np.array([p for p, q in pairs_xyz]); Q = np.array([q for p, q in pairs_xyz]); sel = np.ones(len(P), bool)
    for it in range(n):
        R, t = kabsch(P[sel], Q[sel]); dev = np.linalg.norm(P @ R.T + t - Q, axis=1); sel = dev < cut
    rms = math.sqrt((dev[sel] ** 2).mean()); return R, t, int(sel.sum()), rms
def rnd(a, k=2): return [round(float(x), k) for x in np.asarray(a).ravel()]
def radial(p): v = np.array([p[0], 0, p[2]]); return v / (np.linalg.norm(v) + 1e-9)
def ca(R, r): return R[r]['atoms']['CA']['xyz']
def sec_struct(R, resis):
    ss = {r: 'C' for r in resis}; turn = {}
    for r in resis:
        if r + 4 in R and 'O' in R[r]['atoms'] and 'N' in R[r + 4]['atoms']:
            turn[r] = np.linalg.norm(R[r]['atoms']['O']['xyz'] - R[r + 4]['atoms']['N']['xyz']) < 3.6
    for r in resis:
        if turn.get(r - 1) and turn.get(r):
            for k in range(4):
                if r + k in ss: ss[r + k] = 'H'
    return ss
def ribbon_frames(R, run):
    cas = np.array([ca(R, r) for r in run]); os_ = np.array([R[r]['atoms']['O']['xyz'] for r in run]); side, prev = [], None
    for i in range(len(run)):
        t = cas[min(i + 1, len(run) - 1)] - cas[max(i - 1, 0)]; t /= np.linalg.norm(t)
        d = os_[i] - cas[i]; d = d - (d @ t) * t; d /= (np.linalg.norm(d) + 1e-9)
        if prev is not None and d @ prev < 0: d = -d
        side.append(d); prev = d
    return cas, np.array(side)
def strands(Rg, rs, ssg):
    cas = {r: ca(Rg, r) for r in rs}
    ext = [r for r in rs if ssg[r] != 'H' and r - 1 in cas and r + 1 in cas and np.linalg.norm(cas[r + 1] - cas[r - 1]) > 6.2]
    if not ext: return
    Te = cKDTree(np.array([cas[r] for r in ext])); paired = set()
    for r in ext:
        if any(abs(ext[j] - r) > 3 for j in Te.query_ball_point(cas[r], 5.5)): paired.add(r)
    for r in rs:
        if r in paired: ssg[r] = 'E'
    for r in rs:
        if ssg[r] == 'C' and ssg.get(r - 1) == 'E' and ssg.get(r + 1) == 'E': ssg[r] = 'E'
    k = 0
    while k < len(rs):
        if ssg[rs[k]] == 'E':
            m = k
            while m + 1 < len(rs) and ssg[rs[m + 1]] == 'E' and rs[m + 1] == rs[m] + 1: m += 1
            if m - k + 1 < 3:
                for q in range(k, m + 1): ssg[rs[q]] = 'C'
            k = m + 1
        else: k += 1
def runs_of(rs, minlen=3):
    out, cur = [], [rs[0]]
    for r in rs[1:]:
        if r == cur[-1] + 1: cur.append(r)
        else: out.append(cur); cur = [r]
    out.append(cur); return [r for r in out if len(r) >= minlen]
def relax(P, fixed, tree, ylim=None, ysign=0, iters=400, bond=3.8, clear=5.0, known=None):
    P = P.copy(); n = len(P)
    for it in range(iters):
        for i in range(n - 1):
            d = P[i + 1] - P[i]; L = np.linalg.norm(d) + 1e-9; corr = (L - bond) / L * d
            fi, fj = i in fixed, (i + 1) in fixed
            if fi and fj: continue
            if fi: P[i + 1] -= corr
            elif fj: P[i] += corr
            else: P[i] += 0.5 * corr; P[i + 1] -= 0.5 * corr
        dist, idx = tree.query(P); pts = tree.data[idx]
        for i in np.where(dist < clear)[0]:
            if i in fixed: continue
            v = P[i] - pts[i]; v /= (np.linalg.norm(v) + 1e-9); P[i] += v * (clear - dist[i]) * 0.6
        D = np.linalg.norm(P[:, None] - P[None], axis=2)
        for i, j in np.argwhere((D < 3.6) & (np.abs(np.subtract.outer(np.arange(n), np.arange(n))) > 2)):
            if i < j:
                v = P[j] - P[i]; L = np.linalg.norm(v) + 1e-9; m = (3.6 - L) * 0.25 * v / L
                if i not in fixed: P[i] -= m
                if j not in fixed: P[j] += m
        if ylim is not None:
            for i in range(n):
                if i in fixed: continue
                w = min(i - min(fixed), max(fixed) - i) if len(fixed) > 1 else i - min(fixed)
                if ysign < 0 and P[i][1] > ylim and w >= 2: P[i][1] += (ylim - P[i][1]) * 0.5
                if ysign > 0 and P[i][1] < ylim and w >= 2: P[i][1] += (ylim - P[i][1]) * 0.5
        if known is not None:
            for i, p in known.items(): P[i] = p
    return P
def bridge(Aend, Bend, nb, seed, tree, ysign, amp_down, amp_out, known=None, ylim=None):
    rng = np.random.default_rng(seed); N = nb + 1; t = np.linspace(0, 1, N + 1); out = radial((Aend + Bend) / 2)
    guide = Aend + t[:, None] * (Bend - Aend) + np.sin(np.pi * t)[:, None] * (ysign * amp_down * np.array([0, 1, 0]) + amp_out * out)
    steps = rng.normal(0, 2.1, (N, 3)); walk = np.vstack([np.zeros(3), np.cumsum(steps, 0)]); walk -= t[:, None] * walk[-1]
    P = guide + walk * np.sin(np.pi * t)[:, None] ** 0.5; P[0], P[-1] = Aend, Bend
    kn = None if not known else {i + 1: p for i, p in known.items()}
    return relax(P, {0, N}, tree, ylim=ysign * 24.0 if ylim is None else ylim, ysign=ysign, known=kn)[1:-1]
def tail(Aend, nb, seed, tree, ysign, drift, known=None):
    rng = np.random.default_rng(seed); P = np.vstack([Aend, Aend + np.cumsum(rng.normal(0, 2.1, (nb, 3)) + drift, 0)])
    kn = None if not known else {i + 1: p for i, p in known.items()}
    return relax(P, {0}, tree, ylim=ysign * 24.0, ysign=ysign, known=kn)[1:]
def fib(n):
    i = np.arange(n) + 0.5; phi = np.arccos(1 - 2 * i / n); th = math.pi * (1 + 5 ** 0.5) * i
    return np.stack([np.cos(th) * np.sin(phi), np.cos(phi), np.sin(th) * np.sin(phi)], 1)

# ------------------------------------------------------------------ receptor specifications
def segs_for(uni, shift_after=None, shift=0):
    a = dict(zip(SEGCOLS, SEGT[SEGT[0] == uni].iloc[0].tolist())); seg = {}
    for k in list(range(1, 8)) + [8]:
        vals = [a[f'{k}b'], a[f'{k}x'], a[f'{k}e']]
        if shift_after is not None and k >= 6: vals = [v + shift for v in vals]
        seg['TM%d' % k if k < 8 else 'H8'] = vals
    return seg
def renum_6luq(a):  # flavodoxin fusion and linkers occupy file residues 223-387; D2 resumes at file 388 = D2 367
    return None if 223 <= a['resi'] <= 387 else (a['resi'] - 21 if a['resi'] >= 388 else a['resi'])
def C_(pdb, lig, name, gp, cite, method, **kw):
    d = dict(pdb=pdb, lig=lig, name=name, gp=gp, cite=cite, method=method); d.update(kw); return d
def spec_(family, mono, gpfam, uni, gene, length, seg, anchor, rest, function, confs, **kw):
    d = dict(family=family, mono=mono, gpfam=gpfam, uni=uni, gene=gene, length=length, seg=seg, anchor=anchor, rest=rest, function=function, confs=confs); d.update(kw); return d
XU21, CAO22, HU22 = 'Xu et al., Nature 2021', 'Cao et al., Science 2022', 'Huang et al., Mol Cell 2022'
SPECS = {
 'D1': spec_('dopamine', 'dopamine', 'Gs', 'drd1_human', 'DRD1', 446, segs_for('drd1_human'), '8IRR', None, '7CKZ', cmp='8IRR', confs=[
        C_('7CKZ', 'LDP', 'dopamine', True, 'Xiao et al., Cell 2021', 'cryo-EM, 3.1\u00a0Å, with Gs'),
        C_('7CKW', 'G3C', 'fenoldopam', True, 'Xiao et al., Cell 2021', 'cryo-EM, 3.2\u00a0Å, with Gs'),
        C_('7JVQ', 'OR9', 'apomorphine', True, 'Zhuang et al., Cell 2021', 'cryo-EM, 3.0\u00a0Å, with Gs'),
        C_('8IRR', 'R5F', 'rotigotine', True, 'Xu et al., Cell Res 2023', 'cryo-EM, 3.2\u00a0Å, with Gs')]),
 'D2': spec_('dopamine', 'dopamine', 'Gi', 'drd2_human', 'DRD2', 443, segs_for('drd2_human'), '6CM4', '6CM4', '8U02', cmp='8IRS', glycans=[5, 17, 23], palm=443, insert=(242, 270), confs=[
        C_('6CM4', '8NU', 'risperidone', False, 'Wang et al., Nature 2018', 'X-ray, 2.87\u00a0Å'),
        C_('8U02', 'LDP', 'dopamine', True, 'Knight et al., Nat Commun 2024', 'cryo-EM, 3.28\u00a0Å, with Go'),
        C_('6LUQ', 'GMJ', 'haloperidol', False, 'Fan et al., Nat Commun 2020', 'X-ray, 3.1\u00a0Å', renum=renum_6luq),
        C_('7JVR', '08Y', 'bromocriptine', True, 'Zhuang et al., Cell 2021', 'cryo-EM, 2.8\u00a0Å, with Gi'),
        C_('8IRS', 'R5F', 'rotigotine', True, 'Xu et al., Cell Res 2023', 'cryo-EM, 3.0\u00a0Å, with Gi')]),
 'D3': spec_('dopamine', 'dopamine', 'Gi', 'drd3_human', 'DRD3', 400, segs_for('drd3_human'), '8IRT', '3PBL', '8IRT', cmp='8IRT', confs=[
        C_('3PBL', 'ETQ', 'eticlopride', False, 'Chien et al., Science 2010', 'X-ray, 2.89\u00a0Å', chain='A'),
        C_('8IRT', 'R5F', 'rotigotine', True, 'Xu et al., Cell Res 2023', 'cryo-EM, 2.7\u00a0Å, with Gi'),
        C_('7CMU', 'G6L', 'pramipexole', True, 'Xu et al., Mol Cell 2021', 'cryo-EM, 3.0\u00a0Å, with Gi')]),
 'D4': spec_('dopamine', 'dopamine', 'Gi', 'drd4_human', 'DRD4', 419, segs_for('drd4_human', shift_after=6, shift=-48), '8IRU', '5WIU', '8IRU', cmp='8IRU', confs=[
        C_('5WIU', 'AQD', 'nemonapride', False, 'Wang et al., Science 2017', 'X-ray, 1.96\u00a0Å', renum=lambda a: a['resi'] - 48 if a['resi'] >= 383 else a['resi']),
        C_('8IRU', 'R5F', 'rotigotine', True, 'Xu et al., Cell Res 2023', 'cryo-EM, 3.2\u00a0Å, with Gi')]),
 'D5': spec_('dopamine', 'dopamine', 'Gs', 'drd5_human', 'DRD5', 477, segs_for('drd5_human'), '8IRV', None, '8IRV', cmp='8IRV', confs=[
        C_('8IRV', 'R5F', 'rotigotine', True, 'Xu et al., Cell Res 2023', 'cryo-EM, 3.1\u00a0Å, with Gs')]),
 '5-HT1A': spec_('serotonin', 'serotonin', 'Gi', '5ht1a_human', 'HTR1A', 422, segs_for('5ht1a_human'), '7E2Y', None, '7E2Y', confs=[
        C_('7E2Y', 'SRO', 'serotonin', True, XU21, 'cryo-EM, 3.0\u00a0Å, with Gi'),
        C_('7E2Z', '9SC', 'aripiprazole', True, XU21, 'cryo-EM, 3.1\u00a0Å, with Gi')]),
 '5-HT1B': spec_('serotonin', 'serotonin', 'Gi', '5ht1b_human', 'HTR1B', 390, segs_for('5ht1b_human'), '6G79', '4IAR', '6G79', confs=[
        C_('4IAR', 'ERM', 'ergotamine', False, 'Wang et al., Science 2013', 'X-ray, 2.7\u00a0Å', chain='A'),
        C_('4IAQ', '2GM', 'dihydroergotamine', False, 'Wang et al., Science 2013', 'X-ray, 2.8\u00a0Å', chain='A'),
        C_('6G79', 'EP5', 'donitriptan', True, 'García-Nafría et al., Nature 2018', 'cryo-EM, 3.8\u00a0Å, with Go')]),
 '5-HT1D': spec_('serotonin', 'serotonin', 'Gi', '5ht1d_human', 'HTR1D', 377, segs_for('5ht1d_human'), '7E32', None, '7E32', confs=[
        C_('7E32', 'SRO', 'serotonin', True, XU21, 'cryo-EM, 2.9\u00a0Å, with Gi')]),
 '5-HT1E': spec_('serotonin', 'serotonin', 'Gi', '5ht1e_human', 'HTR1E', 365, segs_for('5ht1e_human'), '7E33', None, '7E33', confs=[
        C_('7E33', 'HVU', 'BRL-54443', True, XU21, 'cryo-EM, 2.9\u00a0Å, with Gi')]),
 '5-HT1F': spec_('serotonin', 'serotonin', 'Gi', '5ht1f_human', 'HTR1F', 366, segs_for('5ht1f_human'), '7EXD', None, '7EXD', confs=[
        C_('7EXD', '05X', 'lasmiditan', True, 'Huang et al., Cell Res 2021', 'cryo-EM, 3.4\u00a0Å, with Gi')]),
 '5-HT2A': spec_('serotonin', 'serotonin', 'Gq', '5ht2a_human', 'HTR2A', 471, segs_for('5ht2a_human'), '7WC4', '6A93', '7WC4', cmp='6WHA', confs=[
        C_('6A93', '8NU', 'risperidone', False, 'Kimura et al., Nat Struct Mol Biol 2019', 'X-ray, 3.0\u00a0Å', chain='A'),
        C_('7WC4', 'SRO', 'serotonin', False, CAO22, 'X-ray, 3.2\u00a0Å'),
        C_('7WC6', '7LD', 'LSD', False, CAO22, 'X-ray, 2.6\u00a0Å'),
        C_('7WC5', '91Q', 'psilocin', False, CAO22, 'X-ray, 3.2\u00a0Å'),
        C_('7VOE', '9SC', 'aripiprazole', False, 'Chen et al., Nat Neurosci 2022', 'X-ray, 2.9\u00a0Å'),
        C_('6WHA', 'U0G', '25-CN-NBOH', True, 'Kim et al., Cell 2020', 'cryo-EM, 3.4\u00a0Å, with mini-Gq')]),
 '5-HT2B': spec_('serotonin', 'serotonin', 'Gq', '5ht2b_human', 'HTR2B', 481, segs_for('5ht2b_human'), '7SRR', '4IB4', '7SRR', confs=[
        C_('4IB4', 'ERM', 'ergotamine', False, 'Wacker et al., Science 2013', 'X-ray, 2.7\u00a0Å'),
        C_('7SRR', '7LD', 'LSD', True, 'Cao et al., Neuron 2022', 'cryo-EM, 2.9\u00a0Å, with mini-Gq'),
        C_('6DRY', 'H8D', 'methylergonovine', False, 'McCorvy et al., Nat Struct Mol Biol 2018', 'X-ray, 2.9\u00a0Å')]),
 '5-HT2C': spec_('serotonin', 'serotonin', 'Gq', '5ht2c_human', 'HTR2C', 458, segs_for('5ht2c_human'), '6BQG', '6BQH', '6BQG', confs=[
        C_('6BQH', 'E2J', 'ritanserin', False, 'Peng et al., Cell 2018', 'X-ray, 2.7\u00a0Å'),
        C_('6BQG', 'ERM', 'ergotamine', False, 'Peng et al., Cell 2018', 'X-ray, 3.0\u00a0Å')]),
 '5-HT4': spec_('serotonin', 'serotonin', 'Gs', '5ht4r_human', 'HTR4', 388, segs_for('5ht4r_human'), '7XT8', None, '7XT8', confs=[
        C_('7XT8', 'SRO', 'serotonin', True, HU22, 'cryo-EM, 3.1\u00a0Å, with Gs', renum=lambda a: a['resi'] + 1)]),
 '5-HT5A': spec_('serotonin', 'serotonin', 'Gi', '5ht5a_human', 'HTR5A', 357, segs_for('5ht5a_human'), '7UM5', '7UM4', '7UM5', confs=[
        C_('7UM4', 'NN6', 'AS2674723', False, 'Zhang et al., Nat Struct Mol Biol 2022', 'X-ray, 2.8\u00a0Å', chain='A'),
        C_('7UM5', '8K3', '5-CT', True, 'Zhang et al., Nat Struct Mol Biol 2022', 'cryo-EM, 2.7\u00a0Å, with mini-Go', chain='A')]),
 '5-HT6': spec_('serotonin', 'serotonin', 'Gs', '5ht6r_human', 'HTR6', 440, segs_for('5ht6r_human'), '7XTB', None, '7XTB', confs=[
        C_('7XTB', 'SRO', 'serotonin', True, HU22, 'cryo-EM, 3.3\u00a0Å, with Gs')]),
 '5-HT7': spec_('serotonin', 'serotonin', 'Gs', '5ht7r_human', 'HTR7', 479, segs_for('5ht7r_human'), '7XTC', None, '7XTC', confs=[
        C_('7XTC', '8K3', '5-CT', True, HU22, 'cryo-EM, 3.2\u00a0Å, with Gs')]),
}
def bw_of(spec, r):
    for k in range(1, 8):
        b, x, e = spec['seg'][f'TM{k}']
        if b <= r <= e: return f'{k}.{50 + r - x}'
    return None
def res_at(spec, pos):
    k, n = pos.split('.'); return spec['seg'][f'TM{k}'][1] + int(n) - 50
def seg_of(spec, r):
    for k, v in spec['seg'].items():
        if v[0] <= r <= v[2]: return k
    return None

# viewer-frame references: D2 6CM4 (from the first build) and, for other receptors, their rotigotine structure fitted to D2's 8IRS by helix position
# refs.json holds the viewer-frame CA positions of D2 6CM4 and D2 8IRS (from the original D2 build) plus the first membrane's lipid head positions
_refs = json.load(open('refs.json'))
REF_D2_6CM4 = {int(r): np.array(x) for r, x in _refs['d2_6cm4'].items()}
REF_D2_8IRS = {int(r): np.array(x) for r, x in _refs['d2_8irs'].items()}
LIPID_HEADS = np.array(_refs['lipid_heads']).reshape(-1, 3)
D2SPEC = SPECS['D2']

def load_conf(spec, cf):
    A = parse(f"gp_{cf['pdb']}.pdb"); comp = compnd(f"gp_{cf['pdb']}.pdb"); SEQ = SEQS[spec['uni']]
    def receptor_chain():
        if cf.get('chain'): return cf['chain']
        best = None
        rn = cf.get('renum') or (lambda a: a['resi'])
        for c in {a['chain'] for a in A if a['rec'] == 'ATOM'}:
            n = sum(1 for a in A if a['rec'] == 'ATOM' and a['chain'] == c and a['name'] == 'CA' and rn(a) is not None and 1 <= rn(a) <= len(SEQ) and AA3.get(a['resn']) == SEQ[rn(a) - 1])
            if best is None or n > best[0]: best = (n, c)
        return best[1]
    rc = receptor_chain()
    rec = []
    for a in A:
        if a['rec'] != 'ATOM' or a['chain'] != rc: continue
        b = dict(a); b['resi'] = cf['renum'](a) if cf.get('renum') else a['resi']
        if b['resi'] is not None and 1 <= b['resi'] <= len(SEQ): rec.append(b)
    R0 = by_res(rec)
    def ok(r): return r in R0 and AA3.get(R0[r]['resn']) == SEQ[r - 1]
    keep = set()
    for r in R0:
        if ok(r):
            up = 0
            while ok(r + up + 1): up += 1
            dn = 0
            while ok(r - dn - 1): dn += 1
            if up + dn + 1 >= 3: keep.add(r)
        elif ok(r - 1) and ok(r - 2) and ok(r + 1) and ok(r + 2): keep.add(r)
    rec = [a for a in rec if a['resi'] in keep]
    R = by_res(rec)
    mut = {r: AA3.get(R[r]['resn'], '?') for r in R if AA3.get(R[r]['resn']) != SEQ[r - 1]}
    lig = [] if not cf.get('lig') else [a for a in A if a['resn'] == cf['lig']]
    if lig:   # the copy in this receptor chain's pocket: nearest to Asp3.32
        own = [a for a in lig if a['chain'] == rc]
        if own: lig = own
        d332 = res_at(spec, '3.32'); ref = R[d332]['atoms']['CG']['xyz'] if d332 in R and 'CG' in R[d332]['atoms'] else ca(R, d332)
        copies = {}
        for a in lig: copies.setdefault((a['chain'], a['resi']), []).append(a)
        lig = min(copies.values(), key=lambda at: min(np.linalg.norm(x['xyz'] - ref) for x in at))
    gp = {}
    if cf['gp']:
        for c, mol in comp.items():
            if c == rc: continue
            if 'BETA' in mol: gp[c] = ('B', 'G\u03b21')
            elif 'GAMMA' in mol: gp[c] = ('C', 'G\u03b32')
            elif 'ALPHA' in mol or 'MINI' in mol or 'SUBUNIT Q' in mol: gp[c] = ('A', None)
        if cf['pdb'] == '8U02': gp = {'B': ('A', None), 'A': ('B', 'G\u03b21'), 'C': ('C', 'G\u03b32')}
        for c in list(gp):
            if gp[c][0] != 'A': continue
            tail = ''.join(AA3.get(a['resn'], 'X') for a in A if a['rec'] == 'ATOM' and a['chain'] == c and a['name'] == 'CA')[-5:]
            kind = {'QYELL': 'G\u03b1s', 'DCGLF': 'G\u03b1i1', 'GCGLY': 'G\u03b1o', 'EYNLV': 'G\u03b1q'}.get(tail)
            if kind is None: kind = 'G\u03b1s' if 'G(S)' in comp[c] else 'G\u03b1q' if ('G(Q)' in comp[c] or 'SUBUNIT Q' in comp[c]) else 'G\u03b1o' if 'G(O)' in comp[c] or 'MINIGO' in comp[c] else 'G\u03b1i1'
            gp[c] = ('A', kind)
    gpa = {c: [a for a in A if a['rec'] == 'ATOM' and a['chain'] == c] for c in gp}
    return dict(R=R, rec=rec, lig=lig, gp=gp, gpa=gpa, mut=mut)

def build(key):
    spec = SPECS[key]; SEQ = SEQS[spec['uni']]; NC = len(spec['confs']); KEYS = [c['pdb'] for c in spec['confs']]
    print(f'\n===== {key} ({spec["gene"]}, {spec["length"]} aa) confs {KEYS}')
    C = [load_conf(spec, cf) for cf in spec['confs']]
    # reference frame for this receptor
    if key == 'D2': REF = REF_D2_6CM4; refidx = KEYS.index('6CM4')
    else:
        refidx = KEYS.index(spec['anchor']); Ra = C[refidx]['R']; pairs = []
        for k in range(1, 8):
            b, x, e = spec['seg'][f'TM{k}']; b2, x2, e2 = D2SPEC['seg'][f'TM{k}']
            for r in range(b, e + 1):
                r2 = x2 + (r - x)
                if b2 <= r2 <= e2 and r in Ra and r2 in REF_D2_8IRS and 'CA' in Ra[r]['atoms']: pairs.append((ca(Ra, r), REF_D2_8IRS[r2]))
        Rm, t, n, rms = fit_iter(pairs); print(f'  {spec["anchor"]} onto D2: {n} helix CAs, rmsd {rms:.2f}')
        REF = {r: Rm @ ca(Ra, r) + t for r in Ra if 'CA' in Ra[r]['atoms']}
    for i, c in enumerate(C):
        R = c['R']; pairs = [(ca(R, r), REF[r]) for r in R if r in REF and 'CA' in R[r]['atoms'] and (seg_of(spec, r) or '').startswith('TM')]
        Rm, t, n, rms = fit_iter(pairs); c['fit'] = (n, round(rms, 2))
        for a in c['rec'] + c['lig'] + sum(c['gpa'].values(), []): a['xyz'] = Rm @ a['xyz'] + t
        c['R'] = by_res(c['rec'])
        full = [r for r in c['R'] if all(k in c['R'][r]['atoms'] for k in BB)]
        print(f"  {KEYS[i]}: fit {n} CAs rmsd {rms:.2f}; residues {full[0]}-{full[-1]} gaps {[(a, b) for a, b in zip(full, full[1:]) if b != a + 1]}; ligand {len(c['lig'])} atoms; G {list(c['gp'].values())}; mut {c['mut']}")
    CONF = [c['R'] for c in C]
    # ribbon residues: complete backbone in all conformations, after grafting short gaps from another conformation
    MOD = [set() for _ in C]
    def complete(R, r): return r in R and all(k in R[r]['atoms'] for k in BB)
    for _pass in range(2):
      common0 = {r for r in range(1, spec['length'] + 1) if all(complete(R, r) for R in CONF)}
      for ci, R in enumerate(CONF):
          # short holes (<= 8 residues) flanked by residues every conformation resolves: borrow them from another conformation
          holes = [r for r in range(1, spec['length'] + 1) if not complete(R, r) and any(complete(Q, r) for Q in CONF)]
          for st in (runs_of(holes, 1) if holes else []):
              if len(st) > 8 or (st[0] - 1) not in common0 or (st[-1] + 1) not in common0: continue
              for dj, Dn in enumerate(CONF):
                  if dj == ci or not all(complete(Dn, r) for r in st): continue
                  fl = [r for r in list(range(st[0] - 7, st[0])) + list(range(st[-1] + 1, st[-1] + 8)) if r in R and r in Dn and 'CA' in R[r]['atoms'] and 'CA' in Dn[r]['atoms']]
                  if len(fl) < 6: continue
                  Rg, tg, n, rms = fit_iter([(ca(Dn, r), ca(R, r)) for r in fl], n=2, cut=9)
                  if rms > (2.6 if len(st) <= 3 else 1.6): print(f'  (no graft {KEYS[ci]} {st[0]}-{st[-1]} from {KEYS[dj]}: local fit {rms:.2f})'); continue
                  for r in st:
                      R[r] = {'resn': Dn[r]['resn'], 'atoms': collections.OrderedDict((nm, dict(a, xyz=Rg @ a['xyz'] + tg, graft=True)) for nm, a in Dn[r]['atoms'].items())}
                      MOD[ci].add(r)
                  CONF[ci] = collections.OrderedDict(sorted(R.items())); R = CONF[ci]
                  print(f'  graft {KEYS[ci]} {st[0]}-{st[-1]} from {KEYS[dj]} (local fit {rms:.2f} on {len(fl)})'); break
    common = [r for r in range(1, spec['length'] + 1) if all(complete(R, r) for R in CONF)]
    runs = runs_of(common, 6)
    print('  ribbon runs', [(r[0], r[-1]) for r in runs])
    SS = [sec_struct(R, list(R)) for R in CONF]
    ribbons = []
    for run in runs:
        fr = [ribbon_frames(R, run) for R in CONF]
        for c in range(1, NC):
            for i in range(len(run)):
                if fr[c][1][i] @ fr[0][1][i] < 0: fr[c][1][i] = -fr[c][1][i]
        ribbons.append(dict(start=run[0], n=len(run), ca=[rnd(f[0]) for f in fr], side=[rnd(f[1], 3) for f in fr],
                            ss=[''.join(SS[c][r] for r in run) for c in range(NC)], mod=[''.join('1' if r in MOD[c] else '0' for r in run) for c in range(NC)]))
    RIB = [r for run in runs for r in run]
    # side chains
    sres, sname, sel_, spres, POS = [], [], [], [], [[] for _ in range(NC)]
    def stub(at): return at['CB']['xyz'] if 'CB' in at else at['CA']['xyz']
    for r in RIB:
        names = []
        for R in CONF:
            for n in R[r]['atoms']:
                if n not in ('N', 'C', 'O', 'OXT') and n not in names: names.append(n)
        if SEQ[r - 1] == 'P': names.append('N')
        for n in names:
            sres.append(r); sname.append(n); sel_.append(next(R[r]['atoms'][n]['el'] for R in CONF if n in R[r]['atoms'])); bits = 0
            for c, R in enumerate(CONF):
                a = R[r]['atoms'].get(n); POS[c].append(a['xyz'] if a is not None else stub(R[r]['atoms']))
                if a is not None: bits |= 1 << c
            spres.append(bits)
    POS = [np.array(p) for p in POS]; idx = collections.defaultdict(list)
    for k, r in enumerate(sres): idx[r].append(k)
    bonds = []
    for r, ks in idx.items():
        for x_ in range(len(ks)):
            for y_ in range(x_ + 1, len(ks)):
                i, j = ks[x_], ks[y_]
                m = sum(1 << c for c in range(NC) if (spres[i] >> c) & 1 and (spres[j] >> c) & 1 and np.linalg.norm(POS[c][i] - POS[c][j]) < 1.95)
                if m: bonds.append((i, j, m))
    sg = [k for k, n in enumerate(sname) if n == 'SG']
    for a_ in range(len(sg)):
        for b_ in range(a_ + 1, len(sg)):
            i, j = sg[a_], sg[b_]
            m = sum(1 << c for c in range(NC) if (spres[i] >> c) & 1 and (spres[j] >> c) & 1 and np.linalg.norm(POS[c][i] - POS[c][j]) < 2.4)
            if m: bonds.append((i, j, m))
    print('  side-chain atoms', len(sres), 'bonds', len(bonds))
    # ligands
    LIG, LP, FL = {}, {}, {}
    def polar_pairs(lel, Lp, c):
        best = {}
        for i, e in enumerate(lel):
            if e not in ('N', 'O'): continue
            for k, (r, n) in enumerate(zip(sres, sname)):
                if n[0] not in 'NO' or n in ('N', 'O') or not (spres[k] >> c) & 1: continue
                dd = float(np.linalg.norm(Lp[i] - POS[c][k])); salt = e == 'N' and SEQ[r - 1] in 'DE' and n in ('OD1', 'OD2', 'OE1', 'OE2')
                if dd <= (4.0 if salt else 3.5) and ((i, r) not in best or dd < best[(i, r)][2]): best[(i, r)] = (i, k, round(dd, 1))
        return [list(v) for v in sorted(best.values(), key=lambda t: t[2])]
    for c, cf in enumerate(spec['confs']):
        L = C[c]['lig']
        if not L: continue
        P = np.array([a['xyz'] for a in L]); el = [a['el'] for a in L]
        lb = [(i, j) for i in range(len(L)) for j in range(i + 1, len(L)) if np.linalg.norm(P[i] - P[j]) < (2.05 if 'Br' in (el[i], el[j]) else 1.95 if 'S' in (el[i], el[j]) or 'Cl' in (el[i], el[j]) else 1.9)]
        R = CONF[c]; con = sorted(r for r, d in R.items() if min(np.linalg.norm(P - a['xyz'], axis=1).min() for a in d['atoms'].values()) <= 4.0)
        d332 = res_at(spec, '3.32'); od = np.array([R[d332]['atoms'][n]['xyz'] for n in ('OD1', 'OD2') if n in R[d332]['atoms']])
        Ns = [i for i, e in enumerate(el) if e == 'N']; asp = float(min(np.linalg.norm(od - P[i], axis=1).min() for i in Ns)) if Ns and len(od) else None
        name = cf['name']
        LIG[name] = dict(el=el, xyz=rnd(P), bonds=lb, conf=c, contacts=con, asp=None if asp is None else round(asp, 1), ix=polar_pairs(el, P, c), pdb=cf['pdb'], cite=cf['cite'], method=cf['method'],
                         lab=rnd(P.mean(0) + np.array([0, P[:, 1].max() - P.mean(0)[1] + 3.0, 0]), 1))
        LP[name] = P
        print(f"  {name} ({cf['pdb']}): {len(L)} atoms, amine-Asp3.32 {asp}, contacts {' '.join(f'{SEQ[r-1]}{r}' for r in con)}; polar {[(f'{SEQ[sres[k]-1]}{sres[k]} {sname[k]}', dd) for i, k, dd in LIG[name]['ix']]}")
    # G proteins per conformation
    GP, GPA = {}, {}
    for c, cf in enumerate(spec['confs']):
        if not cf['gp']: continue
        gruns = []; alpha = None
        for ch, (chl, label) in C[c]['gp'].items():
            Rg = by_res(C[c]['gpa'][ch]); rs = [r for r in Rg if all(k in Rg[r]['atoms'] for k in BB)]
            if not rs: continue
            ssg = sec_struct(Rg, rs); strands(Rg, rs, ssg); last = rs[-1]
            if chl == 'A': alpha = (Rg, rs)
            for run in runs_of(rs):
                cc, sd = ribbon_frames(Rg, run)
                gruns.append(dict(chain=chl, label=label, start=run[0], n=len(run), ca=rnd(cc), side=rnd(sd, 3), ss=''.join(ssg[r] for r in run),
                                  seq=''.join(AA3.get(Rg[r]['resn'], 'X') for r in run), a5=[1 if (chl == 'A' and r > last - 27) else 0 for r in run]))
        Rg, rs = alpha; a5 = np.array([a['xyz'] for r in rs[-27:] for a in Rg[r]['atoms'].values()])
        R = CONF[c]; a5c = sorted({r for r, d in R.items() for a in d['atoms'].values() if not a.get('graft') and np.linalg.norm(a5 - a['xyz'], axis=1).min() < 4.0})
        r350 = res_at(spec, '3.50'); r3 = float(min(np.linalg.norm(a5 - R[r350]['atoms'][n]['xyz'], axis=1).min() for n in ('NH1', 'NH2', 'NE', 'CZ') if n in R[r350]['atoms'])) if r350 in R else None
        gl = []
        for chl in ('A', 'B', 'C'):
            pts = [np.array(r['ca']).reshape(-1, 3) for r in gruns if r['chain'] == chl]
            if not pts: continue
            cc = np.vstack(pts).mean(0); gl.append(dict(text=next(r['label'] for r in gruns if r['chain'] == chl), pos=rnd(cc + radial(cc) * 8, 1)))
        a5m = np.array([ca(Rg, r) for r in rs[-14:]]).mean(0); gl.append(dict(text='\u03b15 helix', pos=rnd(a5m + radial(a5m) * 9 + np.array([0, -2, 0]), 1)))
        kinds = [v[1] for v in C[c]['gp'].values()]
        GP[cf['pdb']] = dict(conf=c, kind='Gs' if 'G\u03b1s' in kinds else 'Go' if 'G\u03b1o' in kinds else 'Gq' if 'G\u03b1q' in kinds else 'Gi', mini=any('MINI' in m for m in compnd(f"gp_{cf['pdb']}.pdb").values()),
                            runs=gruns, a5=a5c, r350=None if r3 is None else round(r3, 1), labels=gl)
        GPA[cf['pdb']] = np.array([a['xyz'] for a in sum(C[c]['gpa'].values(), [])])
        print(f"  G protein {cf['pdb']}: {GP[cf['pdb']]['kind']} runs {[(g['label'], g['start'], g['n']) for g in gruns]}; R3.50-a5 {r3}; a5 contacts {' '.join(f'{SEQ[r-1]}{r}' for r in a5c)}")
    # switch facts (rest vs function conformation)
    fi = KEYS.index(spec['function']); F = {}
    key_res = {p: res_at(spec, p) for p in ('3.32', '3.50', '5.42', '5.43', '5.46', '6.30', '6.48', '6.55', '7.53')}
    F['keyres'] = {p: (SEQ[r - 1] + str(r)) for p, r in key_res.items()}
    if spec['rest']:
        ri = KEYS.index(spec['rest']); Rr, Rf = CONF[ri], CONF[fi]
        r633 = res_at(spec, '6.33'); r630 = res_at(spec, '6.30'); r350 = res_at(spec, '3.50'); r753 = res_at(spec, '7.53'); r648 = res_at(spec, '6.48')
        F['tm6'] = round(float(np.mean([np.linalg.norm(ca(Rf, r) - ca(Rr, r)) for r in (r633 - 1, r633, r633 + 1) if r in Rr and r in Rf])), 1)
        def lock(R):
            if r350 not in R or r630 not in R or SEQ[r630 - 1] not in 'DE' or SEQ[r350 - 1] != 'R': return None
            acid = [R[r630]['atoms'][n]['xyz'] for n in ('OE1', 'OE2', 'OD1', 'OD2') if n in R[r630]['atoms']]
            return round(float(min(np.linalg.norm(a - R[r350]['atoms'][n]['xyz']) for a in acid for n in ('NH1', 'NH2', 'NE') if n in R[r350]['atoms'])), 1) if acid else None
        F['lock'] = lock(Rr); F['lock_f'] = lock(Rf)
        F['y753'] = round(float(np.linalg.norm(Rf[r753]['atoms']['OH']['xyz'] - Rr[r753]['atoms']['OH']['xyz'])), 1) if 'OH' in Rf[r753]['atoms'] and 'OH' in Rr[r753]['atoms'] else None
        F['w648'] = round(float(np.linalg.norm(Rf[r648]['atoms']['CZ2']['xyz'] - Rr[r648]['atoms']['CZ2']['xyz'])), 1) if 'CZ2' in Rf[r648]['atoms'] and 'CZ2' in Rr[r648]['atoms'] else None
        print(f"  switch: TM6 {F['tm6']} A, lock {F['lock']} -> {F['lock_f']} A, Y7.53 {F['y753']} A, W6.48 {F['w648']} A")
    # ghost chains: N-tail, every gap between ribbon runs, C-tail
    TREES = [cKDTree(np.array([a['xyz'] for d in CONF[c].values() for a in d['atoms'].values()] + list(LP.get(spec['confs'][c]['name'], [])) + ([a['xyz'] for a in sum(C[c]['gpa'].values(), [])] if spec['confs'][c]['gp'] else []))) for c in range(NC)]
    gapdefs = [('nterm', None, runs[0][0])] + [(f'gap{i}', runs[i][-1], runs[i + 1][0]) for i in range(len(runs) - 1)] + [('cterm', runs[-1][-1], None)]
    if spec.get('insert'): gapdefs.append(('icl3s', runs[0][-1], runs[1][0]))
    GH = [dict() for _ in range(NC)]
    for gk, a3, b3 in gapdefs:
        for c, R in enumerate(CONF):
            tree = TREES[c]
            if gk == 'nterm':
                first = b3; kn = {i: ca(R, r) for i, r in enumerate(range(first - 1, 0, -1)) if r in R and 'CA' in R[r]['atoms']}
                P = tail(ca(R, first), first - 1, 11, tree, +1, np.array([0.0, 1.25, 0.0]) + 0.9 * radial(ca(R, first)), known=kn)[::-1]
                GH[c][gk] = dict(res=list(range(1, first)), P=P, anc=[None, ca(R, first)])
            elif gk == 'cterm':
                last = a3; nb = spec['length'] - last
                if nb <= 0: continue
                kn = {k: ca(R, last + 1 + k) for k in range(nb) if (last + 1 + k) in R and 'CA' in R[last + 1 + k]['atoms']}
                P = tail(ca(R, last), nb, 5, tree, -1, np.array([0, -0.6, 0]) + 1.2 * radial(ca(R, last)), known=kn)
                GH[c][gk] = dict(res=list(range(last + 1, spec['length'] + 1)), P=P, anc=[ca(R, last), None])
            else:
                resl = [r for r in range(a3 + 1, b3) if not (gk == 'icl3s' and spec['insert'][0] <= r <= spec['insert'][1])]
                nb = len(resl); ysign = 1 if (ca(R, a3)[1] + ca(R, b3)[1]) > 0 else -1
                kn = {i: ca(R, r) for i, r in enumerate(resl) if r in R and 'CA' in R[r]['atoms']}
                if ysign > 0:   # extracellular loops hug the surface: modest arcs, no forcing above the head groups
                    amp_d = min(11.0, 3 + 0.5 * nb); amp_o = min(9.0, 2 + 0.4 * nb); yl = max(ca(R, a3)[1], ca(R, b3)[1]) + 2.0
                else:
                    amp_d = min(34.0, 4 + 1.2 * nb) * (0.85 if gk == 'icl3s' else 1); amp_o = min(18.0, 3 + 0.6 * nb); yl = -24.0
                P = bridge(ca(R, a3), ca(R, b3), nb, 23 + a3, tree, ysign, amp_d, amp_o, known=kn, ylim=yl)
                GH[c][gk] = dict(res=resl, P=P, anc=[ca(R, a3), ca(R, b3)])
    ghost = {}
    for gk in GH[0]:
        ghost[gk] = dict(res=GH[0][gk]['res'], pos=[rnd(GH[c][gk]['P'], 1) for c in range(NC)],
                         anc=[[rnd(GH[c][gk]['anc'][e]) if GH[c][gk]['anc'][e] is not None else None for c in range(NC)] for e in (0, 1)],
                         known=[sum(1 << c for c in range(NC) if r in CONF[c] and 'CA' in CONF[c][r]['atoms'] and not CONF[c][r]['atoms']['CA'].get('graft')) for r in GH[0][gk]['res']])
    if spec.get('insert'): ghost['gap0']['insert'] = list(spec['insert'])
    print('  ghost chains', {k: len(v['res']) for k, v in ghost.items()})
    # glycans and palmitate (D2 only)
    glycans, palm = [], None
    if spec.get('glycans'):
        for c in range(NC):
            nt = GH[c]['nterm']['P']; gl = []
            for asn in spec['glycans']:
                i = asn - 1; loc = nt[max(i - 2, 0):i + 3].mean(0); u = nt[i] - loc; u = u / (np.linalg.norm(u) + 1e-9) + np.array([0, 0.9, 0]); u /= np.linalg.norm(u)
                w = np.cross(u, np.array([0, 1.0, 0.3])); w /= np.linalg.norm(w); base = nt[i]
                gl.append(dict(res=asn, glcnac=[rnd(base + 4.0 * u), rnd(base + 8.3 * u)], man=[rnd(base + 12.6 * u), rnd(base + 16.0 * u + 3.6 * w), rnd(base + 16.0 * u - 3.6 * w)]))
            glycans.append(gl)
    if spec.get('palm') and 'cterm' in GH[0]:
        palm = []
        for c in range(NC):
            c443 = GH[c]['cterm']['P'][-1]; best = None
            for tilt in np.linspace(0, 55, 12):
                for az in np.linspace(0, 330, 12):
                    t, p = math.radians(tilt), math.radians(az); u = np.array([math.sin(t) * math.cos(p), math.cos(t), math.sin(t) * math.sin(p)])
                    w = np.cross(u, [1, 0, 0]); w /= np.linalg.norm(w); S = c443 + 1.9 * u
                    chain = [S + 1.8 * u + k * 1.26 * u + (0.42 if k % 2 else -0.42) * w for k in range(16)]
                    pen = TREES[c].query(np.array(chain))[0].min() - 0.05 * tilt
                    if best is None or pen > best[0]: best = (pen, S, chain, u, w)
            _, S, chain, u, w = best; palm.append(dict(S=rnd(S), C=rnd(np.array(chain)), O=rnd(chain[0] + 1.23 * w)))
    # labels
    labels = []
    for k in range(1, 8):
        b, x, e = spec['seg'][f'TM{k}']; pos = []
        for R in CONF:
            rs = [r for r in range(b, e + 1) if r in R and 'CA' in R[r]['atoms']]; top = max(rs, key=lambda r: ca(R, r)[1]); p = ca(R, top)
            pos.append(rnd(p + radial(p) * 8.5 + np.array([0, 3.0, 0]), 1))
        labels.append(dict(key=f'TM{k}', text=f'TM{k}', kind='seg', pos=pos))
    b, x, e = spec['seg']['H8']
    if any(r in CONF[0] for r in range(b, e + 1)):
        labels.append(dict(key='H8', text='H8', kind='seg', pos=[rnd((lambda cc: cc + radial(cc) * 6 + np.array([0, -3.5, 0]))(np.mean([ca(R, r) for r in range(b, e + 1) if r in R], axis=0)), 1) for R in CONF]))
    for gk, v in ghost.items():
        if gk in ('nterm', 'cterm', 'icl3s'): continue
        far = []
        for c in range(NC):
            p = GH[c][gk]['P']; far.append(rnd(p[np.argmax(np.abs(p[:, 1] - 0) + 0.3 * np.linalg.norm(p[:, [0, 2]], axis=1))] + np.array([0, -4 if p[:, 1].mean() < 0 else 4, 0]), 1))
        before = [k for k in range(1, 8) if spec['seg'][f'TM{k}'][0] <= v['res'][0]]
        nm = {5: 'ICL3', 4: 'ECL2', 6: 'ECL3', 3: 'ICL2', 2: 'ECL1', 1: 'ICL1'}.get(max(before) if before else 0, gk)
        labels.append(dict(key=nm, text=nm, kind='seg', pos=far))
    labels.append(dict(key='Nterm', text='N-terminus', kind='seg', pos=[rnd(GH[c]['nterm']['P'][0] + np.array([0, 4, 0]), 1) for c in range(NC)]))
    if 'cterm' in ghost: labels.append(dict(key='Cterm', text='C-terminus', kind='seg', pos=[rnd(GH[c]['cterm']['P'][-1] + np.array([0, -4.5, 0]), 1) for c in range(NC)]))
    labels.append(dict(key='out', text='Extracellular side', kind='zone', pos=[[0, 0, 0]] * NC)); labels.append(dict(key='in', text='Cytoplasm', kind='zone', pos=[[0, 0, 0]] * NC))
    # entry path for the function ligand, and cameras
    fname = spec['confs'][fi]['name']; P0 = LP[fname].mean(0)
    recpts = np.vstack([np.array([a['xyz'] for d in CONF[c].values() for a in d['atoms'].values()]) for c in ({KEYS.index(spec['rest']) if spec['rest'] else fi, fi})]); tR = cKDTree(recpts)
    best = None
    for v in fib(2000):
        if v[1] < 0.35: continue
        ss_ = np.arange(4.0, 34.0, 0.5); clear = tR.query(P0 + ss_[:, None] * v)[0]; score = clear[:24].min() * 2 + clear.min()
        if best is None or score > best[0]: best = (score, v)
    d1 = best[1]; P1 = P0 + 13 * d1; P2 = P0 + np.array([25.0, 23.0, 11.0])
    entry = [rnd(P2), rnd(P1), rnd(P0)]
    heads = LIPID_HEADS; headT = cKDTree(heads)
    occ = cKDTree(np.vstack([recpts] + ([GPA[spec['function']]] if spec['function'] in GPA else [])))
    def score_dir(T, v, dist, r0=6.0, spread=3.0):
        u = np.cross(v, [0, 1, 0]); u = u / (np.linalg.norm(u) + 1e-9) if np.linalg.norm(u) > 1e-3 else np.array([1, 0, 0.]); w = np.cross(v, u); hits, hh = set(), set()
        for off in [(0, 0), (spread, 0), (-spread, 0), (0, spread), (0, -spread)]:
            base = T + off[0] * u + off[1] * w
            for s in np.arange(r0, dist, 1.0):
                p = base + v * s; hits.update(occ.query_ball_point(p, 2.2)); hh.update(headT.query_ball_point(p, 3.0))
        return len(hits), len(hh)
    def best_dir(T, dist, pref, max_ang, min_elev):
        pref = np.array(pref, float); pref /= np.linalg.norm(pref); res = []
        for v in fib(900):
            ang = math.degrees(math.acos(np.clip(v @ pref, -1, 1)))
            if ang > max_ang or math.degrees(math.asin(v[1])) < min_elev: continue
            n, h = score_dir(T, v, dist); res.append((n + 0.5 * h + 0.6 * ang, v))
        res.sort(key=lambda t: t[0]); return res[0][1]
    v = best_dir(P0, 40, [0.3, 0.8, 1], 75, 15)
    cams = dict(pocket=dict(target=rnd(P0 + np.array([0, 1.0, 0])), dir=rnd(v, 3), dist=42), arrive=dict(target=rnd((P0 + P2) / 2 + np.array([0, -3, 0])), dir=[0.25, 0.3, 0.92], dist=96))
    if spec['function'] in GPA:
        G = GPA[spec['function']]; lo, hi = np.vstack([G, recpts]).min(0), np.vstack([G, recpts]).max(0)
        T = np.array([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2 - 4, (lo[2] + hi[2]) / 2]); span = max(hi[1] - lo[1], hi[0] - lo[0], hi[2] - lo[2])
        cams['go'] = dict(target=rnd(T), dir=[0.75, 0.12, 1], dist=round(float(span * 1.55 + 60)))
        cams['signal'] = dict(target=rnd(T + np.array([0, -8, 0])), dir=[0.9, -0.28, 0.45], dist=round(float(span * 1.5 + 55)))
    big = max((k for k in ghost if k not in ('nterm', 'icl3s')), key=lambda k: len(ghost[k]['res']))
    Pg = np.array(ghost[big]['pos'][KEYS.index(spec['rest']) if spec['rest'] else fi]).reshape(-1, 3); cg = Pg.mean(0)
    tg = 0.5 * (cg + np.array([0.0, -8.0, 0.0]))   # halfway between the loop and the receptor core, so both stay in frame
    cams['loops'] = dict(target=rnd(tg), dir=[0.2, -0.2 if cg[1] < 0 else 0.35, 0.95], dist=round(float(max(150, 95 + 1.3 * (Pg.max(0) - Pg.min(0)).max()))))
    cams['bigloop'] = big
    model = dict(key=key, family=spec['family'], mono=spec['mono'], gp=spec['gpfam'], cmp=KEYS.index(spec.get('cmp') or spec['function']), gene=spec['gene'], length=spec['length'], seg=spec['seg'], seq=''.join(AA3.get(CONF[fi][r]['resn'], SEQ[r - 1]) if r in CONF[fi] else SEQ[r - 1] for r in range(1, spec['length'] + 1)) if key != 'D4' else ''.join(next((AA3.get(R[r]['resn'], 'X') for R in CONF if r in R), '-') for r in range(1, spec['length'] + 1)),
                 confs=[dict(key=cf['pdb'], name=cf['name'], fit=C[c]['fit'], mut={str(k): v for k, v in C[c]['mut'].items()}, mod=sorted(MOD[c]), cite=cf['cite'], method=cf['method']) for c, cf in enumerate(spec['confs'])],
                 rest=None if not spec['rest'] else KEYS.index(spec['rest']), function=fi, funcLig=fname,
                 runs=ribbons, sc=dict(res=sres, name=sname, el=sel_, pos=[rnd(p, 1) for p in POS], pres=spres, bonds=bonds),
                 lig=LIG, gprot=GP, ghost=ghost, glycans=glycans, palm=palm, labels=labels, entryPath=entry, cams=cams, facts=F)
    return model, np.vstack([TREES[c].data for c in range(NC)] + [np.vstack([GH[c][k]['P'] for k in GH[c]]) for c in range(NC)])

def compare_facts(models, fam, ref_key, rest_ref):
    """helix identity vs the family reference, loop-3/tail lengths, and TM6 inner-end distance from the family's resting reference"""
    ref = models[ref_key]; refspec = SPECS[ref_key]
    rr, rc = rest_ref; RR = models[rr]; ri = [c['key'] for c in RR['confs']].index(rc)
    r633 = res_at(SPECS[rr], '6.33'); i633 = None
    for run in RR['runs']:
        if run['start'] <= r633 < run['start'] + run['n']: i633 = np.array(run['ca'][ri][(r633 - run['start']) * 3:(r633 - run['start']) * 3 + 3])
    for k, m in models.items():
        if m['family'] != fam: continue
        spec = SPECS[k]; same = tot = 0
        for h in range(1, 8):
            b, x, e = spec['seg'][f'TM{h}']; b2, x2, e2 = refspec['seg'][f'TM{h}']
            for r in range(b, e + 1):
                r2 = x2 + (r - x)
                if b2 <= r2 <= e2 and m['seq'][r - 1] != '-' and ref['seq'][r2 - 1] != '-': tot += 1; same += m['seq'][r - 1] == ref['seq'][r2 - 1]
        ci = m['cmp']; r6 = res_at(spec, '6.33'); p6 = None
        for run in m['runs']:
            if run['start'] <= r6 < run['start'] + run['n']: p6 = np.array(run['ca'][ci][(r6 - run['start']) * 3:(r6 - run['start']) * 3 + 3])
        m['cmpfacts'] = dict(ident=round(100 * same / tot), icl3=spec['seg']['TM6'][0] - spec['seg']['TM5'][2] - 1, ctail=spec['length'] - spec['seg']['H8'][2],
                             tm6=None if p6 is None or i633 is None else round(float(np.linalg.norm(p6 - i633)), 1), ref=ref_key, restref=rr)
def pocket_table(models, fam, positions=None, minc=4, cap=18):
    keys = [k for k in models if models[k]['family'] == fam]
    if positions is None:
        cnt = collections.Counter()
        for k in keys:
            m = models[k]; lig = m['lig'][m['funcLig']]
            for r in lig['contacts']:
                p = bw_of(SPECS[k], r)
                if p: cnt[p] += 1
        positions = sorted([p for p, c in cnt.items() if c >= minc], key=lambda p: (int(p.split('.')[0]), int(p.split('.')[1])))[:cap]
    table = {k: {p: models[k]['seq'][res_at(SPECS[k], p) - 1] + str(res_at(SPECS[k], p)) for p in positions} for k in keys}
    return dict(pocketPos=positions, table=table)

if __name__ == '__main__':
    import sys
    keys = sys.argv[1:] or list(SPECS)
    allpts = []; models = {}
    for k in keys:
        m, pts = build(k); allpts.append(pts); models[k] = m
    if len(keys) == len(SPECS):
        compare_facts(models, 'dopamine', 'D2', ('D2', '6CM4')); compare_facts(models, 'serotonin', '5-HT2A', ('5-HT2A', '6A93'))
        old = json.load(open('fam.json'))
        fams = dict(dopamine=pocket_table(models, 'dopamine', positions=old['pocketPos']), serotonin=pocket_table(models, 'serotonin'))
        json.dump(fams, open('families.json', 'w'), separators=(',', ':'), ensure_ascii=False)
        print('serotonin pocket positions', fams['serotonin']['pocketPos'])
        np.save('model_pts.npy', np.vstack(allpts))
    for k, m in models.items():
        json.dump(m, open(f'model_{k}.json', 'w'), separators=(',', ':'), ensure_ascii=False)
        print(f'  -> model_{k}.json {os.path.getsize(f"model_{k}.json") // 1024} KB', m.get('cmpfacts'))
