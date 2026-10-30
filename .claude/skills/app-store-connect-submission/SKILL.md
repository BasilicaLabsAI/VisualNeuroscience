---
name: app-store-connect-submission
description: Prepare every piece of text App Store Connect asks for - for a first submission, an update, or a new platform (visionOS, macOS) added to a live app - on any Apple platform. Name, subtitle, promotional text, description, keywords, What's New, the URLs, copyright, the App Review notes and contact, the reply to a first review's Information Needed message, and the App Privacy, age rating, accessibility, export compliance and release answers, each drawn from the app's own code and notes, written in the owner's voice, checked by script against Apple's limits and rules, with the build and the screenshot sizes checked too, and saved as one paste-ready sheet in App Store Connect's order. Use whenever someone is about to submit or update an app on the App Store, mentions App Store Connect, a version page, What's New, keywords, a subtitle, review notes, App Review, screenshot sizes or Add Platform, or asks what to put in App Store Connect, even if they only say "get me the submission text" or "I'm submitting tomorrow".
---

# App Store Connect submission

One sheet per submission holding every field App Store Connect will ask
for, in the order its pages ask, each in its own block ready to paste, each
counted against its limit, and every answer traced to the code or to the
owner's word. It works for the three kinds of submission: a first one,
where every page is empty; a new platform added to an app already live,
where the record's fields are set and one platform's pages are empty; and
an update, where most of the text is approved and only what changed should
move.

What the owner gets: a file in the project's store folder
(`submissions/<platform>-<version>.md`) that is also the record of what
went to Apple, a reply that hands over each field as a block with a copy
button, the questions only they can answer, and a short list of what is
left to do by hand.

## The files

```
references/fields.md          every field, page by page: limits, the build checks, where each answer comes from, which fields every platform shares
references/writing.md         how to write each text field, the voice, a new platform's text, and the metadata that gets apps rejected
references/questionnaires.md  App Privacy, age rating, accessibility labels, export compliance, content rights, release options
references/screenshots.md     the slots, the sizes, what a screenshot may show, previews and the header artwork
references/review-replies.md  the Information Needed reply, answering rejections, what to do while waiting
assets/sheet-template.md      the sheet's skeleton, all three kinds
assets/example-update.md      an illustration of a finished update sheet: the shape and the voice, not values to copy
scripts/check_sheet.py        counts every field against its limit; checks keywords, platform words, AI assistants' names, URLs, gaps and open questions
scripts/check_screenshots.py  says which slot each image fits; flags sizes no slot takes and transparency
scripts/live_listing.py       what the App Store shows now for a live app: version, release notes, description
```

## Workflow

### 1. Pin down the submission

Settle these before writing a word, from the project rather than by asking:

- **Which platform and version.** The build's version is in the project
  (`MARKETING_VERSION` in the Xcode project, `CFBundleShortVersionString`,
  `app.json`, `pubspec.yaml`). The version page in App Store Connect must
  carry the same string; if the person mentions a different number, say so
  at once, since a page renamed after its build was picked can go on
  showing that build.
- **Which kind of submission.** It decides which pages are empty and which
  fields the sheet must hold:

  | Kind | When | What App Store Connect asks |
  |---|---|---|
  | first submission | the app has never been on the store | everything: the New App dialog, App Information, pricing, App Privacy, accessibility, the version page, review, release, the age rating; a new account usually gets an Information Needed message before review |
  | new platform | the app is live on one platform and a version for another is added to the same record (Add Platform) | that platform's version page, screenshots and accessibility labels; the record's shared fields (name, subtitle, privacy, age rating, pricing) are already set, so check they hold for the new app and change them only for every platform; no What's New |
  | update | a new version on a platform where the app is live | the version page with What's New; the shared fields only where this version changes them |

  Tell them apart from the project's notes, a previous sheet in
  `submissions/`, or `python3 scripts/live_listing.py <app id or bundle id>`
  when the network allows. The lookup describes the record's iPhone and
  iPad listing only: a live iPhone app does not make a first Vision Pro or
  Mac version an update.
