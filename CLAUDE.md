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
- The project carries one skill of its own (v12.32, at the owner's word, who could not add it to the account from a
  phone): `.claude/skills/app-store-connect-submission/`, the text App Store Connect asks for in a first submission, an
  update or a new platform, checked by its scripts and saved as a sheet in `app/store/submissions/`. Every session on the
  repository loads it; the same skill as a `.skill` file is the owner's to upload to the account from a computer.
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
  `git push https://x-access-token:$VN_TAG_TOKEN@github.com/<owner>/VisualNeuroscience.git <tag>`, `<owner>` being
  the one `origin` names (below) — the variable name only, never the value, in any command or reply.
- The repository lives at `https://github.com/VisualNeuroscienceAtlas/VisualNeuroscience` since 30 October 2026,
  when the owner renamed the GitHub organisation (BasilicaLabsAI until then, BasilicaLabs-AI before that); GitHub
  redirects the old addresses for reading and pushing alike. From a session, push through `origin` as the clone set
  it, and leave it so: the session's git proxy lets a session push only to the repository name it was started with
  and answers any other with a 403, a token in the address included (checked on 30 October 2026 by dry runs in a
  session started on BasilicaLabsAI, which pushed v12.71 and v12.72 through the old name and was refused the new
  one). The GitHub tools take the session's name as well and follow the redirect, answering with the new address.
  GitHub lets anyone claim an organisation's old name, which would end the redirect, so new sessions are started on
  the new name.

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
  `ShellWeb.swift`, at document start) writes `window.VN_LAUNCH` since v12.35, a name new with each launch of the app
  that pages keep how they were left under (the Hallucinations study, below), and pins every page's viewport to `maximum-scale=1, user-scalable=no` (v11.92: a
  double tap on a region row once magnified the whole atlas page), and `viewer.css` sets `touch-action:manipulation` on
  `html` (the molecular viewer's `base.css` too), which takes WebKit's double-tap zoom off every page on the website as
  well, where a pinch still enlarges the page for whoever needs it. When a home-page box's text or picture changes,
  change its twin in `Shell.swift` too, its words written `L("…")` with their Chinese in the catalog (Languages,
  below). Since v12.51, at the owner's word, the six atlas boxes stand in one order on
  the home page, the app's Atlases tab and the Android menu (`SECTIONS` in `navbar.js`): the 3D Region Atlas,
  Tractography, Molecular, Microanatomy, the Brodmann Area Atlas and, last, the Network Atlas; on the home page's
  twelve columns the tractography and molecular boxes stand beside the lead (`span 5`, Molecular drawn as a narrow box
  with its plate beneath its words) and the cell, the Brodmann and the network boxes beneath (`span 12`, Network Atlas
  a `box-h` with its plate beside its words), the six-column and one-column layouts following. Every box's picture has a twin for the light theme since v11.67
  (`assets/home/*-light.jpg`, `assets/studies/hallucinations-light.png`), shot from the live pages by
  `app/scripts/shoot-home-pictures.js` (the atlas's by `shoot-home-atlas.js`); the website swaps them by theme
  (`.shot.themed` and `.plate.themed` in `index.html`, the plate following the paper) and the app through
  `Shot(dark, light:)`. Retake a twin whenever its page's look changes. The About tab leads with the MCP server since
  v11.36, then (v11.68) a Coming soon box with nothing to press, three `SoonRow`s naming what is being built (the Circuit
  Atlas, Regions in depth, the MCP server extended), then the developer's message and the Channels; its twin on the
  website is the home page's About hub (`index.html#about`: `.m-mcp`, `.m-soon`, `.m-about`, `.m-channels`). The
  Channels stand in four lists, the hub's `.m-channels`, the About tab's box in `Shell.swift`, `about.html`'s
  `.elsewhere` (which adds GitHub) and the Android bar's `LINKS` in `navbar.js` (its phone menu puts the handle under
  the name where a network has two accounts), and a change to one belongs in all four: YouTube, then since v12.26, at
  the owner's word, Instagram twice, the project's @VisualNeuroscience first and the developer's fid_900 after it,
  then LinkedIn and email. `about.html` is the developer's message alone since v11.68 (its MCP box left with the hub), titled A Message from the
  Developer since v12.25, at the owner's word (Message from the Developer from v12.17; its title strip, its `<title>` and
  `og:title`, the home page's About-hub box and its twin in `Shell.swift`, and the shell's bar, `Page.about` and the
  `titles` map), and since v12.16 that message is the owner's letter, word for word as they gave it on 24 October 2026:
  under the portrait, from Thank you for downloading Visual Neuroscience (the lede) to Write to
  fkarim@visualneuroscience.ai and I read it myself, then the signature, the links and the stamp, with no headings (v12.15
  had cut the six sections that stood there); since v12.25, at the owner's word, its models are from Anthropic and
  Moonshot, where it said Kimi (the MCP pages named Kimi, the assistant, until v12.69, below); and since v12.43, at the owner's word,
  the second paragraph no longer opens with I am a solo developer, and the built-with sentence reads with knowledge
  from my post-grad in Applied Neuroscience from King's College London Online and my experience in software
  development, where it read with the help of AI and my knowledge from my PG Cert, and the invitation to write in
  asks for features added or improved and ends but if any of them are wrong, let me know and I will correct it, the
  line Corrections are the most welcome mail of all gone. Keep the owner's words as given. The listing's support URL is that page, so the contact address must stay on it. The Vision Pro console's
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
  asked. Only builds that carry it can ask: 1.0 never will, and 2.0 is the first to ask, once 2.1 is out. The privacy
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
  file again, which `trace.py` writes beside it; `favicon-32.png` is the same drawn at 32px on nothing; the Play feature
  graphic (`app/store/play/feature-graphic.html`, shot to `feature-graphic.jpg` with Playwright at 1024×500; the
  `shoot-play.js` it once named is not in the repository) carries it where the ring stood, its strapline alone at the
  foot's middle, as the sharing card did until v12.64 (since then, at the owner's word, the sharing card, `share.html`
  shot to `assets/social-card.jpg`, the `og:image` every page names with the `og:image:alt` to match, is the App Store
  images' manner at 1200×630, on the molecular viewer's dark backdrop since v12.68, at the owner's word, the dark
  twin of their light one by `store-sell.js`'s own sums (`--c-extra` over `--c-cyto` of the viewer's dark theme, split
  half way down, with the glow of three hundredths the viewer's shader adds), where their light backdrop stood until
  v12.66 and the app's black for v12.67: the title Visual Neuroscience and,
  beneath it, the first store image's heading line, Human Brain Anatomy: Interactive 3D Brain Atlas, in Flux in
  white, under that, quieter, iOS and web (v12.65, at the owner's word), and at the right the tractogram of the iOS store image, Wiring System Tractogram, standing on the backdrop itself
  with its ground clear since v12.66, at the owner's word (framed on the app's black until then), the brain mark
  (`logo.svg`) at the foot's right since the same release; `app/scripts/shoot-social-card.js` renders that tractogram
  in the store shot's state without the page's bars, the stage and the viewer's back made clear and the shot taken
  with no background, to `assets/social/tractogram.webp` with its transparency, and shoots the card at twice its size, brought down to 1200×630, `card` alone
  shooting the card from the tractogram already there; the slices `make_social.py` cut stay for the feature graphic);
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
- **Name no AI assistant** anywhere the app, the site's pages or the store listing shows, pictures included: the MCP
  server is used with "your AI of choice" (v12.69, at the owner's word). App Review rejected 2.0 (294) on 30 October
  2026 under Guideline 5 for the China mainland storefront, whose rules refuse generative AI services without a
  permit there, because What's New, the description and the AI Connector screenshot named ChatGPT beside Claude and
  Kimi; v12.69 took every assistant's name out of `mcp.html` (its Connecting it list now says how to add the server
  in any assistant's settings, for an organisation and in a coding assistant), the home page's About hub and its
  dateline link, `vision-about.html`, `privacy.html`, the About tab's twins in `Shell.swift`, `app/store/LISTING.md`
  and the AI Connector images, and the submission skill's `check_sheet.py` now fails on ChatGPT, OpenAI and GPT and
  warns on other assistants' names. The repository's own notes keep the per-assistant setup (`docs/MCP.md`,
  `README.md`, comments in `mcp-worker/`), and two mentions stand for the owner to decide: the letter's models
  from Anthropic and Moonshot (`about.html`, the owner's words) and the Vision Pro card's How it was built
  (`vision-about.html`). The one OpenStax sentence that named ChatGPT as an example of AI lost the name in v12.74,
  at the owner's word (`TEXT_EDITS` in `scripts/textbook/build.py`, which a rebuild applies again and warns on
  when the source no longer holds the words, and the attribution's Changes, which lists the edit as the licence
  asks); builds made before v12.74 still carry it, and 2.0 went back to review on v12.74's build, which does not.
- **Languages** (since v12.70, at the owner's word: Simplified Chinese first, picked by the phone's iOS language, and
  ranking in search in other languages). The English pages stay the source, edited as before; every page in `TWINS`
  in `scripts/i18n/build.py` is written again beside itself as `<name>.zh-hans.html` (served at `/name.zh-hans`), its
  words taken from `i18n/zh-hans.json`, the catalog of English to Chinese. A unit is the inner HTML of an element
  that holds text of its own (inline markup kept, whitespace folded, so a sentence is translated whole), plus the
  readable attributes (alt, title, aria-label, placeholder) and the description and sharing metas; a unit the
  catalog lacks stays English and is reported, and a name's Chinese is its English. **Run `python3
  scripts/i18n/build.py` after editing any page or the iOS shell's words** (it rewrites the twins,
  `assets/i18n/zh-hans.js`, `sitemap.xml` and the app's `ShellWords.swift`); `--check` fails on a stale file or on
  English left untranslated in a twin page or the shell, and `--missing` prints that English as JSON to translate
  into the catalog. Every public page carries the build's block first in its head
  (`<!-- i18n: … -->`: `meta[name=vn-langs]`, `assets/i18n.js`, and on pages with a twin the hreflang links, en,
  zh-Hans and x-default, to the bare addresses the live site serves); a twin adds the strings file and
  `assets/i18n-zh-hans.css` (the system's Chinese faces after the site's Latin ones, no italic, the smallest lines
  larger). `assets/i18n.js` works out the language (the shell's `window.VN_LANG` alone in the app; on the web the
  header's choice, kept as `vn-lang`, else the browser's languages: zh-CN, zh-SG, zh-MY, zh-Hans or zh are Chinese,
  Traditional falls through to the next language until it has pages) and moves an English page to its twin before
  anything is drawn, never twice within five seconds (`vn-lang-hop`) and never inside the iOS app's tabs
  (`data-shell`), whose shell pushes any move to another file as a new page, so there the shell opens the twin
  itself; on a twin it puts into Chinese, as it lands, any English the page's scripts write that the catalog holds
  (a MutationObserver on text, title, aria-label, placeholder and alt), and `VN_I18N` offers `t`, `href` (a page's
  twin where one exists), `go` and `lang`. `navbar.js` reads the page's English file name off any address (the
  twin's suffix and the live site's bare address both come off), lights the island and links it in the page's
  language, and puts the other language's button (中文 or EN) before the theme. Each new twin goes into `sw.js`'s
  precache. The owner checks the Chinese; anatomical terms follow the national standard (全国科学技术名词审定委员会),
  and the developer's letter is the owner's words in Chinese. `site/robots.txt` names the sitemap, which lists
  every public page and its twin (`get`, `share`, the Vision Pro pages, the redirect stub and the poster, account
  and connect pages left out). The mainland storefront asks for an ICP filing, which needs a company in China, and
  Google's services the account and the counts use do not reach the mainland; Simplified Chinese serves Chinese
  readers everywhere else, and ranking on Baidu is weaker without mainland hosting. Since v12.71 the iOS app speaks
  it too: `Info.plist` names its languages (`CFBundleLocalizations`, en and zh-Hans; `zh-Hans` is among the project's
  `knownRegions`), so iOS gives the app Chinese from the phone's own list of languages, or the one picked on the
  app's page in Settings, which offers the choice once an app names two, and the system's own controls follow it.
  `Lang` in `ShellKit.swift` reads it (`Bundle.main.preferredLocalizations`), the start script hands it to every page
  as `window.VN_LANG`, and a page's bridge opens the page's Chinese twin where the bundle holds one (`startFile` in
  `PageBridgeController.instanceDescriptor`, `ShellLinks` told that file, `Page(link:)` folding a twin's link back
  to the English file's page and title). Every word the shell shows is written `L("…")` where it stands (`L` in
  `ShellKit.swift`, `{1}` and `{2}` in the words taking the values given after them, as the update popup's version
  and the account's address do), and the build gathers each one with its Chinese from the same catalog into
  `app/ios/App/App/ShellWords.swift`, generated, in the project beside the shell's other files: a new word in the
  shell is `L("…")`, its Chinese in the catalog and the script run. The Account tab's Language box, under
  Appearance, says what the app speaks and opens its page in Settings (`UIApplication.openSettingsURLString`).
  Words of the shell's own were added to the catalog with it, and Email reads 邮箱 on the site as in the app.
  The owner's TestFlight build from v12.74 ran it on 30 October 2026, in Chinese as well, and found it fine. 2.0's
  listing carries a Simplified Chinese localisation beside the English (`app/store/submissions/ios-2.0-zh-hans.md`,
  checked by the submission skill's script): the name kept as Visual Neuroscience, since 视觉神经科学 reads as the
  neuroscience of vision, the subtitle 三维人脑图谱, a paragraph saying which parts of the app are in Chinese and
  that the atlases, the textbook and the practice questions are in English, and keywords held to 100 bytes.
- Usage counts (since v11.21): Google Analytics for Firebase on the website (the vendored bundle's analytics module,
  `measurementId` in `site/assets/firebase-config.js`) and in the apps (`@capacitor-firebase/analytics`, iOS trait
  `AnalyticsWithoutAdIdSupport`, Android manifest with advertising-ID collection off). `site/assets/auth.js` initialises
  it, names each page as a screen inside the apps, and counts every sign-in as `login` or `sign_up` with its `method`;
  `VN_AUTH.track(name, params)` is the door for any other count. The `analytics` flag in the config is `true`, `"app"`
  (website silent, no cookie) or `false`. The privacy page names it under *Usage counts*; both store listings declare
  it. The counts are read in the Firebase console under Analytics. Since v12.30, at the owner's word, only the website
  on its own address and the app as the App Store installed it count (`gaLive` in `auth.js`): on the web the hostname
  (`visualneuroscience.ai` and its subdomains; Cloudflare's preview builds and local copies stay silent), in the apps
  `window.VN_STORE`, which the iOS shell writes at document start from the receipt's name (`fromStore` in
  `PageBridgeController`, false for a TestFlight or Xcode build, whose receipt is a sandbox one; App Review's device is
  one too), and the iOS app starts with collection off (`FIREBASE_ANALYTICS_COLLECTION_ENABLED` false in `Info.plist`)
  until a page of an App Store build switches it on, the SDK keeping the switch on the device. Android says nothing and
  counts as before: a Play test track cannot be told from production at run time. Version 1.0 carries no counting at
  all, so 2.0 is the first App Store build that counts, and every approved version after it does; the reports split
  by `app_version`. The vendored bundle is rebuilt with
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
  the App Store notes name it (`app/store/LISTING.md`, `PLAY-STORE.md`). Since v12.9, at the owner's word, the
  password can be changed from the account page, and since v12.55, at the owner's word, in a popup of its own: the
  Change password button beside Change username or university (`#acctPwBtn`, shown for an account whose sign-in is a
  password) raises it, built by `auth-ui.js` as the login and account boxes are (`openPasswordModal`,
  `VN_ACCOUNT_UI.openPassword(user)`; the form's `data-key` is `pw`, which `closeModal` keeps no draft of), with the
  current password, the new one twice, Change password and Email me a reset instead, and for an account without a
  password the line that there is none to change; `changePassword(current, next, confirm)` in `auth.js` signs the
  person in again with the current password (`reauthenticateWithCredential` with an `EmailAuthProvider` credential, a
  wrong one answered as `vn/current-wrong`) and calls `updatePassword`, both names added to the bundle's entry and the
  bundle rebuilt; `hasPassword(u)` says whether there is one, and the popup's second button sends the reset email
  (`sendReset`). The page raises the popup once when opened on `#password`, which the app's row does, or the login box
  when nobody is logged in there. Account deletion (`deleteAccount` in
  `site/assets/auth.js`) revokes Sign in with Apple as the account goes: in the apps the native layer signs in with
  Apple again, revokes with the authorization code (`revokeAccessToken`) and deletes the user, on the web the popup's
  access token goes to the SDK's `revokeAccessToken`; a Google account Firebase asks to sign in again does so on the
  spot. The bundle exports those names (`scripts/firebase/entry.js`; rebuilt here from a scratch `npm install
  firebase@<NOTICE version>` with `NODE_PATH` pointing at it, since `app/node_modules` is absent). The
  feature-announcements box offered as an account is made starts clear (PECR), in the account box and on the Create
  account form (`newsCheck` in `auth-ui.js`). Until v12.46 the iOS app's only door to signing in was the Account tab's
  Account box, Open your account, which pushed `account.html`, whose Logged out section's Log in raises the sheet
  (`VN_ACCOUNT_UI.openLogin`), since the pages inside the tabs draw no header and so no Log in button; on 27 October
  2026 the owner's TestFlight build sat on that page's Checking whether you are logged in line for good, so since
  v12.45 the module cannot hang its importers: `build()` in `auth.js` waits for the SDK's import at most 20 seconds
  (`within`), no longer waits on the native analytics plugin's `setEnabled` (a native call that never answered would
  have held every sign-in behind it), and a failure to start is caught into the dormant stub with a `reason`
  (`dormant(err)`), which the account page shows in place of its switched-off line (`#acctWhy`); the page also keeps a
  watchdog in its classic script, `#acctStuck` after twelve seconds with the first error it caught (`error` and
  `unhandledrejection`), and `draw` and the off branch put it away. The cause was read on 27 October 2026 from that
  watchdog's line on the owner's iPad, Cannot access 'auth' before initialization: `auth.js` ended on `await build()`,
  and the module loader in WebKit before Safari 27 (iOS 26's web view; WebKit's post Fixing Top-Level Await in Safari)
  runs a second module script, the account page's own, before an imported module's top-level await is over, so the
  page's first read of the import threw, its script died and nothing registered `onUser`; Chromium never shows it.
  Since v12.53 the module has no top-level await: its default export is a face built at once (`face()` at the foot of
  `auth.js`: `enabled` while the config exists, the synchronous reads empty until the build settles, each call waiting
  on it, `onUser` kept and bound once the module is up, `up` the promise that settles when it is, before any state is
  heard, and the dormant stub with its `reason` standing in should the build fail), the platform bits (`cap`,
  `isNative`, `plugin`, `browser`, `appPlug`, `providers`) stand above `build()`, `account.html` reaches its off
  branch through `draw` as well (`off()`), `auth-ui.js` takes its slot out on a late failure and completes an email
  link on `up`, and `connect.html` says so in its state hook. **No module another module imports may await at its top
  level**, and a page may carry two module scripts only on that condition; the check is `npx -y esbuild@0.25.10 <file>
  --bundle --format=iife`, which refuses a top-level await. Since v12.54, at the owner's word, opening a page pulls
  nothing of the account: what it holds is loaded into the device's own storage at login and read from there. The copy
  is `vn-account` in localStorage (`auth.js`: `readKept`, `writeKept`, `clearKept`, `changeKept`; on the face
  `kept()`, `keep(fn)`, `keptFiles(tool)`, `keepFiles(tool, rows)`, `iso`, `plain` and `changed()`): who (uid, email,
  name, the sign-ins, when the account was made and last logged in), the profile document, every tool's files with
  their data, `warmed`, when it was last read whole, and `from`, the page or the native layer. `took(u)` writes who at
  once and `warm` reads the rest, the profile, the toolindex and each tool's files, unless the copy is under five
  minutes old or, in the app, was ever read whole; `loadProfile`, `saveProfile` and `adoptName` keep the profile in
  step and `userdata.js` the files (`list` writes every row with its data, `save`, `load`, `rename` and `remove` the
  one file; `kept(tool)`, `keptData(tool, name)` and `keptAt()` read the copy); `doSignOut` and the deletion sweep
  clear it, `took(null)` clears it unless the app holds that account (`forget`), and every change is announced on
  window as `vn-account`. The iOS shell hands in what the native layer read at its own login: `AccountAuth.warm()`
  fetches the profile, the toolindex and each tool's files over Firestore's REST API with the native ID token
  (`readAccount`, `restGet`), at login, at launch, on each return to the front at most once a minute (`ShellRoot`'s
  `didBecomeActive`) and when a page says `{auth:"changed"}` after a write, keeps the JSON in UserDefaults
  (`vn-account-kept` and `-for`), and `pageState()` adds it as `account` beside a `user` that carries `name`,
  `created` and `lastSignIn` as well; `takeHandover` in `auth.js` decodes the REST shapes (`fromRest`, `restDoc`,
  `restFiles`) into the copy at document start unless the page's own copy is newer. `account.html` draws from the copy
  at once (`draw(undefined)` before the first state; `detailsFrom`, `modelsFrom`, `practiceFrom`; the copy of
  everything from it), draws again on `vn-account`, and where the app holds the account but the page could not take
  its session shows the copy all the same, `#acctHeld` saying what needs a log-in here (the password and the
  deletion); `models.js` lists the account's maps from the copy (`keptItems`, `onKept`, `keptOr`; `held` where the app
  alone holds the account), reading the server only without a copy or past five minutes; `practice.html` adopts the
  kept progress and reads the server only without one. The Swift is verified by the owner's build. Since v12.46, at the owner's word, the Account tab logs in
  natively (`app/ios/App/App/AccountAuth.swift`; `AccountBox` with `AccountField`, `InkButton`, `QuietLink`, `ActRow`
  and `AccountNote` in `Shell.swift`; `account` an `@StateObject` of `ShellRoot` in the environment): Firebase's own
  iOS SDK (`FirebaseAuth` and `GoogleSignIn`, reached through the Capacitor Firebase package the app already links;
  should Xcode say No such module, add the two products to the App target's Frameworks, Libraries and Embedded Content
  from the resolved packages), Sign in with Apple (`SignInWithAppleButton`, a nonce hashed for Apple and kept raw for
  Firebase, `beginApple` and `finishApple`), Continue with Google (`GIDSignIn`, the client ID from
  `GoogleService-Info.plist`, its way home handled in `SceneDelegate`), an email and password with Create an account
  and Forgot the password, Log out, the errors in the site's words (`words(for:)`), and once logged in who it is and
  the account's page as a row; `AccountAuth.configure()` in `AppDelegate` has Firebase up before the shell or a
  page's plugin asks. Every page's bridge is told who is logged in at document start (`window.VN_NATIVE_AUTH` in
  `startScript`, `AccountAuth.pageState()`: the person, a custom token the auth worker minted from the native
  session's ID token (`mintPageToken`, `exchange`) where the worker is deployed and named in `Info.plist` as
  `VNAuthWorker`, empty until the owner deploys it, and the credential the sign-in made where it can be used again,
  Google's tokens or the email and password, `handoff`, never Apple's token, which is spent once), and `auth.js`
  follows it before anyone hears the first state (`followNative` from the first `onAuthStateChanged`, the states it
  raises reported once through `took`, `user` undefined meanwhile so no page shows logged out while it is being
  signed in; since v12.55 `user` is undefined until the first state on the website as well, so no page takes an unknown state for logged out, where a listener was called at once with null): `signInWithCustomToken`, or the credential, after which the page tells the shell `{auth:"took"}` and
  the credential is spent (`tellShell`, the `vnShell` handler's `auth` messages, `heard(auth:)` in `ShellWeb.swift`,
  `handoffTaken`); a native sign-in that nothing can pass on, an Apple one without the worker, leaves the page logged
  out with a line naming the person and the reason (`#acctNative` in `account.html`, `nativeUser` and `nativeWhy` on
  `VN_AUTH`, null on the website and in the dormant stub). A page that signs in by itself tells the shell
  (`heardSignIn` at the end of `settled` and of `signUpWithEmail`: the provider, the email, the password an email
  sign-in used, held in `lastPassword` for the shell alone, and the ID token), and the native layer follows
  (`pageSignedIn`: the password straight away, otherwise through the worker's exchange of the ID token), and a page
  that signs out signs it out (`pageSignedOut` from `doSignOut`). The worker's new route is `/auth/exchange`
  (`exchange` in `auth-worker/worker.js`: POST `{idToken}`, the Firebase ID token verified against Google's published
  keys by `verifyIdToken`, a custom token for the same uid out through `customToken`; `docs/AUTH-SETUP.md` §7c), tested
  offline with keys of its own in the session; it answers nothing until the owner deploys the worker. The website,
  the Android app and the pages' own sheets are unchanged, and the Swift is unverified until the owner's build.
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
  in the box's foot (`.drawer-foot`, outside the scroller, no heading) as Region transparency: every opacity slider on the Network Atlas and the Hallucinations study read as transparency since v12.7 (the 3D Region Atlas's went in v12.47, at the owner's word, its regions drawn solid, `opacityOf()` a hundred, and the study's in v12.56, at the owner's word, its regions drawn solid too, `applyOpacity` setting one and the kept `trans` ignored) (`.trans-row`,
  the name and value on one line and the slider beneath; nought the regions solid, the range 0 to 90 where the opacity
  ran 10 to 100), while the viewer, the saved models and the device's memory keep an opacity, a hundred apart
  (`opacityOf()`).
