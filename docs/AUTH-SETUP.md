# Accounts: the complete setup guide

The account system is **built and shipped but dormant**. Every page carries
the code; `site/assets/firebase-config.js` says `window.VN_FIREBASE = null`,
and while it does there is no Log in button, no SDK load, and not one network
request — the privacy policy stays true as written. This guide is every click
needed to turn it on, written for a first visit to each console, in order.
Nothing here assumes prior Firebase, Apple or LinkedIn experience.

What you get when done: email + password sign-in, passwordless email links,
password reset, **Continue with Google / Apple / LinkedIn**, one account per
email with graceful linking, and per-user saved files in Firestore — the same
account on the website, the iPhone/iPad app, the Mac app and the Play Store
app.

**The order below matters.** Steps 1–4 give you a working email-only system
on the web. Each provider after that is independent — do them in any order,
skip any you don't want (its button simply never appears).

---

## 1 · Create the Firebase project

1. Go to https://console.firebase.google.com and sign in with a Google
   account you control long-term (this account owns the user database).
2. **Add project** → name it (e.g. `visualneuroscience`) → Google Analytics
   **off** (the app promises no analytics) → **Create project**.
3. When it opens, click the **web** icon (`</>`) on the project overview to
   **add a web app**. Nickname `site`. Do **not** tick Firebase Hosting.
4. It shows a `firebaseConfig` object. Copy the four values you need —
   `apiKey`, `authDomain`, `projectId`, `appId` — into
   `site/assets/firebase-config.js`, replacing the `null`:

   ```js
   window.VN_FIREBASE = {
     apiKey: "AIza…",
     authDomain: "visualneuroscience.firebaseapp.com",
     projectId: "visualneuroscience",
     appId: "1:…:web:…",
     providers: { google: false, apple: false, linkedin: false, emailLink: true }
   };
   ```

   Start with the three social providers `false`; flip each to `true` as you
   finish its section below. **These values are public identifiers, safe to
   commit** — Firebase's own docs say so; security lives in the rules and
   providers, not in hiding these strings.
5. Bump `VERSION` in `site/sw.js` (e.g. `vn-12` → `vn-13`) — installed
   copies cache that file and would otherwise keep the old one. Do this on
   **every** later edit of `firebase-config.js` too.

## 2 · Turn on email sign-in

1. Console left menu → **Build → Authentication** → **Get started**.
2. **Sign-in method** tab → **Email/Password** → enable the first toggle
   (Email/Password) **and** the second (**Email link (passwordless
   sign-in)**) → Save.

## 3 · Create the database and paste the rules

1. **Build → Firestore Database** → **Create database** → production mode →
   pick the region closest to your users (e.g. `eur3`) → Enable.
2. **Rules** tab → replace everything with the contents of
   [`firestore.rules`](../firestore.rules) in this repo → **Publish**.
   The rules give each signed-in person exactly their own
   `users/{uid}/…` tree and nothing else; everything unnamed is closed.

## 4 · Authorise your domains

1. **Authentication → Settings → Authorized domains** → **Add domain** for
   each place the web app is served: `visualneuroscience.ai` and the
   `*.workers.dev` address if you still use it. `localhost` is pre-listed
   for development.

**Safari, and why `authDomain` should eventually be your own domain.** The
sign-in popup is served from `authDomain`. On the default
`<project>.firebaseapp.com`, Safari's third-party-storage rules break the
*redirect* flow entirely — which is why the app uses **popups only** — and
even popups work more smoothly same-site. The clean fix, when you have a
spare moment, is Firebase's documented one: serve the auth helper from your
own domain. Easiest route: in Cloudflare, create a subdomain
`auth.visualneuroscience.ai` proxying `visualneuroscience.firebaseapp.com`
(a Worker or a proxied CNAME), add that subdomain to Authorized domains, set
`authDomain: "auth.visualneuroscience.ai"` in the config, and add it to each
provider's redirect allow-lists (Google credential origins, Apple return
URLs). Until then, popups on the default domain work in every browser
including Safari — this is a polish step, not a blocker.

**Checkpoint:** deploy the site, open it, and a **Log in** button appears in
the nav. Create an account with email + password; the name shows in the nav;
log out; reset the password; send yourself a sign-in link and complete it.

---

## 5 · Google sign-in

### Web

