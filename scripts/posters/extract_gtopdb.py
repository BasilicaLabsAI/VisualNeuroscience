"""Endogenous-transmitter affinities for the site's receptors, from the
IUPHAR/BPS Guide to PHARMACOLOGY.

    curl -o out/interactions.csv https://www.guidetopharmacology.org/DATA/interactions.csv
    python extract_gtopdb.py out/interactions.csv  ->  out/affinities.json, out/affinities-review.csv

For every receptor on the receptor poster it takes the database's own rows
that pair the receptor (matched by its human gene symbols) with an
endogenous ligand that is the site's named transmitter, prefers human data,
prefers a binding constant (pKi, then pKd) for G-protein-coupled receptors
and a potency (pEC50) for channels, and keeps the median with the spread
between studies and the PubMed IDs. Nothing is entered by hand: a receptor
the database has no such number for is left without one, and the review
file says why. Licence: the database is under the Open Database Licence,
its content under CC BY-SA 4.0; the poster carries the attribution."""
import csv, io, json, os, re, statistics, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
RECEPTORS = os.path.join(os.path.dirname(os.path.dirname(HERE)), "site", "assets", "rx", "receptors.json")

# site receptor id -> human gene symbols (a channel is matched on its subunits)
GENES = {
 "AMPA": ["GRIA1", "GRIA2", "GRIA3", "GRIA4"], "NMDA": ["GRIN1", "GRIN2A", "GRIN2B"], "KAINATE": ["GRIK1", "GRIK2"],
 "MGLUR1": ["GRM1"], "MGLUR5": ["GRM5"], "MGLUR2": ["GRM2"], "MGLUR3": ["GRM3"], "MGLUR4": ["GRM4"],
 "MGLUR6": ["GRM6"], "MGLUR7": ["GRM7"], "MGLUR8": ["GRM8"],
 "GABAA": ["GABRA1", "GABRB2", "GABRG2"], "GABAA_RHO": ["GABRR1"], "GABAB": ["GABBR1", "GABBR2"], "GLYR": ["GLRA1"],
 "NACHR_MUSCLE": ["CHRNA1", "CHRNB1", "CHRND", "CHRNG"], "A4B2": ["CHRNA4", "CHRNB2"], "A7": ["CHRNA7"], "A3B4": ["CHRNA3", "CHRNB4"],
 "M1": ["CHRM1"], "M2": ["CHRM2"], "M3": ["CHRM3"], "M4": ["CHRM4"], "M5": ["CHRM5"],
 "D1": ["DRD1"], "D2": ["DRD2"], "D3": ["DRD3"], "D4": ["DRD4"], "D5": ["DRD5"],
 "ALPHA1A": ["ADRA1A"], "ALPHA1B": ["ADRA1B"], "ALPHA1D": ["ADRA1D"], "ALPHA2A": ["ADRA2A"], "ALPHA2B": ["ADRA2B"],
 "ALPHA2C": ["ADRA2C"], "BETA1": ["ADRB1"], "BETA2": ["ADRB2"], "BETA3": ["ADRB3"],
 "5HT1A": ["HTR1A"], "5HT1B": ["HTR1B"], "5HT1D": ["HTR1D"], "5HT1E": ["HTR1E"], "5HT1F": ["HTR1F"], "5HT2A": ["HTR2A"],
 "5HT2B": ["HTR2B"], "5HT2C": ["HTR2C"], "5HT3": ["HTR3A"], "5HT4": ["HTR4"], "5HT5A": ["HTR5A"], "5HT6": ["HTR6"], "5HT7": ["HTR7"],
 "H1": ["HRH1"], "H2": ["HRH2"], "H3": ["HRH3"], "H4": ["HRH4"],
 "A1": ["ADORA1"], "A2A": ["ADORA2A"], "A2B": ["ADORA2B"], "A3": ["ADORA3"],
 "P2X1": ["P2RX1"], "P2X2": ["P2RX2"], "P2X3": ["P2RX3"], "P2X4": ["P2RX4"], "P2X5": ["P2RX5"], "P2X6": ["P2RX6"], "P2X7": ["P2RX7"],
 "P2Y1": ["P2RY1"], "P2Y2": ["P2RY2"], "P2Y4": ["P2RY4"], "P2Y6": ["P2RY6"], "P2Y11": ["P2RY11"], "P2Y12": ["P2RY12"],
 "P2Y13": ["P2RY13"], "P2Y14": ["P2RY14"],
 "CB1": ["CNR1"], "CB2": ["CNR2"],
 "MOR": ["OPRM1"], "DOR": ["OPRD1"], "KOR": ["OPRK1"], "NOP": ["OPRL1"],
 "NK1": ["TACR1"], "NK2": ["TACR2"], "NK3": ["TACR3"], "Y1": ["NPY1R"], "Y2": ["NPY2R"], "Y4": ["NPY4R"], "Y5": ["NPY5R"],
 "SSTR1": ["SSTR1"], "SSTR2": ["SSTR2"], "SSTR3": ["SSTR3"], "SSTR4": ["SSTR4"], "SSTR5": ["SSTR5"],
 "OX1": ["HCRTR1"], "OX2": ["HCRTR2"], "OTR": ["OXTR"], "V1A": ["AVPR1A"], "V1B": ["AVPR1B"], "CRF1": ["CRHR1"], "CRF2": ["CRHR2"],
 "MC4R": ["MC4R"], "MT1": ["MTNR1A"], "MT2": ["MTNR1B"], "EP1": ["PTGER1"], "EP2": ["PTGER2"], "EP3": ["PTGER3"], "EP4": ["PTGER4"],
 "BDKRB1": ["BDKRB1"], "BDKRB2": ["BDKRB2"],
}
# the site's transmitter labels -> words that find the database's ligand names
LIGAND = {
 "Glu": ["glutamate", "glutamic acid"], "Glu + Gly": ["glutamate", "glutamic acid"], "Gly": ["glycine"], "GABA": ["gaba", "aminobutyric"],
 "ACh": ["acetylcholine"], "DA": ["dopamine"], "NA": ["noradrenaline", "norepinephrine"], "5-HT": ["5-hydroxytryptamine", "serotonin"],
 "His": ["histamine"], "Ado": ["adenosine"], "ATP": ["atp"], "ADP": ["adp"], "UTP": ["utp"], "UDP": ["udp"], "ATP · UTP": ["atp", "utp"],
 "UDP-glucose": ["udp-glucose"], "2-AG": ["2-arachidonoylglycerol", "2-ag"], "β-endorphin": ["endorphin"],
 "Enkephalin": ["enkephalin"], "Dynorphin": ["dynorphin a"], "N/OFQ": ["nociceptin"], "SP": ["substance p"], "NKA": ["neurokinin a"],
 "NKB": ["neurokinin b"], "NPY": ["neuropeptide y"], "PP": ["pancreatic polypeptide"], "SST": ["somatostatin"], "OX-A": ["orexin-a", "orexin a"],
 "OX-B": ["orexin-b", "orexin b"], "OT": ["oxytocin"], "AVP": ["vasopressin"], "CRF": ["corticotropin-releasing", "crf", "crh"],
 "Ucn": ["urocortin"], "α-MSH": ["α-msh", "alpha-msh", "melanocyte-stimulating"], "Mel": ["melatonin"], "PGE₂": ["pge2", "prostaglandin e2"],
 "BK": ["bradykinin"], "des-Arg-BK": ["des-arg"],
}
CHANNEL_KINDS = {"iglur", "iono_cat", "iono_cl"}
SPECIES = ["human", "rat", "mouse"]

