# Multipolar neuron: the drawing behind the Microanatomy page

An original drawing of a large multipolar neuron, generated from code (seeded), with 17
clickable structures. The page that shows it, `site/microanatomy.html`, adds the Explore and
Test-yourself modes, zoom and pan, and the site's light and dark themes; the plate logic is
`site/assets/cells.js`.

## What this builds
- `site/assets/cells/multipolar-neuron.svg`: the drawing, with `data-part` on every click target
  and `data-vis` on everything that recolours. It carries no colours of its own: the page paints
  it through custom properties, so it follows the theme.
- `site/assets/cells/multipolar-neuron.json`: the seventeen structures, each with its accent
  colour, label anchor and position, name, description and quiz wording.

Edit here, not in the built files.

## Rebuild
    pip install numpy shapely
    cd scripts/cells/multipolar-neuron
    python3 build.py        # seed 12, rewrites both files under site/assets/cells/
    python3 build.py 25     # a different arbor

Seed 12 reproduces the drawing the page ships.

## Where things live
- `neuron.py`: the geometry, in stages. 1 soma, axon, trunks. 2 synapses and astrocyte.
  3 dendrite growth. 4 silhouette and regions. 5 spines. 6 organelles.
- `tree.py`, `geom.py`: branch grower with collision rejection; outline and path helpers.
- `silhouette.py`: shapely polygon to compact SVG path data.
- `emit.py`: the SVG markup, accent hues (`HUE_T`), label anchors and label positions.
- `parts_text.py`: names, descriptions and quiz wording for the 17 structures. The descriptions
  are uncited textbook-level text, and the page says so.
- `build.py`: runs the above and writes the two assets.

## Conventions in the drawing
- `data-part="<id>"` marks a click target. `data-vis="<id>"` marks what gets recoloured:
  `.on` selected, `.hov` hover, `.no` wrong answer. Each carries its accent as an inline `--acc`.
- Two-pass outline: the silhouette and the spines are drawn once in ink (wider) and once in the
  cell colour on top, so branches merge cleanly.
- Fills inside `<use>` clones come from inherited custom properties (`--of` fill, `--ol` line),
  because selectors cannot reach into `<use>` shadow trees. The plate's colour tokens and rules
  live in the page's stylesheet.
- To add a structure: geometry in `neuron.py`, markup in `emit.build()`, then an entry in
  `PARTS`, `HUE_T`, `anchors()` and `parts_text.TEXT`.

## Adding another cell
A cell is one SVG and one JSON in `site/assets/cells/` following the same conventions, plus a
tile on the page. `cells.js` reads the pair named by the plate's `data-cell` attribute.
