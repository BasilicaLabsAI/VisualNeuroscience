# Google Play: the listing and the route, ready to paste

The same app as the App Store one, from the same `site/` files, built as an
Android App Bundle by the Capacitor project in `app/android`. Everything
below is within Google's limits (title 30, short description 80, full
description 4000). Google Play keeps line breaks in the full description
and allows no headings, so the capitals mark the sections as they do on
the App Store.

## Before anything: the account

1. A Google Play developer account at play.google.com/console, one-time
   fee of 25 USD, identity verified (a personal account needs a government
   ID and a phone number; an organisation account needs a D-U-N-S number
   and takes longer). Use the public contact address
   fkarim@visualneuroscience.ai as the developer email: it shows on the
   listing.
2. **A personal account made after November 2023 must run a closed test
   first**: at least 12 testers opted in, continuously, for 14 days, before
   the console lets the app apply for production access. Plan for it: make
   the closed-testing track, add a tester list (Google Groups or emails),
   send the opt-in link, and only then apply. An organisation account has
   no such gate.
3. Developer name shown on the store: `Fadil Karim` or `OttomanLabs`,
   whichever the account is verified as.

## Signing

The upload key is made once and kept outside the repository:

```
cd app/android
keytool -genkeypair -v -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
cp keystore.properties.example keystore.properties     # fill in the passwords; both files are git-ignored
```

`app/build.gradle` signs the release build with it when the file is there.
Play App Signing (on by default when the app is created) keeps the real
signing key on Google's side; the upload key only signs uploads, and Google
can reset it if it is ever lost.

Before the first upload, give Firebase the fingerprints, or Google sign-in
will fail on Android: Play Console → Setup → App signing shows the SHA-1
and SHA-256 of both the app signing key and the upload key. Add all four
to the Android app in the Firebase console (project settings → your
Android app), then download `google-services.json` again into
`app/android/app/`. `docs/AUTH-SETUP.md` §5 has the whole Firebase side.

## Build and upload

```
cd app
npm install
npm run android:bundle          # cap sync android, then gradlew bundleRelease
```

The bundle lands at `android/app/build/outputs/bundle/release/app-release.aab`.
Version 1.1, versionCode 2 (`android/app/build.gradle`); bump versionCode
with every upload, it can never repeat. Upload the .aab on the testing or
production track, and the console runs its pre-launch report on real
devices (phones, tablets, a Chromebook); read it, it is free QA.

Targets: minimum Android 7.0 (API 24), target and compile API 36, 64-bit
by default (there is no native code of our own; Firebase's libraries are
64-bit). Phones, tablets, foldables and Chromebooks all install the same
bundle; nothing is locked to portrait, and the layout answers to width
and height as the website does.

## Main store listing

**App name** (19/30)

```
Visual Neuroscience
```

**Short description** (78/80)

```
Interactive brain atlas: regions, Brodmann areas, tracts and receptors. Offline.
```

**Full description** (3929/4000)

```
Visual Neuroscience is an interactive atlas of the human brain, built for anyone learning neuroanatomy without a lab or a licence. Turn a real MNI152 brain, tap through its regions, search Brodmann areas by what they do, follow the white-matter tracts, go down to the cell and the molecule, and see published studies drawn on the scan itself. Everything ships inside the app and renders on your device, so it works on a train, at the back of a lecture theatre, or in aeroplane mode.

WHAT IS INSIDE

• Region Atlas: the MNI152 template with the AAL-116 parcellation. Pick any region, highlight it in three planes and in 3D, and read what it does.
• Brodmann Areas: the classic cortical map, lateral and medial views, every area selectable and searchable by function, lit on the same scan.
• Tractography: the HCP1065 whole-brain tractogram. Rotate it, zoom it, follow the bundles.
• Receptor density: where the major neurotransmitter receptors sit, from published PET and autoradiography, with a source behind every number.
• Network Atlas: the brain's large-scale networks and the states they move between, region by region.
• Microanatomy: a neuron drawn part by part, with every structure to tap and a quiz to learn them; the neurotransmitters drawn as chemists draw them; and a hundred and fifty receptors, channels and transporters, each with the drugs that act on it.
• Molecular: the dopamine and serotonin receptors in 3D, from experimental structures. Watch the neurotransmitter dock and switch the receptor on, see where antipsychotics, triptans, LSD and psilocin sit in the same pocket, and compare the subtypes.
• Visualising Studies: published papers drawn onto the scan, beginning with a study of auditory hallucinations in schizophrenia.
• Digital Textbook: OpenStax's Introduction to Behavioral Neuroscience in full, nineteen chapters, with every figure and reference.
• Practice: adaptive questions that score as you go, lean toward what you keep getting wrong, and explain every answer. The first bank follows the KCL MSc Neuroscience syllabus.

MADE FOR TOUCH, AND FOR A DESK

Pinch to zoom on every scan and diagram, two fingers to pan, one to rotate. On a Chromebook the same gestures work with a pointer. Snapshots go to your photos or the share sheet.

WORKS OFFLINE

The template, the atlases and the tractogram are inside the app. The anatomy never touches the network. Put the device in aeroplane mode and every page still works.

AN ACCOUNT, ONLY IF YOU WANT ONE

Sign in with Google or email to keep your practice progress across your phone, tablet and the web. Nothing requires an account, nothing is sold, and there is no advertising and no tracking. Delete the account from inside the app whenever you like.

BUILT ON OPEN DATA

The MNI152 template, the AAL parcellation, the MRIcron Brodmann atlas and the HCP1065 tractogram, rendered with NiiVue; receptor structures from the Protein Data Bank. Each page says where its data came from and where the evidence stops.

Brodmann Areas diagram adapted with permission from IFEN – Institute for EEG-Neurofeedback / Neurofeedback Academy (neurofeedback-academy.com).

WHO IT IS FOR

Students revising between lectures. Lecturers who want a live brain on the screen instead of a slide. Clinicians who need a region and its function in a moment. And anyone who wanted to study this and was priced out.

Built in full by one engineer who finished a postgraduate certificate in neuroscience at King's College London and kept learning by building the free map of the brain he had wanted. It is a one-person project with a short feedback loop: if something is missing for your course, write, and it usually ships within the week.

Not a medical device and not a diagnostic tool. An educational reference that summarises published work and draws published atlases, with its sources on every page.

Also on the web at visualneuroscience.ai and on the App Store.
```

