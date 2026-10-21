/* The entry point of site/vendor/firebase/firebase-bundle.js: everything
   assets/auth.js, assets/userdata.js and assets/auth-ui.js take from the
   Firebase JS SDK, and nothing else, so the site serves one self-hosted
   module and no CDN. Build it with scripts/firebase/build.sh (the notes in
   site/vendor/firebase/NOTICE.md). A new name used in the site's scripts
   goes here first, or the built bundle will not carry it. */
export { initializeApp } from "firebase/app";
export {
  getAuth, initializeAuth, setPersistence,
  indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence,
  onAuthStateChanged, signOut, updateProfile,
  GoogleAuthProvider, OAuthProvider,
  signInWithPopup, signInWithCredential, signInWithCustomToken,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, fetchSignInMethodsForEmail,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink,
  linkWithCredential, linkWithPopup, getAdditionalUserInfo,
  reauthenticateWithCredential, reauthenticateWithPopup, revokeAccessToken
} from "firebase/auth";
export {
  getFirestore, doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp
} from "firebase/firestore/lite";
/* usage counts: Google Analytics for Firebase on the website (the apps go
   through the native plugin instead) */
export {
  getAnalytics, isSupported, logEvent, setUserProperties, setUserId,
  setAnalyticsCollectionEnabled, setConsent
} from "firebase/analytics";
