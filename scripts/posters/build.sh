#!/bin/sh
# Builds the two A1 print posters into scripts/posters/out/: see README.md.
#   sh scripts/posters/build.sh            both posters
#   PY=/path/to/python sh build.sh         with a Python that already has the packages
set -e
cd "$(dirname "$0")"
mkdir -p out/fontpkgs

if [ -z "$PY" ]; then
  [ -x .venv/bin/python ] || { python3 -m venv .venv && .venv/bin/pip install -q rdkit segno fonttools brotli pypdf; }
  PY=.venv/bin/python
fi

# Flux with TrueType outlines, so the PDF embeds it as a real font (otf2ttf.py)
[ -f out/Flux-Regular-tt.ttf ] || "$PY" otf2ttf.py ../../site/fonts/Flux-Regular.woff2 out/Flux-Regular-tt.ttf

# Noto's Greek, for the letters none of the site's three faces carries
for f in noto-serif noto-sans; do
  d=out/fontpkgs/fontsource-$f-5.3.0
  [ -d "$d" ] || { (cd out/fontpkgs && npm pack "@fontsource/$f@5.3.0" --silent >/dev/null) && mkdir -p "$d" && tar -xzf "$d.tgz" -C "$d"; }
done

"$PY" nt_poster.py
"$PY" rx_poster.py
NODE_PATH="$(npm root -g)" node render.js out/nt_poster.html out/nt_poster
NODE_PATH="$(npm root -g)" node render.js out/rx_poster.html out/rx_poster
