DOSBox for the arcade machine (used only to run the player's own Steam copy of The Elder Scrolls: Arena)

These files are the js-dos "emulators" package: DOSBox compiled to WebAssembly.
  emulators.js, wdosbox.js, wdosbox.wasm, wlibzip.js, wlibzip.wasm
Source code: https://github.com/js-dos/emulators  (and DOSBox: https://www.dosbox.com, source at https://sourceforge.net/projects/dosbox/)
License: GNU General Public License version 2 (LICENSE-GPL-2.0.txt).

Changes made by Arberia Deathmatch:
  emulators.js - one line: the frame reader (onFrameLines) now reads the emulator's current memory buffer instead of a
                 saved one, which becomes invalid when the emulator's memory grows (this build runs on the page's main thread).
  arena.html / arena.js are Arberia Deathmatch's own host page for it (MIT, like the rest of the game).

No game files are included. The game is only run if it is found in the player's own Steam library.
