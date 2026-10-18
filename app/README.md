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
| About | `info.circle` | the developer's message, YouTube, Instagram, LinkedIn and email, the MCP server |
| Account | `person` | the account page (sign-in, your data, deletion), Appearance (dark or light), support and the privacy page, the credits |

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
  `site/fonts` into `ios/App/App/Fonts/` and listed under `UIAppFonts`.

**The pages** (`ios/App/App/ShellWeb.swift`). Each page a box opens gets a
Capacitor bridge of its own, opened on that page, so sign-in, Files, the share
sheet and haptics work there as before. A link from one page to another is
caught by a small plugin in that bridge (`ShellLinks`) and pushed as a new
page in the same tab, so each web view holds one page and Back is the
system's; popping a page lets its bridge go. In those bridges the splash is
off and the status bar plugin is replaced by one that does nothing
(`StillStatusBar`), because the real one resizes its web view to the whole
window whenever any bridge appears. The Firebase plugin keeps a small object
per page opened, since it never removes its auth listeners; the web view
itself is freed.

The theme is the shell's: Account's Appearance switch sets it, the shell
writes it into each page before the page runs and presses the page's own
theme switch when it changes while the page is open. The first page to open
after the update reports the theme the web app last used, and the shell keeps
that, so nobody's choice is lost. A page knows it is in the tabs by
`data-shell="tabs"` on its root element: `site/assets/navbar.js` then draws no
bar of its own and `site/assets/viewer.css` drops the room it kept for one.
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

`npm run icons` redraws every size from `../site/assets/logo.svg`, then
`npx capacitor-assets generate --ios --android` cuts the platform sets from
`resources/`.

The web mark has no background — it is the ring alone, so it works on a light
page and a dark one. An app icon cannot be that: **Apple rejects an icon with
an alpha channel outright**, and Android masks the foreground layer into
whatever shape the launcher wants. So the store icons put the ring on the
site's own paper black, and the platform draws the tile around it. This is not
the black disc the web mark used to carry; it is the ground every app icon has.

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
