# Releases

Every push to `main` is a release. This ledger is the record of which
commit each version points at, with the title and description used on the
GitHub release. Tags cannot be pushed from the coding environment, so the
repository tags itself: the `Release tags` workflow runs on every push to
`main` that changes this file, `scripts/push_tags.sh` creates and pushes any
tag listed here that the remote does not have yet, and
`scripts/make_releases.py` gives each new tag its GitHub release with the
text below. Both can also be run from a clone on a machine that can push.

Versions before v8.6 were released without a ledger and are not recorded.

## v10.47 — 25 September 2026 — On the App Store
Commit · Link the App Store listing from the site and move the app to version 1.1

VisualNeuroscience.AI is on the App Store for iPhone and iPad. The home page's top line now says so beside "Free, nothing to install", with a link to the listing, and Safari on an iPhone or iPad offers the app in its own banner there; inside the app the line keeps naming the template and the atlas instead. The About page links to the listing too, and no longer describes the Digital Textbook as three chapters: it has been OpenStax's whole book, nineteen chapters, since v10.19. The app's version moves to 1.1, the number the next submission needs now that 1.0 is approved, and the App Store notes carry that update's What's New text and the privacy answer the newsletter box needs.

## v10.46 — 24 September 2026 — The side view shows the brain, not the gap between its halves
Commit `13d67a8` · Start the sagittal plane beside the midline rather than in the gap between the hemispheres

The sagittal view used to open exactly on the midline, which runs down the fluid between the two hemispheres, so it showed the corpus callosum and the brainstem floating in black. It now opens 4 mm into the left hemisphere, on the medial wall of the cortex, and Centre planes goes back there; the Network Atlas, the hallucinations page and the Apple Vision Pro planes open the same way. Centring on a region that has a left and a right half now goes to the left one, so the sagittal plane passes through it rather than between the pair, and lands on the region's own centre, which it could miss by a centimetre or more before because the atlas and the template are drawn on different grids. A region picked from the list now brings the planes to it, as a Brodmann area already did. The picture of the atlas on the home page and the App Store screenshots of the atlas and the Network Atlas are retaken to match.

## v10.45 — 24 September 2026 — One address to write to
Commit `c01179e` · Give fkarim@visualneuroscience.ai as the contact address everywhere

The About page, the privacy page and the Apple Vision Pro about page now give fkarim@visualneuroscience.ai as the address to write to, in place of the old one, and so do the notes for the App Store listing. The newsletter notes add that the list's emails come from the same address, with how to verify it in Mailchimp, and warn against moving the domain's mail to Cloudflare while another provider holds that mailbox.

## v10.44 — 24 September 2026 — The newsletter moves to Mailchimp
Commit `5657adb` · Send newsletter signups to Mailchimp first and say so in the box and the privacy page

A signup from the newsletter box now goes to the newsletter's list at Mailchimp, which writes to the new reader to confirm the address before adding it, so the box says to look for that email, and tells someone already on the list as much. The box and the privacy page now name Mailchimp, run by Intuit on servers in the United States, as the service that keeps the list and sends the emails, where they used to promise the address went to no one else. An address Mailchimp refuses as made up is answered in its own words, the box no longer leaves its form on show after a signup, and the old email route, which Cloudflare was refusing, can no longer cost a signup that Mailchimp took.

## v10.43 — 23 September 2026 — Highlighted regions light up on the receptor chart
Commit `3fb0d78` · Light a highlighted region's bar on the receptor chart, Brodmann areas included

A region highlighted in the atlas now lights its own bar on the receptor chart below, in the colour it wears in the viewports, along with its name and its column in the receptor-types table. Until now only a region highlighted on both sides showed there at all, and then only as a tinted name. A region highlighted on one side counts now too, and so does a Brodmann area: the two atlases sit on one grid, so an area lights every chart region that holds at least a fifth of it, which puts area 7 on both the superior parietal lobule and the precuneus. Where a region is also highlighted in its own right, its own colour wins, so clicking a name on the chart still shows.

## v10.42 — 21 September 2026 — The repository carries its own working notes
Commit `1cc815e` · Add the working notes a new session needs, so no handover has to be pasted

A page at the root of the repository now says how work here is done: who signs the commits and what never goes in them, how a release is recorded and tagged, where the site's pieces are built from, how a change is checked before it ships, and what is open on the owner's side. A fresh session reads it before anything else, so nothing has to be handed over by hand.

## v10.41 — 21 September 2026 — The newsletter box says what went wrong
Commit `9af0298` · Import the email class plainly in the newsletter worker, and let the box repeat the worker's reason