**Category**: Education. **Tags**: Education, Medical, Science.

**Contact details**: email fkarim@visualneuroscience.ai, website
https://visualneuroscience.ai. Phone is optional; leave it out.

**Privacy policy**: https://visualneuroscience.ai/privacy.html

## Graphics

All in `app/store/play/` and `app/store/screenshots/`.

| Asset | File | Google's rule |
|---|---|---|
| App icon | `play/icon-512.png` | 512 × 512 PNG; Google draws its own rounded mask |
| Feature graphic | `play/feature-graphic.jpg` | 1024 × 500, no transparency; rendered from `play/feature-graphic.html` |
| Phone screenshots | `screenshots/android-phone-*.png` | 1080 × 2160; 2 to 8 of them, no side more than twice the other |
| 7-inch tablet | `screenshots/android-7-*.png` | 1200 × 1920; up to 8 |
| 10-inch tablet | `screenshots/android-10-*.png` and `android-10-land-*.png` | 1600 × 2560 and 2560 × 1600; up to 8 |

Nine pages are shot for each family, numbered 01 to 09: home, atlas,
Brodmann, tracts, network, microanatomy, molecular, practice, textbook.
Play takes eight per device type, so leave one out; the Brodmann shot
(03) is the one to drop, since the atlas shot already shows the map. For
the 10-inch slot use the portrait set, or mix in two of the landscape ones
where the studio pages read better. Retake them all with
`node scripts/shoot-store.js <outdir>` from `app/` whenever the pages
change; the iPhone and iPad families come out of the same run.

## App content declarations

Every one of these is in Play Console → Policy → App content, and the
listing cannot go live with any of them blank.

**Privacy policy**: the URL above.

**Ads**: No, the app contains no ads.

**App access**: All functionality is available without special access.
Note for the reviewer, since there is a Log in button:

```
No feature requires an account. Log in is optional and only keeps practice progress and saved models across devices; Google and email sign-in are offered. The anatomy works with the network off: the MNI152 template, the AAL and Brodmann atlases and the HCP1065 tractogram ship inside the app. It is an educational reference, not a diagnostic or clinical tool.
```

**Content rating** (the IARC questionnaire; the app is a Reference,
News, or Educational app): No to violence, sexual content, profanity,
controlled substances *use*, gambling, user interaction and sharing of
location. **Drug references**: answer that the app *references*
substances in an educational or pharmacological sense, if the
questionnaire offers the distinction, or say Yes to "references to
alcohol, tobacco or drugs" and No to depicting their use: the receptor
pages and the Molecular section name LSD, psilocin, ketamine, cocaine,
nicotine and cannabis as ligands, and the hallucinations study names
antipsychotics. Expect Everyone or PEGI 3, at most Teen or PEGI 12,
either fine.

**Target audience and content**: age groups 18 and over only. The app is
not designed for children and choosing any under-18 group brings the
Families policy with it. "Could the app unintentionally appeal to
children?" No.

**News app**: No. **COVID-19 contact tracing**: No. **Government app**:
No. **Financial features**: none. **Health**: none of the listed
categories (it is education, not a health service).

**Data safety**. Does the app collect or share user data: Yes (only when
someone signs in or asks for the newsletter). Encrypted in transit: Yes.
Users can request deletion: Yes, and the deletion link is
https://visualneuroscience.ai/privacy.html#delete-account. Then the types:

| Data type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Personal info → Name | Yes | No | Yes, only with an account | Account management |
| Personal info → Email address | Yes | No | Yes, with an account or the newsletter | Account management; for the newsletter, Developer communications |
| Personal info → User IDs | Yes | No | Yes, only with an account | Account management, App functionality |
| App activity → Other user-generated content | Yes | No | Yes, only with an account | App functionality (saved models and practice progress, so the account works on every device) |

Everything else: not collected. No data is shared with third parties for
their own use; Firebase (Google) and Mailchimp (Intuit) process it on our
behalf, which Google's form counts as collection, not sharing. Nothing is
used for advertising or analytics. The app does not use the advertising
ID.

**Advertising ID**: No.

## After the first release

- Each site release that matters to the apps is a new bundle: bump
  versionCode, build, upload, and write the release notes (500
  characters) from the ledger.
- The pre-launch report flags anything the Android WebView draws
  differently; the atlas pages need WebGL, which every supported device
  has.
- Play's tablet quality checks look for tablet screenshots, no locked
  orientation, and a layout that uses the width. All three hold.

## Not on Android

Sign in with Apple is not offered in the Android app (the auth
configuration keeps it for the Apple platforms), so the description says
Google or email. LinkedIn sign-in stays off everywhere until its worker is
deployed, as `docs/AUTH-SETUP.md` §7 says.
