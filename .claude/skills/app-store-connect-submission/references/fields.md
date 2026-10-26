# Every field, page by page

As App Store Connect laid them out in October 2026. Apple moves fields
between pages and adds new ones every year; when the person's screenshot or
the live page disagrees with this file, the page wins, and say so in the
sheet.

**F** marks a field met only on a first submission (of the app, or of a new
platform for it), **U** one met only on an update. Limits are characters;
the keywords' limit is checked in bytes too, which is the stricter reading.
Section 11 says which fields belong to the whole app record, shared by
every platform, and which each platform's version page has of its own.

## Contents

0. The account and the build
1. The New App dialog (F)
2. App Information
3. Pricing and Availability
4. App Privacy
5. App Accessibility
6. The version page
7. Export compliance
8. Submitting
9. Localisations
10. Where each answer comes from
11. Shared by every platform, or one per platform

## 0. The account and the build

Not text, but a submission stalls on them. **Once, for the account**:

- The developer account is active and the agreements in Business are
  accepted (free apps need only the standard one; a price or in-app
  purchase needs the paid agreement, tax and banking).
- **EU Digital Services Act**: the account declares once whether it is a
  trader. Without a declaration the app is not offered in the EU; a
  trader's address, phone and email appear on the EU product page.
- The bundle identifier is registered with the capabilities the app uses
  (Sign in with Apple, push, associated domains, app groups).

**Every build**, read from the project before the text is written, since a
build that fails here wastes the review:

| Check | Where | What goes wrong without it |
|---|---|---|
| The version string equals the version page's | `MARKETING_VERSION`, `CFBundleShortVersionString` | the build cannot be picked, or, on a page renamed after its build was picked, the two disagree |
| The build number is higher than every build uploaded for this version | `CURRENT_PROJECT_VERSION`, `CFBundleVersion` | the upload is refused as a duplicate |
| The bundle identifier is the record's | `PRODUCT_BUNDLE_IDENTIFIER` | the upload finds no record; a new platform's build must carry the record's identifier |
| An app icon in the asset catalog | `*.xcassets` (`AppIcon`, or a `.icon` file from Icon Composer) and `ASSETCATALOG_COMPILER_APPICON_NAME` | the upload fails validation; iOS wants one 1024-pixel image without transparency, visionOS a layered image (a back layer and up to two more, 1024 pixels each), macOS its icon set |
| `ITSAppUsesNonExemptEncryption` | `Info.plist` | every build waits as Missing Compliance until the question is answered by hand |
| A privacy manifest declaring the required-reason APIs used | `PrivacyInfo.xcprivacy`; `UserDefaults` and `@AppStorage`, file timestamps, disk space, system boot time | the upload is refused or warned (ITMS-91053) |
| A purpose string for every permission the code asks for | the `NS…UsageDescription` keys | the upload is refused |
| The SDK Apple requires now | the Xcode the build was made with | Apple raises the minimum each spring; an older SDK's upload is refused |
| The device families | `TARGETED_DEVICE_FAMILY`, the destinations | a slot App Store Connect requires for a family the build supports, and screenshots that claim a device the build does not support |
| The entitlements the features need | `*.entitlements` | Sign in with Apple, iCloud or push failing in review |

## 1. The New App dialog (F)

| Field | Limit | Notes |
|---|---|---|
| Platforms | | iOS, macOS, tvOS, visionOS; more can be added later with Add Platform under the same bundle identifier |
| Name | 30 | unique on the store; later changes ship only with a new version |
| Primary Language | | the localisation shown where no other matches |
| Bundle ID | | must equal the build's |
| SKU | | private and unique, never shown; the bundle identifier will do |
| User Access | | Full unless some team members should not see the app |

## 2. App Information

App-level; edits here ship with the next version that goes out.

| Field | Limit | Notes |
|---|---|---|
| Name | 30 | per localisation |
| Subtitle | 30 | per localisation; optional but indexed for search; must not repeat the name |
| Category | | primary, and an optional secondary |
| Content Rights | | "Does your app contain, show, or access third-party content?" Yes for licensed data, images, text or media; then confirm the rights are held |
| Age Rating | | the questionnaire; see questionnaires.md |
| License Agreement | | Apple's standard EULA unless the owner has a custom one; leave the field empty for the standard |

## 3. Pricing and Availability

No text, but in the sheet as decisions: price (free or a price), the
countries, pre-orders (F), the switches that offer an iPhone and iPad app on
Apple silicon Macs and on Apple Vision Pro, and the tax category.

## 4. App Privacy

| Field | Limit | Notes |
|---|---|---|
| Privacy Policy URL | | required for every app; localisable; older guides put it under App Information |
| User Privacy Choices URL | | optional: a page where people manage their data choices |
| Data collection | | the questionnaire; see questionnaires.md; press Publish after any change |

## 5. App Accessibility

The accessibility labels, per device family; see questionnaires.md.
Optional, and better left unclaimed than claimed wrongly.

## 6. The version page

One per platform and version; the text fields are per localisation.

