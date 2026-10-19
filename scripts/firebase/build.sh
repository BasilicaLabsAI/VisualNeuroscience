#!/usr/bin/env sh
# Rebuild site/vendor/firebase/firebase-bundle.js from the Firebase JS SDK
# installed under app/node_modules (the version the apps use), bundling the
# re-exports in entry.js into one self-hosted ES module. Run from anywhere:
#   sh scripts/firebase/build.sh
# Bump VERSION in site/sw.js afterwards; the bundle is precached.
set -eu
cd "$(dirname "$0")/../.."
[ -d app/node_modules/firebase ] || { echo "run npm ci in app/ first" >&2; exit 1; }
ver=$(node -e "console.log(require('./app/node_modules/firebase/package.json').version)")
NODE_PATH="$PWD/app/node_modules" npx -y esbuild@0.25.10 scripts/firebase/entry.js \
  --bundle --format=esm --minify --legal-comments=none \
  --outfile=site/vendor/firebase/firebase-bundle.js
echo "built site/vendor/firebase/firebase-bundle.js from firebase $ver"
