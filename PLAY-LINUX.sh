#!/usr/bin/env bash
# Starts the built game with safe flags on the real command line:
#  --disable-dev-shm-usage  use /tmp instead of /dev/shm
#  --no-sandbox             ONLY if the game won't start otherwise (turns off Chromium's security sandbox)
cd "$(dirname "$0")"
FLAGS="--disable-dev-shm-usage"
[ "$1" = "--no-sandbox" ] && FLAGS="$FLAGS --no-sandbox"   # opt-in: ./PLAY-LINUX.sh --no-sandbox
if [ -x dist/ArberiaDeathmatch.AppImage ]; then
  exec ./dist/ArberiaDeathmatch.AppImage $FLAGS "$@"
elif [ -x dist/linux-unpacked/arberia-deathmatch ]; then
  exec ./dist/linux-unpacked/arberia-deathmatch $FLAGS "$@"
else
  echo "Build the game first with ./BUILD.sh"; exit 1
fi
