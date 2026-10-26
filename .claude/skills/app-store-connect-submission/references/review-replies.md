# Messages with App Review

## Contents

1. The first review's Information Needed message
2. Answering a rejection
3. While waiting

## 1. The first review's Information Needed message

New developer accounts usually receive, before the first review of their
first app, a message under guideline 2.1 asking for a screen recording of
the app on a physical device and written answers about it. It is not a
rejection; App Store Connect shows it as Rejected until answered. An
established account, or a new platform for an app already live, often
receives none, or a shorter question. For a first submission from a new
account, prepare both before submitting and put them in the sheet's last
section; otherwise keep a short shot list ready and write the reply only
if asked.

**The recording**, about three minutes, on a device with the build from
TestFlight, beginning with the launch from the home screen. Leave out what
the app does not have:

1. the main screens, unhurried, one feature at a time;
2. if the app has accounts: creating one with the demo account's details,
   signing in, signing out, and each sign-in method it offers (Sign in with
   Apple's native sheet);
3. the feature an account adds (progress saved, files kept);
4. account deletion in the app, start to finish;
5. anything a reviewer could misread (offline use with aeroplane mode on,
   an external purchase opening in the browser, a device's own input such
   as look and pinch on Vision Pro).

A recording that deletes the demo account: recreate the account afterwards
with the same details, and keep it alive until the app is approved.

**The written answers**, one numbered point each, under 4000 characters in
all (the thread's limit per message):

1. *Screen recording*: attached, the device and system it was made on, what
   it shows in order.
2. *Purpose and audience*: what the app does and for whom, in two or three
   sentences, and what it is not (not a medical device, not a game).
3. *Setup and access*: what needs an account and what does not, or that
   there are no accounts; the demo account (in App Store Connect's fields,
   never in the message); where account deletion is.
4. *External services*: each one by name and what it does (sign-in,
   storage, analytics, mailing list), what is not used (advertising,
   tracking, payment processors), whether the core works offline, any AI
   service called at run time and with what consent; or that the app makes
   no network calls at all.
5. *Regional differences*: usually none.
6. *Regulated content and licences*: medical, financial or legal material
   and its disclaimer; third-party content and its licences or permissions.

The same text goes into App Review Information → Notes, so the next
reviewer has it.

## 2. Answering a rejection

- Reply in the App Review thread of the version (App Store Connect → the
  app → App Review). One message, then wait; several messages restart
  nothing and read as pressure.
- Quote the guideline, then answer it in short numbered points: what was
  changed, or why the app already complies, with screenshots or a short
  recording attached.
- **Metadata rejections** (screenshots, text) need no new build: fix the
  metadata and resubmit the same build.
- **Binary rejections** need a new build with a higher build number, and
  the version page moved to it.
- A **4.3 similarity** rejection is answered with facts: who wrote the app
  and since when, what content is original or licensed and processed by
  the developer, what combination no other app offers, which app was it
  compared with (ask), and an offer to change the name if that is the
  overlap. Facts only: no "unfair", no workload, no argument about how the
  app was made beyond one plain sentence. Do not resubmit the same build
  unchanged; prepare the next build with the name, subtitle, opening lines
  and first screenshots made unmistakably the app's own.
- **Appeal** to the App Review Board (developer.apple.com/contact, "Appeal
  an app rejection") only when the thread has failed and the case is clear;
  a different team reads it. Expedited review is for genuine emergencies.

## 3. While waiting

- *Waiting for Review* → *In Review* → *Pending Developer Release* (manual
  release) or *Ready for Distribution*. A day or two is usual for an update.
- Text fields stay editable while waiting; changing the build means
  removing the version from review, which puts it back in the queue.
- Keep the demo account alive and the backend up; a reviewer who cannot sign
  in rejects under 2.1.
- Answer a message from App Review the same day if possible; the version
  waits on the reply.