The newsletter worker now imports Cloudflare's email class the documented way rather than at the moment of sending, and when the send fails it answers with the runtime's own reason instead of a blank apology. The box on the pages repeats that reason, so a refused address or a routing that is not yet switched on is named on the spot; the plain "Could not send just now" is kept for the case where the request never reached the worker at all. The worker's config also states its workers.dev route and turns preview addresses off, which quiets two warnings on deploy.

## v10.40 — 21 September 2026 — One receptor picked on a region's chart
Commit `f8867ba` · Let a receptor picked on a region's chart isolate it and its transmitter beneath, and a second click bring everything back

On a region's chart the receptor names along the bottom are now buttons. Clicking one keeps only that receptor beneath the chart, with the transmitter that binds it drawn beside it and its rank and numbers for this region, and fades every other bar; a line above says what is showing and offers all sixty-nine back. Clicking the same name again, or that offer, brings the whole panel back. The pick holds across a change of region or source until it is undone.

## v10.39 — 21 September 2026 — The folded sections show what is inside
Commit `0ef0fc3` · Give the folded sections a peek of their drawings and a plain Open button

The two folded sections on Microanatomy were a bare rule with a plus at its end, and it was not obvious they opened. Each now shows four of the drawings inside it under its heading, dopamine, serotonin, GABA and glutamate for the transmitters and an NMDA, GABA-A, D2 and sodium channel for the receptors, with a line on what the section holds and an underlined "Open the section" beneath, and the plus at the right has become an Open button that reads Close once the section is open. The peek folds away with the heading when the section is open.

## v10.38 — 20 September 2026 — The repository tags its own releases
Commit `180b768` · Tag and release every version in the ledger from a workflow on each push to main

The coding environment can push branches but not tags, so for twenty releases the tags and their GitHub releases waited on a script run by hand. A workflow now does it: on every push to main that changes this ledger it runs the ledger script to tag whatever the remote lacks, then gives each new tag a GitHub release with the title and text recorded here. It can also be run from the Actions tab.

## v10.37 — 19 September 2026 — The chart's tip goes when it should, and the bars start sooner
Commit `42ca6ef` · Show the chart's tip on a tap alone and let it go, and start the bars just past their labels

On a touch screen the chart's tip came up at the start of any swipe across the bars and then stayed, so it was there before a reader had asked for anything. It now answers a tap and not a swipe, and goes on the next touch anywhere, on any scroll, when the chart is redrawn, or by itself after four seconds. The bars had also been standing a long way in from the axis; the room before them is now only what the leaning labels need to stay clear of the pinned axis, which is about half of what it was.

## v10.36 — 19 September 2026 — Every receptor in a row beneath the table
Commit `228f88b` · Slide every receptor across beneath the density table, and let a name picked in it slide to its card

Beneath the receptor-by-region table now runs a row of all sixty-nine receptors, one card each: the schematic of its kind with its transmitter and G protein written in, its plain name, what it does, and where it is densest and sparsest in this source, slid across by a thumb on a phone or by the arrows on a computer, with a count saying which is in view. Picking a receptor's name in the table, or a row of the reference below it, no longer leaves the tab: it outlines that receptor's card and slides the row to it. Each card offers to chart the receptor, or to open its whole entry on the Microanatomy page.

## v10.35 — 19 September 2026 — The density table sits in the page
Commit `f1d10ce` · Take the density table out of its own scrolling box

The receptor-by-region table was boxed in a window of its own, with its own vertical scroll inside the page's, so a thumb on a phone never knew which it was moving. The box is gone: the table now runs down the page at its full height. Where its columns are wider than the screen it scrolls sideways alone, the receptor names staying put at the left; where it fits, the column names stay at the top of the window as the page scrolls past.

## v10.34 — 19 September 2026 — The reference table charts what it names
Commit `932b7fb` · Let a row of the receptor-types reference pick its receptor for the chart

Where a row of the reference stands for something in the density catalogue, it now charts it on a click: a sub-unit of NMDA, AMPA, kainate or GABA-A names the channel it belongs to, α4, β2 and α7 name the nicotinic receptors that carry them, μ, δ and κ the opioid receptors, and a named receptor names itself, ninety-one rows for sixty entries. Such rows carry an arrow after the name and underline the receptor already charted; the rows with no density entry, the purinergic, TRP and voltage-gated channels among them, stay as they were.

## v10.33 — 19 September 2026 — The reference table folds away
Commit `aed9ead` · Fold the receptor-types reference shut beneath the density table

