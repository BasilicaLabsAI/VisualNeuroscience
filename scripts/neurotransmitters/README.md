# Neurotransmitters: the formulas on the Microanatomy page

Seventeen neurotransmitters drawn as skeletal formulas, in seven groups, for the section
under the cell plates in `site/microanatomy.html`. The page's `site/assets/nt.js` fetches what
this builds and lays the tiles out.

## What this builds
- `site/assets/nt/molecules.json`: the groups, and for each molecule its id, name, role,
  formula, description and drawing. The drawing is an inline SVG with no colours of its own:
  its paths refer to `--ink` and the `--el-n`, `--el-o`, `--el-s`, `--el-p` custom properties
  the page defines for nitrogen, oxygen, sulfur and phosphorus, so it follows the theme.

Edit here, not in the built file.

## Rebuild
    pip install rdkit
    cd scripts/neurotransmitters
    python3 build.py

## Where things live
- `GROUPS` in `build.py`: each group's name, a one-line note, and its molecules as
  (id, name, SMILES, role, description). The descriptions are uncited textbook-level text,
  and the page says so.
- `draw()`: RDKit's 2D layout and SVG drawer, then the header, background, fixed size and
  metadata stripped, and every colour matched to the nearest of the stand-in palette and
  swapped for its custom property.

To add a molecule: one tuple in the right group. To add a group: a `dict` with an id, a name,
a `kind` (the word the tile's kicker uses) and a note.
