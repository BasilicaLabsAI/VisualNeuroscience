# Publishing to the Mac App Store

The Mac app is the same target as the iPhone and iPad app. **Mac Catalyst** is
enabled on both build configurations, so one Xcode project, one codebase and
one App Store Connect record cover all three. There is no separate Mac project
to keep in step, and `../../site` is still the whole application.

Catalyst builds against the iOS SDK on macOS, and the Swift package already
declares `platforms: [.iOS(.v15)]`, so nothing in the dependency graph needed
changing.

---

## What was set up

- `SUPPORTS_MACCATALYST = YES` on Debug and Release.
- `SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = NO` — this is a real Catalyst build,
  not the Apple-Silicon-only shim that runs the iPad binary in a window.
- `App/App.entitlements`, wired into both configurations. The Mac App Store
  requires a sandboxed app; this one asks for almost nothing:

  | entitlement | why |
  |---|---|
  | `com.apple.security.app-sandbox` | required by the store |
  | `com.apple.security.files.user-selected.read-write` | so a saved snapshot can go where the reader puts it |

  No network entitlement is requested, because the app makes no network calls.
  That absence is worth keeping — it is the strongest claim the listing has.

---

## One checkbox to set in Xcode

Open the **App** target → **General** → *Supported Destinations*. Mac will be
listed. Under the Mac Catalyst interface setting, choose:

- **Optimize Interface for Mac** — Mac-native control sizes and metrics, and
  text at its true size. This is the right choice here: the pages are a
  document, not an iPad UI, and they are already responsive at Mac widths.
- *Scale Interface to Match iPad* renders the whole app at 77%, which makes
  small type small twice over.

I have not set this in the project file. The build setting behind that radio
button is not one I could verify without Xcode in front of me, and writing a
guessed key into the project is worse than a ten-second click.

---

## Signing and identifiers

Catalyst apps need the macOS platform enabled on the App ID, and their own
provisioning profile.

1. developer.apple.com → Identifiers → your App ID (`ai.visualneuroscience.app`)
   → tick **Mac Catalyst** alongside iOS.
2. In Xcode, with the Mac destination selected, *Automatically manage signing*
   issues the Mac certificate and profile.

The bundle identifier stays the same. Catalyst derives its own
`maccatalyst.<bundle-id>` internally; you do not create it.

---

## Archiving

1. Set the run destination to **My Mac (Mac Catalyst)**.
2. **Product → Archive.**
3. Organiser → **Distribute App → App Store Connect → Upload**.

The Build number is shared with the iOS uploads, so raise it for every archive
of either platform.

---

## The listing

In App Store Connect, the same app record grows a **macOS** tab beside iOS. It
takes its own screenshots, description and category, but the same name, bundle
ID and privacy answers.

**Screenshots** must be one of 1280 × 800, 1440 × 900, 2560 × 1600 or
2880 × 1800. The iPhone and iPad sets in `screenshots/` do not qualify — take
these from the running Mac app, which is the honest way round anyway.

**Category**: Education primary, Medical secondary, matching iOS.

**Privacy**: Data Not Collected, same as iOS. `PrivacyInfo.xcprivacy` is in the
target and covers the Mac build too.

---

## What is likely to go wrong here

**Sandbox violations at runtime.** A sandboxed app that tries to write outside
its container fails silently rather than loudly. The one path that writes is
the snapshot in `site/regions.html`, which goes through
`site/assets/native.js` → Capacitor Filesystem → `DOCUMENTS`. That is inside
the container and is fine. Test it anyway before submitting — it is the only
file the app ever creates.

**Guideline 4.2 again, and harder.** On a Mac the bar for "this is more than a
website" is higher, because the reader plainly has a browser already. The
answer is the same one and it is a good one: the app carries the MNI152
template, the AAL-116 atlas and the HCP1065 tractogram inside it and never
reaches the network. Say so in the review notes.

**Trackpad gestures.** macOS sends a pinch on a trackpad as a `wheel` event
with `ctrlKey` set, not as pointer events, so `site/assets/zoom.js` handles it
through the wheel path rather than the pinch path. Zoom works; it just gets
there differently. Two-finger scroll over a viewport also zooms, which is
deliberate — the stage claims the wheel so the page does not scroll out from
under a brain being turned.

---

## The cheaper alternative, if you want it on a Mac today

App Store Connect can publish the **iPad build unchanged** on the Mac App Store
— one checkbox, *"Make this app available on Mac"*, no build, no archive. The
trade: Apple Silicon Macs only, and it runs as an iPad app in a window rather
than a Mac app. Catalyst is better and it is already configured; this is only
worth knowing about if you want something on the Mac store before you have
tested the Catalyst build.
