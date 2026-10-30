# The native shells

The application is `../site`. It is a static website with no build step, and
it is also, unchanged, the App Store and Play Store app: `capacitor.config.json`
points `webDir` at `../site`, so `npx cap sync` copies those same files into
both native projects. There is no second copy of anything to keep in step.

This directory holds only what the two stores need that a website does not.

## Why it is here and not at the repository root

A `package.json` at the root would invite the Cloudflare Workers build to run
`npm install` and look for a build command, and the web deploy has neither and
needs neither. Keeping the Node project one level down leaves `wrangler.jsonc`
serving `./site` as the plain static assets it is.

## The three targets

| | served from | offline | store |
|---|---|---|---|
| Website | Cloudflare Workers | service worker (`site/sw.js`) | — |
| Android | the app bundle | everything is local already | Play |
| iPhone, iPad | the app bundle, under a native tab bar (below) | everything is local already | App Store |
| Apple Vision Pro | its own app in `visionos/`, see `visionos/README.md` | the brain is bundled; the atlas pages are the live site for now | App Store, the visionOS platform of the same app |
| Mac (Apple silicon) | the iPad app as it is | everything is local already | Mac App Store, from the same iOS build |

`site/assets/native.js` is the seam. It asks Capacitor for a share sheet, a
haptic tick or a write to Photos when Capacitor is there, asks the browser for
its own version when it is not, and falls back to a plain download when neither
exists. Nothing on a page has to know which of the three it is running in.

## The iOS tab bar

Since v11 the iOS app (and so the iPad, Mac and Vision Pro runs of it) opens
on one system `TabView`, in SwiftUI, rather than on a web view. The site's
navigation falls into four groups, and each is a tab whose page is a column
of boxes like the home page's, one for each of the group's pages, in the
home page's own words and pictures. The pages have no header of their own,
since the tab bar names them, so the first box starts at the top. A box
pushes its page inside the tab, so every tab keeps its own stack and scroll
position. Account comes last and gathers what is not a section of the site.

| Tab | Symbol | Its page |
|---|---|---|
| Atlases | `brain` | 3D Region Atlas, Brodmann Area Atlas, Microanatomy, Molecular, Tractography, Network Atlas |
| Library | `books.vertical` | Visualizing Studies, Digital Textbook |
| Practice | `checklist` | Neuroscience Practice |
| About | `info.circle` | the MCP server, the developer's message, YouTube, Instagram, LinkedIn and email |
| Account | `person` | the account itself since v12.46 (Sign in with Apple, Google, or an email and password with Create an account and a reset; logged in, who it is, the account page as a row and Log out; `AccountAuth.swift`), Appearance (dark or light), Language (what the app speaks, and its page in Settings), App icon (the white and the black tile pictured, the one in use boxed), support and the privacy page, the credits |

There is no badge, because nothing in the app is waiting to be done:
practice is adaptive and keeps no queue of due questions. If it ever does,
the count belongs on `AppStore` as a published value, shown with
`.badge(count)` on the Practice tab. There is no gate either (no
`fullScreenCover`), since nothing has to be settled before the app can be
used, and no selection binding, since nothing switches tabs in code.

**The shared pieces**, in `ios/App/App/ShellKit.swift`, are what make the five
pages read as one object:

- `paperBackground()` puts the paper under every tab, past the safe areas: the
  site's paper colour with a faint grid of ink dots at the site's 14-point gap.
- `keyboardDismissal()` is for any page with a text field: a drag on the page
  lowers the keyboard (interactive scroll dismissal) and Done above the keys
  puts it away, since on an iPhone the keyboard covers the tab bar. No native
  page has a field yet; the web pages have theirs, and their web views get
  the same two things from UIKit (interactive dismissal on the web view's
  scroll view, and the system's Done bar above the keys).
- `TabPage` is every tab's shell: its own stack with the system navigation bar
  hidden, a `ScrollView` holding a `VStack(spacing: 14)` with 14 points of
  padding. `TabStack` is `NavigationStack` from iOS 16 and the stack style of
  `NavigationView` on iOS 15, the deployment target; for the same reason the
  tabs are written with `.tabItem`, not iOS 18's `Tab`.
- `Box` and `PageBox` draw a box in the home page's voice (kicker, Prata
  headline, standfirst, the picture from the bundled site, a readout under a
  rule, a signpost) and `PressStyle` makes it answer on the press.