| Field | Limit | Kind | Notes |
|---|---|---|---|
| App Previews | 3 per size | | 15 to 30 second videos, optional; they play before the screenshots; see screenshots.md |
| Screenshots | 1 to 10 per size | | which sizes are required changes; read the slot list on the page; sizes in screenshots.md |
| Header and Search Results | | | optional product page header and search results artwork (2026), separate from screenshots; see screenshots.md |
| Promotional Text | 170 | | changes at any time without a review |
| Description | 4000 | | plain text, line breaks kept, no markup |
| Keywords | 100 | | comma-separated |
| Support URL | | | required; must lead to a way to contact the developer |
| Marketing URL | | | optional |
| Version | | | the build's `CFBundleShortVersionString`, exactly |
| Copyright | | | the year and the rights holder, e.g. `2026 Fadil Karim`; the store adds the sign |
| What's New in This Version | 4000 | U | not shown on a first version |
| Routing App Coverage File | | | navigation apps only |
| App Clip, iMessage App, Game Center | | | only if the app has them |
| In-App Purchases and Subscriptions | | | a first purchase is submitted with a version |
| Build | | | the TestFlight build whose version matches the page |
| Sign-in required | | | tick if any feature needs an account; then User name and Password |
| Contact: First name, Last name, Phone, Email | | | a person who answers during review |
| Notes | 4000 | | see writing.md |
| Attachment | | | a video or document for anything a reviewer cannot reach |
| App Store Version Release | | | manual; automatic; automatic no earlier than a date |
| Phased Release for Automatic Updates | | U | seven-day ramp for automatic updates, pausable |
| Reset Rating | | U | resets the summary rating when this version goes out |

While a version waits for review, its text can still be edited; changing
the build means removing the version from review, which puts it back in the
queue.

## 7. Export compliance

`ITSAppUsesNonExemptEncryption` in `Info.plist` answers it at upload. `NO`
(false) when the app's only encryption is the system's own, for HTTPS and
the like, which is exempt. An app with its own or non-standard encryption
answers the questions and may need to upload documentation. Without the key
every upload stops at the question.

## 8. Submitting

Add for Review puts the version in a draft submission; Submit for Review
sends it. Each platform has its own version page and its own submission: a
macOS or visionOS draft sitting at Prepare for Submission never holds up
the iOS review, two platforms' versions can be in review at once, and
either may be approved first. What they share (section 11) is one set for
the record: change it with the version meant to carry it, and leave it
alone while a sibling's version is in review.

## 9. Localisations

Every localisable field (Name, Subtitle, Promotional Text, Description,
Keywords, What's New, the URLs) is written per localisation the app lists.
A localisation with no text of its own falls back to the primary language.
Keywords are per storefront language too.

## 10. Where each answer comes from

Read these before asking the person anything:

| Answer | Where to look |
|---|---|
| Bundle ID, version, build number | the Xcode project (`PRODUCT_BUNDLE_IDENTIFIER`, `MARKETING_VERSION`, `CURRENT_PROJECT_VERSION`), `Info.plist`, `capacitor.config.json`, `app.json`, `pubspec.yaml` |
| Previous text | `submissions/` in the store folder, the project's listing notes, fastlane metadata, `scripts/live_listing.py` |
| What changed | the release ledger, `CHANGELOG`, tags or commits between the approved build and this one |
| Accounts and sign-in methods | the auth SDK and its providers in code and config; Sign in with Apple must be offered beside any third-party sign-in (4.8) |
| Account deletion path | the in-app screen and the deletion web page (5.1.1(v)) |
| Data collected | the package manifests (`package.json`, `Package.swift`, `Podfile`, `build.gradle`): analytics, crash reporting, auth, mailing lists, payments, ads |
| Permissions | the `NS…UsageDescription` keys in `Info.plist`, each a feature to explain |
| Encryption | `ITSAppUsesNonExemptEncryption` in `Info.plist` |
| Policy, terms, support URLs | the site's pages; test that they load and that the support page shows a contact |
| Licences and third-party content | the project's permissions or credits record |
| Offline, hardware, external links, purchases, AI calls | the code paths themselves, then the owner's notes |
| The owner's own wording | the handover file, the listing notes, the About page |

## 11. Shared by every platform, or one per platform

An app on several platforms is one record: one name, one bundle
identifier, one set of answers about privacy and age. Each platform has
its own version pages. A new platform's sheet records the shared fields as
they stand and changes none of them unless the change is meant for every
platform.

| One set for the record, shared by every platform | One per platform, on each version page |
|---|---|
| Name and Subtitle (per localisation) | Screenshots, App Previews (per display, per localisation) |
| Category, Content Rights, License Agreement | Promotional Text, Description, Keywords, What's New (per localisation) |
| Age Rating | Support URL, Marketing URL (per localisation) |
| Privacy Policy URL, User Privacy Choices URL, the App Privacy answers | Version, Copyright, Build |
| Pricing and Availability | App Review Information: sign-in, demo account, contact, notes, attachment |
| The App Accessibility page, which holds one set of labels per device family | Release option, Phased Release, Reset Rating |

Releasing an app made for a platform where the record's iPhone and iPad
app already runs (Apple Vision Pro, a Mac with Apple silicon) replaces that
app there: people on that device get the new platform's app, and lose
whatever it does not have. Weigh it before releasing, and choose a manual
release.

