# Publishing on the Mac App Store

The Mac version is the iPad app, unchanged. Apple sells compatible iPad apps
on the Mac App Store for Macs with Apple silicon, running them as they are,
and this project opts in: `SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD = YES`,
which Xcode shows as the destination *Mac (Designed for iPad)*. There is no
separate build, archive, upload or listing. The iOS build that goes through
review is the one that appears on the Mac App Store.

Mac Catalyst, the other route, is switched off (`SUPPORTS_MACCATALYST = NO`)
and cannot be used from this project: Capacitor's Swift package ships its
frameworks without a Catalyst slice, so a Catalyst archive fails before it
starts. That is a limit of the dependency, not of the app.

---

## What to do

1. **App Store Connect → the app → Pricing and Availability.** Under
   *iPhone and iPad Apps on Mac with Apple silicon*, tick **Make available on
   Mac**. It is one checkbox and it applies to every future version.
2. **TestFlight on the Mac.** App Store Connect → TestFlight → *iOS Apps on
   Mac* → **Enable**. The TestFlight app on an Apple silicon Mac then installs
   the same builds the iPad gets, which is the way to try it before release.
3. Nothing else. Screenshots, description, category and privacy answers are
   the iOS ones; the Mac listing reuses them.

---

## What it is like

- Apple silicon only. Intel Macs do not see the app in the store.
- It opens as a resizable window at iPad proportions, with the menu bar and
  the keyboard shortcuts macOS gives every such app. Pointer, trackpad and
  keyboard all work: `site/assets/zoom.js` already handles a trackpad pinch,
  which macOS sends as a wheel event with the control key held, and the
  gesture labels switch to the mouse dialect when a pointer is present.
- The sandbox is applied by the system. The one file the app writes, a
  snapshot, goes through Capacitor Filesystem into the app's own container,
  which is inside it.
- Sign in with Apple, Google and email all work; the native sheets are the
  iPad ones.

---

## What is likely to go wrong

**Guideline 4.2, harder on a Mac.** The reader plainly has a browser, so the
bar for "more than a website" is higher. The answer is the same and it is a
good one: the app carries the MNI152 template, the AAL-116 atlas and the
HCP1065 tractogram inside it and never reaches the network for the anatomy.
Say so in the review notes.

**A page that assumes touch.** Everything here is verified with a pointer as
well as a finger, but if something only responds to touch on the Mac, that
is a bug in the page, not in the packaging. Report it and it gets fixed for
the desktop web as well.

**Wanting a Mac-native app later.** That means Mac Catalyst or a separate
macOS app, and either means leaving Capacitor's Swift package for a
dependency that builds for the Mac. Worth it only if the iPad-on-Mac version
proves to fall short in use.