- `Palette` is the site's ink, paper and two greys, as colour sets with dark
  variants in `Assets.xcassets`; the ink tints the app once, on the root view.
  `Faces` are the site's Flux, Newsreader and Prata, unpacked from
  `site/fonts` into `ios/App/App/Fonts/` and listed under `UIAppFonts`; a
  Chinese character falls back to the system's own Chinese face.
- `Lang` and `L()` are the app's language (v12.71): English, or Simplified
  Chinese where iOS gives the app Chinese, from the phone's languages or the
  one picked on the app's page in Settings (`CFBundleLocalizations` in
  `Info.plist`). Every word the shell shows is written `L("…")`, and
  `scripts/i18n/build.py` gathers each with its Chinese from
  `i18n/zh-hans.json`, the catalog the website's Chinese pages come from, into
  `ShellWords.swift`, which it writes; `{1}` and `{2}` in the words take the
  values given after them. Run the script after changing any of the shell's
  words.

**The pages** (`ios/App/App/ShellWeb.swift`). Each page a box opens gets a
Capacitor bridge of its own, opened on that page, so sign-in, Files, the share
sheet and haptics work there as before. Where the app speaks Chinese and the
page has a Chinese twin in the bundle (`about.zh-hans.html` beside
`about.html`), the bridge opens the twin, and every page is told the language
at document start as `window.VN_LANG`. A link from one page to another is
caught by a small plugin in that bridge (`ShellLinks`) and pushed as a new
page in the same tab, so each web view holds one page and Back is the
system's; popping a page lets its bridge go. In those bridges the splash is
off and the status bar plugin is replaced by one that does nothing
(`StillStatusBar`), because the real one resizes its web view to the whole
window whenever any bridge appears. The Firebase plugin keeps a small object
per page opened, since it never removes its auth listeners; the web view
itself is freed. The usage counts (`@capacitor-firebase/analytics`, built
without the advertising identifier) are driven from the web code: each page
names itself as a screen and every sign-in is counted, as `docs/AUTH-SETUP.md`
§8 describes.

