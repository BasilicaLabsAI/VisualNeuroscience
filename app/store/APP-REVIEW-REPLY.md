# Answering App Review's "Information Needed" (Guideline 2.1)

New developer accounts get this on their first submission. It is not a
rejection: the reviewer wants a recording, a description and a list of
services before looking further. Reply in App Store Connect → the app →
App Review (left column) → the message thread, and paste the same text
into App Review Information → Notes on the version page, as they ask.

## 1 · The screen recording

On the iPad, with the TestFlight build installed and the latest iPadOS:

1. Settings → Control Centre → add Screen Recording if it is not there.
2. Log out of the app first, so the recording shows the flows from cold.
3. Open Control Centre, tap the record button, wait for the countdown,
   then **launch the app from the home screen** (the recording must begin
   with the launch).
4. Follow this order, unhurried, about three minutes in all:
   - Home page. Scroll once so the tools are visible.
   - **Region Atlas**: add a region from the picker, show it light up in
     all four views, drag the 3D view to turn it, pinch to zoom.
   - **Brodmann Areas**: tap an area on the drawing, show the name bar and
     the function button.
   - **Tractography**: turn it once.
   - **Practice**: answer one question.
   - **Log in → Create account**: register with the demo email and
     password (see §3). Show the header change to the account name.
   - **Practice** again: answer one more question, then open Progress and
     show the note "Progress saves to your account".
   - **Log in with Apple**: log out, tap Log in, choose Apple, complete the
     native sheet, log out again.
   - **Delete account**: log in with the demo account, open the account
     menu, press Delete account twice as the button asks, show the header
     return to Log in.
   - Optional but strong: Control Centre → aeroplane mode on → open the
     Region Atlas and turn the brain, to show the anatomy is offline.
5. Stop the recording from Control Centre. It lands in Photos. Under
   500 MB it attaches directly to the reply; otherwise trim it in Photos.

Then **recreate the demo account** with the same email and password, since
the recording deleted it, so the reviewer can log in with §3.

## 2 · Reply text

App Store Connect caps a reply at 4,000 characters. This one is 3959
with the placeholders, so fill them in briefly. The Brodmann drawing
sentence reflects the permission IFEN granted on 4 September 2026. Paste into the App
Review thread.

```
Thank you. Answers to each point; the same text is in the Notes field of App Review Information.

1. Screen recording: attached, made on an iPad Pro on the current iPadOS, starting from launch. It shows the typical flow (Region Atlas, Brodmann Areas, Tractography, Practice), then account registration, login with the demo account, Sign in with Apple, progress saving, and in-app account deletion. Login is optional and only saves practice progress; there is no user-generated content shared between users and no paid content.

2. Purpose and audience: an educational neuroanatomy reference. It renders published brain atlases (MNI152 template, AAL-116 parcellation, a Brodmann atlas, the HCP1065 tractogram) on the device and lets the user select, search and read about brain structures, with published studies drawn onto the scan, a cited digital textbook and adaptive practice questions. The audience today is students and teachers of neuroscience, psychology and medicine, and clinicians wanting a quick anatomical reference. The intention is to make it the most advanced and useful atlas of the brain: targeted at students first, and over time bridging the gap to enthusiasts. Good interactive atlases are expensive, desktop-only or need a licence; this one is free, runs offline and fits in a pocket. It is not a medical device and gives no diagnosis or treatment advice; each page says so and cites its sources.

3. Setup and access: nothing requires an account. Every tool is reachable from the tabs at the top of the home screen. Logging in is entirely optional at the moment; its only purpose is to save progress in the Practice (testing) area across devices. Everything else, and the practice questions themselves, work without an account. Demo account:
Email: [DEMO EMAIL]
Password: [DEMO PASSWORD]
Sign in with Apple also works with any Apple ID. Account deletion: tap the account name in the header, then Delete account, pressed twice as the button asks.

4. External services: Firebase Authentication (Google) for sign-in; Cloud Firestore (Google) for the signed-in user's progress, under rules that let each user read and write only their own data; Sign in with Apple. The anatomy uses no network service: template, atlases and tractogram are in the bundle. The website visualneuroscience.ai is served from Cloudflare, but the app does not load content from it. No payment processor, advertising or analytics SDK, or AI service.
The ".AI" in the name reflects how the app is made, not a feature in it. AI is used heavily in development: to research and cross-check the literature, assemble the textbook and practice content, process the atlas data, and build the software. Everything shipped is verified against its published source and cited. This version has no generative AI feature and calls no AI service at runtime. AI features are planned for future versions and will be declared in the submission that introduces them.

5. Regional differences: none. The app functions identically in every region. Content is in English.

6. Not a medical device and not used to diagnose or treat; an educational reference. The datasets are published under open licences and credited in the app and on the website: MNI152 (ICBM 2009c) template, McConnell Brain Imaging Centre, MNI, free to use and distribute with the copyright notice; AAL parcellation (Tzourio-Mazoyer et al., 2002), GIN, free for non-commercial academic use (the app is free); Brodmann atlas volume from MRIcron (Chris Rorden), BSD; HCP1065 tractography atlas (Yeh FC, Nat Commun 13:4933, 2022), from Human Connectome Project data, CC BY-SA 4.0; rendering by NiiVue (BSD), charts by d3 (ISC); studies summarised from open-access papers, cited on the page. The Brodmann map is adapted from the Brodmann Areas diagram of IFEN (Institute for EEG-Neurofeedback / Neurofeedback Academy) with the rights holder's written permission of 4 September 2026, credited on the website and in the app from the next build.
```

