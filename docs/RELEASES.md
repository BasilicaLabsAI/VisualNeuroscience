# Releases

Every push to `main` is a release. This ledger is the record of which
commit each version points at, with the title and description used on the
GitHub release. Tags cannot be pushed from the coding environment, so
`scripts/push_tags.sh` creates and pushes any tag listed here that the
remote does not have yet; run it from a clone on a machine that can push.

Versions before v8.6 were released without a ledger and are not recorded.

## v10.11 — 17 September 2026 — The cortex's own cell
Commit · Draw a layer V pyramidal cell, and let the tiles switch between cells

Microanatomy gains its second drawing: a layer V pyramidal neuron, the cell the cerebral cortex is mostly made of. It stands in its cortical layers, its one thick apical dendrite climbing to a tuft under the surface, obliques leaving that trunk, a basal skirt below, spines everywhere, and a myelinated axon heading for the white matter with a collateral turning back into the cortex and an oligodendrocyte laying the sheath. Nineteen structures to pick, read and then find again from memory, including the initial segment where the signal is made, the nodes of Ranvier it jumps between, and the inhibitory terminals that can veto the lot. The tiles above the plate now switch between cells without a reload, each cell drawn in its own frame, with its own caption, and reachable by its own link. Like the first cell it is generated from code rather than traced, and this one needs nothing installed to rebuild.

## v10.10 — 17 September 2026 — Every receptor listed, the gaps named
Commit `12aaa2b` · List every receptor sub-type in the density section and say where information runs out

The receptor section now lists all sixty-nine receptor sub-types and transporters in every picker, chart, heat-map and table, whichever source is showing. The nineteen with an open PET map and the fifteen measured by autoradiography carry their numbers as before; the rest say "not enough information" with the reason: measured only as a class, mapped only as gene expression, or never measured region by region in humans at all. The MCP server answers the same way by name.

## v10.9 — 17 September 2026 — Receptor densities with a source behind every number
Commit `0403447` · Replace the placeholder receptor table with sourced PET and autoradiography data

The receptor section of the Region Atlas had been drawing a table with no source behind it: forty-eight distinct values across two thousand cells, thirty columns copied from one another, and magnitudes an order or two away from measurement. It is withdrawn. In its place are two open datasets, kept apart because they measure different things: in vivo PET, nineteen receptors and transporters from the group-average tracer maps compiled by Hansen and colleagues in 2022, parcellated onto this site's own AAL volume and charted as each receptor's share of its densest region; and ex vivo autoradiography, fifteen receptors in fmol/mg protein from Zilles and Palomero-Gallagher's 2017 cortical series, mapped onto the regions area by area with each match marked exact or approximate. Every receptor carries its tracer, its measure, its sample and its citation; the section says plainly what has no open human data; the derived tables are published as CSV under the licences they inherit; and the MCP server answers from the same numbers.

## v10.8 — 17 September 2026 — The Brodmann areas join the atlas
Commit `83b9e3d` · Bring the Brodmann areas into the Region Atlas and retire their own page

The Brodmann areas now live in the Region Atlas rather than on a page of their own. A searchable list sits in the rail under the AAL dropdown, the classic two-face map sits below the notes, and a picked area is highlighted on the same scan in its own colour alongside any AAL regions, with its function and caveat in a block of its own among the readings. The probe names both the parcel and the area under the crosshair, 3D export and saved models carry areas as well as regions, and the old page's address and deep links land in the atlas. The border graph is retired from the page, with its measured edges and the brain hull kept in the repository for later. The receptor section gains a heat-map on the Receptor Types tab, every sub-type against every measured structure from yellow to red, with the tabs reordered to put it second; choosing from a dropdown on the atlas or the Network Atlas no longer shifts the page under the pointer. The neuron on the Microanatomy page gains its incoming axons, eighteen structures now.

## v10.7 — 17 September 2026 — The brain, down to the single cell
Commit `3d167ab` · Add a Microanatomy page with a multipolar neuron drawn from code

A new Microanatomy page takes the site below the region and the area to the cell. Its first drawing is a large multipolar neuron with an astrocyte and two incoming synapses, an original schematic generated from code rather than traced from a plate, with seventeen structures to click: pick one and read what it does, colour every structure at once, or switch to Test yourself and find each one from memory. The page is in the site's own type and colours, follows the theme, works on a phone, and carries the app's top bar; it is linked from every page's tabs and has its own box on the front page. The drawing's generator lives in the repository so more cells can be added the same way. The Vision Pro app's later refinements travel in the same push: the brain faces the viewer, six mirrored sliders cut it from the outside in, and the Brodmann areas, the tractography and a notes window for the highlighted regions join the room.

## v10.6 — 13 September 2026 — The app navigates the iPhone way
Commit `2924dfa` · Give the app an iPhone-style top bar and a message from the developer on About

