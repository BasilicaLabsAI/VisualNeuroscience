/* The account system: Firebase Authentication with Google, Apple, LinkedIn,
   email+password, passwordless email links and password reset — one module,
   no UI assumptions, the same account on the web and inside the wrapped
   iOS, Mac and Android apps.

   Dormant by design: if assets/firebase-config.js left window.VN_FIREBASE
   as null, this module exports a stub that says so and loads nothing — no
   SDK, no network, no cost. The UI checks `enabled` and simply does not
   mount.

   Sessions belong to the Firebase SDK: its own IndexedDB persistence keeps
   the user signed in across launches on every platform, and nothing here
   ever stores a token by hand.

   The native bridge. Inside a webview wrapper, Google refuses OAuth
   outright (disallowed_useragent) and popups do not exist, so on a native
   platform Google and Apple go through the @capacitor-firebase/authentication
   plugin when it is installed: the PLUGIN runs the real native sign-in
   sheet, hands back the OAuth credential, and the credential is replayed
   into the JS SDK with signInWithCredential so the webview session is
   signed in too. The plugin is detected at runtime; a build without it
   simply hides those buttons and email keeps working, so shipping the app
   with accounts dormant costs nothing.

   LinkedIn is not a Firebase provider. The auth-worker (auth-worker/ in
   this repo, deployed on Cloudflare Workers) runs the OAuth dance
   server-side and mints a Firebase custom token; here that is one popup
   (web) or one system-browser round trip ending in a deep link (apps),
   then signInWithCustomToken. The worker also refuses to create a second
   account for an email that already signed up another way — that comes
   back as a needs-link answer, never a duplicate.

   On the web everything uses popups, never signInWithRedirect: Safari's
   third-party-storage rules silently break the redirect flow on the
   default *.firebaseapp.com authDomain, and the popup flow is the
   documented way out (the setup guide covers moving authDomain to the
   site's own domain as well). */

const CFG = (typeof window !== "undefined" && window.VN_FIREBASE) || null;

/* ── the friendly error dictionary ─────────────────────────────────────────
   Every code a person can plausibly hit, as a plain sentence. Nothing raw
   ever reaches the UI: unknown codes fall back to a generic line. */
const ERRORS = {
  "auth/invalid-email":            "That doesn't look like an email address.",
  "auth/missing-email":            "Enter your email address first.",
  "auth/missing-password":         "Enter your password.",
  "auth/user-disabled":            "This account has been disabled.",
  "auth/user-not-found":           "No account uses that email — create one instead.",
  "auth/wrong-password":           "That password is wrong. Try again, or reset it.",
  "auth/invalid-credential":       "That email or password is wrong. Try again, or reset the password.",
  "auth/invalid-login-credentials":"That email or password is wrong. Try again, or reset the password.",
  "auth/email-already-in-use":     "That email already has an account — log in instead.",
  "auth/weak-password":            "That password is too short — use at least six characters.",
  "auth/too-many-requests":        "Too many attempts in a row. Wait a little and try again.",
  "auth/network-request-failed":   "Couldn't reach the sign-in service — check your connection.",
  "auth/popup-blocked":            "The browser blocked the sign-in window — allow pop-ups for this site and try again.",
  "auth/popup-closed-by-user":     "The sign-in window was closed before finishing.",
  "auth/cancelled-popup-request":  "The sign-in window was closed before finishing.",
  "auth/user-cancelled":           "Sign-in was cancelled.",
  "auth/expired-action-code":      "That sign-in link has expired — request a fresh one.",
  "auth/invalid-action-code":      "That sign-in link has already been used or is no longer valid — request a fresh one.",
  "auth/requires-recent-login":    "For safety, log in again before doing that.",
  "auth/user-mismatch":            "That was a different account. Sign in with the account you want to delete, then try again.",
  "auth/unauthorized-domain":      "This copy of the app isn't authorised for sign-in — the site's domain needs adding in the Firebase console.",
  "auth/operation-not-allowed":    "That sign-in method isn't switched on for this app.",
  "auth/configuration-not-found":  "Sign-in isn't set up for this app yet.",
  "auth/credential-already-in-use":"That sign-in method already belongs to a different account.",
  "auth/provider-already-linked":  "That sign-in method is already connected to this account.",
  "auth/web-storage-unsupported":  "The browser is blocking site storage, which sign-in needs — private-browsing modes often do this.",
  "vn/passwords-differ":           "The two passwords don't match.",
  "vn/current-wrong":              "That is not the current password. Try again, or have a reset emailed to you.",
  "vn/same-password":              "That is the password already in use. Choose a new one.",
  "vn/no-password":                "This account logs in without a password of its own, through Google, Apple or an emailed link, so there is none to change.",
  "vn/username-missing":           "Choose a username first.",
  "vn/username-format":            "A username is 3 to 20 characters: letters, numbers and underscores.",
  "vn/username-taken":             "That username is taken — try another.",
  "vn/username-refused":           "The database refused the username, and not because it is taken: its rules do not allow usernames yet. The site's Firestore rules need publishing.",
  "vn/username-check-refused":     "The database refused the username check, and not because of your connection: its rules do not allow usernames yet. The site's Firestore rules need publishing.",
  "vn/disabled":                   "Accounts are switched off in this copy of the app.",
  "vn/link-cancelled":             "Sign-in was cancelled."
};

function friendly(err){
  const code = err && (err.code || err.vnCode);
  const known = code && ERRORS[code];
  /* the underlying code rides along in brackets, so a message that cannot
     name the cause at least shows it: "(permission-denied)" is the rules,
     "(unavailable)" the network, "auth/…" Firebase's own verdict */
  const detail = (err && err.detail) || (!known && code && code !== "unknown" ? code : null);
  const e = new Error((known || "Something went wrong signing in. Try again.") + (detail ? " (" + detail + ")" : ""));
  e.code = code || "unknown";
  e.cause = err;
  return e;
}

/* ── dormant stub ─────────────────────────────────────────────────────── */
/* with no config the feature is dormant; with a reason it could not start
   (the library did not load, or the SDK refused), and the account page
   says so (v12.45): until then a failure left every importer waiting */
function dormant(reason){
  const off = () => Promise.reject(friendly({ code: "vn/disabled" }));
  return {
    enabled: false,
    reason: reason ? String((reason && reason.message) || reason) : null,
    onUser(cb){ cb(null); return () => {}; },
    currentUser: () => null,
    providers: { google:false, apple:false, linkedin:false, emailLink:false },
    signInWithGoogle: off, signInWithApple: off, signInWithLinkedIn: off,
    signUpWithEmail: off, signInWithEmail: off, sendReset: off,
    sendSignInLink: off, completeSignInLink: off,
    linkProvider: off, deleteAccount: off, changePassword: off, hasPassword: () => false, signOut: () => Promise.resolve(),
    usernameFree: off, setUsername: off, setUniversity: off, loadProfile: () => Promise.resolve(null), profile: () => null,
    pendingEmailLink: false, pendingLink: null, db: null, sdk: null,
    track(){}, changed(){},
    ready: Promise.resolve(null),
    nativeUser: null, nativeWhy: null
  };
}

