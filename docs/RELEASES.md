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

## v11.47 — 21 October 2026 — The Firebase file checked
Commit · Record that the Firebase file is current and what to check instead before 1.1

The store notes said the Firebase file had to be refreshed before the 1.1 build was made. It was downloaded again and came back identical, and the flag in it does not switch the usage counts off in the SDKs the app uses, so the notes now say what to confirm instead: that the iOS stream shows in the Firebase console's Realtime view with a TestFlight build, and what to do if no iOS stream is listed. Nothing on the site changes.

## v11.46 — 21 October 2026 — The App Store notes for 1.1
Commit `e9bab01` · Bring the App Store notes up to date for the 1.1 submission

The notes that stand ready for the App Store, in the repository's store folder, now carry today's work in the What's New text, the tabbed receptor window, the Brodmann dropdown, the sideways atlas, the Hallucinations screen and the terms and deletion pages, and a numbered order for submitting 1.1, from the Firebase file that has to be refreshed before the build is made to the review notes and the submission itself. Nothing on the site changes.

## v11.45 — 21 October 2026 — The paper introduced, first in the Hallucinations study's bar
Commit `e2a636e` · Open the Hallucinations study's bar with a window that introduces the paper

The Hallucinations study's bar now begins with The paper, a window that introduces Boksa's editorial before the rest: who wrote it, a neuroscientist at the Douglas Institute and McGill writing for the Journal of Psychiatry & Neuroscience in 2009; what it is, an editorial rather than a study, a short tour of what neuroscience knows about hallucinations written around Allen's review and the model this page draws; and what she is saying, her argument in five paragraphs, from hallucinations in the well to the imaging, the windows onto the mechanism, Allen's model and the treatment, and the limits she closes on. The citation and the links to PubMed, PMC and the PDF stand at its foot, moved there from the Reference window, which keeps the scan and the regions.

## v11.44 — 21 October 2026 — One brain state in the Hallucinations study, and a reading of both
Commit `805b911` · Make the Hallucinations study's circuit tabs and state buttons one state, and have the reading give both states

The Hallucinations study's two switches are one. The Normal audition and Hallucinating buttons in the box and the tabs over the circuit now move together: change either and the scan, the circuit, the readout and the reading all follow, and the circuit's first tab reads Normal audition as the box's does. The reading of a picked region now gives both states whatever the scan is showing, what the region does when perception is intact and what happens to it in hallucinating people, the one showing marked beside its heading; a region the editorial reports no change in says so rather than falling silent.

## v11.43 — 21 October 2026 — The Hallucinations study as a screen of its own
Commit `57f3311` · Lay the Hallucinations study out as the 3D Region Atlas is, its sections behind a bar of buttons of their own

The Hallucinations study, the visualisation of Boksa's editorial on the hallucinating brain, is now one screen in the 3D Region Atlas's manner. The four views fill the room under the header, the brain state and the regions are a box in the corner that folds away on its tab, and what stood below the scans rises from a bar along the bottom, one window at a time, each category behind a button of its own: Reading, the picked region's part in the model, which opens as a region is picked from the list; Circuit, Allen's model drawn as signal flow with its Healthy and Hallucinating tabs; Not only in illness, the figures on who reports hallucinations; Imaging, what the structural, functional and connectivity studies found; Mechanism, the three windows onto it and Boksa's reservation on each; Where it stops, the limits of the evidence; then Export, the circuit as a 3D model, and Reference, the paper, its links and what the page is drawn from. The bar's readouts give the state showing and the region picked. On a phone the views show one at a time or four together, the box slides in from the right, and held sideways the bar stands along the right edge, as the atlas does.

## v11.42 — 21 October 2026 — The 3D Region Atlas on a phone held sideways
Commit `0cfd29c` · Lay the 3D Region Atlas out for a phone held sideways, the bar along the right edge and the views the whole height

Turn a phone sideways and the 3D Region Atlas now uses the room. In the app the bar at the top goes, leaving only its back button at the top left where it always stood; on the website the masthead steps aside. The bar of buttons moves from the bottom to the right edge, its icons two to a row, with the region drawer's handle coming off its edge, and the views take the whole height: the four together are one row of four instead of two rows of thumbnails, and the one view's tools and Centre stand at the left of its bar, after the back button, with the plane's name at the right. The receptor window puts its controls in a column beside the graph there, so the graph keeps its height. Turn the phone back and everything returns to its place. The app's part is a Swift change, verified by the owner's build.

## v11.41 — 21 October 2026 — Terms of use, a deletion page, and Apple's token revoked as an account goes
Commit `3bb6468` · Add the terms of use and the account deletion page, revoke Sign in with Apple on deletion and start the newsletter box clear

Two pages join the privacy policy. The terms of use say what the site, the apps and the MCP server are for, what you may do with the material and under whose licences, what an account is and is not, and the limits of what is promised, in a page as short as the policy. The account deletion page gives the steps for the app on iPhone, iPad and Mac, the app on Android, the web and email, and says exactly what is removed and what was never part of the account; the Play listing's deletion link is this page. Both are linked from the foot of every page beside the privacy policy and, in the app, from rows of the Account tab's Support box, which now also has a Delete your account row leading straight to the deletion section of the account page. Deleting an account signed in with Apple now revokes the Sign in with Apple authorisation as the account goes, as App Review requires: in the apps the native layer signs in with Apple again, revokes and deletes, on the web the popup's token is revoked by the SDK; and an account signed in with Google that Firebase asks to sign in again before deleting now does so on the spot, with the deletion following. The privacy policy gains a section on your rights under the UK GDPR and names the deletion page and the revocation. The feature-announcements box offered as an account is made now starts clear, since a pre-ticked box is no consent to email. The Swift change to the Account tab is verified by the owner's build.

## v11.40 — 21 October 2026 — The receptor window in tabs
Commit `8776bb1` · Lay the receptor density window out in tabs, the graph and the table fitted to theirs

The 3D Region Atlas's receptor density window is now tabbed, the tabs in a row under its title: Graph, Receptor (Region when charting by region), Neurotransmitters, Receptor types and Sources. The window keeps one height whichever tab is open. The graph fills its tab with nothing to scroll, the controls above it in their rows; where a screen is too short for its labels it scrolls inside its own box, and sideways only when it has more bars than fit. The Neurotransmitters tab holds the table of every receptor against every region, which scrolls down and across inside its box with the column names and row labels staying put, the names cut short where the box is small so the cells show; above it the text is one short paragraph, and ends with an example read off the table itself, naming the region where the receptor is densest, hence bright red, and where it is sparsest, hence yellow. The empty band that stood between the source buttons and that text is gone. The picked receptor's drawings and source have the Receptor tab, the cards of every receptor and their reference the Receptor types tab, and the coverage and the sources the last. The bar's Receptor graph and Neurotransmitters buttons open the window on the Graph and Neurotransmitters tabs, and a receptor's name pressed in the table charts it.

## v11.39 — 21 October 2026 — The privacy policy names its maker
Commit `4e41e78` · Name Fadil Karim as the maker of VisualNeuroscience.AI in the privacy policy

The privacy policy now says, where it tells you whom to write to, that VisualNeuroscience.AI is made by Fadil Karim, and its last line says the same; the company name that stood there is gone. Nothing else in the policy changes.

## v11.38 — 21 October 2026 — Brodmann areas picked the way the regions are
Commit `02ffaa3` · Pick Brodmann areas in the 3D Region Atlas through the same dropdown the AAL regions use

In the 3D Region Atlas the Brodmann areas are now added the way the AAL regions are. Where the pane held a search field and a long list of its own, it holds one button, Add a Brodmann area…, which opens the same kind of panel the regions' button does: a search field at its head, the areas listed beneath it by lobe, filtered as you type, with a swatch on each area already highlighted and, when the match is in what an area does rather than its name, the line that holds it. The arrow keys walk the list, Enter or a press adds the area and centres the planes on it, and the panel closes. The region box is the same height whichever atlas is chosen, on the website and in every app.

## v11.37 — 20 October 2026 — The MCP server first in the Vision Pro About window too
Commit `f54a95c` · Lead the Vision Pro console's About window with the MCP server, as the other About pages do

The About window of the Apple Vision Pro console now opens with the MCP server as well, a card of its own above the project's card: what an assistant can ask the atlas, the address to add as a connector, and the nine tools. With it every About page leads with the server, in the app, on the website and in the room.

## v11.36 — 20 October 2026 — The MCP server first on the About page
Commit `a9012bd` · Put the MCP server at the head of the About page, in the app and on the website

The MCP server now comes first on the About page. In the app on iPhone, iPad and Mac its box leads the About tab, above the message from the developer and the channels. On the website, and so in the Android app, the About page opens with the same box under its title, above the developer's portrait and message; inside the iPhone and iPad app that page is reached from the About tab, which already leads with the server, so there it is not shown a second time.

## v11.35 — 19 October 2026 — The receptor graph without the speech
Commit `a888eab` · Strip the receptor density pop-up to its graph, one sentence above it and its controls in rows