- **What the store holds now.** For an update, start from the approved
  text: the previous sheet, the project's listing notes, the live listing.
  For a new platform, start from the live platform's approved text. A
  screenshot of App Store Connect from the person beats every document;
  when it disagrees with the notes (a rename the notes promised that the
  page does not show), say which is which and ask which stands.
- **What changed since the version the public has** (updates): the
  release ledger, changelog or tags between the last approved build and
  this one. The previous sheet records which build was approved.

Ask the person only what the code cannot say: the review contact's phone,
the demo account they will create, a price, manual or automatic release,
and, for a new platform, whether to release it at all yet (step 4).

### 2. Audit before writing

Read `references/fields.md`: section 0 for the build, section 10 for where
each answer comes from, section 11 for which fields every platform shares.

- **The build first.** The version and build number, the bundle identifier
  (a new platform's must be the record's), the app icon, the encryption
  key, the privacy manifest, the purpose strings, the SDK, the device
  families. A missing icon or a wrong identifier stops the upload whatever
  the text says; a new platform's project often lacks what the first one
  was given long ago.
- **Then what the app does.** The privacy answers, the review notes and
  half the description are statements about the app; take each from the
  code (the SDKs in the package manifests, the sign-in methods, the
  permission strings, the account deletion path, what works offline, what
  calls the network at all) and from the owner's own notes, never from
  memory of the last submission. If the project keeps fastlane metadata
  (`fastlane/metadata/<locale>/*.txt`), those files are the source: read
  them and update them with the sheet.

### 3. Write the fields

Read `references/writing.md`, then fill the template in
`assets/sheet-template.md`, keeping its headings: the checker reads
`### Field (limit)` followed by one fenced block, and the `Kind:` line,
which must begin with `first submission`, `new platform` or `update`. The
rules that matter most:

- **Keep the owner's words.** Any wording the owner supplied (a name, a
  statement, a line about themselves) goes in as given. For an update,
  change only what is no longer true or what this version adds. For a new
  platform, carry the live platform's approved text over and make every
  line true on the new device (writing.md, section 10).
- **Write in the project's voice.** Plain, specific, the project's spelling
  (British if its pages are), no superlatives, no other companies'
  platforms or stores, no competitors' names, no AI assistant by name (say
  "your AI of choice"), nothing the app does not do.
- **What's New is for the public**: what they can do now that they could
  not in the version they have, most noticeable first, in their words, no
  file names or build talk.
