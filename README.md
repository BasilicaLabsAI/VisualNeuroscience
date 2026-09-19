# VisualNeuroscience

Brain mapping in the browser. Five instruments, one site, no server:

- **Region Atlas** (`site/index.html`, the homepage) — an interactive MRI brain map. Highlight any of the 62 named AAL-116 regions on the MNI152 template and study it across axial, coronal and sagittal planes and a 3D volume render, with direction locks and a shared crosshair. The 41 Brodmann areas live on the same page: searchable by number, gyrus or function, pickable from the two-face line map, and drawn on the scan from their own label volume alongside the AAL parcels. The border graph that used to accompany them is retired from the page, but its measured edges stay in `site/assets/brodmann-areas.js` and the hull in `site/assets/brain-hull.js` for later use.
- **Tractography** (`site/tracts.html`) — a whole-brain tractogram from the HCP1065 population atlas, turnable in the browser, with streamlines coloured by the direction each fibre runs. The web-sized asset is built by `scripts/make_tractogram.py`; see `scripts/README.md`.
- **Hallucinations** (`site/hallucinations.html`) — what neuroimaging finds in the hallucinating brain, after Boksa's 2009 editorial. Each region the editorial names is drawn on its own AAL parcels; switching between normal audition and the hallucinating state lights the overactive areas against the weakened control systems.
- **Receptor Density** (in the Region Atlas) — neurotransmitter receptor densities across the 45 cerebral AAL regions, from two open sources kept apart: in vivo PET (19 receptors and transporters, group-average tracer maps compiled by Hansen et al. 2022, charted as each receptor's share of its densest region because the tracers report different quantities) and ex vivo autoradiography (15 receptors, Zilles & Palomero-Gallagher 2017, fmol/mg protein). Chart, heat-map and table; clicking a region lights it on the same viewer; every receptor carries its tracer, sample and citation.
- **Microanatomy** (`site/microanatomy.html`) — the brain at the cell's scale. Original drawings generated from code, so far a large multipolar neuron (`scripts/cells/multipolar-neuron/`, needs numpy and shapely), with every structure a click target, an index that describes each, a colour-everything view and a test-yourself mode that asks for each from memory. The tiles above the plate switch cells without a reload. A layer V cortical pyramidal cell has its generator ready (`scripts/cells/pyramidal-neuron/`, standard library only) but is held back from the page for now; its tile is greyed out until it ships. More cells follow the same two-file pattern in `site/assets/cells/`: one SVG marked with `data-part` and `data-vis`, one JSON naming the structures and the frame to draw them in. Below the cells, the neurotransmitters: seventeen of them drawn as skeletal formulas by `scripts/neurotransmitters/build.py` (RDKit) into `site/assets/nt/molecules.json`, each with its formula, its role and a few lines on what it does.
- **Network Atlas** (`site/network-atlas.html`) — brain states drawn as a circular graph beside the scan: fourteen regions in seven networks, with a thread between every pair whose coupling changes in the state chosen, and six states — flow, rest, focused attention, threat, reward pursuit and meditation — each with its own sources. Click a region on the ring and it lights up on the brain in its own colour, with the planes centring on it and the regions it couples to held at half strength. Where a region has no atlas parcel — the ventral striatum, the VTA, the locus coeruleus — the page says so and parks the crosshair at a published coordinate rather than borrowing a neighbour.

Everything is static: open any of them in a browser and it works. The pages share `site/assets/` — the viewer library, the scan payload (MNI152 template + AAL-116 parcellation) and the viewport styling — and the scans load only when first needed.

## Hosting (auto-deploy on merge to `main`)

The site deploys as a Cloudflare Worker connected to this repository. `wrangler.jsonc` at the repo root points the deploy at the static files in `site/`, and nothing else. Every merge to `main` publishes automatically; other branches get preview deployments.

If a deploy misbehaves, check the Worker's build settings (**your Worker → Settings → Build**): production branch `main`, no build command, deploy command `npx wrangler deploy`, root directory `/`.

## Data

- `backend/data/receptors/` — the receptor tables the atlas draws, as CSV: PET parcel means per AAL region (CC BY-NC-SA 4.0, Hansen et al. 2022 compilation) and autoradiography densities mapped area by area (CC BY 4.0, Zilles & Palomero-Gallagher 2017), built by `scripts/build_receptor_data.mjs` from a clone of the Hansen repository. `backend/data/ReceptorDensity.csv` and `backend/data/original/` are the unsourced placeholder table this replaced, kept for the record and used by nothing.
- `backend/data/ReceptorTypes.csv` — the reference table of receptor sub-types with family, category and mechanism.
- `site/assets/tracts/hcp1065.trk` — the web tractogram, built locally rather than committed (see `scripts/README.md`).
- `docs/atlas-regions.txt` — the full AAL-116 region list the brain map carries, with each region's label number.
- 3D export (glTF, USDZ, OBJ, STL, PLY, VRML, X3D) and saved models are described in `docs/EXPORT-3D.md`; the geometry is built in the browser by `site/assets/export3d.js`.
- An MCP server (`mcp-worker/`) lets Claude, ChatGPT and Kimi ask the atlas questions, with deep links back into the pages; see `docs/MCP.md`.

The Python modules in `backend/` (`BrainMapping.py`, `UniversalTools.py`) and the notebooks alongside the data are the processing and exploration tools the dataset was built with.