The long reference of sub-units, families and mechanisms trailed beneath the density table on the Receptor types tab, a hundred and sixty rows on a phone. It now folds shut under its heading and opens on a click.

## v10.32 — 19 September 2026 — A receptor picked from the table
Commit `2e1ecd3` · Let a receptor's name in the density table pick it for the chart

The receptor-types table names every receptor down its left edge, and those names are now buttons: click one and the chart comes forward with that receptor picked, its transmitter and its schematic drawn beneath, the section scrolled back to its top. The receptor already charted is underlined in the table, and the table's note says what a click does.

## v10.31 — 19 September 2026 — The density chart scrolls sideways on a phone
Commit `e9a4b04` · Let the density chart scroll sideways where the screen is too narrow for its bars

On a phone the forty-five bars of the density chart were squeezed into the width of the screen and their labels ran into one another. Each bar now has a least width, and where that comes to more than the screen the chart scrolls sideways with a finger, the value axis pinned at the left edge so the numbers stay put while the bars pass under it, and a line beneath saying so. On a wide screen nothing changes.

## v10.30 — 19 September 2026 — The transmitters take the filter, and both sections fold
Commit `ed3fb26` · Fold the transmitter and receptor sections shut, and give the transmitters the receptors' filter row

The Neurotransmitters section now carries the same row of chips the Receptors section has: all seventeen, then the five monoamines one by one or all together, then the other groups whole, so one molecule can be looked at on its own. Both sections, the transmitters and the receptors, now fold shut under their headings and open on a click, so the page opens on the cell drawing at its old length; a link into either, such as a receptor's entry from the Region Atlas, opens the fold it lands in.

## v10.29 — 19 September 2026 — A region's receptors, ranked against the rest of the brain
Commit `9a1593b` · Lay out every receptor under a region's density chart, each ranked against the other regions

Picking a region for the density chart now draws the whole catalogue beneath it, whether or not this source has a number for it there: fourteen families in turn, the transmitter's skeletal formula on the left and its receptors on the right, each as the schematic of its kind with every part still telling its step on a hover. Under each receptor is where the region stands for it — the densest of the forty-five regions mapped, 3rd densest, in the top quarter, the sparsest — with the number as measured, how far behind the densest region it is or how far ahead of the runner-up, how many times the sparsest, and, from PET, a hemisphere that is noticeably denser than the other. A receptor without a number says why: measured by the other source only, a map that covers less than half of the region, or a series that is cortex only. A line at the top sums the region up — how many receptors are mapped there, which it is the densest region for, which it is near the top for, and which it is among the sparsest for — and the densest gets an outlined tile. Picking a receptor gains a line of its own: the three regions it is densest in, the one it is sparsest in, and the gap between them.

## v10.28 — 19 September 2026 — A transmitter to isolate, and the receptor drawn beside its density
Commit `a13a028` · Add a transmitter filter to the receptors, and draw the transmitter and receptor under the density chart

Two ways in to the same hundred and fifty receptors. On Microanatomy a row of transmitters now sits above the list, the four monoamines first and together since they are what most drugs act on, then everything else; picking one shows only its receptors, and the search box then searches inside what is picked. In the Region Atlas, picking a receptor for the density chart draws two things beneath it: the transmitter that binds it, as the skeletal formula from the Microanatomy page, and the receptor itself as the schematic of its kind, with its own transmitter, ion and G protein written in and every part still telling its step on a hover. The drawings, their popups and their colours moved into a pair of shared files so the two pages cannot drift apart.

## v10.27 — 19 September 2026 — A newsletter box
Commit `069f400` · Add a newsletter box, and the worker that passes the address on

A small card now offers the newsletter once a reader has been on a page for twenty seconds or scrolled half of it: an address, one button, and a line saying where the address goes. Closing it keeps it away for a fortnight, signing up for good, both remembered in the browser alone. The address goes to a new Worker of ours, which emails it to the maker of the site while the mailing-list service is being set up and, once Mailchimp's three secrets are in place, adds it to the list as pending so Mailchimp sends its own confirmation. The privacy page says all of this.

## v10.26 — 19 September 2026 — The receptor search hides what it filters out
Commit `db105e8` · Hide the receptor tiles the search filters out

The search box counted correctly but left every tile on the page: the tile's own layout rule overrode the hidden mark. Tiles the search rules out now disappear, and so do groups left empty.

## v10.25 — 19 September 2026 — The receptor drawings tell their steps, and a search box
Commit `e728762` · Let every part of a receptor drawing tell its step on a hover, and add a search box