The Receptor graph pop-up of the 3D Region Atlas is now the graph and little else. One sentence stands above it where a paragraph did; the controls come in rows beneath that sentence, the source first, in vivo PET or autoradiography, then by receptor or by region, then the dropdown; and the graph follows straight after, higher than before, with the receptor's and transmitter's drawings and the sources beneath it as they were. The Chart, Receptor Types and Density Table tabs are gone from the pop-up, the bar's own Receptor graph and Neurotransmitters buttons doing their work, and the density table is shown nowhere for now.

## v11.34 — 19 October 2026 — A picture for the Network Atlas's box
Commit `e71d2ef` · Give the Network Atlas's box a picture, the ring and the networks on the brain, on the home page and in the app

The Network Atlas's box on the home page and on the app's Atlases page now carries a picture like the boxes around it: the ring of networks at the left and the brain in the flow state at the right, its networks coloured on the 3D scan. The home page's box showed the site's mark there before, and the app's box nothing.

## v11.33 — 19 October 2026 — The Molecular page as one screen, and the atlas's boxes in its style
Commit `3386006` · Lay the Molecular page out as one screen in the atlas's manner, and give the atlas's boxes the viewer's rounded style

The Molecular page is now one screen like the 3D Region Atlas: the receptor viewer takes everything under the header, nothing scrolls, and a bar along the foot carries its controls as an icon over a word. Receptors opens the picker, a box in the top left corner on a computer or an iPad that folds away on the tab at its edge, and on a phone a drawer the height of the screen sliding over the molecule from the right, shut when the page opens and closing again once a receptor is picked. Binding, Drugs, Compare and Display open the text as a window beside the molecule, or over its lower part on a phone, one section at a time, and About stands at the far right with the structures and their papers, now with the page's own introduction and credits as well. The molecule centres itself in the room the box and the window leave. The 3D Region Atlas's region box, its pop-ups and their tabs take the viewer's rounded, lifted style in turn, keeping all they do.

## v11.32 — 19 October 2026 — Slice sliders for a finger, the right one clear of the drawer's handle
Commit `031b86e` · Size the slice sliders for a finger and set the right one in from a phone's edge, clear of the drawer's handle

Under a finger the three sliders that cut the 3D view are now strips 44 points across with a thumb of 24, where they were a hair's line with a thumb made for a mouse, and they stay as they were for a pointer. On a phone the slider along the right edge stood where the region drawer's handle sits, which covered its thumb at the centre; it now stands in from the edge, clear of the handle, and the slider along the bottom stops short of it.

## v11.31 — 19 October 2026 — Reference at the far right of the bar
Commit `33df66e` · Put the Reference button at the far right of the 3D Region Atlas's bar

The Reference button of the 3D Region Atlas now stands at the far right of the bar, after Saved maps and Export and divided from them by a line, on a computer, an iPad and a phone alike. The bar's other pop-up buttons, What they do, Receptor graph and Neurotransmitters, keep their places.

## v11.30 — 19 October 2026 — The Brodmann map leaves the 3D Region Atlas
Commit `26dc5b6` · Take the Brodmann map out of the 3D Region Atlas, which keeps its Brodmann list

The 3D Region Atlas no longer carries the two-face Brodmann map: its button leaves the bar, and with it the pop-up and the drawing. The map has a page of its own, the Brodmann Area Atlas, where every area opens on the scan here. The atlas keeps its Brodmann list in the region box, so areas are still added and highlighted as before, and a link that lands on an area still opens on it.

## v11.29 — 19 October 2026 — The receptor table's column names whole
Commit `57d6f04` · Set the receptor table's column names the whole of their length and scroll the table with its pop-up

In the Neurotransmitters pop-up of the 3D Region Atlas the region names along the top of the table are now set whole: the header is as tall as the longest of them, where before a fixed height cut the longer names off at the top. The table scrolls with the pop-up, down and sideways, and its column names stay at the top and its row labels at the left whichever way it goes.

## v11.28 — 19 October 2026 — On a phone, the four views together come first
Commit `9e525fc` · Open a phone on the four views together, with their button first on the bar behind a line of its own

On a phone the 3D Region Atlas now opens on all four views together, two by two, as it does elsewhere, and the button for that view stands first on the bar, divided by a line from the four buttons that open one view alone. The last view chosen is still remembered.

## v11.27 — 19 October 2026 — All four views at once on a phone, as a fifth choice
Commit `686cc39` · Offer all four views together on a phone, two by two, as the bar's fifth view button

On a phone the bar's view buttons now end with All: the four views together, two by two, close-set across the whole stage, with each view's expand button back in its bar. Pressing a view's expand button there opens that view alone, as the bar's own buttons do, and the choice is remembered with the others. The 3D view alone still opens first.

## v11.26 — 19 October 2026 — The keyboard waits for a tap on the search field
Commit `da6cfb3` · Focus the region search on opening only where a keyboard is at hand, so a phone's keyboard waits for a tap

Opening the list of regions to add on a phone or an iPad no longer brings the keyboard up at once over the regions. The search field at the top of the list waits for a tap, and until then the list has the whole room to scroll through and pick from. With a mouse the field still takes the focus as the list opens, and typing a letter on the closed button still opens the list searching for it, as it always has.

## v11.25 — 19 October 2026 — On a phone, the region drawer slides over the view and starts shut
Commit `a20fd9d` · Make the phone's region area a drawer the height of the screen, over the view and shut at every opening

On a phone, held either way, the 3D Region Atlas's region area is a drawer again rather than a box: it slides over the view from the right edge, the height of the screen, and it is shut whenever the page opens, so the view has the whole screen until the handle at the right edge is pressed. The tab at the drawer's edge puts it away again. On a computer and an iPad the region picker stays the box in the corner that v11.24 made it, open or shut as it was last left.

## v11.24 — 19 October 2026 — The region picker as a box, its list let out of the box's scroll
Commit `71bcadc` · Make the region picker a box in the corner with its own scroll, its list hung outside that scroll

The region picker of the 3D Region Atlas is now a box rather than a column from the header to the bar. It stands in the corner, beside the views on a computer or an iPad and over them on a phone, as tall as what it holds and no taller than the room, and when the highlighted list grows long the box scrolls inside. It folds away on the tab at its edge and comes back on the handle the tab leaves at the screen's edge. The list of regions to add now hangs from the box, under its button and past the box's edge where the names have room, instead of sitting inside the box's own scroll, so it is one scroller rather than one inside another, which an iPad would not always let scroll. The website and the apps open the same pages, so this layout holds on a phone, a tablet and a computer wherever the atlas is opened.

## v11.23 — 19 October 2026 — The 3D Region Atlas on a phone: one view at a time
Commit `a75105f` · Lay the 3D Region Atlas out for a phone: one view at a time, the drawer from the right, icons on the bar

On a phone, held either way, the 3D Region Atlas now shows one view at a time, filling the screen edge to edge between the header and the bar, the 3D view first. The bar begins with the four views, 3D, Axial, Coronal and Sagittal, to switch between them, a line dividing them from the pop-up buttons; the readouts and each view's expand button step aside, having nothing to add to a view that already fills the screen, and the view chosen is remembered. The region drawer slides in from the right on a tab at the right edge, where a thumb reaches it, and the pop-ups rise the full width of the screen. The page's root no longer scrolls on a phone held sideways, where the folded site menu, laid out under the header though hidden, had made the document taller than the screen; that menu now scrolls within the room under the header there. Everywhere, on a computer and an iPad as well, the bar's buttons are an icon over a word, so the bar reads at a glance.

## v11.22 — 19 October 2026 — The 3D Region Atlas as one screen
Commit `11a4604` · Make the 3D Region Atlas one screen: the views fill it, the picker is a drawer, the rest rises from a bar

The 3D Region Atlas is now one screen, in the manner of an anatomy app, on the website and in the apps. The four views fill everything between the header and a bar along the bottom, and nothing scrolls. The region picker and the highlighted list are a drawer on the left, folded away on its tab when the views want the room, beside them on a computer or an iPad and over them on a phone. Everything that used to stand below the views rises from the bar's buttons as a pop-up over them, one at a time: what the highlighted regions do, the receptor graph, the receptor types by neurotransmitter, the Brodmann map and the reference, with Saved maps and Export at the bar's end; each still follows the selection, and the map still highlights what is tapped. The readouts sit at the bar's start. On a phone the four views keep their names and their expand buttons, with the tools waiting in the opened view. In any 3D view, a drag with the mouse's wheel button now pans, as a drag with shift held does.

## v11.21 — 19 October 2026 — Usage counts: who signs in, from where, on what
Commit `e955a8d` · Count the site's and the apps' use with Google Analytics for Firebase, each sign-in by its method

The site and the apps now count how they are used, through Google Analytics for Firebase, and say so on the privacy page: which pages and screens are opened, every sign-in and the way it was made, the kind of device, browser or app version, and the country, so that the owner can see how many people use the website and the app and how they sign in. Nothing is joined to an account, nothing is used for advertising, and the apps are built without the advertising identifier. On the website this is a first-party analytics cookie, which blocking cookies for the site stops; a setting in the site's configuration can keep the website out of it altogether and count in the apps alone. The bundled Firebase code now carries the analytics module and is rebuilt by one script kept in the repository.