/* a wait with a limit (v12.45): the sign-in library must arrive, or the
   page must hear why, rather than wait on it for ever */
function within(ms, what, p){
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(what)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

/* ── the platform ─────────────────────────────────────────────────────── */
/* read before the library is in (hoisted from build in v12.53, so the face
   below can say which providers there are before the build settles) */
const cap = typeof window !== "undefined" ? window.Capacitor : null;
const isNative = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
const plugin  = isNative && cap.Plugins ? cap.Plugins.FirebaseAuthentication : null;
const browser = isNative && cap.Plugins ? cap.Plugins.Browser : null;
const appPlug = isNative && cap.Plugins ? cap.Plugins.App : null;
const wantP = Object.assign({ google:true, apple:true, linkedin:true, emailLink:true },
                            (CFG && CFG.providers) || {});
/* what can actually work HERE: native Google/Apple need the plugin;
   LinkedIn needs the worker, and inside an app also a system browser to
   do OAuth in (webviews are unwelcome at OAuth endpoints) plus the deep
   link listener to come home on. A provider flag may also be the string
   "app": offered only inside the wrapped apps — the shape of Sign in
   with Apple when the App Store build carries it before the web has its
   Services ID. */
const on = v => v === true || (v === "app" && isNative);
const providers = {
  google:   on(wantP.google)   && (!isNative || !!plugin),
  apple:    on(wantP.apple)    && (!isNative || !!plugin),
  linkedin: on(wantP.linkedin) && !!(CFG && CFG.linkedinWorker) && (!isNative || (!!browser && !!appPlug)),
  emailLink: wantP.emailLink !== false
};

/* ── the account kept on the device ───────────────────────────────────── */
/* Opening a page must not pull the account (v12.54, at the owner's word):
   what it holds is loaded into the device's own storage at login and read
   from there. One record, vn-account in localStorage: who (uid, email, name,
   the sign-ins, when the account was made and last logged in), the profile
   document (the username and the university), every tool's files with their
   data (the saved maps, the practice progress), `warmed`, when it was last
   read whole from the server, and `from`, the page or the native layer. It
   is written as a sign-in settles (warm, from took), kept in step by every
   write the pages make (saveProfile here, userdata.js for the files), handed
   in by the iOS shell at document start from what the native layer read at
   its own login (VN_NATIVE_AUTH.account, Firestore's REST documents, decoded
   by fromRest and written by takeHandover below), read again quietly when it
   is old, and cleared at sign-out and deletion. Every change is announced on
   window as vn-account, which the pages draw again on. */
const KEPT_KEY = "vn-account", KEPT_V = 1, FRESH_FOR = 5 * 60 * 1000;
function readKept(){
  try{
    const o = JSON.parse(localStorage.getItem(KEPT_KEY) || "null");
    return o && o.v === KEPT_V && o.uid ? o : null;
  }catch(_){ return null; }
}
function writeKept(o){
  try{ localStorage.setItem(KEPT_KEY, JSON.stringify(o)); }catch(_){}
  announce();
}
function clearKept(){
  let had = false;
  try{ had = !!localStorage.getItem(KEPT_KEY); localStorage.removeItem(KEPT_KEY); }catch(_){}
  if (had) announce();
}
function announce(){ try{ window.dispatchEvent(new CustomEvent("vn-account")); }catch(_){} }
/* a change to the copy of one account, or to whatever copy there is; nothing without one */
function changeKept(uid, fn){
  const o = readKept();
  if (!o || (uid && o.uid !== uid)) return false;
  fn(o);
  writeKept(o);
  return true;
}
/* a time as the copy keeps it, ISO text: from the SDK's Timestamp, a Date, a number or text */
function iso(v){
  if (!v) return null;
  try{
    if (typeof v.toDate === "function") return v.toDate().toISOString();
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "number") return new Date(v).toISOString();
    if (typeof v === "object" && typeof v.seconds === "number") return new Date(v.seconds * 1000).toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }catch(_){ return null; }
}
/* a document as the copy keeps it: plain values, its times ISO text */
function plainDoc(o){
  if (Array.isArray(o)) return o.map(plainDoc);
  if (o && typeof o === "object"){
    if (typeof o.toDate === "function") return iso(o);
    const out = {};
    Object.keys(o).forEach(k => { out[k] = plainDoc(o[k]); });
    return out;
  }
  return o === undefined ? null : o;
}
/* Firestore's REST shapes, as the native layer reads them, as plain values */
function fromRest(v){
  if (!v || typeof v !== "object") return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("nullValue" in v) return null;
  if ("timestampValue" in v) return v.timestampValue;
  if ("mapValue" in v) return fromRestFields(v.mapValue && v.mapValue.fields);
  if ("arrayValue" in v) return ((v.arrayValue && v.arrayValue.values) || []).map(fromRest);
  if ("referenceValue" in v) return v.referenceValue;
  if ("geoPointValue" in v) return v.geoPointValue;
  if ("bytesValue" in v) return v.bytesValue;
  return null;
}
function fromRestFields(fields){
  const out = {};
  Object.keys(fields || {}).forEach(k => { out[k] = fromRest(fields[k]); });
  return out;
}
/* a document's fields, {} for one with none, null for none at all */
function restDoc(d){
  if (!d || typeof d !== "object" || d.error) return null;
  if (d.fields) return fromRestFields(d.fields);
  return d.name ? {} : null;
}
/* a collection's documents as the copy keeps a tool's files */
function restFiles(list){
  const docs = list && Array.isArray(list.documents) ? list.documents : [];
  const rows = docs.map(d => {
    const v = restDoc(d) || {};
    const id = String(d.name || "").split("/").pop();
    return { name: v.name || safeDecode(id), updated: iso(v.updatedAt), data: v.data === undefined ? null : v.data };
  });
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}
function safeDecode(s){ try{ return decodeURIComponent(s); }catch(_){ return s; } }
/* the iOS shell's hand-over: what the native layer read at its login, into
   the copy before the page reads it, unless the page's own copy is newer */