def _norm(s):
    return re.sub(r"[^a-z0-9]", "", s.lower())

def read_rows(path):
    raw = open(path, encoding="utf-8-sig").read()
    lines = raw.splitlines()
    # the file opens with a version line before the header
    while lines and (lines[0].startswith("#") or lines[0].startswith('"#')):
        lines.pop(0)
    rd = csv.DictReader(io.StringIO("\n".join(lines)))
    cols = {_norm(c): c for c in rd.fieldnames}
    need = ["targetgenesymbol", "targetspecies", "ligand", "endogenous", "affinityunits", "affinitymedian", "affinityhigh", "affinitylow", "pubmedid"]
    missing = [n for n in need if n not in cols]
    if missing:
        sys.exit("interactions.csv has no column like: " + ", ".join(missing) + "\ncolumns are: " + ", ".join(rd.fieldnames))
    for row in rd:
        yield {n: (row.get(cols[n]) or "").strip() for n in need}

def num(s):
    try:
        return float(s)
    except ValueError:
        return None

def pick(rows, kind):
    order = ["pec50", "pki", "pkd"] if kind in CHANNEL_KINDS else ["pki", "pkd", "pec50"]
    for sp in SPECIES:
        here = [r for r in rows if r["targetspecies"].lower() == sp]
        for unit in order:
            got = [r for r in here if _norm(r["affinityunits"]) == unit]
            def central(r):
                m, hi, lo = num(r["affinitymedian"]), num(r["affinityhigh"]), num(r["affinitylow"])
                if m is not None: return m
                if hi is not None and lo is not None: return (hi + lo) / 2    # a range without a median: its midpoint
                return hi if hi is not None else lo
            vals = [central(r) for r in got]
            vals = [v for v in vals if v is not None]
            if vals:
                lows = [num(r["affinitylow"]) or num(r["affinitymedian"]) or num(r["affinityhigh"]) for r in got]
                highs = [num(r["affinityhigh"]) or num(r["affinitymedian"]) for r in got]
                return {"param": {"pec50": "pEC50", "pki": "pKi", "pkd": "pKd"}[unit], "value": round(statistics.median(vals), 2),
                        "low": round(min(v for v in lows if v is not None), 2), "high": round(max(v for v in highs if v is not None), 2),
                        "n": len(vals), "species": sp.capitalize(), "ligand": got[0]["ligand"],
                        "pmids": sorted({p for r in got for p in re.split(r"[|;, ]+", r["pubmedid"]) if p.isdigit()})}
    return None

