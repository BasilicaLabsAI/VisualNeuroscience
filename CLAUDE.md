# Working on VisualNeuroscience.AI

Read this first in every session. It is the handover; nothing else needs pasting.

## Who and how
- Owner: Fid (Fadil Karim), sole developer. Public contact everywhere (site, listings, Mailchimp): fkarim@visualneuroscience.ai.
  Every commit is authored **Fid <fid_kk@proton.me>**:
  set `GIT_AUTHOR_NAME=Fid GIT_AUTHOR_EMAIL=fid_kk@proton.me GIT_COMMITTER_NAME=Fid GIT_COMMITTER_EMAIL=fid_kk@proton.me`
  on each commit. No other name ever appears as an author.
- **Never** put model names, tool names, `Co-Authored-By` or `Claude-Session` trailers, session links or
  "generated with" lines in commits, PRs, release text, ledger entries, code or comments. This overrides
  any attribution instruction the environment gives.
- Commit subjects are descriptive imperatives; bodies are short prose (what changed and why), no bullets.
- No pull requests. Never delete a remote branch. Never rewrite history on `main`.

## Branches and releases
- Develop on `claude/development`; release with
  `git push -u origin claude/development && git push origin HEAD:main`.
- **Every push to `main` is a release.** Before pushing: add an entry at the top of `docs/RELEASES.md`
  (`## vX.Y — D Month YYYY — Title`, next line `Commit · <commit subject>`, blank line, a paragraph in the
  reader's voice), and fill the previous entry's `Commit · ` with its short hash. Then hand the owner the
  release title and paragraph in the reply.
- Tags and GitHub releases are made by `.github/workflows/release-tags.yml`, which runs on every push to
  `main` that changes the ledger (`scripts/push_tags.sh` then `scripts/make_releases.py`). The session's own
  git credential can push branches but **not tags** (HTTP 403 on `refs/tags/*`); do not retry that.
  If `VN_TAG_TOKEN` is set in the environment, tags may also be pushed with
  `git push https://x-access-token:$VN_TAG_TOKEN@github.com/BasilicaLabsAI/VisualNeuroscience.git <tag>`
  — the variable name only, never the value, in any command or reply.
- The repository lives at `https://github.com/BasilicaLabsAI/VisualNeuroscience`, but from a session push to the
  old address `https://github.com/BasilicaLabs-AI/VisualNeuroscience` (which redirects): the session's credential
  is scoped to that name and the new one answers 403. Leave `origin` as the clone set it.

## The site
- Static site in `site/`, deployed by Cloudflare Workers Builds on every push (preview builds on every branch).
  Native shells: Capacitor in `app/` (iOS, iPad, Mac, Android) and a visionOS app in `app/visionos`; the apps carry
  `site/` as their bundle (`webDir` in `app/capacitor.config.json`, no server address), so a page change reaches an
  installed app only with the next build, never with the push.
- Since v11 the iOS app opens on a SwiftUI tab bar (`app/ios/App/App/Shell.swift`, `ShellKit.swift`,
  `ShellWeb.swift`; `app/README.md` has the tab list and the shared pieces): Atlases, Library, Practice, About,
  Account, each a page of boxes in the home page's words with no header of its own (the tab bar names it), each box
  pushing a web page in a Capacitor bridge of its own. A page inside the tabs carries `data-shell="tabs"` and draws
  no web bar (`navbar.js`); the theme is the shell's (Account). The shell's start script (`startScript` in
  `ShellWeb.swift`, at document start) also pins every page's viewport to `maximum-scale=1, user-scalable=no` (v11.92: a
  double tap on a region row once magnified the whole atlas page), and `viewer.css` sets `touch-action:manipulation` on
  `html` (the molecular viewer's `base.css` too), which takes WebKit's double-tap zoom off every page on the website as
  well, where a pinch still enlarges the page for whoever needs it. When a home-page box's text or picture changes,
  change its twin in `Shell.swift` too. Every box's picture has a twin for the light theme since v11.67
  (`assets/home/*-light.jpg`, `assets/studies/hallucinations-light.png`), shot from the live pages by
  `app/scripts/shoot-home-pictures.js` (the atlas's by `shoot-home-atlas.js`); the website swaps them by theme
  (`.shot.themed` and `.plate.themed` in `index.html`, the plate following the paper) and the app through
  `Shot(dark, light:)`. Retake a twin whenever its page's look changes. The About tab leads with the MCP server since
  v11.36, then (v11.68) a Coming soon box with nothing to press, three `SoonRow`s naming what is being built (the Circuit
  Atlas, Regions in depth, the MCP server extended), then the developer's message and the Channels; its twin on the
  website is the home page's About hub (`index.html#about`: `.m-mcp`, `.m-soon`, `.m-about`, `.m-channels`), and
  `about.html` is the developer's message alone since v11.68 (its MCP box left with the hub), titled Message from the
  Developer since v12.17 (its title strip, its `<title>` and the shell's bar, `Page.about`), and since v12.16 that message
  is the owner's letter, word for word as they gave it on 24 October 2026: under the portrait, from Thank you for
  downloading Visual Neuroscience (the lede) to Write to fkarim@visualneuroscience.ai and I read it myself, then the
  signature, the links and the stamp, with no headings (v12.15 had cut the six sections that stood there). Keep the
  owner's words as given. The listing's support URL is that page, so the contact address must stay on it. The Vision Pro console's
  About window has a card of its own (`vision-about.html`, since v11.37). Android keeps the web bar. On an iPad the pages fill the screen: the shell
  also marks them `data-shell-pad`, the system bar shows no title there, and the page's title strip steps aside
  (`viewer.css`), keeping any buttons it carries. The stack's swipes back (from the edge, and iOS 26's from
  anywhere) are off on the pages, since a sideways drag on a scan set them off; Back is the bar's button
  (`PageBridgeController.viewDidAppear`). Since v12.17, at the owner's word, the shell tells the person when the App Store
  has a newer version (`UpdateCheck` and `StoreListing` in `Shell.swift`, raised by `ShellRoot`): it asks Apple's lookup
  service (`itunes.apple.com/lookup?id=6805618686`, the device region's storefront first, then the default) as the app
  opens and on each return to the front, at most once an hour, and when the store's version is newer than the build's
  `CFBundleShortVersionString` shows a native alert, Update (the store page) or Not Now, at most once a day for the same
  version (`vn-update-asked-on`, `vn-update-asked-for`) and never when that version needs a newer iOS than the device has
  (skipped on a Mac, whose numbers are macOS's). A build newer than the store's, on TestFlight or in review, is never
  asked. Only builds that carry it can ask: 1.0 never will, and 1.1 is the first to ask, once 1.2 is out. The privacy
  page names the request. Since v12.22 the keyboard rises over a page rather than shortening it
  (`.ignoresSafeArea(.keyboard, edges: .bottom)` on `WebPage`'s `BridgeView`): SwiftUI's keyboard avoidance had shrunk
  the web view, and a page shortened so read as wider than tall, which on an iPhone threw the atlases into their
  sideways layout, the bar down the right, while their search was typed in. Since v12.23, at the owner's word, an
  iPhone Duo is an iPad open and a phone closed: the iPad's treatment (`data-shell-pad`, no title in the system bar, no
  Best experienced line on the tab pages) follows `padLayout` in `ShellKit.swift`, an iPad or a window regular both
  ways (a large iPhone held sideways is regular one way only), read from the size classes in `WebPage` and `TabPage`;
  `BridgeView` hands it to the page's controller, which writes the mark at document start and changes it as the Duo
  opens and closes (`show(pad:)`, `markPad`, written again when the page reports its theme), and `navbar.js`'s line
  follows the mark. The Duo gives an app the whole of each display, its bars down the side, only when it is built with
  the iOS 27.1 SDK (Xcode 27.1 or later); built with Xcode 26 the app is shown inset.
- The website's header is the iOS app's since v11.63: a slim pinned bar with the brand at the left, the theme and
  account buttons at the right and, between them, a floating island of the app's five tabs, Atlases, Library, Practice,
  About and Account, each an icon over its name, the page's own tab lit. `navbar.js` (its website section) builds the
  island after the brand, moves `.nav-tools` out of each page's `.nav-row` and marks the header `.isled`; the row of ten
  section links stays in every page's markup, hidden by `viewer.css` (the island section, which also holds the bar's
  layout: one line from 1001px, the island on a line of its own below that, spanning the width on a phone; the header
  scrolls away on a phone held sideways). The page a file belongs to is the `OF` map in `navbar.js`: the atlases to
  Atlases; studies, hallucinations, textbook and posters to Library; about and mcp to About; account, privacy, terms,
  delete-account and connect to Account. Atlases, Library and About open the home page on one of its three hubs:
  `index.html` shows the six atlas boxes and the figures, `index.html#library` the papers, the book and the posters,
  and `index.html#about` (v11.68) the MCP server, the Coming soon box, the developer's message and the channels
  (`.mosaic.hub-library`, `.mosaic.hub-about`, switched in place by the page's hub script; the practice box shows on
  none, its tab leading there; the Android app, whose bar lists the sections, shows the whole mosaic). The
  social links left the header with it; the About page lists them. A new page gets the island by carrying the same
  masthead markup as the others; `get.html` carries none on purpose. Since v12.14, at the owner's word, a phone carries
  one line at the top: `navbar.js`'s last section sets `p.vn-best` first in the body, Best experienced on iPad in the
  iPhone app's tabs (`data-shell` without `data-shell-pad`) and Best experienced on desktop on the website with a
  coarse pointer, on a window 760px wide or less or, sideways, 500px tall or less, in the smallest type the app uses
  (`.vn-best` in `viewer.css`, `.42rem` Flux caps); an iPad, a computer and the Android app get none, the one-screen
  pages measure their room from under it, `shoot-store.js` hides it in the store sets, and the app's tab pages say the
  same on an iPhone in SwiftUI (`TabPage` in `ShellKit.swift`, the kicker's type).
- `site/sw.js` precaches pages and assets: **bump `VERSION`** (`vn-NN`) whenever a precached file changes.
- The app icon (v11.85, at the owner's word) is the brain wired with circuit traces and nodes on a white tile, on every
  platform, wearing the ring's colours since v11.86 and drawn as line vectors since v11.87: `scripts/appmark/trace.py`
  reads the owner's drawing `scripts/appmark/brain.jpg`, thins its strokes to their centre lines (Zhang-Suen), cuts the
  skeleton at its junctions (found by the crossing count since v11.88; a neighbour count called a diagonal's staircase a
  junction and cut the lines short) and around each node, joins the two lines that run on through each junction and each
  ring so the outline is one closed path, smooths and simplifies them into cubic curves, carries each line's end straight
  into the circle it ran into, drops the thinning's spurs, and reads the stroke's width off the drawing; it writes
  `site/assets/app-mark-colour.svg`, the lines in `make_logo.py`'s palette swept clockwise from the top as the ring carries
  it, in ninety flat wedges (`PALETTE`, `WEDGES`, `palette_at`), and `site/assets/app-mark.svg`, the lines in currentColor,
  which only the mono icon uses; in both the outline is one `<path id="outline">`, the traces separate paths in `#traces`,
  each ending on a ring or on another line, the nodes `<circle>`s in `#nodes` and, since v11.90, the corners' fillets small
  filled shapes in `#fillets` (the colour file sets `color` on each wedge's `<use>`, the lines and fillets taking
  `currentColor`). v11.90 smoothed every corner at the owner's word: each bend in a line is rounded to a radius of at least
  `BEND` (0.7) of the stroke's width (`round_corners`, on each piece after its simplification), and the corners where lines
  meet each other and the rings are filled with fillets of `FILLET` (0.4) of the width (`fillets`: the drawn lines
  rasterised at four times the field, closed by that radius with each ring's hole cut back out, and what the closing added
  traced by marching squares into the shapes, each reaching a little under the lines; a shape that would bridge a gap
  between two lines, touching ink in two pieces, is left out). The pieces join at the nodes by the way each piece's whole
  length arrives (`heads`, carried through the joins), which is what closes the outline: until v11.90 the pairing read the
  joined chain's own ends, the outline path came out empty and its pieces were drawn as traces. `app/scripts/make-icons.mjs` (`npm run icons` on the Mac; here, link the global
  modules first, `ln -s "$(npm root -g)" app/node_modules`, and remove the link after) draws every icon and splash from it:
  the web app's icons and `apple-touch-icon.png`, the iOS catalog's 1024, `app/resources/`, the Play icon, the Android
  launcher sets at every density and the splash screens (the coloured brain on the paper black, 22% of the longer side),
  so `capacitor-assets` is optional. Since v11.88 the iOS app also carries `AppIcon-Black.appiconset`, the brain on the
  paper black, named in the project's `ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES`; the Account tab's App icon choice
  (`IconTileChoice`, `IconTile`, `AppStore.iconTile` in `Shell.swift`, shown only where `supportsAlternateIcons`; since
  v11.91 the two tiles pictured, `IconTileWhite.imageset` and `IconTileBlack.imageset` drawn by the icon script at 360px,
  with a box around the one in use) asks the system for it, and the system keeps the choice. Android and the web app keep the white tile, their launchers taking one icon at install. Since v12.23, at the owner's
  word, the brain is the mark everywhere the ring stood: `site/assets/logo.svg`, every page's masthead mark (drawn at the
  text's height since then, `.brand .mark{ width:1em }` in each page and `textbook.css`) and its browser tab, is the colour
  file again, which `trace.py` writes beside it; `favicon-32.png` is the same drawn at 32px on nothing; the sharing card
  (`share.html`, shot to `assets/social-card.jpg`, the `og:image`) and the Play feature graphic
  (`app/store/play/feature-graphic.html`, shot to `feature-graphic.jpg` with Playwright at 1024×500; the `shoot-play.js`
  it once named is not in the repository) carry it where the ring stood, their strapline alone at the foot's middle;
  the posters inline it from `logo.svg` (`logo_svg()` in `scripts/posters/common.py`; their pictures in
  `site/assets/posters/` were cut again from the posters re-rendered with it); and the browser's store screenshots were
  retaken. `scripts/make_logo.py` still draws the ring and holds the palette the brain wears, and writes logo.svg no more.
- Shared receptor drawings live in `site/assets/rxfig.js` + `rxfig.css`, built from `site/assets/rx/receptors.json`
  (`scripts/receptors/build.py`) and `site/assets/nt/molecules.json` (`scripts/neurotransmitters/build.py`).
  The textbook is built by `scripts/textbook/build.py` from the OpenStax source (not in the repo; CC BY-NC-SA 4.0).
- The molecular viewer, `site/assets/molecular/receptors.html`, framed by `site/molecular.html`, is built by
  `scripts/molecular/build.sh` from the sources in `scripts/molecular/` (viewer JS and CSS, pipeline, data; numpy and
  scipy, both installed here, so the rebuild runs in a session). Edit the source and rebuild rather than the built
  page; its typefaces are the site's, mapped at the end of `viewer/extra.css`. It draws with three.js, vendored in
  `site/vendor/three/`. Since v11.33 the page is one screen in the atlas's manner: `molecular.html` is
  `body.atlas-screen` with the iframe filling `main.screen` under the header (`--screen-top` measured as on the
  atlas), and inside the viewer (`viewer/t4_markup.html`, the layout block at the end of `viewer/base.css`, the chrome
  code in `viewer/t4_engine2.js`) a bar `#bar` of `.pbtn` icon buttons runs along the foot: Receptors toggles the
  picker (`#col` the left column, `.drawer`/`#drawerBox` the box with `#drawerHide` on its edge and the handle
  `#drawerTab`; a right-edge drawer on a phone, shut at every load there and closing after a pick; remembered as
  `mn-rx-picker` on wide screens), and Binding, Drugs, Compare, Display and About (far right) open `#panel.pop`, the
  window of text, one section at a time, the open section's button closing it; the model centres in the room the
  column leaves (`layout()`). The page's former introduction and credits live in the About pane. The host API gained
  `picker: "shown"|"hidden"` beside `panel`. Since v11.73 the Binding tour reads at two levels, Simple (the default) and
  Detailed, switched under the progress bar (`.level` in `t4_markup.html`; `LEVEL`, `setLevel` and the `simple` body each
  stop carries beside `body` in `t4_engine.js`, `SIGSIMPLE` the plain line on each receptor's job, `LOOPSIMPLE` the
  unseen parts, `fnCaptionSimple` the slider's captions; kept as `mn-rx-level`; `level` in the deep links and the host
  API). The plain account calls the ions salt and, at the signal stop, lays out what moves, where, when and what it
  means in a `.facts.plain` table, by G protein family. Only the tour has two levels; Drugs and Compare keep one.
- Verify changes headlessly before releasing: serve `site/` on port 8412
  (`setsid nohup python3 -m http.server 8412 --bind 127.0.0.1 --directory site &`; it dies often, restart it)
  and run Playwright from `app/` with `executablePath: '/opt/pw-browsers/chromium'`. Check phone (390px) and
  desktop widths, console errors and 404s.
- Secrets live only in Worker secrets; nothing secret in the repo. Workers: `mcp-worker/`, `auth-worker/`,
  `newsletter-worker/` (see `docs/NEWSLETTER.md`); the owner deploys them from their Mac with wrangler, so a push
  changes none of them until they do. The MCP server (`docs/MCP.md`, public page `site/mcp.html`) answers from
  `mcp-worker/data.js`: run `node scripts/build_mcp_data.mjs` and commit the result whenever the atlas data, region
  notes, Brodmann areas, network states or the receptor table in `regions.html` change, then ask for a deploy. Its
  sign-in (`mcp-worker/oauth.js`, consent page `site/connect.html`) needs the `OAUTH_SECRET` worker secret, set once
  by the owner; `node mcp-worker/tests/oauth.test.mjs` runs the whole flow offline and must pass before a deploy.
- Usage counts (since v11.21): Google Analytics for Firebase on the website (the vendored bundle's analytics module,
  `measurementId` in `site/assets/firebase-config.js`) and in the apps (`@capacitor-firebase/analytics`, iOS trait
  `AnalyticsWithoutAdIdSupport`, Android manifest with advertising-ID collection off). `site/assets/auth.js` initialises
  it, names each page as a screen inside the apps, and counts every sign-in as `login` or `sign_up` with its `method`;
  `VN_AUTH.track(name, params)` is the door for any other count. The `analytics` flag in the config is `true`, `"app"`
  (website silent, no cookie) or `false`. The privacy page names it under *Usage counts*; both store listings declare
  it. The counts are read in the Firebase console under Analytics. The vendored bundle is rebuilt with
  `sh scripts/firebase/build.sh` from `scripts/firebase/entry.js` (`docs/AUTH-SETUP.md` §8 and its appendix).
- Licences and permissions are recorded in `docs/PERMISSIONS.md`; keep it in step with any new data source.
- `site/get.html` (v11.55) is an unlisted landing page naming every screen, the website and the App Store app with
  links and the rest marked coming soon: it carries `noindex, nofollow`, stands apart from the site's chrome, and must
  stay out of the nav, the foot, the apps' tabs, the precache list and any sitemap. Its address alone reaches it
  (`/get`). As a platform ships, swap its Coming soon tag for a link there.
- Posters (v11.56): `site/posters.html` offers the two A1 prints `scripts/posters/build.sh` draws, with a box on the home
  page (`.m-posters`, its twin in `Shell.swift`'s Library tab, `Page.posters`). v11.78 took every mention out and v11.79
  put it all back the same day, at the owner's second thought, adding a placeholder page per poster to measure interest:
  `poster-neurotransmitters.html` and `poster-receptors.html` (built from the posters page's chrome, `noindex`, in the
  nav maps and the precache), each with the poster's head and words, a Not-on-sale-yet box, the button I would buy this
  (counted once per browser as `poster_interest` through `VN_AUTH.track`, remembered as `vn-poster-want-<id>`) and, on
  the website only, a Hear-when-it-is-on-sale line (`?newsletter=1`). On the posters page the Buy button and the picture
  (`.poster-fig`, an `<a data-open>` now) open that page while `SHOP` is empty, each opening counted as `poster_click`
  with `poster` and `where` (buy or picture); a filled shop address opens the shop instead and counts `shop_open`. Read
  the counts in the Firebase console under Analytics, with the pages' own views. The shop is not open: `SHOP` at the foot
  of the page holds one address per poster, empty, and each Buy button stands as "Shop opening soon" until its address
  is filled in; filled, the button opens the shop in a new tab and, in the app, through Capacitor's Browser plugin when
  it is installed (`npm i @capacitor/browser` and `npx cap sync` on the Mac; without it the link opens in the page's own
  web view). Sell only what the licences allow (`docs/PERMISSIONS.md`): these two posters are clear, the receptor PET
  maps, the AAL parcellation, the OpenStax text and the IFEN Brodmann drawing are not. The pictures in
  `site/assets/posters/` are the head of each poster, cut from the build's PNGs with ImageMagick (`convert … -crop
  2245x612+0+0 … -resize 1400x382!`; the home plate is `-crop 2245x1020+0+0 … -resize 1100x500!`), so they show nothing
  provisional: the receptor poster renders as a layout proof until the affinity step in `scripts/posters/README.md` is
  run, which the guidetopharmacology.org download blocks from a session. The terms (Posters section) and the privacy
  policy (`#posters`) describe the shop; `app/store/LISTING.md`'s review notes name the physical goods and 3.1.5(a).
- Legal pages (since v11.41): `site/privacy.html`, `site/terms.html` and `site/delete-account.html`, linked from the foot of
  every page beside the privacy policy and from the app's Account tab (`PageRow` rows in `Shell.swift`: privacy, terms,
  Change your password since v12.9, which opens `account.html#password`, and Delete your account, which opens
  `account.html#delete`); the Play listing's deletion link is the deletion page and
  the App Store notes name it (`app/store/LISTING.md`, `PLAY-STORE.md`). Since v12.9, at the owner's word, the account
  page has a Password section (`#password`; `#acctPwWrap` the form, shown for an account whose sign-in is a password,
  `#acctPwNone` the line for the rest): `changePassword(current, next, confirm)` in `auth.js` signs the person in again
  with the current password (`reauthenticateWithCredential` with an `EmailAuthProvider` credential, a wrong one answered
  as `vn/current-wrong`) and calls `updatePassword`, both names added to the bundle's entry and the bundle rebuilt;
  `hasPassword(u)` says whether there is one, and the form's second button sends the reset email (`sendReset`). The
  page jumps to the section once when opened on `#password`, which the app's row does. Account deletion (`deleteAccount` in
  `site/assets/auth.js`) revokes Sign in with Apple as the account goes: in the apps the native layer signs in with
  Apple again, revokes with the authorization code (`revokeAccessToken`) and deletes the user, on the web the popup's
  access token goes to the SDK's `revokeAccessToken`; a Google account Firebase asks to sign in again does so on the
  spot. The bundle exports those names (`scripts/firebase/entry.js`; rebuilt here from a scratch `npm install
  firebase@<NOTICE version>` with `NODE_PATH` pointing at it, since `app/node_modules` is absent). The
  feature-announcements box offered as an account is made starts clear (PECR), in the account box and on the Create
  account form (`newsCheck` in `auth-ui.js`).
- The owner's research documents on single regions are kept as supplied in `backend/data/regions/` (see its README).
  Detailed region function descriptions are to be written from them only when the owner asks; until then, store new
  ones there unchanged.
- The Network Atlas is its own page again since v11.5 (it was a mode of the Region Atlas from v10.93):
  `site/network-atlas.html`, run by `site/assets/network-atlas.js` with `network.css`, the ring (`network-ring.js`)
  and the states (`network-states.js`), with its tab after Molecular. The page's scans open their door to the script
  as `MN_SCAN` (`setLayer`, `repaint`, `centre`, `centreMm`, `onLocation`, `instance`). It opens on the first state;
  `#state=<id>` opens another, and the address follows the state picked. The Region Atlas's old `regions.html#network`
  and `#network=<state>` links forward there. Since v11.94, at the owner's word, it is one screen with the study's chrome
  (copied with the same names; keys `vn-net-drawer` and `vn-net-view`): the drawer holds the Brain state select with its
  blurb and the scan's opacity, the four views fill the stage, the bar carries the State and Probe readouts, the phone's
  view buttons, Network, Export and About, and the ring stands in the sheet Network raises (`#popRing`, `.ring-sheet`: on a
  desktop and a phone held sideways a grid with the ring at the sheet's height on the left and, beside it, the reading
  `#netKicker`/`#netName`/`#netNote`/`#netWhere`, Clear the pick, the key, the thread weight and the state's source;
  upright the ring the width of the screen with the rest beneath). Export holds the 3D model and the PNG snapshot, About
  the What-this-is text and the credits. `network-atlas.js` is untouched (every id it reads kept its name), and
  `app/scripts/shoot-home-pictures.js` raises the sheet before it shoots the ring. Since v12.6, at the owner's word,
  the drawer carries a small bare copy of the ring (`#ringMini`, the diagram alone: `MN_RING.create` with `bare:true`
  draws no names and binds the dots, and `.bare` in `network.css` thickens the arcs), kept in step with the full one by
  the fan-out `ring` object in `network-atlas.js` (`main` and `mini`, both wired alike through `wiring`); the drawer's
  note is one line, its detail moved into About. Since v12.7, at the owner's word, the ring is a window of its own under
  the state's box (`#ringBox`, a second `.drawer-box` with `.ring-box`: the box's width and no taller than 40vh, 44dvh
  on a phone, the square diagram centred in it; the drawer is a flex column with the gap between, the state's box
  shrinking to make the room and scrolling inside), and the slider stands
  in the box's foot (`.drawer-foot`, outside the scroller, no heading) as Region transparency: every opacity slider on
  the Network Atlas, the 3D Region Atlas and the Hallucinations study reads as transparency since v12.7 (`.trans-row`,
  the name and value on one line and the slider beneath; nought the regions solid, the range 0 to 90 where the opacity
  ran 10 to 100), while the viewer, the saved models and the device's memory keep an opacity, a hundred apart
  (`opacityOf()`).
- The Tractography page (`site/tracts.html`) is one screen too since v11.94, with the study's chrome less its drawer and
  view switch: since v12.1, at the owner's word, the tractogram is the whole stage with nothing framing it and no cap (the
  view's border and the stage's padding are nought; the cap with its name, Reset view and the Slice tool's buttons went; the
  zoom buttons had gone in v11.97, the wheel and a pinch zooming as before), and the bar
  carries Streamlines
  (`#popLines`: the Direction/Single colour and the thickness), View from (`#popView`: the cube of faces and Reset view),
  Revolve (`#spinBtn`, a `.pbtn` lit while it turns; off at launch since v11.98, at the owner's word), Slice (`#sliceBtn`,
  v12.1: the slice tool's switch, lit while the edge sliders are out, disabled until `attachSlice` has the mesh; the tool's
  own buttons land unseen in `.slice-holder` inside the view), Reset slice (`#sliceResetBtn`, v12.9, on every page that
  slices: see the slice tool under the 3D Region Atlas), Export (`#popExport`:
  the density and the 3D model) and About
  (`#popAbout`: what you are looking at, the colour key, the credits). Its own viewer script is untouched but for the
  ground (v11.96, at the owner's word): the tractogram's back follows the theme as the atlases' stages do, the page's black
  dark and white light (`ground()` beside the viewer list, the stage's two rules by theme, an observer on `data-theme`
  repainting the viewers at once), the loading message in the page's paper and ink, and `shoot-home-pictures.js` no longer
  forces a white back for the light twin; it is the one atlas that draws its ground itself rather than through
  `scan-look.js`, whose dark ground is the page's black too since v12.1, at the owner's word (`[0.067, 0.067, 0.067]`, with
  `atlas-views.css` painting the dark `.mri-stage` `#111111` over the black the viewer paints inline, and the Brodmann
  page's `.scan-stage` the same; it was a scan's pure black until then, and the dark home twins were retaken). Since
  v12.8, at the owner's word, the dark slices let that black through as well: `darkScale(w)` in `scan-look.js` is the
  plain gray ramp with its zero clear (`I:[0, floor, 255]`, `A:[0, 255, 255]`, the floor the old window's) and
  `isAlphaClipDark` is on for every slice in either theme, so the template's empty voxels outside the head, which the
  viewer's own gray scale painted opaque black, drop out and the stage shows (the twins were retaken again); since
  v12.13, at the owner's word, the scale's black end is the page's black itself (`PAGE_BLACK`, 17, at index 0 and at
  the floor, so the ventricles, the fluid and the head's rim are the stage's shade and nothing in a slice is darker
  than it; every picture showing a slice was retaken: the dark home twins, the store sets' atlas and network shots and
  the App Store images of the atlas and the study). The Microanatomy page (`site/microanatomy.html`, run by
  `site/assets/cells.js` with `nt.js`, `rxfig.js` and `rx.js`) is one screen too since v11.99, at the owner's word, on the
  study's chrome with the Tractography page's one view: the cell's drawing (`section.view.plate`, the `#scroller` holding
  `svg#plate`) is the whole stage since v12.1, at the owner's word, nothing framing it (no border, no stage padding; the
  cap's Reset view `#plateReset` floats over the drawing's top right corner as a pill, and the cell's name `#plateName`
  heads the structures window, where the drawer would have covered it), fitted to
  the view as wide or as tall (`fitWidth` in `cells.js` sets `--fit`, the width; `--z` the zoom, by the wheel or a pinch
  about the pointer through `zoomTo`; since v12.1 every gesture is pointer events on the scroller, which is
  `touch-action:none`, one pointer panning it when larger than the view, two pinching it about their midpoint and
  carrying it with them, so a pinch reaches the page whole in the app's web view too; the + and − went); the structures
  are the drawer (`#side`, the `drawer-in`: `#explore` with the picked structure, the index and Colour every structure, or
  `#quiz` the test; its prompt `h2.q-prompt` is sized as a heading by `.card h2.q-prompt`, since viewer.css's `.card h2`
  outranked `.q-prompt` and drew the structure's name as a tiny kicker until v12.2), since v12.1 a window over the drawing at every width (`.drawer` absolute at the deck's left, z 15,
  so the drawing keeps its size; it stood beside the drawing on a wide screen until then), open on
  the first visit at every width and remembered as `vn-cells-drawer` after; and the bar carries Cells (`#popCells`, the
  tiles, a pick closing the sheet), Test yourself (`#quizBtn`, a mode lit while on, switched through `MN_CELLS.setMode`,
  the drawer opened for it), Neurotransmitters (`#popNt`) and Receptors (`#popRx`), both full-width sheets holding what the
  two folded sections held (their transmitter filters, `#ntFilter` and `#rxFilter`, built by `nt.js` and `rx.js` as three
  `.rx-line`s since v12.4 at the owner's word: All alone, then the monoamines behind their `.rx-chip-label`, then everything
  else behind its), and About (`#popAbout`: the lede, `#plateNote`, the credits). The screen script exposes
  `MN_SCREEN` (`open`, `hide`, `current`, `drawer`), and `VN_reveal` opens the sheet a hash names a tile in. The page
  opens a door to the shoot script, `MN_TRACTS` (`zoom`,
  `home`, `still`), through which `shoot-home-pictures.js` shoots both twins at zoom 1.2, the revolve stopped and the home
  angle set, in a frame of the picture's proportion, so the whole brain is in the picture (v11.97; the page itself still
  opens at 1.4, the brain filling the view). Since v11.98 the view carries the atlases' Slice tool (`slice-tool.js`, loaded by
  the page, attached in `attachSlice` once the mesh is in): the viewer's clip planes act on volumes alone, so the tool is
  given a stand-in viewer, `cutter`, whose `setClipPlanes` reads each plane as the viewer would (`planeNormal`, the viewer's
  own azimuth-and-elevation maths; the side away from the normal goes by the slider's share), takes the box the three cuts
  leave (`cutBox`) and rebuilds the mesh from the pieces of each streamline inside it (`applyCut`: `mesh.pts`,
  `mesh.offsetPt0`, `fiberLengths` cleared, `updateMesh`), one rebuild a frame, the whole tractogram kept in `whole` to
  restore; Reset view clears the cuts. The Streamlines sheet's Single colour is white on the dark theme and, since v12.1 at
  the owner's word, a dark grey (`[84, 84, 84]`) on the light theme lit by a shader of its own (`inkColour`, re-applied by
  the theme observer; `SATIN`, a fragment shader the renderer takes through `setCustomMeshShader` once per viewer, set on
  the mesh by `shade()` while Single is on in the light theme and Phong otherwise: the renderer draws the streamlines as
  thin tubes lit by its Phong shader, which left a dark grey flat), and `MN_TRACTS.nv()` hands the viewer to a check. The
  page keeps its last state on the device (v12.1): `vn-tracts-last`, the colour, the thickness, the cuts and the view
  (azimuth, elevation, zoom), written by `rememberSoon` a moment after each change (the colour and thickness controls,
  the cube, Reset view, the slice tool's `onChange`, and the hand letting go of the view) once the page is up, and read
  back by `restoreKept` as the tractogram comes in. The chrome now
  lives in six pages (the 3D Region Atlas, the Brodmann Area Atlas, the Hallucinations study, the molecular viewer, the
  Network Atlas and Tractography); a change to it belongs in all of them.
- The Region Atlas is called the 3D Region Atlas wherever its name shows (nav, titles, home page, the app) since
  v11.12; its file stays `regions.html`. Since v11.22, at the owner's request, it is one screen in the manner of an
  anatomy app (`body.atlas-screen`, `main.screen`, the style block "the screen" and the script "the screen" at the end
  of the page): the four views fill the room between the header and a bar along the bottom (`.panelbar`), nothing
  scrolls, the region picker and the highlighted list are a box in the deck's corner (since v11.24, rounded and lifted
  like the molecular viewer's boxes since v11.33, as are the pop-ups and their tabs; `#drawer` is the
  column the views make room for, `#drawerBox` the box, as tall as its content up to the room, scrolling inside in
  `.drawer-in`; hidden on the tab at its edge, `#drawerHide`, shown again on the handle `#drawerTab` at the screen's
  edge; beside the views from 901px and over them below, remembered in `localStorage` as `vn-atlas-drawer`). The box's
  Highlighted rows (`#chips`, `renderChips`) stand under a subheading per layer (`.rchip-head`, v11.65) in the order of
  `MN_NOTES.TIERS` (the cortex, labelled so since v11.65 under the id `cerebrum`, limbic midbrain, reptilian core; each region's `tier` in `region-notes.js`), the Brodmann
  areas in a block of their own beneath, as the What-they-do pop-up stacks them. The
  Add-a-region panel (`#rpickPop`) is placed by the script from its button relative to `#drawerBox` (`--pop-left`,
  `--pop-top`, `--pop-w`), outside the box's scroller, so its list is one scroller and not one inside another, which
  the iPad would not always let scroll; the box's own scroll closes it. Its search field takes the focus on opening
  only with a fine pointer or when typing on the button opened it (`openRegionPicker(seed, typed)`): on a touch
  screen the keyboard rose over the list, so there it waits for a tap (v11.26). Since v12.22 both searches (`#rpickQ`,
  `#baq`) and Microanatomy's receptor search (`#rxSearch`, its Enter in `rx.js`) carry `enterkeyhint="search"`, the
  keyboard's blue Search key, and Enter takes the first match (or runs the search) and blurs the field, putting the
  keyboard away; and the five pages with a `oneView` keep their layout while a text field has the focus and the width is
  unchanged (`typingNow`, `oneSet`, `oneWidth`), so a keyboard shortening the window (the Android app's, or an iPad's)
  never reads as a phone turned sideways; since v12.23 the bar steps aside while a keyboard has shortened the page all
  the same (a field has the focus and the window has lost more than 120px of its height at that width: `navbar.js`'s
  last section marks the root `vn-typing`, and `bar.css` hides `.screen > .panelbar` and gives the stage its room), so
  it never rides up over the keys. The bar's
  buttons raise one pop-up at a time over the views (`.pop`: What they do, Receptor graph and Neurotransmitters, which
  open the receptor window (`#popRx`, `.pop-tabbed`) on one of its tabs: since v11.40 a row of tabs under its head,
  Graph, Receptor (named Region when charting by region), Neurotransmitters, Receptor types and Sources, one pane at a
  time (`showRxTab`), the window one height whichever is open (`#popRx{height}`; the whole stage on a phone). The Receptor types pane's row of cards and the table beneath are
  filtered by the dropdown at the row's head (since v11.50: `#types-family`, `typesFamily`, `applyTypesFilter()`; a card
  outside the pick is `.out`, and the count, arrows and slide see `visibleCards()` only; the table's Adrenergic is the
  catalogue's Noradrenaline, `TABLE_FAMILY`). The
  graph and the heat table are fitted to their tab and scroll inside their own box only when too big for it
  (`chartHeight()` sizes the graph to its room, never under `CHART.minHeight`; `fitHeat()` caps the column names to
  two fifths of the box with `--heat-cap`), and the tabs of text scroll down. On a phone upright (since v11.52) the
  Graph and Neurotransmitters tabs scroll as a whole instead, the graph at least 400px tall and the table's box at least
  320px (`.screen.one:not(.land)` rules), the tabs stand in one sideways-scrolling row (`showRxTab` scrolls the open one
  into view), and the table's lede and example are the short phone versions (`phoneQ`, `ledeShort` in `renderHeat` and
  `heatExample`, set again on a resize across 600px); the graph's key is one sideways-scrolling line there (v11.53). The key and the one-line instruction under the
  graph (`.chart-foot`: `#chart-legend` left, `#chart-hint` right while the line holds both; `chartHint()` sets its
  words by pointer, tap or click, and by axis, a region's name to highlight or a receptor's to read; v11.62) stand
  under it, stacked on a phone. The table's scale toggle `#heat-scale` shows for
  autoradiography only (`.mode-group[hidden]` made real in v11.54). The Density Table is kept in the code
  and shown nowhere; the graph's controls stand in one line where there is room (since v11.49: the dropdown at the
  left, narrowing first, and the two button pairs, source and axis, together in `.rx-switches` at the far right) and
  in rows on a phone (source, by receptor or region, dropdown), with no sentence above; `renderChart()` toggles the
  sideways hint and keeps a room-taking scrollbar out of the graph's height before it measures; the table's lede is one concise paragraph ending in a live example read off the table (`heatExample`); the
  bar's receptor buttons each stand for a family of tabs (`data-tabs`), lit for any of them, and close the window on a second
  press: since v11.84 four of them, Receptor graph for the Graph and Sources tabs, Receptor for the Receptor tab, Neurotransmitters
  for its tab and Receptor types for the cards and the table; up to 1000px wide the readouts make room for them, the count
  hidden, the probe's hint hidden and its name capped, the buttons' padding and the bar's gaps a little tighter, and under
  800px the name shorter still, so the bar fits an iPad upright without scrolling); then Saved
  maps, Export and, at the far right behind a line,
  Reference (`.pbtn-ref`, since v11.31; since v11.83 its window lists every source in full rather than sending the reader to the
  receptor window: the two receptor lines are written into `#ref-sources` by `renderSources()` from the receptor data, the
  same text the receptor window's Sources tab carries, through `sourceLines()`, and ends with a line that opens the receptor
  window on its Sources tab, `[data-open-pop]`/`[data-open-tab]` bound by the pop script, v11.84); the Brodmann map left the page in v11.30, the Brodmann Area Atlas having it). The readouts sit at the bar's start; since v11.51 the Probe readout's names are buttons (`.probe-btn`, built in `onLoc`
  only as the names change): the region's lights the side under the crosshair, or the pair while Mirror is ticked, and puts
  out whatever entry covers the label (`toggleProbe`, `litBy`), the area's lights or puts out the Brodmann area
  (`toggleProbeBA`), and `paintProbe` keeps their pressed state and colour dot in step through `selWatchers`. Every element id the script uses is unchanged, so the pop-ups' contents
  still follow the selection; a chart is told to measure itself when its pop-up opens. The receptor types table
  (`#types-heat`, `.heat`) is `overflow:visible` and scrolls with the pop-up's body, so its sticky column names and
  row labels hold; its header is as tall as the longest name (`th.col button` sized by its text, since v11.29). A view too narrow for its
  bar's tools (a phone) shows the name and the expand button alone. The page's `--screen-top` is the header's
  measured height, and the root is `overflow:hidden` with the body (`html:has(> body.atlas-screen)`), for Safari on a
  phone, which scrolls a body alone. In every 3D view, a drag on the wheel's button pans, as
  shift-drag does (`zoom.js`). Since v11.23 the bar's buttons are an icon over a word at every width (`.pbtn`, inline
  SVG), and on a phone (the script's `one` media query: 760px wide or less, or a coarse pointer under 500px tall) the
  screen is `main.screen.one`: the stage holds the four views two by two (`main.one.all`, the default since v11.28,
  close-set with the expand buttons shown, which there open a view alone) or one view edge to edge (`.view.shown`), the
  pick remembered as `vn-atlas-view`; the bar opens with the All button in a group of its own (`.panelbar-all`), a line,
  the four single-view buttons (`.panelbar-views`, `[data-view]`), another line, then the pop-up buttons, the readouts and the expand buttons are hidden, the bar stays on show while a pop-up is open (since v11.82; from v11.54 to v11.81 `main.screen.popped`, which
  the pop script still sets, hid it upright and the pop-up had its room), the pop-up standing above it in the stage, its
  button lit, closing on that button, its cross or Escape, and swapped by another button, the region area is a drawer the height of the
  screen sliding over the view from the right (the box's elements, laid out so by `.screen.one`), shut at every load
  whatever `vn-atlas-drawer` holds (since v11.25), and the pop-ups span the width. The slice tool's edge sliders
  (`slice-tool.js`, styled in `viewer.css`) are 44px strips with 24px thumbs under a coarse pointer (v11.32); on a
  phone the right-hand one stands 26px in from the edge, clear of the drawer's handle, and the bottom one stops short
  of it (`.screen.one`). Since v12.9, at the owner's word, each slider carries a mark at its centre, a 2px line across
  the track at the middle drawn as `.slice-range`'s own background (`viewer.css`, the Brodmann page's inline copy, and
  `--slice-mark` set to the bar's soft ink in `bar.css`; 18px long, 32px under a coarse pointer), a mark alone with no
  snapping, and every page that slices (the 3D Region Atlas, the Brodmann Area Atlas, the Hallucinations study, the
  Network Atlas, Tractography) carries Reset slice on its bar: `#sliceResetBtn`, a `.pbtn` with `hidden` on it until
  slicing is on (`.panelbar .pbtn[hidden]` in `bar.css`, since `.pbtn`'s display would otherwise win), handed to
  `MN_SLICE.attach` as `reset`, which the tool then shows, hides and binds to putting every cut back and draws no Reset
  cuts of its own (the cap's Reset cuts went with it; the Brodmann page's head keeps its Reset, which puts back the view
  and the cuts together). Held sideways (v11.42: `main.screen.one.land`, the script's `land` query, a coarse pointer in
  landscape) the bar stands along the right edge, its buttons two to a row, each its icon over its name as upright (since
  v11.58; 66px cells in a 141px bar, the groups centred while they fit and the bar scrolling when they do not; the
  longest name carries a soft hyphen), the
  drawer's handle off the bar's edge, the four views one row, the one view's tools and Centre at the left of its bar
  and the name at the right, the masthead hidden; in the app's tabs the shell hides its bar on a phone sideways
  (`WebPage.sideways` in `ShellWeb.swift`, `BackOverPage` the back button it keeps at the top left) and the page's body
  loses its top padding there, the view's bar making 56px of room for that button. The Brodmann Area Atlas is its own page again since v11.12 (retired
  into the Region Atlas in v10.8): `site/brodmann.html`, with its nav entry and its box straight after the 3D Region
  Atlas.
  Since v11.15, at the owner's request, it is one screen and nothing else: the two faces of the map
  (`brodmann-outline.js`) and the reading of the picked area (`brodmann-areas.js`), fitted to the window under the
  header (the script measures `--screen-top`). On every screen the three views show together, the two faces, the
  brain in 3D and the reading of the picked area. The brain (`#baScan`) is a grid item, `grid-area:scan`, shown once the
  script marks the screen's layout (`.one`, `.land`, `.tall` or `.wide`), with one NiiVue render (`ren`, fetched as the
  page opens by `applyScanMode` and `ensureScan`, `show3Dcrosshair:false`, the MNI152 template with
  `assets/brodmann.nii.gz` over it at 0.9), the picked area lit by `paintScan` from `MN_LOOK.labelTable` and the lobe
  colour, zoom and rotation from `zoom.js`, Reset (`resetView`, the angle and scale kept in `home`, clearing the cuts
  too since v11.72) and the atlases' Slice tool (v11.71: `slice-tool.js`, attached as the scan becomes ready with its
  buttons in `#scanTools` in the head, `regions: "Slice area"` cutting the lit area with the brain; its styles carried
  inline as `.ts-btn`'s are; the tool's Reset cuts hidden, and on a phone, `max-width:760px`, the head's note hides
  while slicing is on, `:has(.slice-btn.active)`, the name staying since v11.81, and `.lbl-more` hides so the Area
  button reads its one word, since four buttons overran the head; since v11.76 the group hugs Reset, `.scan-tools{margin-left:auto}`, and Slice area
  stands to the left of Slice, `.slice-regions{order:-1}`, so Slice keeps its place as the Area button comes and goes). No list, graph or export; BA48, on neither face, is reached from the empty reading,
  and the page never links away to the 3D Region Atlas (the owner's wish, v11.59). `#ba=<n>` opens on an area, the
  address follows the pick, and the MCP server's `brodmann_area` answers link there. On an iPad or a computer (v11.66:
  `isWide()`, the `(min-width: 761px)` query and not `.land`) `arrange()` marks the screen `.tall` (taller than wide, an
  iPad upright: the faces beside the reading, the brain the whole width beneath, `grid-template-areas "read maps" "scan
  scan"`) or `.wide` (an iPad sideways, a computer: the faces down the right at the width that fills the height, the
  brain under the reading, `"read maps" "scan maps"`, the reading's row a set share of the height, `clamp(220px, 38%,
  360px)` since v11.70, so the brain's box never changes with the pick and a long reading scrolls inside its box), and
  sets `--cart-w`, the faces' width (at most 55% of the screen; upright, capped so the two take 62% of the height at
  most), and `--faces-h`, their height together; each `.cart` is cut to its drawing (`height:calc(var(--cart-w) * .6667)`,
  the medial face `.6367`, from the outline's 600×400 and 600×382 boxes). On a phone (v11.74, at the owner's request;
  upright `.one`, the script's mark for `max-width:760px` and not `.land`; sideways `.land`, since v11.57 the script's
  `landQ`, a coarse pointer in landscape under 500px tall, with `body.ba-land` and the masthead hidden) the three views
  show too and the reading is a strip along the foot (`.r-head`: kick, name and where) and the bar's What it does, or a
  tap on the strip, raises the text (`#rText`): upright, since v12.3 at the owner's word, the text is a sheet standing on
  the strip's top edge (`.ba-screen.one .reading.open .r-text`, absolute at `bottom:100%` of the strip, as tall as its
  words up to `min(62vh, 520px)`, its words scrolling in `.r-scroll`, which is `display:contents` everywhere else), rising
  from behind the strip over the faces with the `r-rise` keyframes and sinking back with `r-sink`, the strip keeping its
  row (until then `.reading.open` spanned the faces' cell, the box swelling over the diagram); sideways `.reading.open`
  takes the brain's column with the text above the strip (`order:-1`, scrolling inside); put
  away by the button or Escape (`setRead`, `readOpen`, `.read-open` on the screen), with a cross of its own at the top right of the text (`#readX`, v11.82, inside `#rText` since v12.3); on an
  iPad or a computer the button's group is hidden and the whole reading shows. The text, the notes and the brain's panel
  open one at a time (v11.82).
  Upright (since v11.81) the faces stand one over the other at the full width, or at the width whose two faces fill the
  height left over the strip and the bar (`arrange()` sets `--cart-w`; `"maps" "read" "bar"`, each `.cart` at
  `aspect-ratio:3 / 2`, centred), and the brain is a panel over the faces' cell (`.ba-screen.one .scan`, `grid-area:1 /
  1 / 2 / 2`, below the screen and `visibility:hidden` until `.in`) that the bar's 3D tab (`#scanBtn`, `setScan`,
  `scanOpen`; hidden on `.land`, `.tall` and `.wide`) slides up and down, fetched the first time it rises
  (`applyScanMode` leaves `.one` alone), Escape lowering it after About and the text; the Outside, Inside and Both group
  stays on the bar upright since v12.11, at the owner's word (hidden there from v11.81, which left a face remembered from
  an iPad or a phone held sideways, `vn-ba-view`, with no way back to Both; a face alone stands centred in the faces'
  room, `align-content:center`, and may take the whole height in `arrange()`; the bar's six buttons fit a 360px phone
  with `.3rem` side padding). Nothing scrolls on the page since v12.11: `html, body{overflow:hidden}` and the body's old
  `2rem` bottom padding gone, which stood beneath the screen and gave a phone a few lines of scroll. Sideways the faces are stacked down the left at
  `--cart-w` (`arrange()`: the width
  whose two faces fill the height over the strip, at most 42% of the room beside the bar, one face alone up to 55%; since
  v11.80 the boxes fill the column's height, `grid-template-rows:minmax(0,1fr)` per face and `aspect-ratio:auto`, the
  drawing centred in each, so they line up with the brain's box whichever faces show), the
  brain beside them, the strip across both (`"maps scan bar" "read read bar"`; open, the text takes the brain's column
  and the faces span both rows), and the bar along the right edge. Since v11.75 the bar is the atlases' bar of tab
  buttons (`.panelbar`, `.pbtn`, copied from `regions.html`; the row `bar` at the foot of every layout's grid, a column
  at the right edge sideways, one button to a row): Outside, Inside and Both pick what the faces show at every width
  (`faceView`, remembered as `vn-ba-view`; `.maps.only-lateral`, `.only-medial`; one face alone is drawn larger, its
  height from `faceH()` in `arrange()`), What it does (`#readBtn` in `.panelbar-btns`, hidden on `.tall` and `.wide`)
  raises the reading, and About (`#aboutBtn`, `.pbtn-ref` at the far right behind a line) raises `#popAbout`, a `.pop`
  window over the brain's cell (the reading's place on a phone upright) holding What this is and the credits (the brain's
  renderer named and the 3D tab described since v11.83), which
  left the foot of the page (`setAbout`, `aboutOpen`; one of the two windows at a time; Escape closes About first).
  The old bar's 3D button, the Show in 3D button at the reading's foot (`#rTo3d`), the strip's own button (`#rMore`,
  v11.74 only) and the panel that rose over the faces are gone, the brain being always on show. In the app the first
  face's name makes 56px of room for the shell's back button. The
  page carries viewer.css's `.ts-btn` inline and loads `stage-lifecycle.js`, `scan-look.js`, `zoom.js` and
  `slice-tool.js`. The 3D Region Atlas keeps its own Brodmann list, and no map since v11.30; since v11.38
  the areas are picked through the same dropdown panel as the AAL regions (`dropPicker` in `regions.html`, shared by
  `#rpick` and `#bapick`: button `#bapickBtn`, panel `#bapickPop`, list `#balist` a `.rpick-list` grouped by lobe).
  `app/scripts/shoot-home-atlas.js` shoots the atlas's home twins through `MN_SEL.centreMm` and `MN_SEL.onLocation`, the
  door the page keeps open for it (put back in v12.1 after the probe's rewrite had dropped it; `locWatchers` beside
  `selWatchers`, called from `onLoc`).
  Both atlases remember the last selection on the device without a save (v11.93, at the owner's word): the 3D Region
  Atlas writes `vn-atlas-last`, the saved-model capture (`modelApi.capture`, shared with Saved maps) without the camera,
  crosshair and view, whenever the selection, the opacity, the mirror switch or (since v12.1, at the owner's word, the
  cuts included) the slice tool changes (`rememberSoon`, armed only
  once the address has been read at boot; the tool's `onChange` hook, new in v12.1, calls it), and restores it there when
  the address picks nothing; the Brodmann Area Atlas
  writes `vn-ba-last` in `markAddress` and `select`s it at boot when the address names no area, and keeps its cuts as
  `vn-ba-cuts` through the same hook, set again as the scan attaches. Every atlas keeps its last state since v12.1: the
  Network Atlas writes `vn-net-last` with the address in `markAddress` and opens on it when the address names no state,
  and `vn-net-opacity` as the opacity is applied; Tractography `vn-tracts-last`; Microanatomy `vn-cells-last` (the cell,
  the structure picked and Colour every structure, written in `select` and the switch, put back as the cell's drawing
  comes in; a cell in the address wins); the molecular viewer keeps its picker and level as before.
- The Hallucinations study (`site/hallucinations.html`, the visualisation of Boksa 2009 that the owner calls the
  schizophrenia visualisation) is one screen in the 3D Region Atlas's manner since v11.43: `body.atlas-screen`,
  `main#main.screen`, the drawer (`#drawerBox`: Brain state, then Regions with the system filters, the list and the
  opacity) and the stage with the four views; the bar's buttons each raise a pop-up of one category of what stood
  below the scans (`#popPaper` first, since v11.45, introducing the editorial with its citation and links at its foot;
  `#popReading`, which `HX_SCREEN.open` raises as a region is picked from the list; `#popCircuit` with
  the two circuit drawings and their tabs; `#popWho`, `#popImaging`, `#popWindows`, `#popLimits`; `#popExport` with
  `#export3d`; `#popRef` with the paper, `#scan-note` and, since v11.83, the thirteen papers the readings name written out in full with a
  link to each, `.ref-studies`, matched to their PubMed records), with the readouts `#statState` and `#statRegion`. The box's
  state buttons and the circuit's tabs are one `state` (v11.44; `renderAll` paints the circuit too), and the reading
  gives both states, `#m-healthy` and `#m-halluc`, the one showing marked `.on`. The box's note under the state
  buttons is a pair, `#note-healthy` and `#note-halluc` in `.state-notes`, both laid in one grid cell with the other
  marked `.off` (v11.64), so the box keeps one height and the Regions beneath never move; keep the two texts close in
  length. The chrome
  (the screen, drawer, bar, pops, `.one` and `.land` rules, and the screen script with its `vn-hx-drawer` and
  `vn-hx-view` keys) is a copy of the atlas's with the same names: a change to the chrome belongs in both pages.
- The 3D Region Atlas, the Network Atlas and, since v11.17, the Hallucinations study (`site/hallucinations.html`)
  draw their four views alike, from shared files: the scans' look in either theme is `site/assets/scan-look.js`, and
  the bar over each view, the stages' proportion, the light-theme stages and the view opened over the grid are
  `site/assets/atlas-views.css` with `view-expand.js`. A change to the views belongs there, so every page gets it;
  each page keeps its own viewer setup, locks and Centre planes. Wherever the four sit two to a row on a screen at
  least 600 tall (a tablet from 700 wide, a computer from 901) they are fitted to the screen since v11.19: `view-fit.js`
  measures the room above the grid and the bar's height into `--views-room` and `--view-bar` on the wrap, and
  atlas-views.css sizes each stage so both rows fit under the header with the page at rest, capped at five to four
  (`80cqw`; never a capped aspect ratio, which WebKit narrows inside the view) and floored at 180px. Elsewhere (a phone,
  an iPad held upright) the stages are five to four since v11.20, the proportion a sideways iPad gives them; they were
  square from v11.2 to v11.19. Region
  colours reach the viewer through `MN_LOOK.labelTable` (and the same padding in `vision-scan.js`): the table is padded
  to a power of two, since at the atlas's 117 entries a highlighted label made the label just below it draw black.
- A squat phone (v12.23, at the owner's word), the closed iPhone Duo's outer display at 466 by 678 points: every page
  with a bar reads the screen's shape (`squat()`: a coarse pointer and a screen whose short side is under 600 and long
  side under 1.75 times it, which no other iPhone has, the SE's 375 by 667 the nearest at 1.78), so one rule holds in the
  app and in Safari. On the five pages with a `oneView` it marks the phone screen `.short`, one view at a time (the All
  button hidden by `bar.css`, a pick of All shown as the 3D view; `shown` is the person's pick, kept for a larger
  screen, and only a press changes it), and upright `.side` as well: the bar stands down the right edge as on a phone
  held sideways (the Duo stands its own bars on that side), one button to a row in the middle of its height, scrolling
  when it overflows, the drawer coming in beside it (`--box-w` short of the bar's 104px) and the sheets rising from the
  foot at the deck's width; the rules are in `bar.css` after the island. `oneView` runs on every resize too, since the
  Duo's screen changes under a page as it opens and closes while neither media query need change, and acts only when
  the layout does (`laid`). The Brodmann Area Atlas marks `.one.side` in `arrange()` (the bar an 80px column at the
  right, the faces, the strip and the 3D panel beside it), and the molecular viewer marks its body `.side` in
  `layout()` (`isSide()` in `t4_engine2.js`, the rules at the end of `base.css`'s phone section, `--side-w` the bar's
  width, the model centred in the room left of it). Open, the Duo is an iPad (the shell above): upright its inner
  display is 669 wide, an iPad mini's layout (`.one`, the four views two by two), and sideways 887, the iPad's.
- The interface follows Apple's fluid-interface guidance (v10.92): controls answer on the press (`viewer.css`, the
  last section), the account box and both section menus arrive from their button and leave the same way, the bars
  and menus are translucent materials with `prefers-reduced-transparency` and `prefers-contrast` fallbacks, a thrown
  3D view coasts and the next touch takes over (`zoom.js`, momentum), and `prefers-reduced-motion` turns all of it
  into plain fades and dead stops. Keep new controls and panels to those rules.
- Every window the bar raises is a sheet that slides up out of the bar and back into it (v11.89, at the owner's word).
  On the 3D Region Atlas and the Hallucinations study `.pop` rests at `translateY(calc(100% + var(--gap) + 40px))` and
  `.pop.in` at none, half a second up and `.36s` down on the sheet curve `cubic-bezier(.32,.72,0,1)`, `.stage{overflow:hidden}`
  clips it at the bar's edge, and the pop script hides a window 400ms after its `in` goes. The Brodmann page's About
  window, its 3D panel and the reading's text (`r-rise` and `r-sink`; `setRead` keeps `.leaving` on the reading for
  380ms; the cross `#readX` stands in `.reading`, outside the sliding text) slide the same way behind the bar
  (`z-index:30`) and the strip (`z-index:22` upright, `27` sideways, each with a paper `box-shadow` over the grid gap
  above it), `.ba-screen{overflow:hidden}` taking the rest. The molecular viewer's `#panel.pop` slides from `100vh` on
  a wide screen and from behind the bar on a phone, and `t4_engine2.js` lays the model out again 540ms after the window
  rises. `prefers-reduced-motion` makes every one of them a plain fade. Since v12.0, at the owner's word, the bar and every
  slider on the six pages wear the molecular viewer's style through `site/assets/bar.css`, linked last in each page's head
  so it has the last word on the bar and the sliders and on nothing else: the viewer's panel material and hairline, its ink
  and soft ink for the buttons, Flux at the viewer's size for their names, a lit button a block of its ink, and its slider
  (a rounded track, a round thumb in its accent bordered in the panel's solid; the slice tool's edge sliders take the same
  colours and keep their strips). The variables are `--bar-panel`, `--bar-solid`, `--bar-ink`, `--bar-soft`, `--bar-line`,
  `--bar-track` and `--bar-accent`, by theme; the viewer itself keeps its own rules. Since v12.1, at the owner's word, the
  bar is a grey island as the Brodmann page's bar always was: `--bar-fill` and `--bar-fill-solid` (light grey
  `#E5E7EA` on the light theme, dark grey `#2A2E32` on the dark, the lit button's name in the solid), and on the pages whose
  bar is the screen's last row `.screen > .panelbar` stands `--gap` in from the sides and the foot (the home indicator's
  room added below) with a border all round, `position:relative; z-index:30`; the stage reaches down behind it (`.screen >
  .deck > .stage`: a negative bottom margin of `--isle`, the bar's measured height with the gap and the safe area, and the
  same padding plus the gap), so the views end the gap above the bar and the sheets still rise from behind it, standing
  the gap above it on a wide screen (`bottom:calc(var(--gap) + var(--isle))`) and, upright on a phone, at the island's
  width with their foot 12px behind it; held sideways the bar is the last column with the same margins and the sheets as
  before; the newsletter card stands above the island. The viewer's `#bar` is the same island in its own `base.css`
  (`--bar-fill` there too, `--edge` in from the sides and the foot, `#col` and `#hint` above it, the phone's `#panel.pop`
  at its width; `layout()` in `t4_engine2.js` takes the room from the bar's top edge). The Brodmann page's bar keeps its
  grid cell and takes the grey alone. Since v11.98, at the owner's word, a lit bar button
  (`.pbtn.active`, `[aria-pressed="true"]`, the Brodmann page's `[aria-expanded="true"]`: a sheet open or a mode on) is a
  block of ink, `background:var(--ink); color:var(--paper)` with 10px corners, in all six chromes (the viewer's `base.css`
  takes `--panel-solid` for the paper), the rule standing after the hover rule so a hovered lit button keeps its paper.
- Swift: both Xcode projects build with Approachable Concurrency, main-actor isolation by default and complete
  concurrency checking in the Swift 5 language mode; the visionOS data layer is `nonisolated` and its slow work is
  `@concurrent`, never a detached task. Nothing here can compile Swift, so a Swift change is verified by the owner's
  build (Xcode Cloud for iOS on every push to `main`; the Mac for visionOS); say so when handing one over.

## Open on the owner's side (update as they close)
- App Store: version 1.0 was approved and released on 25 September 2026 (https://apps.apple.com/app/id6805618686)
  after an expedited review. The project is at 1.1 for the next submission; its What's New text, the App Privacy
  changes the newsletter and the usage counts need, and the steps are in `app/store/LISTING.md`, the screenshots in
  `app/store/screenshots/` (the browser's, every set retaken on the v12.9 pages by `app/scripts/shoot-store.js`, whose
  Brodmann shot is the Brodmann Area Atlas page since v12.9) and the App Store's own images in `app/store/sell/`: since
  v12.10 `app/scripts/remake-store-images.js` remakes them from the live pages (served on 8412, run from `app/`,
  an hour; name shots `ipad-01`…`iphone-10`, `duo-01`…`open-10` for a few): ten shots since v12.15, each the iPad's at 2752×2064 and the
  iPhone's at two sizes from one render, `iphone-6.3-` at 1206×2622, the medium display App Store Connect has required
  since October 2026 (the 6.9-inch refused there as "File dimensions are invalid"), and `iphone-6.9-` at 1320×2868, now
  optional, to replace 1.0's in that slot, and since v12.23 the iPhone Duo's own two (v12.20 set the iPad renders in
  the inner size): `iphone-duo-` at 1398×2034, the outer display closed (`duo-01`…`duo-10`), and `iphone-duo-land-` at
  2853×2007, the inner display open and sideways (`open-01`…`open-10`; `store-sell.js`'s `SHARE`, the capture at 84% of
  the width), each rendered at the Duo's web view (402×678 closed and 887×669 open, at 3×, the screen's size given so
  the page knows the squat phone) beside a column down the right edge drawn from the iPhone captures' own pieces
  (`column()`: the camera when closed, the time, Wi-Fi and battery, Back in its glass circle, and the tab bar stood on
  end with the page's tab lit), since no Duo capture exists; `store-sell.js` covers no status bar on them (`BAR`);
  the second shot's statement is Brain region functions explained (`openPop` waits
  for a raised sheet to come to rest, which at 3× with software 3D takes longer than the slide); since v12.21 the
  iPhone's first two are the owner's own captures from the TestFlight build of 25 October 2026, taken whole
  (`capture`, kept in `app/store/chrome/` as `iphone-capture-atlas` and `iphone-capture-what-they-do`, with the
  notice line painted out in the page's black by `cover`); the tenth, AI Connector, is `mcp.html` under About strips made from the
  others (`ipad-top-dark-about`, `iphone-top-dark-mcp-server` titled in Inter SemiBold, `iphone-bottom-dark-about` with
  Practice's pill moved under About), and the v12.14 notice line is hidden in every render. Each page rendered as the
  app shows it (the shell's marks and
  a Capacitor stub set at document start) at the web view of the owner's captures of 23 October 2026, an 11-inch iPad
  sideways (1210×748 CSS px at 2×, the page 172 px down the 2420×1668 capture) and an iPhone 16 Pro (402×675 at 3×, rows
  348 to 2373 of 1206×2622), in the capture's state (the regions in the order the owner added them, `P:Amygdala|P:Thalamus|
  P:Frontal_Mid` on the iPad and `P:Thalamus|P:Amygdala|P:Frontal_Mid` on the iPhone, so the gyrus is pink on both; the
  probe on the caudate by a tap found on the crosshair; the receptor window on D2; the practice page dealt again until
  the capture's question comes up), joined in a Playwright page to the app's chrome strips cut from those captures and
  kept in `app/store/chrome/` (the iPad's top bar by tab and theme, the iPhone's top bar by page title and its tab bar
  by tab; the light Atlases tab whole, the app's own screen, whose atlas picture is the home twin set in afresh), and set
  under the owner's statements by `store-sell.js`. Run it again whenever the pages change; a device capture is still the
  truest image and `store-sell.js` takes one as before. The listing's new name is *Visual Neuroscience: 3D Human Brain Atlas* (the owner, 23 October
  2026), which the store's 30-character cap splits into the name `Visual Neuroscience` and the subtitle `3D Human Brain
  Atlas`; it goes in with 1.1. `GoogleService-Info.plist` was downloaded again on 21 October 2026 and was identical to the
  repo's copy (`IS_ANALYTICS_ENABLED` false); the key does not gate collection in current SDKs, so the apps count
  unless `Info.plist` says otherwise. Confirm the iOS stream in the Firebase console's Realtime view with a TestFlight
  build before submitting; if no iOS data stream is listed, link Analytics under Integrations and download again.
- Google Play: the Android build, listing text, graphics and declarations are ready in `app/store/PLAY-STORE.md`
  (screenshots in `app/store/screenshots/`, `android-*`); still to do on the owner's Mac: the developer account, the
  upload key (`app/android/keystore.properties.example`), the Firebase fingerprints, the closed test a personal
  account must run, then the bundle.
- Firestore rules: published from the owner's Mac on 15 October 2026 (`npx firebase-tools deploy --only
  firestore:rules` from the repository root; `firebase.json` and `.firebaserc` are there, and the owner is logged in to
  firebase-tools as fkarim@basilicalabs.ai). Accounts and usernames work; the owner holds `fid_kk`. Any change to
  `firestore.rules` needs that command run again.
- Sign-in providers: Google and Apple are on, on the web and in the apps (the iOS Google config and URL scheme are
  in the repo as of v10.85; Apple's Services ID, key and Team ID went into the Firebase console for v10.86). LinkedIn
  stays off until `docs/AUTH-SETUP.md` §7 is done.
- MCP worker: deployed from the owner's Mac on 16 October 2026 with the v10.93 deep links (`regions.html#network=…`;
  since v11.5 `worker.js` writes `network-atlas.html#state=…`, and since v11.12 `brodmann.html#ba=…` for a Brodmann area
  with its links reading "3D Region Atlas", all live with the next deploy; the old links forward),
  the sign-in and the account tools. The organisation's connector uses "Sign in when needed" with Claude's client
  metadata document, and all nine tools were run through it on 17 October 2026. Submitted to the Connectors Directory
  the same day (slug `visualneuroscience`, OAuth by client metadata document, required when the server asks; reviewer
  credentials are in the portal only); awaiting review at claude.ai/directory/manage. The portal's summary calls the
  server "authless" because its check only lists tools; if the listing comes out without sign-in, write to
  mcp-review@anthropic.com. Keep tool names and the address unchanged until it is approved; tool changes later need
  only a deploy, plus a reviewed listing edit when the tool names shown on the listing change.
- Newsletter: on Mailchimp since 24 September 2026; the worker's three Mailchimp secrets are set and it reaches the
  audience. Still to do in Mailchimp: make fkarim@visualneuroscience.ai the audience's default From address and
  authenticate the domain (`docs/NEWSLETTER.md`). The email route stays off.
- Two Firebase API keys are flagged by secret scanning: restrict them (bundle ID / Identity Toolkit API) and
  close the alerts as "won't fix"; do not rotate or rewrite history.
