# Receptors and channels: the catalogue on the Microanatomy page

A hundred and fifty receptors, ion channels and transporters in fifteen groups, for the section
under the neurotransmitters in `site/microanatomy.html`. The page's `site/assets/rx.js` fetches
what this builds and lays the tiles out.

## What this builds
- `site/assets/rx/receptors.json`: the ten kinds of machine, each with a label, what the kind
  means and an SVG schematic; then the groups, and for each entry its id, name, kind, the labels
  written into the schematic (ligand, ion, G protein, effector), what binds it and how tightly,
  what it does, and a line of context.

Edit here, not in the built file. Standard library only.

## The schematics
One drawing per architecture, in `build.py`: `lgic` (a ligand-gated channel, side view),
`iglur` (the tetrameric glutamate receptor with its clamshells), `gpcr` (seven helices and the
G protein), `vgc` (a voltage-gated channel with its S4 sensors), `pore` (a background channel)
and `carrier` (a transporter). They carry no colours; the page paints them through its custom
properties. Text elements marked `data-slot` are filled by `rx.js` for each molecule, and a slot
with nothing to say is removed.

## The words
`GROUPS` in `build.py` holds every entry as a tuple: id, name, kind, ligand label, ion label,
G-protein label (blank to take the kind's default), what binds it, what it does, a note. The
descriptions are uncited textbook-level text, and the page says so. To add an entry: one tuple
in the right group. To add a kind: an entry in `KINDS` naming one of the six drawings.
