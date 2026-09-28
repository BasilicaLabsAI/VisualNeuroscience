# The molecular viewer

`site/assets/molecular/receptors.html` is a single self-contained page: an
interactive three.js viewer of the five human dopamine receptors (D1 to D5)
and the twelve serotonin GPCRs (5-HT1A, 1B, 1D, 1E, 1F, 2A, 2B, 2C, 4, 5A,
6, 7), built from 39 experimental structures. Everything but three.js and the
site's fonts is inline: the CSS, the JS and the coordinate data. The section
page `site/molecular.html` frames it. This folder is its source; the page is
never edited by hand.

## What is in the page

| Part | Notes |
|---|---|
| Size | About 2.4 MB on disk, 750 KB gzipped; 2.26 MB of it is the JSON data block (`<script type="application/json" id="d2data">`). |
| Requests | three.js r128 from `site/vendor/three/three.min.js` (only the global `THREE` is used, no OrbitControls) and the site's own fonts from `site/fonts/`. No images, no fetches, no analytics, no storage. |
| Rendering | WebGL 1/2 via three.js. If WebGL cannot start, the page shows a plain message in `#fail` instead of a blank canvas. |
| Layout | Fills its own viewport. Panel on the left at widths over 760 px; at 760 px and under the panel docks at the bottom and the 3D view sits above it. Touch (pinch, drag, tap) is supported. |
| Theme | Dark unless the reader chose light, read from the site's `mn-theme` key before first paint; `data-theme="dark"` or `"light"` on the viewer's `<html>` is watched, and the section page sets it when the reader switches. All colours are CSS custom properties on `:root`. |
| Typefaces | The site's three, mapped at the end of `viewer/extra.css`: Prata for headings and names, Newsreader for the reading text, Flux (Afacad Flux) for the controls, the pocket table and the labels on the model. |
| Accessibility | Tabs are ARIA tablists with arrow-key navigation, the canvas is focusable (arrow keys rotate, plus and minus zoom), state captions are `aria-live`, every control is a real button or input. |

## Embedding

The page assumes it owns its window (`html, body { height: 100% }`,
fixed-position overlays, `window.innerWidth/innerHeight` for layout), so it
is framed rather than pasted into another page. `site/molecular.html` gives
the frame the rest of the viewport under the title strip, never less than
560 px, and re-measures it on resize. It runs a `requestAnimationFrame` loop
while visible.

## Deep links

The page reads its URL on load and on `hashchange`. Values are
case-insensitive. The section page passes its own query and hash straight
through, so every form below also works on `molecular.html`.

| Parameter | Values | Example |
|---|---|---|
| `receptor` (or `rx`) | `D1` to `D5`, `5-HT1A`, `5-HT1B`, `5-HT1D`, `5-HT1E`, `5-HT1F`, `5-HT2A`, `5-HT2B`, `5-HT2C`, `5-HT4`, `5-HT5A`, `5-HT6`, `5-HT7` (`5ht2a` and `ht2a` also accepted). Sets the family as well. | `?receptor=5-HT2A` |
| `family` | `dopamine` or `serotonin` (only needed without `receptor`) | `?family=serotonin` |
| `tab` | `binding`, `drugs`, `compare`, `display`, `about` | `?receptor=D2&tab=compare` |
| `drug` | a drug name as shown on that receptor's Drugs tab, e.g. `LSD`, `psilocin`, `risperidone`, `aripiprazole`, `haloperidol`, `ergotamine`, `lasmiditan` (switches to the Drugs tab) | `?receptor=5-HT2A&drug=LSD` |
| `stop` | 0-based step of the Binding-tab tour (`0` = ligand outside, last = loops) | `?receptor=D2&tab=binding&stop=2` |
| `panel` | `hidden` collapses the text panel; `shown` opens it | `?receptor=5-HT7&panel=hidden` |

Hash form, same meaning: `#5-HT2A/drugs/LSD` (`#receptor/tab/drug`). With no
parameters: dopamine, D2, Binding tab, tour at step 0. The section page keeps
the hash form in its own address as the reader moves about.

## Driving it from a host page

Same origin, a small API on the viewer window:

```js
const v = document.querySelector('iframe').contentWindow.receptorViewer;
v.show({ receptor: '5-HT1A', tab: 'drugs', drug: 'aripiprazole' });   // any subset of the deep-link keys
v.show({ receptor: 'D3', tab: 'binding', stop: 2 });
v.state();                // { family, receptor, tab, drug, stop, stops }
v.families();             // ['dopamine', 'serotonin']
v.receptors('serotonin'); // ['5-HT1A', ...]
v.drugs();                // drugs available for the current receptor
```

Any origin, postMessage with the same keys and `type: 'receptor-viewer'`:

```js
iframe.contentWindow.postMessage({ type: 'receptor-viewer', receptor: '5-HT4', tab: 'compare' }, '*');
```

The viewer posts its state to `window.parent` (target origin `*`, nothing
sensitive) once after loading and on every receptor, tab or drug change, as
`{ type, family, receptor, tab, drug, stop, stops }`. It does not change its
own URL as the reader navigates; the host keeps the address.

