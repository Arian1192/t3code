#!/usr/bin/env bash
# Rebase this fork's `fork` branch onto upstream (pingdotgg/t3code) and rebuild the desktop app.
# Usage: scripts/update-fork.sh [--no-build | --install]
#   --install  after building, quit the running app, replace it in /Applications and reopen it.
set -euo pipefail

APP_NAME="T3-X Code"

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

if [[ "${1:-}" == "--install" ]]; then
  zip="$(ls -1t release/*-arm64.zip 2>/dev/null | head -1)"
  if [[ -z "$zip" ]]; then
    echo "No arm64 zip found in release/." >&2
    exit 1
  fi
  log="${TMPDIR:-/tmp}/t3code-fork-install.log"
  # The caller may be an agent running inside the app itself, so the installer runs
  # in its own session (setsid) to survive the app shutting down its child processes.
  perl -MPOSIX=setsid -e 'setsid(); exec @ARGV' /bin/bash -c '
    set -euo pipefail
    app_name="$1"; zip="$2"
    sleep 2
    osascript -e "tell application \"$app_name\" to quit" || true
    for _ in $(seq 1 120); do
      [[ "$(osascript -e "application \"$app_name\" is running")" == "false" ]] && break
      sleep 1
    done
    staging="$(mktemp -d)"
    ditto -x -k "$zip" "$staging"
    rm -rf "/Applications/$app_name.app"
    ditto "$staging/$app_name.app" "/Applications/$app_name.app"
    rm -rf "$staging"
    open -a "/Applications/$app_name.app"
  ' installer "$APP_NAME" "$PWD/$zip" >"$log" 2>&1 </dev/null &
  echo "Installing $zip: $APP_NAME will quit and reopen in a few seconds (log: $log)."
  exit 0
fi

echo
echo "Build done. Install it:"
echo "  1. Quit '$APP_NAME' (or re-run with --install to do it automatically)."
echo "  2. Open the new .dmg in release/ and drag the app to /Applications, replacing the old one."
ls -1t release/*.dmg 2>/dev/null | head -1