## v11.20 — 19 October 2026 — Five to four on a phone and an upright iPad, as on an iPad held sideways
Commit `cd67113` · Give the scans the iPad's five-to-four proportion on a phone and an upright iPad instead of a square

On a phone, and on an iPad held upright, the four scans in the 3D Region Atlas, the Network Atlas and the Hallucinations study are no longer square. They take the proportion an iPad held sideways gives them, five wide to four tall, so on a phone nearly two views fit a screen where one did, and each view is a little shorter. On a computer and an iPad held sideways nothing changes: there the views are already fitted to the screen, flatter than that.

## v11.19 — 19 October 2026 — The four views fit a computer's screen, as they fit an iPad's
Commit `9644c24` · Fit the four views to the screen on a computer as on an iPad, measuring the room above them

On a computer the 3D Region Atlas, the Network Atlas and the Hallucinations study now fit all four views on the screen, as an iPad does, instead of drawing four squares that ran past its foot. Each page measures what stands above the grid, the header and the title strip, and shares the height that is left between the two rows, so the four are in view at once with the page at the top. The views stay square wherever the screen has the room, as on an iPad held upright, and a very short window lets them scroll rather than shrink below 180 pixels.

## v11.18 — 18 October 2026 — The tractogram on the page's own black
Commit `8e3ff9f` · Stack the Hallucinations study's views one to a row below 900 pixels, as the 3D Region Atlas does

In the dark theme the Tractography view now clears to the same near-black as the page around it, so the tractogram floats on the page instead of sitting in a box of a deeper black. The loading message was already drawn on that black, so the view no longer darkens as the streamlines appear. In the light theme the view keeps its dark ground. The Hallucinations study's four scans also stack one to a row on screens narrower than 900 pixels, as the 3D Region Atlas's do, so their bars keep every control inside them on a phone held sideways.

## v11.17 — 18 October 2026 — The Hallucinations scans match the 3D Region Atlas
Commit `53640e8` · Give the Hallucinations study the atlases' four views and pad the region colour tables so no region turns black

The four scans on the Hallucinations study, in the Library, now look and work as the 3D Region Atlas's do. Each view has a single bar, with its tools on the left, its name in the middle, and Centre and the button that opens it over the other three on the right. The slices can be held to one direction of drag, the stages are square, on an iPad the four fit the screen two to a row, and in the light theme the stages are white. The 3D view's Slice cuts through the highlighted regions as well as the brain, the wheel over a slice scrolls the page, and the opacity slider keeps up under a finger. On every page that draws the atlas's regions over the scan, a region no longer turns black when the one numbered after it is highlighted: picking the left anterior cingulate in the 3D Region Atlas used to blacken the right insula, and the Hallucinations study showed the same black patch.

## v11.16 — 18 October 2026 — The iPad's scans fill their views again
Commit `eaee199` · Let each scan fill its view on an iPad instead of sitting in a square at one end

On an iPad, in the app or in Safari, the scans in the 3D Region Atlas and the Network Atlas fill their views again. Since the four views were fitted to the screen two to a row, an iPad held sideways showed each scan as a square at one end of a wider box, with an empty strip beside it. The boxes keep their size; the scan's stage now runs the whole width of each one, black in the dark theme and white in the light, with the brain in the middle, and it is square again wherever the screen has the room, as on an iPad held upright.

## v11.15 — 18 October 2026 — The Brodmann Area Atlas on one screen
Commit `4589330` · Pare the Brodmann Area Atlas to its two maps and what the picked area does, on one screen

The Brodmann Area Atlas is now the map and nothing else: both faces of the hemisphere and, beside them, what the area you tap does, all on one screen. On a phone, on the web or in the app, the two faces sit one above the other with the reading beneath, and a long reading scrolls in its own box with its foot fading; on an iPad or a computer the reading is a column on the left and the two faces fill the rest, as large as the screen allows. Tap an area again to let it go, pinch a face to look closer, and follow a reading's link to see the same area on the scan in the 3D Region Atlas. The one area on neither face, BA48, is reached from the reading before anything is picked. The list, the four scans and the export are gone from this page; the 3D Region Atlas still has them.

## v11.14 — 18 October 2026 — A shorter header on phones
Commit `8bfc749` · Keep the follow links on the buttons' line in the website's header on phones

On a phone the website's header is a line shorter. The YouTube, Instagram, LinkedIn and email links used to drop to a line of their own under the Menu, Log in and theme buttons; they now sit at the end of the buttons' line, centred on it, on any phone from 320 pixels wide up. The links close up a little to make room, and on the narrowest phones the buttons lose a touch of padding and the theme button keeps just its dot.

## v11.13 — 18 October 2026 — The Brodmann Area Atlas without its 3D graph
Commit `7734e75` · Take the border graph off the Brodmann Area Atlas

The 3D graph of where the Brodmann areas border one another is gone from the Brodmann Area Atlas, so the page ends with the map and the scans and is much shorter on a phone. Picking an area from the list, the map or the scans works as before. The 3D export can still write every area's centre joined where they border, now as an option that is off until ticked. The home page and the app describe the page without the graph; the app takes that with its next build.

## v11.12 — 18 October 2026 — The Brodmann Area Atlas is back, beside the 3D Region Atlas
Commit `f73f668` · Restore the Brodmann Area Atlas as its own page and call the Region Atlas the 3D Region Atlas

The Brodmann Area Atlas has a page of its own again, straight after the Region Atlas, which is now called the 3D Region Atlas. The page lists the 41 areas by lobe with a search that finds them by number, by name or by what they do, draws both faces of the hemisphere as a line map, shows the area on the scan in the same four views as the other atlases, and places every area in a 3D graph at its true position, joined to the areas it borders. Pick an area anywhere and everything follows it: it fills in its lobe's colour on the map, the scans centre on it, the graph lights its neighbours, and What it does opens its reading over the page. A link to brodmann.html#ba=17 opens on that area. The 3D Region Atlas keeps its own Brodmann list and map. On the home page and on the app's Atlases tab the Brodmann Area Atlas sits under the 3D Region Atlas; the app takes this with its next build.

## v11.11 — 18 October 2026 — Channels on the app's About tab
Commit `85572d4` · Rename the Elsewhere box on the app's About tab to Channels

In the iPhone and iPad app, the box on the About tab that lists YouTube, Instagram, LinkedIn and email is now called Channels. The app takes this with its next build.

## v11.10 — 18 October 2026 — The app's tabs open straight onto their boxes
Commit `90b0f85` · Take the header off each of the app's tab pages and name the first tab Atlases

In the iPhone and iPad app, the five tab pages no longer open on a title. The title, the small line above it and the line of figures beneath it are gone, so each page starts on its first box and the tab bar alone names it. The first tab is now called Atlases. The app takes this with its next build.

## v11.9 — 18 October 2026 — The Network Atlas comes last on the app's Atlas tab
Commit `b0a8b55` · Put the Network Atlas last on the app's Atlas tab

In the iPhone and iPad app, the Atlas tab now lists the Network Atlas last, after the Region Atlas, Microanatomy, Molecular and Tractography. The app takes this with its next build.

## v11.8 — 18 October 2026 — The Molecular panel opens on its tabs and folds away
Commit `94df5c4` · Head the Molecular panel with its tabs and a fold button, and give the receptor picker a box of its own

The Molecular viewer's panel now opens on its tabs. The heading and the paragraph under it are gone, and the first tab is called Binding whatever the family, so nothing in the panel names dopamine and serotonin as a title that would need changing when more families arrive. A button at the end of the tabs folds the text away and the model moves over to fill the whole width; the same button, or any tab, brings the text back. The family and receptor picker sits on its own at the bottom of the left side: the family on one row and its receptors in a grid beneath, drawn the same way for every family, so the buttons keep their size when you switch from dopamine to serotonin. A line naming the receptor's gene, length and G protein heads the Binding and Drugs tabs. On a phone the panel is one sheet along the bottom with the tabs at its top and the picker at its foot, and folding it leaves just those two. Above the viewer on the web, the line beside the title now reads "receptors in 3D, built from 39 experimental structures".

## v11.7 — 18 October 2026 — No more swiping back by accident in the app
Commit `eaa262d` · Take the swipe back away from the app's pages so a drag on a scan cannot leave the page

In the iPhone and iPad app a swipe no longer takes you back a page. On iPadOS 26 a sideways swipe anywhere on a page went back, so dragging a scan, a slider or the 3D model could leave the page by accident; that swipe and the one from the left edge are both gone, and the back button at the top left is the way back. The app takes this with its next build.

## v11.6 — 18 October 2026 — The iPad gets the whole screen, and the view bars tighten
Commit `539763a` · Let the app's pages fill an iPad's screen without their title strip or the system bar's title

On an iPad, pages in the app now fill the screen. The title strip at the top of each page and the title under the tab bar are gone, so the Region Atlas, the Network Atlas and the Molecular viewer start right under the tab bar, and the Molecular viewer takes the screen's height. On an iPad the four views sit two to a row and fit the screen together, square where there is room and a little flatter with the iPad held sideways; on a computer they stay square. The bar over each view is a single line with Slice beside the other buttons, and the expand button stands as tall as the buttons around it. Where a view is short of room, the buttons keep one word each: Centre, Slice, Regions, Reset. The opacity slider keeps up with a drag: the regions follow it ten times a second instead of rebuilding every layer of every view for each step. The Add a region list's frosted backing now sits on a layer of its own behind the list, since iOS can refuse to scroll a list inside a blurred panel, and the list is given its scrolling afresh once it opens. The About box, on the home page and in the app, is titled Message from the Developer, without the line beneath it.

