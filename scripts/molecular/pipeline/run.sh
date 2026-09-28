#!/usr/bin/env bash
# Rebuilds receptors.html from the sources. Run from the package root: bash pipeline/run.sh [--prep]
# OUT=<path> writes the page somewhere other than work/receptors.html; build.sh beside this folder sets it to the site.
# --prep re-runs the structure processing (needs the PDB files: bash pipeline/fetch_pdbs.sh inside work/ first). Without it, the
# saved model JSONs in data/ are used and only the viewer (JS/CSS/markup) is reassembled, which takes a couple of seconds.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; mkdir -p "$ROOT/work"; cd "$ROOT/work"
cp -n "$ROOT"/data/* . 2>/dev/null || true
cp "$ROOT"/viewer/* . && cp "$ROOT"/pipeline/*.py .
if [ "$1" = "--prep" ]; then python3 prep5.py > prep5.log; fi
python3 build5.py
node -e "new Function(require('fs').readFileSync('t4_all.js','utf8')); console.log('JS syntax ok')" 2>/dev/null || true
echo "built ${OUT:-$ROOT/work/receptors.html}"