1. **Authentication → Sign-in method → Add new provider → Google** → Enable.
2. Set the public-facing name (shown on Google's consent screen) and a
   support email → Save. That's the whole web part.
3. Flip `google: true` in `firebase-config.js` (and bump the sw VERSION).

### The apps (iPhone/iPad, Mac, Android)

Google refuses OAuth inside embedded webviews (`disallowed_useragent`), so
the store apps use the native sign-in sheet through a Capacitor plugin, and
the code bridges the resulting credential into the webview's Firebase
session. The bridge is already written in `site/assets/auth.js` and detects
the plugin at runtime; the apps ship unchanged until you do this:

1. In `app/`: `npm install @capacitor-firebase/authentication firebase`
2. Firebase console → project overview → **Add app → iOS**. Bundle ID
   exactly `ai.visualneuroscience.app`. Download
   **GoogleService-Info.plist** → in Xcode, drag it into `App/App/`
   (tick "Copy items if needed", target App).
3. **Add app → Android**, package `ai.visualneuroscience.app`. Before
   downloading, add your signing key's **SHA-1 and SHA-256** fingerprints
   (Play Console → your app → Setup → App signing shows them; for local
   debug builds also add the fingerprint from
   `cd app/android && ./gradlew signingReport`). Download
   **google-services.json** → put it at `app/android/app/`.
4. `npm run sync` in `app/`, rebuild in Xcode / Android Studio.
5. The iOS Google flow also needs the reversed client id as a URL scheme:
   open GoogleService-Info.plist, copy `REVERSED_CLIENT_ID`, and in Xcode →
   App target → Info → URL Types → add a URL scheme with that value
   (keep the existing `visualneuroscience` one too).

## 6 · Apple sign-in

App Store **guideline 4.8**: because the iOS app offers Google/LinkedIn
sign-in it *must* offer Sign in with Apple — so do this section before the
next store submission that ships accounts. Two Apple quirks are already
handled in code: the name Apple sends **only on the very first
authorisation** is captured and stored immediately, and a **Hide My Email**
relay address is treated as a perfectly normal email everywhere.

### Apple Developer console (for web sign-in)

1. https://developer.apple.com/account → **Certificates, Identifiers &
   Profiles → Identifiers** → select the App ID `ai.visualneuroscience.app`
   → tick the **Sign in with Apple** capability → Save.
2. **Identifiers → + → Services IDs** → identifier e.g.
   `ai.visualneuroscience.web`, description "VisualNeuroscience web" →
   register, then open it → enable **Sign in with Apple** → **Configure**:
   - Primary App ID: `ai.visualneuroscience.app`
   - Domains: your `authDomain` (e.g. `visualneuroscience.firebaseapp.com`,
     or your custom auth domain once you have one)
   - Return URLs: `https://<authDomain>/__/auth/handler`
3. **Keys → +** → name "Firebase Apple sign-in" → tick **Sign in with
   Apple** → Configure → choose the primary App ID → register → **download
   the .p8 file** (one chance only) and note the **Key ID** and your **Team
   ID** (top right of the developer site).

### Firebase console

4. **Authentication → Sign-in method → Add new provider → Apple** → Enable.
   Services ID `ai.visualneuroscience.web`; under the OAuth code flow
   section enter Team ID, Key ID, and paste the contents of the .p8 →
   Save.
5. Flip `apple: true` in `firebase-config.js` (bump sw VERSION).

### The apps

6. In Xcode: App target → **Signing & Capabilities → + Capability → Sign in
   with Apple** (this adds the entitlement; the sandbox entitlements file
   already in the repo is untouched by it).
7. The same `@capacitor-firebase/authentication` plugin from the Google
   section drives the native Apple sheet — nothing more to install. It works
   on the Mac Catalyst build too, which keeps guideline 4.8 satisfied there.

## 7 · LinkedIn sign-in

LinkedIn is not a built-in Firebase provider. Two workable designs:

- **Option A — OIDC through Identity Platform.** LinkedIn speaks "Sign In
  with LinkedIn using OpenID Connect", and Firebase can consume any OIDC
  provider — but only after upgrading the project to **Firebase Auth with
  Identity Platform**, which moves the whole project onto Identity
  Platform's pricing: OIDC/SAML sign-ins have their own small free tier
  (~50 monthly active users at last check — verify on the pricing page)
  before per-user billing starts. Setup is a few console clicks and a
  15-line client, but LinkedIn's OIDC has sharp edges (its ID tokens lack a
  `nonce`, so only the code flow works) and the *native apps* still need a
  browser round trip.

