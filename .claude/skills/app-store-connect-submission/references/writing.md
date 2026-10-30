# Writing the fields

## Contents

1. The voice
2. Name and subtitle
3. Promotional text
4. Description
5. Keywords
6. What's New
7. Copyright and URLs
8. App Review notes
9. Metadata that gets apps rejected
10. A new platform's text

## 1. The voice

- **The owner's words first.** Reuse the approved listing and anything the
  owner wrote or approved, verbatim. A statement the owner chose for a
  screenshot or a line about themselves is not to be improved.
- **The project's spelling and register.** British spelling if its pages
  use it. Plain and specific: what the thing does, for whom, with what.
- **No claims the store refuses or the app cannot back**: no "best", "#1",
  "ultimate", no prices or "free for a limited time" in the name, subtitle
  or pictures, no medical claims, nothing the app does not do today.
- **No other platforms or stores** (Android, Google Play, Windows) anywhere
  in the metadata or the pictures (2.3.10). The app's own website is fine;
  "Sign in with Google" as a sign-in method is fine. Apple's own devices
  are not other platforms: a Vision Pro listing may say the app is also on
  iPhone and iPad.
- **No competitors' names or trademarks**, in the text or the keywords.
- **No AI assistant by name** (ChatGPT, OpenAI, GPT, and to be safe Claude,
  Gemini, Copilot, Kimi or any other) in any field or picture. App Review
  rejects such a listing for the China mainland storefront under Guideline
  5, since those services hold no permit there; an update was rejected so on
  30 October 2026 for one line in What's New, one in the description and a
  screenshot. Say what the feature does and "your AI of choice". The review
  notes may name them, since only App Review reads those.
- **No markup.** The description is plain text; App Store Connect keeps the
  line breaks. Capitals can stand for section labels, `•` for bullets.

## 2. Name and subtitle (30 each)

- The name is the brand, with at most a short descriptor. A name stuffed
  with search terms is rejected (2.3.7); a name close to another listing's
  invites a 4.3 similarity question, so check the store for near-matches.
- The subtitle says what the app is, in words people search, without
  repeating the name: "3D Human Brain Atlas", not "The brain atlas app".
  A subtitle that reads like a category ("Interactive brain atlas") sits
  close to every other app in it.
- Both are indexed for search, so their words stay out of the keywords.
- Both change only with a new version, while its page is editable.

## 3. Promotional text (170)

About the app as a whole, or the news of the moment; it changes without a
review, so it is the place for anything timely. Not indexed for search.

## 4. Description (4000)

The first two or three lines show before "more": say what the app is, for
whom, and the one fact that sets it apart. Then:

1. a feature list, one `•` line each, each a thing the person can do;
2. sections in capitals for what needs more than a line (offline use, the
   account, an AI connector, accessibility);
