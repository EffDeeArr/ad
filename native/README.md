# Native renderer (optional): real NVIDIA DLSS + hardware ray tracing

The game runs without any of this. This folder is the start of an *optional* native Vulkan renderer
(`arb-rt.exe`) that the game will use only when the PC supports it:

* **DLSS** (NVIDIA's own, via the NGX SDK) - RTX cards only.
* **Hardware ray tracing** (Vulkan ray query + acceleration structures) - RTX / RDNA2+ / Arc.

Everyone else keeps using the normal WebGL renderer (including its shader-based light shadows).

## Status

* The game's frames are drawn in Vulkan (`arb-rt --serve`) into a window of its own behind the game window.
* DLSS runs inside it (Settings > Native renderer > DLSS). Needs `nvngx_dlss.dll` next to `arb-rt.exe`.
* Ray tracing (Settings > Native renderer > Ray tracing): the shadow function of the lit shaders is replaced by Vulkan
  ray queries against a TLAS built from the level's static triangle batches (soft shadows, 5 rays per light).
  Moving things (characters, props, chests, turrets) are added every frame: the game draws their triangles with a program that has a
  `uRtOcc` uniform, nothing is rasterised, and arb-rt collects them into a small bottom level structure that is rebuilt each frame.
  It switches itself off (and says why in the log, `arb-rt-log.txt`) if anything in it fails.
* `PUBLISH.bat` builds `arb-rt.exe` and ships it with the update, so players need no extra steps.

## Build / run (Windows)

1. Install Git, CMake and Visual Studio Build Tools ("Desktop development with C++").
2. `BUILD-NATIVE.bat` (downloads the Vulkan headers and NVIDIA's DLSS SDK, builds `bin\arb-rt.exe`).
3. `RUN-PROBE.bat` and send back `probe-out\probe-report.txt`.

`--no-dlss`, `--no-rt`, `--device N`, `--quality 0..5` are accepted. NVIDIA's DLSS SDK is licensed by NVIDIA
(see its LICENSE.txt); it is downloaded by you at build time and is not part of this repository.
