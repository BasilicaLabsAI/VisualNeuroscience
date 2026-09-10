# Publishing to the App Store — iPhone and iPad

> The Mac build ships from this same target and record.
> See **[MAC-APP-STORE.md](MAC-APP-STORE.md)** for what differs there.

The project is already a universal app: `TARGETED_DEVICE_FAMILY = "1,2"`, both
idioms carry their orientations, and the layout was checked at 375, 393, 430,
834 and 1366 points wide with no horizontal overflow at any of them. There is
no separate iPad build to make and no separate listing to write — one binary,
one listing, two device families.

Deployment target is **iOS 15.0**.

---

## Before the first upload

**1. Apple Developer Program.** $99/year, at developer.apple.com. Enrolment as
an individual is usually same-day; as an organisation it needs a D-U-N-S number
and takes longer. Everything below waits on this.

**2. The bundle identifier.** Currently `ai.visualneuroscience.app`. This is
permanent once the app exists in App Store Connect — it cannot be changed
afterwards, only abandoned. Change it now if you want something else:

```
cd app
npx cap sync ios          # after editing appId in capacitor.config.json
```

**3. Register the identifier.** developer.apple.com → Certificates, Identifiers
& Profiles → Identifiers → **+** → App IDs → App. Enter the bundle ID and
tick one capability, **Sign in with Apple**, which the store build uses for
its Apple sign-in. No push, no iCloud, no background modes.

**4. Create the App Store Connect record.** appstoreconnect.apple.com → My Apps
→ **+** → New App.

- Platform: iOS
- Name: the public name, up to 30 characters, unique across the store
- Primary language, bundle ID, SKU (any private string — `visualneuro-001`)
- User access: Full

---

## Building the archive

On the Mac, from the repository:

```
cd app
npm install
npm run ios                     # copies ../site in, then opens App.xcodeproj
```

There is no CocoaPods step. Capacitor 8 wires its plugins with Swift Package
Manager — `cap sync` resolves the local package at `ios/App/CapApp-SPM` and
Xcode opens the project directly. If a plugin is ever added, `npm run sync`
is the whole of it.

In Xcode:

1. Select the **App** target → Signing & Capabilities → tick *Automatically
   manage signing* and choose your Team. Xcode issues the certificate and
   provisioning profile itself.
2. General → Identity: set **Version** (the public number, e.g. `1.0`) and
   **Build** (an integer that must rise with every upload — `1`, `2`, `3`…).
   A rejected build still burns its number.
3. Set the run destination to **Any iOS Device (arm64)**. Archive is greyed out
   while a simulator is selected.
4. **Product → Archive.**
5. In the Organiser window that opens: **Distribute App → App Store Connect →
   Upload**.

The upload is validated on the way in. Processing then takes anywhere from
minutes to an hour before the build appears in App Store Connect.

---

## Or let Xcode Cloud build it

Xcode Cloud is Apple's hosted build service, free for a small monthly
allowance of build minutes. Once a workflow exists, every push to `main`
is cloned, built, signed and uploaded to TestFlight by Apple, with no Mac
involved. The repository is ready for it: `ios/App/ci_scripts/
ci_post_clone.sh` installs Node, runs `npm ci` and the Capacitor sync on
Apple's machine, which is what a bare clone needs before it can build.

**Setting it up, once, from Xcode.**

1. Product → Xcode Cloud → Create Workflow. Choose the App product.
2. Grant access to your source code. The GitHub App called Xcode Cloud has
   to be installed on the GitHub account that owns this repository, with
   this repository selected. The dialog also lists the packages the app
   depends on (firebase, google, and so on). Those are public repositories
   and Xcode Cloud can read them without any grant; the buttons beside
   them can be left alone. Next enables once *this* repository is granted.
3. Review the workflow. The default is fine as a start: Archive for iOS on
   every change to `main`. Edit it and add a post-action **TestFlight
   Internal Testing** with your internal group, so each green build lands
   on your devices by itself.
4. Xcode Cloud manages signing with its own certificates, so nothing has
   to be exported from the Mac. It also sets the build number from its
   own counter on every run, so the Build field in the project no longer
   needs bumping by hand.

**Things that go wrong on the first run.**

- *Cannot find package in node_modules*: the post-clone script did not
  run. It must sit at `ios/App/ci_scripts/ci_post_clone.sh`, be executable
  (`chmod +x`, committed), and the workflow's project must be
  `ios/App/App.xcodeproj`.
- *Sign in with Apple entitlement not allowed*: enable the capability on
  the App ID at developer.apple.com → Identifiers, then re-run.
- The first build takes longer than later ones because Homebrew installs
  Node each time; five to ten minutes is normal.

## Apple Vision Pro and the Mac

Neither needs a separate build. Apple offers compatible iPad apps on Vision
Pro and on Macs with Apple silicon as they are, and this project opts into
both (the destinations *Apple Vision (Designed for iPad)* and *Mac (Designed
for iPad)* on the target). In App Store Connect the switches live under
Pricing and Availability: **iPhone and iPad Apps on Apple Vision Pro** and
**iPhone and iPad Apps on Mac with Apple silicon**. Turn both on. The Mac
side is described in `MAC-APP-STORE.md`, including how to try builds on a
Mac through TestFlight.

## iPhone Duo

Apple announced its first foldable on 9 September 2026: a 5.4-inch outer
display, a 7.6-inch near-square inner one, iOS 27, on sale 23 October.
The app runs on it as an iPhone app from day one — the target is the
universal iPhone-and-iPad binary with no fixed-size flag, so nothing
blocks the install and nothing letterboxes.

