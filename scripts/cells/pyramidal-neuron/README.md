# Pyramidal cell: the drawing behind the Microanatomy page

An original drawing of a layer V pyramidal cell of the cerebral cortex, generated from code
(seeded), with 19 clickable structures. The page that shows it, `site/microanatomy.html`, adds
the Explore and Test-yourself modes, zoom and pan, and the site's light and dark themes; the
plate logic is `site/assets/cells.js`.

This is the cortex's own cell, and the drawing is built to show why it is worth a plate of its
own: the pyramid-shaped body, the single apical dendrite climbing through every layer to a tuft
under the pia, the obliques leaving that trunk, the basal skirt, spines everywhere, and a
myelinated axon heading for the white matter with a collateral turning back. The cortical layers
are drawn faintly behind it as context and are not click targets.

## What this builds
- `site/assets/cells/pyramidal-neuron.svg`: the drawing, with `data-part` on every click target
  and `data-vis` on everything that recolours. It carries no colours of its own: the page paints
  it through custom properties, so it follows the theme.
- `site/assets/cells/pyramidal-neuron.json`: the nineteen structures, each with its accent
  colour, label anchor and position, name, description and quiz wording, plus the `box` the
  plate takes its shape from.

Edit here, not in the built files.

## Rebuild
    cd scripts/cells/pyramidal-neuron
    python3 build.py        # seed 7, rewrites both files under site/assets/cells/
    python3 build.py 21     # a different cell of the same kind

Standard library only: no numpy, no shapely, nothing to install. Seed 7 reproduces the drawing
the page ships.

## How it is drawn
Every dendrite and the axon is a centreline plus a radius that tapers along it, grown by a
seeded random walk inside rules about where a pyramidal cell sends its branches. A run of
centreline is stroked twice, once in ink a little wider and once in the cell colour on top, so
branches merge into one silhouette instead of showing seams. Runs whose radius rounds to the
same step share a stroke width, and one path element carries every run of that width in a
structure, which is what keeps the file to a few hundred elements.

Nothing is allowed out of the frame: the tuft is clamped under the pia, which is also what a
real tuft does, and the basal skirt is clamped at the sides.

## Conventions in the drawing
- `data-part="<id>"` marks a click target. `data-vis="<id>"` marks what gets recoloured:
  `.on` selected, `.hov` hover, `.no` wrong answer. Each carries its accent as an inline `--acc`.
- Stroke is an inherited SVG property, so a classed group holds the colour and its paths carry
  only their width.
- Document order is click order: the wide structures lay their targets down first, and
  everything small is drawn afterwards and keeps its own clicks. The hillock and the initial
  segment are narrow and stand under the basal skirt, so their targets go down after the spines.
- Accents are dealt round the same rainbow the multipolar neuron uses, ordered by `HUE_ORDER` so
  that nothing touching anything else lands near it in hue. The axon and its sheath are the
  furthest apart of all, because they overlap.
- To add a structure: geometry near the top, markup in the emit section, then an entry in
  `PARTS`, `HUE_ORDER`, `TEXT`, `ANCHOR` and `LABEL`. The page counts the structures itself.

## The classes the page must define
Beyond the ones the multipolar neuron already needs, this drawing uses `mn-band`,
`mn-band-line`, `mn-band-t` and `mn-band-edge` for the cortical layers, `mn-myelin` and
`mn-mye-body` for the sheath, `mn-node-mark` for the bare gaps, `mn-oligo` and `mn-oli-nuc` for
the glial cell, and `mn-exc-b` and `mn-inhib-b` for the two kinds of terminal.
