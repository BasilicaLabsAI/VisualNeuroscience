# Tract assets

`hcp1065.trx` is the whole-brain tractogram the Tractography page draws:
the HCP1065 population-averaged tractography atlas, 24,208 streamlines across
87 named bundles, 6.1 MB — comfortably inside Cloudflare's 25 MiB per-asset
ceiling, so it is committed rather than built at deploy time.

Provenance: HCP1065 atlas, Yeh FC, *Nat Commun* 13:4933 (2022), CC BY-SA 4.0,
derived from Human Connectome Project data. This copy is the subsampled
redistribution that ships with NiiVue (`packages/niivue/demos/images/yeh2022.trx`),
which is already at the streamline count the page wants. The attribution on the
page is required by the licence — leave it in place.

`hcp1065-regions.json` (v12.59) says which streamlines run through which AAL
region, for the page's region box: for each label, in `assets/atlas-data.js`'s
order, the streamlines whose drawn line enters the region's own voxels, walked
at 1 mm, with no margin. It is written by `scripts/make_tract_regions.py` from
the tractogram and `assets/aal.nii.gz`, and must be written again whenever the
tractogram is rebuilt: the page checks its streamline count.

To rebuild from the full published atlas instead — if you want a different
streamline count, or the bundles filtered — see `scripts/README.md`.
