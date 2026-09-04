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

Paste into the App Review thread, with §3 filled in.

```
Thank you. Answers to each point, and the same text is now in the Notes
field of App Review Information.

1. Screen recording: attached. Recorded on an iPad Pro running the current
iPadOS, beginning with launch. It shows the typical flow (Region Atlas,
Brodmann Areas, Tractography, Practice), then account registration, login
with the demo account, Sign in with Apple, cross-device progress saving,
and in-app account deletion. Logging in is optional and only saves
practice progress; there is no user-generated content shared between
users and no paid content.

2. Purpose and audience: VisualNeuroscience.AI is an educational
neuroanatomy reference. It renders real, published brain atlases (the
MNI152 template, the AAL-116 parcellation, a Brodmann atlas, the HCP1065
tractogram) on the device and lets the user select, search and read about
brain structures, with published studies drawn onto the scan, a cited
digital textbook and adaptive practice questions. The audience today is
students and teachers of neuroscience, psychology and medicine, and
clinicians who want a quick anatomical reference. The intention is to
make it the most advanced and useful atlas of the brain available:
targeted at students first, and over time bridging the gap to
enthusiasts, so that anyone curious about the brain can open a real map
of it. It solves the problem that good interactive brain atlases are
either expensive, desktop-only, or need an installation and a licence;
this one is free, runs offline and fits in a pocket. It is not a medical
device and offers no diagnosis or treatment advice; each page says so and
cites its sources.

3. Setting up and accessing features: nothing requires an account. Every
tool is reachable from the tabs at the top of the home screen. Logging in
is entirely optional at the moment: its only purpose is to save a user's
progress in the Practice (testing) area so it follows them across
devices. Every atlas, diagram, study and textbook chapter is available
without an account, and the practice questions work without one too,
with progress kept on the device. Demo account for the reviewer:
   Email: [DEMO EMAIL]
   Password: [DEMO PASSWORD]
Sign in with Apple is also offered and works with any Apple ID. Account
deletion is in the account menu (tap the account name in the header, then
Delete account, pressed twice as the button asks).

4. External services: Firebase Authentication (Google) for sign-in;
Cloud Firestore (Google) for the signed-in user's saved progress, under
security rules that let each user read and write only their own data;
Sign in with Apple. The anatomy itself uses no network service: the
template, atlases and tractogram are inside the app bundle. The website
that hosts the same content, visualneuroscience.ai, is served from
Cloudflare, but the app does not load content from it. No payment
processor, no advertising or analytics SDK, no AI service.
   The ".AI" in the name reflects how the app is made, not a feature in
it. Artificial intelligence is used heavily in its development: to
research and cross-check the neuroscience literature, to assemble the
textbook chapters and practice questions, to process the atlas data, and
to build the software itself. Everything that ships is verified against
its published source and cited on the page. The app contains no
generative AI feature and makes no call to any AI service at runtime.

5. Regional differences: none. The app functions identically in every
region. Content is in English.

6. Regulated industry / third-party material: the app is not a medical
device and is not used to diagnose or treat; it is an educational
reference. The scientific datasets are published under open licences and
are credited in the app and on the website:
   - MNI152 (ICBM 2009c) template, McConnell Brain Imaging Centre,
     Montreal Neurological Institute: free to use, copy and distribute
     with the copyright notice.
   - AAL parcellation (Tzourio-Mazoyer et al., 2002), Neurofunctional
     Imaging Group (GIN): free for non-commercial academic and educational
     use; the app is free.
   - Brodmann atlas volume, from MRIcron (Chris Rorden): BSD licence.
   - HCP1065 population-averaged tractography atlas (Yeh, 2018), derived
     from Human Connectome Project data: CC BY-SA 4.0.
   - Rendering by NiiVue (BSD 2-Clause). Charts by d3 (ISC).
   - Studies are summarised from open-access papers, cited on the page.
   [BRODMANN DRAWING: state the source of the schematic Brodmann drawing
   and your permission to use it, or remove this line if the in-house
   drawing has replaced it.]
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