- **The review notes are for a reviewer with ten minutes and no context**:
  what the app is, how to reach every feature, the account and how to
  delete it (or that there is none), and anything a reviewer could misread
  (external purchases, placeholders, AI, offline, a web-technology shell, a
  device's own input).
- **Two kinds of double brackets.** Inside a field's block, `[[...]]` is a
  value the person types into App Store Connect themselves: the demo
  account's password never goes in the sheet or the repository. In the
  prose around the blocks, `[[...]]` is a question only the person can
  answer; the checker lists it and counts the sheet unready until it is
  answered.

### 4. Answer the questionnaires

Read `references/questionnaires.md` and answer App Privacy, the age rating,
the accessibility labels, export compliance, content rights and the release
options from the audit. App Privacy, the age rating and pricing are one set
for the record: a new platform only checks that they hold. Where a skill
for the legal pages is installed (app-legal-admin), its store-declarations
table is the same mapping in more depth: the policy, the privacy answers
and the code must say one thing.

For a new platform on Vision Pro or the Mac, say before anything is
released that the record's own app for that device replaces the iPhone and
iPad app there for everyone: what the new app lacks, they lose. Choose a
manual release and let the person decide when.

### 5. Check it

```
python3 scripts/check_sheet.py <sheet.md>            # counts, keywords, platform and AI words, gaps, open questions
python3 scripts/check_sheet.py <sheet.md> --online   # and asks each URL whether it answers
python3 scripts/check_screenshots.py <folder>        # each image's slot; sizes no slot takes; transparency
```

Fix every failure; read every warning and keep only those you can justify.
The sheet is ready only when the checker says so; open questions are
handed to the person, not guessed. Then the checks no script can make:

- the version page's number equals the build's version string, and the
  build passes `fields.md` section 0;
- the screenshots show this build, in every slot App Store Connect marks
  required now (read the slot list on the page; `references/screenshots.md`
  has the sizes), and a device's own slot is filled only if the build
  supports that device as the pictures claim;
- the privacy answers, the privacy policy and the code agree, and the
  policy names every platform the app is on;
- every feature the description names is reachable by a reviewer on this
  platform, and every one a reviewer could stumble on is explained in the
  notes;
- the credits the licences require are in the app on this platform, not
  only in the description;
- the support URL leads to a way to contact the developer.

### 6. Hand it over

- Save the sheet as `<store folder>/submissions/<platform>-<version>.md`
  (the folder where the project keeps its listing notes; make it if there
  is none) and send the file if the session can send files. Commit it under
  the project's own rules; in a repository where every push to the main
  branch is a release, it rides the next release unless the person asks.
- In the reply, give each field the person has to paste as its own code
  block, page by page in the order they will meet them, with a line of
  context at most per page. For an update, only the fields that change;
  name the ones that stay as they are. For a new platform, only that
  platform's page and accessibility labels; say the shared fields stand.
- Then the open questions, numbered, each answerable in a word or a line.
- End with what is left by hand: fix whatever the build check found, pick
  the build, upload the screenshots, set the release option, publish App
  Privacy if it changed, Add for Review, then Submit for Review.
- For a new account's first submission, the sheet's last section is the
  reply to the Information Needed message (a screen recording and written
  answers, `references/review-replies.md`); say so, and that the demo
  account must stay alive until approval. For an established account or a
  new platform, keep a short shot list instead and write the reply only if
  App Review asks.

### 7. After approval

Write the approved build's number and the date into the sheet: the next
update's What's New starts from it. Move the project's version on (2.0 to
2.1) so the next build is not the same number. Promotional text can change
at any time without a new version.

## Pitfalls

- **The version page and the build disagreed** (page 2.0, build 1.1): the
  page had been renamed after its build was picked. Match them before
  submitting, by rebuilding with the page's number or naming the page as
  the build is.
- **A required screenshot size changed under a live app.** Images made for
  the 6.9-inch iPhone were refused in the newly required 6.3-inch slot as
  "File dimensions are invalid". Read the slots on the page each time and
  run the screenshot check before uploading.
- **The notes promised a rename the page never got.** The name and subtitle
  change only with a new version and only while its page is editable; a
  version waiting for review cannot take them without being pulled.
- **A first submission drew "Information Needed"** (a screen recording on a
  device and written answers) before any review, and the recording deleted
  the demo account it showed. Prepare both before submitting; recreate the
  account afterwards.
- **A first submission was rejected under 4.3(a) as similar to other apps**:
  a name close to another listing's, a subtitle that read like a category,
  and a thin native shell around web content. The notes must say what is
  original and what is native, and the name and subtitle must say what no
  other listing could.
- **A new platform's project lacked what the first platform had**: no app
  icon, no encryption key, the in-app credits short of what the licences
  ask, a privacy policy that never named the new device. Each is found in
  the audit, before the upload, not by App Review.
- **A new device's screenshots can claim more than the build gives.** A
  device whose layout needs a newer SDK is served properly only by a build
  made with it; fill its slot only once the build earns it.
- **An update was rejected for China under Guideline 5** for naming
  ChatGPT beside other assistants in What's New, the description and a
  screenshot of a page that named them. Name no AI assistant anywhere the
  public reads, pictures included: the sheet check fails on ChatGPT, OpenAI
  and GPT and warns on other assistants' names, and no script reads the
  screenshots, so read them.
- **"Coming soon" placeholders** in screenshots or features draw 2.1
  questions; either explain them in the notes or keep them out of the
  pictures.