function takeHandover(h){
  if (!h || !h.user || !h.user.uid || !h.account || typeof h.account !== "object") return false;
  const a = h.account, at = Number(a.at) || Date.now();
  const have = readKept();
  if (have && have.uid === h.user.uid && (have.warmed || 0) >= at) return false;
  const tools = {};
  Object.keys(a.tools || {}).forEach(t => { tools[t] = restFiles(a.tools[t]); });
  const profile = restDoc(a.profile) || (have && have.uid === h.user.uid ? have.profile : null);
  writeKept({
    v: KEPT_V, uid: h.user.uid,
    email: h.user.email || (profile && profile.email) || "",
    name: h.user.name || (profile && (profile.displayName || profile.name)) || "",
    providers: h.user.provider ? [h.user.provider] : [],
    created: iso(h.user.created), lastSignIn: iso(h.user.lastSignIn),
    profile: profile ? plainDoc(profile) : null, tools, warmed: at, from: "native"
  });
  return true;
}
/* the shell's word on the account, as it wrote it at document start (v12.46) */
const NATIVE = isNative && typeof window !== "undefined" && window.VN_NATIVE_AUTH && typeof window.VN_NATIVE_AUTH === "object"
  ? window.VN_NATIVE_AUTH : null;
takeHandover(NATIVE);