Every part of the receptor schematics now answers a hover or a tap with its step, numbered in order: the transmitter arriving, the receptor changing shape or opening, how long it stays open, the G protein's α subunit letting go and its βγ pair going its own way (steps 3-a and 3-b, since they happen at once), the arrow to the enzyme, and what the second messenger is and does, each written for the tile it sits in with its own transmitter, ion and G protein. The sides of the membrane are named as outside and inside the cell, and they and the membrane itself explain themselves too. A search box at the top of the section filters the hundred and fifty tiles as you type, by name, plain name, transmitter, drug, kind, group or what a receptor does: "nicotine" finds the four nicotinic receptors, "serotonin" every 5-HT receptor and the serotonin transporter.

## v10.24 — 19 September 2026 — Receptor popups in bullet points
Commit `c239977` · Set the receptor popups as short bullet points

The explanations behind Ionotropic, Metabotropic, GPCR, Gs and the rest of the receptor words are now three or four short bullet points each rather than a paragraph, so a hover gives the point at a glance.

## v10.23 — 19 September 2026 — Room at the edges of the book
Commit `ce83514` · Stand the textbook in from the window's edges

The textbook's folds ran almost to the edge of the window. They now stand in by about a twelfth of the width on each side, so the book has room around it at every size; on a phone the margin is a thumb's width, since the screen is small.

## v10.22 — 19 September 2026 — Citations that open where they stand
Commit `c1bdc38` · Tie each citation in the textbook to its reference, opening under the line it is cited on

A citation in the text, "(Herculano-Houzel, 2009)", now opens the entry it cites right there under the line, with its DOI or address as a link, and closes again on a second click. The book's source ties none of them together, so the build reads each section's reference list, indexes it by first author and year, and finds the citations in the text itself, telling "et al." from a pair from a single author where two entries share a name and a year. The addresses in the reference lists are links now too.

## v10.21 — 19 September 2026 — The whole book on one page
Commit `6e7ae72` · Put the whole textbook on one page at full width, and embed its videos

The Digital Textbook no longer opens a chapter on a page of its own: the whole book is one page. A chapter folds open to its sections where it stands, each section folds open to its text, and Expand all lays the entire book out end to end. The text now uses the full width of the screen, with room at the edges, instead of a narrow column down the middle. The book's forty videos, the chapter introductions by their authors and the section summaries, are embedded rather than linked, each in a fold that creates the player only when it is opened.

## v10.20 — 19 September 2026 — The receptors, for newcomers
Commit `d1c870f` · Give every receptor its plain name, a drugs line and a popup behind each word of its kind

The receptor tiles now speak to someone meeting them for the first time. Every code carries its plain name underneath: 5-HT2A is the serotonin-2A receptor, Nav1.6 the voltage-gated sodium channel 1.6, SERT the serotonin reuptake transporter. A new Drugs line names what people have heard of that acts there: nicotine, alcohol, caffeine, the psychedelics, the benzodiazepines, the SSRIs, the antipsychotics, the beta-blockers, morphine and naloxone, ketamine, capsaicin, paracetamol, and the poisons, from strychnine to pufferfish. The section now opens with the point that matters most, that ionotropic receptors are fast and brief and metabotropic ones slow and lasting, and every word in a tile's kind, Ionotropic, Metabotropic, GPCR, Gs, Gi/o, Gq and the rest, is a separate link that opens a plain explanation on a hover on a desk or a tap on a phone, as do affinity, agonist, antagonist and autoreceptor in the introduction.

## v10.19 — 19 September 2026 — The Digital Textbook becomes OpenStax's whole book
Commit `8069e76` · Replace the Digital Textbook with OpenStax's Introduction to Behavioral Neuroscience, built into the site's pages

The Digital Textbook is now OpenStax's *Introduction to Behavioral Neuroscience*, all of it: nineteen chapters and eighty-five sections, from the cells of the nervous system to attention and executive function, with every figure, note, table, key term, summary and reference list, set in the site's own pages and type rather than shown as a PDF. The contents page folds each chapter open to its sections; each chapter page folds each section open to its text, with expand-all and collapse-all buttons and links that open the fold they point into. The five hundred figures are recompressed to WebP. The book is CC BY-NC-SA 4.0 and every page carries OpenStax's attribution; the interactive exercises and videos that live on their servers are linked rather than carried. The site's earlier three-chapter textbook leaves the site and the apps but stays in the repository under archive/.

## v10.18 — 19 September 2026 — The receptors, drawn
Commit `2ba7488` · List the receptors, channels and transporters under the neurotransmitters, each with its kind of machine drawn

