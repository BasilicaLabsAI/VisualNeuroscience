# Publishing to the App Store — iPhone and iPad

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
& Profiles → Identifiers → **+** → App IDs → App. Enter the bundle ID. No
capabilities need enabling: the app has no push, no sign-in, no iCloud, no
background modes.

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
npm run sync                    # copies ../site into the iOS bundle
cd ios/App && pod install       # first time, and after any plugin change
cd ../.. && npm run ios         # opens App.xcworkspace
```

Open **App.xcworkspace**, never `App.xcodeproj` — CocoaPods lives in the
workspace.

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

## Filling in the listing

**Screenshots** are in `app/store/screenshots/`, rendered at the two sizes
Apple asks for and scales the rest from:

- `iphone-6.9-*.png` — 1320 × 2868
- `ipad-13-*.png` — 2064 × 2752

Both sets are required for a universal app. Upload them under the 6.9" iPhone
and 13" iPad display sizes; App Store Connect derives the smaller ones.

**Privacy.** App Privacy → Get Started → answer **"Data Not Collected"**. That
is the truth: there is no account, no analytics, no back end, and every scan is
in the bundle. `PrivacyInfo.xcprivacy` is already in the target and says the
same thing in the form the reviewer's tooling reads.

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

> The app runs entirely offline — the MNI152 template, the AAL-116 atlas and
> the HCP1065 tractogram ship inside the bundle and no network request is made
> at any point. It is an educational anatomy visualiser, not a medical device:
> it makes no diagnosis, takes no patient data, and every study page states the
> limits of what the imaging shows.

No demo account is needed. There is nothing behind a login.

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