- The Tractography page (`site/tracts.html`) is one screen too since v11.94, with the study's chrome less its drawer and
  view switch: since v12.1, at the owner's word, the tractogram is the whole stage with nothing framing it and no cap (the
  view's border and the stage's padding are nought; the cap with its name, Reset view and the Slice tool's buttons went; the
  zoom buttons had gone in v11.97, the wheel and a pinch zooming as before), and the bar, since v12.42 at the owner's
  word, carries the buttons that slide and one that stays, the sliding ones in five groups behind lines since v12.59 (four from v12.43),
  at the owner's word (`.pgroup`: Slice | Brain, Transparency | Tract, Slice tract, Offset, Distance, Thicken | View,
  Revolve | Export, each group after the first behind a `border-left` in the row and a `border-top` in the column): Slice (`#sliceBtn`, v12.1: the slice tool's switch, lit while
  the edge sliders are out, disabled until `attachSlice` has the mesh; the tool draws no buttons of its own, attached
  without `tools` since v12.33; first on the bar since v12.32, at the owner's word, as Slice leads wherever it stands:
  see the slice tool under the 3D Region Atlas), Brain (`#brainBtn`, `aria-pressed`, lit while the brain shows,
  `showBrain(!brain.on)`, where the `#popBrain` sheet's Off and On had stood since v12.31), Transparency (`#transBtn`,
  `aria-expanded`: a mini, `#transPop`, the brain's transparency as a tall bar, `#brainTrans` stood on end in `.tall`,
  0 solid to 95 with its value `#brainVal` above it, as the sheet's slider read until v12.42, whose Thicken had read
  it as solidity, 5 to 100, for that one release; `applyBrainTrans`), Tract (`#tractBtn`, v12.42: the streamlines
  shown or hidden, `showTract`, the mesh's `visible` and the ends' with it), Slice tract (`#sliceTractBtn`, v12.44, at
  the owner's word: a switch, `sliceTract`, cutting the streamlines with the brain, on again each time Slice is
  turned on; off, `applyCut` leaves them whole and the brain alone is cut, and since v12.48, at the owner's word,
  the pieces that stand in the cut-away space go into `brain.ends` as well (`freePieces`, the whole tractogram
  outside `cutBox(planes, -1)`), since the brain's canvas lies over the streamlines' and its cut face covered the
  whole streamlines in front of it), Offset (`#offsetBtn`, v12.44: a switch,
  `offsetOn`, standing their cut ends out of the brain's cut face by Distance's millimetres; off, or the brain off,
  the cut is the brain's own, `effectivePast()` nought), Distance (`#distBtn`, v12.43's Offset renamed in v12.44: a
  mini, `#offsetPop`, how far, `#offset` 0 to 50 mm in halves since v12.49, at the owner's word (0 to 10 until then), 2.5 to begin, `applyOffset` setting `tractPast` and
  `recut` cutting again on the next frame; each of the three greyed, `disabled`, while it has no say, by
  `paintTractBtns` from `paintSliceBtn` and `showBrain`: Slice tract while Slice is off, Offset while Slice or Slice
  tract is off or the brain is, Distance while any of those or Offset is off, its bar put away then, and a greyed
  switch shows no lit block, `.panelbar .pbtn:disabled`), Thicken (`#thickBtn`, v12.43: a mini, `#thickPop`, the
  streamlines' thickness, `#radius` 0.05 to 0.9 in twentieths, 0.3 to begin, `applyRadius` setting `tractRadius` on
  the mesh and on the ends, the range the Brain sheet's Thick slider had until v12.42, when it went for that one
  release), View (`#viewBtn`: a mini, `#viewPop`, of the
  faces as words alone, Left, Right, Front, Back, Top, Bottom and Home, `.mini-item[data-face]` through `faceTo`,
  Home the opening view with its zoom and its place put back, then behind a rule Reset slice, `#sliceReset`, every
  cut back to its centre mark with the view left as it is, which the owner asked back here after v12.32 had taken it
  off every bar; the cube and Reset view went), Revolve (`#spinBtn`, a `.pbtn` lit while it turns; off at launch since
  v11.98, at the owner's word) and, last in the sliding group since v12.59, at the owner's word, Export (v12.50: raising `#popExport`, the
  density select `#exportDensity` and `#export3d`, which stood in the Tractography sheet's middle until then; from v12.50
  to v12.58 it stood always on show in `.panelbar-end` before the line) and, at the far right behind a line, always on
  show, Tractography (`.pbtn-ref`, as
  narrow as the others since v12.44, at the owner's word, its name in smaller, tighter type, `.panelbar
  .pbtn.pbtn-ref span`, and its line standing `--gap` after the sliding group as the group stands from the bar's
  left edge, the bar's `gap` nought and the button's `margin-left` the gap; `#popTract`: the sheet of What it is (v12.36: what tractography is, the colour key and how the page works, the
  notes the About window held) and Reference (the
  sources as `.ref-line`s, the HCP1065 paper, Yeh 2022, linked by its DOI, the template, the HCP's acknowledgement and
  NiiVue) under three `h2`s; the What it is, Export and Reference buttons and their sheets went with v12.42, the About
  button with v12.36). The groups slide: `.panelbar-btns` is the scroller (`flex:1 1 auto; min-width:0;
  overflow-x:auto`, no scrollbar) and `.panelbar-end` keeps its place, the bar itself `overflow:hidden`; held sideways
  the group scrolls down its column (`flex:0 1 auto; min-height:0; overflow-y:auto`) and Tractography keeps its foot.
  A mini (`.mini`, the four standing after the nav in `main`, `position:fixed`, z 40, in the bar's material and inks;
  a tall bar, `.mini-tall`, as slim as its thumb allows since v12.43, at the owner's word, its `.tall` 32px wide
  with the value in small type above) is raised by its button one at a time and closes the open sheet (`openPop` closes a mini likewise): the screen
  script's `minis`, read off `aria-controls`, `openMini`, `closeMini` and `placeMini` (over the button, centred, 8px
  up, or to its left where the screen is `.land`, kept inside the window, placed again on a resize or a scroll of the
  group), put away by the button, a pointer down outside it, Escape, a face picked or Reset slice pressed
  (`window.TK_MINI`: `open`, `closeAll`, `current`), arriving from the button on the sheets' curve and as a plain
  fade under `prefers-reduced-motion`. The streamlines' single colour went with v12.42, at the owner's word, Direction
  their one colour (`fiberColor` Local; `inkColour`, `SATIN`, `shade` and `setColour` are gone); their thickness went
  with it and came back as Thicken in v12.43 (`tractRadius`, the export's `tubeRadius` too); and the export carries
  the streamlines while Tract shows them and the brain while it shows, refusing with neither. Its own viewer script is untouched but for the
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
  restore; Reset slice under View clears the cuts (v12.42; Reset view did until then). From v11.98 to v12.41 the
  streamlines had a Single colour beside Direction, white on the dark theme and a dark grey lit by a satin shader of
  its own on the light, and a thickness slider; both went with v12.42, at the owner's word (above). `MN_TRACTS.nv()`
  hands the viewer to a check. The page keeps its last state on the device (v12.1): `vn-tracts-last`, the brain and
  its transparency, the streamlines (v12.42), their offset and thickness (v12.43), the cuts and the view (azimuth,
  elevation, zoom), written by `rememberSoon` a moment after each change (Brain, Tract, the two switches, the three
  tall bars, a face, the slice tool's `onChange`, and the hand letting go of the view) once the page is up, and read back by
  `restoreKept` as the tractogram comes in; since v12.61, at the owner's word, the page opens as it does the first
  time, the brain on at 65 per cent transparency, the streamlines on and nothing sliced (Slice off, every slider at its
  mark), whatever was left, `restoreKept(m, everything)` passing over the brain, the streamlines and the cuts unless
  `everything`, which `MN_TRACTS.restore(state)` asks for (the store shots' door), the view, the thickness, the
  offset with its switch, the regions and the drawer coming back as before. Since v12.31, at the owner's word, the brain can stand around the
  streamlines, and since v12.38, at the owner's word, it is the 3D Region Atlas's own 3D view: Brain on the bar shows
  and hides it (on as the page opens since v12.36, at the owner's word) and Transparency's bar sets how see-through
  it is (`#brainTrans`, 0 to 95, 65 to begin since v12.61, 75 until then, `brain.trans`; moving it shows the brain; v12.42's Thicken read it as
  solidity for that one release). The brain is a second NiiVue viewer (`brain.nv`) on `#tkBrain`, a `.brain-layer` canvas laid over the
  streamlines' `#tkRen` in the same `.mri-stage` that takes no pointer, holding the MNI152 template
  (`assets/mni152.nii.gz` through `NVImage.loadFromUrl` on the first On, `addVolume`, `SLICE_TYPE.RENDER`, no
  crosshair) and rendering it as the atlas's render view does, its ground clear (`backColor` alpha 0) so the
  streamlines show through, the layer's CSS opacity the transparency (`applyBrainTrans`, `placeBrain`),
  `visibility:hidden` while off; `MN_LIFE` registers it. The two cameras are one: `followDraws` wraps the
  streamlines' viewer's `drawScene` so every draw, its own on a drag included, runs `drawBrain`, which `mirror`s the
  turn, zoom and `position` into the brain's viewer and draws it; and `frameBrain` gives the streamlines' mesh the
  volume's extents (`brain.box`, from `volumeObject3D.extentsMin/Max`) while the brain shows and the streamlines' own
  (`whole`) while it hides, set again after every cut's rebuild, so both viewers frame the same box and the view
  never jumps. The slice tool cuts both exactly alike: `applyCut` first hands the planes to the brain's viewer
  (`cutBrainPlanes`, NiiVue's own `setClipPlanes`, as the atlas's tool does), then `cutBox` reads the planes back
  off that viewer's `scene.clipPlanes` (each a vec4 in the volume's unit cube, the side where `dot(n, p − 0.5) + a <
  0` cut away) and turns them into millimetres through its `frac2mm`, so the streamlines end where the head is cut
  and the MRI shows at the cut face as on the atlas, or rather a little past it: since v12.39, at the owner's word,
  the streamlines' own cut stands `tractPast` behind the brain's (`cutBox(planes, past)`; `TRACT_PAST_DEFAULT` 2.5 mm,
  doubled to 5 in v12.41 and halved again in v12.42, at the owner's word each time, and since v12.43 Distance's bar
  sets it, 0 to 50 mm, while the Offset switch is on, v12.44, `effectivePast`), so their ends stick out of the cut
  face at any transparency; the export's surface is cut with
  no such room (the first quarter of a slider's travel cuts the air around the brain there, and nothing of the
  streamlines); the brain off, the planes are read as before (`planeNormal`, the slider's share straight over the
  streamlines' box, with no offset since v12.44, the Offset switch having no say without the brain).
  Since v12.41, at the owner's word, those ends are drawn in the brain's viewer as well, so they show from any angle:
  the streamlines' viewer lies beneath the brain's canvas with no depth between the two, so the ends it drew showed
  only past the head's outline; `applyCut` now gathers the pieces that stand past the brain's own cut, and a
  millimetre inside it so each tube runs on through the face (`cutBox(planes, -1)`), into `brain.ends`, a fibre mesh
  the brain's viewer holds (an `NVMesh` built from points and offsets, marked a fibre mesh by a colour with no alpha;
  two points and hidden until a cut fills it, `setEnds`, which sets `brain.endsOn`; shown only while Tract shows the
  streamlines, v12.42), which the renderer sets against the head's depth, in front of the cut face and behind the
  head elsewhere; `dressEnds` gives it the streamlines' direction colours, `tractRadius` and dither, from
  `applyRadius`, with `fiberLength` 1 (the shortest piece kept, in millimetres: the renderer builds nothing for a
  fibre mesh whose `fiberLength` is nought), and `MN_TRACTS.ends()` reports it for a check (`offset()` and `radius()`
  the two settings, `switches()` the two switches). The state's `brain` (`on`, `trans`), since v12.42 `tract`, since
  v12.43 `radius` and `past` and since v12.44 `sliceTract` and `offsetOn` ride in `vn-tracts-last` (`v: 5`; v2's
  colour and the `slices` v12.36 kept are ignored, v2's thickness read again), and the export carries the brain while it shows as a surface drawn
  from the template on the first export (`brainForExport`: `MN_EXPORT3D.isoSurface` at a 2-voxel stride, lifted
  `BRAIN_LIFT` along its normals, cut by the box; the screen's brain is the renderer's and has no surface to give),
  at its opacity. v12.31's surface of glass (`GLASS`, the lifted isosurface drawn after the streamlines, cut by
  `cutPart`) and v12.36's three fixed slices through its middle (`buildSlices`, `PLATE`, the MRI slices switch) went
  with v12.38, at the owner's word: the brain and its cuts were to be exactly the atlas's 3D view, translucent, with
  the MRI only at the cut. `showBrain(brain.on)` after `restoreKept` fetches it as the page opens, and
  `MN_TRACTS.brain()` settles once it is in, which `shoot-home-pictures.js` waits for (the home twins retaken). The
  chrome now
  lives in six pages (the 3D Region Atlas, the Brodmann Area Atlas, the Hallucinations study, the molecular viewer, the
  Network Atlas and Tractography); a change to it belongs in all of them.
- Since v12.59, at the owner's word, the Tractography page shows the streamlines through the regions a person picks.
  The 3D Region Atlas's region box stands beside the view as a drawer (the atlas's chrome copied into `tracts.html`:
  `#drawer`, `#drawerBox`, `#drawerHide`, `#drawerTab`, `.deck.shut`, kept as `vn-tracts-drawer`, open on a wide
  screen unless shut and shut at every load on a phone, where it slides in from the right; the slice tool's left
  slider stands 26px in and the bottom one starts past it so the box's tab and handle never cover them, and on a
  phone the right one stands in as on the atlas), and what the box holds is a widget, `site/assets/region-box.js`
  with `region-box.css` (`MN_REGIONBOX.attach({host, box, link, onChange, onRead})`: the atlas's picker line for
  line, built from `MN_ATLAS.REGIONS` by lobe with the Mirror toggle, searched by name, lobe or what a region does,
  the Highlighted rows under their layers with a colour each from the atlas's palette, Clear all, a count line
  (`api.count`), a switch of two `.ts-btn`s, All through or Connecting, greyed under two regions, standing at All
  with one and turning itself to Connecting as the list goes from one to two, the person's own after that, and under
  Mirror a Highlight the regions toggle, off to begin with (v12.60, at the owner's word; `light`, `api.light`,
  `setLight`), without which the regions themselves are not drawn;
  `MN_REGIONBOX.fillNote` fills a region's own window; the atlas keeps its own copy of the picker, so a change to how
  a region is picked belongs in both). Which streamlines run through which region is an index built once offline by
  `scripts/make_tract_regions.py` into `site/assets/tracts/hcp1065-regions.json` (for each AAL label, in
  `atlas-data.js`'s order, the streamlines whose drawn line enters the region's own voxels, every segment walked at
  1 mm; no margin around a region, at the owner's word, so a bundle skirting an edge does not count; 465 KB, read by
  the page beside the tractogram and checked against its streamline count, `streamlineCount`, which leaves out the
  empty streamline NiiVue's reader closes the offsets with; a rebuilt tractogram needs the script run again). In
  `tracts.html` the pick leaves `shown`, the subset the cuts, the ends and the export read in place of `whole`
  (`base()`; All through is any streamline through any highlighted region, Connecting those through two of them:
  `regionIds`, `applyRegions`), the view keeping the whole tractogram's frame; while Highlight the regions is on, each highlighted region stands among
  the fibres as a surface of its voxels in its colour (`lightRegions`: `MN_EXPORT3D.labelSurface` on the AAL
  volume, fetched once through `MN_EXPORT3D.volume`, an `NVMesh` of triangles in the streamlines' viewer, cut as the
  brain is by `cutRegions` from `applyCut`, `cutBox(planes, 0)`), and since v12.62, at the owner's word, is painted
  in the brain itself as the atlas paints it, so a cut shows it on the cut face (`paintBrainRegions`: the AAL volume,
  fetched the first time it is wanted, laid in the brain's viewer as a second volume in `MN_LOOK.labelTable`'s colours,
  `scan-look.js` now loaded by the page, and cut with the brain, the viewer's `isClipAllVolumes` on as the atlas's
  Slice regions sets it; at the brain's own transparency, as the MRI on the face is); a row's name pressed raises `#popRegion`
  (`readAbout`; `TK_SCREEN`, the sheets' door the screen script exposes beside `TK_MINI`, and `TK_DRAWER` the
  drawer's); the regions, the mirror toggle and the switches ride in `vn-tracts-last` (`v: 6`: `regions` as the
  atlas's keys, `mirror`, `link` and, since v12.60, `light`); and `MN_TRACTS.regions` (`set`, `keys`, `link`,
  `setLink`, `light`, `setLight`, `shown`, `drawn`, `indexed`) is the door for a check or a shoot. The store shots and the home twins set the drawer shut, so the
  tractogram keeps its room.
- Since v12.63, at the owner's word (items 1 and 2 of the list at the foot of this file), the Tractography page draws
  the bundles as the professional tools do. The file names a bundle for every streamline (`hcp1065.trx`'s `groups/`,
  87 groups, each a side of one of 46 bundles), and `site/assets/tracts/hcp1065-bundles.js` (`MN_BUNDLES`: `SYSTEMS`,
  `LIST` of base, name, system, a line on what it joins and a colour, `find`) names them, in five systems,
  association, projection, commissural, cerebellar and the cranial nerves, the colours stepped round the hue wheel by
  the golden angle in OKLCH so a bundle and the next in the list never share a hue, both sides one colour. Under the
  regions in the drawer stands a Bundles part, built by the page (`attachBundles`, `paintBundles`; the atlas's
  `.tier-switch` copied into the page): By direction or By bundle (`setColour`, NiiVue's `fiberGroupColormap`), a
  switch for every bundle on the heading and one for each system on its heading, and a row per bundle with its colour,
  its name, whose press shows that bundle alone and a second press every bundle (`soloBundle`, `showAllBundles`,
  `soloBase`), and its sides, L and R or On for one across the midline. A tap on a fibre names its bundle in a small
  window by the finger (`#tkPick`: the name, side, system and streamline count, what it joins, Alone or Show all and a
  cross; `wireTaps`, `tapAt`, `pickAt`, which projects the points drawn through the viewer's own
  `calculateMvpMatrix` and takes the nearest the eye within 7 px, 16 under a finger, the streamlines left out while
  the brain stands under 25 per cent transparent, the ends kept). What is drawn is `display` (`base()`), built by
  `rebuildDisplay` from the regions picked and the bundles shown and kept while neither changes (`displayKey`):
  each of the file's streamlines is 24 points, so the set is smoothed by Catmull-Rom (`smoothSet`), two to four
  points to a step, and drawn with five to eight tube sides, as many as fit a budget of 3 million tube vertices
  (`TUBE_BUDGET`, the whole tractogram's 580,968 points at five sides, so a phone does no more than before; the
  whole stays as the file has it, a single bundle is drawn smooth and round); and the streamlines are shaded darker
  where they crowd (`CROWD_SHADE`, NiiVue's `fiberOcclusion`, 0.4), from a density worked out once per set by
  `densityFor`, NiiVue's own measure redone so it can be carried through every cut and onto the ends, which keeps a
  cut as cheap as before and the shade still as a slider moves. Every piece a cut or the ends keep carries its
  streamline's bundle (`tkBun` on the mesh, the mesh's `groups` made from it by `groupsFrom`, `setFibers` setting the
  points, the groups, the density and the look together). The colouring and the bundles hidden ride in
  `vn-tracts-last` (`v: 7`, `bundles: {colour, hidden}`), the export carries the bundle colours while they show
  (`vcol`, sampled as the lines are), and `MN_TRACTS.bundles` (`list`, `colour`, `setColour`, `hidden`, `setHidden`,
  `solo`, `all`, `pick`, `tap`, `label`, `drawn`, `spot`) is the door for a check or a shoot.
- The Region Atlas is called the 3D Region Atlas wherever its name shows (nav, titles, home page, the app) since
  v11.12; its file stays `regions.html`. Since v11.22, at the owner's request, it is one screen in the manner of an
  anatomy app (`body.atlas-screen`, `main.screen`, the style block "the screen" and the script "the screen" at the end
  of the page): the four views fill the room between the header and a bar along the bottom (`.panelbar`), nothing
  scrolls, the region picker and the highlighted list are a box in the deck's corner (since v11.24, rounded and lifted
  like the molecular viewer's boxes since v11.33, as are the pop-ups and their tabs; `#drawer` is the
  column the views make room for, `#drawerBox` the box, as tall as its content up to the room, scrolling inside in
  `.drawer-in`, the one scroller in it since v12.52, at the owner's word (`.rchips` is `overflow:visible`, its own
  `overflow-y:auto` and 24rem cap gone, which WebKit had read as a scroll of the list's own); hidden on the tab at its edge, `#drawerHide`, shown again on the handle `#drawerTab` at the screen's
  edge; beside the views from 901px and over them below, remembered in `localStorage` as `vn-atlas-drawer`). Since
  v12.47, at the owner's word, the box wears the island bars' material (`.drawer-box`: `--bar-fill`, `--bar-line`,
  the blur, `--bar-fill-solid` under `prefers-reduced-transparency`; `.drawer-in.card` clear; the tab and the handle
  the same; the Network Atlas's two boxes and foot, the Hallucinations study's and Microanatomy's boxes likewise),
  its Regions part holds Add a region, Mirror and then Saved maps as a fold (`details.fold#savedFold`, `.fold` in
  `viewer.css`, shut until pressed; the bar's Saved maps button and `#popSaved` went), inside which `models.js`
  (`folds: true` in `attach`) draws the name box, Export and Import files and two folds of its own, Saved (the
  person's maps, None until one is kept, opened as one is saved) and Examples, each shut until pressed (the fold
  headings `.72rem` in the ink since v12.48, at the owner's word, and the widget's standing line on where the maps
  are kept gone, `renderNote` carrying only what just happened; a save under a kept name with a different view
  arms Save as Replace? for four seconds, `armReplace`, a second press replacing, and an identical view is let be,
  `sameView`, the name and the time aside and numbers to the millimetre); and its
  Highlighted part carries switches: one on the heading (`#allSwitch`, `master` in the script, `all` in a model) for
  every region at once and one on each layer's heading (`.tier-switch` in `renderChips`, each entry's `off`), every
  region under it off the scan and on again while it stays in the list, hollow-dotted (`.rchip.off`); the layers'
  own settings survive the master (a layer switched on under a master that is off brings the master on, so the
  layers that were on show again), `vis(s)` governs the label table, the chart, the probe and the 3D export, and
  the headings are set bigger (`.rchip-head`, `.72rem`). A map opened from the list or a file changes the regions
  alone, the cuts, the camera and the crosshair left as they are (`restore(m, {keepView: true})` from the widget;
  the memory's restore at boot still puts its cuts back), and a row of the Highlighted list pressed, its name and side one button (`.rread`, v12.52, at the owner's word; v12.47 had the pick from Add a region raise it, which only adds now), raises that region's own window since v12.56, at the owner's word (`#popRegion`, a `.pop` in the stage with no bar button, 560px wide on a wide screen, `readAbout` filling `#popRegionH` with the name, `#popRegionWhere` with the layer and side and `#popRegionBody` with three kickers, What it does, Associated brain disorders and When damaged, from `region-notes.js`, then `MN_SCREEN.open`; from v12.52 to v12.55 it raised What they do scrolled to the region's note, whose cells still carry `data-key`), as the study's list raises its reading. Each note carries two lines of health since v12.47, at the owner's word, Disease and Damage, named Associated brain disorders and When damaged on the atlas since v12.56 (the study keeps the two words) (`disease` and `damage` in `region-notes.js`, concise teaching notes, not clinical advice; `.rnote h4`
  and `.more`), which the study's reading shows under What it does from its region's first parcel (`m-disease`,
  `m-damage`, Crus I for the cerebellum) and the MCP server's `region_info` answers carry (`build_mcp_data.mjs`,
  `doRegion`). The box's
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
  800px the name shorter still, so the bar fits an iPad upright without scrolling); then Export (Saved maps stood
  before it until v12.47, when the widget moved into the region box) and, at the far right behind a line,
  Reference (`.pbtn-ref`, since v11.31; since v11.83 its window lists every source in full rather than sending the reader to the
  receptor window: the two receptor lines are written into `#ref-sources` by `renderSources()` from the receptor data, the
  same text the receptor window's Sources tab carries, through `sourceLines()`, and ends with a line that opens the receptor
  window on its Sources tab, `[data-open-pop]`/`[data-open-tab]` bound by the pop script, v11.84); the Brodmann map left the page in v11.30, the Brodmann Area Atlas having it). The readouts sit at the bar's start; since v11.51 the Probe readout's names are buttons (`.probe-btn`, built in `onLoc`
  only as the names change): the region's lights the side under the crosshair, or the pair while Mirror is ticked, and puts
  out whatever entry covers the label, or turns it on again where a switch had put it off (`toggleProbe`, `litBy`; the
  Brodmann area's button went with the areas in v12.47), and `paintProbe` keeps their pressed state and colour dot in
  step through `selWatchers`. Every element id the script uses is unchanged, so the pop-ups' contents
  still follow the selection; a chart is told to measure itself when its pop-up opens. The receptor types table
  (`#types-heat`, `.heat`) is `overflow:visible` and scrolls with the pop-up's body, so its sticky column names and
  row labels hold; its header is as tall as the longest name (`th.col button` sized by its text, since v11.29). Since
  v12.33, at the owner's word, the views have no bars of their own, no names, borders or expand buttons, and the
  direction locks and Centre planes went with them: the views' bar at the top of the stage picks the views on every
  screen (see the four views below). The page's `--screen-top` is the header's
  measured height, and the root is `overflow:hidden` with the body (`html:has(> body.atlas-screen)`), for Safari on a
  phone, which scrolls a body alone. In every 3D view, a drag on the wheel's button pans, as
  shift-drag does (`zoom.js`). Since v11.23 the bar's buttons are an icon over a word at every width (`.pbtn`, inline
  SVG), and on a phone (the script's `one` media query: 760px wide or less, or a coarse pointer under 500px tall) the
  screen is `main.screen.one`: the stage holds the four views two by two (`main.one.all`, the default since v11.28,
  close-set) or one view edge to edge (`.view.shown`), the pick remembered as `vn-atlas-view` and made since v12.33 on
  the views' bar at the top, just under the Best experienced line (until then the bar along the foot opened with All
  and the four single-view buttons on a phone); the bar along the foot holds the pop-up buttons, the readouts are hidden, the bar stays on show while a pop-up is open (since v11.82; from v11.54 to v11.81 `main.screen.popped`, which
  the pop script still sets, hid it upright and the pop-up had its room), the pop-up standing above it in the stage, its
  button lit, closing on that button, its cross or Escape, and swapped by another button, the region area is a drawer the height of the
  screen sliding over the view from the right (the box's elements, laid out so by `.screen.one`), shut at every load
  whatever `vn-atlas-drawer` holds (since v11.25), and the pop-ups span the width. The slice tool's edge sliders
  (`slice-tool.js`, styled in `viewer.css`) are 44px strips with 24px thumbs under a coarse pointer (v11.32); on a
  phone the right-hand one stands 26px in from the edge, clear of the drawer's handle, and the bottom one stops short
  of it (`.screen.one`). Since v12.9, at the owner's word, each slider carries a mark at its centre, a 2px line across
  the track at the middle drawn as `.slice-range`'s own background (`viewer.css`, the Brodmann page's inline copy, and
  `--slice-mark` set to the bar's soft ink in `bar.css`; 18px long, 32px under a coarse pointer), a mark alone with no
  snapping. Since v12.32, at the owner's word, nothing puts the cuts back but the hand: the Reset slice that v12.9 stood
  on the bar of every page that slices (the 3D Region Atlas, the Brodmann Area Atlas, the Hallucinations study, the
  Network Atlas, Tractography) is gone, and the tool's own Reset cuts with it (`slice-tool.js` draws no reset button and
  takes no `reset` option), so Slice turned off shows the head whole, a slider drawn back to its centre mark undoes its
  cut and a double-click returns it at once; the tool's `reset()` stays for the pages' own Reset of the view
  (Tractography's Reset view, which puts back the view and the cuts together; the Brodmann page's banner Reset did too
  until v12.34). Slice stands at the far left wherever it is: first on the views' bar of the four-view pages (v12.33;
  until then first in the 3D view's own bar) and of the Brodmann page's brain (v12.34; from v12.32 it led the brain's
  banner), and first on Tractography's bar (v12.32). Since v12.33 `tools` is optional: left out, the tool draws no
  buttons and the page drives it through `open()`, `close()` and `setRegions()`, reading `state()` back (the views' bar,
  Tractography); since v12.34 no page hands it `tools`. Held sideways (v11.42: `main.screen.one.land`, the script's `land` query, a coarse pointer in
  landscape) the bar stands along the right edge, its buttons one to a row since v12.24, at the owner's word (two to a row, 66px
  cells in a 141px bar, from v11.58 took too much of the short screen's width), each its icon over its name as upright,
  in a 76px bar that scrolls when they run past its foot (the longest name carries a soft hyphen), the
  drawer's handle off the bar's edge, the four views one row, the views' bar at the top (in the app 60px in from the
  left, clear of the shell's back button), the masthead hidden; in the app's tabs the shell hides its bar on a phone sideways
  (`WebPage.sideways` in `ShellWeb.swift`, `BackOverPage` the back button it keeps at the top left) and the page's body
  loses its top padding there, the views' bar standing 60px in from the left for that button (the view's own bar made
  56px of room until v12.33). The Brodmann Area Atlas is its own page again since v11.12 (retired
  into the Region Atlas in v10.8): `site/brodmann.html`, with its nav entry and its box straight after the 3D Region
  Atlas.
  Since v11.15, at the owner's request, it is one screen and nothing else: the two faces of the map
  (`brodmann-outline.js`) and the reading of the picked area (`brodmann-areas.js`), fitted to the window under the
  header (the script measures `--screen-top`). On every screen the three views show together, the two faces, the
  brain and the reading of the picked area. The brain (`#baScan`, `.scan.quad`) is a grid item, `grid-area:scan`, shown
  once the script marks the screen's layout (`.one`, `.land`, `.tall` or `.wide`). Since v12.34, at the owner's word, it
  is the atlases' four views, with no banner and no lines: the views' bar at its top (`nav.viewbar`, `view-bar.js` and
  `atlas-views.css` as on the 3D Region Atlas, attached with the box itself as `main`, `start:"render"` and the pick
  kept as `vn-ba-scan-view`: Slice at the far left, greyed while a slice is shown alone, Slice area beside it, greyed
  until a cut can take the area (v12.37; Area, shown while slicing, until then), then All, 3D, Axial, Coronal and
  Sagittal; in the bar along the foot on an iPad or a computer since v12.37, see the views' bar below; close-set on a
  phone by the page's own `.ba-screen.one .scan .viewbar`
  rules, and the bottom bar's sideways button rules scoped to `.panelbar` so they leave it alone), and beneath it four
  NiiVue instances (`PLANES`, `byKey`, `scanInstances`; fetched as the page opens by `applyScanMode` and `ensureScan`,
  each with the MNI152 template and `assets/brodmann.nii.gz` over it at 0.9, `show3Dcrosshair:false`, kept in step by
  `broadcastTo` and painted by `MN_LOOK.paint`), the 3D view to begin with, the picked area lit in all four by
  `paintScan` from `MN_LOOK.labelTable` and the lobe colour, and the slices brought through it at each pick by
  `centreScan`, from `findSpots`, run once as the brain comes in: for each label the voxel of its left-hemisphere part
  (the faces' side; every area is bilateral, so the whole area's middle lies near the midline) nearest that part's
  middle, which an arc's middle may miss, kept in millimetres for `mm2frac`. Zoom and rotation come from `zoom.js` (the
  slices `mode:"slice", wheel:"none"`, as on the atlases), and the cuts from the atlases' Slice tool (v11.71:
  `slice-tool.js` on the 3D view, attached without `tools` as the scan becomes ready, `regions: "Slice area"` cutting
  the lit area with the brain, the cuts kept as `vn-ba-cuts`). Loading and failure are a line over the views
  (`#scanNote`, `.scan-note`). Until v12.34 the box was one framed render under a banner, In 3D with its note, the
  tool's own Slice and Slice area (leading it since v12.32) and Reset, which put back the angle, the scale and the
  cuts; the banner and Reset went together, and a double tap or click puts a view's zoom back, not the angle. No list, graph or export; BA48, on neither face, is reached from the empty reading,
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
  (`applyScanMode` leaves `.one` alone), Escape lowering it after About and the text; raised, its views' bar stands just
  under the Best experienced line (v12.34); the Outside, Inside and Both group
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
  page loads `atlas-views.css` (since v12.34, after viewer.css as the atlases do), `stage-lifecycle.js`, `scan-look.js`,
  `zoom.js`, `slice-tool.js` and `view-bar.js`; the inline copy of viewer.css's `.ts-btn` it once carried went with the
  banner's buttons. The 3D Region Atlas carried its own Brodmann list until v12.47 (no map since v11.30; from v11.38
  picked through `dropPicker`, which `#rpick` keeps), when the areas left it at the owner's word: no second label
  volume (`brodmann.nii.gz` is the Brodmann page's alone), no AAL-or-Brodmann switch, no picker, no block among the
  chips, the notes or the Reference window, no area under the probe or on the chart, a `#ba=` link forwarded to
  `brodmann.html`, a saved model's `atlas: "ba"` entries skipped on restore, and the MCP worker's `save_model`
  refusing a `B:` item and naming the Brodmann Area Atlas (`resolveItem` in `account.js`; its test expects the
  refusal; live with the next deploy). The home page's atlas box and its twin in `Shell.swift` no longer name the
  areas. The removal took `norm` and `highlightText` with it, which the region picker's list shares, so v12.47's
  Add a region list threw and showed nothing; v12.48 put the two back beside `buildRegionList`. A check of the
  picker as a person uses it, the button pressed, a word typed and Enter, is the one that catches this.
  `app/scripts/shoot-home-atlas.js` shoots the atlas's home twins through `MN_SEL.middle` (the crosshair to the middle of
  the volume, the work Centre planes did until v12.33), `MN_SEL.centreMm` and `MN_SEL.onLocation`, the
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
  comes in; a cell in the address wins); the molecular viewer keeps its picker and level as before. Since v12.27, at
  the owner's word, a 3D Region Atlas model also travels as a file: `models.js`'s Saved maps widget carries Export file
  and Import file under the name box (`.mfile` in `viewer.css`), the first writing `capture()`'s object, the same JSON
  a save keeps, as `brain-regions[-name].json` through `MN.saveFile` (the Files app and the share sheet in the apps, a
  download on the web) and the second reading one through a file picker into `restore()`, which refuses another
  tool's file; no account is needed, and the import fills the name box so Save can keep it. The Vision Pro app has no
  saved models, so it has no part in this. Since v12.47, at the owner's word, the widget carries Example maps under
  the person's own: `attach`'s `examples` (each a name, a note and a model as a save keeps one), `things`, the
  plural for its headings, and `folds` (the two sections as `details.fold`, Saved and Examples, as the atlas has them
  since the widget moved into its region box the same day; without `folds`, `.mhead` headings, Your maps then
  Example maps; the own list reads None, `.mnone`, until one is saved), the examples drawn as rows with their region
  count where the date stands and no delete button, a press opening one through `restore` (`openExample`, a copy of
  the data), filling the name box so Save keeps a copy and saying the note under the lists. The maps are `site/assets/example-maps.js`
  (`VN_EXAMPLE_MAPS`: name, note, `regions` as `P:`, `L:`, `R:` or `S:` and the AAL base, `opacity`, `mirror`),
  resolved by `exampleMaps()` in `regions.html` through `selKeyFor` and coloured in `PALETTE`'s order, and precached:
  Memory circuit, Visual pathway and Serotonin receptor hotspots as the owner's account had them (the Amygdala map and
  the MCP connector's test left out), the hotspots the regions `receptor-data.js` ranks highest for its six serotonin
  tracers, then Basal ganglia motor loop, Language network (the left side alone, mirror off), Default mode network and
  Dopamine reward circuit. The MCP server's `list_models` lists the account's files alone, as before.
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
  (the screen, drawer, bar, pops, `.one` and `.land` rules, and the screen script) is a copy of the atlas's with the
  same names: a change to the chrome belongs in both pages. Since v12.35, at the owner's word, the study opens the
  first time after the app is launched as on a first visit, The paper's window (`#popPaper`) raised over the views and
  everything else as it comes, and when it is come back to while the app still runs, where it was left; a full close
  of the app (a swipe up from the switcher) forgets it, so the next launch opens it as the first. What is kept is one
  object, `hx` through `MN_KEEP` (`site/assets/launch-keep.js`): the state, the region picked, the systems filtered,
  the transparency, the drawer, the view, the window open (`HX_SCREEN.current()`) and its `.pop-body`'s scroll, the
  cuts, the 3D view's turn, zoom and `position`, each slice's `pan2Dxyzmm` and the crosshair, written by `rememberSoon`
  250ms after each change (`renderAll`, the opacity, the drawer, `onPick` from the views' bar, a window opened, closed
  or scrolled, the slice tool's `onChange`, a hand let go of a view) once `startKeeping()` has run at the end of the
  screen script, and read back as `HX_KEPT`: the state, pick, filters and transparency before the first `renderAll`,
  the drawer, view and window by the screen script, the scans in `keptScans()` once they are in (the crosshair after
  the picked region has centred it). `MN_KEEP` files it in localStorage under `window.VN_LAUNCH` in the iOS app, a
  name the shell writes into every page at document start (`launch` in `PageBridgeController`, a UUID made once per
  process), anything under an earlier launch counting as nothing, since every page there is a web view of its own and
  keeps no session from one page to the next; on the website and in Android's one web view it is the tab's own
  sessionStorage (a reload keeps it, a new tab starts afresh). The view and the drawer, kept on the device for good as
  `vn-hx-view` and `vn-hx-drawer` until then, are kept so too, and those keys are cleared as the page opens; the
  atlases keep their last states on the device across launches as before (v11.93, v12.1).
- The 3D Region Atlas, the Network Atlas and, since v11.17, the Hallucinations study (`site/hallucinations.html`)
  draw their four views alike, and since v12.34 the Brodmann Area Atlas's brain draws them so too in a box of its own
  (`.scan.quad`, holding the bar and the views; see that page above), from shared files: the scans' look in either theme is `site/assets/scan-look.js`, and
  the light-theme stages, the views' bar and the views' layout are `site/assets/atlas-views.css` with
  `site/assets/view-bar.js` (the bar's inks in `bar.css`). Since v12.33, at the owner's word, the views have no bars,
  names or borders of their own (each view's bar, its direction locks, Centre planes and the button that opened it over
  the grid, `view-expand.js`, went, and `view-fit.js`, which fitted the four to the screen and had nothing left to fit,
  with them): the three pages are `main.screen.quad`, and one bar at the top of the stage, `nav.viewbar`, an island like
  the bar along the foot, holds Slice at the far left (`.vb-slice`, the slice tool's switch, greyed while Axial,
  Coronal or Sagittal is shown alone, the cuts being the 3D view's), Slice regions beside it (`.vb-regions`, the cut
  through the highlighted regions too; Slice area on the Brodmann page, the lit area; named so and always on show since
  v12.37, at the owner's word, greyed (`disabled`) while Slice is off or a flat view is shown, where until then it stood
  only while slicing, named Regions or Area), and the views, All and each one alone (`[data-view]`), on every screen; on
  a phone it stands just under the Best experienced line. Since v12.37, at the owner's word, the bar is as wide as its
  buttons and centred over the views as the header's island is (`align-self:center; max-width:100%` in
  `atlas-views.css`, the side gaps kept on a phone, 60px each side in the app held sideways for the shell's back
  button), and where its buttons are wider than the screen it takes the width and slides sideways as the bar along the
  foot does (its `overflow-x:auto`), which Slice regions' name makes it do on a phone upright. Since v12.40, at the
  owner's word, it is centred on the header's island, the page's centre, rather than on the stage, whose centre the
  drawer's column beside the views had pushed off the page's: `centre()` in `view-bar.js`, run with each measure,
  slides the bar by the difference (`transform`), to the screen's centre where there is no island (the app's pages),
  never off the left edge and not at all on a phone held sideways, and `.quad .drawer{ z-index:7 }` in
  `atlas-views.css` stands the drawer over the bar where the two meet. Since v12.47 `centre()` works the shift out
  from the bar's rect less the shift it wears (`shiftNow`) and touches the style only when the shift changes: until
  then every measure cleared the transform and set it again, and the owner saw the bar jump a little and come back
  on the web as a sheet opened (the sheet's measure sends a resize). On the Brodmann Area
  Atlas the same bar stands in the bar along the foot on an iPad or a computer since v12.37, at the owner's word, after
  the faces' group where there is room (`#barScan`, a `.panelbar-scan` slot; `.panelbar .viewbar` undoes its island;
  `arrange()` moves `nav#baViewbar` there while the screen is `.tall` or `.wide` and back to the head of the brain's box
  on a phone, where it stays as before; the attach is given the nav as `bar`), the eleven buttons drawn closer upright
  on an iPad (`.ba-screen.tall .panelbar .pbtn`). `MN_VIEWBAR.attach({main, bar, key, start, onPick})` wires it (the pick kept on
  the device as `vn-atlas-view`, `vn-net-view` or `vn-ba-scan-view`; `bar` names the nav where it stands outside
  `main`; a page that keeps it its own way gives no `key`
  and hears each pick through `onPick`, the study since v12.35; `start` the view until one is picked, All unless
  given; `show(key, keep)`, `picked()`), the page hands it the slice tool
  (`MN_VIEWBAR.slice(tool)`, `MN_VIEWBAR.paint()` from the tool's `onChange`), and it writes `--vbar`, the bar's foot
  from the stage's top, so the sheets rising from the foot stop short of it (`bar.css`; a bar with no `.stage` round it,
  the Brodmann page's, writes none). All lays the four two by two, one view alone fills the stage; `atlas-views.css`'s
  rules for them read `.quad` alone since v12.34, and its phone rules the three pages' `.screen.quad.one`. A change to
  the views belongs in those files, so every page gets it; each page keeps its own viewer setup. Region
  colours reach the viewer through `MN_LOOK.labelTable` (and the same padding in `vision-scan.js`): the table is padded
  to a power of two, since at the atlas's 117 entries a highlighted label made the label just below it draw black.
- A squat phone (v12.23, at the owner's word), the closed iPhone Duo's outer display at 466 by 678 points: every page
  with a bar reads the screen's shape (`squat()`: a coarse pointer and a screen whose short side is under 600 and long
  side under 1.75 times it, which no other iPhone has, the SE's 375 by 667 the nearest at 1.78), so one rule holds in the
  app and in Safari. On the three pages with four views it marks the phone screen `.short`, one view at a time (All
  hidden from the views' bar by `atlas-views.css`, a pick of All shown as the 3D view; the pick is kept for a larger
  screen, and only a press changes it), and the 3D Region Atlas shows its 3D view alone there, with its slicing, the
  views' bar holding Slice alone (`.screen.quad.one.short .viewbar-views` in `regions.html`; v12.27, at the owner's word:
  the screen is too short for the flat slices). Everything else is the phone's: the bar at the foot, the drawer, the
  sheets, the Brodmann Area Atlas and the molecular viewer as on any iPhone upright, and the shell's bars where iOS
  puts them (v12.23 to v12.26 stood the page's bar down the right edge, one bar too many). The Duo itself keeps its
  status bar and camera in a column down the right edge of both displays, and an app built with the iOS 27.1 SDK gets
  its tab bar and toolbars stood on end there, below the status, as Apple's Duo page and pictures show; a build with
  Xcode 26 is shown inset open and gets the iPhone's bars closed. `oneView` runs on every resize on those three pages,
  since the Duo's screen changes under a page as it opens and closes while neither media query need change, and acts
  only when the layout does (`laid`); Tractography and Microanatomy, with one view, read nothing from the screen.
  Open, the Duo is an iPad (the shell above): upright its inner display is 669 wide, an iPad mini's layout (`.one`,
  the four views two by two), and sideways 887, the iPad's, the page's bar at the foot.
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
  takes `--panel-solid` for the paper), the rule standing after the hover rule at the same weight so a hovered lit
  button keeps its paper (v12.37: the views' bar's hover rule carried `:not(:disabled)`, which outranked the lit rule, and a
  hovered lit view button's name and icon took the ink of its block and vanished; the greyed rule, standing later,
  keeps a greyed button from lighting instead).
