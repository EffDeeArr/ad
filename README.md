# Arberia Deathmatch

A procedurally generated first-person shooter that runs as a desktop app (Electron) or in a browser.
Software raycaster with an optional WebGL renderer, campaign floors with bosses, shops, powers, and online/LAN
multiplayer.

The full manual and change log are in [README.txt](README.txt).

## Play

- **Windows:** download `ArberiaDeathmatch-Desktop-vX.XX.zip` from the [latest release](https://github.com/EffDeeArr/ad/releases/latest),
  unpack it and run it (or build it with `BUILD.bat`).
- **Linux:** `PLAY-LINUX.sh`, or `BUILD.sh` for an AppImage.

## Updating

Run `Updater.exe` from the [latest release](https://github.com/EffDeeArr/ad/releases/latest) next to the game (or give it
the game folder as an argument). It downloads the newest game files from this repository's latest release, checks
them, backs up the files it replaces, and installs them. It works from any earlier version.

## Building from source

```
npm install
npm start          # run it
npm run dist       # Windows portable build (see BUILD.bat / BUILD.sh)
```

## Making a release (maintainers)

Run `PUBLISH.bat` (Windows) or `PUBLISH.sh`. It needs [Node.js](https://nodejs.org) and [Git](https://git-scm.com/downloads).
The first time it asks for a GitHub token (it explains how to make one) and saves it in your user folder (`.arberia-publish-token`), so it survives re-downloading the game folder and is never
uploaded. Each run builds `game-files.zip` and the full game zip, uploads the source files, and creates the release
`v<version>` (from `package.json`) with the files attached. Keep `Updater.exe` in the project folder so it is attached too.

To release a new version: bump `version` in `package.json`, add a line for it to the end of `README.txt`
(`0.47 - what changed`), and run `PUBLISH.bat`.

## License and credits

The game's own code and art are MIT licensed, see [LICENSE](LICENSE). Third-party components, fonts and sound samples
(including CC BY-SA 3.0 orchestral samples) and trademark notes are in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).
