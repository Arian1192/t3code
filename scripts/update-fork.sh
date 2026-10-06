#!/usr/bin/env bash
# Rebase this fork's `fork` branch onto upstream (pingdotgg/t3code) and rebuild the desktop app.
# Usage: scripts/update-fork.sh [--no-build]
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Working tree has uncommitted changes. Commit or stash them first." >&2
  exit 1
fi

if [[ "$(git branch --show-current)" != "fork" ]]; then
  echo "Switch to the 'fork' branch first (git switch fork)." >&2
  exit 1
fi

eval "$(fnm env)"
fnm use 24 >/dev/null
. "$HOME/.config/vite-plus/env"
. "$HOME/.cargo/env"

git fetch upstream
before="$(git rev-parse HEAD)"
if ! git rebase upstream/main; then
  echo "Rebase stopped on a conflict. Resolve it, run 'git rebase --continue', then re-run this script." >&2
  exit 1
fi
echo "Rebased: ${before:0:10} -> $(git rev-parse --short=10 HEAD)"

git push --force-with-lease origin fork

vp i

if [[ "${1:-}" == "--no-build" ]]; then
  exit 0
fi

vp run dist:desktop:dmg:arm64

echo
echo "Build done. Install it:"
echo "  1. Quit 'T3 Code (Fork)'."
echo "  2. Open the new .dmg in release/ and drag the app to /Applications, replacing the old one."
ls -1t release/*.dmg 2>/dev/null | head -1