## v11.5 — 18 October 2026 — The Network Atlas has its own page again
Commit `4c120ae` · Give the Network Atlas its own page again and take it out of the Region Atlas

The Network Atlas is a page of its own again. Its tab is back in the menu after Molecular, and its box on the home page and in the app's Atlas tab leads straight to it. It opens on the first of its six states, with the ring under four square views laid out like the Region Atlas's: a bar over each, the expand button, slicing with Slice regions, and the light theme's scans. Pick a state or a region and the scans follow, and the address names the state, so a link opens on it. Beside the key, the page sets how strongly the regions cover the scan, saves a PNG of the four views and exports the state as a 3D model. The Region Atlas no longer carries the Network Atlas section or its switch, and links to the old network mode open the new page on the same state. On the Region Atlas, the bars the receptor chart fades now fade to the strength they were meant to, not almost to nothing.

## v11.4 — 18 October 2026 — On a phone, the region picker above the scans and the rest below
Commit `ce52c54` · Lead the Region Atlas on a phone with the region picker and follow the scans with the rest of the rail

On a phone the Region Atlas now opens with the Regions box, where you pick from the AAL regions or the Brodmann areas and set the opacity, with the scans straight after it. Highlighted, Saved models and Export follow the scans and their readouts, together in one box. On a tablet and on a computer the column of controls is as it was.

## v11.3 — 18 October 2026 — The About box's line, reworded
Commit `41af04d` · Reword the About box as a message from the developer of Visual Neuroscience

The About box now reads “A message from the developer of Visual Neuroscience”, on the home page and in the About tab of the iPhone and iPad app. In the app the portrait stands in its engraved frame in the middle of the box, as it does on the home page; the app picks up both with its next build.

## v11.2 — 18 October 2026 — Square viewports with one bar each, and the side column in one box
Commit `013eb62` · Give each Region Atlas view one bar over a square scan, make the rail one box and frame the About portrait

The Region Atlas's four viewports are now square, and each has a single bar above it instead of a caption and a row of tools: the view's own tools on the left, its name in the middle, and Centre planes and the expand button on the right, without the short description that followed each name. On a narrow screen the name, Centre planes and the expand button share the first line and the tools take a second. Slice regions is now a button beside Slice and Reset cuts, pressed each time you press Slice. It could go missing on the first visit after an update, because the site's offline copy kept the old scripts for one more load; scripts and styles now come fresh whenever you are online, so a new page never runs with old ones. The column beside the scans is one box, with Regions, Highlighted, Saved models and Export under their own headings. It no longer has to end at the readouts, so it can never run into the Highlighted Regions section below, and the Highlighted list shows about eight regions before it scrolls. On the home page the About box shows the portrait in its whole engraved frame, as the About page does, and the About tab of the iPhone and iPad app follows with its next build.

## v11.1 — 18 October 2026 — Open any view over the grid, and cut the regions with the brain
Commit `15ac846` · Let each Region Atlas view open over the grid, cut the highlighted regions with the slices, and drop the 3D lock

Every view in the Region Atlas now has an expand button at the end of its caption that opens it over the whole four-view grid, the same view at the size of all four, and puts it back with the same button or Escape. When you slice the 3D view, a Slice regions switch along its top takes the cuts through the highlighted regions as well as the brain, so a region is cut open with it instead of hanging whole in front of the cut; it is on each time slicing starts, and a saved model keeps it. The 3D view no longer has a direction lock, which it did not need, so Slice, Reset cuts and Centre planes sit on one line.

## v11.0 — 18 October 2026 — The iPhone and iPad app gets a tab bar
Commit `574da16` · Give the iOS app a system tab bar over the web app's pages

The iPhone and iPad app now opens on a tab bar, the system's own, in place of the website's menu. The site's sections are four tabs: Atlas, with the Region Atlas, the Network Atlas, Microanatomy, Molecular and Tractography; Library, with Visualizing Studies and the Digital Textbook; Practice; and About, with the developer's message, where to follow and write, and the MCP server. Each opens on a page laid out like the home page, a box for each of its pages in the home page's words and pictures, and a page you open stays inside its tab under the system's navigation bar, with Back and the edge swipe as in any iPhone app. Every tab keeps its place when you leave it and come back. Account, the fifth tab, holds your account page, the switch between light and dark, support and the privacy page, and the credits, and the theme you had chosen carries over. The Mac and Apple Vision Pro, which run the iPad app, get the same. The website and the Android app keep their own menus, and the tab bar reaches the App Store with version 1.1.

## v10.110 — 18 October 2026 — The side column shows everything and ends at the readouts
Commit `a6848d6` · Show every card in the Region Atlas's rail whole and end it at the readouts

The column beside the Region Atlas's scans no longer scrolls as a whole. Every box in it is shown in full, and the column now runs down to the foot of the readouts under the scans instead of stopping where the scans end. The Highlighted box takes whatever height is left, and its list of regions is the one thing that scrolls, inside the box; the boxes keep to the scans' own spacing to make room. In the export part of the Saved models box, Save PNG snapshot now comes after Export 3D model. On a very short window the column runs on past the readouts rather than hide anything.

## v10.109 — 18 October 2026 — The Region Atlas's side column is as tall as the scans
Commit `25f42ab` · Hold the Region Atlas's rail to the height of the scans and put export under saved models

Beside the scans, the Region Atlas's column of controls now ends exactly where the four views end. Saved models and Export are one box, with the export under the saved models, and the line naming the programs each 3D format opens in is gone. The Regions box keeps its size and the boxes under it share what is left: the Highlighted list stretches to fill the column, and when there are more regions or models than fit, that part of the column scrolls on its own, while the Add a region list still drops over everything and scrolls as before. On a phone, and on an iPad held upright, where the controls sit above or below the scans rather than beside them, the boxes stack as they did. The apps take the same page with their next build.

## v10.108 — 18 October 2026 — The opacity slider moves into the Regions box
Commit `a3b4b2c` · Move the Region Atlas's opacity slider into the Regions card

The Region Atlas's Opacity slider, which sets how strongly the highlighted regions and Brodmann areas cover the scan, now sits in the Regions box, just under Mirror left / right pairs, instead of in an Overlay box of its own, so the column beside the viewports is a box shorter. It is there whichever atlas you are picking from, and it works as before.

## v10.107 — 18 October 2026 — No black in the light theme's scans, and the home page's atlas picture retaken
Commit `a62b18a` · Draw the light theme's scans like a stained section and retake the home page's atlas picture for each theme

In the light theme the Region Atlas's slices no longer sit inside a thick black band. On white, the scan is now drawn the way a stained section reads on paper: the fluid around the brain and in the ventricles is white, grey matter is the darkest grey and white matter a pale one, so nothing in the slices is black and the brain's edge fades into the page instead of ending in a dark rim. The Network Atlas, which draws on the same scans, follows; the dark theme and the 3D view are as they were. The home page's picture of the atlas is retaken from the live page with a twin for each theme, so in the light theme it shows the white atlas on a white plate and in the dark theme the dark one, and only the picture on show is downloaded.

## v10.106 — 17 October 2026 — A wrong password clears, and repeated ones ask for a tick
Commit `a34561e` · Clear a refused password and ask for a tick after three in a row

When a sign-in is refused, the password field now empties and takes the cursor, ready for another go. After three wrong passwords in a row, each further try waits behind an "I'm not a robot" box that has to be ticked by hand first. If Firebase, which runs the accounts, pauses sign-in to an account after too many wrong tries, the box now says so plainly and offers the two ways in that work at once: a password reset by email, or a sign-in link. The count lives in your browser for a quarter of an hour and clears when you sign in.

## v10.105 — 17 October 2026 — White scans in the light theme, and an MCP box on the home page
Commit `bf03bc7` · Make the Region Atlas scans white in the light theme

In the light theme the Region Atlas's four views are now white rather than black. The 3D brain sits on white, and the slices clear only the empty space around the brain, so the scan itself, ventricles and all, looks as it does on black; the crosshair and the slice tool's edges turn to ink, and the theme switch reaches the scans at once. That switch now matches the Log in button beside it, the same height and type with its Dark or Light label, on the website and in the apps' bar. The home page has two new boxes above its figures, one for the MCP server with the address and tools an assistant uses, and one for the About page, a message from the developer. The About page writes the name as Visual Neuroscience and no longer uses long dashes.

## v10.104 — 17 October 2026 — The region list scrolls on iPhone, and the apps drop the newsletter box
Commit `5591efc` · Take the closed region picker out of the layout so its list scrolls on iOS

On iPhone and iPad the Add a region list stopped at the Rolandic operculum and would not scroll. It is now taken out of the page while it is closed rather than only hidden, which iOS needs before it will scroll a list that appears, and it still drops from its button and goes back the same way. Inside the apps the newsletter box no longer comes up on the pages: a new account can still ask for feature announcements with the box on the account form, and the website keeps its newsletter box.

