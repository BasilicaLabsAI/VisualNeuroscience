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
  "auth/unauthorized-domain":      "This copy of the app isn't authorised for sign-in — the site's domain needs adding in the Firebase console.",
  "auth/operation-not-allowed":    "That sign-in method isn't switched on for this app.",
  "auth/configuration-not-found":  "Sign-in isn't set up for this app yet.",
  "auth/credential-already-in-use":"That sign-in method already belongs to a different account.",
  "auth/provider-already-linked":  "That sign-in method is already connected to this account.",
  "auth/web-storage-unsupported":  "The browser is blocking site storage, which sign-in needs — private-browsing modes often do this.",
  "vn/passwords-differ":           "The two passwords don't match.",
  "vn/disabled":                   "Accounts are switched off in this copy of the app.",
  "vn/link-cancelled":             "Sign-in was cancelled."
};

function friendly(err){
  const code = err && (err.code || err.vnCode);
  const e = new Error((code && ERRORS[code]) || "Something went wrong signing in. Try again.");
  e.code = code || "unknown";
  e.cause = err;
  return e;
}

/* ── dormant stub ─────────────────────────────────────────────────────── */
function dormant(){
  const off = () => Promise.reject(friendly({ code: "vn/disabled" }));
  return {
    enabled: false,
    onUser(cb){ cb(null); return () => {}; },
    currentUser: () => null,
    providers: { google:false, apple:false, linkedin:false, emailLink:false },
    signInWithGoogle: off, signInWithApple: off, signInWithLinkedIn: off,
    signUpWithEmail: off, signInWithEmail: off, sendReset: off,
    sendSignInLink: off, completeSignInLink: off,
    linkProvider: off, deleteAccount: off, signOut: () => Promise.resolve(),
    pendingEmailLink: false, pendingLink: null, db: null, sdk: null,
    ready: Promise.resolve(null)
  };
}

/* ── the live module ──────────────────────────────────────────────────── */
async function build(){
  const sdk = await import("../vendor/firebase/firebase-bundle.js");
  const app  = sdk.initializeApp(CFG);
  const auth = sdk.getAuth(app);
  const db   = sdk.getFirestore(app);

  const cap = typeof window !== "undefined" ? window.Capacitor : null;
  const isNative = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const plugin  = isNative && cap.Plugins ? cap.Plugins.FirebaseAuthentication : null;
  const browser = isNative && cap.Plugins ? cap.Plugins.Browser : null;
  const appPlug = isNative && cap.Plugins ? cap.Plugins.App : null;

  const wantP = Object.assign({ google:true, apple:true, linkedin:true, emailLink:true },
                              CFG.providers || {});
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
    linkedin: on(wantP.linkedin) && !!CFG.linkedinWorker && (!isNative || (!!browser && !!appPlug)),
    emailLink: wantP.emailLink !== false
  };

  /* user state */
  const listeners = new Set();
  let user = null, readyResolve;
  const ready = new Promise(r => { readyResolve = r; });
  sdk.onAuthStateChanged(auth, u => {
    user = u || null;
    if (readyResolve){ readyResolve(user); readyResolve = null; }
    listeners.forEach(cb => { try{ cb(user); }catch(e){ console.error(e); } });
  });

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
      if (u.photoURL || (extra && extra.picture)) data.photoURL = u.photoURL || extra.picture;
      await sdk.setDoc(refDoc, data, { merge: true });
    }catch(e){ console.warn("profile save skipped:", e && e.message); }
  }

  async function adoptName(u, name){
    if (!name || (u.displayName && u.displayName.trim())) return;
    try{ await sdk.updateProfile(u, { displayName: name }); }catch(e){}
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
    /* Apple's one-time name, Google's photo, LinkedIn's profile — capture
       whatever this sign-in carried before it evaporates */
    let name = extra && extra.name;
    try{
      const info = sdk.getAdditionalUserInfo(res);
      const p = info && info.profile;
      if (!name && p){
        name = p.name || [p.given_name || p.firstName, p.family_name || p.lastName]
          .filter(Boolean).join(" ");
      }
    }catch(_){}
    await adoptName(u, name);
    await saveProfile(u, Object.assign({ name }, extra));
    await finishPendingLink(u);
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
  async function signUpWithEmail({ firstName, lastName, email, password, confirm }){
    if (password !== confirm) throw friendly({ code: "vn/passwords-differ" });
    let res;
    try{ res = await sdk.createUserWithEmailAndPassword(auth, email, password); }
    catch(err){ throw friendly(err); }
    const name = [firstName, lastName].map(s => (s || "").trim()).filter(Boolean).join(" ");
    if (name) await adoptName(res.user, name);
    await saveProfile(res.user, { firstName, lastName, name });
    await finishPendingLink(res.user);
    return res.user;
  }

  async function signInWithEmail(email, password){
    return settled(sdk.signInWithEmailAndPassword(auth, email, password));
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
    if (plugin){ try{ await plugin.signOut(); }catch(_){} }
    try{ await sdk.signOut(auth); }catch(_){}
  }

  /* ── delete the account, and the data with it ────────────────────────
     App Store guideline 5.1.1(v): an app that lets a person create an
     account must let them destroy it, in the app. The saved files go
     first — userdata.js keeps an index of every tool that ever saved,
     because Firestore will not enumerate subcollections for a client —
     then the profile, then the account itself. Firebase asks for a
     recent sign-in before it will delete a user; that surfaces as the
     friendly log-in-again sentence, and deleting right after signing in
     always works. */
  async function deleteAccount(){
    const u = auth.currentUser;
    if (!u) throw friendly({ code: "auth/requires-recent-login" });
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
      await sdk.deleteDoc(sdk.doc(db, "users", u.uid, "meta", "profile")).catch(() => {});
    }catch(e){ console.warn("data cleanup incomplete:", e && e.message); }
    try{ await u.delete(); }
    catch(err){ throw friendly(err); }
    if (plugin){ try{ await plugin.signOut(); }catch(_){} }
  }

  return {
    enabled: true,
    providers,
    onUser(cb){ listeners.add(cb); if (user !== undefined) cb(user); return () => listeners.delete(cb); },
    currentUser: () => user,
    signInWithGoogle, signInWithApple, signInWithLinkedIn,
    signUpWithEmail, signInWithEmail, sendReset,
    sendSignInLink, completeSignInLink,
    get pendingEmailLink(){ return emailLinkPending(); },
    get pendingLink(){ return pendingLink; },
    linkProvider,
    signOut: doSignOut,
    deleteAccount,
    ready, db, sdk
  };
}

const VN_AUTH = CFG ? await build() : dormant();
if (typeof window !== "undefined") window.VN_AUTH = VN_AUTH;
export default VN_AUTH;