The theme is the shell's: Account's Appearance switch sets it, the shell
writes it into each page before the page runs and presses the page's own
theme switch when it changes while the page is open. The first page to open
after the update reports the theme the web app last used, and the shell keeps
that, so nobody's choice is lost. A page knows it is in the tabs by
`data-shell="tabs"` on its root element: `site/assets/navbar.js` then draws no
bar of its own and `site/assets/viewer.css` drops the room it kept for one.
The same script pins each page's viewport to `maximum-scale=1,
user-scalable=no`, so nothing a finger does can enlarge a page in the app (a
double tap on a region's row once did; the views pinch on their own), and
`viewer.css` sets `touch-action: manipulation` on the root of every page, which
takes WebKit's double-tap zoom off the website too.
Android, which has no tab bar, keeps the web bar and its sections menu.

Nothing in this repository can compile Swift, so a change here is proven by
Xcode Cloud's build on the next push to `main`. On a device, check light and
dark, the largest Dynamic Type size, VoiceOver reading each tab's name, that
a tab keeps its place when you leave it and come back, and that the keyboard
can always be put away.

## Building

```
npm install
npm run sync           # copy ../site into both native projects
```

**Android** — needs the Android SDK (Android Studio, or `cmdline-tools` plus
platform 36 and build-tools).

```
npm run android        # sync, then open in Android Studio
npm run android:apk    # a debug APK, for a device on a cable
npm run android:bundle # a release AAB, for Play — needs signing configured
```

Signing for release: make the upload key once (`keytool`, see
`android/keystore.properties.example`), copy the example to
`android/keystore.properties` and fill in the passwords. Both files are
git-ignored; `android/app/build.gradle` signs the release build with the key
when the file is present and leaves it unsigned when it is not. Play's own App
Signing then takes over from the upload key. `store/PLAY-STORE.md` has the
listing, the declarations and the route from account to production, and
`scripts/shoot-store.js` takes every store's screenshots from the live pages.

**iOS and macOS** — needs macOS and Xcode. Capacitor 8 wires its plugins with
Swift Package Manager, so there is no CocoaPods step and no workspace: `cap
sync` resolves `ios/App/CapApp-SPM` and Xcode opens the project directly.

```
npm run ios            # sync, then open App.xcodeproj
```

In Xcode: set the team on the App target, confirm the bundle identifier is
`ai.visualneuroscience.app`, then Product → Archive → Distribute App.

One archive covers every Apple platform. The iPad app is offered as it is on
Apple Vision Pro and on Macs with Apple silicon, which the project opts into
in its build settings, so there is no Mac or Vision archive to make.
`store/APP-STORE.md` has the submission route and `store/MAC-APP-STORE.md`
the two switches that put the same build on the Mac App Store.

## Icons and splash

`npm run icons` draws every icon and splash the three targets use from the
app mark: the brain wired with circuit traces and nodes, drawn as line
vectors from the owner's drawing by `../scripts/appmark/trace.py` (the drawing is `brain.jpg`
beside it; run the script again if the drawing changes) into
`../site/assets/app-mark-colour.svg`, which wears the ring's colours swept
round it as the ring carries them, and `../site/assets/app-mark.svg`, the
path alone in currentColor for the mono icon. The web mark in the masthead
and the browser tab is still the ring, `../site/assets/logo.svg`. In both
files the outline is one closed path, each trace a path of its own, each
node a circle and, since v11.90, the corners where they meet small filled
fillets, so the drawing reads as one soft line.

The mark carries no ground, so the script chooses it: white for every app
icon (since v11.85, in colour since v11.86), the paper black for the splash
screens. **Apple rejects
an icon with an alpha channel outright**, and Android masks the foreground
layer into whatever shape the launcher wants, so the opaque tiles carry their
ground themselves and the maskable and adaptive foregrounds keep the brain
inside the middle 66% of the canvas. The script also cuts the Android launcher
sets and the splash drawables at the sizes `npx capacitor-assets generate
--ios --android` would cut them from `resources/`, so that command is optional
now and gives the same files when run after `npm run icons`.

The iOS app carries a second icon, `AppIcon-Black.appiconset`, the same
brain on the paper black, drawn by the same script. The project names it in
`ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES`, which is all the catalog
needs for `setAlternateIconName`, and the Account tab's App icon choice
(`IconTileChoice`, `IconTile` and `AppStore.iconTile` in `Shell.swift`: the two
tiles pictured from `IconTileWhite.imageset` and `IconTileBlack.imageset`,
which this script draws, with a box around the one in use) asks the system
for it;
the system keeps the choice itself, shows its own notice as the icon changes,
and the switch reads the icon back on every launch. The box shows only where
the system supports alternate icons, the iPhone and the iPad. Android's
launcher and the web app's home screen take one icon at install, the white
one.

## Apple's Guideline 4.2

Apple rejects an app that is a website in a webview and nothing more. What is
here that a browser tab is not:

- **It has no network.** Every scan, the atlas, the tractogram and the viewer
  are in the bundle. The app works in a basement.
- **It is built for touch.** One vocabulary on every diagram on every page:
  pinch zooms, two fingers pan, one finger turns whatever turns — the 3D
  renders and the 2D slices (`site/assets/zoom.js`), and the cartoons, ring,
  graph, circuit diagrams and study figures (`site/assets/diagram-gestures.js`).
  Double-tap puts a view back. The desktop speaks the same language through
  ctrl+wheel, trackpad pinch and shift+drag.
- **A snapshot goes where a phone puts pictures** — Photos, Files, or the share
  sheet — rather than into a downloads folder a phone does not really have.
- **It is laid out as an iPhone app**: a native tab bar and native section
  pages, with each of the site's pages pushed inside its tab under the
  system's navigation bar (the iOS tab bar section above).
- **Haptics** on region selection.
- **The device's own furniture is respected**: safe areas around the notch and
  the home indicator, no rubber-band scrolling, no long-press callout on a
  canvas being dragged.

The typefaces are self-hosted now, so the pages ask nothing of the network
for themselves; the `INTERNET` permission stays for the optional account, the
newsletter box and the links out.

On Android 15 and later the system draws the app edge to edge, so
Capacitor's SystemBars plugin is asked (in `capacitor.config.json`) to inject
the real insets as `--safe-area-inset-*` variables, and `site/assets/viewer.css`
takes the larger of those and the browser's own `env()` values when it pads the
app bar and the body. The website never sees either.

## Version numbers

`android/app/build.gradle` carries `versionCode`/`versionName`; Xcode carries
the marketing and build numbers. They are not tied to the website's release
tags — the site ships continuously and a store build does not.