## v10.103 — 17 October 2026 — Your account has a page of its own
Commit `7af58e0` · Add an account page with your details, saved work, a copy, support and deletion

An account now has a page of its own, reached from the account box. Logged in, it shows your details, every model you have saved in the Region Atlas with a link that opens it, and your practice progress, and one button downloads all of it as a single file. It is also where an account is deleted: two presses delete it at once, and anyone who cannot log in is told to write from the account's address, with the account then deleted by hand within 30 days. The support address is on it, and the privacy page and the account box point to it.

## v10.102 — 17 October 2026 — New accounts are offered feature announcements
Commit `ebf1a89` · Offer feature announcements by email when an account is made

Making an account now offers feature announcements by email, in a box that starts ticked and says what it is for: news of new features and nothing else. On the Create account form it sits above the button, and an account made with Google, Apple or a sign-in link meets it beside the username the first time the account opens. Left ticked, the address goes to the same list as the newsletter box on the pages, and Mailchimp writes once to confirm, so it joins the list only when its owner says yes; unticked, nothing is sent. The privacy page says so where it describes accounts and the newsletter.

## v10.101 — 17 October 2026 — The region menu has a search field
Commit `614a6e6` · Put a search field at the top of the Region Atlas's Add a region menu

Adding a region in the Region Atlas no longer means scrolling through sixty-two names, or a hundred and sixteen with the pairs split. The Add a region menu now opens with a search field at its top, ready for typing: part of a name, a lobe, or what you want a region to do narrows the list as you type, with the match marked, and a region found by what it does shows the line that says so under its name. The arrow keys walk the list, Enter adds the highlighted region, which is the first one named by what you typed, and regions already on the scan show the colour they wear. Closed, the menu looks as it did; open, it drops from its button as the section menus do, and on a phone it keeps above the keyboard. The Brodmann search beside it no longer shows a second clear button, and neither field makes a phone zoom in when it is tapped.

## v10.100 — 17 October 2026 — The atlas says it is in Claude
Commit `865ac73` · State the MCP server under the App Store link and on both About pages

The line under the home page's masthead now carries the server under the App Store link, as Also in Claude, as an MCP server, instead of the bare words MCP server beside it; inside the app, where the store link gives way to the names of the scans, the same line stays. The About page says it in the paragraph that points to the App Store, that Claude, ChatGPT and other assistants can ask the atlas questions directly, and the Vision Pro app's own about window says so too, with the server's address. Nothing else changes.

## v10.99 — 17 October 2026 — The MCP page says when to sign in
Commit `dee1f2c` · Tell people on the MCP page to add the connector with sign in when needed

The page that explains how to ask the atlas from an AI assistant still said there was nothing to sign in to, and told people adding it to Claude to choose No sign-in, which would leave the four account tools unable to reach their account. It now says that asking the atlas needs no account, that signing in is only for reading or saving your own models, and that the connector is added with Sign in when needed, so the atlas tools work at once and the account tools ask for a sign-in the first time one is used. Nothing else on the site changes.

## v10.98 — 16 October 2026 — By Region opens with the region's card
Commit `7631e16` · Draw the chosen region's function card at the head of the By Region panel

Choose By Region on the receptor chart and the panel beneath now opens with the region's own card, drawn as the Highlighted regions stack draws one: its layer, its name and what it does, the dot taking the region's colour when it is highlighted above. The receptor families and their numbers follow as before. Nothing else on the site changes.

## v10.97 — 16 October 2026 — Hover a bar and read what the region does
Commit `d88ca35` · Put each region's function into the chart's hover and strip the notes of where things sit

Hover a bar on the receptor chart, or the name under it, and the tip now ends with what that region does. The region notes themselves no longer open by saying where a region sits or what it is called, since the maps show that; each now says what the region does and nothing else, in the Highlighted regions stack, in the chart's hover, in the MCP server's answers and in the Vision Pro app's notes window. Nothing else on the site changes.

## v10.96 — 16 October 2026 — The reptilian core leads the chart
Commit `c71ca1f` · Run the receptor chart's layers from the bottom of the brain up

The receptor chart and its table now run from the bottom of the brain up: the cerebellum where a source has it, then the reptilian core on the left, the limbic midbrain, and the cortex on the right. Nothing else on the site changes.

## v10.95 — 16 October 2026 — The receptor chart runs by brain layer
Commit `e104665` · Run the receptor chart's regions by brain layer and name each layer under the bars

The receptor density chart now runs its regions cortex first, then the limbic midbrain, then the reptilian core, then the cerebellum where a source has it, with the atlas's own order kept inside each layer. Each layer's name sits under its run of bars on a rule of its own, and a hairline parts one layer from the next. The density table runs the same way, with the layer named above its rows. Nothing else on the site changes.

## v10.94 — 16 October 2026 — The reading sits under the ring
Commit `be340e8` · Move the network reading card beneath the ring

In the Network Atlas section the Reading card now sits under the ring, where the space was, with the state and the key down the left. Nothing else on the site changes.

## v10.93 — 16 October 2026 — The Network Atlas moves into the Region Atlas
Commit `dca9cc3` · Fold the Network Atlas into the Region Atlas behind a switch and drop its tab

The chord ring of brain states now lives under the Region Atlas's viewports, in a section with a switch and a circled i that says what it is. Switched on, it offers the states with None chosen; pick one and every region with a parcel lights up on the scan in its ring colour, beside whatever you have highlighted yourself, which keeps its own colour. The state shows as a line in the Highlighted card, and Clear all puts it back to None. Click a region or a whole network on the ring and the planes centre on it; move the crosshair over a lit region and the ring reads it back. The Network Atlas tab is gone from every page; the old page sends its links, state and all, to the right place, and saved models remember the mode.

## v10.92 — 15 October 2026 — The interface answers like an Apple one
Commit `948f416` · Give the interface Apple's fluid feel and the Swift its modern concurrency

Every button now answers on the press itself, not on the release. The account box comes down from the bar that holds its button and goes back up the same way, and the section menus, in the app and on the website, open from their button and close the way they came; a second press mid-flight simply reverses them. The bars and menus are materials the page shows faintly through. Throw a 3D view and it keeps turning at the speed you gave it, slowing as a scroll does, until you touch it again; a slow drag leaves it where you put it. Anyone who has asked their device for less motion gets plain fades and dead stops instead, and a tractogram that holds still until asked, and anyone who has asked for less transparency or more contrast gets solid chrome. On Apple Vision Pro the brain and the tractogram coast the same way after a throw, resist a pinch past their limits and settle back, and the cut sliders keep the finger where it took hold of the knob. Under the hood both native projects adopt Swift's approachable concurrency with main-actor isolation by default, and the Vision Pro app decodes its files and cuts its meshes in concurrent functions awaited by the scene rather than in detached tasks.

## v10.91 — 15 October 2026 — The Brodmann areas get their mention
Commit `2e160a6` · Name the Brodmann areas in the Region Atlas line on the home page

The line under Region Atlas on the home page now names the Brodmann areas alongside the receptor density maps and the functional breakdown. Nothing else on the site changes.

## v10.90 — 15 October 2026 — One line under each title
Commit `cd880c9` · Give each home page box a single line that says what it is

Each box on the home page now carries one sentence under its title that says what the thing is, in place of the two that told you what to click. Nothing else on the site changes.

## v10.89 — 15 October 2026 — The home page says less
Commit `34a3a59` · Cut each home page box to its title and a line or two

Each of the eight boxes on the home page now carries its title and one or two sentences, where several had grown into paragraphs that ran most of a phone screen. The facts line and the link under each are unchanged, and so is everything the boxes open. Nothing else on the site changes.

## v10.88 — 15 October 2026 — The Network Atlas takes the Region Atlas's shape
Commit `66ab60a` · Lay the Network Atlas out like the Region Atlas, the ring beneath the four views, and drop the layout buttons

The Network Atlas now reads like the Region Atlas: the four views in the same two-by-two grid with the same direction locks and Centre planes on each, the network ring in its own frame beneath them, and the rail on the left holding the network's own controls, the brain state, the reading, the scan and the key. The Region Atlas loses the Grid, Axial, Coronal, Sagittal and 3D buttons from its title strip, since the grid is the only layout it has used for a while; saved models still open as before. Nothing else on the site changes.

## v10.87 — 15 October 2026 — The tractogram's reset, revolve and zoom put right
Commit `d0cc23d` · Give the tractogram one working reset, a revolve that shows, an Iso face and no zoom slider

Both Reset view buttons on the Tractography page now work, and they put everything back: the opening angle, the zoom and any pan. The one in the rail had been doing nothing at all, and the one in the title strip reset the angle and then failed on a function the page never had. Revolve turns the brain at a pace that can be seen, starts the moment it is switched on, and is paused only by taking hold of the brain or scrolling over it, not by the mouse merely crossing the view. The orientation cube gains Iso, the three-quarter view the page opens with. The zoom slider is gone; the + and − on the box, the wheel and a pinch zoom instead, and the pinch and two-finger pan now actually reach the tractogram, which they had not. Nothing else on the site changes.

## v10.86 — 15 October 2026 — Continue with Apple on the website
Commit `102935b` · Switch Sign in with Apple on for the website now its Services ID and key are in Firebase