def main(path, receptors_json=RECEPTORS):
    site = json.load(open(receptors_json))
    items = {it["id"]: (it, g["id"]) for g in site["groups"] for it in g["items"] if it["id"] in GENES}
    rows = [r for r in read_rows(path) if r["endogenous"].lower() in ("t", "true", "yes", "1")]
    out, review = {}, []
    for rid, (it, gid) in items.items():
        genes = set(GENES[rid]); words = LIGAND.get(it["lig"], [])
        cand = [r for r in rows if set(re.split(r"[|;, ]+", r["targetgenesymbol"].upper())) & genes
                and any(w in r["ligand"].lower() for w in words)]
        got = pick(cand, it["kind"])
        if got:
            out[rid] = got
        review.append({"receptor": it["name"], "id": rid, "genes": " ".join(sorted(genes)), "transmitter": it["lig"],
                       "rows_found": len(cand), **(got or {"param": "", "value": "", "low": "", "high": "", "n": 0, "species": "", "ligand": "", "pmids": []})})
    os.makedirs(OUT, exist_ok=True)
    json.dump(out, open(os.path.join(OUT, "affinities.json"), "w"), ensure_ascii=False, indent=1)
    with open(os.path.join(OUT, "affinities-review.csv"), "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(review[0].keys())); w.writeheader()
        for r in review: w.writerow({**r, "pmids": " ".join(r["pmids"])})
    print(f"{len(out)} of {len(items)} receptors have a value; see affinities-review.csv for every match and every gap")

if __name__ == "__main__":
    main(sys.argv[1])
