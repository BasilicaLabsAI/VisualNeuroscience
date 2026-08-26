# Building the web tractogram

The Tractography page (`site/tracts.html`) draws a single file:

    site/assets/tracts/hcp1065.trx

The page ships with `site/assets/tracts/hcp1065.trx` already committed: the
HCP1065 atlas at 24,208 streamlines, 6.1 MB, taken from the subsampled
redistribution in NiiVue's demo images. Nothing needs building to run the site.

This script is for rebuilding that asset from the full published atlas — when
you want a different streamline count, a subset of bundles, or a refresh from
the primary source. The published atlas is a few hundred megabytes and the web
copy has to fit inside Cloudflare's 25 MiB per-asset ceiling.

## 1. Get the atlas

Download the **HCP1065 population-averaged tractography atlas, TRK version**:

  https://brain.labsolver.org/hcp_trk_atlas.html

It is distributed as per-bundle `.trk` files. Put them anywhere; the script
takes either a single file or a directory it will merge.

Licence: CC BY-SA 4.0. Derived from Human Connectome Project data — the
attribution on the page must stay as it is.

## 2. Build the web copy

    pip install nibabel numpy
    python3 scripts/make_tractogram.py --input ~/Downloads/HCP1065_trk \
        --out site/assets/tracts/hcp1065.trk

Which does, in order:

1. merges every `.trk` under `--input`, keeping the first file's spatial header
2. drops streamlines shorter than `--min-length` (20 mm), which are mostly noise
3. randomly subsamples to `--count` streamlines (28,000 by default), with a
   fixed `--seed` so the same atlas always gives the same file
4. decimates points along each streamline (`--stride`, default every 2nd point,
   endpoints always kept so curves still land correctly)
5. raises the stride, then trims streamlines, until the result is under 20 MB
6. writes the `.trk`

It prints the size it is heading for at each step, then the final count. If it
exits complaining it is still too large, lower `--count`.

## 3. Check it

    npx wrangler dev          # or: npx http-server site
    open http://localhost:8787/tracts.html

The page streams the file with a progress bar, then renders it. About
25–30k streamlines reads as dense without dropping frames on a mid-range
laptop; past roughly 40k the frame rate starts to suffer.

## Tuning the look

Density is mostly `--count`. On the page itself, the **Thickness** slider is
NiiVue's `fiberRadius` — 0.2–0.4 mm reads painterly, above 0.6 the streamlines
start to merge into ribbons. `fiberDither` is set to 0.1 in the page source:
raise it for a softer, more scattered look, drop it to 0 for clean tubes.

## Why not .trx

NiiVue reads `.trx` too, and it compresses better. `nibabel` cannot write it
without the extra `trx-python` package, so the pipeline stays on `.trk` to keep
the dependency list to two. If the atlas ever outgrows 20 MB as `.trk`, adding
`trx-python` and writing `.trx` is the next move.

## Brodmann atlas

`site/assets/brodmann.nii.gz` is the Brodmann parcellation the Brodmann Areas
page draws: 181 × 217 × 181 at 1 mm, uint8, 41 labelled areas, 175 KB.

Provenance: the `brodmann.nii.gz` shipped with MRIcron
(github.com/neurolabusc/MRIcron, `Resources/templates/`), Chris Rorden,
**BSD licence** — permissive, commercial use permitted, the copyright notice
must be retained. That is a materially different position from the tractogram,
which is CC BY-SA 4.0.

It shares its affine exactly with `aal.nii.gz` — same dims, same 1 mm pixdim,
same srow — so it drops into the existing overlay with no resampling.

The 41 areas are those the volume actually labels. Brodmann described 52;
12–16, 31, 33 and 49–52 have no agreed human counterpart and are absent.