The account box on the website now offers Continue with Apple next to Continue with Google, above the email form. It opens Apple's own sign-in page in a popup and brings the person back signed in; a Hide My Email address works like any other. The apps have offered the Apple button natively for a while, and that is unchanged. Nothing else on the site changes.

## v10.85 — 15 October 2026 — The iPhone app can sign in with Google
Commit `26b704b` · Carry the iOS Google client in the app's Firebase config and register its return scheme

Nothing on the website changes. The iPhone and iPad app's Firebase configuration is now the one issued after Google sign-in was switched on, which carries the client the phone's Google sheet signs in with, and the app registers that client's return address, so the sheet can hand the person back to the app signed in. The next App Store build carries both; the website had Google from the previous release.

## v10.84 — 15 October 2026 — Continue with Google
Commit `e5877d1` · Switch Google sign-in on in the account box, on the web and in the apps

The account box now offers Continue with Google above the email form, on the website and in the apps, where it opens the phone's own Google sheet rather than a web page. Sign in with Apple is offered inside the apps as before. Both depend on the providers being switched on in the Firebase console, which is the owner's next step; until Google is, its button says so.

## v10.83 — 15 October 2026 — A sign-in failure names its cause in brackets
Commit `c3cbcda` · Carry the underlying error code in the sign-in box's messages, so a failure says what refused it

When signing in or creating an account fails for a reason the box has no plain words for, the message now ends with the underlying code in brackets: "(permission-denied)" means the database's rules refused the request, "(unavailable)" that it could not be reached, and an "auth/…" code is Firebase's own verdict. The messages it does have words for are unchanged. Nothing else on the site changes.

## v10.82 — 15 October 2026 — The Firestore rules deploy from the terminal
Commit `4cb839c` · Add the Firebase project files so the Firestore rules deploy with one command

Nothing on the site changes. The repository now carries the two small files the Firebase command-line tool wants, naming the rules file and the project, so the security rules publish with one command from the repository root instead of being pasted into the console. The account setup guide and the handover say so.

## v10.81 — 15 October 2026 — An assistant can sign in to your account, and save a Region Atlas model from a chat
Commit `c2376f6` · Give the MCP server a sign-in in front of the site's accounts, four account tools, and a consent page on the site

Claude and the other assistants can now use your VisualNeuroscience.AI account, if you let them. The five atlas tools stay open to everyone; four new ones ask you to sign in the first time one is reached: who is signed in, the Region Atlas models saved to the account, one of them by name with the link that opens it, and saving a new model from a list of regions and Brodmann areas, which then appears in the app's Saved models on every device. The sign-in is the standard one assistants expect, done on a new page of the site where you log in as you would in the app and press Allow; the assistant never sees your password, is given a key that stops working when you disconnect it, change your password or delete the account, and can only ever add a model, never replace or delete one. The privacy page and the MCP page say all of this. The server keeps nothing: the key is Firebase's own, and the models live where the app keeps them.

## v10.80 — 15 October 2026 — The sign-in box stays open until its cross is pressed, and remembers what was typed
Commit `3cd4744` · Close the sign-in box only from its cross, keep what was typed in it, and name a refused username check for what it is

The account box used to vanish at a click beside it, taking a half-filled form with it. It now closes only from its cross, which is bigger and sits in a box of its own, or from the Escape key, and whatever was typed, the tab that was open included, is there again when the box is reopened, until a sign-in succeeds. Creating an account also stops blaming the connection when the database has refused to look a username up: that refusal comes from the Firestore rules not yet being published, and the message now says so.

## v10.79 — 15 October 2026 — The home page points to the MCP server beside the App Store
Commit `f09f5e1` · Put a link to the MCP server page in the home page's dateline, beside the App Store link

The line under the home page's masthead, which already points to the App Store, now carries a second link beside it, MCP server, to the page that explains how to ask the atlas questions from Claude, ChatGPT or Kimi. In the app, where the App Store link gives way to the names of the scans, the server link stays.

## v10.78 — 15 October 2026 — A page on asking the atlas from an AI assistant, and MCP tools that refuse a bad question plainly
Commit `f09ef7b` · Add a public page on the MCP server and have its tools refuse an empty, wrong or unknown input with a plain message

A new page, Ask the atlas from an AI assistant, is the public documentation of the MCP server: its address, the steps for connecting it from Claude, a Claude Team or Enterprise organisation, Claude Code, ChatGPT and Kimi, the five tools with a question to try on each, where the answers come from and the fact that the server keeps nothing. The privacy page and the About page link to it. On the server, three inputs that used to slip through are now refused with a message that says what to send instead: a region request with no name no longer answers with the first region in the list, a Brodmann request with no number or a word in its place no longer talks about "undefined", and a receptor request with a misspelt source or with neither a structure nor a receptor no longer guesses. The server takes effect when it is next deployed.

## v10.77 — 15 October 2026 — Each MCP tool carries its title where the Connectors Directory reads it
Commit `100f27e` · Put each MCP tool's title in its annotations as well, where the Connectors Directory looks for it

Submitting the MCP server to Claude's Connectors Directory flagged all five tools as missing a title, because the server gave each its title at the top of the tool while the directory reads it from the tool's annotations. Each tool now carries its title in both places, so the listing shows the names the tools were given, Search the brain atlas, About one brain region and the rest. Nothing on the site changes; the server takes effect when it is next deployed.

## v10.76 — 15 October 2026 — The MCP server answers at mcp.visualneuroscience.ai
Commit `782cb71` · Give the MCP worker its custom domain in its config, so a deploy creates the DNS record

The server that lets Claude, ChatGPT and Kimi ask the atlas questions was deployed for the first time today, at its workers.dev address, and the short address the privacy page has named all along, mcp.visualneuroscience.ai, had no DNS record behind it. The worker's config now carries that address as a custom domain, so deploying the worker creates the record and the certificate itself. Nothing on the site changes.

## v10.75 — 11 October 2026 — The phone header gives the brand its own line and the buttons room to be pressed
Commit `14e3262` · Give the phone header the brand on a line of its own, bigger buttons on the left and the links on the right, and add YouTube to the links

On a phone or a tablet the website's header now has two lines. The brand has the first to itself, centred, and the second carries the Menu, Log in and theme buttons on the left, each now 40 pixels tall, with the links to YouTube, Instagram, LinkedIn and email on the right. YouTube, at @VisualNeuroscienceAI, joins the links everywhere they appear: in the masthead on a wide screen, in the app's top bar on an iPad or a Mac, and in the iPhone's sections menu, which now sets them in two rows. Signed in, the account button stands alone and Log out lives on the account card it opens, as it already did in the app. On the narrowest phones, and while an account has no username yet, the links take a third line of their own.

## v10.74 — 11 October 2026 — Instagram, LinkedIn and email at the top, and every profile on the About page
Commit `9eaba41` · Put Instagram, LinkedIn and email at the top of every page, and list YouTube, Instagram, LinkedIn and GitHub on the About page

The links at the top of every page are now Instagram, LinkedIn and email, the three ways to reach the person who built this. They sit where the last release put them: in the masthead on the website, in the top bar on an iPad or a Mac, and at the foot of the sections menu on an iPhone. The About page now lists every profile under the signature, one to a line with its handle: the YouTube channel, @VisualNeuroscienceAI, Instagram, LinkedIn and GitHub.

## v10.73 — 11 October 2026 — YouTube and Instagram links at the top of every page
Commit `52e869e` · Put YouTube and Instagram links at the top of every page, in the website's masthead and in the app's top bar or its menu

The top of every page now links to the project's YouTube channel, @visualneuroscience, and to Instagram, where it is fid_900. On the website the two icons sit in the masthead: on the brand's line on a phone or a tablet, and beside the Log in button on a wider screen, and the header is no taller for carrying them. In the app they sit in the top bar on an iPad or a Mac. On an iPhone, where the bar is already full, they sit at the foot of the sections menu that opens from it, with their names beside them. Each one opens the profile in a new tab.

## v10.72 — 10 October 2026 — The app's top bar keeps its title clear of the buttons on a phone
Commit `65ac41b` · Keep the app bar's title clear of the account and theme buttons on a phone, and let the back label give way before the title

On an iPhone the bar at the top of the app had come apart once you were signed in: the account button and Log out sat over the brand, Log out broke onto two lines and the menu button landed in the middle of the name. The bar is now laid out so that the buttons at either end take exactly the room they need and the title has the rest, cut with an ellipsis rather than covered; where the bar is wide enough, as on an iPad or a Mac, the title stays in the centre as before. Signed in, the bar shows the account button alone, with its label whole, and Log out lives on the account card it opens. When a page has a long back label, Visualizing Studies say, and the title would not fit beside it, the back button keeps its chevron and drops the label, as an iPhone's own bars do. The invitation to choose a username now reads Set username.

## v10.71 — 5 October 2026 — The Region Atlas picks from one atlas at a time, and the wheel zooms the 3D brain gently about the pointer
Commit `af6495d` · Make the Region Atlas pick from AAL or the Brodmann areas with one switch, keep both kinds in one highlighted list, and tame the wheel on the 3D brain while taking it off the slices

