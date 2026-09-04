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

App Store Connect caps a reply at 4,000 characters. This one is 3776
with the placeholders, so fill them in briefly. The Brodmann drawing
sentence is settled: the map is the app's own line work. Paste into the App
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

6. Not a medical device and not used to diagnose or treat; an educational reference. The datasets are published under open licences and credited in the app and on the website: MNI152 (ICBM 2009c) template, McConnell Brain Imaging Centre, MNI, free to use and distribute with the copyright notice; AAL parcellation (Tzourio-Mazoyer et al., 2002), GIN, free for non-commercial academic use (the app is free); Brodmann atlas volume from MRIcron (Chris Rorden), BSD; HCP1065 tractography atlas (Yeh, 2018), from Human Connectome Project data, CC BY-SA 4.0; rendering by NiiVue (BSD), charts by d3 (ISC); studies summarised from open-access papers, cited on the page. The Brodmann map is the app's own line drawing of Brodmann's public-domain 1909 scheme.
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
