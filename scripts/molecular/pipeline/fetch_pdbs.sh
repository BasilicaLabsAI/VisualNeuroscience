#!/usr/bin/env bash
# Downloads the 39 structures from the GPCRdb GitHub mirror into the current directory (gp_<ID>.pdb), as prep5.py expects.
set -e
for id in 3PBL 4IAQ 4IAR 4IB4 5WIU 6A93 6BQG 6BQH 6CM4 6DRY 6G79 6LUQ 6WHA 7CKW 7CKZ 7CMU 7E2Y 7E2Z 7E32 7E33 7EXD 7JVQ 7JVR 7SRR 7UM4 7UM5 7VOE 7WC4 7WC5 7WC6 7XT8 7XTB 7XTC 8IRR 8IRS 8IRT 8IRU 8IRV 8U02; do
  [ -s "gp_$id.pdb" ] || curl -sS -f -o "gp_$id.pdb" "https://raw.githubusercontent.com/protwis/gpcrdb_data/master/structure_data/pdbs/$id.pdb"
done
echo "$(ls gp_*.pdb | wc -l) PDB files"
