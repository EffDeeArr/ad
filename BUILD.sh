#!/usr/bin/env bash
# Builds the game for Linux. Run on a Linux PC.
#   ./BUILD.sh            builds dist/linux-unpacked (a plain folder; this build can UPDATE ITSELF from GitHub)
#   ./BUILD.sh appimage   builds a single dist/ArberiaDeathmatch.AppImage (cannot update itself: it is read-only)
set -e
cd "$(dirname "$0")"
. ./node-env.sh
echo "[1/2] Installing build tools (needs internet)..."
npm install
echo "[2/2] Packaging..."
if [ "$1" = "appimage" ]; then
  npm run dist:linux
  chmod +x dist/ArberiaDeathmatch.AppImage
  echo
  echo "Done! Your game is: $(pwd)/dist/ArberiaDeathmatch.AppImage"
else
  npm run dist:linux-folder
  echo
  echo "Done! Your game is in: $(pwd)/dist/linux-unpacked   (start it with ./PLAY-LINUX.sh)"
fi