/* ── the live module ──────────────────────────────────────────────────── */
async function build(){
  const sdk = await within(20000, "the sign-in library did not load within 20 seconds", import("../vendor/firebase/firebase-bundle.js"));
  const app  = sdk.initializeApp(CFG);

  /* Inside the apps, auth is initialised without the popup-redirect helper.
     getAuth() attaches one, and on iOS that helper loads a hidden Google
     iframe before it lets anything else run; in a WebKit web view that load
     can simply never finish, and every sign-in, and the auth-state event
     itself, then waits behind it for ever. The apps never use popups or
     redirects: Apple and Google go through the native sheets and are
     replayed as credentials, email needs no helper at all. The web keeps
     getAuth(), whose popups it does use. */
  const auth = isNative
    ? sdk.initializeAuth(app, { persistence: [sdk.indexedDBLocalPersistence, sdk.browserLocalPersistence] })
    : sdk.getAuth(app);
  const db   = sdk.getFirestore(app);

  /* ── the native account (v12.46) ─────────────────────────────────────
     In the iOS app the Account tab logs in natively (AccountAuth.swift),
     and the shell writes window.VN_NATIVE_AUTH into every page at document
     start: who is logged in, a custom token the auth worker minted for the
     page where the worker is deployed, and the credential the sign-in made
     where it can be used again (Google's tokens, an email and password;
     never Apple's token, which is spent once). The page's own SDK follows
     it before anyone hears the first state (followNative): signs in where
     the native layer is and the page is not, or is someone else, and signs
     out where the native layer has no one; a page that signs in or out by
     itself tells the shell (tellShell), and the native layer follows. The
     website, the Android app and a shell that writes nothing see none of
     this. */
  const native = NATIVE;
  const nativeUser = native && native.user && native.user.uid ? native.user : null;
  let nativeWhy = null;
  function tellShell(msg){
    try{ window.webkit.messageHandlers.vnShell.postMessage(msg); }catch(_){}
  }
  let following = false;
  async function followNative(current){
    if (!native) return;
    following = true;
    try{
      if (!nativeUser){
        if (current) await sdk.signOut(auth);
        return;
      }
      if (current && current.uid === nativeUser.uid) return;
      const h = native.handoff;
      if (native.token){
        await within(15000, "the sign-in took too long", sdk.signInWithCustomToken(auth, native.token));
      } else if (h && h.provider === "google.com" && h.idToken){
        await within(15000, "the sign-in took too long",
          sdk.signInWithCredential(auth, sdk.GoogleAuthProvider.credential(h.idToken, h.accessToken || null)));
        tellShell({ auth: "took" });
      } else if (h && h.provider === "password" && h.email && h.password){
        await within(15000, "the sign-in took too long", sdk.signInWithEmailAndPassword(auth, h.email, h.password));
        tellShell({ auth: "took" });
      } else {
        nativeWhy = "that sign-in cannot be passed to a page without the auth worker";
      }
    }catch(err){
      nativeWhy = (err && err.message) || String(err);
      try{ console.warn("the native account could not be followed:", err); }catch(_){}
    }finally{ following = false; }
  }
  /* the password the page's own email sign-in used, for the shell alone;
     never written anywhere else */
  let lastPassword = null;
  function heardSignIn(u){
    const password = lastPassword;
    lastPassword = null;
    if (!native || !u) return;
    const provider = (u.providerData && u.providerData[0] && u.providerData[0].providerId) || "password";
    Promise.resolve().then(() => u.getIdToken()).catch(() => "").then(idToken => {
      tellShell({ auth: "signedIn", provider, email: u.email || "",
                  password: provider === "password" && password ? password : "", idToken: idToken || "" });
    });
  }

  /* ── usage counts ──────────────────────────────────────────────────────
     Google Analytics for Firebase, named on the privacy page: which pages
     and screens are opened, each sign-in and the way it was made, the kind
     of device, and the country, to decide what to build next. On the
     website the SDK's own analytics module sends to the measurementId's
     stream; inside the apps the native plugin counts (a page there is a
     screen, named by its file), so the web module stays out of the web
     view and nothing is counted twice. CFG.analytics governs both: true
     (the default) counts everywhere, "app" keeps the website silent, with
     no analytics cookie, and counts in the apps alone, and false turns it
     off everywhere. Every call here is best effort: counting never gets
     in the way of signing in. Since v12.30, at the owner's word, only the
     website and the approved app count: the website on its own address
     alone (a preview build, a local copy and the checks run on this code
     stay silent), and the app only as the App Store installed it. The iOS
     shell says which it is before a page runs (VN_STORE, false for a
     TestFlight or Xcode build), and the iOS app starts with collection off
     (FIREBASE_ANALYTICS_COLLECTION_ENABLED in its Info.plist) until a page
     of an App Store build switches it on; the switch is kept on the device.
     The Android app, which says nothing, counts as before. */
  const gaWant = CFG.analytics === undefined ? true : CFG.analytics;
  const gaPlug = isNative && cap.Plugins ? cap.Plugins.FirebaseAnalytics : null;
  const gaLive = isNative ? window.VN_STORE !== false : /(^|\.)visualneuroscience\.ai$/i.test(location.hostname);
  let ga = null;
  if (gaPlug){
    /* not waited on (v12.45): a native call that never answered held every
       sign-in behind it, and counting never gets in the way of signing in */
    try{ Promise.resolve(gaPlug.setEnabled({ enabled: gaWant !== false && gaLive })).catch(() => {}); }catch(_){}
    if (gaWant !== false && gaLive){
      const page = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "");
      try{ gaPlug.setCurrentScreen({ screenName: page }).catch(() => {}); }catch(_){}
    }
  } else if (!isNative && gaWant === true && CFG.measurementId && gaLive){
    try{ if (await sdk.isSupported()) ga = sdk.getAnalytics(app); }catch(_){}
  }
  function track(name, params){
    try{
      if (gaPlug){ if (gaWant !== false && gaLive) gaPlug.logEvent({ name, params: params || {} }).catch(() => {}); }
      else if (ga) sdk.logEvent(ga, name, params || {});
    }catch(_){}
  }
  /* the way a sign-in was made, as the counts name it */
  const METHOD = { "google.com": "google", "apple.com": "apple", password: "email", emailLink: "email_link" };
  function method(id){ return METHOD[id] || (id ? String(id).replace(/\.com$/, "") : "unknown"); }

  /* user state: null until the first state, or undefined while a native
     account is being followed, so nobody hears logged out meanwhile */
  const listeners = new Set();
  let user = nativeUser ? undefined : null, readyResolve, first = true, lastUid;
  const ready = new Promise(r => { readyResolve = r; });
  function notify(){ listeners.forEach(cb => { try{ cb(user); }catch(e){ console.error(e); } }); }
  function took(u){
    const id = u ? u.uid : null;
    if (!readyResolve && id === lastUid) return;
    lastUid = id;
    user = u || null;
    if (readyResolve){ readyResolve(user); readyResolve = null; }
    notify();
    /* the profile carries the username the nav shows; once it is read the
       listeners hear again, so a name drawn from the email is corrected;
       and from here the account is kept on the device (warm, v12.54) */
    if (user){ const p = loadProfile(user); p.then(notify, () => {}); warm(user, p); }
    else { profileCache = null; forget(); }
  }
  /* the account kept on the device (v12.54, at the owner's word): who, at
     once, then the whole of it from the server, unless the copy is fresh; in
     the app the native layer reads it at its own login and on each return to
     the front and hands it to every page, so a page there pulls only when
     nothing was ever read whole */
  let warming = null;
  function warm(u, profileP){
    if (warming) return warming;
    const have = readKept();
    const base = have && have.uid === u.uid ? have : { v: KEPT_V, uid: u.uid, profile: null, tools: {}, warmed: 0 };
    Object.assign(base, {
      email: u.email || "", name: u.displayName || "",
      providers: (u.providerData || []).map(p => p && p.providerId).filter(Boolean),
      created: iso(u.metadata && u.metadata.creationTime), lastSignIn: iso(u.metadata && u.metadata.lastSignInTime)
    });
    if (!base.from) base.from = "page";
    writeKept(base);
    const fresh = base.warmed && Date.now() - base.warmed < FRESH_FOR;
    if (fresh || (native && base.warmed)) return Promise.resolve();
    warming = (async () => {
      const prof = await (profileP || loadProfile(u));
      const idx = await sdk.getDoc(sdk.doc(db, "users", u.uid, "meta", "toolindex")).catch(() => null);
      const names = new Set(["regions", "practice"]);
      if (idx && idx.exists()) Object.keys(idx.data() || {}).forEach(t => names.add(t));
      const tools = {};
      for (const t of names){
        const snap = await sdk.getDocs(sdk.collection(db, "users", u.uid, "tools", t, "files"));
        const rows = [];
        snap.forEach(d => {
          const v = d.data() || {};
          rows.push({ name: v.name || safeDecode(d.id), updated: iso(v.updatedAt), data: v.data === undefined ? null : plainDoc(v.data) });
        });
        rows.sort((a, b) => a.name.localeCompare(b.name));
        tools[t] = rows;
      }
      changeKept(u.uid, o => { if (prof) o.profile = plainDoc(prof); o.tools = tools; o.warmed = Date.now(); o.from = "page"; });
    })().catch(e => { try{ console.warn("the account could not be read whole:", e && e.message); }catch(_){} })
      .then(() => { warming = null; });
    return warming;
  }
  /* logged out: the copy goes, unless the app holds the account and this
     page could not take its session, when the app's copy stands */
  function forget(){
    const have = readKept();
    if (!have) return;
    if (nativeUser && have.uid === nativeUser.uid) return;
    clearKept();
  }
  sdk.onAuthStateChanged(auth, u => {
    /* the first state: the native account is followed first (v12.46), and
       the states the following raises are reported once, after it */
    if (first){
      first = false;
      followNative(u || null).then(() => took(auth.currentUser));
      return;
    }
    if (following) return;
    took(u);
  });

  /* ── the profile document and the username ────────────────────────────
     The profile is the one document the auth system keeps: name, email,
     the username the person chose and, if they gave it, their university.
     A username is shown in place of the name everywhere. Each one is also
     a document in usernames/{name}, keyed by its lower-case form and
     holding the uid; the rules let a signed-in person create one only
     where none exists, so two people cannot end up with the same name
     however close together they try, and only its owner can delete it. */
  let profileCache = null;
  async function loadProfile(u){
    u = u || auth.currentUser;
    if (!u) return null;
    try{
      const snap = await sdk.getDoc(sdk.doc(db, "users", u.uid, "meta", "profile"));
      profileCache = Object.assign({ uid: u.uid }, snap.exists() ? snap.data() : {});
    }catch(e){ profileCache = profileCache || { uid: u.uid }; }
    changeKept(u.uid, o => { o.profile = plainDoc(profileCache); });
    return profileCache;
  }
  function profile(){ return profileCache; }
  const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
  function usernameKey(name){ return String(name || "").trim().toLowerCase(); }
  function checkUsername(name){
    const key = usernameKey(name);
    if (!key) throw friendly({ code: "vn/username-missing" });
    if (!USERNAME_RE.test(key)) throw friendly({ code: "vn/username-format" });
    return key;
  }
  async function usernameFree(name){
    const key = checkUsername(name);
    let snap;
    try{ snap = await sdk.getDoc(sdk.doc(db, "usernames", key)); }
    catch(err){
      /* a refusal is the rules, not the network: say which */
      const code = err && err.code || "";
      if (/permission|denied/i.test(code) || /permission/i.test(err && err.message || ""))
        throw friendly({ code: "vn/username-check-refused" });
      throw friendly({ code: "auth/network-request-failed", detail: "firestore: " + (code || (err && err.message) || "no answer") });
    }
    return !snap.exists();
  }
  async function claimUsername(u, name){
    const key = checkUsername(name);
    try{ await sdk.setDoc(sdk.doc(db, "usernames", key), { uid: u.uid }); }
    catch(err){
      const code = err && err.code || "";
      if (/permission|denied/i.test(code) || /permission/i.test(err && err.message || "")){
        /* refused: because someone holds the name (a create where a document
           exists is an update, which the rules forbid), because this person
           already holds it, or because the rules published in the console do
           not allow claims at all — which is not "taken", and says so */
        let snap = null;
        try{ snap = await sdk.getDoc(sdk.doc(db, "usernames", key)); }catch(_){}
        if (snap && snap.exists()){
          if ((snap.data() || {}).uid === u.uid) return key;
          throw friendly({ code: "vn/username-taken" });
        }
        throw friendly({ code: "vn/username-refused" });
      }
      throw friendly({ code: "auth/network-request-failed", detail: "firestore: " + (code || (err && err.message) || "no answer") });
    }
    return key;
  }
  async function releaseUsername(name){
    const key = usernameKey(name);
    if (!key) return;
    try{ await sdk.deleteDoc(sdk.doc(db, "usernames", key)); }catch(_){}
  }
  async function setUsername(name){
    const u = auth.currentUser;
    if (!u) throw friendly({ code: "auth/requires-recent-login" });
    const wanted = String(name || "").trim();
    const key = checkUsername(wanted);
    const cur = profileCache || await loadProfile(u) || {};
    if (usernameKey(cur.username) === key){
      if (cur.username !== wanted) await saveProfile(u, { username: wanted });
      return wanted;
    }
    await claimUsername(u, wanted);
    await saveProfile(u, { username: wanted });
    if (cur.username) await releaseUsername(cur.username);
    return wanted;
  }
  async function setUniversity(text){
    const u = auth.currentUser;
    if (!u) throw friendly({ code: "auth/requires-recent-login" });
    await saveProfile(u, { university: String(text || "").trim() });
    return profileCache && profileCache.university;
  }

  /* the profile document — the one piece of user data the auth system
     itself keeps, because two providers are forgetful: Apple sends the
     name only on the very first authorisation, and a custom-token user
     starts with an empty Firebase profile. Whatever arrives is written
     down before it can be lost. */
  async function saveProfile(u, extra){
    try{
      const refDoc = sdk.doc(db, "users", u.uid, "meta", "profile");
      const data = {
        displayName: u.displayName || (extra && extra.name) || "",
        email: u.email || (extra && extra.email) || "",
        updatedAt: sdk.serverTimestamp()
      };
      if (extra && extra.firstName) data.firstName = extra.firstName;
      if (extra && extra.lastName)  data.lastName  = extra.lastName;
      if (extra && typeof extra.username === "string") data.username = extra.username;
      if (extra && typeof extra.university === "string") data.university = extra.university;
      if (u.photoURL || (extra && extra.picture)) data.photoURL = u.photoURL || extra.picture;
      await sdk.setDoc(refDoc, data, { merge: true });
      profileCache = Object.assign({ uid: u.uid }, profileCache || {}, data, { updatedAt: null });
      changeKept(u.uid, o => { o.profile = plainDoc(profileCache); });
    }catch(e){ console.warn("profile save skipped:", e && e.message); }
  }

  async function adoptName(u, name){
    if (!name || (u.displayName && u.displayName.trim())) return;
    try{ await sdk.updateProfile(u, { displayName: name }); changeKept(u.uid, o => { o.name = name; }); }catch(e){}
  }

  /* ── account linking ──────────────────────────────────────────────────
     One account per email, kept friendly. When a provider sign-in hits an
     email that already signed up another way, the failed attempt's
     credential is held on to; the thrown error says, in words, which
     method to use; and the moment the owner signs in that way, the new
     provider is linked so both work from then on. */
  let pendingCred = null, pendingLinkedIn = false;
  let pendingLink = null;   /* {email, methods, methodsText} for the UI */

  function methodsText(methods){
    const names = { password: "email and password", "google.com": "Google",
                    "apple.com": "Apple", emailLink: "an emailed sign-in link" };
    const list = (methods || []).map(m => names[m] || m);
    return list.length ? list.join(" or ") : "the way it was originally created";
  }
  async function collide(err){
    const email = err && err.customData && err.customData.email;
    let methods = [];
    try{ if (email) methods = await sdk.fetchSignInMethodsForEmail(auth, email); }catch(_){}
    try{ pendingCred = sdk.OAuthProvider.credentialFromError(err) ||
                       sdk.GoogleAuthProvider.credentialFromError(err); }
    catch(_){ pendingCred = null; }
    pendingLink = { email: email || "", methods, methodsText: methodsText(methods) };
    const e = new Error("That email already has an account using " + pendingLink.methodsText +
      " — sign in that way and " + (pendingCred || pendingLinkedIn ? "the new method will be connected automatically." : "you can connect this method afterwards."));
    e.code = "vn/needs-link";
    return e;
  }
  async function finishPendingLink(u){
    if (pendingCred && u && pendingLink && u.email &&
        u.email.toLowerCase() === (pendingLink.email || "").toLowerCase()){
      try{ await sdk.linkWithCredential(u, pendingCred); }catch(e){ console.warn(e); }
      pendingCred = null;
    }
    if (pendingLinkedIn && u){
      pendingLinkedIn = false;
      try{ await linkLinkedIn(); }catch(e){ console.warn(e); }
    }
    pendingLink = null;
  }

  async function settled(credPromise, extra){
    let res;
    try{ res = await credPromise; }
    catch(err){
      if (err && err.code === "auth/account-exists-with-different-credential") throw await collide(err);
      throw friendly(err);
    }
    const u = res.user || auth.currentUser;
    let info = null;
    try{ info = sdk.getAdditionalUserInfo(res); }catch(_){}
    /* the sign-in counted, as a first one or a return, by its method */
    track(info && info.isNewUser ? "sign_up" : "login", { method: method(info && info.providerId) });
    /* Apple's one-time name, Google's photo, LinkedIn's profile — capture
       whatever this sign-in carried before it evaporates */
    let name = extra && extra.name;
    try{
      const p = info && info.profile;
      if (!name && p){
        name = p.name || [p.given_name || p.firstName, p.family_name || p.lastName]
          .filter(Boolean).join(" ");
      }
    }catch(_){}
    await adoptName(u, name);
    await saveProfile(u, Object.assign({ name }, extra));
    await finishPendingLink(u);
    heardSignIn(u);
    return u;
  }

  /* ── Google ──────────────────────────────────────────────────────────── */
  async function signInWithGoogle(){
    if (!providers.google) throw friendly({ code: "auth/operation-not-allowed" });
    if (plugin){
      /* the native sheet signs in, then the credential is replayed into the
         JS SDK so the webview holds the session too */
      let res;
      try{ res = await plugin.signInWithGoogle({ skipNativeAuth: false }); }
      catch(err){ throw friendly({ code: canc(err) || "auth/network-request-failed" }); }
      const c = res && res.credential;
      const cred = sdk.GoogleAuthProvider.credential(c && c.idToken, c && c.accessToken);
      return settled(sdk.signInWithCredential(auth, cred),
                     res.user ? { name: res.user.displayName } : null);
    }
    const p = new sdk.GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    return settled(sdk.signInWithPopup(auth, p));
  }

  /* ── Apple ───────────────────────────────────────────────────────────── */
  async function signInWithApple(){
    if (!providers.apple) throw friendly({ code: "auth/operation-not-allowed" });
    if (plugin){
      /* skipNativeAuth: the Apple ID token is consumed once, by the JS SDK,
         with the raw nonce the plugin used — signing the native layer in
         as well would spend the token twice */
      let res;
      try{ res = await plugin.signInWithApple({ skipNativeAuth: true }); }
      catch(err){ throw friendly({ code: canc(err) || "auth/network-request-failed" }); }
      const c = res && res.credential;
      const prov = new sdk.OAuthProvider("apple.com");
      const cred = prov.credential({ idToken: c && c.idToken, rawNonce: c && c.nonce });
      /* Apple sends the person's name only on the very first authorisation */
      const name = res.user && res.user.displayName;
      return settled(sdk.signInWithCredential(auth, cred), name ? { name } : null);
    }
    const p = new sdk.OAuthProvider("apple.com");
    p.addScope("email"); p.addScope("name");
    return settled(sdk.signInWithPopup(auth, p));
  }

  function canc(err){
    const m = String(err && (err.message || err.code) || "").toLowerCase();
    return (m.includes("cancel") || m.includes("1001")) ? "auth/user-cancelled" : null;
  }

  /* ── LinkedIn (custom token via the auth-worker) ─────────────────────── */
  const worker = (CFG.linkedinWorker || "").replace(/\/$/, "");

  function linkedInRound(mode){
    /* One round trip to the worker. Web: a popup that posts back
       {token|ticket|collision} and closes. App: the system browser, coming
       home on the visualneuroscience:// deep link. */
    return new Promise((resolve, reject) => {
      const url = worker + "/auth/linkedin/start?mode=" + mode +
                  "&origin=" + encodeURIComponent(location.origin);
      let done = false, timer = null, pop = null;
      function finish(fn, v){
        if (done) return; done = true;
        clearInterval(timer);
        window.removeEventListener("message", onMsg);
        /* Capacitor's addListener resolves to its handle asynchronously */
        if (sub) Promise.resolve(sub).then(h => { if (h && h.remove) h.remove(); }).catch(() => {});
        fn(v);
      }
      function payload(d){
        if (d.collision) return finish(resolve, d);
        if (d.token || d.ticket) return finish(resolve, d);
        finish(reject, friendly({ code: "vn/link-cancelled" }));
      }
      function onMsg(ev){
        if (ev.origin !== worker) return;
        const d = ev.data;
        if (d && d.source === "vn-linkedin") payload(d);
      }
      let sub = null;
      if (isNative){
        sub = appPlug.addListener("appUrlOpen", ({ url: u }) => {
          try{
            const h = new URL(u.replace(/^[a-z.]+:\/\//i, "https://x/"));
            const q = new URLSearchParams(h.hash ? h.hash.slice(1) : h.search);
            if (browser && browser.close) browser.close().catch(() => {});
            payload({ token: q.get("token") || undefined,
                      ticket: q.get("ticket") || undefined,
                      collision: q.get("collision") ? JSON.parse(q.get("collision")) : undefined,
                      profile: q.get("profile") ? JSON.parse(q.get("profile")) : undefined });
          }catch(e){ finish(reject, friendly(e)); }
        });
        browser.open({ url: url + "&app=1" }).catch(e => finish(reject, friendly(e)));
      } else {
        window.addEventListener("message", onMsg);
        pop = window.open(url, "vn-linkedin", "width=560,height=720");
        if (!pop) return finish(reject, friendly({ code: "auth/popup-blocked" }));
        timer = setInterval(() => {
          if (pop.closed) finish(reject, friendly({ code: "auth/popup-closed-by-user" }));
        }, 500);
      }
    });
  }

  async function signInWithLinkedIn(){
    if (!providers.linkedin) throw friendly({ code: "auth/operation-not-allowed" });
    const d = await linkedInRound("signin");
    if (d.collision){
      /* the worker found this email already has an account another way;
         remember the wish so signing in the right way links LinkedIn */
      pendingLinkedIn = true;
      pendingLink = { email: d.collision.email || "", methods: d.collision.methods || [],
                      methodsText: methodsText(d.collision.methods) };
      const e = new Error("That email already has an account using " + pendingLink.methodsText +
        " — sign in that way and LinkedIn will be connected automatically.");
      e.code = "vn/needs-link";
      throw e;
    }
    const res = await sdk.signInWithCustomToken(auth, d.token).catch(e => { throw friendly(e); });
    const u = res.user;
    let fresh = false;
    try{ const i = sdk.getAdditionalUserInfo(res); fresh = !!(i && i.isNewUser); }catch(_){}
    track(fresh ? "sign_up" : "login", { method: "linkedin" });
    const prof = d.profile || {};
    await adoptName(u, prof.name);
    await saveProfile(u, prof);
    return u;
  }

  async function linkLinkedIn(){
    const u = auth.currentUser;
    if (!u) throw friendly({ code: "auth/requires-recent-login" });
    const d = await linkedInRound("link");
    if (!d.ticket) throw friendly({ code: "vn/link-cancelled" });
    const idToken = await u.getIdToken();
    const r = await fetch(worker + "/auth/linkedin/link", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + idToken },
      body: JSON.stringify({ ticket: d.ticket })
    });
    if (!r.ok) throw friendly({ code: "auth/network-request-failed" });
    return u;
  }

  /* ── email + password ────────────────────────────────────────────────── */
  async function signUpWithEmail({ firstName, lastName, username, university, email, password, confirm }){
    if (password !== confirm) throw friendly({ code: "vn/passwords-differ" });
    /* the username is checked before the account exists, so a taken name
       costs nothing but a second try; the claim after creation is what
       makes it certain */
    const wanted = String(username || "").trim();
    checkUsername(wanted);
    if (!(await usernameFree(wanted))) throw friendly({ code: "vn/username-taken" });
    let res;
    try{ res = await sdk.createUserWithEmailAndPassword(auth, email, password); }
    catch(err){ throw friendly(err); }
    track("sign_up", { method: "email" });
    const name = [firstName, lastName].map(s => (s || "").trim()).filter(Boolean).join(" ");
    if (name) await adoptName(res.user, name);
    let claimed = null, refusal = null;
    try{ claimed = await claimUsername(res.user, wanted); }catch(err){ refusal = err; }
    await saveProfile(res.user, { firstName, lastName, name, username: claimed ? wanted : "", university: String(university || "").trim() });
    await finishPendingLink(res.user);
    lastPassword = password;
    heardSignIn(res.user);
    if (!claimed) throw Object.assign(refusal || friendly({ code: "vn/username-taken" }), { keepOpen: true, user: res.user });
    return res.user;
  }

  async function signInWithEmail(email, password){
    lastPassword = password;
    try{ return await settled(sdk.signInWithEmailAndPassword(auth, email, password)); }
    finally{ lastPassword = null; }
  }

  async function sendReset(email){
    try{ await sdk.sendPasswordResetEmail(auth, email); }
    catch(err){ throw friendly(err); }
  }

  /* ── passwordless email link ─────────────────────────────────────────── */
  const EMAIL_KEY = "vn-auth-email";
  async function sendSignInLink(email){
    /* the link lands on the web app; inside the store apps the same link
       simply opens the website signed-in — the account is the same one */
    const url = CFG.emailLinkURL ||
      (location.origin.startsWith("http") ? location.origin + location.pathname
                                          : "https://visualneuroscience.ai/");
    try{
      await sdk.sendSignInLinkToEmail(auth, email, { url, handleCodeInApp: true });
      try{ localStorage.setItem(EMAIL_KEY, email); }catch(_){}
    }catch(err){ throw friendly(err); }
  }
  function emailLinkPending(){
    try{ return sdk.isSignInWithEmailLink(auth, location.href); }catch(_){ return false; }
  }
  async function completeSignInLink(email){
    const addr = email || (function(){ try{ return localStorage.getItem(EMAIL_KEY); }catch(_){ return null; } })();
    if (!addr){ const e = new Error("Confirm the email address this link was sent to."); e.code = "vn/needs-email"; throw e; }
    const u = await settled(sdk.signInWithEmailLink(auth, addr, location.href));
    try{ localStorage.removeItem(EMAIL_KEY); }catch(_){}
    /* tidy ?mode=signIn&oobCode=… out of the address bar */
    try{ history.replaceState(null, "", location.pathname + location.hash); }catch(_){}
    return u;
  }

  /* ── linking on request ──────────────────────────────────────────────── */
  async function linkProvider(which){
    const u = auth.currentUser;
    if (!u) throw friendly({ code: "auth/requires-recent-login" });
    if (which === "linkedin") return linkLinkedIn();
    if (which === "google"){
      if (plugin){
        const res = await plugin.linkWithGoogle().catch(e => { throw friendly(e); });
        return res && res.user ? u : u;
      }
      return sdk.linkWithPopup(u, new sdk.GoogleAuthProvider()).then(r => r.user, e => { throw friendly(e); });
    }
    if (which === "apple"){
      if (plugin){
        const res = await plugin.linkWithApple().catch(e => { throw friendly(e); });
        return res && res.user ? u : u;
      }
      const p = new sdk.OAuthProvider("apple.com");
      p.addScope("email"); p.addScope("name");
      return sdk.linkWithPopup(u, p).then(r => r.user, e => { throw friendly(e); });
    }
    throw friendly({ code: "auth/operation-not-allowed" });
  }

  /* ── sign out: both layers, always ───────────────────────────────────── */
  async function doSignOut(){
    clearKept();
    if (plugin){ try{ await plugin.signOut(); }catch(_){} }
    try{ await sdk.signOut(auth); }catch(_){}
    if (native) tellShell({ auth: "signedOut" });
  }

  /* ── delete the account, and the data with it ────────────────────────
     App Store guideline 5.1.1(v): an app that lets a person create an
     account must let them destroy it, in the app, and one signed in with
     Apple must have its Sign in with Apple authorisation revoked as it
     goes. The saved files go first — userdata.js keeps an index of every
     tool that ever saved, because Firestore will not enumerate
     subcollections for a client — then the profile, then the account
     itself. Firebase asks for a recent sign-in before it will delete a
     user: Apple signs in again at the start, which the revocation needs
     anyway, and before any waiting, so that a browser's popup still
     follows the press that asked for it; Google signs in again on the
     spot only when Firebase asks; an email address meets the log-in-again
     sentence, and deleting right after logging in always works. */
  async function sweepData(u){
    try{
      const idxRef = sdk.doc(db, "users", u.uid, "meta", "toolindex");
      const idx = await sdk.getDoc(idxRef);
      const tools = idx.exists() ? Object.keys(idx.data() || {}) : [];
      for (const tool of tools){
        const snap = await sdk.getDocs(sdk.collection(db, "users", u.uid, "tools", tool, "files"));
        const gone = [];
        snap.forEach(d => gone.push(sdk.deleteDoc(d.ref)));
        await Promise.all(gone);
      }
      await sdk.deleteDoc(idxRef).catch(() => {});
      const prof = profileCache || await loadProfile(u);
      if (prof && prof.username) await releaseUsername(prof.username);
      await sdk.deleteDoc(sdk.doc(db, "users", u.uid, "meta", "profile")).catch(() => {});
      profileCache = null;
      clearKept();
    }catch(e){ console.warn("data cleanup incomplete:", e && e.message); }
  }
  function usesProvider(u, id){ return (u.providerData || []).some(p => p && p.providerId === id); }
  async function deleteAccount(){
    const u = auth.currentUser;
    if (!u) throw friendly({ code: "auth/requires-recent-login" });
    const apple = usesProvider(u, "apple.com"), google = usesProvider(u, "google.com");
    /* In the apps the native layer signs in with Apple afresh, revokes the
       authorisation with the code Apple hands back and deletes the user,
       all through the native SDK, which is where Firebase keeps the
       revocation; the webview's own session is then signed out, its user
       gone. On the web the popup's result carries Apple's access token,
       which the JS SDK revokes. Either way the sign-in must be the same
       account, or nothing is touched. */
    if (apple && plugin){
      let res;
      try{ res = await plugin.signInWithApple({ skipNativeAuth: false }); }
      catch(err){ throw friendly({ code: canc(err) || "auth/network-request-failed" }); }
      if (!res || !res.user || res.user.uid !== u.uid){
        try{ await plugin.signOut(); }catch(_){}
        throw friendly({ code: "auth/user-mismatch" });
      }
      await sweepData(u);
      const code = res.credential && res.credential.authorizationCode;
      if (code){ try{ await plugin.revokeAccessToken({ token: code }); }catch(e){ console.warn("apple revoke:", e && e.message); } }
      try{ await plugin.deleteUser(); }
      catch(err){ throw friendly(err); }
      try{ await sdk.signOut(auth); }catch(_){}
      return;
    }
    let appleToken = null;
    if (apple){
      let res;
      try{ res = await sdk.reauthenticateWithPopup(u, new sdk.OAuthProvider("apple.com")); }
      catch(err){ throw friendly(err); }
      const c = sdk.OAuthProvider.credentialFromResult(res);
      appleToken = c && c.accessToken;
    }
    await sweepData(u);
    if (appleToken){ try{ await sdk.revokeAccessToken(auth, appleToken); }catch(e){ console.warn("apple revoke:", e && e.message); } }
    try{ await u.delete(); }
    catch(err){
      if (!(err && err.code === "auth/requires-recent-login" && google)) throw friendly(err);
      try{
        if (plugin){
          const res = await plugin.signInWithGoogle({ skipNativeAuth: true });
          const c = res && res.credential;
          if (!c || !c.idToken) throw err;
          await sdk.reauthenticateWithCredential(u, sdk.GoogleAuthProvider.credential(c.idToken, c.accessToken));
        } else {
          await sdk.reauthenticateWithPopup(u, new sdk.GoogleAuthProvider());
        }
        await u.delete();
      }catch(e2){ throw friendly(canc(e2) ? { code: "auth/user-cancelled" } : e2); }
    }
    if (plugin){ try{ await plugin.signOut(); }catch(_){} }
  }

  /* ── change the password ──────────────────────────────────────────────
     Only an account that logs in with an email address and a password has
     one to change (v12.9, at the owner's word: from the app as well as the
     site, on the account page). Firebase wants a recent sign-in before it
     will change one, so the current password logs the person in again on
     the spot, which is also the proof that it is them; a wrong one is
     called the wrong current password rather than a wrong sign-in. The
     reset email (sendReset) stays the way for whoever has forgotten it. */
  function hasPassword(u){
    u = u || auth.currentUser;
    return !!(u && u.email && usesProvider(u, "password"));
  }
  async function changePassword(current, next, confirm){
    const u = auth.currentUser;
    if (!u) throw friendly({ code: "auth/requires-recent-login" });
    if (!hasPassword(u)) throw friendly({ code: "vn/no-password" });
    if (!current) throw friendly({ code: "auth/missing-password" });
    if (!next || next.length < 6) throw friendly({ code: "auth/weak-password" });
    if (next !== confirm) throw friendly({ code: "vn/passwords-differ" });
    if (next === current) throw friendly({ code: "vn/same-password" });
    try{ await sdk.reauthenticateWithCredential(u, sdk.EmailAuthProvider.credential(u.email, current)); }
    catch(err){
      const c = err && err.code;
      const wrong = c === "auth/wrong-password" || c === "auth/invalid-credential" || c === "auth/invalid-login-credentials";
      throw friendly(wrong ? { code: "vn/current-wrong" } : err);
    }
    try{ await sdk.updatePassword(u, next); }
    catch(err){ throw friendly(err); }
  }

  return {
    enabled: true,
    providers,
    onUser(cb){ listeners.add(cb); if (user !== undefined) cb(user); return () => listeners.delete(cb); },
    currentUser: () => user,
    /* the account the iOS shell holds (v12.46), and why the page could not
       take it, where it could not */
    nativeUser, get nativeWhy(){ return nativeWhy; },
    signInWithGoogle, signInWithApple, signInWithLinkedIn,
    signUpWithEmail, signInWithEmail, sendReset,
    sendSignInLink, completeSignInLink,
    get pendingEmailLink(){ return emailLinkPending(); },
    get pendingLink(){ return pendingLink; },
    linkProvider,
    signOut: doSignOut,
    deleteAccount,
    changePassword, hasPassword,
    usernameFree, setUsername, setUniversity, loadProfile, profile,
    track,
    /* a write the page made, for the shell's own copy of the account (v12.54) */
    changed(){ if (native) tellShell({ auth: "changed" }); },
    ready, db, sdk
  };
}