Inside the iPhone and iPad app the website's masthead and tab row are gone. In their place is the bar an iPhone app has: a back button on the left naming the screen it returns to, the page's title in the middle, and the theme and account buttons on the right. Pages slide in from the right and out again on the way back, and a swipe from the left edge goes back. The website itself is unchanged. The About page now opens with a short message from the developer, followed by what VisualNeuroscience is.

## v10.5 — 13 September 2026 — The app can be built in the cloud
Commit · Share the Xcode scheme so Xcode Cloud can build the app

The iPhone and iPad app can now be built and sent to TestFlight by Xcode Cloud from a bare clone of the repository: the scheme it builds is committed to the project rather than living only on one Mac. The store notes describe the two things that stop a first cloud run, a missing shared scheme and a build number below the last upload. Nothing in the site changed.

## v10.4 — 13 September 2026 — The portrait takes the centre line
Commit · Centre the portrait on the page and tuck the signature beside it

On the About page, and its visionOS twin, the framed portrait now sits on the page's centre line by itself, and the signature hangs off the frame's right edge, tucked into the corner below the oval's shoulder rather than floating a hand's width away. On narrow phones the signature still drops beneath the frame, centred.

## v10.3 — 12 September 2026 — A ledger of releases, and the tags to match
Commit · Keep a ledger of releases, and a script that pushes their tags

The repository now records every release since v8.6 with its commit, title and description, and a script creates the matching tags on GitHub from any machine that can push, since the coding environment cannot. The App Review reply now gives the repository's true age, back to September 2024. Documentation and tooling only.

## v10.2 — 12 September 2026 — App Review notes: GitHub account and site date filled in
Commit `6f97fd9` · Fill in the GitHub account and the site's go-live month in the 4.3(a) reply

The 4.3(a) reply names the developer's GitHub account (open since 2023, 46 public repositories) and gives August 2026 as the site's go-live month, the earliest the repository proves. Documentation only.

## v10.1 — 12 September 2026 — App Review notes: context paragraph and tone
Commit `8dda1f0` · Give the 4.3(a) reply its context paragraph and a note on tone

Point 6 of the 4.3(a) reply now gives the reason the app was built, states plainly that it was made with AI-assisted tools, consistent with the first thread, and links the developer's GitHub profile. A new tone note lists what to leave out of the reply. Documentation only.

## v10.0 — 12 September 2026 — App Review notes: attachments instead of repository access
Commit `16e6d40` · Say what to attach to the 4.3(a) reply instead of offering repository access

Reply to the 4.3(a) finding now cites attached screenshots of the commit history and contributor page rather than offering access to the private repository, with a list of the four attachments that show authorship and why the repository should stay private for this. Documentation only.

## v9.9 — 12 September 2026 — App Review notes: answering the 4.3(a) finding
Commit `dd2956e` · Add the answer to App Review's 4.3(a) finding

Adds the response plan for the 12 September 4.3(a) rejection of build 14 to app/store/APP-REVIEW-REPLY.md: likely triggers, order of moves, the thread reply, the appeal text, and the listing changes for build 15. Documentation only; no site changes.

## v9.8 — 10 September 2026 — Byline removed from the About signature
Commit `8a1132e` · Drop the OttomanLabs byline under the signature

The OttomanLabs byline under the signature on the About page is gone, with the style rule that served only that line. The footer small print and the privacy page's mention are unchanged.

## v9.7 — 10 September 2026 — The frame's own colours restored
Commit `88e4884` · Put the frame's own colours back: the cream ground and the olive engraving

The portrait frame was shipping as an alpha stencil painted in the page's ink, which discarded the cream ground, the olive-grey engraving and the ribbon's real colours. The frame and ribbon are now reproduced exactly as the CV draws them, replayed in their own colours in document order, identical in both themes, with the cream ground travelling with the frame so the photograph sits on its proper backdrop. The signature remains a stencil that takes the page's ink, because it lies on the page and would vanish in the dark theme otherwise.

## v9.6 — 10 September 2026 — The border graph holds still, inside a brain
Commit `2ac595d` · Stop the border graph turning by itself, and draw the brain around it

The 3D graph under the Brodmann map no longer turns by itself, and it is no longer a cloud in empty space. The brain is drawn faintly around the nodes as the template's own outline in ten sagittal and nine coronal planes, traced off the same volume at the same threshold as the 3D exports and projected through the same maths as the nodes, so it turns with the graph from every angle. Fixing the fit to account for perspective stopped the near surface overhanging the box, and moving the camera from 520 to 1500 stopped it ballooning into a circle. Rings and silhouette both take the theme's ink colour.

## v9.5 — 10 September 2026 — The portrait opens the About page
Commit `c39f2e4` · Put the framed portrait and the signature at the top of About

The CV's engraved portrait now sits at the top of About on the web and in every app, with the signature beside it. The photograph came straight out of the PDF, while the oval frame, its name ribbon and the signature were vector line work and are now alpha stencils that CSS paints in the page's ink, so they turn with the theme from a single set of files. Stacking follows the original: engraving behind the photograph, ribbon in front in two layers so the banner stays legible over the shirt. The lede is rewritten in the maker's own words. Four WebP assets, 156KB, reproducible with scripts/extract_portrait.py.