The Regions card now opens with a choice of atlas: Automated Anatomical Labelling (AAL), which offers the region dropdown and the mirror switch, or Brodmann areas, which offers the searchable list of areas and brings the Brodmann map up beneath the viewports. Only what can be picked next changes: whatever is already highlighted, a region or an area, stays in the one Highlighted list whichever side is showing, and the page remembers the last choice. A link to a Brodmann area opens on that side. On the 3D brain the wheel used to zoom twice over, once in the page and once in the viewer underneath, by nearly a quarter at every click of the wheel and at every tick of a trackpad; it now zooms a tenth per notch, about the point under the pointer, with a trackpad's small movements adding up the same way, as a CAD viewer does. The three slices no longer answer to the wheel at all: drag moves the crosshair, pinch zooms, and the page scrolls past them as it does anywhere else.

## v10.70 — 29 September 2026 — The account card lines up its buttons, and says when the database refuses a username
Commit `c0c6303` · Set Save and Log out side by side on the account card, and tell a refused username claim apart from a taken name

On the account card, Save and Log out now sit side by side under the username and university fields, Save solid and Log out outlined, and any message about the save appears directly beneath them rather than under the delete button. Saving a username also reports what happened more honestly: until the site's Firestore rules are published, the database refuses every claim, and the card used to read that refusal as the name being taken. It now looks the name up after a refusal and says the database refused it and why, and only calls a name taken when someone else holds it. A name the same person already holds is simply adopted. The same distinction reaches the Create account form.

## v10.69 — 28 September 2026 — The cell figure names its parts on hover, and its labels wait behind a switch
Commit `f75b42b` · Take the labels and leader lines off the cell figure, name its parts at the pointer instead, and put the book's labels behind a switch that is off by default

The cell in Building a Nervous System now shows the drawing alone: no text, no leader lines. Point at any organelle and its name appears at the pointer; click or tap it, or a name in the list beside the drawing, for its subtitle and description. A switch under the drawing, Labels on lines, puts the book's eight labels back on their leader lines for anyone who wants them; it is off to begin with, and the page remembers the choice. The two leader lines the tracer had merged into the drawing itself, from the nucleus out to the edge of the cell, have been cut out of the traced shapes and the shapes healed across the cut, so the drawing is clean with the labels off.

## v10.68 — 28 September 2026 — The cell figure is now the book's own drawing, traced and made interactive
Commit `acbe91d` · Replace the drawn cell figure with a vector trace of the book's, every shape tagged with its part and the labels reset in the page's type

The cell figure in Building a Nervous System is no longer a drawing made to resemble the book's picture: it is the book's picture, traced to vector shapes, so the nucleus with its tangle of DNA, the studded arcs of rough endoplasmic reticulum, the mitochondria, the lysosomes, the Golgi and its vesicles are the illustrator's own lines and colours. Each of the six hundred or so shapes is tagged with the part it belongs to, so the figure answers the pointer as before: hovering an organelle or its label names it, and a click, or a name in the list beside the drawing, opens its subtitle and description in the panel and lights every copy of that part while the rest fades. The trace carries no text, so the eight labels and their leader lines are set again in the page's type, on the book's routes to the dot, in ink outside the cell and dark inside it so they read on the dark theme too. A disc and a ring in the cell's own colours sit under the trace to fill the notches its leader lines had cut in the fills.

## v10.67 — 28 September 2026 — The cell figure is redrawn to the book's, with its labels on their lines
Commit `ea86cb8` · Redraw the eukaryotic cell to the book's figure, organelle for organelle, with the book's labels and leader lines

The cell figure in Building a Nervous System is drawn again, this time to the book's picture rather than freely: the same cell with the same organelles in the same places and the book's own colours, the nucleus with its tangle of DNA and its nucleolus, the studded arcs of rough endoplasmic reticulum around it, the smooth reticulum beneath, the three mitochondria, the two lysosomes with their enzymes, the Golgi with its vesicles, the free ribosomes with their bracket, and the eight labels on their leader lines exactly where the book puts them. The labels take the page's ink so they read on the dark theme. Everything still answers the pointer: hovering an organelle or its label names it, and a click, or a name in the list beside the drawing, opens its subtitle and description in the panel.

## v10.66 — 28 September 2026 — Accounts get a username, shown in place of the name, and a university if you want to give one
Commit `39176c8` · Give every account a username that no one else can take, shown in place of the name, and an optional university field

Creating an account now asks for a username along with the name, and the nav and the account card show that username from then on instead of the person's name. It is three to twenty letters, numbers and underscores, and it is unique: the form checks it before the account is made, and the database itself refuses a second claim on the same name, so two people who choose it at the same moment cannot both have it. Someone who signs in with Google, Apple or LinkedIn has no form to type it on, so the nav says Pick a username until they open the account card and choose one there, where the username and the university can be changed later too. A university is an optional field on both forms. Deleting the account releases the username. The narrow header from v10.65 also keeps the page's side gutters now, so the wordmark no longer touches the edge of a phone.

## v10.65 — 28 September 2026 — The header stays in view, and folds its sections into a menu on a phone
Commit `eb00bd1` · Pin the header to the top of every page, compact it once the page scrolls, and fold the sections into a menu under 960 pixels

The masthead no longer scrolls away. At the top of a page it is the centred masthead as before; as soon as the page moves it draws in to a compact bar, the wordmark small and the sections on one line, so it keeps little of the screen while the map or the text is being read. Under 960 pixels wide, tablets held upright and every phone, the nine section links fold into a panel behind a Menu button, and the Log in and theme buttons stay in view beside it, so an account and the theme are always one tap away. The app has the same menu in its bar, at the right beside those two buttons, listing every section with the current one marked. Escape, a tap outside or a wider window closes either.

## v10.64 — 28 September 2026 — Two textbook figures answer the pointer: every base, organelle and arrow says what it is
Commit `3242d82` · Name every part of the central dogma figure on hover, and draw the eukaryotic cell in code with a panel that opens on a click

The central dogma figure now explains itself piece by piece. Point at any base and a label names it, adenine or uracil, with a line on what it pairs with; point at a strand, the arrows, an amino acid, the free amino acids or a folded protein and the same happens, the template and coding strands included. The second figure of the section, the typical eukaryotic cell, is now drawn by the site as well: membrane, cytoplasm, nucleus with its envelope, DNA and nucleolus, rough and smooth endoplasmic reticulum, ribosomes, mitochondria, lysosomes, the Golgi apparatus and vesicles. Hovering a part names it; a click or a tap, or a name from the list beside the drawing, puts its subtitle and description in the panel and lights every copy of that part, so all three mitochondria glow together. Both follow the theme and both are kept in the textbook's build.

## v10.63 — 28 September 2026 — The Android app is ready for Google Play, on phones and tablets
Commit `faac8ab` · Ready the Android app for Google Play: signed bundle, listing, declarations, graphics and screenshots for phone and tablet

Everything Google Play asks for is now in the repository. The Android project signs its release bundle with an upload key kept outside the repository, carries version 1.1, and asks Capacitor for the real screen insets so the app bar clears the status bar on Android 15 and later, which draws apps edge to edge. The listing text, the app content declarations (data safety, content rating, target audience, app access), the account and testing route and the build steps are written out in app/store/PLAY-STORE.md, with the 512 pixel icon and a 1024 by 500 feature graphic drawn from the share card beside it. The store screenshots are retaken from the live pages for every family, Google's phone and 7 and 10 inch tablet shapes and Apple's iPhone and iPad shapes alike, nine pages each, the Microanatomy and Molecular pages among them, by one script kept in app/scripts; the old iPhone and iPad shots of the tractography, practice and textbook pages, which showed the site as it was months ago, go with them. The privacy page gains a section on deleting an account, which the Play listing has to point at, and the App Store notes carry the Molecular section in the next version's What's New.

## v10.62 — 28 September 2026 — The textbook's central dogma is drawn in code, and lights up note by note
Commit `bed86c7` · Draw the central dogma figure for the textbook in place of the book's image, with its four notes lighting the drawing

The first figure of the textbook's Building a Nervous System section, the one that takes a gene to a protein, is now drawn by the site rather than shown as the book's picture: DNA base by base in the nucleus, transcribed into mRNA, the mRNA carried out to be translated into a chain of amino acids, and the chain folded into proteins. The book's four notes sit beside it, and hovering or tapping a note lights its part of the drawing and dims the rest; a second tap lets go. The drawing is set in the site's own inks and typefaces, so it follows the light and dark themes, and it is kept in the textbook's build so a rebuild from the OpenStax source keeps it. Two small things on phones came with it: a wide table in the book now scrolls inside its column instead of pushing the page out sideways, and a long web address in a caption breaks rather than doing the same.

## v10.61 — 28 September 2026 — The text under the tools runs the full width of the page
Commit `9804f07` · Let the prose under the viewers run the width of its page instead of stopping at a column

On the Molecular and Tractography pages the paragraphs under the viewer, and the credits under them, stopped at a column a little over half the page wide, leaving the right-hand side empty under a frame that ran edge to edge. The same cap sat on the notes above the neurotransmitters and the previews on the Microanatomy page, on the receptor introduction in the Region Atlas, and on the summary of a region's receptors. All of them now run the width of the page, as the tools above them do. The About and Privacy pages keep their centred reading column, which is a different thing.