## 2b · Permission update for the thread

IFEN granted permission for the Brodmann diagram on 4 September 2026 (the
record is `docs/PERMISSIONS.md`). Post this as a further message in the App
Review thread, with screenshots of the permission email attached, so the
reviewer has the current position on point 6. It is
1166 characters.

```
Update on point 6, third-party material. IFEN (Institute for EEG-Neurofeedback / Neurofeedback Academy, Neurofeedback-Partner GmbH, Germany), the rights holder of the Brodmann Areas diagram referred to in my earlier messages, granted written permission on 4 September 2026 to use and adapt the diagram on the VisualNeuroscience.AI website and in the associated apps. The permission is free of charge for this educational, non-commercial project, on condition of the acknowledgement "Brodmann Areas diagram adapted with permission from IFEN – Institute for EEG-Neurofeedback / Neurofeedback Academy", which IFEN also welcomed in the store listing. Screenshots of the permission email are attached.

The Brodmann map in the build under review is adapted from that diagram and is covered by this permission. The acknowledgement is live on the Brodmann Areas page of the website, is in the store description, and is in the app from the next build. This supersedes my earlier notes about the drawing; the correction I sent to point 6 is now accurate. All other third-party material is unchanged: open-licence atlases and libraries, credited in the app and on the website.
```

## 3 · The demo account

Create it in the app before recording, with an address you control and a
password used nowhere else. Something like `appreview@ottomanlabs.ai`. Do
not put the password anywhere but App Store Connect. Recreate the account
after the recording deletes it, and keep it alive until the app is
approved; reviewers do try to log in.

## 4 · Notes field text

App Review Information → Notes, replacing what is there. It is the reply
above minus the first paragraph, with the demo credentials filled in.

## 5 · What not to do

Do not resubmit a new build in response to this; it is a request for
information, and the same build should stay under review. Reply in the
thread and the review continues.

---

# Answering the 4.3(a) rejection — Design — Spam (12 September 2026)

Build 1.0 (14), submission 979d790e-caea-4eee-a37a-b8a2d201a044, reviewed
on an iPad Air 11-inch (M3). The finding: "the app shares a similar binary,
metadata, and/or concept as apps submitted to the App Store by other
developers, with only minor differences." Apple does not name the app it
compared against, and its reply to the appeal is often a form letter, so
the message has to make the comparison collapse on its own.

## What probably triggered it

None of these is confirmed; the reply asks Apple which one it was.

- **Name.** An app called "NOURAKU – Visual Neuroscience" (Fuji Bit Inc.)
  is on the store. A name match is the cheapest "similar metadata" there
  is, and the subtitle "Interactive brain atlas" reads like a category, not
  an app.
- **Concept.** "Brain atlas" apps exist (3D Brain, Brain Tutor, general
  anatomy apps). A reviewer who opens the app, sees a brain, and has not
  used the tools files it under the concept.
- **Binary.** Every Capacitor app has the same native shell. Apple's
  automated similarity check is known to flag thin shells around web
  content, especially when the same content is reachable in a browser.

## The order of moves

1. **Reply in the thread first** (App Store Connect → the app → App Review
   → the message). One message, the text in §6. Do not upload a new build
   and do not press Submit for Review again with build 14: after a 4.3(a)
   an unchanged resubmission is what the "repeated submissions" paragraph
   in the email is about.
2. **If the answer is a form letter or a second 4.3(a)**, appeal to the App
   Review Board: developer.apple.com/contact/app-store, topic "Appeal an
   app rejection". A different team reads appeals. Text in §7.
3. **In parallel, prepare build 15** with the metadata changes in §8, so
   that if a resubmission is needed it is visibly not the same submission.

## 6 · Reply text

2,982 characters with the placeholders. Fill the brackets, delete any
sentence that is not true of you, and keep it under 4,000.

