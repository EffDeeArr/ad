// arb-rt --replay <file.arbcap> --shaders <shaders.pack> --out <dir> [--device N]
// Replays a recorded game frame with Vulkan and writes frame-N.png for each frame in the capture.
#include "glvk.h"
#include <cstdio>
#include <cstdlib>

// minimal PNG writer (stored deflate)
static uint32_t crcT[256]; static bool crcInit = false;
static uint32_t crc32u(uint32_t c, const uint8_t* p, size_t n) { if (!crcInit) { for (uint32_t i = 0; i < 256; i++) { uint32_t x = i; for (int k = 0; k < 8; k++) x = x & 1 ? 0xEDB88320u ^ (x >> 1) : x >> 1; crcT[i] = x; } crcInit = true; } c = ~c; for (size_t i = 0; i < n; i++) c = crcT[(c ^ p[i]) & 255] ^ (c >> 8); return ~c; }
static void be32(std::vector<uint8_t>& v, uint32_t x) { v.push_back(x >> 24); v.push_back(x >> 16); v.push_back(x >> 8); v.push_back(x); }
static void chunk(FILE* f, const char* t, const std::vector<uint8_t>& d) { std::vector<uint8_t> h; be32(h, (uint32_t)d.size()); fwrite(h.data(), 1, 4, f); std::vector<uint8_t> td(t, t + 4); td.insert(td.end(), d.begin(), d.end()); fwrite(td.data(), 1, td.size(), f); std::vector<uint8_t> c; be32(c, crc32u(0, td.data(), td.size())); fwrite(c.data(), 1, 4, f); }
static bool writePng(const std::string& path, int w, int h, const uint8_t* rgba) {
  FILE* f = fopen(path.c_str(), "wb"); if (!f) return false; const uint8_t sig[8] = { 137, 80, 78, 71, 13, 10, 26, 10 }; fwrite(sig, 1, 8, f);
  std::vector<uint8_t> ih; be32(ih, w); be32(ih, h); ih.push_back(8); ih.push_back(2); ih.push_back(0); ih.push_back(0); ih.push_back(0); chunk(f, "IHDR", ih);
  std::vector<uint8_t> raw; raw.reserve((size_t)(w * 3 + 1) * h); for (int y = 0; y < h; y++) { raw.push_back(0); for (int x = 0; x < w; x++) { const uint8_t* p = rgba + ((size_t)y * w + x) * 4; raw.push_back(p[0]); raw.push_back(p[1]); raw.push_back(p[2]); } }
  std::vector<uint8_t> z; z.push_back(0x78); z.push_back(0x01); size_t pos = 0; uint32_t a = 1, b = 0; for (size_t i = 0; i < raw.size(); i++) { a = (a + raw[i]) % 65521; b = (b + a) % 65521; }
  while (pos < raw.size()) { size_t n = std::min<size_t>(65535, raw.size() - pos); bool last = pos + n >= raw.size(); z.push_back(last ? 1 : 0); z.push_back(n & 255); z.push_back(n >> 8); z.push_back(~n & 255); z.push_back((~n >> 8) & 255); z.insert(z.end(), raw.begin() + pos, raw.begin() + pos + n); pos += n; }
  be32(z, (b << 16) | a); chunk(f, "IDAT", z); chunk(f, "IEND", {}); fclose(f); return true;
}

int replayMain(int argc, char** argv) {
  std::string cap, shd, out = "."; int dev = -1;
  for (int i = 1; i < argc; i++) { std::string a = argv[i]; if (a == "--replay" && i + 1 < argc) cap = argv[++i]; else if (a == "--shaders" && i + 1 < argc) shd = argv[++i]; else if (a == "--out" && i + 1 < argc) out = argv[++i]; else if (a == "--device" && i + 1 < argc) dev = atoi(argv[++i]); }
  if (cap.empty() || shd.empty()) { fprintf(stderr, "usage: arb-rt --replay file.arbcap --shaders shaders.pack --out dir\n"); return 1; }
  Capture C; if (!C.load(cap.c_str())) { fprintf(stderr, "cannot read %s\n", cap.c_str()); return 1; }
  VkEnv env; std::string err; if (!vkEnvInit(env, dev, err)) { fprintf(stderr, "Vulkan: %s\n", err.c_str()); return 2; }
  printf("device: %s\n", env.name.c_str());
  GlVk* g = glvkCreate(&env, err); if (!g) { fprintf(stderr, "%s\n", err.c_str()); return 2; }
  if (!glvkLoadPack(g, shd.c_str(), err)) { fprintf(stderr, "shader pack: %s\n", err.c_str()); return 2; }
  COp op; int frames = 0; size_t nops = 0; bool named = false; size_t lastNames = 0;
  while (C.next(op)) {
    if (C.names.size() != lastNames) { glvkNames(g, C.names); lastNames = C.names.size(); named = true; }
    (void)named; nops++;
    if (!glvkExec(g, op)) { fprintf(stderr, "stopped at op %zu (%s): %s\n", nops, op.name < (int)C.names.size() ? C.names[op.name].c_str() : "?", glvkError(g).c_str()); return 3; }
    if (op.name < (int)C.names.size() && C.names[op.name] == "frame") {
      std::vector<uint8_t> px; int w = 0, h = 0; if (!glvkEndFrame(g, px, w, h)) { fprintf(stderr, "frame failed: %s\n", glvkError(g).c_str()); return 3; }
      char nm[64]; snprintf(nm, sizeof nm, "/frame-%d.png", frames); if (w) { writePng(out + nm, w, h, px.data()); printf("frame %d: %dx%d\n", frames, w, h); } frames++;
    }
  }
  printf("done: %zu calls, %d frames\n", nops, frames); return 0;
}