## What the content covers

- **Binding tab**: the receptor's neurotransmitter (or a stand-in agonist) arrives, docks, switches the receptor on, and the G protein docks, in a four-to-six-step tour generated from measured geometry (contact distances, TM6 movement, ionic lock). Stand-ins where no neurotransmitter-bound structure exists: rotigotine (D3, D4, D5), donitriptan (5-HT1B), BRL-54443 (5-HT1E), lasmiditan (5-HT1F), LSD (5-HT2B), ergotamine (5-HT2C), 5-CT (5-HT5A, 5-HT7). 5-HT2A's serotonin structure has no G protein, so its tour skips the docking step and points to the Gq complex on the Drugs tab.
- **Drugs tab**: 24 ligands in their own structures (antipsychotics, Parkinson's agonists, triptans and ergots, lasmiditan, LSD, psilocin, tool compounds). 5-HT1D, 5-HT4 and 5-HT6 have no drug-bound structure and say so.
- **Compare tab**: every subtype of the family in a comparable agonist-bound state, with a Ballesteros-Weinstein pocket table and facts (helix identity to D2 or 5-HT2A, loop-3 and tail length, TM6 shift).
- **Display tab**: membrane, neurotransmitter, drugs, unresolved beads, labels, slow spin, side-chain mode, D2 isoform.
- **About tab**: every structure with its citation, and how the models were assembled.
- 5-HT3, a ligand-gated ion channel, is deliberately absent.

## Editing and rebuilding

```
pipeline/   prep5.py (PDB to per-receptor model JSON), build5.py (assembles the page), run.sh, fetch_pdbs.sh, requirements.txt
viewer/     t4_common.js, t4_model.js, t4_engine.js, t4_engine2.js, base.css, extra.css, t4_markup.html
data/       model_*.json (17 receptors), families.json, citations.json, refs.json, model_pts.npy, annot.xlsx (GPCRdb), fam.json, tour_cam2.json, cam_override2.json
tests/      test.py, stress.py, api_test.py and their step lists (Playwright, headless Chromium)
build.sh    rebuilds the page into site/assets/molecular/receptors.html
```

- **Text and copy**: edit the JS in `viewer/` and run `bash scripts/molecular/build.sh` (a couple of seconds; Python 3 with numpy and scipy, and node for the syntax check). Then bump `VERSION` in `site/sw.js`.
  - Drug blurbs: `DRUGTEXT` (and `D2TEXT` overrides) in `t4_common.js`. Residue notes: `BWNOTE`; G-protein notes: `GNOTE`; receptor captions: `RXINFO`, `GPMETA`.
  - Tour wording: `stopsFor()` and `SIGNOTE`/`LOOPTEXT` in `t4_engine.js`.
  - Compare-tab blurbs: `SUBTXT`, `CMPINTRO`, `TABLENOTE` in `t4_engine2.js`.
  - Markup and the About references: `t4_markup.html` (dopamine refs are static; serotonin refs are generated by `build5.py` from `citations.json`).
  - Colours: the custom properties at the top of `base.css` (light, dark, forced-light and forced-dark blocks). Typefaces: the block at the end of `extra.css`.
- **Adding or swapping a structure**: add a `C_(pdb, ligandCode, name, hasGprotein, citation, method)` entry to `SPECS` in `prep5.py` (see the existing ones for the `chain=` and `renum=` options), drop the PDB in `work/` as `gp_<ID>.pdb` (`fetch_pdbs.sh` pulls the current 39 from the GPCRdb GitHub mirror), then `bash scripts/molecular/build.sh --prep` (rebuilds all 17 models, about five minutes; needs pandas and openpyxl as well) or `python3 prep5.py <KEY>` inside `work/` for one receptor. `build5.py` reads citations from the PDB `JRNL` records when the file is present and caches them in `citations.json`.
- Coordinates come from GPCRdb's mirror of the Protein Data Bank; per-structure processing (chain selection, mutations, loop borrowing, superposition into the D2 frame, contact analysis, bead paths) is all in `prep5.py`.
- `work/` is the build's scratch folder and is not committed.

## Tests

`tests/test.py` and `tests/stress.py` drive the built page through headless
Chromium (`pip install playwright`; the browser path is `CHROME`, by default
`/opt/pw-browsers/chromium`) with step lists such as `tests/sero_a.json`;
`tests/api_test.py` frames the page and exercises the postMessage API.
Screenshots land in `work/shots/`.

## Attribution

Structure coordinates are Protein Data Bank entries (public domain, CC0)
obtained via GPCRdb (gpcrdb.org); each is cited on the About tab. three.js is
MIT-licensed (`site/vendor/three/LICENSE`); the fonts are the site's, under
the SIL Open Font License. `docs/PERMISSIONS.md` carries the same.

## Known limitations

- Needs WebGL; without it the page shows the fallback message only.
- First load is 2.4 MB (750 KB gzipped) and parses the JSON up front; models build lazily per receptor after that.
- Bead paths for unresolved loops and tails and the ligand's entry path are illustrative, and the resting-to-active morph is a linear interpolation, as the About tab states.
