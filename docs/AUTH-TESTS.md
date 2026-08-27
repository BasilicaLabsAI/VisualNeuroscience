# Accounts: the test checklist

Run after activating each provider, and again before any store submission
that ships accounts. One row per box; a box passes when sign-in completes,
the name appears in the nav, saved files round-trip, and Log out returns the
Log in button.

Platforms: **Chrome** (desktop web), **Safari** (desktop + iPhone web),
**iOS app**, **Mac app**, **Android app**.

## Provider × platform

| | Chrome | Safari | iOS app | Mac app | Android app |
|---|---|---|---|---|---|
| Email + password | ☐ | ☐ | ☐ | ☐ | ☐ |
| Email sign-in link | ☐ | ☐ | ☐ *(link opens web, signs in there)* | ☐ *(same)* | ☐ *(same)* |
| Password reset | ☐ | ☐ | ☐ | ☐ | ☐ |
| Google | ☐ popup | ☐ popup | ☐ native sheet | ☐ native sheet | ☐ native sheet |
| Apple | ☐ popup | ☐ popup | ☐ native sheet | ☐ native sheet | ☐ native sheet |
| LinkedIn | ☐ popup | ☐ popup | ☐ system browser → deep link | ☐ system browser → deep link | ☐ system browser → deep link |

Notes per cell where behaviour differs:

- **Safari popups**: must open from the button tap (they do — no
  `signInWithRedirect` anywhere). If a popup is blocked, the friendly
  "allow pop-ups" message must show, not a raw error.
- **iOS/Mac/Android Google & Apple**: the *native* account sheet appears
  (not a webview page); after it closes, the webview session is signed in
  too (name in nav proves the bridge worked).
- **LinkedIn in the apps**: the system browser opens, LinkedIn authorises,
  the app comes back to the foreground signed in; the browser tab closes or
  shows "returning to the app".

## The specific behaviours

- ☐ **Password mismatch**: Create account with different passwords →
  "The two passwords don't match." appears **before** any network activity
  (airplane mode still shows it), account not created.
- ☐ **displayName**: created account shows "First Surname" in the nav.
- ☐ **Reset round trip**: request reset → email arrives → new password works,
  old one doesn't.
- ☐ **Email-link round trip**: request link → open it in the same browser →
  signed in without password; address bar cleaned of `oobCode`. Open it in a
  *different* browser → asked to confirm the email, then signed in.
- ☐ **Apple first-run name**: with a fresh Apple ID authorisation (revoke at
  appleid.apple.com → Sign-In & Security → Sign in with Apple to reset),
  the name appears in the nav and in `users/{uid}/meta/profile` — Apple only
  ever sends it once.
- ☐ **Hide My Email**: Apple sign-in with the relay address works, reset and
  sign-in link emails arrive through the relay.
- ☐ **Linking, provider → password**: create an email+password account, log
  out, "Continue with Google" using the same address → plain-words message
  saying the account uses email and password → sign in that way → Google is
  linked automatically → thereafter both methods reach the same account (and
  the same saved files).
- ☐ **Linking, LinkedIn collision**: with an existing Google account, sign
  in with LinkedIn using the same email → told to use Google → afterwards
  LinkedIn signs into the same account (the worker mapping, not a duplicate
  uid). Firestore shows no second `users/…` tree.
- ☐ **One account only**: after every linking test, Authentication → Users
  shows **one** user for that email.
- ☐ **Saved files**: save, list, rename, delete a named file
  (`VN_USERFILES`) as user A; sign in as user B and confirm none of A's
  files are visible; rules simulator (or the console) confirms
  `users/{A}/…` is unreadable as B.
- ☐ **Sign out, both layers**: in an app, after Google sign-in, Log out then
  "Continue with Google" again → the account chooser appears fresh (the
  native session was cleared too, not just the webview's).
- ☐ **Dormant regression**: with `VN_FIREBASE = null`, every page shows no
  Log in button, no console errors, and the network tab shows zero requests
  beyond the site's own files.
- ☐ **Provider off**: with `providers.google = false`, the Google button is
  absent and everything else still works (repeat for each provider).
- ☐ **Offline**: with the network cut, pages load (service worker), the
  Log in button appears, and attempting sign-in shows the friendly
  connection message.
