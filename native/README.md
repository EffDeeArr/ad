# Native renderer (optional): real NVIDIA DLSS + hardware ray tracing

The game runs without any of this. This folder is the start of an *optional* native Vulkan renderer
(`arb-rt.exe`) that the game will use only when the PC supports it:

* **DLSS** (NVIDIA's own, via the NGX SDK) - RTX cards only.
* **Hardware ray tracing** (Vulkan ray query + acceleration structures) - RTX / RDNA2+ / Arc.

Everyone else keeps using the normal WebGL renderer (including its shader-based light shadows).

## Status

Stage 1 (this version): `arb-rt --probe` style check. It reports the cards, ray-tracing support, initializes
DLSS for real, upscales a test picture with it (4 jitter-sign variants, scored against an exact reference and
against plain bilinear) and builds a ray-tracing acceleration structure. Nothing is wired into the game yet.
Not yet run on an NVIDIA card - the non-DLSS part was only run on a software Vulkan driver.

Next stages: draw the game's world in Vulkan, feed DLSS with real depth/motion vectors, ray-traced shadows,
show the result in the game window, and the settings switch (greyed out when unsupported).

## Build / run (Windows)

1. Install Git, CMake and Visual Studio Build Tools ("Desktop development with C++").
2. `BUILD-NATIVE.bat` (downloads the Vulkan headers and NVIDIA's DLSS SDK, builds `bin\arb-rt.exe`).
3. `RUN-PROBE.bat` and send back `probe-out\probe-report.txt`.

`--no-dlss`, `--no-rt`, `--device N`, `--quality 0..5` are accepted. NVIDIA's DLSS SDK is licensed by NVIDIA
(see its LICENSE.txt); it is downloaded by you at build time and is not part of this repository.