Under the neurotransmitters, what they land on: a hundred and fifty receptors, ion channels and transporters in fifteen groups, from the AMPA receptor to the vesicular acetylcholine transporter. There are only ten kinds of machine among them, and those are drawn first, each with what the kind means: the ligand-gated channels, the glutamate receptors, the three flavours of G-protein-coupled receptor with their G proteins, the voltage-gated channels that nothing binds, the background channels and the carriers. Every tile then carries its kind's schematic with its own ligand, ion and G protein written in, what binds it and how tightly, what it does when bound, and a line of context. The voltage-gated sodium, calcium and potassium channels are here too, since every receptor on the page acts through them.

## v10.17 — 19 September 2026 — The neurotransmitters, drawn
Commit `4a184ef` · Draw the neurotransmitters as skeletal formulas under the cells

Microanatomy gains a second section under the cell plates: the neurotransmitters, seventeen of them, each drawn as a skeletal formula the way a chemist would draw it, in tiles grouped by kind. The amino acids glutamate, GABA, glycine, aspartate and D-serine; acetylcholine; the monoamines dopamine, noradrenaline, adrenaline, serotonin and histamine; the purines adenosine and ATP; the endocannabinoids anandamide and 2-AG; nitric oxide; and one neuropeptide, met-enkephalin, drawn to show the scale of the rest. Each carries its formula and what it is for, with a few lines on what it does behind a disclosure. The drawings are made from the molecules' structures by RDKit and take their colours from the page, so they follow the light and dark themes like the cells do.

## v10.16 — 19 September 2026 — The Network Atlas squares up
Commit `542f231` · Set the ring and the render side by side as squares, with the three planes in a band beneath

On a desktop the Network Atlas used to give the ring a square of its own and cram the four scan boxes into whatever was left, which at some widths meant four boxes eighty pixels wide. The ring and the 3D render now sit side by side as two equal squares, and the axial, coronal and sagittal planes run in a band beneath them, each a third of the same width, so the ring, the brain and the three planes are all readable at once.

## v10.15 — 19 September 2026 — The multipolar neuron's axon gets its sheath
Commit `cca5deb` · Sheathe the multipolar neuron's axon and mark its nodes of Ranvier

The multipolar neuron's axon now leaves the initial segment under a myelin sheath: three lengths of it, each thinning at its paranodes, with a bare node of Ranvier between each pair, so the plate shows where the action potential is made and where it jumps. Both are structures in their own right, with their own colour, description and quiz question, which brings the cell to twenty. The two mitochondria that used to travel down the axon are gone, since past the initial segment the axon is under its sheath and nothing inside it can be seen.

## v10.14 — 19 September 2026 — The pyramidal cell held back
Commit `e17ce06` · Take the pyramidal cell off the Microanatomy page and grey out its tile

The pyramidal cell is withdrawn from the page for now. Its tile stays where it was, greyed out as coming soon beside the other cells to follow, and a link to it opens the multipolar neuron instead. The drawing's generator stays in the repository, ready to rebuild, and its README says how to put it back.

## v10.13 — 18 September 2026 — The pyramidal cell redrawn
Commit `65b5fd8` · Regrow the pyramidal cell so its branches keep clear of one another

The pyramidal cell's first drawing tangled: its basal dendrites ran through each other and through the axon, its spines were a fur of beads along every branch, its body was pinched round a nucleus that filled it, and the sheath was a fat sausage with an oligodendrocyte reduced to two lines. Every branch is now tried against everything already placed and shortened until it finds room, so the skirt fans out clean. Spines stand at spaced intervals in the three shapes the multipolar cell uses, and none is set where its head would land on a neighbour. The body is a proper pyramid with room for its organelles, the Nissl bodies reach into the base of the trunk rather than its top, the sheath is slimmer and thins at each paranode, the collateral leaves the bare axon before the sheath begins, the oligodendrocyte is a cell with a body and processes, and every terminal lies along the membrane it rests on rather than pointing at it. All nineteen structures still take their own clicks, and every label now sits in clear space.

## v10.12 — 17 September 2026 — The Brodmann map moves under the scans
Commit `ed56580` · Put the Brodmann map in the room under the viewports, and lead the rail with what is highlighted

Since the Brodmann areas moved into the Region Atlas the rail had run much longer than the column beside it, leaving a field of empty black under the four viewports. The two-face map now sits there, wide enough to read at a glance and still beside the scan it is a schematic of. The rail also leads with what is currently highlighted, so the chips sit directly under the region picker rather than below the whole list of areas.

## v10.11 — 17 September 2026 — The cortex's own cell
Commit `9f76a31` · Draw a layer V pyramidal cell, and let the tiles switch between cells

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
