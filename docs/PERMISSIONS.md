# Permissions and licences for third-party material

What the site and the apps draw that is not our own, who owns it, and on
what terms we use it. The store listing, the review notes and the credits
on each page should agree with this file; when a term changes, change it
here first.

## Brodmann Areas diagram (permission granted)

**What.** The two-face Brodmann map on the Region Atlas, `regions.html`, and
in the Vision Pro window `vision-brodmann.html`, the lateral and medial views with every area
outlined and numbered. The outlines were traced, area by area, from the
Brodmann Areas diagram published by IFEN at
<https://neurofeedback-academy.com/brodmann-area>. Brodmann's 1909 scheme
itself is public domain; that particular drawing of it is not, and IFEN's
legal page reserves its illustrations, so we asked.

**Rights holder.** IFEN – Institute for EEG-Neurofeedback / Neurofeedback
Academy, operated by Neurofeedback-Partner GmbH, Karl-Böhm-Straße 50,
85598 Baldham, Germany (info@neurofeedback-partner.de). Permission was
given by Thomas F. Feiner.

**Permission.** Granted in writing by email on 4 September 2026, in reply
to a request that described the project, the pages involved and the
intended credit. The grant:

- allows the diagram to be used and adapted on the VisualNeuroscience.AI
  website and in the associated apps;
- is free of charge for this educational, non-commercial project;
- requires the acknowledgement "Brodmann Areas diagram adapted with
  permission from IFEN – Institute for EEG-Neurofeedback / Neurofeedback
  Academy", with a link to <https://neurofeedback-academy.com>;
- welcomes the same acknowledgement in the store listings;
- does not extend to commercial use. If the project ever charges for the
  app, sells the content or carries advertising, contact IFEN again before
  continuing to use the diagram.

The email is kept by the project owner and can be forwarded to a store
reviewer on request. It is not in the repository.

**Where the credit sits.**

- `site/regions.html`: the sentence under the map in the Brodmann map
  section, and the footer credits line, both linking to
  neurofeedback-academy.com. Until v10.8 the map had its own page,
  `brodmann.html`, which carried the same two credits.
- `app/store/LISTING.md`: the description, under "Built on open data".
- `app/store/APP-REVIEW-REPLY.md`: point 6 of the review reply, and the
  follow-up message for the review thread.

**History.** The raster drawing itself was shipped until v8.4, reproduced
from the diagram's per-area highlight images. In v8.5, with the request
still open, it was removed and replaced by the traced outlines. Permission
arrived the same day; the outlines stay, now with the credit, and the
original drawing could be restored under the same permission if wanted.

## Open-licence datasets and libraries

| Material | Source | Licence | Credited |
|---|---|---|---|
| MNI152 (ICBM 2009c) template | McConnell Brain Imaging Centre, MNI | Free to use and distribute with the copyright notice | Footer of every atlas page; `about.html` |
| AAL-116 parcellation | Tzourio-Mazoyer et al., 2002; GIN | Free for non-commercial academic use | `regions.html` footer; `about.html` |
| Receptor PET maps (19 group-average tracer maps) | Hansen JY et al., *Nat Neurosci* 2022;25:1569, compilation at github.com/netneurolab/hansen_receptors; each map's originating study is named on its receptor | CC BY-NC-SA 4.0 (the repository's LICENSE.md). Attribution, non-commercial, and the derived table shared alike | `regions.html` receptor section, per receptor and in the sources block; `backend/data/receptors/README.md` |
| Receptor autoradiography (15 receptors, 44 cortical areas) | Zilles K, Palomero-Gallagher N. *Front Neuroanat* 2017;11:78, via the Hansen repository (Goulas et al. 2021) | CC BY 4.0 | `regions.html` receptor section; `backend/data/receptors/README.md` |
| Brodmann atlas volume | MRIcron (Chris Rorden) | BSD | `regions.html` footer; `about.html` |
| HCP1065 tractography atlas | Yeh FC, *Nat Commun* 13:4933 (2022), from Human Connectome Project data; the shipped copy is NiiVue's subsampled redistribution | CC BY-SA 4.0, attribution and share-alike | `tracts.html` credits; `site/assets/tracts/README.md` |
| NiiVue | Rorden lab | BSD | Footers; `about.html` |
| d3 | Mike Bostock and contributors | ISC | `vendor/d3/` |
| Firebase JS SDK | Google | Apache 2.0 | `site/vendor/firebase/NOTICE.md` |
| Afacad Flux, Newsreader, Prata | Their authors; the files are self-hosted in `site/fonts/` | SIL Open Font License 1.1 | `site/fonts/LICENSE-*.txt` |
| Studies drawn on the scan | Open-access papers, cited on each page | As published | The page itself |

The receptor PET compilation is the one CC BY-NC-SA item: its ShareAlike
term applies to the parcellated table this site derives from it, which is
therefore published under the same licence in `backend/data/receptors/`,
and its NonCommercial term is one more reason the app must stay free. The
[11C]flumazenil GABA-A map in that compilation comes from an atlas paper
published CC BY-NC-ND; it is used here as the compilation redistributes it,
under the compilation's licence.

Nothing else on the site or in the apps is third-party material. The
practice questions, the textbook chapters, the function notes and the
network descriptions are written for the project and cite their sources.