```
Thank you for the review. I believe this comparison is mistaken and would like to resolve it. Could you tell me which app or apps the submission was compared with, so I can address the overlap precisely? In the meantime, the facts:

1. Authorship. VisualNeuroscience.AI is written by me alone, from an empty repository, over [N] months. It is not a purchased, repackaged or templated app. It shares no source code, assets or content with any other app, and I have not submitted it, or anything like it, under any other developer account. The only other place this code runs is my own website, visualneuroscience.ai, which I own and which carries the same name and content. I can give App Review read access to the private source repository, or a screen recording of it, on request.

2. Content. The anatomy is rendered on the device from published, licensed datasets that I processed myself: the MNI152 template, the AAL-116 parcellation, the MRIcron Brodmann volume and the HCP1065 tractogram, plus the Brodmann diagram used with IFEN's written permission, documented earlier in this thread. The textbook chapters, the studies overlay, the receptor maps, the network atlas and the practice question bank are written and assembled by me and cited to their source papers.

3. Concept. I have compared this app with every brain atlas app I can find on the App Store. None combines an MNI152 atlas with selectable AAL regions, Brodmann areas searchable by function, whole-brain tractography, receptor density maps, a network-state atlas, published studies drawn onto the scan, a cited textbook and adaptive practice questions, in one free app that works fully offline. That combination is the app; it is not a variation on an existing one.

4. Name. The App Store name is VisualNeuroscience.AI, my registered domain. If the concern is proximity to another listing whose name contains "Visual Neuroscience", I will change the name in this submission; please confirm that is the issue.

5. Binary. The app is built with Capacitor, an open-source framework, so the thin native layer (WebKit view, Sign in with Apple, haptics, file export, share sheet, offline bundle) is the same one used by many independent apps. Everything above that layer is original. If an automated binary comparison flagged it, I would be grateful to know against which app, because there is no other app containing this code.

6. Context. [I am a one-person developer and this is my first App Store submission.] The website has been live at visualneuroscience.ai since [month], the domain is registered to me, and the About page there describes who built the app and how. The app exists so that students can use the atlas offline on a tablet, which the website cannot do.

Please tell me what would demonstrate this to your satisfaction and I will provide it: repository access, a recording of the development history, domain registration, or the IFEN permission correspondence already attached above.

Thank you.
```

## 7 · Appeal text

Only if the thread reply fails. The form asks for the app name, the Apple
ID number (App Information → General → Apple ID), the submission ID, and a
statement. 1,308 characters.

```
App: VisualNeuroscience.AI, Apple ID [number], submission 979d790e-caea-4eee-a37a-b8a2d201a044, version 1.0 (14), rejected under 4.3(a) on 12 September 2026.

I am appealing because the app is original and I have been unable to learn what it was compared with. It is written entirely by me, from scratch, under this one account. It is not a template, is not repackaged from any other app, and no other app contains its code or content. Its only other home is my own website at the same name, visualneuroscience.ai.

The app renders published brain atlases on the device (MNI152, AAL-116, a Brodmann atlas, the HCP1065 tractogram) and adds receptor maps, a network atlas, studies drawn onto the scan, a cited textbook and adaptive practice. I know of no App Store app that offers this combination, and none that does so free and fully offline. Guideline 4.3(a) targets repackaged and duplicate apps; this is neither.

In the review thread I offered read access to the private source repository, the domain registration, and the rights-holder permission for the one third-party diagram, and asked which app was the basis of the comparison. I have not received a specific answer. I would welcome any of those being checked, and if the concern is the name, I will change it.

Thank you for looking at this again.
```

## 8 · Changes for build 15, whether or not the reply works

Do these before any resubmission so the next submission is different in
the places a reviewer reads first: name, subtitle, screenshots, opening
lines.

- **Subtitle.** Replace "Interactive brain atlas" (a category) with
  something no other listing could say, within 30 characters:
  `MRI atlas, tracts, Brodmann` (27) or `Atlases, tracts, studies` (24).
- **Screenshots.** First three: the tractogram turning in 3D, the Region
  Atlas with a region lit in three planes and 3D, and Brodmann areas with
  the function search open. A brain on a black background alone looks
  like every other brain app; the tools do not.
- **Description.** Open with the combination sentence from point 3 of the
  reply, then the sections already written. Add one line near the end:
  "Built by one developer; the website and the app share the same code and
  the same author."
- **Keywords.** Add `MNI152` and `AAL`; nothing else on the store uses
  them.
- **The build itself.** Build 15 carries everything shipped since 14: the
  About page, 3D export, saved models, the MCP link, the iPhone Duo
  layout. The About page in particular answers "who made this" inside the
  app, which is the question 4.3(a) is really asking.
- **Notes field.** Keep the demo credentials and add one sentence:
  "Original app by a single developer; source available to App Review on
  request. See the About page inside the app."

## 9 · What not to do

Do not resubmit build 14 unchanged. Do not send more than one message
before Apple answers. Do not request an expedited review. Do not upload a
new build until the thread reply has been answered, unless a week passes
with nothing.