- Swift: both Xcode projects build with Approachable Concurrency, main-actor isolation by default and complete
  concurrency checking in the Swift 5 language mode; the visionOS data layer is `nonisolated` and its slow work is
  `@concurrent`, never a detached task. Nothing here can compile Swift, so a Swift change is verified by the owner's
  build (Xcode Cloud for iOS on every push to `main`; the Mac for visionOS); say so when handing one over. Its syntax
  can be checked here all the same (v12.71): `python3 -m pip install --target <scratchpad>/tslib tree-sitter
  tree-sitter-swift` (`python3 -m pip`, so the wheels match the Python that runs the check), then parse each file and
  look for ERROR and MISSING nodes, which catches a dropped bracket or quote though nothing of types.

## Open on the owner's side (update as they close)
- App Store: version 1.0 was approved and released on 25 September 2026 (https://apps.apple.com/app/id6805618686)
  after an expedited review. 2.0 (294) was rejected on 30 October 2026 under Guideline 5 for naming ChatGPT (see
  Name no AI assistant above); `app/store/LISTING.md` has the resubmission's steps, review note and reply. It went
  back first with build 310 and, on 30 October 2026, at the owner's word, was moved to v12.74's build with the
  listing in Simplified Chinese as well (`app/store/submissions/ios-2.0-zh-hans.md`). The project is at 2.0 for the next submission (the owner's choice of 25 October 2026, in
  place of 1.1: `MARKETING_VERSION` in the Xcode project and Android's `versionName`, and the version page in App Store
  Connect must say 2.0 as well, since a build's number and its page's must agree); its What's New text, the App Privacy
  changes the newsletter and the usage counts need, and the steps are in `app/store/LISTING.md`, the screenshots in
  `app/store/screenshots/` (the browser's, every set retaken on the v12.9 pages by `app/scripts/shoot-store.js`, whose
  Brodmann shot is the Brodmann Area Atlas page since v12.9) and the App Store's own images in `app/store/sell/`: since
  v12.10 `app/scripts/remake-store-images.js` remakes them from the live pages (served on 8412, run from `app/`,
  an hour; name shots `ipad-01`…`iphone-11`, `duo-01`…`open-11` for a few): eleven shots since v12.57, ten since
  v12.15 (the eleventh, at the owner's word, is Tractography as the owner's iPad capture of 27 October 2026 had it,
  the brain nearly solid with its left hemisphere's near side cut away and the tractogram standing whole in the space,
  set through the page's door once it is up, `MN_TRACTS.restore(TRACT_STATE)` (through its memory, `vn-tracts-last`,
  until v12.61, when the page began to open on its own defaults), the region box shut (`vn-tracts-drawer`, v12.59), under the statement Wiring System Tractogram, `03-tractography.png`, its iPhone bar the Molecular strip titled Tractography in Inter SemiBold,
  `iphone-top-dark-tractography`; ten is the most a size takes in App Store Connect, so one of the eleven stays out of
  each upload, the owner's choice), each the iPad's at 2752×2064 and the
  iPhone's at two sizes from one render, `iphone-6.3-` at 1206×2622, the medium display App Store Connect has required
  since October 2026 (the 6.9-inch refused there as "File dimensions are invalid"), and `iphone-6.9-` at 1320×2868, now
  optional, to replace 1.0's in that slot, and since v12.23 the iPhone Duo's own two (v12.20 set the iPad renders in
  the inner size): `iphone-duo-` at 1398×2034, the outer display closed (`duo-01`…`duo-10`), and `iphone-duo-land-` at
  2853×2007, the inner display open and sideways (`open-01`…`open-10`; `store-sell.js`'s `SHARE`, the capture at 84% of
  the width), each rendered at the Duo's web view (402×595 closed and 887×583 open, at 3×, the screen's size given so
  the page knows the squat phone) under the app's bar, with a column down the right edge as Apple pictures the Duo's
  (since v12.29, at the owner's word, after Apple's own pictures; v12.27 had put the tabs at the foot and the island
  across the top): the camera, the time and the Wi-Fi, then the tab bar stood on end, a capsule of the five tabs with
  the page's own lit, drawn from the iPhone captures' pieces as masks on the theme's paper (`column()`); the page has
  the whole height under the app's bar, its own bar at the foot; closed, the app's bar is the iPhone's with Back and
  the page's title, the strip the iPhone shot of the same picture names cut below its status rows under a 20-point
  inset, the app's area being the iPhone's own width (the light shot's bar is drawn from the dark strip's pieces as
  masks); open, the iPad's with Back alone at the left, cut from the iPad strip the shot names and set at three halves
  (`duoTop()`); no Duo capture exists; `store-sell.js` covers no status bar on them (`BAR`);
  the second shot's statement is Brain region functions explained (`openPop` waits
  for a raised sheet to come to rest, which at 3× with software 3D takes longer than the slide); since v12.21 the
  iPhone's second, What they do, is the owner's own capture from the TestFlight build of 25 October 2026, taken whole
  (`capture`, kept in `app/store/chrome/` as `iphone-capture-what-they-do`, with the notice line painted out in the
  page's black by `cover`; the first, the four views, was that build's capture too until v12.58, at the owner's word,
  when it became a render like the rest, the capture's views still wearing the bars of their own that v12.33 took
  off, and `iphone-capture-atlas` left the repository; the render gives the browser the iPhone's screen, `screen`
  402 by 874 in `DEV`, since without it the pages read the 402 by 675 web view as a squat phone and the atlas drew
  its 3D view alone, and sets the crosshair in the left thalamus, `thalamus`, so the sagittal view is not the bare
  midline); the tenth, AI Connector, is `mcp.html` under About strips made from the
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
  Atlas`; it goes in with 2.0. `GoogleService-Info.plist` was downloaded again on 21 October 2026 and was identical to the
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
- GitHub: the organisation is VisualNeuroscienceAtlas since 30 October 2026. Start new sessions with
  `VisualNeuroscienceAtlas/VisualNeuroscience` selected, and change the name wherever an environment's settings list
  the repository; until then a session started on BasilicaLabsAI pushes through the redirect (Branches and releases).

## What's left to build (the owner's list: answer from it when asked what's left)
The owner asked on 29 October 2026 that the steps toward the professional tools' level of tract display be kept here
as tasks and read back when they ask what is left. Best value first; strike each as it ships, naming the release.
1. Bundles: done in v12.63 (the bundle colours, the Bundles list in the drawer, a tap naming the bundle; see the
   Tractography bullets above).
2. Smoothness and depth: done in v12.63 (the streamlines smoothed into curves, more finely as fewer are drawn, rounder
   tubes for small sets, the crowding shade).
3. Connections done right: an index of where each streamline ends (beside `scripts/make_tract_regions.py`), so
   Connecting means a streamline with an end in each region and a new Ending in shows connections rather than fibres
   passing through. Measured on the shipped file: the left amygdala has 279 streamlines through it and none ending
   there, the left thalamus 2,859 through and 1,661 ending; with a 2 mm search 83 per cent of streamlines end in a
   region at both ends, 868 region pairs, 431 of them with ten or more. Each bundle then lists the regions it joins.
4. The textbook slice: the atlases' four views on Tractography (`view-bar.js`, `atlas-views.css`), the axial, coronal
   and sagittal slices of the template each showing the streamlines within a few millimetres (NiiVue's
   `meshThicknessOn2D`), a bundles-here readout at the crosshair and, as a choice, each bundle's density as a heat map
   on the slices.
5. A simplified teaching mode: one or a few smooth, labelled tubes per bundle (cluster centroids) and see-through bundle
   envelopes (`MN_EXPORT3D.isoSurface` on each bundle's density); the same curves serve the Circuit Atlas.
6. Better data: rebuild from the full HCP1065 atlas (brain.labsolver.org/hcp_trk_atlas.html, blocked from a session:
   the owner downloads it on the Mac or allows the host in the environment's network settings) with a minimum per
   bundle, so the cranial nerves show (2 to 22 streamlines each in the shipped file), and thinning that keeps the curves
   (every shipped streamline is 24 points, 2 to 6.5 mm apart), with a lighter copy for phones;
   `scripts/make_tractogram.py` samples at random and needs the per-bundle minimum.
Out of reach with this atlas, and said so: patient scans, tracking of our own, and measures along a tract such as FA
(the file carries the lines' positions and their bundles, nothing else).

## Languages: what's left (the owner's plan of 30 October 2026; strike each as it ships)
Simplified Chinese first, by the phone's iOS language, ranking in other languages. Done in v12.70: the machinery
(above), the header's button, the sitemap, and the home page, the MCP page, the developer's message, the studies and
the posters in Chinese.
1. The iOS shell: done in v12.71 (`window.VN_LANG`, the twin opened by the shell, the tabs' words through `L()` from
   the catalog the website uses, in place of a String Catalog, so the owner checks one list, the languages in
   `Info.plist` and the project's known regions, and the Language box under Account; see Languages above).
2. The atlases' own words: the bars, the sheets and what their scripts write, page by page (the 3D Region Atlas,
   Tractography, Molecular, Microanatomy, the Brodmann Area Atlas, the Network Atlas), each page added to `TWINS`.
3. The content: the 116 regions' names and notes, the Brodmann areas, the six states, the 46 bundles, the cells'
   structures, the receptors and transmitters; then the practice questions, the hallucinations study and the
   molecular tour. The OpenStax textbook stays English.
4. Account, sign-in and the legal pages (the English stands as the governing text).
5. The App Store listing in Simplified Chinese: its text done for 2.0 (`app/store/submissions/ios-2.0-zh-hans.md`);
   its screenshots, rendered from the Chinese pages, wait for the atlases in Chinese.
6. Traditional Chinese (zh-Hant) for Taiwan and Hong Kong, with Taiwan's own terms, not a character conversion.
