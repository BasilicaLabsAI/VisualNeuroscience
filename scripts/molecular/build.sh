#!/usr/bin/env bash
# Rebuilds the molecular viewer into the site: site/assets/molecular/receptors.html.
# Needs Python 3 with numpy and scipy (pip install -r pipeline/requirements.txt) and node for
# the syntax check. Pass --prep to re-run the structure processing as well, which needs the
# PDB files (bash pipeline/fetch_pdbs.sh inside work/ first) and pandas with openpyxl.
# After a rebuild, bump VERSION in site/sw.js so readers' caches pick the new page up.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/../../site/assets/molecular/receptors.html" bash "$HERE/pipeline/run.sh" "$@"
