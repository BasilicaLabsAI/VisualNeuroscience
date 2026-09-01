/* The switch for the whole account system.

   While this is null the feature is dormant: no Log in button appears, no
   SDK is loaded, and not one network request is made — the app behaves
   exactly as it did before accounts existed. The privacy policy already
   describes accounts under "Optional services", so activating this needs
   no policy rewrite — only the store privacy labels change when the apps
   ship it (docs/AUTH-SETUP.md walks through every step).

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
window.VN_FIREBASE = {
  apiKey: "AIzaSyBWhQXs2C9RhKfOxMNo0gvSv-YeUVXBG24",
  authDomain: "visualneuroscience-4315d.firebaseapp.com",
  projectId: "visualneuroscience-4315d",
  storageBucket: "visualneuroscience-4315d.firebasestorage.app",
  messagingSenderId: "1020711830190",
  appId: "1:1020711830190:web:18a3408e0ed7d489e6a33f",
  /* Analytics is on in the Firebase project, but nothing here sends it:
     the bundled SDK carries no analytics module, so this id is inert
     until usage counting is deliberately wired in (and named on the
     privacy page). */
  measurementId: "G-NLQVT5PLRB",

  /* email is live; each social provider flips to true when its console
     section in docs/AUTH-SETUP.md is done. "app" means offered only inside
     the wrapped store apps: Sign in with Apple runs natively there (no
     Services ID needed), and stays hidden on the web until §6's Apple
     Developer steps are done and this becomes true. */
  providers: { google: false, apple: "app", linkedin: false, emailLink: true }
};