## v9.4 — 10 September 2026 — The About pages filled, and the atlas answers assistants
Commit `f53ca53` · Fill the About pages, and let AI assistants ask the atlas over MCP

The About copy ships everywhere: where the atlas stands, who made it, and how it was built by directing Claude models, Opus 4.8 through Fable 5.1, with the video slot awaiting its film. Alongside it, a dependency-free MCP server in mcp-worker/ lets Claude, ChatGPT and Kimi search the atlas, ask what any region or Brodmann area does, read receptor densities and the six brain-state stories, every answer linking into the exact view, and the pages now restore those deep links from the URL. Data is generated from the site's own files so the server cannot drift from the pages. The privacy policy names the server and what it keeps, which is nothing.

## v9.3 — 10 September 2026 — Named the university
Commit `11c20e6` · Name the university: the PGCert was at King's College London

The About page and the store description now say the postgraduate certificate was taken at King's College London, which also explains why the practice bank follows the KCL MSc syllabus. Copy only, no behaviour changes.

## v9.2 — 10 September 2026 — The certificate was finished
Commit `bd67117` · Tell the study story accurately: the PGCert was finished

The About page and the store description told the study story wrong: the postgraduate certificate was completed, and it was the full master's that full-time work and financing put out of reach. Both now say so. Documentation and copy only, no behaviour changes.

## v9.1 — 10 September 2026 — About everywhere, awaiting its words
Commit `37fb22e` · Give the Vision Pro console an About window, and stub the page's next form

The Vision Pro console gains an About window in its own glass style, opened from the hub: four sections held as deliberate placeholders, with a slot for a short video from the maker, while the copy is signed off. The web About page, which the iPhone, iPad and Mac apps already serve, gains the same sections as hidden stubs, so the fill lands everywhere at once. The service worker precaches the new window.

## v9.0 — 10 September 2026 — Ready for iPhone Duo
Commit `6663de8` · Ready the app and the site for iPhone Duo

Apple's first foldable unfolds a 5.4-inch phone into a 7.6-inch near-square display, and this release makes the app and the website treat that as ordinary. Every page declares viewport-fit=cover with safe-area padding on web and native alike, scan-stage heights gain dvh fallbacks so a viewport that changes size mid-session is tracked live, and the legacy armv7 device requirement becomes arm64. Verified by folding and unfolding each main page through four live resizes headlessly: no clipping, no stale canvases, no errors. The store guide records the three follow-ups that wait on Apple's Xcode 27.1 SDK, its preparation guide, and the new screenshot sizes.

## v8.9 — 9 September 2026 — Consistent citation for the tractography atlas
Commit `162a7e6` · Cite the tractography atlas by the paper the page already credits

The permissions record and the App Review reply dated the HCP1065 atlas to 2018, while the Tractography page credits Yeh FC, Nature Communications 13:4933 (2022), the paper behind the file the app ships. All three now say the same thing, and the permissions row states the share-alike condition and where the credit appears. Documentation only.

## v8.8 — 8 September 2026 — 3D export in seven formats, and saved Region Atlas models
Commit `0764bb1` · Export the brain as 3D model files, and keep named Region Atlas models

Every 3D view now exports as a model file: glTF binary, USDZ for Apple Quick Look, OBJ with materials, STL for printing, PLY with vertex colours, VRML 2.0 and X3D. The geometry is built in the browser from the atlas voxels, so highlighted regions leave as closed, coloured surfaces with the brain's outer surface for context; the Brodmann page exports its border graph, the Network Atlas the couplings of the state showing, the studies page its regions, and the tractogram a sample of its streamlines. The Region Atlas gains named saved models that hold the regions, colours, camera and cuts, kept on the device when signed out and in the account when signed in. The Brodmann page's scan-pane pick no longer throws on an undefined function.

## v8.7 — 4 September 2026 — Review thread message says the permission email is attached
Commit `d5540d8` · Say the permission email is attached, and place the credit honestly

The follow-up message for App Review now states that screenshots of IFEN's permission email are attached, and places the acknowledgement honestly: the build under review is covered by the permission, while the credit itself is live on the website and in the store description, and reaches the app with the next build. Point 6 of the review reply is worded the same way. Documentation only, nothing in the site changed.

## v8.6 — 4 September 2026 — Brodmann diagram credited to IFEN
Commit `ac21209` · Credit IFEN for the Brodmann diagram, with their permission recorded

IFEN, the Institute for EEG-Neurofeedback / Neurofeedback Academy, has granted written permission for the Brodmann Areas diagram the two-face map descends from. The acknowledgement they asked for now appears under the map and in the footer of the Brodmann page, with a link to their site. The store description carries the same credit, the review reply's sixth point is updated, and a follow-up message for the App Review thread is prepared. A new permissions document records the terms and lists every open-licence dataset, library and font the site uses.