What makes it work *well* is the web layer, and that is done and
verified: every page declares `viewport-fit=cover` with safe-area padding
on the body (web and native alike, so notches, rounded corners and
whatever inset iOS 27 gives the hinge are respected), stage heights carry
`dvh` fallbacks so they track a viewport that changes size while the page
runs, and every viewport re-measures on resize — a fold or unfold is
exactly the Split View resize the pages already handle. A headless suite
folds and unfolds each main page through four live resizes between
phone-narrow and near-square and checks nothing clips, overflows or goes
stale.

Still waiting on Apple, none of it urgent:

- **Xcode 27.1** ships the iPhone Duo SDK and simulator "later this
  month" (developer.apple.com/iphone-duo). When Xcode Cloud moves to it,
  rebuild; until then builds are simply not Duo-aware, which is fine.
- **New Info.plist keys or size classes**, if any — the "Preparing your
  app for iPhone Duo" guide is not yet published. Check it when it lands.
- **Screenshots** at whatever sizes App Store Connect adds for the two
  displays: regenerate with the existing headless pipeline once the pixel
  sizes are published.

The legacy `armv7` entry in `UIRequiredDeviceCapabilities` is now
`arm64`, the documented value for every device that can run current iOS —
a 32-bit relic had no business gating installs on new hardware.

## Filling in the listing

Every field, written out and checked against the character limits, is in
[`LISTING.md`](LISTING.md). Paste from there. What follows is the reasoning.

**Screenshots** are in `app/store/screenshots/`, rendered at the two sizes
Apple asks for and scales the rest from:

- `iphone-6.9-*.png` — 1320 × 2868
- `ipad-13-*.png` — 2064 × 2752

Both sets are required for a universal app. Upload them under the 6.9" iPhone
and 13" iPad display sizes; App Store Connect derives the smaller ones.

**Support and privacy URLs.** Support URL:
`https://visualneuroscience.ai/about.html` (the page carries the support
contact, **fid@ottomanlabs.ai**, and the story). Privacy Policy URL:
`https://visualneuroscience.ai/privacy.html`.

**Privacy.** Depends on whether this build ships with accounts active
(`site/assets/firebase-config.js` non-null at sync time — it is, as of v6.4):

- *Accounts dormant*: answer **"Data Not Collected"** — no account, no
  analytics, no back end.
- *Accounts active* (the current default): declare **Contact Info → Email
  Address** and **Name**, and **User Content → Other User Content** (saved
  files) — each *linked to the user's identity*, purposes **App
  Functionality** and **Analytics** (used to identify the most popular
  features for improvement), and **never used for tracking** (answer No to
  tracking; nothing crosses to other companies' apps or sites). There is no
  advertising. Guideline 5.1.1(v) is satisfied in-app: tap your name →
  Delete account, which removes the saved files, the profile, and the
  account itself.

`PrivacyInfo.xcprivacy` is already in the target.

**Export compliance** is answered in `Info.plist` —
`ITSAppUsesNonExemptEncryption = false` — so App Store Connect will stop asking
on each upload.

**Age rating.** The questionnaire will ask about medical and drug references.
The hallucinations page discusses schizophrenia and antipsychotics in an
educational register; answer *Infrequent/Mild* for *Medical/Treatment
Information* and expect **12+**. Do not answer "None" — a reviewer who reads
the page will disagree with you, and a wrong rating is a rejection.

**Category.** Primary *Education*, secondary *Medical*.

**Review notes.** Worth writing, because it heads off the two questions this
particular app invites:

> The anatomy runs entirely offline — the MNI152 template, the AAL-116 atlas
> and the HCP1065 tractogram ship inside the bundle; aeroplane mode shows
> every page. It is an educational anatomy visualiser, not a medical device:
> it makes no diagnosis, takes no patient data, and every study page states
> the limits of what the imaging shows. The optional account (email sign-in,
> Firebase) only syncs a user's own saved selections between their devices;
> no feature is gated behind it, so no demo account is needed — everything a
> reviewer can do signed in, they can do signed out.

---

## What is most likely to go wrong

**Guideline 4.2 — Minimum Functionality.** The single real risk. Apple rejects
apps that are a website in a webview. The defences already in the build are
listed in `../README.md`: it works with the network off, pinch and drag are
native gestures rather than a scroll wheel, a snapshot goes to Photos and the
share sheet, there are haptics, and safe areas are honoured. If it is rejected
anyway, reply in Resolution Center pointing at the offline behaviour first —
it is the one thing a browser tab provably cannot do.

**Guideline 1.4.1 — Physical Harm / medical apps.** Anything that reads as
clinical gets extra scrutiny. The review note above, and the caveats already on
the pages, are the answer. Do not describe the app as diagnostic anywhere in
the listing.

**Guideline 2.1 — a crash on the reviewer's device.** The app loads 14 MB of
volumes at startup and renders them on the GPU. Test on the oldest device you
can get hold of before submitting; an iPhone on iOS 15 is the floor the project
claims.

**Bundle size.** ~14 MB of assets plus the shell. Comfortably under every
limit, and under the cellular download threshold.

---

## Afterwards

Releases can be set to publish automatically on approval or held for a manual
release date. TestFlight is worth using first: the same uploaded build can go
to internal testers immediately, with no review, which is the fastest way to
find out whether it actually runs on real hardware.

Each subsequent submission is: raise the Build number, Archive, Upload, and add
the build to a new version in App Store Connect.