/* ── the face ─────────────────────────────────────────────────────────── */
/* What an importer gets is made here, at once, with no top-level await.
   Until v12.53 the module ended on `await build()`, and the module loader in
   WebKit before Safari 27 (the iOS app's web view on iOS 26; WebKit's post
   "Fixing Top-Level Await in Safari") could run a second module script, the
   account page's own, before that wait was over: the page's first read of
   the import threw "Cannot access 'auth' before initialization", its script
   died, and the page sat on Checking whether you are logged in for good,
   which is the line v12.45's watchdog showed on the owner's iPad. So nothing
   another module imports may await at its top level. The face answers at
   once: enabled while there is a config, its synchronous reads empty until
   the module is up, every call waiting for the build, onUser kept and bound
   once the module is up, and the dormant stub, with its reason, standing in
   should the build fail (a failure to start is reported, never left to hang
   the importers, v12.45: the page then hears logged out and reads the
   reason). `up` settles once the module is built, before any state is heard,
   for what the UI does then (an email link to complete). */
function face(){
  let live = null, kept = [];
  const start = CFG
    ? build().catch(err => { try{ console.error("accounts could not start:", err); }catch(_){} return dormant(err); })
    : Promise.resolve(dormant());
  const up = start.then(m => {
    live = m;
    const q = kept; kept = [];
    /* a listener that throws is reported, as notify reports one, never let
       reject `up` and every call waiting on it */
    q.forEach(fn => { try{ fn(m); }catch(e){ try{ console.error(e); }catch(_){} } });
  });
  const later = name => function(){
    const args = arguments;
    return live ? live[name].apply(live, args) : up.then(() => live[name].apply(live, args));
  };
  return {
    get enabled(){ return live ? live.enabled : !!CFG; },
    get reason(){ return live ? (live.reason || null) : null; },
    get providers(){ return live ? live.providers : providers; },
    onUser(cb){
      if (live) return live.onUser(cb);
      let off = null, gone = false;
      kept.push(m => { if (!gone) off = m.onUser(cb); });
      return () => { gone = true; if (off) off(); };
    },
    currentUser(){ return live ? live.currentUser() : null; },
    get nativeUser(){ return live ? live.nativeUser : null; },
    get nativeWhy(){ return live ? live.nativeWhy : null; },
    signInWithGoogle: later("signInWithGoogle"), signInWithApple: later("signInWithApple"), signInWithLinkedIn: later("signInWithLinkedIn"),
    signUpWithEmail: later("signUpWithEmail"), signInWithEmail: later("signInWithEmail"), sendReset: later("sendReset"),
    sendSignInLink: later("sendSignInLink"), completeSignInLink: later("completeSignInLink"),
    get pendingEmailLink(){ return live ? live.pendingEmailLink : false; },
    get pendingLink(){ return live ? live.pendingLink : null; },
    linkProvider: later("linkProvider"),
    signOut: later("signOut"),
    deleteAccount: later("deleteAccount"),
    changePassword: later("changePassword"),
    hasPassword(u){ return live ? live.hasPassword(u) : false; },
    usernameFree: later("usernameFree"), setUsername: later("setUsername"), setUniversity: later("setUniversity"),
    loadProfile: later("loadProfile"),
    profile(){ return live ? live.profile() : null; },
    track(name, params){ if (live) live.track(name, params); else up.then(() => live.track(name, params)); },
    changed: later("changed"),
    /* the account kept on the device (v12.54): the copy, a change to it, a tool's files in it, and
       the two helpers userdata.js keeps it with */
    kept: readKept,
    keep(fn){ return changeKept(null, fn); },
    keptFiles(tool){ const o = readKept(); const rows = o && o.tools && o.tools[tool]; return Array.isArray(rows) ? rows : null; },
    keepFiles(tool, rows){ return changeKept(null, o => { o.tools = o.tools || {}; o.tools[tool] = rows; }); },
    iso, plain: plainDoc,
    get ready(){ return live ? live.ready : up.then(() => live.ready); },
    get up(){ return up; },
    get db(){ return live ? live.db : null; },
    get sdk(){ return live ? live.sdk : null; }
  };
}
const VN_AUTH = face();
if (typeof window !== "undefined") window.VN_AUTH = VN_AUTH;
export default VN_AUTH;
