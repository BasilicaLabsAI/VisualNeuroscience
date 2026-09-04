# What this is

`firebase-bundle.js` is the Firebase JavaScript SDK v12.18.0 — the
`firebase/app`, `firebase/auth` and `firebase/firestore/lite` entry points —
bundled from the official npm `firebase` package into a single self-hosted
ES module, so the site serves every byte itself and loads nothing from a CDN.

The Firebase JS SDK is © Google LLC, licensed under the Apache License,
Version 2.0: https://www.apache.org/licenses/LICENSE-2.0
Source: https://github.com/firebase/firebase-js-sdk

To rebuild (bumping the SDK version):

    npm install firebase esbuild
    # entry.js re-exports the symbols listed in docs/AUTH-SETUP.md
    npx esbuild entry.js --bundle --format=esm --minify --legal-comments=none --outfile=firebase-bundle.js
    # (the Apache notice lives in this file rather than 127 times in the bundle)

Firestore is deliberately the **lite** build — plain request/response reads
and writes with no offline replica — which is all the saved-files feature
needs and keeps the bundle under 200 KB.