3. the account and privacy line, true to the audit ("Nothing requires an
   account, nothing is sold, no advertising and no tracking" only if so);
4. credits the licences require, word for word as the licence asks;
5. who it is for, and who made it, in the owner's words;
6. disclaimers the subject needs (not a medical device, not a diagnostic
   tool);
7. the website.

Keep a margin under 4000. For an update, start from the approved
description and change only what is no longer true or what the version
adds.

## 5. Keywords (100)

- Comma-separated with no spaces: a space is a wasted character.
- Single words; the store combines them into phrases.
- Nothing already in the name, the subtitle or the category's name.
- Singular forms; no duplicates; no "app", "free", "iPhone", "iPad".
- No competitors' names or trademarks; no misspellings.
- The audience's own terms (`neuroanatomy`, `MRI`, `Brodmann`) beat
  marketing words, and a term nobody else uses (`MNI152`, `AAL`) is cheap
  to own.

## 6. What's New (4000, updates only)

- **The changes since the version the public has**, not since the last
  TestFlight: everything between the last approved build and this one.
  Several releases of the project may sit between them; read all of them.
- Most noticeable first; one `•` line per change; each says what the
  person can now do or see, in their words.
- No file names, internal names, version-control or build talk, and no
  thanks to testers by name.
- Fixes in one line ("Fixes and polish throughout") unless a fix was felt
  by users.
- It must describe the changes (2.3.12): "Bug fixes" alone on a version
  that adds features is a rejection risk.
- The first three lines show before "more".

## 7. Copyright and URLs

- **Copyright**: the year and the rights holder as the seller is named
  (`2026 Fadil Karim`); no sign, the store adds it.
- **Support URL**: a page with a way to reach the developer (an email
  address or form). Reviewers open it.
- **Privacy Policy URL**: the live policy, and it must say what App Privacy
  says.
- **Marketing URL**: optional; the app's home page.
- All `https`, all loading; the checker's `--online` asks each.

## 8. App Review notes (4000)

Write for a reviewer with ten minutes and no context, in short paragraphs:

1. **What it is** in one line, and who it is for.
2. **How to reach every feature**: the tabs, the buttons, anything behind a
   sign-in, anything that needs a setting or hardware to see.
3. **Accounts**: whether sign-in is required; the demo account (in the
   fields, and kept alive until approval); the sign-in methods; the in-app
   deletion path (5.1.1(v)), the deletion web page, and that Sign in with
   Apple is revoked when an account goes, if it is.
4. **What could be misread**: physical goods sold outside the app (3.1.5(a)),
   links that leave the app, "coming soon" placeholders, AI features (what
   is sent, to whom, with what consent: 5.1.2(i)), user content and its
   moderation (1.2), health or medical material and its disclaimer (1.4.1).
5. **If the app is built on web technology**, what is native (navigation,
   sign-in sheets, the share sheet, haptics, files, offline bundle) and what
   is original, so neither 4.2 (minimum functionality) nor 4.3 (similar
   apps) is the question. Content shipped inside the app and working offline
   is the strongest single answer; say how to see it (aeroplane mode).
6. **For an update**, what a reviewer should look at: a new sign-in method,
   a new purchase or external link, a new permission, a new device.
7. **For a new platform**, how to reach each feature with that platform's
   input (look and pinch on Vision Pro, pointer and keyboard on a Mac, the
   remote on Apple TV), and what this platform's app leaves out that the
   others have, so the reviewer does not look for it.
8. A contact line.

Facts only, no marketing, under 4000.

## 9. Metadata that gets apps rejected

| Guideline | What trips it |
|---|---|
| 2.1 | crashes, a dead demo account, placeholder content, a backend that is down |
| 2.3.1 | features the notes and the description do not mention |
| 2.3.3 | screenshots that are not the app in use, are for the wrong device, or show another platform's interface |
| 2.3.7 | names or subtitles stuffed with terms; irrelevant brands in keywords |
| 2.3.10 | other platforms or stores named in the metadata |
| 2.3.12 | What's New that does not describe the changes |
| 3.1.1 | digital goods sold outside in-app purchase (physical goods are 3.1.5(a) and fine) |
| 4.2 | an app that is a website in a frame |
| 4.3 | a name, concept or binary close to other apps' |
| 4.8 | a third-party sign-in without Sign in with Apple or an equivalent beside it |
| 5 | an AI assistant named in the metadata or the pictures (ChatGPT, OpenAI, GPT), refused for the China mainland storefront; name none, or leave China out of Availability |
| 5.1.1 | no privacy policy link, no in-app account deletion, permissions without a purpose string |
| 1.4.1 | health or medical claims without evidence or a disclaimer |

## 10. A new platform's text

A platform added to a live app (a visionOS or macOS version on the same
record) starts from the approved text of the platform already live, not
from a blank page:

- **Carry the owner's words over** where they are still true: the opening
  lines, the statement of who it is for, the credits, the disclaimers. The
  name and subtitle are the record's and come along unchanged.
- **Then make every line true on this device.** The feature list holds
  only what this platform's app does. Describe the input this device uses,
  not taps on glass. Recheck what works offline, whether there is an
  account, and what syncs.
- **Lead with what the app is here.** The first lines say what this
  platform's app does on this device. When it does less than the iPhone
  and iPad app, one line further down may say so and point there (Apple's
  own devices may be named); it never lists those features as if this app
  had them.
- **Keywords are this platform's own**: start from the live ones, drop the
  terms for features this version lacks, add the device's own terms only
  if people search with them.
- **Promotional text, the support and marketing URLs and the copyright**
  are per platform too; usually the same as the live platform's.
- **Screenshots** are of this platform's app only (2.3.3); see
  screenshots.md for the size.