## v10.60 — 28 September 2026 — The nav runs from the atlas down to the molecule, then out to the systems
Commit `524e97c` · Reorder the site nav so the scales run atlas, cell, molecule, then networks, tracts, studies, book, practice, about

The row of headings at the top of every page is in a new order. It opens with the Region Atlas as before, then steps down the scales, Microanatomy and Molecular, before stepping out to the Network Atlas and Tractography; the Visualizing Studies, the Digital Textbook, Practice and About follow. Nothing on the pages themselves moves.

## v10.59 — 28 September 2026 — A Molecular section: the dopamine and serotonin receptors in 3D
Commit `1aeb5e9` · Add the Molecular section, a 3D viewer of seventeen dopamine and serotonin receptors set in the site's typefaces

The site gains a section on the scale below the cell. Molecular is an interactive viewer of the five human dopamine receptors and the twelve serotonin receptors that signal through G proteins, built from thirty-nine experimental structures: pick a receptor and follow its neurotransmitter in as it docks and switches the receptor on, with the G protein docking after; put antipsychotics, Parkinson's agonists, triptans, LSD and psilocin into the same pocket and see which block and which mimic; compare every subtype of a family on one pocket table; and read the citation behind every structure. It is one self-contained page framed by the new section page, which opens it on the site's dark or light theme, passes a deep link through, and keeps the reader's place in the address bar so a copied link comes back to the same receptor, tab and drug. Its colours and layout are the viewer's own; its typefaces are now the site's three, Prata, Newsreader and Flux, served from here like everything else, and three.js is served from here too, so the page makes no outside request. The section has its entry in the nav of every page, its box on the front page, and its source and rebuild script under scripts/molecular.

## v10.58 — 27 September 2026 — The cut sliders lose their white fill
Commit `0dd3a23` · Draw the Vision Pro cut sliders as a track and a knob with no fill, so a cut at rest no longer shows as a white bar

The right, front and top sliders on the brain's console looked full when nothing was cut: the system slider paints white from its left end to the knob, and those three knobs start at the right end. All six sliders are now the app's own, a grey track and a white knob and nothing else, so every one looks the same at rest and as it moves, and where the knob sits is the only sign of how far a cut has gone. Each still travels inwards from its own edge and stops short of its partner; drag the knob, or pinch the track where the knob should go. The build number on the console moves to 58.

## v10.57 — 27 September 2026 — The Vision Pro app builds again, for visionOS 26 and newer
Commit `9888a8d` · Raise the Vision Pro app's minimum to visionOS 26, which the switch that stops window restoration needs

The fix in v10.55 for the duplicate windows would not build. The switch that stops visionOS bringing an app's windows back on relaunch exists only from visionOS 26, and the project still allowed the app to be installed on visionOS 2, so Xcode refused all five uses of it. The app's minimum is now visionOS 26; the simulator and the headset this is built for run 27, and nothing older would have run the fix anyway. Nothing else changes, and the build number on the console moves to 57.

## v10.56 — 27 September 2026 — The brain's model is written once, and visionOS 27 stops crashing on it
Commit `a45067d` · Write the brain's model once per load, since a second write while the window closes crashes RealityKit on visionOS 27

The crash on the headset is a RealityKit defect in visionOS 27, and the app was tripping it. The brain's model used to be written when its data finished loading and again a fraction of a second later, when the first cut of the surface arrived; if the window was closing between the two writes, RealityKit went on to use a material block it had already released, and the app died with a bad memory access. The model is now written once, by that first cut, so the gap no longer exists. Found by opening and closing the brain window in a loop on the visionOS 27 simulator, where the old code crashed within four cycles every time and the new one ran forty clean; the brain now first appears a fraction of a second later than before. The build number on the console moves to 56.

## v10.55 — 27 September 2026 — The Vision Pro app no longer brings its windows back on relaunch
Commit `d3c3388` · Stop visionOS restoring the Vision Pro app's windows, which filled the room with copies and crashed RealityKit on a restored brain

The log from the headset showed what all the copies were. visionOS brings an app's windows back from its previous run when it relaunches, and every build from Xcode is a relaunch, so each run added the last run's consoles and notes windows to the room; and RealityKit crashed with a bad memory access while setting up a brain window brought back that way, which left the app paused in the debugger with the brain loading forever and every button dead. The app's own rule, one window per kind, was never at fault. Every window but the launch console now opts out of being restored, so the app opens on its console alone and the brain, its console, the notes, the Brodmann window and the tractogram are opened afresh from it. The log lines added in v10.54 now reach Xcode at once rather than sitting in a buffer.

## v10.54 — 27 September 2026 — The Vision Pro app goes back to v10.50 and says which build it is
Commit `f9dfb79` · Restore the Vision Pro app as it was in v10.50, with a build number on the console and a log of every window

Three attempts at the duplicate windows since v10.50 have each left the headset worse, with the brain loading forever and the consoles dead, and none could be watched from here. The app is now exactly what it was in v10.50, the last build that loaded the brain and added regions, with two additions that change nothing in its behaviour: the console shows the build number, so the build on the headset can be told from the one before it, and the app prints a line to Xcode's log each time a window appears, disappears or is asked for, and when the brain starts and finishes loading. One run with that log will show where the extra windows come from, and the fix will follow from it rather than from another guess.

## v10.53 — 27 September 2026 — A second copy of a Vision Pro window closes itself
Commit `36c4c02` · Return the Vision Pro windows to plain groups and have a window whose id is already held close itself

Keying the windows by a value in v10.52 left the brain loading forever and the consoles unresponsive on the headset, as changing their scene kind had in v10.49, so every window is a plain group again, as in v10.50, which ran. The copies come from somewhere else: visionOS brings an app's windows back from its previous run at every relaunch, and every build from Xcode is a relaunch, so the room filled with windows the app never opened. Each window now claims its id as it appears, and a second window for the same id closes itself, whether brought back or opened by mistake; the consoles open a window only when nobody holds its id, so picking a region adds to the What they do window wherever it stands.

## v10.52 — 27 September 2026 — One window per id on Vision Pro
Commit `e2926ce` · Key every Vision Pro window by its own id, so a repeated request reaches the window already open

Copies of the What they do window and of the brain console were still appearing on the headset after v10.50. Every window other than the launch console is now keyed by its own id and always opened with that key, which the system answers with the window already in the room rather than a new one, on top of the app's own record of which windows are open. Picking a region, pressing The brain twice or ticking Show on the brain again therefore adds to what is there, wherever it has been moved.

## v10.51 — 27 September 2026 — The planes start on the midline again
Commit `2b5f730` · Put the start point and Centre planes back on the middle of the volume, and keep the off-midline slice for the screenshots only

v10.46 moved every tool's starting point 4 mm off the midline so the side view would open on the brain rather than the fissure, and made Centre planes and region centring keep that distance too. That was meant for the pictures, not the tools: the Region Atlas, the Network Atlas, the hallucinations page and the Apple Vision Pro planes now open on the exact middle of the volume as they always did, Centre planes returns there, a left and right pair is centred between its halves, a Brodmann area at its own point, and picking a region from the list no longer moves the planes. The home page picture and the App Store screenshots keep the off-midline slice they were taken with. One repair from v10.46 stays: centring on a region is placed in millimetres from the atlas's own voxels, so it lands on the region rather than up to a centimetre off.

## v10.50 — 26 September 2026 — The Vision Pro windows go back to how they were, and still open once each
Commit `f10cd12` · Restore the Vision Pro app's window groups and have each window open once by keeping track of which are in the room

After v10.49 the brain came up cut along one side and would not turn, and picking a region did nothing, on the owner's headset. That release had changed what kind of scene three of the windows are, and nothing else had changed, so the change is undone: every window is declared as it was before. The What they do window is still only ever one, done another way: the app now keeps track of which windows are in the room, and a picked region opens that window only when it is not there already, otherwise it simply appears in it, wherever the window has been moved. The console's buttons and the Brodmann checkbox open the brain, its console and the tractogram in the same way, once each.

## v10.49 — 26 September 2026 — One What they do window on Vision Pro
Commit `b16d6f8` · Make the Vision Pro app's flat windows single, so a picked region joins the What they do window already open

In the Apple Vision Pro app, picking a region used to open a fresh What they do window once the first had been moved, leaving copies of it around the room that all showed the same list. There is now only ever one: a new region joins the window already open, wherever it stands, and brings it forward. The brain console and the Brodmann window work the same way, so their buttons no longer stack up copies either.

## v10.48 — 25 September 2026 — The App Store name becomes Visual Neuroscience
Commit `0b772f5` · Name the app Visual Neuroscience in the App Store listing notes

The listing notes now give the app's App Store name as Visual Neuroscience, in two words, in place of VisualNeuroscience.AI. Apple lets the name change only with a new version, so it goes in with 1.1 and shows once that update is released; the notes say so, and add that another listing's name is close to it, which is reason to keep the subtitle specific.

## v10.47 — 25 September 2026 — On the App Store
Commit `ef5bf59` · Link the App Store listing from the site and move the app to version 1.1

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