- **Option B — custom-token flow (built here, recommended).** A ~350-line
  Cloudflare Worker (`auth-worker/` in this repo) runs the LinkedIn OAuth
  dance server-side, reads the profile from LinkedIn's `userinfo` endpoint
  (sidestepping the ID-token quirks entirely), and mints a **Firebase
  custom token** with the service account; the client signs in with that
  token. No Identity Platform, no per-user pricing, and the worker also
  refuses to create a duplicate account when the email already signed up
  another way. You already deploy on Cloudflare Workers, so the moving part
  lands on infrastructure you run anyway. That is why B is the one
  implemented.

### LinkedIn developer console

1. https://www.linkedin.com/developers/apps → **Create app**. It must be
   attached to a LinkedIn **company page** (create a bare one for
   OttomanLabs if needed).
2. In the app → **Products** tab → request **"Sign In with LinkedIn using
   OpenID Connect"** (self-serve, approves instantly).
3. **Auth** tab → note the **Client ID** and **Client Secret** → under
   **Authorized redirect URLs** add:
   `https://visualneuroscience-auth.<your-account>.workers.dev/auth/linkedin/callback`
   (you'll know the exact host after the first deploy in a moment — come
   back and paste it).

### The service account key (lets the worker mint Firebase tokens)

4. Firebase console → project settings (gear) → **Service accounts** →
   **Generate new private key** → a JSON file downloads. Treat it like a
   password. You need two fields from it: `client_email` and `private_key`.

### Deploy the worker

5. Edit `auth-worker/wrangler.jsonc`: fill in `FIREBASE_PROJECT_ID`,
   `SA_EMAIL` (= `client_email`), `LINKEDIN_CLIENT_ID`, and check
   `ALLOWED_ORIGINS` lists exactly the origins the site is served from.
6. In `auth-worker/`:

   ```
   npx wrangler secret put LINKEDIN_CLIENT_SECRET   # paste the client secret
   npx wrangler secret put SA_PRIVATE_KEY           # paste the private_key value,
                                                    # the whole -----BEGIN…END----- block
   npx wrangler deploy
   ```
7. The deploy prints the worker URL. Paste it into LinkedIn's redirect URLs
   (step 3) **with `/auth/linkedin/callback` appended**, and into
   `firebase-config.js` as `linkedinWorker: "https://…workers.dev"`. Flip
   `linkedin: true`. Bump the sw VERSION.

### In the apps

The apps run LinkedIn in the **system browser** and come home on the
`visualneuroscience://` deep link — the URL scheme is already registered in
the iOS plist and Android manifest in this repo. The round trip needs the
`@capacitor/browser` plugin: `npm install @capacitor/browser` in `app/`,
then `npm run sync`. (Without it the LinkedIn button hides itself in the
apps and everything else still works.)

## 8 · When you switch it on, say so

The moment `VN_FIREBASE` is non-null, two published statements become
outdated. Update, in the same release:

- **site/privacy.html** — it currently promises *no third-party requests at
  all*. Accounts add requests to Google (Firebase Auth/Firestore) and, when
  used, LinkedIn — and store account email, name and saved files.
- **App Store / Play Store privacy labels** — currently "Data Not
  Collected". With accounts: Contact Info (email, name) and User Content
  (saved files), linked to identity, not used for tracking.

## 9 · Costs

Plain Firebase Auth (email, Google, Apple, and custom tokens — i.e.
everything here): free at any realistic scale. Firestore free tier: 1 GiB
stored, 50k reads/20k writes per day — saved settings won't dent it. The
Cloudflare Worker: free tier covers 100k requests/day. The one paid trap —
Identity Platform per-MAU pricing — only exists on Option A, which is why it
wasn't built.

## Appendix · Rebuilding the vendored SDK

`site/vendor/firebase/firebase-bundle.js` is the official npm `firebase`
package (app + auth + firestore-lite), bundled so the site serves every byte
itself. To bump the SDK: `npm install firebase esbuild`, recreate the
re-export entry file listed in `site/vendor/firebase/NOTICE.md` (every
symbol `assets/auth.js` and `assets/userdata.js` import), then
`npx esbuild entry.js --bundle --format=esm --minify --outfile=firebase-bundle.js`.
