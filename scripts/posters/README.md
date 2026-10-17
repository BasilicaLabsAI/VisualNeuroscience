# The print posters

Two A1 portrait posters (594 × 841 mm) in the site's light theme, for white
matte paper: **The Neurotransmitters**, every transmitter on the Microanatomy
page drawn as a skeletal formula at one bond length, and **The Receptors**,
the 108 receptors of the same page with the affinity of each for its own
transmitter on a common scale.

    sh scripts/posters/build.sh

builds both into `scripts/posters/out/` as a vector PDF to print and a PNG to
look at. The first run makes a Python environment in `scripts/posters/.venv`
(RDKit, segno, fontTools, brotli, pypdf), converts the site's Flux to
TrueType outlines (`otf2ttf.py`: Chromium writes PostScript-outlined fonts
into a PDF as Type 3, which print shops flag), and fetches Noto Serif and
Noto Sans from npm for the Greek letters the site's faces do not carry.
`render.js` needs Playwright and Chromium, as the site's own checks do.
Nothing under `out/` is committed.

## Where the words and numbers come from

- The molecules and what is said about them come from
  `scripts/neurotransmitters/build.py`, the receptors, their couplings and
  transmitters from `site/assets/rx/receptors.json`, so a poster says what
  the site says. Change the site's data and rebuild.
- The affinities come from the IUPHAR/BPS Guide to PHARMACOLOGY, and only
  from there:

      curl -o scripts/posters/out/interactions.csv https://www.guidetopharmacology.org/DATA/interactions.csv
      python3 scripts/posters/extract_gtopdb.py scripts/posters/out/interactions.csv

  writes `out/affinities.json`, which `rx_poster.py` reads, and
  `out/affinities-review.csv`, a line for every receptor saying which rows
  were used or why none were. Read the review file before printing.
  Without `affinities.json` the receptor poster renders as a layout proof,
  marked as one, with its scales empty: no number is ever entered by hand.
  The database is under the Open Database Licence 1.0 and its content under
  CC BY-SA 4.0 (cite Harding SD et al., *Nucleic Acids Res* 2024); the
  poster's colophon carries the attribution. Record it in
  `docs/PERMISSIONS.md` when the numbers go in.

## Checks

`render.js` prints a line naming anything that overflows; it does not stop
for it, so read the line. A finished PDF is 594.1 × 841.0 mm, one page,
every font embedded as a Type 0 subset of the site's faces or Noto, and no
raster images. Every molecule is asserted to be drawn at its stated bond
length, within 2 %.
