# What this is

`firebase-bundle.js` is the Firebase JavaScript SDK v12.18.0 — the
`firebase/app`, `firebase/auth`, `firebase/firestore/lite` and
`firebase/analytics` entry points — bundled from the official npm `firebase`
package into a single self-hosted ES module, so the site serves every byte
itself and loads nothing from a CDN.

The Firebase JS SDK is © Google LLC, licensed under the Apache License,
Version 2.0: https://www.apache.org/licenses/LICENSE-2.0
Source: https://github.com/firebase/firebase-js-sdk

To rebuild (after bumping `firebase` in app/package.json and running
`npm ci` there, so the site and the apps share one SDK version):

    sh scripts/firebase/build.sh

The entry point is `scripts/firebase/entry.js`, which re-exports every
symbol the site's scripts use; a new one goes there first. The Apache
notice lives in this file rather than 127 times in the bundle.

Firestore is deliberately the **lite** build — plain request/response reads
and writes with no offline replica — which is all the saved-files feature
needs and keeps the bundle small (some 220 KB with analytics).
