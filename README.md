# VisualNeuroscience

Brain mapping in the browser. Five instruments, one site, no server:

- **Region Atlas** (`site/index.html`, the homepage) — an interactive MRI brain map. Highlight any of the 62 named AAL-116 regions on the MNI152 template and study it across axial, coronal and sagittal planes and a 3D volume render, with direction locks and a shared crosshair.
- **Tractography** (`site/tracts.html`) — a whole-brain tractogram from the HCP1065 population atlas, turnable in the browser, with streamlines coloured by the direction each fibre runs. The web-sized asset is built by `scripts/make_tractogram.py`; see `scripts/README.md`.
- **Hallucinations** (`site/hallucinations.html`) — what neuroimaging finds in the hallucinating brain, after Boksa's 2009 editorial. Each region the editorial names is drawn on its own AAL parcels; switching between normal audition and the hallucinating state lights the overactive areas against the weakened control systems.
- **Receptor Density** (`site/receptors.html`) — neurotransmitter receptor densities across the brain. Read one receptor family across every brain structure, or turn the chart around and read one structure across every receptor; see sub-types individually or summed. Clicking a structure lights it up on the same MRI viewer. The measured density ranges and a reference table of all 159 receptor sub-types sit on adjacent tabs.
- **Network Atlas** (`site/network-atlas.html`) — brain states drawn as a circular graph beside the scan: fourteen regions in seven networks, with a thread between every pair whose coupling changes in the state chosen, and six states — flow, rest, focused attention, threat, reward pursuit and meditation — each with its own sources. Click a region on the ring and it lights up on the brain in its own colour, with the planes centring on it and the regions it couples to held at half strength. Where a region has no atlas parcel — the ventral striatum, the VTA, the locus coeruleus — the page says so and parks the crosshair at a published coordinate rather than borrowing a neighbour.

Everything is static: open any of them in a browser and it works. The pages share `site/assets/` — the viewer library, the scan payload (MNI152 template + AAL-116 parcellation) and the viewport styling — and the scans load only when first needed.

## Hosting (auto-deploy on merge to `main`)

The site deploys as a Cloudflare Worker connected to this repository. `wrangler.jsonc` at the repo root points the deploy at the static files in `site/`, and nothing else. Every merge to `main` publishes automatically; other branches get preview deployments.

If a deploy misbehaves, check the Worker's build settings (**your Worker → Settings → Build**): production branch `main`, no build command, deploy command `npx wrangler deploy`, root directory `/`.

## Data

- `backend/data/ReceptorDensity.csv` — the merged dataset behind the receptor page: density ranges (fmol/mg) for 65 receptor sub-type columns across 18 brain structures. Merged from the per-receptor sources in `backend/data/original/` by `00 - ReceptorDensityDataMerge.py`.
- `backend/data/ReceptorTypes.csv` — the reference table of receptor sub-types with family, category and mechanism.
- The chart data embedded in `site/receptors.html` derives from the merged CSV with each `min:max` range collapsed to its max value.
- `site/assets/tracts/hcp1065.trk` — the web tractogram, built locally rather than committed (see `scripts/README.md`).
- `docs/atlas-regions.txt` — the full AAL-116 region list the brain map carries, with each region's label number.
- 3D export (glTF, USDZ, OBJ, STL, PLY, VRML, X3D) and saved models are described in `docs/EXPORT-3D.md`; the geometry is built in the browser by `site/assets/export3d.js`.
- An MCP server (`mcp-worker/`) lets Claude, ChatGPT and Kimi ask the atlas questions, with deep links back into the pages; see `docs/MCP.md`.

The Python modules in `backend/` (`BrainMapping.py`, `UniversalTools.py`) and the notebooks alongside the data are the processing and exploration tools the dataset was built with.
