#!/usr/bin/env sh
# Create and push the release tags listed in docs/RELEASES.md that the remote
# does not have yet. Run from a clone that can push:  sh scripts/push_tags.sh
set -eu
cd "$(dirname "$0")/.."
git fetch -q origin main --tags
remote=$(git ls-remote --tags origin | sed -n 's#.*refs/tags/\(v[0-9.]*\)$#\1#p')
made=""
ver=""; sha=""; title=""
while IFS= read -r line; do
  case "$line" in
    "## v"*)
      ver=$(printf '%s' "$line" | sed -n 's/^## \(v[0-9.]*\) — .* — \(.*\)$/\1/p')
      title=$(printf '%s' "$line" | sed -n 's/^## \(v[0-9.]*\) — .* — \(.*\)$/\2/p') ;;
    "Commit"*)
      sha=$(printf '%s' "$line" | sed -n 's/^Commit `\([0-9a-f]*\)`.*/\1/p')
      subj=$(printf '%s' "$line" | sed -n 's/^Commit.* · //p')
      [ -n "$sha" ] || sha=$(git log -1 --format=%H --fixed-strings --grep="$subj" origin/main)
      if [ -n "$ver" ] && ! printf '%s\n' "$remote" | grep -qx "$ver"; then
        if [ -z "$sha" ]; then
          echo "$ver: no commit on origin/main matches '$subj'; skipped" >&2
        else
          git rev-parse -q --verify "refs/tags/$ver" >/dev/null || git tag -a "$ver" "$sha" -m "$title"
          made="$made $ver"
        fi
      fi
      ver="" ;;
  esac
done < docs/RELEASES.md
[ -n "$made" ] || { echo "Nothing to push: the remote has every tag in the ledger."; exit 0; }
echo "Pushing:$made"
# shellcheck disable=SC2086
git push origin $(for v in $made; do printf 'refs/tags/%s ' "$v"; done)
