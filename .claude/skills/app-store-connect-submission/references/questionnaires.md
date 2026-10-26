# The questionnaires

Every answer comes from the audit (`fields.md`, section 10), and each goes
into the sheet with the line of code or the page that justifies it, so the
next update can check what changed.

## Contents

1. App Privacy
2. Age rating
3. Accessibility labels
4. Export compliance
5. Content rights
6. Release options
7. Pricing and availability

## 1. App Privacy

"Do you or your third-party partners collect data from this app?" Data an
SDK sends counts as collected by the app. Data that never leaves the device
is not collected.

The answers are one set for the whole record and describe the app on every
platform. A new platform that collects nothing the others do not changes
nothing here; one that collects something new adds its rows, and the
privacy policy names it.

**Data types** (Apple's list): Contact Info (Name, Email Address, Phone
Number, Physical Address, Other User Contact Info); Health & Fitness;
Financial Info; Location (Precise, Coarse); Sensitive Info; Contacts; User
Content (Emails or Text Messages, Photos or Videos, Audio Data, Gameplay
Content, Customer Support, Other User Content); Browsing History; Search
History; Identifiers (User ID, Device ID); Purchases; Usage Data (Product
Interaction, Advertising Data, Other Usage Data); Diagnostics (Crash Data,
Performance Data, Other Diagnostic Data); on visionOS, Surroundings and
Body; Other Data.

**For each type collected**: the purposes (Third-Party Advertising,
Developer's Advertising or Marketing, Analytics, Product Personalization,
App Functionality, Other Purposes); whether it is linked to the person's
identity; whether it is used to track them across other companies' apps
and sites (only with an advertising SDK or data broker, and then the app
must ask permission first).

The usual rows for an app with accounts, analytics and a newsletter:

| Found in the code | Row | Linked | Purposes |
|---|---|---|---|
| Account email, name | Contact Info → Email Address, Name | yes | App Functionality (+ Developer's Advertising or Marketing if sign-up offers a mailing list) |
| Account id, username | Identifiers → User ID | yes | App Functionality |
| Saved files, progress | User Content → Other User Content | yes | App Functionality |
| Analytics screens and events | Usage Data → Product Interaction | no | Analytics |
| Analytics install identifier | Identifiers → Device ID | no | Analytics |
| Crash reporting | Diagnostics → Crash Data | no | App Functionality |
| Advertising identifier | not collected when the SDK is built without it | | |

Write the rows into the sheet as a table. A change of data practice since
the last version means editing the answers and pressing Publish; the
privacy policy changes with them.

## 2. Age rating

The questionnaire was rebuilt in 2025: the ratings are 4+, 9+, 13+, 16+ and
18+, and it opens with the app's features and capabilities (in-app controls
such as parental controls or age checks, unrestricted web access,
user-generated content, messaging or chat, advertising), then the content
groups (mature themes, profanity and crude humour, horror or fear, alcohol,
tobacco or drug use or references, sexual content or nudity, violence,
medical or treatment information, health or wellness topics, gambling,
contests and loot boxes), each None, Infrequent or Frequent, or Yes or No.
Answer each question as it appears on screen, from the content:

- A reference to a substance in a scientific sense is still a reference
  (Infrequent, not None); under-rating is what a reviewer corrects.
- Medical or treatment information means advice or treatment the app gives,
  not anatomy or pharmacology it explains.
- Links that open in the system browser are not unrestricted web access; a
  built-in browser to any address is.

Record in the sheet each answer that is not None or No, with the screen
that causes it, and the rating App Store Connect computed.

The rating is one for the record. A new platform's app must be covered by
the answers already given; if it shows something the others do not, the
answers change for every platform.

## 3. Accessibility labels

Per device family (iPhone, iPad, Mac, Apple TV, Apple Vision Pro, Apple
Watch), the features a person can rely on for the app's common tasks; a new
platform adds its own family's set, claimed from that platform's app alone: VoiceOver, Voice Control, Larger Text, Dark Interface, Differentiate
Without Colour Alone, Sufficient Contrast, Reduced Motion, Captions, Audio
Descriptions.

Claim a feature only if the common tasks can be completed with it on that
device, and say in the sheet how that was known (tested, or the code
path). Leaving a label unclaimed is honest; claiming one that fails is a
complaint waiting to happen. Pointers for the audit:

- **Dark Interface**: a dark theme that follows the system or a switch.
- **Reduced Motion**: animations that stop or fade when the setting is on
  (`prefers-reduced-motion`, `UIAccessibility.isReduceMotionEnabled`).
- **Larger Text**: text that grows with the system size. A web view does
  not follow Dynamic Type unless the page is built to; test before claiming.
- **VoiceOver, Voice Control**: every control labelled; the main tasks
  reachable without a drag-only gesture. Canvas and 3D views usually need
  separate controls to qualify.
- **Captions, Audio Descriptions**: only for apps with video.

## 4. Export compliance

`ITSAppUsesNonExemptEncryption` = `NO` in `Info.plist` when the only
encryption is the system's for HTTPS and similar (exempt). Otherwise answer
the questions at upload and keep the classification on file.

## 5. Content rights

Yes when the app shows or uses third-party content: licensed datasets,
images, text, music, maps. Then confirm the rights are held, and keep the
licence record the project has (a permissions file) in step with the
description's credits.

## 6. Release options

- **App Store Version Release**: manual for a first version or a launch
  that should land on a chosen day; automatic for routine updates; a date
  for a planned launch.
- **Phased release** (updates): spreads automatic updates over seven days
  and can be paused; worth it when the update touches accounts or data.
- **Reset rating** (updates): only when the old ratings describe problems
  this version fixes.

## 7. Pricing and availability

Free or a price; all countries or a list; the Mac and Vision Pro switches
for an iPhone and iPad app. One set for the record. Releasing the record's
own app for Vision Pro or the Mac replaces the iPhone and iPad app there
for everyone on that device, whatever the switch says: what the new app
lacks, they lose. Say so to the person before a new platform's first
release, and choose a manual release for it.
