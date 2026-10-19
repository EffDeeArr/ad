#!/usr/bin/env bash
# Builds ArberiaDeathmatch.AppImage for Linux. Run on a Linux PC.
set -e
cd "$(dirname "$0")"
. ./node-env.sh
echo "[1/2] Installing build tools (needs internet)..."
npm install
echo "[2/2] Packaging..."
npm run dist:linux
chmod +x dist/ArberiaDeathmatch.AppImage
echo
echo "Done! Your game is: $(pwd)/dist/ArberiaDeathmatch.AppImage"
echo "Run it with: ./dist/ArberiaDeathmatch.AppImage"
