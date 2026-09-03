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
| iPhone, iPad | the app bundle | everything is local already | App Store |
| Apple Vision Pro | the iPad app as it is | everything is local already | App Store, alongside the iPad app |
| Mac | parked: Mac Catalyst is switched off in the project until the Mac App Store is taken up | | |

`site/assets/native.js` is the seam. It asks Capacitor for a share sheet, a
haptic tick or a write to Photos when Capacitor is there, asks the browser for
its own version when it is not, and falls back to a plain download when neither
exists. Nothing on a page has to know which of the three it is running in.

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

Signing for release: create a keystore, then put `storeFile`, `storePassword`,
`keyAlias` and `keyPassword` in `android/keystore.properties` (git-ignored) and
reference it from `android/app/build.gradle`. Play's own App Signing then takes
over from the upload key.

**iOS and macOS** — needs macOS and Xcode. Capacitor 8 wires its plugins with
Swift Package Manager, so there is no CocoaPods step and no workspace: `cap
sync` resolves `ios/App/CapApp-SPM` and Xcode opens the project directly.

```
npm run ios            # sync, then open App.xcodeproj
```

In Xcode: set the team on the App target, confirm the bundle identifier is
`ai.visualneuroscience.app`, then Product → Archive → Distribute App.

The Mac build is the same target: Mac Catalyst is enabled on both
configurations, so one project produces the iPhone, iPad and Mac apps from the
same code. `store/APP-STORE.md` has the submission route for all three,
including what differs on the Mac.

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
- **Haptics** on region selection.
- **The device's own furniture is respected**: safe areas around the notch and
  the home indicator, no rubber-band scrolling, no long-press callout on a
  canvas being dragged.

The remaining honest gap is that the pages still ask Google for three
webfonts. Self-hosting them alongside `fonts/Flux-Regular.woff2` would let the
`INTERNET` permission come out of `AndroidManifest.xml` entirely and make
"works with no network" literally true rather than nearly true.

## Version numbers

`android/app/build.gradle` carries `versionCode`/`versionName`; Xcode carries
the marketing and build numbers. They are not tied to the website's release
tags — the site ships continuously and a store build does not.
