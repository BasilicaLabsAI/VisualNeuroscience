#!/bin/sh
# Xcode Cloud runs this after cloning and before it resolves packages.
#
# The iOS project is not buildable from a bare clone: the Swift package
# manifest points at plugins inside node_modules, and the web app itself
# is copied into ios/App/App/public by the Capacitor sync. Both folders
# are ignored by git on purpose, so a fresh checkout has to make them.
# Node is not on the Xcode Cloud image; Homebrew is.
set -e
brew install node
cd "$CI_PRIMARY_REPOSITORY_PATH/app"
npm ci --no-audit --no-fund
npx cap sync ios
