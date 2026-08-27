/* The switch for the whole account system.

   While this is null the feature is dormant: no Log in button appears, no
   SDK is loaded, and not one network request is made — the app behaves
   exactly as it did before accounts existed. Everything the privacy policy
   says about third-party requests stays true until the moment someone
   deliberately fills this in (and updates the policy to match — see
   docs/AUTH-SETUP.md, which walks through every step).

   NOTE: the values below are Firebase's PUBLIC web configuration. They are
   identifiers, not secrets — they are safe to commit and are meant to ship
   inside the client, and Firebase's own docs say so. Do not "fix" this by
   moving them server-side; access control lives in the Firestore security
   rules and the auth providers, never in hiding these strings. The actual
   secrets (LinkedIn client secret, the service-account key, the Apple key)
   live only in the Cloudflare Worker and the consoles — never here.

   To activate, replace null with the object from the Firebase console:

   window.VN_FIREBASE = {
     apiKey: "…",
     authDomain: "…",           // your own domain once set up, see the guide
     projectId: "…",
     appId: "…",

     // which sign-in buttons to show; a provider not yet configured in the
     // consoles should be false and its button simply never appears
     providers: { google: true, apple: true, linkedin: true, emailLink: true },

     // origin of the deployed auth-worker (auth-worker/ in this repo);
     // leave it out and the LinkedIn button hides itself
     linkedinWorker: "https://visualneuroscience-auth.<account>.workers.dev"
   };

   Remember to bump VERSION in sw.js after editing this file, or installed
   copies of the app will keep serving the cached previous version. */
window.VN_FIREBASE = null;
